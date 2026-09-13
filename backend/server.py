from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends, UploadFile, File, Query
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import uuid
import re
import httpx
import bcrypt
from foods import library_payload, DEFAULT_PROGRAM
from storage import init_storage, put_object, get_object, APP_NAME
from engine import (generate_plan, shopping_for_week, replace_meal, replace_component, swap_day, can_swap, parse_program_text, normalize_program, MOODS, MEAL_LABELS, component_substitutes, set_component)
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class User(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SignupIn(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class SessionIn(BaseModel):
    session_id: str


class AuthOut(BaseModel):
    session_token: str
    user: User


class WeightEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD
    weight: float
    waist: Optional[float] = None
    energy: Optional[int] = None
    satiety: Optional[int] = None
    activity: Optional[int] = None
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InventoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    location: str  # 'fridge', 'freezer', 'pantry'
    priority: bool = False
    grouping: Optional[str] = None  # 'together', 'separate', None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
async def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    exp = session.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)


def _new_user_id() -> str:
    return f"user_{uuid.uuid4().hex[:12]}"


def _new_session_token() -> str:
    return uuid.uuid4().hex + uuid.uuid4().hex


async def _create_session(user_id: str) -> str:
    token = _new_session_token()
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
    })
    return token


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@api_router.post("/auth/signup", response_model=AuthOut)
async def signup(payload: SignupIn):
    existing = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Mot de passe trop court (min 6)")
    user_id = _new_user_id()
    pw_hash = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()
    doc = {
        "user_id": user_id,
        "email": payload.email.lower(),
        "name": payload.name or payload.email.split("@")[0],
        "picture": None,
        "password_hash": pw_hash,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(doc)
    token = await _create_session(user_id)
    return AuthOut(session_token=token, user=User(user_id=user_id, email=doc["email"], name=doc["name"], picture=None, created_at=doc["created_at"]))


@api_router.post("/auth/login", response_model=AuthOut)
async def login(payload: LoginIn):
    user_doc = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not user_doc or not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    if not bcrypt.checkpw(payload.password.encode(), user_doc["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    token = await _create_session(user_doc["user_id"])
    return AuthOut(
        session_token=token,
        user=User(user_id=user_doc["user_id"], email=user_doc["email"], name=user_doc.get("name"), picture=user_doc.get("picture"), created_at=user_doc.get("created_at", datetime.now(timezone.utc))),
    )


@api_router.post("/auth/session", response_model=AuthOut)
async def emergent_session(payload: SessionIn):
    async with httpx.AsyncClient(timeout=15.0) as http:
        r = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Session Emergent invalide")
    data = r.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=401, detail="Email manquant")
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name") or existing.get("name"), "picture": data.get("picture") or existing.get("picture")}},
        )
        name = data.get("name") or existing.get("name")
        picture = data.get("picture") or existing.get("picture")
        created = existing.get("created_at", datetime.now(timezone.utc))
    else:
        user_id = _new_user_id()
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name"),
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc),
        })
        name = data.get("name")
        picture = data.get("picture")
        created = datetime.now(timezone.utc)
    token = await _create_session(user_id)
    return AuthOut(session_token=token, user=User(user_id=user_id, email=email, name=name, picture=picture, created_at=created))


@api_router.get("/auth/me", response_model=User)
async def me(user: User = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Library, Targets (programme professionnel), préférences
# ---------------------------------------------------------------------------
class TextIn(BaseModel):
    text: str


class MealActionIn(BaseModel):
    week: int
    day: int
    meal: str
    action: str  # replace | quick | done | favorite | rating | swap_day | replace_component
    value: Optional[Any] = None
    mood: Optional[str] = None


class ShoppingToggleIn(BaseModel):
    key: str
    checked: bool


def _serialize(doc: Dict[str, Any]) -> Dict[str, Any]:
    doc.pop("_id", None)
    for k in ("created_at", "updated_at"):
        if isinstance(doc.get(k), datetime):
            doc[k] = doc[k].isoformat()
    return doc


async def _pantry(user_id: str) -> List[Dict[str, Any]]:
    return await db.inventory.find({"user_id": user_id}, {"_id": 0}).to_list(500)


async def _prefs(user_id: str) -> Dict[str, Any]:
    return (await db.preferences.find_one({"user_id": user_id}, {"_id": 0})) or {"favorites": [], "avoid": []}


async def _targets(user_id: str) -> Dict[str, Any]:
    doc = await db.targets.find_one({"user_id": user_id}, {"_id": 0, "user_id": 0, "updated_at": 0})
    return normalize_program(doc)


@api_router.get("/library")
async def get_library():
    return {**library_payload(), "moods": MOODS}


@api_router.get("/targets")
async def get_targets(user: User = Depends(get_current_user)):
    return await _targets(user.user_id)


@api_router.put("/targets")
async def put_targets(payload: Dict[str, Any], user: User = Depends(get_current_user)):
    doc = normalize_program(payload)
    doc["user_id"] = user.user_id
    doc["updated_at"] = datetime.now(timezone.utc)
    await db.targets.update_one({"user_id": user.user_id}, {"$set": doc}, upsert=True)
    return {"ok": True}


@api_router.post("/targets/parse-text")
async def parse_targets_text(payload: TextIn, user: User = Depends(get_current_user)):
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Collez d'abord le texte du programme")
    current = await _targets(user.user_id)
    updated, count = parse_program_text(payload.text, current)
    return {"targets": updated, "updates": count}


@api_router.get("/preferences")
async def get_preferences(user: User = Depends(get_current_user)):
    p = await _prefs(user.user_id)
    p.setdefault("notes", {})
    p.setdefault("goal_weight", None)
    return p


class NoteIn(BaseModel):
    blueprint_id: str
    note: str


class GoalIn(BaseModel):
    goal_weight: Optional[float] = None


@api_router.put("/preferences/notes")
async def put_note(payload: NoteIn, user: User = Depends(get_current_user)):
    bp = payload.blueprint_id.strip()
    if not bp or len(bp) > 80:
        raise HTTPException(status_code=400, detail="Recette invalide")
    note = payload.note.strip()[:1000]
    if note:
        await db.preferences.update_one({"user_id": user.user_id}, {"$set": {f"notes.{bp}": note}}, upsert=True)
    else:
        await db.preferences.update_one({"user_id": user.user_id}, {"$unset": {f"notes.{bp}": ""}}, upsert=True)
    return {"ok": True, "note": note}


@api_router.put("/preferences/goal")
async def put_goal(payload: GoalIn, user: User = Depends(get_current_user)):
    g = payload.goal_weight
    if g is not None and not (20 <= g <= 300):
        raise HTTPException(status_code=400, detail="Objectif entre 20 et 300 kg")
    await db.preferences.update_one({"user_id": user.user_id}, {"$set": {"goal_weight": g}}, upsert=True)
    return {"ok": True, "goal_weight": g}


# ---------------------------------------------------------------------------
# Programmes
# ---------------------------------------------------------------------------
NEW_FORMAT = {"shopping_checked": {"$exists": True}}


async def _program(program_id: str, user_id: str) -> Dict[str, Any]:
    doc = await db.programs.find_one({"id": program_id, "user_id": user_id, **NEW_FORMAT}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Programme introuvable")
    return doc


@api_router.post("/programs/generate")
async def generate_program(user: User = Depends(get_current_user)):
    tgt = await _targets(user.user_id)
    pantry = await _pantry(user.user_id)
    prefs = await _prefs(user.user_id)
    seed = int(datetime.now(timezone.utc).timestamp() * 1000) % 2147483647
    weeks = generate_plan(tgt, pantry, prefs, seed)
    now = datetime.now(timezone.utc)
    program = {
        "id": str(uuid.uuid4()), "user_id": user.user_id,
        "name": f"Programme du {now.strftime('%d/%m/%Y')}",
        "created_at": now, "duration_weeks": len(weeks), "weeks": weeks,
        "shopping_checked": [], "active": True, "can_swap": can_swap(tgt), "seed": seed,
    }
    await db.programs.update_many({"user_id": user.user_id}, {"$set": {"active": False}})
    await db.programs.insert_one(program.copy())
    return _serialize(program)


@api_router.get("/programs")
async def list_programs(user: User = Depends(get_current_user)):
    docs = await db.programs.find({"user_id": user.user_id, **NEW_FORMAT}, {"_id": 0, "weeks": 0, "shopping_checked": 0}).sort("created_at", -1).to_list(50)
    return [_serialize(d) for d in docs]


@api_router.get("/programs/current")
async def current_program(user: User = Depends(get_current_user)):
    doc = await db.programs.find_one({"user_id": user.user_id, "active": True, **NEW_FORMAT}, {"_id": 0})
    if not doc:
        doc = await db.programs.find_one({"user_id": user.user_id, **NEW_FORMAT}, {"_id": 0}, sort=[("created_at", -1)])
    if not doc or not doc.get("weeks"):
        return None
    return _serialize(doc)


@api_router.get("/programs/{program_id}")
async def get_program(program_id: str, user: User = Depends(get_current_user)):
    return _serialize(await _program(program_id, user.user_id))


@api_router.post("/programs/{program_id}/activate")
async def activate_program(program_id: str, user: User = Depends(get_current_user)):
    await _program(program_id, user.user_id)
    await db.programs.update_many({"user_id": user.user_id}, {"$set": {"active": False}})
    await db.programs.update_one({"id": program_id}, {"$set": {"active": True}})
    return {"ok": True}


@api_router.delete("/programs/{program_id}")
async def delete_program(program_id: str, user: User = Depends(get_current_user)):
    await db.programs.delete_one({"id": program_id, "user_id": user.user_id})
    return {"ok": True}


@api_router.get("/programs/{program_id}/shopping/{week}")
async def get_shopping(program_id: str, week: int, household: int = Query(1, ge=1, le=6), user: User = Depends(get_current_user)):
    doc = await _program(program_id, user.user_id)
    if week < 0 or week >= len(doc["weeks"]):
        raise HTTPException(status_code=404, detail="Semaine introuvable")
    data = shopping_for_week(doc["weeks"][week], await _pantry(user.user_id), doc.get("shopping_checked", []), week, household)
    lines = [f"🛒 Courses — Semaine {week + 1}" + (f" (×{household} personnes)" if household > 1 else "")]
    for sec in data["sections"]:
        lines.append("")
        lines.append(sec["name"].upper())
        for it in sec["items"]:
            u = f" (≈ {it['units']} {it['unit_label']}{'s' if it['units'] > 1 else ''})" if it.get("units") else ""
            lines.append(f"{'☑' if it['checked'] else '☐'} {it['name']} — {it['raw_grams']} g{' cru' if it['has_conversion'] else ''}{u}")
    if data["home"]:
        lines += ["", "🧺 Déjà à la maison : " + ", ".join(h["name"] for h in data["home"])]
    data["text"] = "\n".join(lines)
    return data


@api_router.post("/programs/{program_id}/shopping/toggle")
async def toggle_shopping(program_id: str, payload: ShoppingToggleIn, user: User = Depends(get_current_user)):
    await _program(program_id, user.user_id)
    op = {"$addToSet": {"shopping_checked": payload.key}} if payload.checked else {"$pull": {"shopping_checked": payload.key}}
    await db.programs.update_one({"id": program_id}, op)
    return {"ok": True}


@api_router.get("/programs/{program_id}/meals/substitutes")
async def meal_substitutes(program_id: str, week: int = Query(...), day: int = Query(...), meal: str = Query(...), index: int = Query(...), user: User = Depends(get_current_user)):
    doc = await _program(program_id, user.user_id)
    try:
        m = doc["weeks"][week]["days"][day]["meals"][meal]
    except (IndexError, KeyError):
        raise HTTPException(status_code=404, detail="Repas introuvable")
    if index < 0 or index >= len(m["components"]):
        raise HTTPException(status_code=404, detail="Aliment introuvable")
    c = m["components"][index]
    return {"current": c, "substitutes": component_substitutes(m, index, await _targets(user.user_id))}


@api_router.post("/programs/{program_id}/meals/action")
async def meal_action(program_id: str, payload: MealActionIn, user: User = Depends(get_current_user)):
    doc = await _program(program_id, user.user_id)
    weeks = doc["weeks"]
    if payload.week < 0 or payload.week >= len(weeks) or payload.day < 0 or payload.day > 6:
        raise HTTPException(status_code=400, detail="Repas introuvable")
    week = weeks[payload.week]
    day = week["days"][payload.day]
    meal = day["meals"].get(payload.meal)
    message = None
    if payload.action == "undo":
        snap = doc.get("undo")
        if not snap:
            raise HTTPException(status_code=400, detail="Rien à annuler.")
        weeks[snap["week"]]["days"][snap["day"]] = snap["day_data"]
        await db.programs.update_one({"id": program_id}, {"$set": {"weeks": weeks, "undo": None}})
        return {"ok": True, "message": "↩ Dernière modification annulée.", "day": snap["day_data"], "week": snap["week"], "day_index": snap["day"], "can_undo": False}
    import copy as _copy
    snapshot = {"week": payload.week, "day": payload.day, "day_data": _copy.deepcopy(day)} if payload.action in ("replace", "quick", "replace_component", "set_component", "swap_day") else None
    if payload.action == "swap_day":
        if not can_swap(await _targets(user.user_id)) or not swap_day(day):
            raise HTTPException(status_code=400, detail="Interversion impossible : les deux repas doivent avoir exactement les mêmes catégories et portions.")
        message = "Déjeuner et dîner intervertis sans modifier les portions."
    else:
        if not meal:
            raise HTTPException(status_code=404, detail="Repas introuvable")
        if payload.action == "done":
            meal["done"] = bool(payload.value) if payload.value is not None else not meal.get("done")
        elif payload.action == "outside":
            meal["outside"] = not meal.get("outside")
            meal["done"] = bool(meal["outside"]) or meal.get("done", False)
            message = "🍴 Repas pris à l'extérieur, compté comme fait." if meal["outside"] else "Repas à nouveau prévu à la maison."
        elif payload.action == "favorite":
            meal["favorite"] = not meal.get("favorite")
            op = "$addToSet" if meal["favorite"] else "$pull"
            await db.preferences.update_one({"user_id": user.user_id}, {op: {"favorites": meal["recipe"]["blueprint_id"]}}, upsert=True)
            message = "Coup de cœur enregistré." if meal["favorite"] else "Retiré des favoris."
        elif payload.action == "rating":
            rating = payload.value if payload.value in ("like", "neutral", "avoid", None) else None
            meal["rating"] = rating
            bp = meal["recipe"]["blueprint_id"]
            if rating == "avoid":
                await db.preferences.update_one({"user_id": user.user_id}, {"$addToSet": {"avoid": bp}}, upsert=True)
            else:
                await db.preferences.update_one({"user_id": user.user_id}, {"$pull": {"avoid": bp}}, upsert=True)
            message = "Avis enregistré."
        elif payload.action in ("replace", "quick"):
            tgt = await _targets(user.user_id)
            pantry = await _pantry(user.user_id)
            prefs = await _prefs(user.user_id)
            seed = int(datetime.now(timezone.utc).timestamp() * 1000) % 2147483647
            mood = payload.mood if payload.mood in MOODS else None
            new_meal = replace_meal(tgt, week, payload.day, payload.meal, pantry, prefs, seed, mood=mood, quick_only=(payload.action == "quick"))
            if not new_meal:
                raise HTTPException(status_code=400, detail="Aucune autre proposition compatible trouvée. Le repas initial est conservé.")
            new_meal["done"] = meal.get("done", False)
            day["meals"][payload.meal] = new_meal
            message = "⚡ Version rapide proposée, toujours adaptée à votre plan." if payload.action == "quick" else "🔄 Nouveau repas proposé, toujours adapté à votre plan."
        elif payload.action == "set_component":
            v = payload.value if isinstance(payload.value, dict) else {}
            tgt = await _targets(user.user_id)
            if not set_component(meal, int(v.get("index", -1)), str(v.get("food_id", "")), tgt, await _pantry(user.user_id)):
                raise HTTPException(status_code=400, detail="Substitut indisponible pour cet aliment.")
            message = "Aliment remplacé, quantité adaptée à votre plan."
        elif payload.action == "replace_component":
            tgt = await _targets(user.user_id)
            pantry = await _pantry(user.user_id)
            prefs = await _prefs(user.user_id)
            seed = int(datetime.now(timezone.utc).timestamp() * 1000) % 2147483647
            if not replace_component(meal, int(payload.value or 0), tgt, pantry, prefs, seed):
                raise HTTPException(status_code=400, detail="Aucun équivalent disponible pour cet aliment.")
            message = "Aliment remplacé par un équivalent, quantité adaptée."
        else:
            raise HTTPException(status_code=400, detail="Action inconnue")
    upd: Dict[str, Any] = {"weeks": weeks}
    if snapshot:
        upd["undo"] = snapshot
    await db.programs.update_one({"id": program_id}, {"$set": upd})
    return {"ok": True, "message": message, "day": day, "week": payload.week, "day_index": payload.day, "can_undo": bool(snapshot or doc.get("undo"))}


# ---------------------------------------------------------------------------
# Photos de plats (Emergent Object Storage) & défis
# ---------------------------------------------------------------------------
async def _user_from_token(token: Optional[str]) -> Optional[str]:
    if not token:
        return None
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0, "user_id": 1})
    return session["user_id"] if session else None


@api_router.post("/programs/{program_id}/meals/photo")
async def upload_meal_photo(program_id: str, week: int = Query(...), day: int = Query(...), meal: str = Query(...), file: UploadFile = File(...), user: User = Depends(get_current_user)):
    doc = await _program(program_id, user.user_id)
    weeks = doc["weeks"]
    try:
        target = weeks[week]["days"][day]["meals"][meal]
    except (IndexError, KeyError):
        raise HTTPException(status_code=404, detail="Repas introuvable")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Photo trop lourde (max 8 Mo)")
    ctype = file.content_type or "image/jpeg"
    ext = "png" if "png" in ctype else ("webp" if "webp" in ctype else "jpg")
    path = f"{APP_NAME}/uploads/{user.user_id}/{uuid.uuid4().hex}.{ext}"
    try:
        await run_in_threadpool(put_object, path, data, ctype)
    except PermissionError as e:
        raise HTTPException(status_code=402, detail=str(e))
    except Exception as e:
        logger.warning(f"upload photo: {e}")
        raise HTTPException(status_code=503, detail="Stockage indisponible, réessayez plus tard.")
    await db.photos.insert_one({"id": str(uuid.uuid4()), "user_id": user.user_id, "path": path, "content_type": ctype, "created_at": datetime.now(timezone.utc)})
    target["photo"] = path
    bp = target["recipe"]["blueprint_id"]
    await db.preferences.update_one({"user_id": user.user_id}, {"$set": {f"photos.{bp}": path}}, upsert=True)
    await db.programs.update_one({"id": program_id}, {"$set": {"weeks": weeks}})
    return {"ok": True, "path": path, "day": weeks[week]["days"][day]}


@api_router.delete("/programs/{program_id}/meals/photo")
async def remove_meal_photo(program_id: str, week: int = Query(...), day: int = Query(...), meal: str = Query(...), user: User = Depends(get_current_user)):
    doc = await _program(program_id, user.user_id)
    weeks = doc["weeks"]
    try:
        target = weeks[week]["days"][day]["meals"][meal]
    except (IndexError, KeyError):
        raise HTTPException(status_code=404, detail="Repas introuvable")
    target.pop("photo", None)
    await db.programs.update_one({"id": program_id}, {"$set": {"weeks": weeks}})
    return {"ok": True, "day": weeks[week]["days"][day]}


@api_router.get("/files/{path:path}")
async def get_file(path: str, token: Optional[str] = Query(None), authorization: Optional[str] = Header(None)):
    user_id = await _user_from_token(token or (authorization.split(" ", 1)[1] if authorization and authorization.startswith("Bearer ") else None))
    if not user_id:
        raise HTTPException(status_code=401, detail="Non autorisé")
    photo = await db.photos.find_one({"path": path, "user_id": user_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo introuvable")
    try:
        content, ctype = await run_in_threadpool(get_object, path)
    except Exception as e:
        logger.warning(f"get photo: {e}")
        raise HTTPException(status_code=503, detail="Stockage indisponible")
    return Response(content=content, media_type=ctype, headers={"Cache-Control": "private, max-age=86400"})


MEAL_TIMES = {"breakfast": (7, 30), "lunch": (12, 30), "snack": (16, 30), "dinner": (19, 30)}


@api_router.get("/programs/{program_id}/badges")
async def get_badges(program_id: str, user: User = Depends(get_current_user)):
    doc = await _program(program_id, user.user_id)
    pantry = await _pantry(user.user_id)
    checked = doc.get("shopping_checked", [])
    weeks_out = []
    total_done = 0
    total_meals = 0
    distinct_done = set()
    favorites = 0
    best_streak = 0
    streak = 0
    for wi, week in enumerate(doc["weeks"]):
        meals = 0
        done = 0
        for day in week["days"]:
            day_meals = list(day["meals"].values())
            meals += len(day_meals)
            d = sum(1 for m in day_meals if m.get("done"))
            done += d
            for m in day_meals:
                if m.get("done"):
                    distinct_done.add(m["recipe"]["blueprint_id"])
                if m.get("favorite"):
                    favorites += 1
            if day_meals and d == len(day_meals):
                streak += 1
                best_streak = max(best_streak, streak)
            else:
                streak = 0
        shop = shopping_for_week(week, pantry, checked, wi)
        weeks_out.append({"week": wi + 1, "meals_done": done, "meals_total": meals, "shopping_checked": shop["checked"], "shopping_total": shop["total"],
                          "perfect_week": meals > 0 and done == meals, "shopping_complete": shop["total"] > 0 and shop["checked"] == shop["total"]})
        total_done += done
        total_meals += meals
    badges = [
        {"id": "first_cook", "label": "Première recette", "icon": "chef-hat", "desc": "Cuisiner un premier repas", "earned": total_done >= 1, "progress": min(1, total_done), "target": 1},
        {"id": "explorer", "label": "Explorateur", "icon": "compass", "desc": "10 recettes différentes réalisées", "earned": len(distinct_done) >= 10, "progress": len(distinct_done), "target": 10},
        {"id": "streak3", "label": "Série de 3 jours", "icon": "flame", "desc": "3 jours complets d'affilée", "earned": best_streak >= 3, "progress": min(best_streak, 3), "target": 3},
        {"id": "gourmet", "label": "Gourmet", "icon": "heart", "desc": "3 coups de cœur", "earned": favorites >= 3, "progress": min(favorites, 3), "target": 3},
        {"id": "shopper", "label": "Courses bouclées", "icon": "shopping-basket", "desc": "Une liste de courses terminée", "earned": any(w["shopping_complete"] for w in weeks_out), "progress": sum(1 for w in weeks_out if w["shopping_complete"]), "target": 1},
        {"id": "perfect", "label": "Semaine parfaite", "icon": "trophy", "desc": "Tous les repas d'une semaine faits", "earned": any(w["perfect_week"] for w in weeks_out), "progress": sum(1 for w in weeks_out if w["perfect_week"]), "target": 1},
    ]
    return {"weeks": weeks_out, "badges": badges, "meals_done": total_done, "meals_total": total_meals, "best_streak": best_streak, "meal_times": MEAL_TIMES}


# ---------------------------------------------------------------------------
# Hydratation, galerie photos, favoris
# ---------------------------------------------------------------------------
class HydrationIn(BaseModel):
    delta: int = 0
    date: Optional[str] = None


class WaterGoalIn(BaseModel):
    goal: int


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def _hydration(user_id: str, date: str) -> Dict[str, Any]:
    prefs = await _prefs(user_id)
    goal = int(prefs.get("water_goal") or 8)
    doc = await db.hydration.find_one({"user_id": user_id, "date": date}, {"_id": 0})
    glasses = int(doc["glasses"]) if doc else 0
    history = await db.hydration.find({"user_id": user_id}, {"_id": 0, "date": 1, "glasses": 1}).sort("date", -1).to_list(7)
    return {"date": date, "glasses": glasses, "goal": goal, "progress": min(100, round(glasses * 100 / goal)) if goal else 0, "history": history}


@api_router.get("/hydration/today")
async def hydration_today(user: User = Depends(get_current_user)):
    return await _hydration(user.user_id, _today())


@api_router.post("/hydration")
async def hydration_update(payload: HydrationIn, user: User = Depends(get_current_user)):
    date = payload.date or _today()
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
        raise HTTPException(status_code=400, detail="Date invalide")
    doc = await db.hydration.find_one({"user_id": user.user_id, "date": date}, {"_id": 0})
    glasses = max(0, min(30, (int(doc["glasses"]) if doc else 0) + int(payload.delta)))
    await db.hydration.update_one({"user_id": user.user_id, "date": date}, {"$set": {"glasses": glasses, "updated_at": datetime.now(timezone.utc)}}, upsert=True)
    return await _hydration(user.user_id, date)


@api_router.put("/hydration/goal")
async def hydration_goal(payload: WaterGoalIn, user: User = Depends(get_current_user)):
    if not (2 <= payload.goal <= 20):
        raise HTTPException(status_code=400, detail="Objectif entre 2 et 20 verres")
    await db.preferences.update_one({"user_id": user.user_id}, {"$set": {"water_goal": payload.goal}}, upsert=True)
    return await _hydration(user.user_id, _today())


@api_router.get("/photos")
async def list_photos(user: User = Depends(get_current_user)):
    programs = await db.programs.find({"user_id": user.user_id, **NEW_FORMAT}, {"_id": 0, "id": 1, "name": 1, "active": 1, "weeks": 1, "created_at": 1}).sort("created_at", -1).to_list(50)
    out = []
    for p in programs:
        for wi, week in enumerate(p.get("weeks", [])):
            for di, day in enumerate(week["days"]):
                for key, meal in day["meals"].items():
                    if meal.get("photo"):
                        out.append({"path": meal["photo"], "program_id": p["id"], "program_name": p["name"], "active": bool(p.get("active")), "week": wi, "day": di, "day_name": day["day"], "meal": key, "meal_label": MEAL_LABELS.get(key, key), "recipe_name": meal["recipe"]["name"]})
    return {"photos": out, "total": len(out)}


@api_router.get("/favorites")
async def list_favorites(user: User = Depends(get_current_user)):
    prefs = await _prefs(user.user_id)
    fav_bps = set(prefs.get("favorites", []))
    doc = await db.programs.find_one({"user_id": user.user_id, "active": True, **NEW_FORMAT}, {"_id": 0})
    out = []
    seen = set()
    if doc:
        for wi, week in enumerate(doc["weeks"]):
            for di, day in enumerate(week["days"]):
                for key, meal in day["meals"].items():
                    bp = meal["recipe"]["blueprint_id"]
                    if meal.get("favorite") or bp in fav_bps:
                        sig = (bp, meal["recipe"]["name"])
                        if sig in seen:
                            continue
                        seen.add(sig)
                        out.append({"program_id": doc["id"], "week": wi, "day": di, "day_name": day["day"], "meal": key, "meal_label": MEAL_LABELS.get(key, key), "recipe": meal["recipe"], "components": meal["components"], "photo": meal.get("photo"), "favorite": bool(meal.get("favorite")), "done": bool(meal.get("done"))})
    return {"favorites": out, "total": len(out)}


# ---------------------------------------------------------------------------
# Bilan hebdo & batch cooking
# ---------------------------------------------------------------------------
@api_router.get("/programs/{program_id}/recap/{week}")
async def weekly_recap(program_id: str, week: int, user: User = Depends(get_current_user)):
    doc = await _program(program_id, user.user_id)
    if week < 0 or week >= len(doc["weeks"]):
        raise HTTPException(status_code=404, detail="Semaine introuvable")
    wk = doc["weeks"][week]
    meals = done = outside = favs = cooked_min = 0
    for day in wk["days"]:
        for m in day["meals"].values():
            meals += 1
            if m.get("done"):
                done += 1
                cooked_min += int(m["recipe"].get("minutes", 0))
            if m.get("outside"):
                outside += 1
            if m.get("favorite"):
                favs += 1
    shop = shopping_for_week(wk, await _pantry(user.user_id), doc.get("shopping_checked", []), week)
    hist = await db.hydration.find({"user_id": user.user_id}, {"_id": 0, "glasses": 1, "date": 1}).sort("date", -1).to_list(7)
    prefs = await _prefs(user.user_id)
    water_goal = int(prefs.get("water_goal") or 8)
    water_avg = round(sum(h["glasses"] for h in hist) / len(hist), 1) if hist else 0
    weights = await db.weights.find({"user_id": user.user_id}, {"_id": 0, "weight": 1, "date": 1}).sort("date", -1).to_list(6)
    trend = None
    if len(weights) >= 2:
        trend = round(weights[0]["weight"] - weights[-1]["weight"], 1)
    pct = round(done * 100 / meals) if meals else 0
    if meals and pct >= 90:
        tip = "Semaine exemplaire ! Pour la suite, variez les recettes en testant une « envie » (frais, réconfort, végétarien) sur un repas."
    elif pct >= 60:
        tip = "Belle régularité. Repérez les repas sautés : la version ⚡ « Je n'ai pas le temps » vous aidera les jours chargés."
    elif meals:
        tip = "Un nouveau départ chaque lundi : préparez vos féculents en avance (batch cooking) pour gagner du temps en semaine."
    else:
        tip = "Générez votre programme pour démarrer votre suivi hebdomadaire."
    if water_avg and water_avg < water_goal * 0.6:
        tip += " Pensez aussi à l'eau : un verre à chaque repas et un entre les repas."
    if trend is not None and trend > 0.5:
        tip += " Le poids fluctue naturellement : gardez une pesée par semaine, le matin, à jeun."
    return {"week": week + 1, "meals": meals, "done": done, "progress": pct, "outside": outside, "favorites": favs, "cooked_minutes": cooked_min,
            "shopping_checked": shop["checked"], "shopping_total": shop["total"], "water_avg": water_avg, "water_goal": water_goal, "weight_trend": trend, "tip": tip}


BATCH_TIPS = {
    "starch": "Cuisez la quantité totale en une fois (al dente pour les pâtes, un peu ferme pour le riz), refroidissez vite et conservez 3 jours au frais.",
    "protein": "Cuisez ou marinez en une seule fournée : portionnez au gramme dans des boîtes, 2 jours au frais ou congelez.",
    "vegetables": "Lavez, détaillez et précuisez à la vapeur : ils se réchauffent en 3 minutes à la poêle ou au four.",
}


@api_router.get("/programs/{program_id}/batch/{week}")
async def batch_cooking(program_id: str, week: int, user: User = Depends(get_current_user)):
    doc = await _program(program_id, user.user_id)
    if week < 0 or week >= len(doc["weeks"]):
        raise HTTPException(status_code=404, detail="Semaine introuvable")
    wk = doc["weeks"][week]
    groups: Dict[str, Dict[str, Any]] = {}
    for di, day in enumerate(wk["days"]):
        for key in ("lunch", "dinner"):
            m = day["meals"].get(key)
            if not m:
                continue
            for c in m["components"]:
                if c["category"] not in ("starch", "protein", "vegetables") or c["food_id"] in ("pain_complet", "biscottes"):
                    continue
                g = groups.setdefault(c["food_id"], {"food_id": c["food_id"], "food_name": c["food_name"], "category": c["category"], "category_label": c["category_label"], "total_grams": 0, "meals": []})
                g["total_grams"] += c["grams"]
                g["meals"].append({"day": di, "day_name": day["day"], "meal": key, "meal_label": MEAL_LABELS[key], "recipe_name": m["recipe"]["name"], "grams": c["grams"], "done": bool(m.get("done"))})
    out = []
    for g in groups.values():
        if len(g["meals"]) < 2:
            continue
        g["total_grams"] = int(round(g["total_grams"]))
        g["tip"] = BATCH_TIPS[g["category"]]
        g["days"] = sorted({m["day"] for m in g["meals"]})
        out.append(g)
    out.sort(key=lambda g: (-len(g["meals"]), g["category"]))
    sessions = [
        {"title": "Dimanche · session 1", "desc": "Féculents et légumes du lundi au mercredi", "items": [g["food_name"] for g in out if any(d <= 2 for d in g["days"])]},
        {"title": "Mercredi soir · session 2", "desc": "Protéines et légumes du jeudi au dimanche", "items": [g["food_name"] for g in out if any(d >= 3 for d in g["days"])]},
    ]
    saved = sum(max(0, (len(g["meals"]) - 1) * (12 if g["category"] == "starch" else 8)) for g in out)
    return {"week": week + 1, "groups": out, "sessions": sessions, "minutes_saved": saved}


# ---------------------------------------------------------------------------
# Weight tracking
# ---------------------------------------------------------------------------
@api_router.get("/weights")
async def list_weights(user: User = Depends(get_current_user)):
    docs = await db.weights.find({"user_id": user.user_id}, {"_id": 0, "user_id": 0}).sort("date", 1).to_list(500)
    for d in docs:
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
    return docs


@api_router.post("/weights")
async def add_weight(entry: WeightEntry, user: User = Depends(get_current_user)):
    doc = entry.model_dump()
    doc["user_id"] = user.user_id
    await db.weights.insert_one(doc.copy())
    doc.pop("user_id", None)
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


@api_router.delete("/weights/{entry_id}")
async def delete_weight(entry_id: str, user: User = Depends(get_current_user)):
    await db.weights.delete_one({"id": entry_id, "user_id": user.user_id})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Inventory
# ---------------------------------------------------------------------------
@api_router.get("/inventory")
async def list_inventory(user: User = Depends(get_current_user)):
    docs = await db.inventory.find({"user_id": user.user_id}, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
    return docs


@api_router.post("/inventory")
async def add_inventory(item: InventoryItem, user: User = Depends(get_current_user)):
    doc = item.model_dump()
    doc["user_id"] = user.user_id
    await db.inventory.insert_one(doc.copy())
    doc.pop("user_id", None)
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


@api_router.put("/inventory/{item_id}")
async def update_inventory(item_id: str, patch: Dict[str, Any], user: User = Depends(get_current_user)):
    patch.pop("user_id", None)
    patch.pop("_id", None)
    await db.inventory.update_one({"id": item_id, "user_id": user.user_id}, {"$set": patch})
    return {"ok": True}


@api_router.delete("/inventory/{item_id}")
async def delete_inventory(item_id: str, user: User = Depends(get_current_user)):
    await db.inventory.delete_one({"id": item_id, "user_id": user.user_id})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Boot
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Mon plan alimentaire API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.programs.create_index([("user_id", 1), ("created_at", -1)])
        await db.weights.create_index([("user_id", 1), ("date", 1)])
        await db.inventory.create_index([("user_id", 1), ("location", 1)])
        # Nettoyage des programmes de l'ancien format (itération 1), incompatibles avec les fiches recettes
        try:
            await run_in_threadpool(init_storage)
        except Exception as e:
            logger.warning(f"object storage init: {e}")
        res = await db.programs.delete_many({"shopping_checked": {"$exists": False}})
        if res.deleted_count:
            logger.info(f"programmes ancien format supprimés : {res.deleted_count}")
    except Exception as e:
        logger.warning(f"index creation: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()

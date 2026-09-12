from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import uuid
import httpx
import bcrypt
from foods import library_payload, DEFAULT_PROGRAM
from engine import (generate_plan, shopping_for_week, replace_meal, replace_component, swap_day, can_swap, parse_program_text, normalize_program, MOODS)
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
    return await _prefs(user.user_id)


# ---------------------------------------------------------------------------
# Programmes
# ---------------------------------------------------------------------------
async def _program(program_id: str, user_id: str) -> Dict[str, Any]:
    doc = await db.programs.find_one({"id": program_id, "user_id": user_id}, {"_id": 0})
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
    docs = await db.programs.find({"user_id": user.user_id}, {"_id": 0, "weeks": 0, "shopping_checked": 0}).sort("created_at", -1).to_list(50)
    return [_serialize(d) for d in docs]


@api_router.get("/programs/current")
async def current_program(user: User = Depends(get_current_user)):
    doc = await db.programs.find_one({"user_id": user.user_id, "active": True}, {"_id": 0})
    if not doc:
        doc = await db.programs.find_one({"user_id": user.user_id}, {"_id": 0}, sort=[("created_at", -1)])
    if not doc or "weeks" not in doc or not doc["weeks"] or "meals" not in doc["weeks"][0]["days"][0] or not isinstance(next(iter(doc["weeks"][0]["days"][0]["meals"].values()), {}), dict):
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
async def get_shopping(program_id: str, week: int, user: User = Depends(get_current_user)):
    doc = await _program(program_id, user.user_id)
    if week < 0 or week >= len(doc["weeks"]):
        raise HTTPException(status_code=404, detail="Semaine introuvable")
    return shopping_for_week(doc["weeks"][week], await _pantry(user.user_id), doc.get("shopping_checked", []), week)


@api_router.post("/programs/{program_id}/shopping/toggle")
async def toggle_shopping(program_id: str, payload: ShoppingToggleIn, user: User = Depends(get_current_user)):
    await _program(program_id, user.user_id)
    op = {"$addToSet": {"shopping_checked": payload.key}} if payload.checked else {"$pull": {"shopping_checked": payload.key}}
    await db.programs.update_one({"id": program_id}, op)
    return {"ok": True}


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
    if payload.action == "swap_day":
        if not can_swap(await _targets(user.user_id)) or not swap_day(day):
            raise HTTPException(status_code=400, detail="Interversion impossible : les deux repas doivent avoir exactement les mêmes catégories et portions.")
        message = "Déjeuner et dîner intervertis sans modifier les portions."
    else:
        if not meal:
            raise HTTPException(status_code=404, detail="Repas introuvable")
        if payload.action == "done":
            meal["done"] = bool(payload.value) if payload.value is not None else not meal.get("done")
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
    await db.programs.update_one({"id": program_id}, {"$set": {"weeks": weeks}})
    return {"ok": True, "message": message, "day": day, "week": payload.week, "day_index": payload.day}


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
    except Exception as e:
        logger.warning(f"index creation: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()

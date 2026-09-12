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


class FoodItem(BaseModel):
    category: str
    label: str
    grams: int = 0


class MealConfig(BaseModel):
    active: bool = True
    variant: Optional[str] = None  # For breakfast: 'salted', 'sweet_cereal', 'sweet_bread', 'both'
    items: List[FoodItem] = []


class RulesConfig(BaseModel):
    max_fruits_per_day: int = 3
    max_cheese_per_day: int = 1
    max_cheese_per_week: int = 4
    max_sweet_morning: int = 1
    no_double_starch: bool = True
    allow_lunch_dinner_swap: bool = True
    exclusions: List[str] = []


class TargetsIn(BaseModel):
    breakfast: MealConfig
    lunch: MealConfig
    snack: MealConfig
    dinner: MealConfig
    rules: RulesConfig
    duration_weeks: int = 4


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
# Targets
# ---------------------------------------------------------------------------
DEFAULT_TARGETS = {
    "breakfast": {
        "active": True,
        "variant": "both",
        "items": [
            {"category": "Féculents", "label": "Pain complet / biscottes", "grams": 60},
            {"category": "Laitages", "label": "Yaourt / fromage blanc", "grams": 125},
            {"category": "Protéines", "label": "Œufs / jambon", "grams": 50},
            {"category": "Fruits", "label": "Fruit / compote", "grams": 100},
            {"category": "Matières grasses", "label": "Beurre / purée d'oléagineux", "grams": 10},
            {"category": "Produits sucrés", "label": "Miel / confiture", "grams": 15},
        ],
    },
    "lunch": {
        "active": True,
        "variant": None,
        "items": [
            {"category": "Protéines", "label": "Viandes / poissons / œufs", "grams": 130},
            {"category": "Légumes", "label": "Légumes variés", "grams": 250},
            {"category": "Féculents cuits", "label": "Riz / pâtes / quinoa", "grams": 180},
            {"category": "Matières grasses", "label": "Huile / beurre", "grams": 15},
            {"category": "Laitages", "label": "Yaourt / fromage", "grams": 100},
            {"category": "Fruits", "label": "Fruit / compote", "grams": 120},
        ],
    },
    "snack": {
        "active": True,
        "variant": None,
        "items": [
            {"category": "Fruits", "label": "Fruit", "grams": 120},
            {"category": "Fruits oléagineux", "label": "Amandes / noix", "grams": 20},
            {"category": "Chocolat", "label": "Chocolat noir 70%", "grams": 15},
        ],
    },
    "dinner": {
        "active": True,
        "variant": None,
        "items": [
            {"category": "Protéines", "label": "Viandes / poissons / œufs", "grams": 120},
            {"category": "Légumes", "label": "Légumes variés", "grams": 250},
            {"category": "Féculents cuits", "label": "Riz / pâtes / quinoa", "grams": 150},
            {"category": "Matières grasses", "label": "Huile / beurre", "grams": 15},
            {"category": "Laitages", "label": "Yaourt / fromage", "grams": 100},
            {"category": "Fruits", "label": "Fruit / compote", "grams": 120},
        ],
    },
    "rules": {
        "max_fruits_per_day": 3,
        "max_cheese_per_day": 1,
        "max_cheese_per_week": 4,
        "max_sweet_morning": 1,
        "no_double_starch": True,
        "allow_lunch_dinner_swap": True,
        "exclusions": [],
    },
    "duration_weeks": 4,
}


@api_router.get("/targets")
async def get_targets(user: User = Depends(get_current_user)):
    doc = await db.targets.find_one({"user_id": user.user_id}, {"_id": 0, "user_id": 0})
    if not doc:
        return DEFAULT_TARGETS
    return doc


@api_router.put("/targets")
async def put_targets(payload: TargetsIn, user: User = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["user_id"] = user.user_id
    doc["updated_at"] = datetime.now(timezone.utc)
    await db.targets.update_one({"user_id": user.user_id}, {"$set": doc}, upsert=True)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Menu Generation
# ---------------------------------------------------------------------------
FOOD_BANK = {
    "Féculents": ["Pain complet", "Biscottes", "Muffin anglais", "Pain aux céréales"],
    "Féculents cuits": ["Riz complet", "Pâtes complètes", "Quinoa", "Boulgour", "Semoule", "Pommes de terre", "Patate douce", "Lentilles", "Pois chiches", "Haricots rouges", "Gnocchis"],
    "Laitages": ["Yaourt nature", "Fromage blanc", "Skyr", "Fromage (comté)", "Fromage frais", "Lait demi-écrémé"],
    "Protéines": ["Poulet", "Dinde", "Bœuf maigre", "Cabillaud", "Saumon", "Œufs", "Sardines", "Tofu", "Tempeh", "Crevettes"],
    "Légumes": ["Courgettes", "Épinards", "Brocolis", "Carottes", "Poivrons", "Haricots verts", "Aubergines", "Salade verte", "Tomates", "Champignons"],
    "Matières grasses": ["Huile d'olive", "Huile de colza", "Beurre", "Purée d'amandes"],
    "Fruits": ["Pomme", "Banane", "Orange", "Kiwi", "Poire", "Fraises", "Framboises", "Myrtilles", "Compote pomme", "Ananas"],
    "Produits sucrés": ["Miel", "Confiture", "Pâte à tartiner"],
    "Fruits oléagineux": ["Amandes", "Noix", "Noisettes", "Noix de cajou"],
    "Chocolat": ["Chocolat noir 70%"],
}

MEAL_ORDER = ["breakfast", "lunch", "snack", "dinner"]
MEAL_LABELS = {"breakfast": "Petit-déjeuner", "lunch": "Déjeuner", "snack": "Collation", "dinner": "Dîner"}
DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]


def _pick_food(category: str, exclusions: List[str], seed: random.Random) -> str:
    pool = FOOD_BANK.get(category, [])
    pool = [p for p in pool if p.lower() not in [e.lower() for e in exclusions]]
    if not pool:
        pool = FOOD_BANK.get(category, [category])
    return seed.choice(pool)


def _build_meal(meal_cfg: Dict[str, Any], exclusions: List[str], seed: random.Random) -> List[Dict[str, Any]]:
    items = []
    for it in meal_cfg.get("items", []):
        if it["grams"] <= 0:
            continue
        items.append({
            "category": it["category"],
            "food": _pick_food(it["category"], exclusions, seed),
            "grams": it["grams"],
        })
    return items


@api_router.post("/programs/generate")
async def generate_program(user: User = Depends(get_current_user)):
    tgt_doc = await db.targets.find_one({"user_id": user.user_id}, {"_id": 0, "user_id": 0})
    tgt = tgt_doc or DEFAULT_TARGETS
    weeks = int(tgt.get("duration_weeks", 4))
    exclusions = tgt.get("rules", {}).get("exclusions", [])
    seed = random.Random(f"{user.user_id}-{datetime.now(timezone.utc).timestamp()}")

    plan_weeks = []
    for w in range(weeks):
        days = []
        for d in range(7):
            meals = {}
            for m in MEAL_ORDER:
                cfg = tgt.get(m, {})
                if not cfg.get("active", True):
                    continue
                meals[m] = _build_meal(cfg, exclusions, seed)
            days.append({"day": DAY_LABELS[d], "meals": meals})
        plan_weeks.append({"week": w + 1, "days": days})

    # Shopping list aggregation for week 1
    shopping = {}
    for day in plan_weeks[0]["days"]:
        for meal in day["meals"].values():
            for item in meal:
                key = item["food"]
                shopping[key] = shopping.get(key, 0) + item["grams"]

    program = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "name": f"Programme du {datetime.now(timezone.utc).strftime('%d/%m/%Y')}",
        "created_at": datetime.now(timezone.utc),
        "duration_weeks": weeks,
        "weeks": plan_weeks,
        "shopping": [{"food": k, "grams": v} for k, v in shopping.items()],
    }
    await db.programs.insert_one(program.copy())
    program.pop("_id", None)
    program["created_at"] = program["created_at"].isoformat()
    return program


@api_router.get("/programs")
async def list_programs(user: User = Depends(get_current_user)):
    docs = await db.programs.find({"user_id": user.user_id}, {"_id": 0, "weeks": 0, "shopping": 0}).sort("created_at", -1).to_list(50)
    for d in docs:
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
    return docs


@api_router.get("/programs/current")
async def current_program(user: User = Depends(get_current_user)):
    doc = await db.programs.find_one({"user_id": user.user_id}, {"_id": 0}, sort=[("created_at", -1)])
    if not doc:
        return None
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


@api_router.get("/programs/{program_id}")
async def get_program(program_id: str, user: User = Depends(get_current_user)):
    doc = await db.programs.find_one({"id": program_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Programme introuvable")
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


@api_router.delete("/programs/{program_id}")
async def delete_program(program_id: str, user: User = Depends(get_current_user)):
    await db.programs.delete_one({"id": program_id, "user_id": user.user_id})
    return {"ok": True}


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

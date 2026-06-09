from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os
import jwt
import bcrypt
import uuid
import logging

from date_utils import (
    jakarta_today_iso,
    today_range_utc_iso,
    month_range_utc_iso,
    parse_date_range_utc_iso,
    day_range_utc_iso,
)

# ================= INIT =================
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

SECRET_KEY = os.environ.get("JWT_SECRET", "mulya-salon-secret-key-2024")
ALGORITHM = "HS256"
security = HTTPBearer()

# >>> FIX 1: router harus ada dulu
api_router = APIRouter(prefix="/api")

# >>> FIX 2: single app only (pakai lifespan)
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_users()
    logging.info("App started")
    yield
    client.close()

app = FastAPI(lifespan=lifespan)

# ================= CORS =================
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= MODELS =================
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    token: str
    user: User

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    loyalty_points: int = 0
    visit_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# (model lain tetap — gue skip biar gak kepanjangan di chat, tapi aman dipakai)

# ================= AUTH =================
def hash_password(p): 
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p, h): 
    return bcrypt.checkpw(p.encode(), h.encode())

def create_token(user_id, email, role):
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        return jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

# ================= SEED =================
async def seed_users():
    if await db.users.find_one({"email": "owner@mulyasalon.com"}):
        return

    users = [
        ("owner@mulyasalon.com", "owner123", "Owner", "owner"),
        ("admin@mulyasalon.com", "admin123", "Admin", "admin"),
        ("kasir@mulyasalon.com", "kasir123", "Kasir", "kasir"),
    ]

    for email, pw, name, role in users:
        doc = {
            "id": str(uuid.uuid4()),
            "email": email,
            "password": hash_password(pw),
            "name": name,
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(doc)

# ================= AUTH ROUTES =================
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")

    user_obj = User(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=datetime.fromisoformat(user["created_at"])
    )

    return LoginResponse(
        token=create_token(user_obj.id, user_obj.email, user_obj.role),
        user=user_obj
    )

# ================= DASHBOARD (FIXED CORE BUG SAFE) =================
def build_query(start, end):
    return {"created_at": {"$gte": start, "$lte": end}}

async def aggregate(match):
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": None,
            "count": {"$sum": 1},
            "total": {"$sum": "$total"},
            "commission": {"$sum": "$commission_amount"}
        }}
    ]
    res = await db.transactions.aggregate(pipeline).to_list(1)
    return res[0] if res else {"count": 0, "total": 0, "commission": 0}

@api_router.get("/dashboard/stats")
async def stats(user=Depends(get_current_user)):
    start, end = today_range_utc_iso()

    today = await aggregate(build_query(start, end))
    month = await aggregate(build_query(*month_range_utc_iso()))

    return {
        "total_transactions_today": today["count"],
        "total_revenue_today": today["total"],
        "total_revenue_month": month["total"],
        "total_commission_today": today["commission"],
        "total_customers": await db.customers.count_documents({})
    }

# ================= REGISTER ROUTER =================
app.include_router(api_router)

# ================= RUN =================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
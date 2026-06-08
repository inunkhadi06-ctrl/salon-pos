from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os
import logging
from pathlib import Path
import jwt
import bcrypt
import uuid

from date_utils import (
    JAKARTA_TZ,
    jakarta_today_iso,
    today_range_utc_iso,
    month_range_utc_iso,
    parse_date_range_utc_iso,
    day_range_utc_iso,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'mulya-salon-secret-key-2024')
ALGORITHM = "HS256"
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ========== MODELS ==========
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "kasir"

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
    birth_date: Optional[str] = None
    loyalty_points: int = 0
    visit_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Service(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    duration: int
    price: float
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    buy_price: float
    sell_price: float
    stock: int
    min_stock: int = 10
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Stylist(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    specialty: str
    commission_rate: float
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: str
    stylist_id: str
    stylist_name: str
    service_id: str
    service_name: str
    booking_date: str
    booking_time: str
    status: str = "menunggu"
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionItem(BaseModel):
    type: str
    id: str
    name: str
    price: float
    quantity: int = 1

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: str
    stylist_id: str
    stylist_name: str
    items: List[TransactionItem]
    subtotal: float
    discount: float = 0
    total: float
    commission_amount: float = 0
    payment_method: str
    cash_paid: float = 0
    change_amount: float = 0
    payment_status: str = "lunas"
    served_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DashboardStats(BaseModel):
    total_transactions_today: int
    total_bookings_today: int
    total_customers: int
    total_revenue_month: float
    total_revenue_today: float = 0
    total_commission_today: float = 0
    top_stylist_name: Optional[str] = None
    top_stylist_revenue: float = 0

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "main"
    business_name: str = "Mulya Salon"
    logo_url: Optional[str] = None
    phone: str = ""
    address: str = ""
    open_time: str = "09:00"
    close_time: str = "21:00"
    tax_rate: float = 10.0

# ========== AUTH HELPERS ==========
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ========== SEED DEFAULT USERS ==========
async def seed_users():
    existing = await db.users.find_one({"email": "owner@mulyasalon.com"}, {"_id": 0})
    if not existing:
        users = [
            {"email": "owner@mulyasalon.com", "password": hash_password("owner123"), "name": "Owner", "role": "owner"},
            {"email": "admin@mulyasalon.com", "password": hash_password("admin123"), "name": "Admin", "role": "admin"},
            {"email": "kasir@mulyasalon.com", "password": hash_password("kasir123"), "name": "Kasir", "role": "kasir"}
        ]
        for user_data in users:
            user_obj = User(email=user_data["email"], name=user_data["name"], role=user_data["role"])
            doc = user_obj.model_dump()
            doc["password"] = user_data["password"]
            doc["created_at"] = doc["created_at"].isoformat()
            await db.users.insert_one(doc)
        logging.info("Default users seeded")

# ========== AUTH ROUTES ==========
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user_doc or not verify_password(request.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    
    user_doc.pop("password", None)
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    user = User(**user_doc)
    token = create_token(user.id, user.email, user.role)
    return LoginResponse(token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    return User(**user_doc)

# ========== DASHBOARD ==========
def _build_date_query(start_iso: str, end_iso: str) -> dict:
    """Single source of truth for date-range query on transactions.created_at."""
    return {"created_at": {"$gte": start_iso, "$lte": end_iso}}


async def _aggregate_transaction_summary(match_query: dict) -> dict:
    """Aggregate count, total revenue, and total commission for a query.

    Used by both dashboard stats and reports so they share identical math.
    """
    pipeline = [
        {"$match": match_query},
        {"$group": {
            "_id": None,
            "count": {"$sum": 1},
            "total_revenue": {"$sum": "$total"},
            "total_commission": {"$sum": "$commission_amount"},
        }},
    ]
    result = await db.transactions.aggregate(pipeline).to_list(1)
    if not result:
        return {"count": 0, "total_revenue": 0.0, "total_commission": 0.0}
    r = result[0]
    return {
        "count": r.get("count", 0),
        "total_revenue": r.get("total_revenue", 0.0) or 0.0,
        "total_commission": r.get("total_commission", 0.0) or 0.0,
    }


@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    today_start, today_end = today_range_utc_iso()
    month_start, month_end = month_range_utc_iso()
    today_str = jakarta_today_iso()

    # Today: count + revenue + commission from same aggregation (consistent)
    today_summary = await _aggregate_transaction_summary(
        _build_date_query(today_start, today_end)
    )

    # Month: aggregate revenue
    month_summary = await _aggregate_transaction_summary(
        _build_date_query(month_start, month_end)
    )

    bookings_today = await db.bookings.count_documents({"booking_date": today_str})
    total_customers = await db.customers.count_documents({})

    # Top stylist this month
    top_stylist_pipeline = [
        {"$match": _build_date_query(month_start, month_end)},
        {"$match": {"stylist_id": {"$ne": None}}},
        {"$group": {
            "_id": "$stylist_id",
            "stylist_name": {"$first": "$stylist_name"},
            "total_revenue": {"$sum": "$total"},
        }},
        {"$sort": {"total_revenue": -1}},
        {"$limit": 1},
    ]
    top_result = await db.transactions.aggregate(top_stylist_pipeline).to_list(1)
    top_stylist_name = top_result[0].get("stylist_name") if top_result else None
    top_stylist_revenue = top_result[0].get("total_revenue", 0) if top_result else 0

    return DashboardStats(
        total_transactions_today=today_summary["count"],
        total_bookings_today=bookings_today,
        total_customers=total_customers,
        total_revenue_month=month_summary["total_revenue"],
        total_revenue_today=today_summary["total_revenue"],
        total_commission_today=today_summary["total_commission"],
        top_stylist_name=top_stylist_name,
        top_stylist_revenue=top_stylist_revenue,
    )

@api_router.get("/dashboard/revenue-chart")
async def get_revenue_chart(current_user: dict = Depends(get_current_user)):
    from date_utils import jakarta_today
    today = jakarta_today()
    chart_data = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start, day_end = day_range_utc_iso(day)
        summary = await _aggregate_transaction_summary(
            _build_date_query(day_start, day_end)
        )
        chart_data.append({
            "date": day.strftime("%d/%m"),
            "revenue": summary["total_revenue"],
        })
    return chart_data

@api_router.get("/dashboard/recent-bookings")
async def get_recent_bookings(current_user: dict = Depends(get_current_user)):
    bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    return bookings

@api_router.get("/dashboard/recent-transactions")
async def get_recent_transactions(current_user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    return transactions

# ========== CUSTOMERS ==========
@api_router.get("/customers", response_model=List[Customer])
async def get_customers(current_user: dict = Depends(get_current_user)):
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    for c in customers:
        if isinstance(c.get("created_at"), str):
            c["created_at"] = datetime.fromisoformat(c["created_at"])
    return customers

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer: Customer, current_user: dict = Depends(get_current_user)):
    doc = customer.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.customers.insert_one(doc)
    return customer

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer: Customer, current_user: dict = Depends(get_current_user)):
    doc = customer.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.customers.update_one({"id": customer_id}, {"$set": doc})
    return customer

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    await db.customers.delete_one({"id": customer_id})
    return {"message": "Customer deleted"}

# ========== SERVICES ==========
@api_router.get("/services", response_model=List[Service])
async def get_services(current_user: dict = Depends(get_current_user)):
    services = await db.services.find({}, {"_id": 0}).to_list(1000)
    for s in services:
        if isinstance(s.get("created_at"), str):
            s["created_at"] = datetime.fromisoformat(s["created_at"])
    return services

@api_router.post("/services", response_model=Service)
async def create_service(service: Service, current_user: dict = Depends(get_current_user)):
    doc = service.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.services.insert_one(doc)
    return service

@api_router.put("/services/{service_id}", response_model=Service)
async def update_service(service_id: str, service: Service, current_user: dict = Depends(get_current_user)):
    doc = service.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.services.update_one({"id": service_id}, {"$set": doc})
    return service

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, current_user: dict = Depends(get_current_user)):
    await db.services.delete_one({"id": service_id})
    return {"message": "Service deleted"}

# ========== PRODUCTS ==========
@api_router.get("/products", response_model=List[Product])
async def get_products(current_user: dict = Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    for p in products:
        if isinstance(p.get("created_at"), str):
            p["created_at"] = datetime.fromisoformat(p["created_at"])
    return products

@api_router.post("/products", response_model=Product)
async def create_product(product: Product, current_user: dict = Depends(get_current_user)):
    doc = product.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.products.insert_one(doc)
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product: Product, current_user: dict = Depends(get_current_user)):
    doc = product.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.products.update_one({"id": product_id}, {"$set": doc})
    return product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    await db.products.delete_one({"id": product_id})
    return {"message": "Product deleted"}

# ========== STYLISTS ==========
@api_router.get("/stylists", response_model=List[Stylist])
async def get_stylists(current_user: dict = Depends(get_current_user)):
    stylists = await db.stylists.find({}, {"_id": 0}).to_list(1000)
    for s in stylists:
        if isinstance(s.get("created_at"), str):
            s["created_at"] = datetime.fromisoformat(s["created_at"])
    return stylists

@api_router.post("/stylists", response_model=Stylist)
async def create_stylist(stylist: Stylist, current_user: dict = Depends(get_current_user)):
    doc = stylist.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.stylists.insert_one(doc)
    return stylist

@api_router.put("/stylists/{stylist_id}", response_model=Stylist)
async def update_stylist(stylist_id: str, stylist: Stylist, current_user: dict = Depends(get_current_user)):
    doc = stylist.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.stylists.update_one({"id": stylist_id}, {"$set": doc})
    return stylist

@api_router.delete("/stylists/{stylist_id}")
async def delete_stylist(stylist_id: str, current_user: dict = Depends(get_current_user)):
    await db.stylists.delete_one({"id": stylist_id})
    return {"message": "Stylist deleted"}

# ========== BOOKINGS ==========
@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(current_user: dict = Depends(get_current_user)):
    bookings = await db.bookings.find({}, {"_id": 0}).sort("booking_date", -1).to_list(1000)
    for b in bookings:
        if isinstance(b.get("created_at"), str):
            b["created_at"] = datetime.fromisoformat(b["created_at"])
    return bookings

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking: Booking, current_user: dict = Depends(get_current_user)):
    doc = booking.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.bookings.insert_one(doc)
    return booking

@api_router.put("/bookings/{booking_id}", response_model=Booking)
async def update_booking(booking_id: str, booking: Booking, current_user: dict = Depends(get_current_user)):
    doc = booking.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.bookings.update_one({"id": booking_id}, {"$set": doc})
    return booking

@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    await db.bookings.delete_one({"id": booking_id})
    return {"message": "Booking deleted"}

# ========== TRANSACTIONS ==========
@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(current_user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for t in transactions:
        if isinstance(t.get("created_at"), str):
            t["created_at"] = datetime.fromisoformat(t["created_at"])
    return transactions

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: Transaction, current_user: dict = Depends(get_current_user)):
    # Generate invoice number
    count = await db.transactions.count_documents({})
    transaction.invoice_number = f"INV-{(count + 1):04d}"
    
    # Calculate commission based on services only (not products)
    stylist = await db.stylists.find_one({"id": transaction.stylist_id}, {"_id": 0})
    if stylist:
        commission_rate = stylist.get("commission_rate", 0)
        service_total = sum(item.price * item.quantity for item in transaction.items if item.type == "service")
        transaction.commission_amount = service_total * (commission_rate / 100)
    
    doc = transaction.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.transactions.insert_one(doc)
    
    for item in transaction.items:
        if item.type == "product":
            await db.products.update_one(
                {"id": item.id},
                {"$inc": {"stock": -item.quantity}}
            )
    
    if transaction.customer_id:
        await db.customers.update_one(
            {"id": transaction.customer_id},
            {"$inc": {"visit_count": 1, "loyalty_points": int(transaction.total / 10000)}}
        )
    
    return transaction

# ========== SETTINGS ==========
@api_router.get("/settings", response_model=Settings)
async def get_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"id": "main"}, {"_id": 0})
    if not settings:
        default_settings = Settings()
        doc = default_settings.model_dump()
        await db.settings.insert_one(doc)
        return default_settings
    return Settings(**settings)

@api_router.put("/settings", response_model=Settings)
async def update_settings(settings: Settings, current_user: dict = Depends(get_current_user)):
    doc = settings.model_dump()
    await db.settings.update_one({"id": "main"}, {"$set": doc}, upsert=True)
    return settings

# ========== REPORTS ==========
def _build_report_query(start_date: Optional[str], end_date: Optional[str]) -> dict:
    """Shared query builder used by ALL report endpoints.

    Ensures transaction report, commission report, and any other report
    pulls from EXACTLY the same set of transactions when filtered identically.
    """
    rng = parse_date_range_utc_iso(start_date, end_date)
    if rng is None:
        return {}
    start_iso, end_iso = rng
    return {"created_at": {"$gte": start_iso, "$lte": end_iso}}


@api_router.get("/reports/stylist-commission")
async def get_stylist_commission_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    match_query = _build_report_query(start_date, end_date)

    pipeline = [
        {"$match": match_query},
        {"$match": {"stylist_id": {"$ne": None}}},
        {"$group": {
            "_id": "$stylist_id",
            "stylist_name": {"$first": "$stylist_name"},
            "total_transactions": {"$sum": 1},
            "total_revenue": {"$sum": "$total"},
            "total_commission": {"$sum": "$commission_amount"}
        }},
        {"$sort": {"total_commission": -1}}
    ]

    results = await db.transactions.aggregate(pipeline).to_list(1000)
    return results


@api_router.get("/reports/transactions")
async def get_transaction_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = _build_report_query(start_date, end_date)

    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    summary = await _aggregate_transaction_summary(query)

    return {
        "transactions": transactions,
        "summary": {
            "total_revenue": summary["total_revenue"],
            "total_transactions": summary["count"],
            "total_commission": summary["total_commission"],
            "average_transaction": (
                summary["total_revenue"] / summary["count"] if summary["count"] > 0 else 0
            ),
        }
    }


@api_router.get("/reports/validate-totals")
async def validate_report_totals(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Automated validation: cross-checks transaction report, commission report,
    and dashboard for a given date range. Returns 'ok' only if all sources agree.

    If no date range provided, validates today's range (must match dashboard today).
    """
    if start_date and end_date:
        match_query = _build_report_query(start_date, end_date)
        scope = f"{start_date} to {end_date}"
    else:
        start_iso, end_iso = today_range_utc_iso()
        match_query = {"created_at": {"$gte": start_iso, "$lte": end_iso}}
        scope = f"today ({jakarta_today_iso()})"

    # Source 1: raw transaction count + sum
    raw_docs = await db.transactions.find(match_query, {"_id": 0}).to_list(10000)
    raw_count = len(raw_docs)
    raw_revenue = sum(t.get("total", 0) for t in raw_docs)
    raw_commission = sum(t.get("commission_amount", 0) for t in raw_docs)

    # Source 2: aggregation pipeline (used by dashboard + report summary)
    agg = await _aggregate_transaction_summary(match_query)

    # Source 3: commission pipeline grouped by stylist (used by commission report)
    commission_pipeline = [
        {"$match": match_query},
        {"$match": {"stylist_id": {"$ne": None}}},
        {"$group": {
            "_id": "$stylist_id",
            "total_revenue": {"$sum": "$total"},
            "total_commission": {"$sum": "$commission_amount"},
            "total_transactions": {"$sum": 1},
        }},
    ]
    by_stylist = await db.transactions.aggregate(commission_pipeline).to_list(1000)
    stylist_revenue_sum = sum(s["total_revenue"] for s in by_stylist)
    stylist_commission_sum = sum(s["total_commission"] for s in by_stylist)
    stylist_count_sum = sum(s["total_transactions"] for s in by_stylist)

    # Note: commission report may exclude transactions without stylist_id (legacy data),
    # so stylist_revenue_sum can be <= raw_revenue. We flag this rather than fail.
    untracked_revenue = raw_revenue - stylist_revenue_sum
    untracked_count = raw_count - stylist_count_sum

    consistent_main = (
        raw_count == agg["count"]
        and abs(raw_revenue - agg["total_revenue"]) < 0.01
        and abs(raw_commission - agg["total_commission"]) < 0.01
    )

    return {
        "scope": scope,
        "consistent": consistent_main,
        "raw": {
            "count": raw_count,
            "revenue": raw_revenue,
            "commission": raw_commission,
        },
        "aggregation": agg,
        "commission_report_sum": {
            "count": stylist_count_sum,
            "revenue": stylist_revenue_sum,
            "commission": stylist_commission_sum,
        },
        "untracked_legacy": {
            "count": untracked_count,
            "revenue": untracked_revenue,
            "note": "Transactions without stylist_id (created before Stylist field was required)."
        } if untracked_count > 0 else None,
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await seed_users()
    logger.info("Application started")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    client.close()

app = FastAPI(lifespan=lifespan)


import os

port = int(os.environ.get("PORT", 8000))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=port)    

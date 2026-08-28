from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import bcrypt
import jwt
import stripe
from datetime import datetime, timezone, timedelta, date, time as dtime
from typing import List, Optional, Literal
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, status
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ------------------------- Setup -------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7),
               "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def oid(v: str) -> ObjectId:
    try:
        return ObjectId(v)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="ID inválido")

def doc_out(d: dict) -> dict:
    d = dict(d)
    d["id"] = str(d.pop("_id"))
    d.pop("password_hash", None)
    return d

# ------------------------- App -------------------------
app = FastAPI(title="AgendaBella")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------- Models -------------------------
Role = Literal["cliente", "profissional", "admin"]

class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: Role = "cliente"
    phone: Optional[str] = None
    # Professional-specific
    category: Optional[str] = None
    bio: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ServiceIn(BaseModel):
    name: str
    description: Optional[str] = ""
    price: float = Field(gt=0)
    duration_minutes: int = Field(gt=0, le=480)

class AvailabilityIn(BaseModel):
    weekday: int = Field(ge=0, le=6)  # 0=Mon .. 6=Sun
    start_time: str  # "09:00"
    end_time: str    # "18:00"

class ProfessionalUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    category: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    business_name: Optional[str] = None
    address: Optional[str] = None

class BookingIn(BaseModel):
    professional_id: str
    service_id: str
    date: str      # YYYY-MM-DD
    start_time: str  # HH:MM

class CheckoutIn(BaseModel):
    booking_id: str
    origin_url: str

# ------------------------- Auth -------------------------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Não autenticado")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "Usuário não encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token inválido")

def require_role(*roles: str):
    async def dep(user=Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(403, "Acesso negado")
        return user
    return dep

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True,
        secure=True, samesite="none", max_age=604800, path="/",
    )

@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email já cadastrado")
    doc = {
        "name": body.name,
        "email": email,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "phone": body.phone,
        "category": body.category,
        "bio": body.bio,
        "photo_url": None,
        "business_name": None,
        "address": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(doc)
    uid = str(result.inserted_id)
    token = create_access_token(uid, email)
    set_auth_cookie(response, token)
    doc["_id"] = result.inserted_id
    return {"user": doc_out(doc), "token": token}

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(401, "Credenciais inválidas")
    token = create_access_token(str(user["_id"]), email)
    set_auth_cookie(response, token)
    return {"user": doc_out(user), "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return doc_out(user)

# ------------------------- Professionals -------------------------
@api.get("/professionals")
async def list_professionals(category: Optional[str] = None):
    q = {"role": "profissional"}
    if category:
        q["category"] = category
    pros = await db.users.find(q).to_list(500)
    out = []
    for p in pros:
        services = await db.services.find({"professional_id": str(p["_id"])}).to_list(200)
        d = doc_out(p)
        d["services_count"] = len(services)
        d["min_price"] = min([s["price"] for s in services], default=None)
        out.append(d)
    return out

@api.get("/professionals/{pid}")
async def get_professional(pid: str):
    p = await db.users.find_one({"_id": oid(pid), "role": "profissional"})
    if not p:
        raise HTTPException(404, "Profissional não encontrado")
    services = await db.services.find({"professional_id": pid}).to_list(200)
    availabilities = await db.availabilities.find({"professional_id": pid}).to_list(50)
    return {
        "professional": doc_out(p),
        "services": [doc_out(s) for s in services],
        "availabilities": [doc_out(a) for a in availabilities],
    }

@api.patch("/professionals/me")
async def update_me(body: ProfessionalUpdate, user=Depends(require_role("profissional", "admin"))):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.users.update_one({"_id": user["_id"]}, {"$set": update})
    fresh = await db.users.find_one({"_id": user["_id"]})
    return doc_out(fresh)

# ------------------------- Services (Professional's) -------------------------
@api.get("/services/mine")
async def my_services(user=Depends(require_role("profissional"))):
    services = await db.services.find({"professional_id": str(user["_id"])}).to_list(200)
    return [doc_out(s) for s in services]

@api.post("/services")
async def create_service(body: ServiceIn, user=Depends(require_role("profissional"))):
    doc = body.model_dump()
    doc["professional_id"] = str(user["_id"])
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    r = await db.services.insert_one(doc)
    doc["_id"] = r.inserted_id
    return doc_out(doc)

@api.delete("/services/{sid}")
async def delete_service(sid: str, user=Depends(require_role("profissional", "admin"))):
    q = {"_id": oid(sid)}
    if user["role"] == "profissional":
        q["professional_id"] = str(user["_id"])
    r = await db.services.delete_one(q)
    if r.deleted_count == 0:
        raise HTTPException(404, "Serviço não encontrado")
    return {"ok": True}

# ------------------------- Availability -------------------------
@api.get("/availability/mine")
async def my_availability(user=Depends(require_role("profissional"))):
    items = await db.availabilities.find({"professional_id": str(user["_id"])}).to_list(50)
    return [doc_out(a) for a in items]

@api.post("/availability")
async def create_availability(body: AvailabilityIn, user=Depends(require_role("profissional"))):
    doc = body.model_dump()
    doc["professional_id"] = str(user["_id"])
    r = await db.availabilities.insert_one(doc)
    doc["_id"] = r.inserted_id
    return doc_out(doc)

@api.delete("/availability/{aid}")
async def delete_availability(aid: str, user=Depends(require_role("profissional"))):
    r = await db.availabilities.delete_one({"_id": oid(aid), "professional_id": str(user["_id"])})
    if r.deleted_count == 0:
        raise HTTPException(404, "Disponibilidade não encontrada")
    return {"ok": True}

# ------------------------- Availability Slots (compute) -------------------------
def parse_hhmm(s: str) -> int:
    h, m = s.split(":")
    return int(h) * 60 + int(m)

def fmt_hhmm(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"

@api.get("/professionals/{pid}/slots")
async def get_slots(pid: str, date: str, service_id: str):
    """Return available time slots for a given date and service."""
    service = await db.services.find_one({"_id": oid(service_id), "professional_id": pid})
    if not service:
        raise HTTPException(404, "Serviço não encontrado")
    try:
        target = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Data inválida")
    weekday = target.weekday()  # 0=Mon
    avails = await db.availabilities.find({"professional_id": pid, "weekday": weekday}).to_list(50)
    if not avails:
        return {"slots": []}
    duration = int(service["duration_minutes"])

    # existing bookings for this pro on this date (not cancelled)
    existing = await db.bookings.find({
        "professional_id": pid,
        "date": date,
        "status": {"$in": ["confirmed", "pending_payment"]},
    }).to_list(200)
    blocked = [(parse_hhmm(b["start_time"]), parse_hhmm(b["start_time"]) + int(b["duration_minutes"])) for b in existing]

    slots = []
    now_min = None
    today = datetime.now(timezone.utc).date()
    if target == today:
        now_min = datetime.now(timezone.utc).hour * 60 + datetime.now(timezone.utc).minute
    for a in avails:
        start = parse_hhmm(a["start_time"])
        end = parse_hhmm(a["end_time"])
        t = start
        while t + duration <= end:
            conflict = any(not (t + duration <= b[0] or t >= b[1]) for b in blocked)
            past = now_min is not None and t < now_min
            if not conflict and not past:
                slots.append(fmt_hhmm(t))
            t += 30  # 30-min grid
    return {"slots": slots, "service_duration": duration, "service_price": service["price"]}

# ------------------------- Bookings -------------------------
@api.post("/bookings")
async def create_booking(body: BookingIn, user=Depends(require_role("cliente", "admin"))):
    service = await db.services.find_one({"_id": oid(body.service_id), "professional_id": body.professional_id})
    if not service:
        raise HTTPException(404, "Serviço não encontrado")
    pro = await db.users.find_one({"_id": oid(body.professional_id), "role": "profissional"})
    if not pro:
        raise HTTPException(404, "Profissional não encontrado")

    # Verify slot free
    start = parse_hhmm(body.start_time)
    end = start + int(service["duration_minutes"])
    existing = await db.bookings.find({
        "professional_id": body.professional_id,
        "date": body.date,
        "status": {"$in": ["confirmed", "pending_payment"]},
    }).to_list(200)
    for b in existing:
        bs = parse_hhmm(b["start_time"])
        be = bs + int(b["duration_minutes"])
        if not (end <= bs or start >= be):
            raise HTTPException(409, "Horário já reservado")

    deposit = round(float(service["price"]) * 0.30, 2)
    doc = {
        "client_id": str(user["_id"]),
        "client_name": user["name"],
        "professional_id": body.professional_id,
        "professional_name": pro["name"],
        "service_id": body.service_id,
        "service_name": service["name"],
        "price": float(service["price"]),
        "deposit": deposit,
        "duration_minutes": int(service["duration_minutes"]),
        "date": body.date,
        "start_time": body.start_time,
        "status": "pending_payment",
        "payment_status": "pending",
        "session_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    r = await db.bookings.insert_one(doc)
    doc["_id"] = r.inserted_id
    return doc_out(doc)

@api.get("/bookings/mine")
async def my_bookings(user=Depends(get_current_user)):
    if user["role"] == "cliente":
        q = {"client_id": str(user["_id"])}
    elif user["role"] == "profissional":
        q = {"professional_id": str(user["_id"])}
    else:
        q = {}
    items = await db.bookings.find(q).sort("created_at", -1).to_list(500)
    return [doc_out(b) for b in items]

@api.post("/bookings/{bid}/cancel")
async def cancel_booking(bid: str, user=Depends(get_current_user)):
    b = await db.bookings.find_one({"_id": oid(bid)})
    if not b:
        raise HTTPException(404, "Agendamento não encontrado")
    if user["role"] == "cliente" and b["client_id"] != str(user["_id"]):
        raise HTTPException(403, "Sem permissão")
    if user["role"] == "profissional" and b["professional_id"] != str(user["_id"]):
        raise HTTPException(403, "Sem permissão")
    await db.bookings.update_one({"_id": oid(bid)}, {"$set": {"status": "cancelled"}})
    return {"ok": True}

# ------------------------- Payments (Stripe Flow A - diy) -------------------------
@api.post("/payments/checkout")
async def payments_checkout(body: CheckoutIn, user=Depends(get_current_user)):
    booking = await db.bookings.find_one({"_id": oid(body.booking_id)})
    if not booking:
        raise HTTPException(404, "Agendamento não encontrado")
    if booking["client_id"] != str(user["_id"]) and user["role"] != "admin":
        raise HTTPException(403, "Sem permissão")

    amount = float(booking["deposit"])
    try:
        session = stripe.checkout.Session.create(
            line_items=[{
                "price_data": {
                    "currency": "brl",
                    "product_data": {"name": f"Sinal - {booking['service_name']}"},
                    "unit_amount": int(round(amount * 100)),
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{body.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{body.origin_url}/payment/cancel?booking_id={body.booking_id}",
            metadata={
                "booking_id": body.booking_id,
                "user_id": str(user["_id"]),
            },
        )
    except stripe.error.StripeError as e:
        raise HTTPException(500, f"Stripe error: {e.user_message or str(e)}")

    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "booking_id": body.booking_id,
        "user_id": str(user["_id"]),
        "amount": amount,
        "currency": "brl",
        "status": "initiated",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.bookings.update_one(
        {"_id": oid(body.booking_id)},
        {"$set": {"session_id": session.id}},
    )
    return {"checkout_url": session.url, "session_id": session.id}

@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    record = await db.payment_transactions.find_one({"session_id": session_id})
    if not record:
        raise HTTPException(404, "Transação não encontrada")
    if record.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "completed", "payment_status": "paid",
                              "updated_at": datetime.now(timezone.utc).isoformat()}},
                )
                bid = record.get("booking_id")
                if bid:
                    await db.bookings.update_one(
                        {"_id": oid(bid)},
                        {"$set": {"status": "confirmed", "payment_status": "paid"}},
                    )
                record = await db.payment_transactions.find_one({"session_id": session_id})
        except stripe.error.StripeError:
            pass
    return {
        "session_id": record["session_id"],
        "status": record["status"],
        "payment_status": record["payment_status"],
    }

@api.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(400, "Invalid signature")
    obj = event["data"]["object"]
    t = event["type"]
    if t == "checkout.session.completed":
        session_id = obj["id"]
        await db.payment_transactions.update_one(
            {"session_id": session_id, "payment_status": {"$ne": "paid"}},
            {"$set": {"status": "completed",
                      "payment_status": obj.get("payment_status", "paid"),
                      "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        tx = await db.payment_transactions.find_one({"session_id": session_id})
        if tx and tx.get("booking_id"):
            await db.bookings.update_one(
                {"_id": oid(tx["booking_id"])},
                {"$set": {"status": "confirmed", "payment_status": "paid"}},
            )
    return {"status": "ok"}

# ------------------------- Admin -------------------------
@api.get("/admin/stats")
async def admin_stats(user=Depends(require_role("admin"))):
    return {
        "users": await db.users.count_documents({}),
        "professionals": await db.users.count_documents({"role": "profissional"}),
        "clients": await db.users.count_documents({"role": "cliente"}),
        "bookings": await db.bookings.count_documents({}),
        "revenue": [x async for x in db.payment_transactions.aggregate([
            {"$match": {"payment_status": "paid"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ])],
    }

@api.get("/admin/users")
async def admin_users(user=Depends(require_role("admin"))):
    users = await db.users.find({}).to_list(1000)
    return [doc_out(u) for u in users]

@api.get("/admin/bookings")
async def admin_bookings(user=Depends(require_role("admin"))):
    items = await db.bookings.find({}).sort("created_at", -1).to_list(1000)
    return [doc_out(b) for b in items]

# ------------------------- Root -------------------------
@api.get("/")
async def root():
    return {"app": "AgendaBella", "status": "ok"}

app.include_router(api)

# ------------------------- Startup -------------------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.services.create_index("professional_id")
    await db.availabilities.create_index("professional_id")
    await db.bookings.create_index([("professional_id", 1), ("date", 1)])

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "name": "Admin",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "phone": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
        )

    # Seed demo pros/services/availability if none
    pro_count = await db.users.count_documents({"role": "profissional"})
    if pro_count == 0:
        demo_pros = [
            {"name": "Ana Silva", "email": "ana@demo.com", "category": "Cabeleireira",
             "bio": "Especialista em cortes modernos e coloração.",
             "photo_url": "https://images.pexels.com/photos/3993455/pexels-photo-3993455.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
             "services": [
                 {"name": "Corte Feminino", "price": 120.0, "duration_minutes": 60, "description": "Corte + finalização"},
                 {"name": "Coloração", "price": 250.0, "duration_minutes": 120, "description": "Coloração completa"},
             ]},
            {"name": "Carlos Ribeiro", "email": "carlos@demo.com", "category": "Barbearia",
             "bio": "Barbeiro há 10 anos, especialista em degradê.",
             "photo_url": "https://images.unsplash.com/photo-1759134198561-e2041049419c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBiYXJiZXJzaG9wJTIwaW50ZXJpb3J8ZW58MHx8fHwxNzg3OTIyNDA5fDA&ixlib=rb-4.1.0&q=85",
             "services": [
                 {"name": "Corte Masculino", "price": 60.0, "duration_minutes": 45, "description": "Corte na tesoura ou máquina"},
                 {"name": "Barba + Corte", "price": 90.0, "duration_minutes": 60, "description": "Combo completo"},
             ]},
            {"name": "Beatriz Costa", "email": "bia@demo.com", "category": "Manicure",
             "bio": "Manicure e pedicure com esmaltação em gel.",
             "photo_url": "https://images.unsplash.com/photo-1632345031435-8727f6897d53?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwxfHxuYWlsJTIwc2Fsb24lMjBtYW5pY3VyZXxlbnwwfHx8fDE3ODc5MjI0MDl8MA&ixlib=rb-4.1.0&q=85",
             "services": [
                 {"name": "Manicure", "price": 45.0, "duration_minutes": 45},
                 {"name": "Pedicure", "price": 55.0, "duration_minutes": 60},
                 {"name": "Esmaltação Gel", "price": 80.0, "duration_minutes": 75},
             ]},
            {"name": "Juliana Alves", "email": "ju@demo.com", "category": "Estética",
             "bio": "Design de sobrancelhas e micropigmentação.",
             "photo_url": "https://images.pexels.com/photos/29096366/pexels-photo-29096366.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
             "services": [
                 {"name": "Design de Sobrancelhas", "price": 70.0, "duration_minutes": 45},
                 {"name": "Henna", "price": 90.0, "duration_minutes": 60},
             ]},
        ]
        for p in demo_pros:
            services = p.pop("services")
            p["password_hash"] = hash_password("demo123")
            p["role"] = "profissional"
            p["created_at"] = datetime.now(timezone.utc).isoformat()
            r = await db.users.insert_one(p)
            pid = str(r.inserted_id)
            for s in services:
                s["professional_id"] = pid
                s["created_at"] = datetime.now(timezone.utc).isoformat()
                s.setdefault("description", "")
                await db.services.insert_one(s)
            # Availability: Mon-Sat 09-18
            for wd in range(0, 6):
                await db.availabilities.insert_one({
                    "professional_id": pid, "weekday": wd,
                    "start_time": "09:00", "end_time": "18:00",
                })

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown():
    client.close()

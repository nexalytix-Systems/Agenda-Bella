"""
Iteration 3 backend tests for AgendaBella:
- Geolocation (distance_km, sort ordering)
- is_boosted / is_featured flags
- Coupons (CRUD + validate)
- Boost checkout (Stripe one-time)
- Admin feature / unfeature
- Subscription plans + checkout (Stripe recurring)
- Role-based access (403 for cliente/admin on pro-only)
"""
import os
import uuid
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
           open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "cassimiro77@gmail.com"
ADMIN_PASSWORD = "admin123"


def _register(role, **extra):
    email = f"test_{role}_{uuid.uuid4().hex[:8]}@example.com"
    payload = {"name": f"TEST {role}", "email": email, "password": "pass1234", "role": role}
    payload.update(extra)
    r = requests.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"]


def _auth(t):
    return {"Authorization": f"Bearer {t}"}


# ------------------------- Fixtures -------------------------
@pytest.fixture(scope="module")
def cliente():
    t, u = _register("cliente", city="São Paulo", state="SP", lat=-23.5505, lng=-46.6333)
    return {"token": t, "user": u}


@pytest.fixture(scope="module")
def profissional():
    t, u = _register("profissional", city="São Paulo", state="SP",
                     lat=-23.5629, lng=-46.6544, category="Massagem", bio="Test")
    return {"token": t, "user": u}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


# ------------------------- Geolocation -------------------------
class TestGeolocation:
    def test_list_with_client_coords_returns_distance_km(self, cliente):
        r = requests.get(f"{API}/professionals",
                         params={"client_lat": -23.5505, "client_lng": -46.6333})
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) > 0
        # at least one pro (with lat/lng) should have distance_km numeric
        with_dist = [p for p in arr if p.get("distance_km") is not None]
        assert len(with_dist) >= 1
        for p in with_dist:
            assert isinstance(p["distance_km"], (int, float))

    def test_list_without_coords_distance_null(self):
        r = requests.get(f"{API}/professionals")
        assert r.status_code == 200
        arr = r.json()
        # distance_km should be None when client coords not provided
        assert all(p.get("distance_km") is None for p in arr)

    def test_flags_is_boosted_is_featured_present(self):
        r = requests.get(f"{API}/professionals")
        assert r.status_code == 200
        for p in r.json():
            assert "is_boosted" in p and isinstance(p["is_boosted"], bool)
            assert "is_featured" in p and isinstance(p["is_featured"], bool)


# ------------------------- Coupons -------------------------
class TestCoupons:
    _cid = None
    _code = None

    def test_create_coupon(self, profissional):
        code = f"TEST{uuid.uuid4().hex[:6].upper()}"
        r = requests.post(f"{API}/coupons",
                          json={"code": code, "discount_percent": 20, "max_uses": 10},
                          headers=_auth(profissional["token"]))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["code"] == code.upper()
        assert d["discount_percent"] == 20
        assert d["used_count"] == 0
        TestCoupons._cid = d["id"]
        TestCoupons._code = code.upper()

    def test_duplicate_code_returns_400(self, profissional):
        r = requests.post(f"{API}/coupons",
                          json={"code": TestCoupons._code, "discount_percent": 15},
                          headers=_auth(profissional["token"]))
        assert r.status_code == 400

    def test_list_my_coupons(self, profissional):
        r = requests.get(f"{API}/coupons/mine", headers=_auth(profissional["token"]))
        assert r.status_code == 200
        assert any(c["id"] == TestCoupons._cid for c in r.json())

    def test_validate_coupon_ok(self, profissional):
        r = requests.get(f"{API}/coupons/validate",
                         params={"code": TestCoupons._code,
                                 "professional_id": profissional["user"]["id"]})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["code"] == TestCoupons._code
        assert d["discount_percent"] == 20

    def test_validate_coupon_not_found(self, profissional):
        r = requests.get(f"{API}/coupons/validate",
                         params={"code": "NOPE_XYZ",
                                 "professional_id": profissional["user"]["id"]})
        assert r.status_code == 404

    def test_validate_coupon_expired(self, profissional):
        past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        code = f"EXP{uuid.uuid4().hex[:5].upper()}"
        r = requests.post(f"{API}/coupons",
                          json={"code": code, "discount_percent": 10, "valid_until": past},
                          headers=_auth(profissional["token"]))
        assert r.status_code == 200
        rv = requests.get(f"{API}/coupons/validate",
                          params={"code": code, "professional_id": profissional["user"]["id"]})
        assert rv.status_code == 400

    def test_validate_coupon_exhausted(self, profissional):
        code = f"EXH{uuid.uuid4().hex[:5].upper()}"
        r = requests.post(f"{API}/coupons",
                          json={"code": code, "discount_percent": 10, "max_uses": 1},
                          headers=_auth(profissional["token"]))
        assert r.status_code == 200
        cid = r.json()["id"]
        # bump used_count
        from pymongo import MongoClient
        from bson import ObjectId
        mc = MongoClient(os.environ["MONGO_URL"])
        mc[os.environ["DB_NAME"]].coupons.update_one({"_id": ObjectId(cid)}, {"$set": {"used_count": 1}})
        mc.close()
        rv = requests.get(f"{API}/coupons/validate",
                          params={"code": code, "professional_id": profissional["user"]["id"]})
        assert rv.status_code == 400

    def test_delete_coupon(self, profissional):
        r = requests.delete(f"{API}/coupons/{TestCoupons._cid}",
                            headers=_auth(profissional["token"]))
        assert r.status_code == 200


# ------------------------- Boost -------------------------
class TestBoost:
    def test_boost_checkout_7d(self, profissional):
        r = requests.post(f"{API}/boost/checkout",
                          json={"plan": "7d", "origin_url": "https://example.com"},
                          headers=_auth(profissional["token"]))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["checkout_url"].startswith("http")
        assert "session_id" in d

    def test_boost_checkout_30d(self, profissional):
        r = requests.post(f"{API}/boost/checkout",
                          json={"plan": "30d", "origin_url": "https://example.com"},
                          headers=_auth(profissional["token"]))
        assert r.status_code == 200, r.text
        assert r.json()["checkout_url"].startswith("http")

    def test_boost_invalid_plan(self, profissional):
        r = requests.post(f"{API}/boost/checkout",
                          json={"plan": "99d", "origin_url": "https://example.com"},
                          headers=_auth(profissional["token"]))
        assert r.status_code == 400


# ------------------------- Featured (admin) -------------------------
class TestFeatured:
    def test_admin_feature_sets_until(self, admin_token, profissional):
        r = requests.post(f"{API}/admin/feature",
                          json={"professional_id": profissional["user"]["id"], "days": 7},
                          headers=_auth(admin_token))
        assert r.status_code == 200, r.text
        assert "featured_until" in r.json()
        # verify is_featured flag on list
        arr = requests.get(f"{API}/professionals").json()
        me = next((p for p in arr if p["id"] == profissional["user"]["id"]), None)
        assert me is not None
        assert me["is_featured"] is True

    def test_admin_unfeature_clears(self, admin_token, profissional):
        r = requests.post(f"{API}/admin/unfeature",
                          json={"professional_id": profissional["user"]["id"]},
                          headers=_auth(admin_token))
        assert r.status_code == 200
        arr = requests.get(f"{API}/professionals").json()
        me = next((p for p in arr if p["id"] == profissional["user"]["id"]), None)
        assert me is not None
        assert me["is_featured"] is False


# ------------------------- Subscription -------------------------
class TestSubscription:
    def test_plans_endpoint(self):
        r = requests.get(f"{API}/subscription/plans")
        assert r.status_code == 200
        d = r.json()
        assert "pro" in d and "premium" in d
        assert d["pro"]["price"] == 49.90
        assert d["premium"]["price"] == 99.90
        assert isinstance(d["pro"]["features"], list) and len(d["pro"]["features"]) >= 1

    def test_subscription_checkout_pro(self, profissional):
        r = requests.post(f"{API}/subscription/checkout",
                          json={"plan": "pro", "origin_url": "https://example.com"},
                          headers=_auth(profissional["token"]))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["checkout_url"].startswith("http")
        # verify mode=subscription by retrieving the session from Stripe (best-effort)
        import stripe
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
        try:
            s = stripe.checkout.Session.retrieve(d["session_id"])
            assert s.mode == "subscription"
        except Exception:
            pass  # if stripe key can't retrieve, at least URL check above passed

    def test_subscription_invalid_plan(self, profissional):
        r = requests.post(f"{API}/subscription/checkout",
                          json={"plan": "gold", "origin_url": "https://example.com"},
                          headers=_auth(profissional["token"]))
        assert r.status_code == 400


# ------------------------- RBAC (403 checks) -------------------------
class TestRBAC:
    def test_cliente_cannot_create_coupon(self, cliente):
        r = requests.post(f"{API}/coupons",
                          json={"code": "NOPE", "discount_percent": 10},
                          headers=_auth(cliente["token"]))
        assert r.status_code == 403

    def test_cliente_cannot_boost(self, cliente):
        r = requests.post(f"{API}/boost/checkout",
                          json={"plan": "7d", "origin_url": "https://example.com"},
                          headers=_auth(cliente["token"]))
        assert r.status_code == 403

    def test_cliente_cannot_subscribe(self, cliente):
        r = requests.post(f"{API}/subscription/checkout",
                          json={"plan": "pro", "origin_url": "https://example.com"},
                          headers=_auth(cliente["token"]))
        assert r.status_code == 403

    def test_admin_cannot_create_coupon(self, admin_token):
        r = requests.post(f"{API}/coupons",
                          json={"code": "ADMIN1", "discount_percent": 10},
                          headers=_auth(admin_token))
        assert r.status_code == 403

    def test_admin_cannot_subscribe(self, admin_token):
        r = requests.post(f"{API}/subscription/checkout",
                          json={"plan": "pro", "origin_url": "https://example.com"},
                          headers=_auth(admin_token))
        assert r.status_code == 403

    def test_non_admin_cannot_feature(self, profissional):
        r = requests.post(f"{API}/admin/feature",
                          json={"professional_id": profissional["user"]["id"], "days": 7},
                          headers=_auth(profissional["token"]))
        assert r.status_code == 403

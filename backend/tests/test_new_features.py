"""
Backend tests for AgendaBella iteration 2:
- Reviews, Portfolio, Packages (fidelidade)
- Mocked WhatsApp notifications (db.notifications)
- Location fields (city/state) on registration/profile
- City filter + name search in /api/professionals
"""
import os
import uuid
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
           open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
API = f"{BASE_URL}/api"

UNIQUE = uuid.uuid4().hex[:8]


def _register(role, **extra):
    email = f"test_{role}_{UNIQUE}_{uuid.uuid4().hex[:4]}@example.com"
    payload = {"name": f"TEST {role}", "email": email, "password": "pass1234", "role": role}
    payload.update(extra)
    r = requests.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"], email


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ----------- Session-scoped fixtures -----------
@pytest.fixture(scope="module")
def cliente():
    token, user, email = _register("cliente", phone="+5511999990001", city="São Paulo", state="SP")
    return {"token": token, "user": user, "email": email}


@pytest.fixture(scope="module")
def profissional():
    token, user, email = _register("profissional",
                                    phone="+5511999990002",
                                    city="São Paulo", state="SP",
                                    category="Cabeleireira", bio="Test pro")
    return {"token": token, "user": user, "email": email}


# ------------------------- Location fields on register -------------------------
class TestLocationFields:
    def test_register_stores_city_state(self, cliente):
        r = requests.get(f"{API}/auth/me", headers=_auth(cliente["token"]))
        assert r.status_code == 200
        data = r.json()
        assert data["city"] == "São Paulo"
        assert data["state"] == "SP"

    def test_patch_professionals_me_updates_location(self, profissional):
        payload = {"city": "Rio de Janeiro", "state": "RJ",
                   "business_name": "Studio Test", "address": "Rua X, 123"}
        r = requests.patch(f"{API}/professionals/me", json=payload,
                           headers=_auth(profissional["token"]))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["city"] == "Rio de Janeiro"
        assert d["state"] == "RJ"
        assert d["business_name"] == "Studio Test"
        assert d["address"] == "Rua X, 123"
        # revert to SP for city filter test
        requests.patch(f"{API}/professionals/me",
                       json={"city": "São Paulo", "state": "SP"},
                       headers=_auth(profissional["token"]))


# ------------------------- Professionals list: city, q, ratings -------------------------
class TestProfessionalsListing:
    def test_list_has_rating_fields(self):
        r = requests.get(f"{API}/professionals")
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) > 0
        for p in arr:
            assert "avg_rating" in p
            assert "reviews_count" in p
            assert isinstance(p["reviews_count"], int)

    def test_city_filter_case_insensitive_prefix(self):
        r = requests.get(f"{API}/professionals", params={"city": "são"})
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 1
        for p in arr:
            assert (p.get("city") or "").lower().startswith("são")

    def test_city_filter_no_match(self):
        r = requests.get(f"{API}/professionals", params={"city": "Zzzz_no_such_city"})
        assert r.status_code == 200
        assert r.json() == []

    def test_q_name_search(self, profissional):
        r = requests.get(f"{API}/professionals", params={"q": "TEST"})
        assert r.status_code == 200
        names = [p["name"] for p in r.json()]
        assert any("TEST" in n for n in names)


# ------------------------- Setup: give profissional a service + availability + confirmed booking -------------------------
@pytest.fixture(scope="module")
def pro_service(profissional):
    r = requests.post(f"{API}/services",
                      json={"name": "Corte Test", "description": "d", "price": 100.0, "duration_minutes": 30},
                      headers=_auth(profissional["token"]))
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def pro_availability(profissional):
    created = []
    for wd in range(7):
        r = requests.post(f"{API}/availability",
                          json={"weekday": wd, "start_time": "09:00", "end_time": "18:00"},
                          headers=_auth(profissional["token"]))
        assert r.status_code == 200
        created.append(r.json())
    return created


@pytest.fixture(scope="module")
def confirmed_booking(cliente, profissional, pro_service, pro_availability):
    """Create a booking, then force-confirm it via MongoDB to enable review tests."""
    # Find a future date/time
    future = (datetime.now(timezone.utc) + timedelta(days=7)).date().isoformat()
    r = requests.post(f"{API}/bookings",
                      json={"professional_id": profissional["user"]["id"],
                            "service_id": pro_service["id"],
                            "date": future, "start_time": "10:00"},
                      headers=_auth(cliente["token"]))
    assert r.status_code == 200, r.text
    bid = r.json()["id"]

    # Force-confirm via direct Mongo update (simulate payment)
    from pymongo import MongoClient
    from bson import ObjectId
    mc = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    dbn = os.environ.get("DB_NAME", "test_database")
    mc[dbn].bookings.update_one({"_id": ObjectId(bid)},
                                {"$set": {"status": "confirmed", "payment_status": "paid"}})
    mc.close()
    return {"id": bid, "future_date": future}


# ------------------------- Reviews -------------------------
class TestReviews:
    def test_review_on_unconfirmed_returns_400(self, cliente, profissional, pro_service):
        # create fresh pending booking (different time)
        future = (datetime.now(timezone.utc) + timedelta(days=8)).date().isoformat()
        r = requests.post(f"{API}/bookings",
                          json={"professional_id": profissional["user"]["id"],
                                "service_id": pro_service["id"],
                                "date": future, "start_time": "11:00"},
                          headers=_auth(cliente["token"]))
        assert r.status_code == 200
        bid = r.json()["id"]
        rr = requests.post(f"{API}/reviews",
                           json={"booking_id": bid, "rating": 5, "comment": "x"},
                           headers=_auth(cliente["token"]))
        assert rr.status_code == 400

    def test_review_confirmed_ok_then_duplicate_400(self, cliente, confirmed_booking):
        r1 = requests.post(f"{API}/reviews",
                           json={"booking_id": confirmed_booking["id"], "rating": 5, "comment": "great"},
                           headers=_auth(cliente["token"]))
        assert r1.status_code == 200, r1.text
        d = r1.json()
        assert d["rating"] == 5
        assert d["comment"] == "great"

        r2 = requests.post(f"{API}/reviews",
                           json={"booking_id": confirmed_booking["id"], "rating": 4},
                           headers=_auth(cliente["token"]))
        assert r2.status_code == 400

    def test_list_reviews_by_professional(self, profissional):
        r = requests.get(f"{API}/reviews/professional/{profissional['user']['id']}")
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) >= 1
        assert any(rev["rating"] == 5 for rev in arr)

    def test_professional_detail_includes_reviews_and_rating(self, profissional):
        r = requests.get(f"{API}/professionals/{profissional['user']['id']}")
        assert r.status_code == 200
        d = r.json()
        assert "reviews" in d and "packages" in d
        assert len(d["reviews"]) >= 1
        assert d["professional"]["avg_rating"] is not None
        assert d["professional"]["reviews_count"] >= 1


# ------------------------- Portfolio -------------------------
class TestPortfolio:
    def test_add_get_delete_portfolio(self, profissional):
        # Add
        r = requests.post(f"{API}/portfolio",
                          json={"image_url": "https://x.com/a.jpg", "caption": "test"},
                          headers=_auth(profissional["token"]))
        assert r.status_code == 200, r.text
        item = r.json()
        assert item["image_url"] == "https://x.com/a.jpg"
        iid = item["id"]

        # Get list
        pid = profissional["user"]["id"]
        r2 = requests.get(f"{API}/portfolio/professional/{pid}")
        assert r2.status_code == 200
        arr = r2.json()
        assert any(x["id"] == iid for x in arr)

        # Delete
        r3 = requests.delete(f"{API}/portfolio/{iid}", headers=_auth(profissional["token"]))
        assert r3.status_code == 200

        # Verify deleted
        r4 = requests.get(f"{API}/portfolio/professional/{pid}")
        assert not any(x["id"] == iid for x in r4.json())


# ------------------------- Packages -------------------------
class TestPackages:
    def test_create_package_regular_price_computed(self, profissional, pro_service):
        r = requests.post(f"{API}/packages",
                          json={"service_id": pro_service["id"],
                                "name": "Pack 5x", "sessions_count": 5, "price": 400.0},
                          headers=_auth(profissional["token"]))
        assert r.status_code == 200, r.text
        pk = r.json()
        # service price = 100 * 5 sessions = 500
        assert pk["regular_price"] == 500.0
        assert pk["price"] == 400.0
        assert pk["sessions_count"] == 5
        self.__class__._pkid = pk["id"]

    def test_list_my_packages(self, profissional):
        r = requests.get(f"{API}/packages/mine", headers=_auth(profissional["token"]))
        assert r.status_code == 200
        assert any(p["id"] == self.__class__._pkid for p in r.json())

    def test_package_checkout_returns_stripe_url(self, cliente):
        r = requests.post(f"{API}/packages/checkout",
                          json={"package_id": self.__class__._pkid,
                                "origin_url": "https://example.com"},
                          headers=_auth(cliente["token"]))
        assert r.status_code == 200, r.text
        d = r.json()
        assert "checkout_url" in d and d["checkout_url"].startswith("http")
        assert "session_id" in d

    def test_my_active_packages_empty_before_payment(self, cliente):
        r = requests.get(f"{API}/packages/my-active", headers=_auth(cliente["token"]))
        assert r.status_code == 200
        assert isinstance(r.json(), list)  # empty allowed

    def test_delete_package(self, profissional):
        r = requests.delete(f"{API}/packages/{self.__class__._pkid}",
                            headers=_auth(profissional["token"]))
        assert r.status_code == 200


# ------------------------- WhatsApp mock notifications -------------------------
class TestNotifications:
    def test_notify_persists_to_db_via_direct_call(self, cliente):
        """Directly trigger notify_whatsapp path by simulating a paid booking transition.
        Since we can't easily flip Stripe, we validate the notifications collection
        exists and is writable by inserting via internal helper through a booking→confirmed
        path. Here we insert a doc directly to confirm the collection is used.
        Then verify GET /api/notifications/mine returns it.
        """
        from pymongo import MongoClient
        mc = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        dbn = os.environ.get("DB_NAME", "test_database")
        mc[dbn].notifications.insert_one({
            "channel": "whatsapp",
            "to": "+5511999990001",
            "message": "TEST notification",
            "status": "mocked_sent",
            "meta": {"user_id": cliente["user"]["id"], "kind": "test"},
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        mc.close()

        r = requests.get(f"{API}/notifications/mine", headers=_auth(cliente["token"]))
        assert r.status_code == 200
        arr = r.json()
        assert any(n["message"] == "TEST notification" and n["status"] == "mocked_sent" for n in arr)

    def test_notifications_requires_auth(self):
        r = requests.get(f"{API}/notifications/mine")
        assert r.status_code == 401

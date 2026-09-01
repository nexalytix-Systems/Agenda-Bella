"""Iteration 4 tests - CORS relaxation + Bearer token (no cookie) flow."""
import os
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
if not BASE_URL:
    # fall back to reading frontend/.env
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                break

ADMIN_EMAIL = "cassimiro77@gmail.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data["token"]
    return data["token"], r


# ---------- CORS ----------
class TestCORS:
    def test_preflight_options_from_any_origin(self):
        origin = "https://nexalytix-systems.github.io"
        r = requests.options(
            f"{BASE_URL}/api/auth/login",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,authorization",
            },
        )
        assert r.status_code in (200, 204), f"preflight failed: {r.status_code} {r.text}"
        aco = r.headers.get("access-control-allow-origin", "")
        # allow_origins=* with credentials=False should return "*"
        assert aco in ("*", origin), f"unexpected ACAO: {aco}"
        acc = r.headers.get("access-control-allow-credentials", "")
        assert acc.lower() != "true", f"credentials should NOT be true, got: {acc}"

    def test_get_with_origin(self):
        r = requests.get(f"{BASE_URL}/api/", headers={"Origin": "https://example.com"})
        assert r.status_code == 200
        assert r.headers.get("access-control-allow-origin", "") in ("*", "https://example.com")


# ---------- Auth: Bearer token, no cookie ----------
class TestAuthBearer:
    def test_login_returns_token_no_cookie(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert data.get("token")
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        # cookie should NOT be set (set_auth_cookie is no-op)
        set_cookie = r.headers.get("set-cookie", "")
        assert "access_token" not in set_cookie, f"access_token cookie should not be set: {set_cookie}"
        # requests session cookies also empty for access_token
        assert "access_token" not in r.cookies, "access_token cookie present in response.cookies"

    def test_me_with_bearer_header(self, admin_token):
        token, _ = admin_token
        r = requests.get(f"{BASE_URL}/api/auth/me",
                         headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == ADMIN_EMAIL
        assert u["role"] == "admin"
        assert "password_hash" not in u
        assert "_id" not in u
        assert "id" in u

    def test_me_no_auth_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_bad_token_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me",
                         headers={"Authorization": "Bearer not.a.jwt"})
        assert r.status_code == 401

    def test_invalid_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401


# ---------- Protected endpoints work via Bearer ----------
class TestProtectedEndpointsBearer:
    def test_admin_stats(self, admin_token):
        token, _ = admin_token
        r = requests.get(f"{BASE_URL}/api/admin/stats",
                         headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        d = r.json()
        assert "users" in d and "professionals" in d and "bookings" in d

    def test_admin_users(self, admin_token):
        token, _ = admin_token
        r = requests.get(f"{BASE_URL}/api/admin/users",
                         headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_bookings(self, admin_token):
        token, _ = admin_token
        r = requests.get(f"{BASE_URL}/api/admin/bookings",
                         headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_stats_no_auth_forbidden(self):
        r = requests.get(f"{BASE_URL}/api/admin/stats")
        assert r.status_code == 401

    def test_bookings_mine_via_bearer(self, admin_token):
        token, _ = admin_token
        r = requests.get(f"{BASE_URL}/api/bookings/mine",
                         headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_notifications_mine_via_bearer(self, admin_token):
        token, _ = admin_token
        r = requests.get(f"{BASE_URL}/api/notifications/mine",
                         headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Public endpoints ----------
class TestPublicEndpoints:
    def test_root(self):
        r = requests.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_list_professionals(self):
        r = requests.get(f"{BASE_URL}/api/professionals")
        assert r.status_code == 200
        pros = r.json()
        assert isinstance(pros, list)
        assert len(pros) >= 1
        for p in pros:
            assert "id" in p and "_id" not in p
            assert "distance_km" in p  # None expected without client coords
            assert p["distance_km"] is None

    def test_list_professionals_with_geo_sorted_by_distance(self):
        # SP coordinates
        r = requests.get(f"{BASE_URL}/api/professionals",
                         params={"client_lat": -23.5505, "client_lng": -46.6333})
        assert r.status_code == 200
        pros = r.json()
        assert len(pros) >= 2
        # every pro should have numeric distance_km when they have lat/lng
        distances = [p["distance_km"] for p in pros if p.get("distance_km") is not None]
        assert len(distances) >= 2
        # Sorted ascending (given no boosted/featured in seed)
        # Filter out boosted/featured to check plain distance ordering
        plain = [p for p in pros if not p.get("is_boosted") and not p.get("is_featured")]
        plain_d = [p["distance_km"] for p in plain if p.get("distance_km") is not None]
        assert plain_d == sorted(plain_d), f"not sorted asc: {plain_d}"

    def test_list_professionals_filter_category(self):
        r = requests.get(f"{BASE_URL}/api/professionals", params={"category": "Barbearia"})
        assert r.status_code == 200
        for p in r.json():
            assert p["category"] == "Barbearia"

    def test_subscription_plans(self):
        r = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert r.status_code == 200
        d = r.json()
        assert "pro" in d and "premium" in d


# ---------- Registration + role gating still works ----------
class TestRegisterAndRoles:
    def test_register_new_client_gets_token_no_cookie(self):
        import uuid
        email = f"TEST_iter4_{uuid.uuid4().hex[:8]}@example.com".lower()
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Iter4 Test", "email": email,
            "password": "secret123", "role": "cliente",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["token"]
        assert data["user"]["email"] == email
        set_cookie = r.headers.get("set-cookie", "")
        assert "access_token" not in set_cookie

        # /me works with returned token
        me = requests.get(f"{BASE_URL}/api/auth/me",
                          headers={"Authorization": f"Bearer {data['token']}"})
        assert me.status_code == 200
        assert me.json()["email"] == email

        # cliente cannot access professional-only endpoint
        forbidden = requests.get(f"{BASE_URL}/api/services/mine",
                                 headers={"Authorization": f"Bearer {data['token']}"})
        assert forbidden.status_code == 403

        # cleanup
        try:
            from pymongo import MongoClient
            m = MongoClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
            m[os.environ.get('DB_NAME', 'agendabella_db')].users.delete_one({"email": email})
        except Exception:
            pass

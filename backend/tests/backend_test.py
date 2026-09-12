"""Backend API tests for Mon plan alimentaire."""
import os
import uuid
import pytest
import requests

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://food-plan-app-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SEEDED_EMAIL = "testuser1@test.fr"
SEEDED_PASSWORD = "testpass123"


@pytest.fixture(scope="module")
def new_user():
    email = f"test_{uuid.uuid4().hex[:8]}@test.fr"
    return {"email": email, "password": "secret123", "name": "T Auto"}


@pytest.fixture(scope="module")
def signup_token(new_user):
    r = requests.post(f"{API}/auth/signup", json=new_user, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "session_token" in data and "user" in data
    assert data["user"]["email"] == new_user["email"].lower()
    return data["session_token"]


@pytest.fixture(scope="module")
def auth_headers(signup_token):
    return {"Authorization": f"Bearer {signup_token}"}


# -------- Auth --------
class TestAuth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200

    def test_signup_duplicate(self, new_user, signup_token):
        r = requests.post(f"{API}/auth/signup", json=new_user, timeout=15)
        assert r.status_code == 400

    def test_signup_short_password(self):
        r = requests.post(f"{API}/auth/signup", json={"email": f"x_{uuid.uuid4().hex[:6]}@t.fr", "password": "ab"}, timeout=15)
        assert r.status_code == 400

    def test_login_seeded(self):
        r = requests.post(f"{API}/auth/login", json={"email": SEEDED_EMAIL, "password": SEEDED_PASSWORD}, timeout=15)
        assert r.status_code == 200, r.text
        assert "session_token" in r.json()

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": SEEDED_EMAIL, "password": "wrong!"}, timeout=15)
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_me(self, auth_headers, new_user):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        assert r.json()["email"] == new_user["email"].lower()

    def test_logout(self):
        r = requests.post(f"{API}/auth/login", json={"email": SEEDED_EMAIL, "password": SEEDED_PASSWORD}, timeout=15)
        tok = r.json()["session_token"]
        h = {"Authorization": f"Bearer {tok}"}
        r2 = requests.post(f"{API}/auth/logout", headers=h, timeout=10)
        assert r2.status_code == 200
        r3 = requests.get(f"{API}/auth/me", headers=h, timeout=10)
        assert r3.status_code == 401


# -------- Targets --------
class TestTargets:
    def test_get_default(self, auth_headers):
        r = requests.get(f"{API}/targets", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "breakfast" in d and "lunch" in d and "rules" in d
        assert d["duration_weeks"] == 4

    def test_put_and_persist(self, auth_headers):
        r0 = requests.get(f"{API}/targets", headers=auth_headers, timeout=10)
        payload = r0.json()
        payload["duration_weeks"] = 2
        r = requests.put(f"{API}/targets", json=payload, headers=auth_headers, timeout=10)
        assert r.status_code == 200
        r2 = requests.get(f"{API}/targets", headers=auth_headers, timeout=10)
        assert r2.json()["duration_weeks"] == 2

    def test_unauth(self):
        r = requests.get(f"{API}/targets", timeout=10)
        assert r.status_code == 401


# -------- Programs --------
class TestPrograms:
    def test_generate(self, auth_headers):
        r = requests.post(f"{API}/programs/generate", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "id" in d and "weeks" in d
        assert len(d["weeks"]) == d["duration_weeks"]
        assert len(d["weeks"][0]["days"]) == 7
        assert "breakfast" in d["weeks"][0]["days"][0]["meals"]
        pytest.program_id = d["id"]

    def test_current(self, auth_headers):
        r = requests.get(f"{API}/programs/current", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        assert r.json()["id"] == pytest.program_id

    def test_list(self, auth_headers):
        r = requests.get(f"{API}/programs", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        assert any(p["id"] == pytest.program_id for p in r.json())

    def test_delete(self, auth_headers):
        r = requests.delete(f"{API}/programs/{pytest.program_id}", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        r2 = requests.get(f"{API}/programs/{pytest.program_id}", headers=auth_headers, timeout=10)
        assert r2.status_code == 404


# -------- Weights --------
class TestWeights:
    def test_add_list_delete(self, auth_headers):
        entry = {"date": "2026-01-05", "weight": 70.5, "waist": 82.0, "energy": 4}
        r = requests.post(f"{API}/weights", json=entry, headers=auth_headers, timeout=10)
        assert r.status_code == 200
        wid = r.json()["id"]
        r2 = requests.get(f"{API}/weights", headers=auth_headers, timeout=10)
        assert r2.status_code == 200
        assert any(w["id"] == wid for w in r2.json())
        r3 = requests.delete(f"{API}/weights/{wid}", headers=auth_headers, timeout=10)
        assert r3.status_code == 200


# -------- Inventory --------
class TestInventory:
    def test_add_update_delete(self, auth_headers):
        item = {"name": "TEST_Poulet", "location": "fridge", "priority": False}
        r = requests.post(f"{API}/inventory", json=item, headers=auth_headers, timeout=10)
        assert r.status_code == 200
        iid = r.json()["id"]
        r2 = requests.put(f"{API}/inventory/{iid}", json={"priority": True}, headers=auth_headers, timeout=10)
        assert r2.status_code == 200
        r3 = requests.get(f"{API}/inventory", headers=auth_headers, timeout=10)
        matched = [x for x in r3.json() if x["id"] == iid]
        assert matched and matched[0]["priority"] is True
        r4 = requests.delete(f"{API}/inventory/{iid}", headers=auth_headers, timeout=10)
        assert r4.status_code == 200

    def test_unauth(self):
        assert requests.get(f"{API}/inventory", timeout=10).status_code == 401
        assert requests.get(f"{API}/weights", timeout=10).status_code == 401
        assert requests.post(f"{API}/programs/generate", timeout=10).status_code == 401

"""Iteration 9 — backup/restore export/import + regressions."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers["Content-Type"] = "application/json"
    email = f"test_it9_{uuid.uuid4().hex[:8]}@test.fr"
    r = s.post(f"{BASE_URL}/api/auth/signup", json={"email": email, "password": "pw123456", "name": "IT9"})
    assert r.status_code == 200, r.text
    tok = r.json()["session_token"]
    s.headers["Authorization"] = f"Bearer {tok}"
    return s


@pytest.fixture(scope="module")
def program(session):
    r = session.post(f"{BASE_URL}/api/programs/generate")
    assert r.status_code == 200, r.text
    return r.json()


class TestBackupExport:
    def test_backup_shape(self, session, program):
        r = session.get(f"{BASE_URL}/api/backup")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("version") == 1
        assert "exported_at" in data
        assert isinstance(data.get("targets"), dict)
        assert isinstance(data.get("inventory"), list)
        assert isinstance(data.get("weights"), list)
        assert isinstance(data.get("preferences"), dict)
        prog = data.get("program")
        assert isinstance(prog, dict) and prog.get("weeks")
        assert "shopping_checked" in prog
        assert "user_id" not in prog

    def test_backup_no_mongo_id(self, session):
        r = session.get(f"{BASE_URL}/api/backup")
        assert r.status_code == 200
        body_text = r.text
        # Basic check — no ObjectId string leaked
        assert '"_id"' not in body_text


class TestBackupRestore:
    def test_restore_valid(self, session, program):
        r = session.get(f"{BASE_URL}/api/backup")
        assert r.status_code == 200
        payload = r.json()
        r2 = session.post(f"{BASE_URL}/api/backup/restore", json=payload)
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert data.get("ok") is True
        restored = data.get("restored", [])
        assert "cibles" in restored
        assert "programme" in restored

    def test_current_program_marked_restored(self, session):
        r = session.get(f"{BASE_URL}/api/programs/current")
        assert r.status_code == 200
        prog = r.json()
        assert prog.get("name", "").endswith("(restauré)"), f"expected '(restauré)' suffix, got {prog.get('name')!r}"

    def test_restore_bad_version(self, session):
        r = session.post(f"{BASE_URL}/api/backup/restore", json={"version": 2})
        assert r.status_code == 400

    def test_restore_empty(self, session):
        r = session.post(f"{BASE_URL}/api/backup/restore", json={})
        assert r.status_code == 400


class TestRegression:
    def test_shopping_0(self, session, program):
        # after restore, use current program
        r0 = session.get(f"{BASE_URL}/api/programs/current")
        pid = r0.json()["id"]
        r = session.get(f"{BASE_URL}/api/programs/{pid}/shopping/0")
        assert r.status_code == 200

    def test_recap_0(self, session):
        r0 = session.get(f"{BASE_URL}/api/programs/current")
        pid = r0.json()["id"]
        r = session.get(f"{BASE_URL}/api/programs/{pid}/recap/0")
        assert r.status_code == 200

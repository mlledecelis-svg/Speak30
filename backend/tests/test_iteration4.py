"""Iteration 4 backend tests: goal_weight + per-recipe notes + regression."""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


class TestIteration4:
    _headers = None
    _program_id = None

    @classmethod
    def _auth(cls):
        if cls._headers is None:
            email = f"test_it4_{uuid.uuid4().hex[:8]}@test.fr"
            r = requests.post(
                f"{API}/auth/signup",
                json={"email": email, "password": "secret123", "name": "T It4"},
                timeout=15,
            )
            assert r.status_code == 200, r.text
            cls._headers = {"Authorization": f"Bearer {r.json()['session_token']}"}
        return cls._headers

    # -------- Preferences shape --------
    def test_01_preferences_has_notes_and_goal_defaults(self):
        h = self._auth()
        r = requests.get(f"{API}/preferences", headers=h, timeout=15)
        assert r.status_code == 200, r.text
        p = r.json()
        assert "notes" in p and isinstance(p["notes"], dict)
        assert "goal_weight" in p and p["goal_weight"] is None

    # -------- goal_weight PUT --------
    def test_02_put_goal_weight_ok(self):
        h = self._auth()
        r = requests.put(f"{API}/preferences/goal", json={"goal_weight": 70}, headers=h, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["goal_weight"] == 70

        r2 = requests.get(f"{API}/preferences", headers=h, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["goal_weight"] == 70

    def test_03_put_goal_weight_out_of_range(self):
        h = self._auth()
        r = requests.put(f"{API}/preferences/goal", json={"goal_weight": 10}, headers=h, timeout=15)
        assert r.status_code == 400, r.text

    def test_04_put_goal_weight_null_resets(self):
        h = self._auth()
        r = requests.put(f"{API}/preferences/goal", json={"goal_weight": None}, headers=h, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["goal_weight"] is None

        r2 = requests.get(f"{API}/preferences", headers=h, timeout=15)
        assert r2.json()["goal_weight"] is None

    # -------- notes PUT --------
    def test_05_put_note_and_get(self):
        h = self._auth()
        r = requests.put(
            f"{API}/preferences/notes",
            json={"blueprint_id": "adapt_wok", "note": "Ajouter du citron"},
            headers=h,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        r2 = requests.get(f"{API}/preferences", headers=h, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["notes"].get("adapt_wok") == "Ajouter du citron"

    def test_06_put_note_empty_removes_key(self):
        h = self._auth()
        # ensure it exists first
        requests.put(
            f"{API}/preferences/notes",
            json={"blueprint_id": "adapt_wok", "note": "tmp"},
            headers=h,
            timeout=15,
        )
        r = requests.put(
            f"{API}/preferences/notes",
            json={"blueprint_id": "adapt_wok", "note": ""},
            headers=h,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        r2 = requests.get(f"{API}/preferences", headers=h, timeout=15)
        assert "adapt_wok" not in r2.json().get("notes", {})

    def test_07_put_note_blank_blueprint_id_400(self):
        h = self._auth()
        r = requests.put(
            f"{API}/preferences/notes",
            json={"blueprint_id": "  ", "note": "hi"},
            headers=h,
            timeout=15,
        )
        assert r.status_code == 400, r.text

    def test_08_put_note_truncated_to_1000_chars(self):
        h = self._auth()
        long_note = "a" * 1500
        r = requests.put(
            f"{API}/preferences/notes",
            json={"blueprint_id": "adapt_wok_long", "note": long_note},
            headers=h,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert len(r.json()["note"]) == 1000
        r2 = requests.get(f"{API}/preferences", headers=h, timeout=15)
        assert len(r2.json()["notes"]["adapt_wok_long"]) == 1000

    # -------- Regression --------
    def test_09_regression_current_program_and_badges(self):
        h = self._auth()
        # Generate a small program
        rg = requests.post(f"{API}/programs/generate", headers=h, timeout=60)
        assert rg.status_code == 200, rg.text
        pid = rg.json()["id"]
        TestIteration4._program_id = pid

        rc = requests.get(f"{API}/programs/current", headers=h, timeout=15)
        assert rc.status_code == 200
        assert rc.json()["id"] == pid

        rb = requests.get(f"{API}/programs/{pid}/badges", headers=h, timeout=15)
        assert rb.status_code == 200
        b = rb.json()
        assert isinstance(b.get("weeks"), list)
        assert isinstance(b.get("badges"), list) and len(b["badges"]) == 6

    def test_10_regression_weights_post_and_get(self):
        h = self._auth()
        rp = requests.post(
            f"{API}/weights",
            json={"date": "2026-08-24", "weight": 74.0},
            headers=h,
            timeout=15,
        )
        assert rp.status_code == 200, rp.text
        rg = requests.get(f"{API}/weights", headers=h, timeout=15)
        assert rg.status_code == 200
        items = rg.json()
        assert isinstance(items, list) and any(w.get("weight") == 74.0 for w in items)

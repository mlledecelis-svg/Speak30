"""Iteration 6 backend tests: weekly recap + batch cooking + regression.

Endpoints:
  GET /api/programs/{id}/recap/{week}
  GET /api/programs/{id}/batch/{week}
Regression:
  GET /api/programs/current, GET /api/badges, GET /api/hydration/today
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


class TestIteration6:
    _headers = None
    _program_id = None

    # ---------- shared auth + program ----------
    @classmethod
    def _auth(cls):
        if cls._headers is None:
            email = f"test_it6_{uuid.uuid4().hex[:8]}@test.fr"
            r = requests.post(
                f"{API}/auth/signup",
                json={"email": email, "password": "secret123", "name": "T It6"},
                timeout=20,
            )
            assert r.status_code == 200, r.text
            cls._headers = {"Authorization": f"Bearer {r.json()['session_token']}"}
        return cls._headers

    @classmethod
    def _program(cls):
        if cls._program_id is None:
            h = cls._auth()
            r = requests.post(f"{API}/programs/generate", headers=h, timeout=60)
            assert r.status_code == 200, r.text
            cls._program_id = r.json()["id"]
        return cls._program_id

    # -------------------- Recap --------------------
    def test_01_recap_week0_shape(self):
        h = self._auth()
        pid = self._program()
        r = requests.get(f"{API}/programs/{pid}/recap/0", headers=h, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        for key in [
            "week", "meals", "done", "progress", "outside", "favorites",
            "cooked_minutes", "shopping_checked", "shopping_total",
            "water_avg", "water_goal", "weight_trend", "tip",
        ]:
            assert key in d, f"missing key {key} in {d}"
        assert d["week"] == 1
        assert isinstance(d["meals"], int) and d["meals"] > 0
        assert isinstance(d["done"], int) and d["done"] >= 0 and d["done"] <= d["meals"]
        assert isinstance(d["progress"], int) and 0 <= d["progress"] <= 100
        assert isinstance(d["outside"], int) and d["outside"] >= 0
        assert isinstance(d["favorites"], int) and d["favorites"] >= 0
        assert isinstance(d["cooked_minutes"], int) and d["cooked_minutes"] >= 0
        assert isinstance(d["shopping_checked"], int) and d["shopping_checked"] >= 0
        assert isinstance(d["shopping_total"], int) and d["shopping_total"] >= 0
        assert isinstance(d["water_goal"], int) and d["water_goal"] > 0
        # water_avg may be int or float
        assert isinstance(d["water_avg"], (int, float))
        # weight_trend can be null or float
        assert d["weight_trend"] is None or isinstance(d["weight_trend"], (int, float))
        # tip non-empty string, French markers acceptable (contains at least a letter)
        assert isinstance(d["tip"], str) and len(d["tip"].strip()) > 0

    def test_02_recap_done_increment(self):
        h = self._auth()
        pid = self._program()
        before = requests.get(f"{API}/programs/{pid}/recap/0", headers=h, timeout=20).json()
        # pick first meal of week 0 that is not done and mark done
        prog = requests.get(f"{API}/programs/current", headers=h, timeout=20).json()
        target = None
        for di, day in enumerate(prog["weeks"][0]["days"]):
            for mkey, m in day["meals"].items():
                if not m.get("done") and not m.get("outside"):
                    target = (di, mkey)
                    break
            if target:
                break
        assert target is not None, "no free meal found in week 0"
        di, mkey = target
        r = requests.post(
            f"{API}/programs/{pid}/meals/action",
            json={"action": "done", "week": 0, "day": di, "meal": mkey},
            headers=h,
            timeout=20,
        )
        assert r.status_code == 200, r.text
        after = requests.get(f"{API}/programs/{pid}/recap/0", headers=h, timeout=20).json()
        assert after["done"] == before["done"] + 1, (before, after)

    def test_03_recap_week_out_of_range_404(self):
        h = self._auth()
        pid = self._program()
        r = requests.get(f"{API}/programs/{pid}/recap/99", headers=h, timeout=15)
        assert r.status_code == 404

    def test_04_recap_unknown_program_404(self):
        h = self._auth()
        r = requests.get(f"{API}/programs/does-not-exist/recap/0", headers=h, timeout=15)
        assert r.status_code == 404

    # -------------------- Batch --------------------
    def test_10_batch_week0_shape(self):
        h = self._auth()
        pid = self._program()
        r = requests.get(f"{API}/programs/{pid}/batch/0", headers=h, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["week"] == 1
        assert isinstance(d["groups"], list)
        assert isinstance(d["sessions"], list) and len(d["sessions"]) == 2
        assert isinstance(d["minutes_saved"], int) and d["minutes_saved"] >= 0
        # Sessions structure
        for s in d["sessions"]:
            assert "title" in s and "desc" in s and "items" in s
            assert isinstance(s["items"], list)

    def test_11_batch_groups_invariants(self):
        h = self._auth()
        pid = self._program()
        d = requests.get(f"{API}/programs/{pid}/batch/0", headers=h, timeout=20).json()
        allowed_cat = {"starch", "protein", "vegetables"}
        forbidden_food = {"pain_complet", "biscottes"}
        for g in d["groups"]:
            assert "food_id" in g and "food_name" in g and "category" in g
            assert g["category"] in allowed_cat, g
            assert g["food_id"] not in forbidden_food, g
            assert isinstance(g["total_grams"], int) and g["total_grams"] > 0
            assert isinstance(g["meals"], list) and len(g["meals"]) >= 2
            # total_grams == round(sum meals[].grams)
            s = round(sum(m["grams"] for m in g["meals"]))
            assert g["total_grams"] == s, (g["food_id"], g["total_grams"], s)
            assert isinstance(g["tip"], str) and len(g["tip"].strip()) > 0
            assert isinstance(g["days"], list) and len(g["days"]) >= 1
            for m in g["meals"]:
                for k in ("day", "day_name", "meal", "meal_label", "recipe_name", "grams"):
                    assert k in m, (g["food_id"], k)

    def test_12_batch_week_out_of_range_404(self):
        h = self._auth()
        pid = self._program()
        r = requests.get(f"{API}/programs/{pid}/batch/99", headers=h, timeout=15)
        assert r.status_code == 404

    def test_13_batch_unknown_program_404(self):
        h = self._auth()
        r = requests.get(f"{API}/programs/nope/batch/0", headers=h, timeout=15)
        assert r.status_code == 404

    # -------------------- Regression --------------------
    def test_20_programs_current_200(self):
        h = self._auth()
        self._program()  # ensure generated
        r = requests.get(f"{API}/programs/current", headers=h, timeout=15)
        assert r.status_code == 200, r.text
        assert "weeks" in r.json()

    def test_21_badges_200(self):
        h = self._auth()
        pid = self._program()
        r = requests.get(f"{API}/programs/{pid}/badges", headers=h, timeout=15)
        assert r.status_code == 200, r.text

    def test_22_hydration_today_200(self):
        h = self._auth()
        r = requests.get(f"{API}/hydration/today", headers=h, timeout=15)
        assert r.status_code == 200, r.text
        assert "glasses" in r.json()

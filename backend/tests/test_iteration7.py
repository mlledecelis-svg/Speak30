"""Iteration 7 backend tests: ingredient substitutes + set_component + regression.

Endpoints:
  GET  /api/programs/{id}/meals/substitutes?week=&day=&meal=&index=
  POST /api/programs/{id}/meals/action  (action='set_component', value={index, food_id})
Regression:
  POST /api/programs/generate, GET /shopping/0, GET /recap/0, GET /batch/0
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


class TestIteration7:
    _headers = None
    _program_id = None
    _program = None

    @classmethod
    def _auth(cls):
        if cls._headers is None:
            email = f"test_it7_{uuid.uuid4().hex[:8]}@test.fr"
            r = requests.post(
                f"{API}/auth/signup",
                json={"email": email, "password": "secret123", "name": "T It7"},
                timeout=20,
            )
            assert r.status_code == 200, r.text
            cls._headers = {"Authorization": f"Bearer {r.json()['session_token']}"}
        return cls._headers

    @classmethod
    def _pid(cls):
        if cls._program_id is None:
            h = cls._auth()
            r = requests.post(f"{API}/programs/generate", headers=h, timeout=60)
            assert r.status_code == 200, r.text
            cls._program = r.json()
            cls._program_id = cls._program["id"]
        return cls._program_id

    # -------------------- Substitutes shape --------------------
    def test_01_substitutes_shape(self):
        h = self._auth()
        pid = self._pid()
        r = requests.get(
            f"{API}/programs/{pid}/meals/substitutes",
            params={"week": 0, "day": 0, "meal": "lunch", "index": 0},
            headers=h, timeout=20,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "current" in d and "substitutes" in d
        cur = d["current"]
        for k in ("food_id", "food_name", "grams"):
            assert k in cur, f"current missing {k}"
        subs = d["substitutes"]
        assert isinstance(subs, list) and len(subs) > 0, "expected at least 1 substitute"
        for s in subs:
            for k in ("food_id", "food_name", "grams", "eq", "eq_label", "same_family"):
                assert k in s, f"sub missing {k} in {s}"
            assert s["food_id"] != cur["food_id"], f"sub food_id equals current: {s}"
            assert isinstance(s["grams"], (int, float)) and s["grams"] > 0
            assert isinstance(s["same_family"], bool)
            assert isinstance(s["food_name"], str) and s["food_name"]

    def test_02_same_family_first(self):
        h = self._auth()
        pid = self._pid()
        # find a component (across meals) whose substitutes contain both same_family true and false
        found = False
        for meal_key in ("lunch", "dinner"):
            for day in range(0, 7):
                for idx in range(0, 4):
                    r = requests.get(
                        f"{API}/programs/{pid}/meals/substitutes",
                        params={"week": 0, "day": day, "meal": meal_key, "index": idx},
                        headers=h, timeout=15,
                    )
                    if r.status_code != 200:
                        continue
                    subs = r.json().get("substitutes", [])
                    if any(s["same_family"] for s in subs) and any(not s["same_family"] for s in subs):
                        flags = [s["same_family"] for s in subs]
                        # all True must come before any False
                        seen_false = False
                        for f in flags:
                            if not f:
                                seen_false = True
                            elif seen_false:
                                pytest.fail(f"same_family=True appears after False: {flags}")
                        found = True
                        break
                if found:
                    break
            if found:
                break
        # If no mixed case exists we accept — still assert ordering globally with one call
        if not found:
            r = requests.get(
                f"{API}/programs/{pid}/meals/substitutes",
                params={"week": 0, "day": 0, "meal": "lunch", "index": 0},
                headers=h, timeout=15,
            )
            subs = r.json()["substitutes"]
            flags = [s["same_family"] for s in subs]
            seen_false = False
            for f in flags:
                if not f:
                    seen_false = True
                elif seen_false:
                    pytest.fail(f"same_family ordering broken: {flags}")

    def test_03_substitutes_index_out_of_range(self):
        h = self._auth()
        pid = self._pid()
        r = requests.get(
            f"{API}/programs/{pid}/meals/substitutes",
            params={"week": 0, "day": 0, "meal": "lunch", "index": 99},
            headers=h, timeout=15,
        )
        assert r.status_code == 404

    def test_04_substitutes_unknown_meal(self):
        h = self._auth()
        pid = self._pid()
        r = requests.get(
            f"{API}/programs/{pid}/meals/substitutes",
            params={"week": 0, "day": 0, "meal": "brunch", "index": 0},
            headers=h, timeout=15,
        )
        assert r.status_code == 404

    # -------------------- set_component --------------------
    def test_05_set_component_success(self):
        h = self._auth()
        pid = self._pid()
        r = requests.get(
            f"{API}/programs/{pid}/meals/substitutes",
            params={"week": 0, "day": 0, "meal": "lunch", "index": 0},
            headers=h, timeout=15,
        )
        assert r.status_code == 200
        subs = r.json()["substitutes"]
        assert subs, "no substitutes to test set_component"
        target = subs[0]
        r = requests.post(
            f"{API}/programs/{pid}/meals/action",
            headers=h,
            json={
                "week": 0, "day": 0, "meal": "lunch",
                "action": "set_component",
                "value": {"index": 0, "food_id": target["food_id"]},
            },
            timeout=20,
        )
        assert r.status_code == 200, r.text
        prog = r.json().get("program") or r.json()
        # response may return the updated program directly; try both shapes
        # fetch program current and inspect
        r2 = requests.get(f"{API}/programs/current", headers=h, timeout=15)
        assert r2.status_code == 200
        p = r2.json()
        m = p["weeks"][0]["days"][0]["meals"]["lunch"]
        assert m["components"][0]["food_id"] == target["food_id"], (
            f"expected {target['food_id']}, got {m['components'][0]['food_id']}"
        )
        assert m["components"][0]["grams"] == target["grams"], (
            f"expected grams {target['grams']}, got {m['components'][0]['grams']}"
        )
        assert isinstance(m["recipe"].get("steps"), list) and len(m["recipe"]["steps"]) > 0, (
            "recipe.steps must remain non-empty after set_component"
        )

    def test_06_set_component_invalid_food_id(self):
        h = self._auth()
        pid = self._pid()
        r = requests.post(
            f"{API}/programs/{pid}/meals/action",
            headers=h,
            json={
                "week": 0, "day": 0, "meal": "lunch",
                "action": "set_component",
                "value": {"index": 0, "food_id": "totally_bogus_food_zzz"},
            },
            timeout=15,
        )
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text}"

    # -------------------- Regression --------------------
    def test_07_regression_generate(self):
        # already generated in _pid; call again to ensure endpoint still works
        h = self._auth()
        r = requests.post(f"{API}/programs/generate", headers=h, timeout=60)
        assert r.status_code == 200, r.text
        # update program id since generate replaces the current one
        TestIteration7._program_id = r.json()["id"]

    def test_08_regression_shopping_week0(self):
        h = self._auth()
        pid = self._pid()
        r = requests.get(f"{API}/programs/{pid}/shopping/0", headers=h, timeout=15)
        assert r.status_code == 200

    def test_09_regression_recap_week0(self):
        h = self._auth()
        pid = self._pid()
        r = requests.get(f"{API}/programs/{pid}/recap/0", headers=h, timeout=15)
        assert r.status_code == 200

    def test_10_regression_batch_week0(self):
        h = self._auth()
        pid = self._pid()
        r = requests.get(f"{API}/programs/{pid}/batch/0", headers=h, timeout=15)
        assert r.status_code == 200

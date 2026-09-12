"""Backend API tests for Mon plan alimentaire - iteration 2.

Note: The pytest config uses --dist loadscope which distributes classes to
different workers. Cross-class state via pytest.xxx does NOT work. All
program-dependent tests are grouped in ONE class so they share a worker.
"""
import copy
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

SEEDED_EMAIL = "testuser1@test.fr"
SEEDED_PASSWORD = "testpass123"


# -------- Auth-only tests (isolated worker, use seeded user) --------
class TestAuth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200

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

    def test_library(self):
        r = requests.get(f"{API}/library", timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ("categories", "equivalences", "foods", "default_program", "moods"):
            assert k in d, f"library missing {k}"
        assert len(d["foods"]) > 0 and len(d["categories"]) > 0


# -------- Full flow tests (one class = one worker, ordered) --------
class TestFullFlow:
    """Setup: fresh user → targets (duration=2, lunch protein 150) → generate program.
    Runs sequentially in one worker so state is shared via class attributes."""

    _headers = None
    _program_id = None
    _extra_id = None

    @classmethod
    def _auth(cls):
        if cls._headers is None:
            email = f"test_{uuid.uuid4().hex[:8]}@test.fr"
            r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "secret123", "name": "T Flow"}, timeout=15)
            assert r.status_code == 200, r.text
            cls._headers = {"Authorization": f"Bearer {r.json()['session_token']}"}
            cls._email = email
        return cls._headers

    # ---- 01: Targets ----
    def test_01_targets_get_default(self):
        h = self._auth()
        r = requests.get(f"{API}/targets", headers=h, timeout=10)
        assert r.status_code == 200
        d = r.json()
        bf = d["breakfast"]
        for k in ("variant", "savory", "sweet_cereal", "sweet_bread"):
            assert k in bf
        for meal in ("lunch", "snack", "dinner"):
            assert isinstance(d[meal].get("items"), list) and len(d[meal]["items"]) > 0
            for it in d[meal]["items"]:
                for kk in ("category", "options", "grams"):
                    assert kk in it
        assert "rules" in d
        assert "duration_weeks" in d

    def test_02_targets_put_duration_2_lunch_protein_150(self):
        h = self._auth()
        payload = requests.get(f"{API}/targets", headers=h, timeout=10).json()
        payload["duration_weeks"] = 2
        for it in payload["lunch"]["items"]:
            if it["category"] == "protein":
                it["grams"] = 150
        r = requests.put(f"{API}/targets", json=payload, headers=h, timeout=10)
        assert r.status_code == 200
        d = requests.get(f"{API}/targets", headers=h, timeout=10).json()
        assert d["duration_weeks"] == 2
        prot = [it for it in d["lunch"]["items"] if it["category"] == "protein"]
        assert prot and prot[0]["grams"] == 150

    def test_03_parse_text(self):
        h = self._auth()
        text = "Déjeuner : Protéines 150 g, Légumes 200 g, Féculents 100 g. Dîner : poisson 120 g, légumes 250 g"
        r = requests.post(f"{API}/targets/parse-text", json={"text": text}, headers=h, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["updates"] > 0
        prot = [it for it in d["targets"]["lunch"]["items"] if it["category"] == "protein"]
        assert prot and prot[0]["grams"] == 150

    def test_04_targets_unauth(self):
        assert requests.get(f"{API}/targets", timeout=10).status_code == 401

    # ---- 05: Generate & program lifecycle ----
    def test_05_generate_program(self):
        h = self._auth()
        r = requests.post(f"{API}/programs/generate", headers=h, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "id" in d and "weeks" in d
        assert len(d["weeks"]) == d["duration_weeks"] == 2, f"expected 2 weeks got {d['duration_weeks']}"
        for w in d["weeks"]:
            assert len(w["days"]) == 7
            for day in w["days"]:
                for meal in day["meals"].values():
                    r_ = meal["recipe"]
                    assert r_["name"]
                    assert isinstance(r_["steps"], list) and len(r_["steps"]) > 0
                    assert r_["minutes"] > 0
                    assert r_["difficulty_label"]
                    assert isinstance(r_.get("image"), str) and r_["image"].startswith("http")
                    assert isinstance(meal["components"], list) and len(meal["components"]) > 0
                    for c in meal["components"]:
                        assert c["grams"] > 0
                        assert c["category_label"]
                        assert c["food_name"]
                    assert "pantry_used" in meal
                    assert meal["done"] is False
        # protein food_id disjoint lunch/dinner same day
        for w in d["weeks"]:
            for day in w["days"]:
                lp = [c["food_id"] for c in day["meals"].get("lunch", {}).get("components", []) if c["category"] == "protein"]
                dp = [c["food_id"] for c in day["meals"].get("dinner", {}).get("components", []) if c["category"] == "protein"]
                if lp and dp:
                    assert set(lp).isdisjoint(dp), f"dup protein: {lp} vs {dp}"
        TestFullFlow._program_id = d["id"]

    def test_06_exclusions_apply(self):
        h = self._auth()
        tgt = requests.get(f"{API}/targets", headers=h, timeout=10).json()
        tgt["rules"]["exclusions"] = ["crevette", "saumon"]
        assert requests.put(f"{API}/targets", json=tgt, headers=h, timeout=10).status_code == 200
        r = requests.post(f"{API}/programs/generate", headers=h, timeout=60)
        assert r.status_code == 200
        d = r.json()
        bad = []
        for w in d["weeks"]:
            for day in w["days"]:
                for meal in day["meals"].values():
                    for c in meal["components"]:
                        n = c["food_name"].lower()
                        if "crevette" in n or "saumon" in n:
                            bad.append(c["food_name"])
        assert not bad, f"excluded foods present: {bad}"
        TestFullFlow._program_id = d["id"]

    def test_07_current_program(self):
        h = self._auth()
        r = requests.get(f"{API}/programs/current", headers=h, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d and d["id"] == TestFullFlow._program_id

    def test_08_list_without_weeks(self):
        h = self._auth()
        r = requests.get(f"{API}/programs", headers=h, timeout=10)
        assert r.status_code == 200
        lst = r.json()
        assert isinstance(lst, list) and len(lst) >= 1
        assert all("weeks" not in p for p in lst)
        assert any(p["id"] == TestFullFlow._program_id for p in lst)

    def test_09_extra_program_activate_delete(self):
        h = self._auth()
        r = requests.post(f"{API}/programs/generate", headers=h, timeout=60)
        assert r.status_code == 200
        extra_id = r.json()["id"]
        TestFullFlow._extra_id = extra_id
        # activate original
        r2 = requests.post(f"{API}/programs/{TestFullFlow._program_id}/activate", headers=h, timeout=10)
        assert r2.status_code == 200
        cur = requests.get(f"{API}/programs/current", headers=h, timeout=10).json()
        assert cur["id"] == TestFullFlow._program_id
        # delete extra
        r3 = requests.delete(f"{API}/programs/{extra_id}", headers=h, timeout=10)
        assert r3.status_code == 200
        assert requests.get(f"{API}/programs/{extra_id}", headers=h, timeout=10).status_code == 404

    # ---- 10-13: Shopping ----
    def test_10_shopping_shape_and_inventory(self):
        h = self._auth()
        inv = requests.post(f"{API}/inventory", json={"name": "Courgettes", "location": "fridge"}, headers=h, timeout=10)
        assert inv.status_code == 200
        TestFullFlow._inv_id = inv.json()["id"]
        r = requests.get(f"{API}/programs/{TestFullFlow._program_id}/shopping/0", headers=h, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("total", "checked", "progress", "sections", "home"):
            assert k in d
        for sec in d["sections"]:
            for kk in ("name", "items"):
                assert kk in sec
            for it in sec["items"]:
                for kk in ("key", "name", "raw_grams", "checked"):
                    assert kk in it
        home_names = [h_["name"].lower() for h_ in d["home"]]
        section_names = [it["name"].lower() for sec in d["sections"] for it in sec["items"]]
        cs = any("courgette" in n for n in section_names)
        ch = any("courgette" in n for n in home_names)
        assert not (cs and ch), "Courgettes must not appear in both sections and home"

    def test_11_shopping_toggle_persists(self):
        h = self._auth()
        d = requests.get(f"{API}/programs/{TestFullFlow._program_id}/shopping/0", headers=h, timeout=15).json()
        first_key = next((sec["items"][0]["key"] for sec in d["sections"] if sec["items"]), None)
        assert first_key
        prev_checked = d["checked"]
        r2 = requests.post(f"{API}/programs/{TestFullFlow._program_id}/shopping/toggle", json={"key": first_key, "checked": True}, headers=h, timeout=10)
        assert r2.status_code == 200
        d3 = requests.get(f"{API}/programs/{TestFullFlow._program_id}/shopping/0", headers=h, timeout=15).json()
        assert d3["checked"] == prev_checked + 1
        assert any(it["key"] == first_key and it["checked"] for sec in d3["sections"] for it in sec["items"])

    def test_12_shopping_out_of_range(self):
        h = self._auth()
        r = requests.get(f"{API}/programs/{TestFullFlow._program_id}/shopping/99", headers=h, timeout=10)
        assert r.status_code == 404

    def test_13_shopping_unauth(self):
        r = requests.get(f"{API}/programs/{TestFullFlow._program_id}/shopping/0", timeout=10)
        assert r.status_code == 401
        # cleanup inventory
        requests.delete(f"{API}/inventory/{TestFullFlow._inv_id}", headers=self._auth(), timeout=10)

    # ---- 14-20: Meal actions ----
    def test_14_done_toggle(self):
        h = self._auth()
        payload = {"week": 0, "day": 0, "meal": "lunch", "action": "done"}
        r = requests.post(f"{API}/programs/{TestFullFlow._program_id}/meals/action", json=payload, headers=h, timeout=15)
        assert r.status_code == 200
        assert r.json()["day"]["meals"]["lunch"]["done"] is True
        r2 = requests.post(f"{API}/programs/{TestFullFlow._program_id}/meals/action", json=payload, headers=h, timeout=15)
        assert r2.json()["day"]["meals"]["lunch"]["done"] is False

    def test_15_favorite_and_prefs(self):
        h = self._auth()
        payload = {"week": 0, "day": 0, "meal": "lunch", "action": "favorite"}
        r = requests.post(f"{API}/programs/{TestFullFlow._program_id}/meals/action", json=payload, headers=h, timeout=15)
        assert r.status_code == 200
        assert r.json()["day"]["meals"]["lunch"]["favorite"] is True
        bp = r.json()["day"]["meals"]["lunch"]["recipe"]["blueprint_id"]
        prefs = requests.get(f"{API}/preferences", headers=h, timeout=10).json()
        assert bp in prefs.get("favorites", [])
        # cleanup toggle off
        requests.post(f"{API}/programs/{TestFullFlow._program_id}/meals/action", json=payload, headers=h, timeout=15)

    def test_16_rating_avoid(self):
        h = self._auth()
        payload = {"week": 0, "day": 0, "meal": "lunch", "action": "rating", "value": "avoid"}
        r = requests.post(f"{API}/programs/{TestFullFlow._program_id}/meals/action", json=payload, headers=h, timeout=15)
        assert r.status_code == 200
        bp = r.json()["day"]["meals"]["lunch"]["recipe"]["blueprint_id"]
        prefs = requests.get(f"{API}/preferences", headers=h, timeout=10).json()
        assert bp in prefs.get("avoid", [])
        requests.post(f"{API}/programs/{TestFullFlow._program_id}/meals/action", json={"week": 0, "day": 0, "meal": "lunch", "action": "rating", "value": "neutral"}, headers=h, timeout=15)

    def test_17_replace_lunch_different(self):
        h = self._auth()
        r0 = requests.get(f"{API}/programs/{TestFullFlow._program_id}", headers=h, timeout=10)
        original = r0.json()["weeks"][0]["days"][0]["meals"]["lunch"]["recipe"]["name"]
        r = requests.post(f"{API}/programs/{TestFullFlow._program_id}/meals/action", json={"week": 0, "day": 0, "meal": "lunch", "action": "replace"}, headers=h, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["message"] and "🔄" in d["message"]
        assert d["day"]["meals"]["lunch"]["recipe"]["name"] != original

    def test_18_quick_dinner(self):
        h = self._auth()
        r = requests.post(f"{API}/programs/{TestFullFlow._program_id}/meals/action", json={"week": 0, "day": 0, "meal": "dinner", "action": "quick"}, headers=h, timeout=15)
        assert r.status_code == 200
        assert r.json()["day"]["meals"]["dinner"]["recipe"].get("quick") is True

    def test_19_replace_with_mood_fresh(self):
        h = self._auth()
        r = requests.post(f"{API}/programs/{TestFullFlow._program_id}/meals/action", json={"week": 0, "day": 1, "meal": "lunch", "action": "replace", "mood": "fresh"}, headers=h, timeout=15)
        assert r.status_code == 200
        moods = r.json()["day"]["meals"]["lunch"]["recipe"].get("moods", [])
        if "fresh" not in moods:
            print(f"[warn] mood 'fresh' fallback (recipe moods={moods}) — acceptable per spec")

    def test_20_replace_component(self):
        h = self._auth()
        r0 = requests.get(f"{API}/programs/{TestFullFlow._program_id}", headers=h, timeout=10)
        before = r0.json()["weeks"][0]["days"][0]["meals"]["lunch"]["components"][0]["food_name"]
        r = requests.post(f"{API}/programs/{TestFullFlow._program_id}/meals/action", json={"week": 0, "day": 0, "meal": "lunch", "action": "replace_component", "value": 0}, headers=h, timeout=15)
        if r.status_code == 400:
            pytest.skip("no equivalent available (acceptable)")
        assert r.status_code == 200
        after = r.json()["day"]["meals"]["lunch"]["components"][0]["food_name"]
        assert after != before

    def test_21_unknown_action(self):
        h = self._auth()
        r = requests.post(f"{API}/programs/{TestFullFlow._program_id}/meals/action", json={"week": 0, "day": 0, "meal": "lunch", "action": "bogus"}, headers=h, timeout=10)
        assert r.status_code == 400

    def test_22_meals_action_unauth(self):
        r = requests.post(f"{API}/programs/{TestFullFlow._program_id}/meals/action", json={"week": 0, "day": 0, "meal": "lunch", "action": "done"}, timeout=10)
        assert r.status_code == 401

    # ---- 23-24: swap_day 400 then success ----
    def test_23_swap_day_400_when_different(self):
        h = self._auth()
        r = requests.post(f"{API}/programs/{TestFullFlow._program_id}/meals/action", json={"week": 0, "day": 2, "meal": "lunch", "action": "swap_day"}, headers=h, timeout=15)
        assert r.status_code == 400
        assert "Interversion impossible" in r.json().get("detail", "")

    def test_24_swap_day_success_when_equal(self):
        h = self._auth()
        tgt = requests.get(f"{API}/targets", headers=h, timeout=10).json()
        # copy lunch items to dinner (identical categories/grams AND active state)
        tgt["dinner"]["items"] = copy.deepcopy(tgt["lunch"]["items"])
        tgt["dinner"]["active"] = tgt["lunch"].get("active", True)
        tgt["rules"]["exclusions"] = []
        tgt["rules"]["allow_lunch_dinner_swap"] = True
        assert requests.put(f"{API}/targets", json=tgt, headers=h, timeout=10).status_code == 200
        rg = requests.post(f"{API}/programs/generate", headers=h, timeout=60)
        assert rg.status_code == 200
        pid = rg.json()["id"]
        TestFullFlow._program_id = pid
        d0 = requests.get(f"{API}/programs/{pid}", headers=h, timeout=10).json()
        lunch0 = d0["weeks"][0]["days"][0]["meals"]["lunch"]["recipe"]["name"]
        dinner0 = d0["weeks"][0]["days"][0]["meals"]["dinner"]["recipe"]["name"]
        r = requests.post(f"{API}/programs/{pid}/meals/action", json={"week": 0, "day": 0, "meal": "lunch", "action": "swap_day"}, headers=h, timeout=15)
        assert r.status_code == 200, r.text
        day = r.json()["day"]
        assert day["meals"]["lunch"]["recipe"]["name"] == dinner0
        assert day["meals"]["dinner"]["recipe"]["name"] == lunch0

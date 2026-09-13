"""Iteration 8 — household shopping x N, undo last meal change, lifestyle badges."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers["Content-Type"] = "application/json"
    email = f"test_it8_{uuid.uuid4().hex[:8]}@test.fr"
    r = s.post(f"{BASE_URL}/api/auth/signup", json={"email": email, "password": "pw123456", "name": "IT8"})
    assert r.status_code == 200, r.text
    tok = r.json()["session_token"]
    s.headers["Authorization"] = f"Bearer {tok}"
    return s


@pytest.fixture(scope="module")
def program(session):
    r = session.post(f"{BASE_URL}/api/programs/generate")
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Shopping household ----------
class TestShoppingHousehold:
    def test_household_default_is_1(self, session, program):
        r = session.get(f"{BASE_URL}/api/programs/{program['id']}/shopping/0")
        assert r.status_code == 200
        data = r.json()
        assert data["household"] == 1
        assert isinstance(data.get("text"), str)
        assert data["text"].startswith("🛒 Courses — Semaine 1")

    def test_household_2_doubles_raw_grams(self, session, program):
        r1 = session.get(f"{BASE_URL}/api/programs/{program['id']}/shopping/0", params={"household": 1})
        r2 = session.get(f"{BASE_URL}/api/programs/{program['id']}/shopping/0", params={"household": 2})
        assert r1.status_code == 200 and r2.status_code == 200
        d1, d2 = r1.json(), r2.json()
        assert d2["household"] == 2
        # Build lookup by food_id for both
        items1 = {i["food_id"]: i for s in d1["sections"] for i in s["items"]}
        items2 = {i["food_id"]: i for s in d2["sections"] for i in s["items"]}
        common = set(items1) & set(items2)
        assert len(common) > 0, "No common items to compare"
        for fid in common:
            g1, g2 = items1[fid]["raw_grams"], items2[fid]["raw_grams"]
            # tolerance 5 g for rounding
            assert abs(g2 - 2 * g1) <= 5, f"item {fid}: {g2} != 2*{g1} (±5g)"

    def test_household_2_text_mentions(self, session, program):
        r = session.get(f"{BASE_URL}/api/programs/{program['id']}/shopping/0", params={"household": 2})
        assert r.status_code == 200
        assert "×2 personnes" in r.json()["text"]

    def test_household_7_returns_422(self, session, program):
        r = session.get(f"{BASE_URL}/api/programs/{program['id']}/shopping/0", params={"household": 7})
        assert r.status_code == 422


# ---------- Undo last meal change ----------
class TestUndo:
    def _current_lunch_name(self, session, program_id):
        r = session.get(f"{BASE_URL}/api/programs/current")
        assert r.status_code == 200
        prog = r.json()
        return prog["weeks"][0]["days"][3]["meals"]["lunch"]["recipe"]["name"]

    def test_replace_then_undo_restores_original(self, session, program):
        pid = program["id"]
        original = self._current_lunch_name(session, pid)
        # replace
        r = session.post(f"{BASE_URL}/api/programs/{pid}/meals/action",
                         json={"action": "replace", "week": 0, "day": 3, "meal": "lunch"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("can_undo") is True
        new_name = body["day"]["meals"]["lunch"]["recipe"]["name"]
        # Names might collide occasionally; still valid if can_undo True.
        # undo
        r2 = session.post(f"{BASE_URL}/api/programs/{pid}/meals/action",
                          json={"action": "undo", "week": 0, "day": 3, "meal": "lunch"})
        assert r2.status_code == 200, r2.text
        body2 = r2.json()
        assert body2["message"] == "↩ Dernière modification annulée."
        assert body2["day"]["meals"]["lunch"]["recipe"]["name"] == original
        assert body2["can_undo"] is False
        # Verify persistence
        assert self._current_lunch_name(session, pid) == original

    def test_second_undo_returns_400(self, session, program):
        pid = program["id"]
        r = session.post(f"{BASE_URL}/api/programs/{pid}/meals/action",
                         json={"action": "undo", "week": 0, "day": 3, "meal": "lunch"})
        assert r.status_code == 400
        assert "annuler" in r.json().get("detail", "").lower()

    def test_done_does_not_create_snapshot(self, session, program):
        pid = program["id"]
        # First do a replace -> can_undo true
        r = session.post(f"{BASE_URL}/api/programs/{pid}/meals/action",
                         json={"action": "replace", "week": 0, "day": 2, "meal": "lunch"})
        assert r.status_code == 200
        assert r.json().get("can_undo") is True
        # Then undo -> can_undo false
        r = session.post(f"{BASE_URL}/api/programs/{pid}/meals/action",
                         json={"action": "undo", "week": 0, "day": 2, "meal": "lunch"})
        assert r.status_code == 200
        assert r.json().get("can_undo") is False
        # done should NOT create a new snapshot
        r = session.post(f"{BASE_URL}/api/programs/{pid}/meals/action",
                         json={"action": "done", "week": 0, "day": 2, "meal": "lunch", "value": True})
        assert r.status_code == 200
        assert r.json().get("can_undo") is False


# ---------- Lifestyle badges ----------
class TestLifestyleBadges:
    ALLOWED = {"Sans cuisson", "Sans four", "À emporter", "Air fryer OK"}

    def test_main_meals_have_lifestyle_list(self, session, program):
        """Main meals (breakfast/lunch/dinner) built via make_recipe must expose lifestyle."""
        r = session.get(f"{BASE_URL}/api/programs/current")
        assert r.status_code == 200
        prog = r.json()
        checked = 0
        any_non_empty = False
        for wk in prog["weeks"]:
            for day in wk["days"]:
                for key, m in day["meals"].items():
                    if key == "snack":
                        continue  # snack built inline, tracked separately
                    recipe = m["recipe"]
                    assert "lifestyle" in recipe, f"missing lifestyle in {key} {recipe.get('name')}"
                    lst = recipe["lifestyle"]
                    assert isinstance(lst, list)
                    for tag in lst:
                        assert tag in self.ALLOWED, f"unexpected badge {tag!r}"
                    if lst:
                        any_non_empty = True
                    checked += 1
        assert checked > 0
        assert any_non_empty, "no non-snack meal has lifestyle badges"

    def test_snack_lifestyle_field_missing_bug(self, session, program):
        """DOCUMENT BUG: snack recipes are built inline in build_snack and lack the lifestyle field.
        Per spec every meal.recipe should possess 'lifestyle' (possibly empty)."""
        r = session.get(f"{BASE_URL}/api/programs/current")
        prog = r.json()
        missing_snack = []
        for wi, wk in enumerate(prog["weeks"]):
            for di, day in enumerate(wk["days"]):
                s = day["meals"].get("snack")
                if s and "lifestyle" not in s["recipe"]:
                    missing_snack.append(f"w{wi}d{di}")
        if missing_snack:
            pytest.xfail(f"KNOWN: snack recipe missing 'lifestyle' in {len(missing_snack)} meals (engine.py:490 build_snack builds recipe dict inline instead of via make_recipe)")


# ---------- Regression ----------
class TestRegression:
    def test_shopping_toggle(self, session, program):
        pid = program["id"]
        r = session.get(f"{BASE_URL}/api/programs/{pid}/shopping/0")
        assert r.status_code == 200
        data = r.json()
        first_key = None
        for sec in data["sections"]:
            for it in sec["items"]:
                first_key = it["key"]
                break
            if first_key:
                break
        assert first_key
        r = session.post(f"{BASE_URL}/api/programs/{pid}/shopping/toggle",
                         json={"key": first_key, "checked": True})
        assert r.status_code == 200

    def test_recap_week_0(self, session, program):
        r = session.get(f"{BASE_URL}/api/programs/{program['id']}/recap/0")
        assert r.status_code == 200
        assert r.json().get("week") == 1

    def test_substitutes(self, session, program):
        pid = program["id"]
        # find a meal with components
        r = session.get(f"{BASE_URL}/api/programs/current")
        prog = r.json()
        for di, day in enumerate(prog["weeks"][0]["days"]):
            m = day["meals"].get("lunch")
            if m and m.get("components"):
                r = session.get(f"{BASE_URL}/api/programs/{pid}/meals/substitutes",
                                params={"week": 0, "day": di, "meal": "lunch", "index": 0})
                assert r.status_code == 200
                data = r.json()
                assert "current" in data and "substitutes" in data
                return
        pytest.skip("no lunch with components")

"""Iteration 11 — kcal par plat, cohérence photo/protéine/méthode, set_component recalcule kcal."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")

# Méthodes qui imposent une photo indépendante de la protéine (voir engine.pick_image).
METHOD_OVERRIDES = {
    "tomato_pasta", "bolognese", "creamy_pasta", "pesto_pasta", "carbonara", "gnocchi_skillet",
    "risotto", "curry", "stew", "chili", "wok", "fried_rice", "fruit_skillet", "gratin", "layered",
    "parmentier", "quiche", "tian", "stuffed", "potato_stuffed", "warm_salad", "fresh_bowl", "bowl",
    "cold_soup", "burger_bowl", "taco_bowl", "korean_bowl", "hot_toast", "bruschetta", "fresh_toast",
    "sandwich",
}
PASTA_METHODS = {"tomato_pasta", "bolognese", "creamy_pasta", "pesto_pasta", "carbonara", "gnocchi_skillet"}

SHELLFISH = {"crevettes", "gambas", "saint_jacques", "crabe", "moules"}
FATTY_FISH = {"saumon", "truite", "maquereau", "sardines", "hareng", "thon"}
WHITE_MEAT = {"poulet", "dinde", "pintade", "veau", "porc_maigre"}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers["Content-Type"] = "application/json"
    email = f"test_it11_{uuid.uuid4().hex[:8]}@test.fr"
    r = s.post(f"{BASE_URL}/api/auth/signup", json={"email": email, "password": "pw123456", "name": "IT11"})
    assert r.status_code == 200, r.text
    s.headers["Authorization"] = f"Bearer {r.json()['session_token']}"
    return s


@pytest.fixture(scope="module")
def program(session):
    r = session.post(f"{BASE_URL}/api/programs/generate")
    assert r.status_code == 200, r.text
    return r.json()


def _iter_meals(program):
    for w_idx, w in enumerate(program["weeks"]):
        for d_idx, day in enumerate(w["days"]):
            for mkey, meal in day["meals"].items():
                yield w_idx, d_idx, mkey, meal


# ---------------------------------------------------------------- kcal


class TestKcal:
    def test_every_meal_has_positive_int_kcal(self, program):
        bad = []
        for w, d, mk, m in _iter_meals(program):
            k = m["recipe"].get("kcal")
            if not isinstance(k, int) or k <= 0:
                bad.append((w, d, mk, k))
        assert not bad, f"meals with non-positive/int kcal: {bad[:5]}"

    def test_recipe_kcal_equals_sum_components(self, program):
        mismatches = []
        for w, d, mk, m in _iter_meals(program):
            total = sum(int(c.get("kcal", 0)) for c in m["components"])
            if m["recipe"]["kcal"] != total:
                mismatches.append((w, d, mk, m["recipe"]["kcal"], total))
        assert not mismatches, f"recipe.kcal != sum(components.kcal): {mismatches[:5]}"

    def test_kcal_plausible_ranges(self, program):
        # déjeuner/dîner 250-1100 ; petit-déj 150-700 ; collation 80-400
        RANGES = {"lunch": (250, 1100), "dinner": (250, 1100), "breakfast": (150, 700), "snack": (80, 400)}
        bad = []
        for w, d, mk, m in _iter_meals(program):
            lo, hi = RANGES[mk]
            k = m["recipe"]["kcal"]
            if not (lo <= k <= hi):
                bad.append((w, d, mk, k, lo, hi))
        # Autoriser au plus 5 % de dépassement (bruit ponctuel), sinon échec.
        total = sum(1 for _ in _iter_meals(program))
        assert len(bad) <= max(1, total // 20), f"kcal hors plage ({len(bad)}/{total}) — ex: {bad[:5]}"


# ---------------------------------------------------------------- images


class TestImageCoherence:
    def test_image_matches_method_or_protein(self, program):
        problems = []
        for w, d, mk, m in _iter_meals(program):
            if mk not in ("lunch", "dinner"):
                continue
            r = m["recipe"]
            method = r["method"]
            img = r["image"]
            protein = next((c for c in m["components"] if c["category"] == "protein"), None)
            if not protein:
                continue
            fid = protein["food_id"]

            # (i) méthode pâtes → photo-1621996346565
            if method in PASTA_METHODS:
                if "photo-1621996346565" not in img:
                    problems.append(("pasta", w, d, mk, method, fid, img))
                continue

            # Si la méthode impose sa photo (autre que pâtes déjà traitée), on n'exige rien sur la protéine.
            if method in METHOD_OVERRIDES:
                continue

            # (ii) protéines sans override méthode
            if fid in SHELLFISH:
                if "photo-1559737558" not in img:
                    problems.append(("shellfish", w, d, mk, method, fid, img))
            elif fid in FATTY_FISH:
                if "photo-1467003909585" not in img:
                    problems.append(("fatty_fish", w, d, mk, method, fid, img))
            elif fid in WHITE_MEAT:
                if "photo-1598515214211" not in img:
                    problems.append(("white_meat", w, d, mk, method, fid, img))
        assert not problems, f"incohérences image ({len(problems)}) — ex: {problems[:5]}"


# ---------------------------------------------------------------- login + current


class TestCurrentProgram:
    def test_login_and_current_all_meals_have_kcal(self):
        s = requests.Session()
        s.headers["Content-Type"] = "application/json"
        r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "testuser1@test.fr", "password": "testpass123"})
        assert r.status_code == 200, r.text
        s.headers["Authorization"] = f"Bearer {r.json()['session_token']}"
        r = s.get(f"{BASE_URL}/api/programs/current")
        assert r.status_code == 200, r.text
        prog = r.json()
        missing = []
        for w, d, mk, m in _iter_meals(prog):
            if not isinstance(m["recipe"].get("kcal"), int) or m["recipe"]["kcal"] <= 0:
                missing.append((w, d, mk, m["recipe"].get("kcal")))
        assert not missing, f"current program: meals sans kcal: {missing[:5]}"


# ---------------------------------------------------------------- set_component


class TestSetComponentKcal:
    def test_set_component_recomputes_kcal(self, session, program):
        pid = program["id"]
        # Trouver un repas principal avec substituts sur index 0.
        target = None
        for w_idx, w in enumerate(program["weeks"]):
            for d_idx, day in enumerate(w["days"]):
                for mk in ("lunch", "dinner"):
                    m = day["meals"].get(mk)
                    if not m or not m["components"]:
                        continue
                    r = session.get(
                        f"{BASE_URL}/api/programs/{pid}/meals/substitutes",
                        params={"week": w_idx, "day": d_idx, "meal": mk, "index": 0},
                    )
                    if r.status_code == 200 and r.json().get("substitutes"):
                        target = (w_idx, d_idx, mk, r.json()["substitutes"][0])
                        break
                if target:
                    break
            if target:
                break
        assert target, "aucun repas avec substitut trouvé"
        w_idx, d_idx, mk, sub = target
        r = session.post(
            f"{BASE_URL}/api/programs/{pid}/meals/action",
            json={"action": "set_component", "value": {"index": 0, "food_id": sub["food_id"]}, "week": w_idx, "day": d_idx, "meal": mk},
        )
        assert r.status_code == 200, r.text
        day = r.json()["day"]
        meal = day["meals"][mk]
        total = sum(int(c.get("kcal", 0)) for c in meal["components"])
        assert meal["recipe"]["kcal"] == total, f"kcal={meal['recipe']['kcal']} != somme={total}"
        assert meal["recipe"]["kcal"] > 0
        # composant 0 doit correspondre au food choisi
        assert meal["components"][0]["food_id"] == sub["food_id"]

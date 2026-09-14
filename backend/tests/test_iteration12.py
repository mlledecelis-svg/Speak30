"""Iteration 12 — equivalences pro, bonus légumes pain/biscottes, condiments oignon/ail,
snack dairy migration, exclusions poisson/ail, recherche recette, apply_recipe/set_component,
hydration goal defaults=4 et bornes."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


# ============================================================ Library (public)
class TestLibrary:
    def test_equivalences_portions_and_foods(self):
        d = requests.get(f"{API}/library", timeout=15).json()
        eqs = d["equivalences"]
        expected = {
            "eq_breakfast_bread": 40,
            "eq_breakfast_crispbread": 25,
            "eq_main_pasta": 100,
            "eq_main_potato": 130,
            "eq_main_bread": 35,
            "eq_main_crispbread": 20,
            "eq_protein_beef": 90,
            "eq_protein_white_fish": 120,
            "eq_protein_fatty_fish": 90,
        }
        for k, p in expected.items():
            assert k in eqs, f"eq missing {k}"
            assert eqs[k]["portion"] == p, f"{k} portion {eqs[k]['portion']} != {p}"
            for f in eqs[k]["foods"]:
                assert set(("id", "name", "portion")) <= set(f.keys()), f"{k} food shape: {f}"
        # thon in fatty_fish with portion 100 (per pro)
        thon = next(f for f in eqs["eq_protein_fatty_fish"]["foods"] if f["id"] == "thon")
        assert thon["portion"] == 100
        # eq_fruit: raisin/cerises/figue portion 104
        fruits = {f["id"]: f["portion"] for f in eqs["eq_fruit"]["foods"]}
        for fid in ("raisin", "cerises", "figue"):
            assert fruits.get(fid) == 104, f"eq_fruit {fid} portion={fruits.get(fid)}"

    def test_rules_info_bread_bonus(self):
        d = requests.get(f"{API}/library", timeout=15).json()
        assert d["rules_info"]["bread_vegetable_bonus_g"] == 80

    def test_onion_garlic_are_condiments(self):
        d = requests.get(f"{API}/library", timeout=15).json()
        foods = d["foods"]
        oignon = [f for f in foods if f["id"] == "oignon"]
        ail = [f for f in foods if f["id"] == "ail"]
        assert oignon and oignon[0]["cat"] == "condiment"
        assert ail and ail[0]["cat"] == "condiment"
        # No vegetables-cat item named oignon
        for f in foods:
            if f["cat"] == "vegetables":
                assert "oignon" not in f["id"].lower() and "oignon" not in f["name"].lower()


# ============================================================ Full flow — auth + targets + generate
class TestIt12Flow:
    _s: requests.Session = None
    _pid: str = None

    @classmethod
    def _auth(cls):
        if cls._s is None:
            s = requests.Session()
            s.headers["Content-Type"] = "application/json"
            email = f"test_it12_{uuid.uuid4().hex[:8]}@test.fr"
            r = s.post(f"{API}/auth/signup", json={"email": email, "password": "pw123456", "name": "IT12"})
            assert r.status_code == 200, r.text
            s.headers["Authorization"] = f"Bearer {r.json()['session_token']}"
            cls._s = s
        return cls._s

    # ---- 01 : snack.items contains 'dairy' with grams 0 by default (migration auto)
    def test_01_snack_has_dairy_zero(self):
        s = self._auth()
        d = s.get(f"{API}/targets", timeout=15).json()
        dairy = [it for it in d["snack"]["items"] if it["category"] == "dairy"]
        assert dairy, f"snack.items missing dairy row: {d['snack']['items']}"
        assert dairy[0]["grams"] == 0, f"dairy grams={dairy[0]['grams']}"

    # ---- 02 : PUT defaults, generate — every component has base_grams; bread/crispbread → +80 legumes
    def test_02_generate_has_base_grams_and_bonus(self):
        s = self._auth()
        # reset : default targets, no exclusions
        cur = s.get(f"{API}/targets", timeout=15).json()
        cur["rules"]["exclusions"] = []
        assert s.put(f"{API}/targets", json=cur, timeout=15).status_code == 200
        r = s.post(f"{API}/programs/generate", timeout=90)
        assert r.status_code == 200, r.text
        prog = r.json()
        TestIt12Flow._pid = prog["id"]
        # base_grams present on every component
        missing_base = []
        checked_bread = 0
        wrong_bonus = []
        onion_ail_veg = []
        for w in prog["weeks"]:
            for day in w["days"]:
                for mk, meal in day["meals"].items():
                    for c in meal["components"]:
                        if "base_grams" not in c:
                            missing_base.append((mk, c.get("food_id"), c.get("category")))
                        if c["category"] == "vegetables" and c.get("food_id") in ("oignon", "ail"):
                            onion_ail_veg.append((mk, c["food_id"]))
                    if mk in ("lunch", "dinner"):
                        starch = next((c for c in meal["components"] if c["category"] == "starch"), None)
                        veg = next((c for c in meal["components"] if c["category"] == "vegetables"), None)
                        if starch and veg and starch.get("food_id") in ("pain_complet", "biscottes"):
                            checked_bread += 1
                            bonus = veg.get("rule_bonus")
                            if bonus != 80 or veg["grams"] != veg["base_grams"] + 80:
                                wrong_bonus.append((mk, starch["food_id"], veg["base_grams"], veg["grams"], bonus))
        assert not missing_base, f"components missing base_grams: {missing_base[:5]}"
        assert not onion_ail_veg, f"oignon/ail found as vegetables: {onion_ail_veg[:5]}"
        assert not wrong_bonus, f"bread/crispbread bonus wrong: {wrong_bonus[:5]}"
        # Not asserting checked_bread>0 as it depends on picks; print for info
        print(f"[info] bread/crispbread starch occurrences checked: {checked_bread}")

    # ---- 03 : Protein conversions with lunch protein 100 g (white_meat ref)
    def test_03_protein_conversions(self):
        s = self._auth()
        tgt = s.get(f"{API}/targets", timeout=15).json()
        for it in tgt["lunch"]["items"]:
            if it["category"] == "protein":
                it["grams"] = 100
        tgt["rules"]["exclusions"] = []
        assert s.put(f"{API}/targets", json=tgt, timeout=15).status_code == 200
        r = s.post(f"{API}/programs/generate", timeout=90)
        assert r.status_code == 200, r.text
        prog = r.json()
        TestIt12Flow._pid = prog["id"]
        # For lunch protein of white_fish→120, red_meat→90, saumon→90, thon→100
        WHITE_FISH = {"cabillaud", "colin", "lieu_noir", "merlu", "sole", "julienne", "eglefin", "dorade", "bar", "lotte"}
        RED_MEAT = {"boeuf", "bavette", "onglet", "steak_hache_5", "agneau"}
        seen = {"white_fish": None, "red_meat": None, "saumon": None, "thon": None}
        for w in prog["weeks"]:
            for day in w["days"]:
                lunch = day["meals"].get("lunch")
                if not lunch:
                    continue
                prot = next((c for c in lunch["components"] if c["category"] == "protein"), None)
                if not prot:
                    continue
                fid, g = prot["food_id"], prot["grams"]
                if fid in WHITE_FISH:
                    seen["white_fish"] = (fid, g)
                elif fid in RED_MEAT:
                    seen["red_meat"] = (fid, g)
                elif fid == "saumon":
                    seen["saumon"] = (fid, g)
                elif fid == "thon":
                    seen["thon"] = (fid, g)
        # Verify observed grams — at least one hit expected for red_meat and white_fish over 7 days
        errors = []
        if seen["white_fish"] and seen["white_fish"][1] != 120:
            errors.append(f"white_fish {seen['white_fish']} !=120")
        if seen["red_meat"] and seen["red_meat"][1] != 90:
            errors.append(f"red_meat {seen['red_meat']} !=90")
        if seen["saumon"] and seen["saumon"][1] != 90:
            errors.append(f"saumon {seen['saumon']} !=90")
        if seen["thon"] and seen["thon"][1] != 100:
            errors.append(f"thon {seen['thon']} !=100")
        assert not errors, errors
        print(f"[info] protein hits: {seen}")

    # ---- 04 : Exclusions poisson + ail — no fish component, no ail in recipe.extras
    def test_04_exclusions_fish_ail(self):
        s = self._auth()
        tgt = s.get(f"{API}/targets", timeout=15).json()
        tgt["rules"]["exclusions"] = ["poisson", "ail"]
        assert s.put(f"{API}/targets", json=tgt, timeout=15).status_code == 200
        r = s.post(f"{API}/programs/generate", timeout=90)
        assert r.status_code == 200, r.text
        prog = r.json()
        fish_hits = []
        ail_hits = []
        for w in prog["weeks"]:
            for day in w["days"]:
                for mk, meal in day["meals"].items():
                    for c in meal["components"]:
                        tags = c.get("tags") or []
                        if "fish" in tags:
                            fish_hits.append((mk, c["food_id"], tags))
                    extras = meal.get("recipe", {}).get("extras") or []
                    if isinstance(extras, list):
                        for e in extras:
                            name = e if isinstance(e, str) else e.get("name", "") if isinstance(e, dict) else ""
                            if "ail" in name.lower():
                                ail_hits.append((mk, name))
        assert not fish_hits, f"fish leaked despite exclusion: {fish_hits[:5]}"
        assert not ail_hits, f"ail leaked despite exclusion: {ail_hits[:5]}"

        # /api/recipes/search?q=saumon → 0 result or no fish matched
        rs = s.get(f"{API}/recipes/search", params={"q": "saumon"}, timeout=15)
        assert rs.status_code == 200
        results = rs.json().get("results", []) if isinstance(rs.json(), dict) else rs.json()
        # Accept either 0 results, or results whose matched_food is not a fish
        for r_ in results:
            mf = (r_.get("matched_food") or {})
            fid = mf.get("id") if isinstance(mf, dict) else mf
            assert fid != "saumon", f"saumon should not appear when fish excluded: {r_}"

        # Reset exclusions
        tgt["rules"]["exclusions"] = []
        s.put(f"{API}/targets", json=tgt, timeout=15)

    # ---- 05 : recipes/search filters + meal-scoped
    def test_05_recipes_search(self):
        s = self._auth()
        r = s.get(f"{API}/recipes/search", params={"q": "saumon", "meal": "lunch"}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        results = body.get("results", []) if isinstance(body, dict) else body
        assert results, f"empty saumon lunch search: {body}"
        for x in results[:3]:
            for k in ("name", "image", "minutes", "lifestyle", "matched_food"):
                assert k in x, f"result missing {k}: {x}"
        # filter takeaway
        r2 = s.get(f"{API}/recipes/search", params={"q": "", "filters": "takeaway"}, timeout=15)
        assert r2.status_code == 200
        res2 = r2.json().get("results", []) if isinstance(r2.json(), dict) else r2.json()
        assert res2
        for x in res2[:10]:
            assert "À emporter" in (x.get("lifestyle") or []), f"missing À emporter: {x.get('lifestyle')}"
        # filter quick
        r3 = s.get(f"{API}/recipes/search", params={"q": "", "filters": "quick"}, timeout=15)
        res3 = r3.json().get("results", []) if isinstance(r3.json(), dict) else r3.json()
        assert res3
        for x in res3[:10]:
            assert x.get("quick") is True, f"quick should be true: {x}"
        # filter veg
        r4 = s.get(f"{API}/recipes/search", params={"q": "", "filters": "veg"}, timeout=15)
        res4 = r4.json().get("results", []) if isinstance(r4.json(), dict) else r4.json()
        assert res4
        for x in res4[:10]:
            assert x.get("vegetarian") is True, f"vegetarian should be true: {x}"

    # ---- 06 : apply_recipe adapt_papillote + saumon, undo restores
    def test_06_apply_recipe_undo(self):
        s = self._auth()
        # ensure program with fish allowed
        tgt = s.get(f"{API}/targets", timeout=15).json()
        tgt["rules"]["exclusions"] = []
        s.put(f"{API}/targets", json=tgt, timeout=15)
        if not TestIt12Flow._pid:
            g = s.post(f"{API}/programs/generate", timeout=90)
            TestIt12Flow._pid = g.json()["id"]
        pid = TestIt12Flow._pid
        prev = s.get(f"{API}/programs/{pid}", timeout=15).json()
        prev_lunch_name = prev["weeks"][0]["days"][0]["meals"]["lunch"]["recipe"]["name"]
        r = s.post(
            f"{API}/programs/{pid}/meals/action",
            json={"week": 0, "day": 0, "meal": "lunch", "action": "apply_recipe",
                  "value": {"blueprint_id": "adapt_papillote", "food_id": "saumon"}},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        lunch = body["day"]["meals"]["lunch"]
        assert lunch["recipe"]["blueprint_id"] == "adapt_papillote", lunch["recipe"].get("blueprint_id")
        prot = next(c for c in lunch["components"] if c["category"] == "protein")
        assert prot["food_id"] == "saumon" and prot["grams"] == 90, prot
        assert body.get("can_undo") is True, body
        # undo
        r2 = s.post(
            f"{API}/programs/{pid}/meals/action",
            json={"week": 0, "day": 0, "meal": "lunch", "action": "undo"},
            timeout=15,
        )
        assert r2.status_code == 200, r2.text
        restored = r2.json()["day"]["meals"]["lunch"]["recipe"]["name"]
        assert restored == prev_lunch_name, f"undo not restoring: {restored} vs {prev_lunch_name}"

    # ---- 07 : set_component grams converted + name updated
    def test_07_set_component_conversion_and_name(self):
        s = self._auth()
        pid = TestIt12Flow._pid
        assert pid
        # substitutes for lunch day 0 index 0
        r = s.get(f"{API}/programs/{pid}/meals/substitutes",
                  params={"week": 0, "day": 0, "meal": "lunch", "index": 0}, timeout=15)
        assert r.status_code == 200, r.text
        subs = r.json().get("substitutes", [])
        assert subs, "no substitutes"
        # Each sub should have grams field
        for sb in subs[:5]:
            assert "grams" in sb and sb["grams"] > 0, f"substitute missing grams: {sb}"
        # Get current component and name
        prog = s.get(f"{API}/programs/{pid}", timeout=15).json()
        lunch = prog["weeks"][0]["days"][0]["meals"]["lunch"]
        old_food_id = lunch["components"][0]["food_id"]
        old_food_name = lunch["components"][0]["food_name"]
        old_recipe_name = lunch["recipe"]["name"]
        # Pick a sub that isn't the current one
        target_sub = next((sb for sb in subs if sb["food_id"] != old_food_id), None)
        assert target_sub, subs
        r2 = s.post(
            f"{API}/programs/{pid}/meals/action",
            json={"week": 0, "day": 0, "meal": "lunch", "action": "set_component",
                  "value": {"index": 0, "food_id": target_sub["food_id"]}},
            timeout=15,
        )
        assert r2.status_code == 200, r2.text
        body = r2.json()
        meal = body["day"]["meals"]["lunch"]
        assert meal["components"][0]["food_id"] == target_sub["food_id"]
        # grams should match substitute grams
        assert meal["components"][0]["grams"] == target_sub["grams"], (meal["components"][0]["grams"], target_sub["grams"])
        # Name should reflect new food or remove old
        new_name = meal["recipe"]["name"]
        new_food_name = meal["components"][0]["food_name"]
        print(f"[info] old_recipe='{old_recipe_name}' old_food='{old_food_name}' → new_recipe='{new_name}' new_food='{new_food_name}'")
        # Rule: name changes to reflect new food (contains new name/tag OR '(avec …)')
        cond_old_gone = old_food_name.lower() not in new_name.lower()
        cond_new_or_avec = (new_food_name.lower() in new_name.lower()) or ("avec" in new_name.lower())
        assert cond_old_gone or cond_new_or_avec, f"name not updated: old_food='{old_food_name}' new_food='{new_food_name}' new_recipe='{new_name}'"


# ============================================================ Hydration
class TestHydration:
    def test_default_goal_is_4(self):
        s = requests.Session()
        s.headers["Content-Type"] = "application/json"
        email = f"test_hy_{uuid.uuid4().hex[:8]}@test.fr"
        r = s.post(f"{API}/auth/signup", json={"email": email, "password": "pw123456", "name": "Hyd"})
        assert r.status_code == 200, r.text
        s.headers["Authorization"] = f"Bearer {r.json()['session_token']}"
        r2 = s.get(f"{API}/hydration/today", timeout=15)
        assert r2.status_code == 200, r2.text
        assert r2.json()["goal"] == 4, r2.json()
        # PUT goal=5 ok
        r3 = s.put(f"{API}/hydration/goal", json={"goal": 5}, timeout=15)
        assert r3.status_code == 200, r3.text
        # PUT goal=1 → 400
        r4 = s.put(f"{API}/hydration/goal", json={"goal": 1}, timeout=15)
        assert r4.status_code == 400, r4.text

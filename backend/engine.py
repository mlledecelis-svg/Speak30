"""Moteur de génération des menus, règles professionnelles, courses et actions repas."""
import random
import re
import unicodedata
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple

from foods import FOODS, EQUIVALENCES, CATEGORIES, DEFAULT_PROGRAM, SECTION_ORDER
from recipes import MAIN_BLUEPRINTS, BREAKFAST_BLUEPRINTS, SAVORY_BF, IMG, build_main_steps, build_breakfast_steps, build_snack_steps

MEAL_ORDER = ["breakfast", "lunch", "snack", "dinner"]
MEAL_LABELS = {"breakfast": "Petit-déjeuner", "lunch": "Déjeuner", "snack": "Collation", "dinner": "Dîner"}
DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
DIFF_LABEL = {"easy": "Facile", "intermediate": "Un peu plus élaborée", "elaborate": "Créative"}
DIFF_EXTRA = {"easy": 0, "intermediate": 10, "elaborate": 20}
MOODS = {"fresh": "Envie de frais", "comfort": "Envie de réconfort", "quick": "Envie de rapide", "veg": "Envie de végétarien"}


def _strip(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn").strip()


def resolve_tag(spec, cat: str) -> List[str]:
    if spec is None:
        return [f for f, d in FOODS.items() if d["cat"] == cat]
    if isinstance(spec, str) and spec.startswith("tag:"):
        tag = spec[4:]
        return [f for f, d in FOODS.items() if d["cat"] == cat and tag in d["tags"]]
    return list(spec)


def match_food_id(name: str) -> Optional[str]:
    n = _strip(name)
    if not n:
        return None
    best = None
    for fid, d in FOODS.items():
        fn = _strip(d["name"])
        if fn == n or _strip(fid.replace("_", " ")) == n:
            return fid
        if n in fn or fn in n or n.rstrip("s") == fn.rstrip("s"):
            if best is None or len(fn) < len(_strip(FOODS[best]["name"])):
                best = fid
    return best


def excluded_food_ids(exclusions: List[str]) -> set:
    out = set()
    for ex in exclusions or []:
        e = _strip(ex)
        if not e:
            continue
        for fid, d in FOODS.items():
            fn = _strip(d["name"])
            if e in fn or fn in e or e in _strip(fid.replace("_", " ")) or e.rstrip("s") == fn.rstrip("s"):
                out.add(fid)
        # familles
        fam = {"poisson": ["fish"], "viande": ["meat"], "viande rouge": ["red_meat"], "crustace": ["shellfish"], "fruits de mer": ["shellfish", "shell"], "oeuf": ["egg"], "charcuterie": ["deli"], "legumineuse": ["legume"], "soja": ["plant"]}
        for k, tags in fam.items():
            if k in e or e in k:
                out.update(f for f, d in FOODS.items() if any(t in d["tags"] for t in tags))
    return out


def normalize_program(p: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    base = {k: v for k, v in DEFAULT_PROGRAM.items()}
    if not p:
        return base
    out = dict(base)
    for k in ("breakfast", "lunch", "snack", "dinner", "rules"):
        if isinstance(p.get(k), dict):
            merged = dict(base[k])
            merged.update(p[k])
            out[k] = merged
    out["duration_weeks"] = int(p.get("duration_weeks", base["duration_weeks"]))
    return out


# ---------------------------------------------------------------------------
# Choix des aliments
# ---------------------------------------------------------------------------
class Ctx:
    def __init__(self, program: Dict[str, Any], pantry: List[Dict[str, Any]], prefs: Dict[str, Any], seed: int):
        self.program = program
        self.rules = program["rules"]
        self.rng = random.Random(seed)
        self.excluded = excluded_food_ids(self.rules.get("exclusions", []))
        self.pantry: Dict[str, bool] = {}
        for it in pantry or []:
            fid = match_food_id(it.get("name", ""))
            if fid:
                self.pantry[fid] = bool(it.get("priority"))
        self.pantry_priority = bool(self.rules.get("pantry_priority", True))
        self.grouping = self.rules.get("pantry_grouping", "separate")
        self.avoid_bps = set(prefs.get("avoid", []))
        self.fav_bps = set(prefs.get("favorites", []))
        self.month = datetime.now(timezone.utc).month

    def food_ok(self, fid: str) -> bool:
        return fid in FOODS and fid not in self.excluded

    def pick(self, candidates: List[str], used: set = None, weight_pantry=True, forbidden: set = None) -> Optional[str]:
        cands = [c for c in candidates if self.food_ok(c) and (not forbidden or c not in forbidden)]
        if not cands:
            return None
        fresh = [c for c in cands if not used or c not in used]
        pool = fresh or cands
        if weight_pantry and self.pantry_priority and self.pantry:
            urgent = [c for c in pool if self.pantry.get(c) is True]
            home = [c for c in pool if c in self.pantry]
            r = self.rng.random()
            if urgent and r < 0.75:
                return self.rng.choice(urgent)
            if home and r < 0.6:
                return self.rng.choice(home)
        # saisonnalité des fruits
        seasonal = [c for c in pool if FOODS[c].get("months") and self.month in FOODS[c]["months"]]
        non_season = [c for c in pool if FOODS[c].get("months") and self.month not in FOODS[c]["months"]]
        if non_season and self.rng.random() < 0.85:
            pool = [c for c in pool if c not in non_season] or pool
        if seasonal and self.rng.random() < 0.5:
            return self.rng.choice(seasonal)
        return self.rng.choice(pool)


def line_eq_for_food(ln: Dict[str, Any], fid: str) -> Optional[str]:
    for eid in ln.get("options", [ln["ref"]]):
        if fid in EQUIVALENCES.get(eid, {}).get("foods", []):
            return eid
    return None


def line_candidates(ln: Dict[str, Any]) -> List[str]:
    out: List[str] = []
    for eid in ln.get("options", [ln["ref"]]):
        out.extend(EQUIVALENCES.get(eid, {}).get("foods", []))
    return list(dict.fromkeys(out))


def convert_grams(ln: Dict[str, Any], eid: str) -> float:
    ref = EQUIVALENCES.get(ln["ref"], {}).get("portion", 100)
    tgt = EQUIVALENCES.get(eid, {}).get("portion", 100)
    g = float(ln["grams"]) * tgt / ref
    return float(round(g / 5) * 5) if g >= 20 else float(round(g))


def component(ln: Dict[str, Any], fid: str) -> Dict[str, Any]:
    eid = line_eq_for_food(ln, fid) or ln["ref"]
    g = convert_grams(ln, eid)
    return {"category": ln["category"], "category_label": CATEGORIES[ln["category"]], "food_id": fid, "food_name": FOODS[fid]["name"], "grams": g, "unit": "g", "eq": eid}


def active_lines(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [ln for ln in items if float(ln.get("grams", 0)) > 0]


def recipe_name(bp: Dict[str, Any], comp: Dict[str, Dict[str, Any]]) -> str:
    name = bp["label"]
    if "{" in name:
        name = name.replace("{protein}", comp["protein"]["food_name"].lower() if comp.get("protein") else "protéine")
        name = name.replace("{veg}", comp["vegetables"]["food_name"].lower() if comp.get("vegetables") else "légumes")
        name = name.replace("{starch}", comp["starch"]["food_name"].lower() if comp.get("starch") else "féculent")
        name = name[0].upper() + name[1:]
    return name


def make_recipe(bp: Dict[str, Any], comp: Dict[str, Dict[str, Any]], steps: List[str], difficulty: str, mode: Optional[str] = None) -> Dict[str, Any]:
    minutes = bp["minutes"] + DIFF_EXTRA[difficulty]
    return {
        "blueprint_id": bp["id"], "name": recipe_name(bp, comp), "method": bp["method"], "image": IMG.get(bp["image"], IMG["bowl"]),
        "steps": steps, "minutes": minutes, "difficulty": difficulty, "difficulty_label": DIFF_LABEL[difficulty],
        "extras": ["eau", "sel", "poivre"] + list(bp["extras"]), "quick": bool(bp["quick"]) or minutes <= 15, "moods": bp["moods"], "mode": mode,
    }


def finalize_meal(recipe: Dict[str, Any], comps: List[Dict[str, Any]], ctx: Ctx) -> Dict[str, Any]:
    pantry_used = [c["food_name"] for c in comps if c["food_id"] in ctx.pantry]
    return {"recipe": recipe, "components": comps, "pantry_used": pantry_used, "done": False, "favorite": False, "rating": None}


# ---------------------------------------------------------------------------
# Repas principaux
# ---------------------------------------------------------------------------
def eligible_main_blueprints(lines: List[Dict[str, Any]], ctx: Ctx, avoid_bp: set, mood: Optional[str], quick_only: bool, day_proteins: set = frozenset()) -> List[Dict[str, Any]]:
    cats = {ln["category"] for ln in lines}
    by_cat = {ln["category"]: ln for ln in lines}
    out = []
    for bp in MAIN_BLUEPRINTS:
        if bp["id"] in avoid_bp or bp["id"] in ctx.avoid_bps:
            continue
        if quick_only and not bp["quick"]:
            continue
        if mood and mood not in bp["moods"]:
            continue
        if not set(bp["requires"]).issubset(cats):
            continue
        ok = True
        for cat, key in (("protein", "proteins"), ("vegetables", "vegetables"), ("starch", "starches")):
            if cat not in cats or cat not in bp["requires"]:
                continue
            allowed = set(resolve_tag(bp[key], cat)) & set(line_candidates(by_cat[cat]))
            if cat == "protein":
                allowed -= set(day_proteins)
            if not any(ctx.food_ok(f) for f in allowed):
                ok = False
                break
        if ok:
            out.append(bp)
    return out


def pantry_score(bp: Dict[str, Any], ctx: Ctx) -> int:
    if not ctx.pantry or not ctx.pantry_priority:
        return 0
    s = 0
    for cat, key in (("protein", "proteins"), ("vegetables", "vegetables"), ("starch", "starches")):
        for f in resolve_tag(bp[key], cat):
            if f in ctx.pantry:
                s += 2 if ctx.pantry[f] else 1
                break
    return s


def build_main_meal(meal_key: str, ctx: Ctx, difficulty: str, day_state: Dict[str, Any], week_state: Dict[str, Any], avoid_bp: set = frozenset(), mood: Optional[str] = None, quick_only: bool = False) -> Optional[Dict[str, Any]]:
    cfg = ctx.program[meal_key]
    lines = active_lines(cfg["items"])
    if not lines:
        return None
    # règle fruits max / jour
    fruit_lines = [ln for ln in lines if ln["category"] == "fruit"]
    if fruit_lines and day_state["fruits"] >= int(ctx.rules.get("max_fruits_per_day", 4)):
        lines = [ln for ln in lines if ln["category"] != "fruit"]
    by_cat = {ln["category"]: ln for ln in lines}
    dp = day_state["proteins"]
    bps = eligible_main_blueprints(lines, ctx, avoid_bp | week_state["bps"], mood, quick_only, dp)
    if not bps:
        bps = eligible_main_blueprints(lines, ctx, avoid_bp, mood, quick_only, dp)
    if not bps:
        bps = eligible_main_blueprints(lines, ctx, set(), None, False, dp)
    if not bps:
        bps = eligible_main_blueprints(lines, ctx, set(), None, False)
    if not bps:
        return None
    weights = []
    for bp in bps:
        w = 1.0 + pantry_score(bp, ctx) * 1.5
        if bp["id"] in ctx.fav_bps:
            w += 1.5
        if bp["method"] in day_state["methods"]:
            w *= 0.3
        if bp["adaptive"]:
            w *= 0.8
        weights.append(w)
    bp = ctx.rng.choices(bps, weights=weights, k=1)[0]
    comp: Dict[str, Dict[str, Any]] = {}
    comps: List[Dict[str, Any]] = []
    for ln in lines:
        cat = ln["category"]
        cands = line_candidates(ln)
        if cat == "protein":
            allowed = [f for f in resolve_tag(bp["proteins"], cat) if f in cands] if "protein" in bp["requires"] else cands
            fid = ctx.pick(allowed, week_state["protein_heavy"], forbidden=day_state["proteins"]) or ctx.pick(allowed, week_state["protein_heavy"])
        elif cat == "vegetables":
            allowed = [f for f in resolve_tag(bp["vegetables"], cat) if f in cands] if "vegetables" in bp["requires"] else cands
            fid = ctx.pick(allowed, day_state["vegs"])
        elif cat == "starch":
            allowed = [f for f in resolve_tag(bp["starches"], cat) if f in cands] if "starch" in bp["requires"] else cands
            fid = ctx.pick(allowed, day_state["starches"])
        elif cat == "dairy":
            allowed = list(cands)
            cheese_ok = day_state["cheese"] < int(ctx.rules.get("max_cheese_per_day", 1)) and week_state["cheese"] < int(ctx.rules.get("max_cheese_per_week", 2))
            if not cheese_ok:
                allowed = [f for f in allowed if f != "fromage"]
            if bp["method"] == "creamy_pasta" and "creme_15" in allowed and ctx.rng.random() < 0.6:
                fid = "creme_15"
            else:
                allowed = [f for f in allowed if f != "creme_15" or bp["method"] in ("gratin", "creamy_pasta", "risotto")]
                fid = ctx.pick(allowed or cands, weight_pantry=False)
        elif cat == "fruit" and bp.get("fruits"):
            fid = ctx.pick([f for f in bp["fruits"] if f in cands] or cands)
        else:
            fid = ctx.pick(cands)
        if not fid:
            continue
        c = component(ln, fid)
        comp[cat] = c
        comps.append(c)
    if "protein" in bp["requires"] and "protein" not in comp:
        return None
    steps = build_main_steps(bp, comp)
    recipe = make_recipe(bp, comp, steps, difficulty)
    return finalize_meal(recipe, comps, ctx)


def register_meal(meal: Dict[str, Any], day_state: Dict[str, Any], week_state: Dict[str, Any]):
    for c in meal["components"]:
        if c["category"] == "protein":
            day_state["proteins"].add(c["food_id"])
            week_state["protein_count"][c["food_id"]] = week_state["protein_count"].get(c["food_id"], 0) + 1
            if week_state["protein_count"][c["food_id"]] >= 2:
                week_state["protein_heavy"].add(c["food_id"])
        elif c["category"] == "vegetables":
            day_state["vegs"].add(c["food_id"])
        elif c["category"] == "starch":
            day_state["starches"].add(c["food_id"])
        elif c["category"] == "fruit":
            day_state["fruits"] += 1
        elif c["category"] == "dairy" and c["food_id"] == "fromage":
            day_state["cheese"] += 1
            week_state["cheese"] += 1
    day_state["methods"].add(meal["recipe"]["method"])
    week_state["bps"].add(meal["recipe"]["blueprint_id"])


# ---------------------------------------------------------------------------
# Petit-déjeuner & collation
# ---------------------------------------------------------------------------
def build_breakfast(ctx: Ctx, day_state: Dict[str, Any], week_state: Dict[str, Any], avoid_bp: set = frozenset(), quick_only: bool = False, force_mode: Optional[str] = None) -> Optional[Dict[str, Any]]:
    cfg = ctx.program["breakfast"]
    variant = force_mode or cfg.get("variant", "both")
    if variant == "both":
        mode = "savory" if (week_state["bf_savory"] < 3 and ctx.rng.random() < 0.45) else "sweet"
    else:
        mode = variant
    if mode == "savory":
        template = "savory"
    else:
        template = "sweet_cereal" if ctx.rng.random() < 0.55 else "sweet_bread"
    lines = active_lines(cfg.get(template, []))
    if not lines:
        for alt in ("sweet_cereal", "sweet_bread", "savory"):
            lines = active_lines(cfg.get(alt, []))
            if lines:
                template = alt
                mode = "savory" if alt == "savory" else "sweet"
                break
    if not lines:
        return None
    if mode == "savory":
        week_state["bf_savory"] += 1
    comp: Dict[str, Dict[str, Any]] = {}
    comps: List[Dict[str, Any]] = []
    sweet_count = 0
    for ln in lines:
        cands = line_candidates(ln)
        if ln["category"] == "sweet":
            if sweet_count >= int(ctx.rules.get("max_sweet_morning", 1)):
                continue
            sweet_count += 1
        if ln["category"] == "fruit":
            # 75 % aliment de référence, sinon équivalent
            ref_foods = EQUIVALENCES[ln["ref"]]["foods"]
            cands = ref_foods if ctx.rng.random() < 0.75 else cands
        if ln["category"] in ("starch", "dairy", "protein") and ctx.rng.random() < 0.7:
            cands = [f for f in EQUIVALENCES[ln["ref"]]["foods"] if f in cands] or cands
        fid = ctx.pick(cands, day_state["bf_used"])
        if not fid:
            continue
        c = component(ln, fid)
        comp[ln["category"]] = c
        comps.append(c)
    if not comps:
        return None
    cats = set(comp.keys())
    bps = []
    for bp in BREAKFAST_BLUEPRINTS:
        if bp["id"] in avoid_bp or bp["id"] in ctx.avoid_bps:
            continue
        if (bp["id"] in SAVORY_BF) != (mode == "savory"):
            continue
        if quick_only and not bp["quick"]:
            continue
        if not set(bp["requires"]).issubset(cats):
            continue
        if bp.get("starches") and comp.get("starch") and comp["starch"]["food_id"] not in bp["starches"]:
            continue
        if bp.get("dairies") and comp.get("dairy") and comp["dairy"]["food_id"] not in bp["dairies"]:
            continue
        if bp["method"] in ("toast", "savory_toast") and not comp.get("starch"):
            continue
        bps.append(bp)
    if not bps:
        bps = [b for b in BREAKFAST_BLUEPRINTS if (b["id"] in SAVORY_BF) == (mode == "savory") and not b.get("starches")] or BREAKFAST_BLUEPRINTS[:1]
    fresh = [b for b in bps if b["id"] not in week_state["bps"]]
    bp = ctx.rng.choice(fresh or bps)
    steps = build_breakfast_steps(bp, comp)
    recipe = make_recipe(bp, comp, steps, "easy", mode)
    recipe["name"] = ("Petit-déjeuner salé — " if mode == "savory" else "Petit-déjeuner sucré — ") + recipe["name"]
    meal = finalize_meal(recipe, comps, ctx)
    meal["template"] = template
    for c in comps:
        day_state["bf_used"].add(c["food_id"])
        if c["category"] == "fruit":
            day_state["fruits"] += 1
        if c["food_id"] == "fromage":
            day_state["cheese"] += 1
            week_state["cheese"] += 1
    week_state["bps"].add(bp["id"])
    return meal


def build_snack(ctx: Ctx, day_state: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    lines = active_lines(ctx.program["snack"]["items"])
    if not lines:
        return None
    comp: Dict[str, Dict[str, Any]] = {}
    comps = []
    for ln in lines:
        if ln["category"] == "fruit" and day_state["fruits"] >= int(ctx.rules.get("max_fruits_per_day", 4)):
            continue
        fid = ctx.pick(line_candidates(ln))
        if not fid:
            continue
        c = component(ln, fid)
        comp[ln["category"]] = c
        comps.append(c)
        if ln["category"] == "fruit":
            day_state["fruits"] += 1
    if not comps:
        return None
    names = " & ".join(c["food_name"].lower() for c in comps)
    recipe = {"blueprint_id": "snack", "name": f"Collation — {names[0].upper() + names[1:]}", "method": "snack", "image": IMG["snack"], "steps": build_snack_steps(comp), "minutes": 5,
              "difficulty": "easy", "difficulty_label": "Facile", "extras": [], "quick": True, "moods": ["quick"], "mode": None}
    return finalize_meal(recipe, comps, ctx)


# ---------------------------------------------------------------------------
# Plan complet
# ---------------------------------------------------------------------------
def new_day_state() -> Dict[str, Any]:
    return {"proteins": set(), "vegs": set(), "starches": set(), "fruits": 0, "cheese": 0, "methods": set(), "bf_used": set()}


def new_week_state() -> Dict[str, Any]:
    return {"bps": set(), "protein_count": {}, "protein_heavy": set(), "cheese": 0, "bf_savory": 0}


def difficulty_schedule(n: int, rng: random.Random) -> List[str]:
    easy = round(n * 0.6)
    inter = round(n * 0.3)
    sched = ["easy"] * easy + ["intermediate"] * inter + ["elaborate"] * max(0, n - easy - inter)
    rng.shuffle(sched)
    return sched


def generate_plan(program: Dict[str, Any], pantry: List[Dict[str, Any]], prefs: Dict[str, Any], seed: int) -> List[Dict[str, Any]]:
    program = normalize_program(program)
    ctx = Ctx(program, pantry, prefs, seed)
    weeks = []
    for w in range(int(program["duration_weeks"])):
        ws = new_week_state()
        main_count = sum(1 for m in ("lunch", "dinner") if program[m]["active"]) * 7
        sched = difficulty_schedule(main_count, ctx.rng)
        si = 0
        days = []
        for d in range(7):
            ds = new_day_state()
            meals: Dict[str, Any] = {}
            if program["breakfast"]["active"]:
                m = build_breakfast(ctx, ds, ws)
                if m:
                    meals["breakfast"] = m
            for key in ("lunch", "dinner"):
                if not program[key]["active"]:
                    continue
                diff = sched[si] if si < len(sched) else "easy"
                si += 1
                m = build_main_meal(key, ctx, diff, ds, ws)
                if m:
                    meals[key] = m
                    register_meal(m, ds, ws)
            if program["snack"]["active"]:
                m = build_snack(ctx, ds)
                if m:
                    meals["snack"] = m
            days.append({"day": DAYS[d], "meals": meals})
        # Recette de la semaine : repas principal le plus "livre" (non adaptatif) — déterministe
        featured = None
        for di, day in enumerate(days):
            for key in ("lunch", "dinner"):
                m = day["meals"].get(key)
                if m and m["recipe"]["difficulty"] != "easy":
                    featured = {"day": di, "meal": key}
                    break
            if featured:
                break
        weeks.append({"week": w + 1, "days": days, "featured": featured})
    return weeks


# ---------------------------------------------------------------------------
# Liste de courses
# ---------------------------------------------------------------------------
def shopping_for_week(week: Dict[str, Any], pantry: List[Dict[str, Any]], checked: List[str], week_index: int) -> Dict[str, Any]:
    pantry_ids = {match_food_id(it.get("name", "")) for it in pantry or []}
    pantry_ids.discard(None)
    agg: Dict[str, Dict[str, Any]] = {}
    for day in week["days"]:
        for meal in day["meals"].values():
            for c in meal["components"]:
                if c["grams"] <= 0:
                    continue
                f = FOODS.get(c["food_id"])
                if not f:
                    continue
                it = agg.setdefault(c["food_id"], {"food_id": c["food_id"], "name": f["name"], "section": f["section"], "cooked": 0.0, "raw": 0.0, "unit_label": f["unit_label"], "unit_g": f["unit_g"]})
                it["cooked"] += c["grams"]
                it["raw"] += c["grams"] * f["raw"]
    items = []
    home = []
    for it in agg.values():
        raw = int(round(it["raw"] / 5.0) * 5) if it["raw"] >= 20 else int(round(it["raw"]))
        entry = {
            "key": f"{week_index}-{it['food_id']}", "food_id": it["food_id"], "name": it["name"], "section": it["section"],
            "raw_grams": raw, "cooked_grams": int(round(it["cooked"])), "has_conversion": abs(it["raw"] - it["cooked"]) >= 1,
            "units": (max(1, -(-int(it["raw"]) // it["unit_g"])) if it["unit_g"] else None), "unit_label": it["unit_label"],
        }
        if it["food_id"] in pantry_ids:
            home.append(entry)
        else:
            entry["checked"] = entry["key"] in checked
            items.append(entry)
    sections = []
    for sec in SECTION_ORDER:
        sec_items = sorted([i for i in items if i["section"] == sec], key=lambda x: _strip(x["name"]))
        if sec_items:
            sections.append({"name": sec, "items": sec_items})
    total = len(items)
    done = sum(1 for i in items if i["checked"])
    return {"week": week_index, "total": total, "checked": done, "progress": (round(done * 100 / total) if total else 0), "sections": sections, "home": sorted(home, key=lambda x: _strip(x["name"]))}


# ---------------------------------------------------------------------------
# Actions sur un repas
# ---------------------------------------------------------------------------
def day_state_from(day: Dict[str, Any], exclude_key: str) -> Dict[str, Any]:
    ds = new_day_state()
    for k, m in day["meals"].items():
        if k == exclude_key:
            continue
        for c in m["components"]:
            if c["category"] == "protein":
                ds["proteins"].add(c["food_id"])
            elif c["category"] == "vegetables":
                ds["vegs"].add(c["food_id"])
            elif c["category"] == "starch":
                ds["starches"].add(c["food_id"])
            elif c["category"] == "fruit":
                ds["fruits"] += 1
            elif c["food_id"] == "fromage":
                ds["cheese"] += 1
        ds["methods"].add(m["recipe"]["method"])
    return ds


def week_state_from(week: Dict[str, Any], exclude: Tuple[int, str]) -> Dict[str, Any]:
    ws = new_week_state()
    for di, day in enumerate(week["days"]):
        for k, m in day["meals"].items():
            if (di, k) == exclude:
                continue
            ws["bps"].add(m["recipe"]["blueprint_id"])
            if m["recipe"].get("mode") == "savory":
                ws["bf_savory"] += 1
            for c in m["components"]:
                if c["category"] == "protein":
                    ws["protein_count"][c["food_id"]] = ws["protein_count"].get(c["food_id"], 0) + 1
                if c["food_id"] == "fromage":
                    ws["cheese"] += 1
    ws["protein_heavy"] = {f for f, n in ws["protein_count"].items() if n >= 2}
    return ws


def replace_meal(program: Dict[str, Any], week: Dict[str, Any], day_index: int, meal_key: str, pantry, prefs, seed: int, mood: Optional[str] = None, quick_only: bool = False) -> Optional[Dict[str, Any]]:
    program = normalize_program(program)
    day = week["days"][day_index]
    current = day["meals"].get(meal_key)
    ds = day_state_from(day, meal_key)
    ws = week_state_from(week, (day_index, meal_key))
    avoid = {current["recipe"]["blueprint_id"]} if current else set()
    for attempt in range(40):
        ctx = Ctx(program, pantry, prefs, seed + attempt * 7919)
        if meal_key == "breakfast":
            m = build_breakfast(ctx, dict(ds, bf_used=set()), dict(ws), avoid, quick_only, force_mode=(current["recipe"].get("mode") if current else None))
        elif meal_key == "snack":
            m = build_snack(ctx, dict(ds))
        else:
            diff = current["recipe"]["difficulty"] if current and not quick_only else "easy"
            m = build_main_meal(meal_key, ctx, diff, {**ds, "proteins": set(ds["proteins"]), "methods": set(ds["methods"])}, {**ws, "bps": set(ws["bps"])}, avoid, mood, quick_only)
        if not m:
            continue
        if current and m["recipe"]["name"] == current["recipe"]["name"] and attempt < 30:
            continue
        if quick_only and not m["recipe"]["quick"]:
            continue
        return m
    return None


def replace_component(meal: Dict[str, Any], index: int, program: Dict[str, Any], pantry, prefs, seed: int) -> bool:
    if index < 0 or index >= len(meal["components"]):
        return False
    c = meal["components"][index]
    ctx = Ctx(normalize_program(program), pantry, prefs, seed)
    bp = next((b for b in MAIN_BLUEPRINTS + BREAKFAST_BLUEPRINTS if b["id"] == meal["recipe"]["blueprint_id"]), None)
    eid = c.get("eq") or ""
    cands = list(EQUIVALENCES.get(eid, {}).get("foods", []))
    if bp and c["category"] in ("protein", "vegetables", "starch"):
        key = {"protein": "proteins", "vegetables": "vegetables", "starch": "starches"}[c["category"]]
        if bp.get(key) is not None:
            allowed = set(resolve_tag(bp[key], c["category"]))
            cands = [f for f in cands if f in allowed] or cands
    cands = [f for f in cands if f != c["food_id"] and ctx.food_ok(f)]
    if not cands:
        return False
    fid = ctx.rng.choice(cands)
    c["food_id"] = fid
    c["food_name"] = FOODS[fid]["name"]
    comp = {x["category"]: x for x in meal["components"]}
    if bp:
        meal["recipe"]["name"] = (("Petit-déjeuner salé — " if meal["recipe"].get("mode") == "savory" else "Petit-déjeuner sucré — ") if meal["recipe"].get("mode") else "") + recipe_name(bp, comp)
        meal["recipe"]["steps"] = build_breakfast_steps(bp, comp) if bp in BREAKFAST_BLUEPRINTS else build_main_steps(bp, comp)
    else:
        meal["recipe"]["steps"] = build_snack_steps(comp)
        names = " & ".join(x["food_name"].lower() for x in meal["components"])
        meal["recipe"]["name"] = f"Collation — {names[0].upper() + names[1:]}"
    meal["pantry_used"] = [x["food_name"] for x in meal["components"] if x["food_id"] in ctx.pantry]
    return True


def meal_signature(meal: Dict[str, Any]) -> List[str]:
    return sorted(c["category"] for c in meal["components"])


def can_swap(program: Dict[str, Any]) -> bool:
    p = normalize_program(program)
    if not p["rules"].get("allow_lunch_dinner_swap", True) or not (p["lunch"]["active"] and p["dinner"]["active"]):
        return False
    sig = lambda items: sorted((ln["category"], float(ln["grams"])) for ln in active_lines(items))
    return sig(p["lunch"]["items"]) == sig(p["dinner"]["items"])


def swap_day(day: Dict[str, Any]) -> bool:
    l, d = day["meals"].get("lunch"), day["meals"].get("dinner")
    if not l or not d or meal_signature(l) != meal_signature(d):
        return False
    day["meals"]["lunch"], day["meals"]["dinner"] = d, l
    return True


# ---------------------------------------------------------------------------
# Analyse d'un texte de planning collé
# ---------------------------------------------------------------------------
def parse_program_text(text: str, program: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
    program = normalize_program(program)
    norm = text.replace("\r", " ")
    labels = [("breakfast", r"petit[\s-]*d[ée]jeuner"), ("lunch", r"\bd[ée]jeuner\b"), ("snack", r"collation|go[ûu]ter"), ("dinner", r"d[iî]ner")]
    found = []
    for key, rx in labels:
        m = re.search(rx, norm, re.I)
        if m:
            found.append((key, m.start()))
    found.sort(key=lambda x: x[1])
    sections = {}
    for i, (key, start) in enumerate(found):
        end = found[i + 1][1] if i + 1 < len(found) else len(norm)
        sections[key] = norm[start:end]
    if not sections:
        sections = {"lunch": norm, "dinner": norm}
    updates = 0
    cat_words = {"starch": r"f[ée]culents?|pain|c[ée]r[ée]ales", "protein": r"prot[ée]ines?|viandes?|poissons?", "vegetables": r"l[ée]gumes?", "fat": r"mati[èe]res? grasses?|huile|beurre", "dairy": r"laitages?|produits? laitiers?|yaourt|fromage", "fruit": r"fruits?", "sweet": r"produits? sucr[ée]s?|confiture|miel", "oleaginous": r"ol[ée]agineux|amandes|noix", "chocolate": r"chocolat"}
    for key, section in sections.items():
        line_sets = [program[key]["items"]] if key != "breakfast" else [program["breakfast"]["savory"], program["breakfast"]["sweet_cereal"], program["breakfast"]["sweet_bread"]]
        for lines in line_sets:
            for ln in lines:
                rx = re.compile(rf"(?:{cat_words[ln['category']]})[^\d]{{0,80}}?(\d+(?:[.,]\d+)?)\s*(g|ml)", re.I)
                m = rx.search(section)
                if m:
                    ln["grams"] = float(m.group(1).replace(",", "."))
                    updates += 1
    return program, updates

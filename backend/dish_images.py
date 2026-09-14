"""Photos de plats générées par IA (Gemini Nano Banana) — une image par recette (et par famille de protéine pour les recettes adaptatives)."""
import os
import re
from typing import Dict, Any, Optional, List, Tuple

from foods import FOODS
from recipes import MAIN_BLUEPRINTS, BREAKFAST_BLUEPRINTS

DISH_DIR = os.path.join(os.path.dirname(__file__), "static", "dishes")
URL_PREFIX = "/api/dishes"

FAMILIES: List[Tuple[str, str, str]] = [
    # (famille, tag, aliment représentatif)
    ("tuna", "tuna", "thon"),
    ("shellfish", "shellfish", "crevettes"),
    ("shell", "shell", "moules"),
    ("fatty_fish", "fatty_fish", "saumon"),
    ("white_fish", "white_fish", "cabillaud"),
    ("egg", "egg", "oeuf"),
    ("deli", "deli", "jambon_blanc"),
    ("plant", "plant", "tofu"),
    ("red_meat", "red_meat", "boeuf_steak_hache5"),
    ("white_meat", "white_meat", "poulet"),
]


def family_of(fid: Optional[str]) -> str:
    if not fid or fid not in FOODS:
        return "none"
    if fid == "thon":
        return "tuna"
    tags = FOODS[fid]["tags"]
    for fam, tag, _ in FAMILIES:
        if tag in tags:
            return fam
    return "other"


def image_key(bp: Dict[str, Any], comp: Dict[str, Dict[str, Any]]) -> str:
    """Clé de l'image : recette fixe -> id ; recette adaptative -> id + famille de la protéine servie."""
    if bp.get("adaptive"):
        p = comp.get("protein")
        return f"{bp['id']}__{family_of(p['food_id'] if p else None)}"
    return bp["id"]


def dish_image_url(bp: Dict[str, Any], comp: Dict[str, Dict[str, Any]]) -> Optional[str]:
    key = image_key(bp, comp)
    return f"{URL_PREFIX}/{key}.jpg" if os.path.exists(os.path.join(DISH_DIR, f"{key}.jpg")) else None


def _name(fid: str) -> str:
    return FOODS[fid]["name"].lower()


def _first(spec, cat: str) -> Optional[str]:
    from engine import resolve_tag
    fl = [f for f in resolve_tag(spec, cat) if f in FOODS]
    return fl[0] if fl else None


def prompt_for(bp: Dict[str, Any], family: Optional[str], breakfast: bool = False) -> str:
    label = bp["label"]
    prot = None
    if family:
        rep = next((r for f, _, r in FAMILIES if f == family), None)
        allowed = [f for f in (__import__("engine").resolve_tag(bp["proteins"], "protein")) if family_of(f) == family]
        prot = allowed[0] if allowed else rep
    else:
        prot = _first(bp.get("proteins"), "protein") if bp.get("proteins") is not None else None
    veg = _first(bp.get("vegetables"), "vegetables") if bp.get("vegetables") is not None else None
    starch = _first(bp.get("starches"), "starch") if bp.get("starches") is not None else None
    if "{" in label:
        label = label.replace("{protein}", _name(prot) if prot else "protéine").replace("{veg}", _name(veg) if veg else "légumes").replace("{starch}", _name(starch) if starch else "féculent")
        label = re.sub(r"\b(de|De) ([aeiouyéèêœ])", lambda m: ("d'" if m.group(1) == "de" else "D'") + m.group(2), label)
        label = label[0].upper() + label[1:]
    foods = [x for x in (prot, veg, starch) if x]
    ingredients = ", ".join(FOODS[f]["name"] for f in foods)
    if breakfast:
        return (f"Photographie culinaire réaliste d'un petit-déjeuner sain : « {label} ». Ingrédients visibles : {ingredients or 'pain complet, fruit frais, laitage'}. "
                "Vue de dessus, assiette dressée sur une table claire, lumière naturelle douce, fond crème clair, style diététique élégant. Aucun texte, aucune personne.")
    return (f"Photographie culinaire réaliste du plat « {label} ». Le plat doit montrer clairement et fidèlement : {ingredients}. "
            "Assiette dressée vue de dessus, portion équilibrée (protéine, légumes, féculent), lumière naturelle douce, fond clair crème, style diététique élégant et appétissant. "
            "Aucun texte, aucune personne, aucun autre aliment que ceux cités.")


def all_jobs() -> List[Tuple[str, str]]:
    """(clé, prompt) pour toutes les images à générer."""
    from engine import resolve_tag
    jobs: List[Tuple[str, str]] = []
    for bp in MAIN_BLUEPRINTS:
        if bp.get("adaptive"):
            fams = sorted({family_of(f) for f in resolve_tag(bp["proteins"], "protein")} - {"none", "other"})
            for fam in fams:
                jobs.append((f"{bp['id']}__{fam}", prompt_for(bp, fam)))
        else:
            jobs.append((bp["id"], prompt_for(bp, None)))
    for bp in BREAKFAST_BLUEPRINTS:
        jobs.append((bp["id"], prompt_for(bp, None, breakfast=True)))
    jobs.append(("snack", "Photographie culinaire réaliste d'une collation saine : un fruit frais, une petite poignée d'amandes et deux carrés de chocolat noir. Vue de dessus, table claire, lumière naturelle, fond crème. Aucun texte."))
    return jobs

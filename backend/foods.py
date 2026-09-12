"""Base d'aliments, équivalences et programme par défaut — Mon plan alimentaire."""
from typing import Dict, List, Any

CATEGORIES = {
    "starch": "Féculents",
    "protein": "Sources de protéines",
    "vegetables": "Légumes",
    "fat": "Matières grasses",
    "dairy": "Laitages",
    "fruit": "Fruits",
    "sweet": "Produits sucrés",
    "oleaginous": "Fruits oléagineux",
    "chocolate": "Chocolat",
}

SEC_FRUITVEG = "Fruits & légumes"
SEC_MEAT = "Boucherie & charcuterie"
SEC_FISH = "Poissonnerie & fruits de mer"
SEC_DAIRY = "Produits laitiers & œufs"
SEC_BAKERY = "Boulangerie & petit-déjeuner"
SEC_GROCERY = "Féculents & épicerie"
SEC_PLANT = "Épicerie & végétal"
SEC_PLEASURE = "Matières grasses & produits plaisir"
SECTION_ORDER = [SEC_FRUITVEG, SEC_MEAT, SEC_FISH, SEC_DAIRY, SEC_BAKERY, SEC_GROCERY, SEC_PLANT, SEC_PLEASURE, "Autres"]

FOODS: Dict[str, Dict[str, Any]] = {}


def F(fid: str, name: str, cat: str, section: str, tags: List[str] = None, raw: float = 1.0, unit_g: int = None, unit_label: str = None):
    FOODS[fid] = {"id": fid, "name": name, "cat": cat, "section": section, "tags": tags or [], "raw": raw, "unit_g": unit_g, "unit_label": unit_label}


# --- Féculents (petit-déjeuner)
F("pain_complet", "Pain complet", "starch", SEC_BAKERY, ["bread"])
F("biscottes", "Biscottes / cracottes", "starch", SEC_BAKERY, ["bread", "crisp"])
F("muffin_anglais", "Muffin anglais complet", "starch", SEC_BAKERY, ["bread"])
F("avoine", "Flocons d'avoine", "starch", SEC_BAKERY, ["cereal"])
F("granola", "Granola / muesli", "starch", SEC_BAKERY, ["cereal"])
# --- Féculents cuits (repas principaux) — raw = facteur cru/cuit pour les courses
F("pates", "Pâtes", "starch", SEC_GROCERY, ["cereal", "pasta"], raw=0.42)
F("gnocchi", "Gnocchis", "starch", SEC_GROCERY, ["cereal"], raw=1.0)
F("riz", "Riz", "starch", SEC_GROCERY, ["cereal", "rice"], raw=0.38)
F("riz_complet", "Riz complet", "starch", SEC_GROCERY, ["cereal", "rice"], raw=0.38)
F("riz_noir", "Riz noir", "starch", SEC_GROCERY, ["cereal", "rice"], raw=0.38)
F("semoule", "Semoule", "starch", SEC_GROCERY, ["cereal"], raw=0.4)
F("boulgour", "Boulgour", "starch", SEC_GROCERY, ["cereal"], raw=0.4)
F("quinoa", "Quinoa", "starch", SEC_GROCERY, ["cereal"], raw=0.38)
F("ble", "Blé", "starch", SEC_GROCERY, ["cereal"], raw=0.4)
F("vermicelles", "Vermicelles / nouilles", "starch", SEC_GROCERY, ["cereal"], raw=0.42)
F("polenta", "Polenta", "starch", SEC_GROCERY, ["cereal"], raw=0.3)
F("lentilles", "Lentilles", "starch", SEC_GROCERY, ["legume"], raw=0.45)
F("lentilles_corail", "Lentilles corail", "starch", SEC_GROCERY, ["legume"], raw=0.45)
F("pois_chiches", "Pois chiches", "starch", SEC_GROCERY, ["legume"], raw=0.5)
F("haricots_rouges", "Haricots rouges", "starch", SEC_GROCERY, ["legume"], raw=0.5)
F("haricots_blancs", "Haricots blancs", "starch", SEC_GROCERY, ["legume"], raw=0.5)
F("flageolets", "Flageolets", "starch", SEC_GROCERY, ["legume"], raw=0.5)
F("petits_pois", "Petits pois", "starch", SEC_FRUITVEG, ["legume"], raw=1.0)
F("pomme_de_terre", "Pommes de terre", "starch", SEC_FRUITVEG, ["tuber"], raw=1.1)
F("patate_douce", "Patate douce", "starch", SEC_FRUITVEG, ["tuber"], raw=1.1)

# --- Protéines
for fid, name in [("poulet", "Filet de poulet"), ("dinde", "Escalope de dinde"), ("pintade", "Filet de pintade"), ("veau", "Escalope de veau"), ("porc_maigre", "Filet de porc maigre")]:
    F(fid, name, "protein", SEC_MEAT, ["white_meat", "meat", "cook"])
for fid, name in [("boeuf", "Rumsteck de bœuf"), ("boeuf_bavette", "Bavette de bœuf"), ("boeuf_steak_hache5", "Steak haché 5 % MG"), ("boeuf_filet", "Filet de bœuf"), ("boeuf_rosbif", "Rosbif")]:
    F(fid, name, "protein", SEC_MEAT, ["red_meat", "meat", "cook"])
for fid, name in [("cabillaud", "Cabillaud"), ("colin", "Colin"), ("merlu", "Merlu"), ("merlan", "Merlan"), ("lieu_noir", "Lieu noir"), ("sole", "Sole"), ("bar", "Bar"), ("dorade", "Dorade"), ("lotte", "Lotte"), ("turbot", "Turbot")]:
    F(fid, name, "protein", SEC_FISH, ["white_fish", "fish", "cook"])
for fid, name in [("saumon", "Saumon"), ("truite", "Truite"), ("maquereau", "Maquereau"), ("sardines", "Sardines"), ("hareng", "Hareng")]:
    F(fid, name, "protein", SEC_FISH, ["fatty_fish", "fish", "cook"])
F("thon", "Thon au naturel", "protein", SEC_GROCERY, ["fish", "quick", "cold"])
for fid, name in [("crevettes", "Crevettes"), ("gambas", "Gambas"), ("saint_jacques", "Noix de Saint-Jacques"), ("crabe", "Crabe")]:
    F(fid, name, "protein", SEC_FISH, ["shellfish", "cook", "quick"])
F("moules", "Moules", "protein", SEC_FISH, ["shell", "cook"])
F("oeuf", "Œufs", "protein", SEC_DAIRY, ["egg", "quick", "cook"], unit_g=50, unit_label="œuf")
F("jambon_blanc", "Jambon blanc", "protein", SEC_MEAT, ["deli", "quick", "cold"])
F("blanc_poulet_tranches", "Blanc de poulet en tranches", "protein", SEC_MEAT, ["deli", "quick", "cold"])
F("blanc_dinde_tranches", "Blanc de dinde en tranches", "protein", SEC_MEAT, ["deli", "quick", "cold"])
F("bacon_maigre", "Bacon maigre", "protein", SEC_MEAT, ["deli", "quick"])
F("tofu", "Tofu nature", "protein", SEC_PLANT, ["plant", "cook", "quick"])
F("tempeh", "Tempeh", "protein", SEC_PLANT, ["plant", "cook"])
F("seitan", "Seitan", "protein", SEC_PLANT, ["plant", "cook"])

# --- Légumes
HOT_VEG = ["courgette", "brocoli", "carotte", "haricot_vert", "poireau", "champignons", "epinard", "aubergine", "poivron", "chou_fleur", "fenouil", "potimarron", "tomate", "ratatouille", "chou_bruxelles", "navet", "asperge", "endive", "blette"]
RAW_VEG = ["salade_verte", "concombre", "tomate", "carotte", "radis", "mache", "roquette", "chou_rouge", "betterave", "celeri", "poivron"]
for fid, name in [("courgette", "Courgettes"), ("brocoli", "Brocolis"), ("carotte", "Carottes"), ("haricot_vert", "Haricots verts"), ("poireau", "Poireaux"), ("champignons", "Champignons"), ("epinard", "Épinards"), ("aubergine", "Aubergines"), ("poivron", "Poivrons"), ("chou_fleur", "Chou-fleur"), ("fenouil", "Fenouil"), ("potimarron", "Potimarron"), ("tomate", "Tomates"), ("ratatouille", "Ratatouille"), ("chou_bruxelles", "Choux de Bruxelles"), ("navet", "Navets"), ("asperge", "Asperges"), ("endive", "Endives"), ("blette", "Blettes"),
                  ("salade_verte", "Salade verte"), ("concombre", "Concombre"), ("radis", "Radis"), ("mache", "Mâche"), ("roquette", "Roquette"), ("chou_rouge", "Chou rouge"), ("betterave", "Betteraves"), ("celeri", "Céleri branche"), ("oignon", "Oignons")]:
    tags = []
    if fid in HOT_VEG:
        tags.append("hot")
    if fid in RAW_VEG:
        tags.append("raw")
    F(fid, name, "vegetables", SEC_FRUITVEG, tags)

# --- Matières grasses
F("huile_olive", "Huile d'olive", "fat", SEC_PLEASURE, [])
F("huile_colza", "Huile de colza", "fat", SEC_PLEASURE, [])
F("beurre", "Beurre", "fat", SEC_DAIRY, [])
F("beurre_cacahuete", "Beurre de cacahuète 100 %", "fat", SEC_PLEASURE, [])

# --- Laitages
F("yaourt_nature", "Yaourt nature", "dairy", SEC_DAIRY, ["fresh"], unit_g=125, unit_label="pot")
F("fromage_blanc", "Fromage blanc", "dairy", SEC_DAIRY, ["fresh"])
F("skyr", "Skyr", "dairy", SEC_DAIRY, ["fresh"])
F("fromage", "Fromage (comté, emmental…)", "dairy", SEC_DAIRY, ["cheese"])
F("fromage_frais", "Fromage frais", "dairy", SEC_DAIRY, ["fresh_cheese"])
F("creme_15", "Crème fraîche 15 %", "dairy", SEC_DAIRY, ["cream"])
F("lait", "Lait demi-écrémé", "dairy", SEC_DAIRY, ["milk"], unit_g=1000, unit_label="litre")
F("lait_vegetal", "Lait végétal", "dairy", SEC_PLANT, ["milk"], unit_g=1000, unit_label="litre")

# --- Fruits (saisons : liste de mois)
FRUITS = [
    ("pomme", "Pomme", 150, "pièce", None), ("poire", "Poire", 160, "pièce", [9, 10, 11, 12, 1, 2]), ("banane", "Banane", 120, "pièce", None),
    ("orange", "Orange", 180, "pièce", [11, 12, 1, 2, 3]), ("kiwi", "Kiwi", 80, "pièce", [11, 12, 1, 2, 3, 4]), ("clementine", "Clémentines", 60, "pièce", [11, 12, 1]),
    ("fraises", "Fraises", None, None, [4, 5, 6]), ("framboises", "Framboises", None, None, [6, 7, 8]), ("myrtilles", "Myrtilles", None, None, [6, 7, 8]),
    ("cerises", "Cerises", None, None, [5, 6]), ("peche", "Pêche", 150, "pièce", [6, 7, 8]), ("abricot", "Abricots", 50, "pièce", [6, 7]), ("melon", "Melon", None, None, [6, 7, 8, 9]),
    ("raisin", "Raisin", None, None, [8, 9, 10]), ("prune", "Prunes", 40, "pièce", [8, 9]), ("mangue", "Mangue", None, None, None), ("ananas", "Ananas", None, None, None),
    ("pamplemousse", "Pamplemousse", 250, "pièce", [12, 1, 2, 3]), ("nectarine", "Nectarine", 150, "pièce", [6, 7, 8]), ("figue", "Figues", 50, "pièce", [8, 9, 10]),
]
for fid, name, ug, ul, months in FRUITS:
    F(fid, name, "fruit", SEC_FRUITVEG, ["fresh"] + (["season"] if months else []), unit_g=ug, unit_label=ul)
    FOODS[fid]["months"] = months
F("compote", "Compote sans sucres ajoutés", "fruit", SEC_GROCERY, ["compote"], unit_g=100, unit_label="pot")
F("fruits_seches", "Fruits séchés", "fruit", SEC_GROCERY, ["dried"])
F("jus_fruits", "Jus 100 % pur jus", "fruit", SEC_GROCERY, ["juice"], unit_g=1000, unit_label="litre")

# --- Sucrés / oléagineux / chocolat
F("miel", "Miel", "sweet", SEC_PLEASURE, [])
F("confiture", "Confiture", "sweet", SEC_PLEASURE, [])
F("pate_tartiner", "Pâte à tartiner chocolat-noisette", "sweet", SEC_PLEASURE, [])
F("amandes", "Amandes", "oleaginous", SEC_PLANT, [])
F("noix", "Noix", "oleaginous", SEC_PLANT, [])
F("noisettes", "Noisettes", "oleaginous", SEC_PLANT, [])
F("noix_cajou", "Noix de cajou", "oleaginous", SEC_PLANT, [])
F("chocolat_noir", "Chocolat noir 70 %", "chocolate", SEC_PLEASURE, [])

# ---------------------------------------------------------------------------
# Équivalences : aliment de référence -> aliments réels + portion (g) pour conversion
# ---------------------------------------------------------------------------
EQUIVALENCES: Dict[str, Dict[str, Any]] = {}


def E(eid: str, label: str, cat: str, foods: List[str], portion: float = 100):
    EQUIVALENCES[eid] = {"id": eid, "label": label, "cat": cat, "foods": foods, "portion": portion}


E("eq_breakfast_bread", "Pain complet / pain autre", "starch", ["pain_complet"], 40)
E("eq_breakfast_crispbread", "Biscottes / cracottes", "starch", ["biscottes"], 30)
E("eq_breakfast_english_muffin", "Muffin anglais complet", "starch", ["muffin_anglais"], 60)
E("eq_breakfast_oats", "Flocons d'avoine", "starch", ["avoine"], 30)
E("eq_breakfast_granola", "Granola / muesli", "starch", ["granola"], 30)
E("eq_breakfast_cheese", "Fromage", "dairy", ["fromage"], 30)
E("eq_dairy_fresh_cheese", "Fromage frais", "dairy", ["fromage_frais"], 35)
E("eq_dairy_yogurt", "Yaourt nature", "dairy", ["yaourt_nature"], 125)
E("eq_dairy_fromage_blanc", "Fromage blanc / Skyr", "dairy", ["fromage_blanc", "skyr"], 100)
E("eq_dairy_milk", "Lait demi-écrémé", "dairy", ["lait"], 150)
E("eq_dairy_plant_milk", "Lait végétal", "dairy", ["lait_vegetal"], 150)
E("eq_main_cheese", "Fromage", "dairy", ["fromage"], 30)
E("eq_main_cream15", "Crème fraîche 15 %", "dairy", ["creme_15"], 30)
E("eq_breakfast_protein_eggs", "Œufs entiers", "protein", ["oeuf"], 100)
E("eq_breakfast_protein_ham", "Jambon blanc", "protein", ["jambon_blanc"], 50)
E("eq_breakfast_protein_chicken", "Blanc de poulet en tranches", "protein", ["blanc_poulet_tranches"], 50)
E("eq_breakfast_protein_turkey", "Blanc de dinde en tranches", "protein", ["blanc_dinde_tranches"], 50)
E("eq_breakfast_protein_bacon", "Bacon maigre", "protein", ["bacon_maigre"], 40)
E("eq_protein_chicken", "Viandes blanches", "protein", ["poulet", "dinde", "pintade", "veau", "porc_maigre"], 100)
E("eq_protein_beef", "Viandes rouges", "protein", ["boeuf", "boeuf_bavette", "boeuf_steak_hache5", "boeuf_filet", "boeuf_rosbif"], 100)
E("eq_protein_white_fish", "Poissons blancs", "protein", ["cabillaud", "colin", "merlu", "merlan", "lieu_noir", "sole", "bar", "dorade", "lotte", "turbot"], 120)
E("eq_protein_fatty_fish", "Poissons gras", "protein", ["saumon", "truite", "maquereau", "sardines", "hareng", "thon"], 100)
E("eq_protein_eggs", "Œufs", "protein", ["oeuf"], 100)
E("eq_protein_shellfish", "Crustacés / coquillages", "protein", ["crevettes", "gambas", "saint_jacques", "moules", "crabe"], 120)
E("eq_protein_deli", "Jambon / volaille en tranches", "protein", ["jambon_blanc", "blanc_poulet_tranches", "blanc_dinde_tranches"], 100)
E("eq_protein_tofu", "Tofu / tempeh / seitan", "protein", ["tofu", "tempeh", "seitan"], 100)
E("eq_vegetables", "Légumes variés", "vegetables", [f for f in FOODS if FOODS[f]["cat"] == "vegetables"], 100)
E("eq_main_pasta", "Pâtes / gnocchis / riz / semoule / boulgour / quinoa", "starch", ["pates", "gnocchi", "riz", "riz_complet", "riz_noir", "semoule", "boulgour", "quinoa", "ble", "vermicelles", "polenta"], 120)
E("eq_main_lentils", "Légumineuses", "starch", ["lentilles", "lentilles_corail", "pois_chiches", "haricots_rouges", "haricots_blancs", "flageolets", "petits_pois"], 120)
E("eq_main_potato", "Pommes de terre / patate douce", "starch", ["pomme_de_terre", "patate_douce"], 150)
E("eq_main_bread", "Pain complet / pain autre", "starch", ["pain_complet"], 50)
E("eq_main_crispbread", "Biscottes / cracottes", "starch", ["biscottes"], 35)
E("eq_main_oil", "Huile", "fat", ["huile_olive", "huile_colza"], 10)
E("eq_main_butter", "Beurre", "fat", ["beurre"], 10)
E("eq_breakfast_butter", "Beurre", "fat", ["beurre"], 10)
E("eq_breakfast_peanut_butter", "Beurre de cacahuète 100 %", "fat", ["beurre_cacahuete"], 15)
E("eq_fruit", "Fruit frais", "fruit", [fid for fid, *_ in FRUITS], 130)
E("eq_fruit_compote", "Compote sans sucres ajoutés", "fruit", ["compote"], 100)
E("eq_fruit_dried", "Fruits séchés", "fruit", ["fruits_seches"], 30)
E("eq_fruit_juice", "Jus 100 % pur jus", "fruit", ["jus_fruits"], 150)
E("eq_sweet_honey", "Miel", "sweet", ["miel"], 10)
E("eq_sweet_jam", "Confiture", "sweet", ["confiture"], 15)
E("eq_sweet_spread", "Pâte à tartiner", "sweet", ["pate_tartiner"], 15)
E("eq_snack_oleaginous", "Fruits oléagineux", "oleaginous", ["amandes", "noix", "noisettes", "noix_cajou"], 12)
E("eq_snack_chocolate", "Chocolat noir 70 %", "chocolate", ["chocolat_noir"], 12)

# Familles d'équivalences interchangeables à la génération (même catégorie, conversion par portion)
MAIN_PROTEIN_EQS = ["eq_protein_chicken", "eq_protein_beef", "eq_protein_white_fish", "eq_protein_fatty_fish", "eq_protein_eggs", "eq_protein_shellfish", "eq_protein_deli", "eq_protein_tofu"]
MAIN_STARCH_EQS = ["eq_main_pasta", "eq_main_lentils", "eq_main_potato", "eq_main_bread", "eq_main_crispbread"]
MAIN_DAIRY_EQS = ["eq_dairy_yogurt", "eq_dairy_fromage_blanc", "eq_main_cheese", "eq_dairy_fresh_cheese", "eq_main_cream15"]
FRUIT_EQS_MAIN = ["eq_fruit", "eq_fruit_compote", "eq_fruit_dried"]
FRUIT_EQS_BREAKFAST = ["eq_fruit", "eq_fruit_compote", "eq_fruit_dried", "eq_fruit_juice"]
BREAKFAST_DAIRY_SWEET_EQS = ["eq_dairy_yogurt", "eq_dairy_fromage_blanc", "eq_dairy_milk", "eq_dairy_plant_milk"]


def line(cat: str, ref: str, options: List[str], grams: float) -> Dict[str, Any]:
    return {"category": cat, "ref": ref, "options": options, "grams": grams}


DEFAULT_PROGRAM: Dict[str, Any] = {
    "breakfast": {
        "active": True,
        "variant": "both",  # both | sweet | savory
        "savory": [
            line("starch", "eq_breakfast_bread", ["eq_breakfast_bread", "eq_breakfast_crispbread", "eq_breakfast_english_muffin"], 40),
            line("dairy", "eq_dairy_fresh_cheese", ["eq_breakfast_cheese", "eq_dairy_fresh_cheese"], 35),
            line("protein", "eq_breakfast_protein_eggs", ["eq_breakfast_protein_eggs", "eq_breakfast_protein_ham", "eq_breakfast_protein_chicken", "eq_breakfast_protein_turkey", "eq_breakfast_protein_bacon"], 100),
            line("fruit", "eq_fruit", FRUIT_EQS_BREAKFAST, 130),
        ],
        "sweet_cereal": [
            line("starch", "eq_breakfast_oats", ["eq_breakfast_oats", "eq_breakfast_granola"], 30),
            line("dairy", "eq_dairy_yogurt", BREAKFAST_DAIRY_SWEET_EQS, 120),
            line("fruit", "eq_fruit", FRUIT_EQS_BREAKFAST, 130),
        ],
        "sweet_bread": [
            line("starch", "eq_breakfast_bread", ["eq_breakfast_bread", "eq_breakfast_crispbread"], 40),
            line("fat", "eq_breakfast_butter", ["eq_breakfast_peanut_butter", "eq_breakfast_butter"], 10),
            line("sweet", "eq_sweet_jam", ["eq_sweet_honey", "eq_sweet_jam", "eq_sweet_spread"], 10),
            line("dairy", "eq_dairy_yogurt", BREAKFAST_DAIRY_SWEET_EQS, 120),
            line("fruit", "eq_fruit", FRUIT_EQS_BREAKFAST, 130),
        ],
    },
    "lunch": {
        "active": True,
        "items": [
            line("protein", "eq_protein_chicken", MAIN_PROTEIN_EQS, 100),
            line("vegetables", "eq_vegetables", ["eq_vegetables"], 120),
            line("starch", "eq_main_pasta", MAIN_STARCH_EQS, 120),
            line("fat", "eq_main_oil", ["eq_main_oil", "eq_main_butter"], 10),
            line("dairy", "eq_dairy_yogurt", MAIN_DAIRY_EQS, 120),
            line("fruit", "eq_fruit", FRUIT_EQS_MAIN, 130),
        ],
    },
    "snack": {
        "active": True,
        "items": [
            line("fruit", "eq_fruit", FRUIT_EQS_MAIN, 130),
            line("oleaginous", "eq_snack_oleaginous", ["eq_snack_oleaginous"], 12),
            line("chocolate", "eq_snack_chocolate", ["eq_snack_chocolate"], 12),
        ],
    },
    "dinner": {
        "active": True,
        "items": [
            line("protein", "eq_protein_white_fish", MAIN_PROTEIN_EQS, 120),
            line("vegetables", "eq_vegetables", ["eq_vegetables"], 120),
            line("starch", "eq_main_pasta", MAIN_STARCH_EQS, 120),
            line("fat", "eq_main_oil", ["eq_main_oil", "eq_main_butter"], 10),
            line("dairy", "eq_dairy_yogurt", MAIN_DAIRY_EQS, 120),
            line("fruit", "eq_fruit", FRUIT_EQS_MAIN, 130),
        ],
    },
    "rules": {
        "max_fruits_per_day": 4,
        "max_cheese_per_day": 1,
        "max_cheese_per_week": 2,
        "max_sweet_morning": 1,
        "no_bread_mix": True,
        "allow_lunch_dinner_swap": True,
        "exclusions": [],
        "pantry_priority": True,
        "pantry_grouping": "separate",  # together | separate
    },
    "duration_weeks": 4,
}


def library_payload() -> Dict[str, Any]:
    return {
        "categories": CATEGORIES,
        "equivalences": {k: {"id": v["id"], "label": v["label"], "cat": v["cat"]} for k, v in EQUIVALENCES.items()},
        "foods": [{"id": f["id"], "name": f["name"], "cat": f["cat"]} for f in FOODS.values()],
        "default_program": DEFAULT_PROGRAM,
    }

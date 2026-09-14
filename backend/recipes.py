"""Recettes types (inspirées du livre professionnel) et génération des étapes."""
from typing import Dict, List, Any, Optional
from foods import FOODS

MAIN_COOK = "tag:cook"
HOT = "tag:hot"
RAW = "tag:raw"
IMG = {
    "pasta": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=900&q=80",
    "bowl": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&q=80",
    "gratin": "https://images.unsplash.com/photo-1619895092538-128341789043?w=900&q=80",
    "curry": "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=900&q=80",
    "wok": "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=900&q=80",
    "salad": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=900&q=80",
    "fish": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=900&q=80",
    "meat": "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=900&q=80",
    "eggs": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=900&q=80",
    "toast": "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=900&q=80",
    "risotto": "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=900&q=80",
    "soup": "https://images.unsplash.com/photo-1547592180-85f173990554?w=900&q=80",
    "porridge": "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=900&q=80",
    "granola": "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=900&q=80",
    "pancakes": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=900&q=80",
    "savory_breakfast": "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=900&q=80",
    "sweet_toast": "https://images.unsplash.com/photo-1540914124281-342587941389?w=900&q=80",
    "snack": "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=900&q=80",
    "smoothie": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=900&q=80",
    "shrimp": "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=900&q=80",
    "salmon": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900&q=80",
    "chicken": "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=900&q=80",
    "tofu": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&q=80",
    "chakchouka": "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=900&q=80",
    # --- Photos spécifiques (aliment réellement servi × technique)
    "white_fish": "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=900&q=80",
    "white_fish_grill": "https://images.unsplash.com/photo-1603073163308-9654c3fb70b5?w=900&q=80",
    "white_fish_skillet": "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=900&q=80",
    "salmon_plate": "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=900&q=80",
    "salmon_grill": "https://images.unsplash.com/photo-1560717845-968823efbee1?w=900&q=80",
    "shrimp_curry": "https://images.unsplash.com/photo-1559847844-5315695dadae?w=900&q=80",
    "shrimp_pasta": "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=900&q=80",
    "shrimp_salad": "https://images.unsplash.com/photo-1551248429-40975aa4de74?w=900&q=80",
    "beef_steak": "https://images.unsplash.com/photo-1432139509613-5c4255815697?w=900&q=80",
    "beef_sliced": "https://images.unsplash.com/photo-1558030006-450675393462?w=900&q=80",
    "beef_pasta": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=900&q=80",
    "roast_poultry": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=900&q=80",
    "skewers": "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=900&q=80",
    "tuna_salad": "https://images.unsplash.com/photo-1604909052743-94e838986d24?w=900&q=80",
    "composed_salad": "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=900&q=80",
    "eggs_baked": "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=900&q=80",
    "soup_tomato": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=900&q=80",
    "soup_pumpkin": "https://images.unsplash.com/photo-1604152135912-04a022e23696?w=900&q=80",
    "soup_green": "https://images.unsplash.com/photo-1594756202469-9ff9799b2e4e?w=900&q=80",
    "ratatouille": "https://images.unsplash.com/photo-1572453800999-e8d2d1589b7c?w=900&q=80",
    "lasagna": "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=900&q=80",
    "parmentier": "https://images.unsplash.com/photo-1633436375153-d7045cb93e38?w=900&q=80",
    "croque": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=900&q=80",
    "sandwich": "https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=900&q=80",
    "fresh_toast": "https://images.unsplash.com/photo-1540914124281-342587941389?w=900&q=80",
    "fried_rice": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=900&q=80",
    "noodles": "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=900&q=80",
    "stew": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=900&q=80",
    "fish_tomato": "https://images.unsplash.com/photo-1574484284002-952d92456975?w=900&q=80",
    "salmon_bowl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80",
    "seafood_pan": "https://images.unsplash.com/photo-1621841957884-1210fe19d66d?w=900&q=80",
    "curry_rice": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=900&q=80",
}


def B(id, label, method, image, proteins=None, vegetables=None, starches=None, requires=("protein", "vegetables", "starch"), extras=None, minutes=20, quick=False, moods=None, adaptive=False, dairies=None, fruits=None):
    return {"id": id, "label": label, "method": method, "image": image, "proteins": proteins, "vegetables": vegetables, "starches": starches,
            "requires": list(requires), "extras": extras or [], "minutes": minutes, "quick": quick, "moods": moods or [], "adaptive": adaptive, "dairies": dairies, "fruits": fruits}


WHITE_FISH = [f for f, d in FOODS.items() if "white_fish" in d["tags"]]
COLD_PROT = ["thon", "oeuf", "jambon_blanc", "blanc_poulet_tranches", "blanc_dinde_tranches", "crevettes", "saumon", "tofu", "poulet", "dinde"]
COLD_STARCH = ["riz", "riz_complet", "quinoa", "boulgour", "ble", "semoule", "lentilles", "pois_chiches", "haricots_rouges", "pomme_de_terre", "patate_douce", "pain_complet", "pates"]
FRESH_VEG = ["salade_verte", "tomate", "concombre", "carotte", "radis", "mache", "roquette", "chou_rouge", "betterave", "poivron", "celeri"]
PLANT = ["tofu", "tempeh", "seitan"]

MAIN_BLUEPRINTS: List[Dict[str, Any]] = [
    # --- Recettes signature du livre
    B("dinde_brocoli_riz", "Escalope de dinde grillée, brocolis & riz", "grill", "meat", ["dinde"], ["brocoli"], ["riz", "riz_complet"], extras=["persil"], minutes=20),
    B("cabillaud_patate_douce", "Dos de cabillaud au four & patate douce", "oven", "fish", ["cabillaud"], HOT, ["patate_douce"], extras=["citron", "persil"], minutes=30, moods=["comfort"]),
    B("poulet_fenouil", "Escalope de poulet grillée & fenouil fondant", "grill", "meat", ["poulet"], ["fenouil"], None, requires=("protein", "vegetables"), extras=["curry"], minutes=20),
    B("crevettes_curry_boulgour", "Crevettes au curry, champignons & boulgour", "curry", "curry", ["crevettes", "gambas"], ["champignons", "courgette", "poireau"], ["boulgour", "riz", "quinoa"], extras=["curry", "lait de coco léger"], minutes=20, moods=["comfort"]),
    B("poulet_asie_nouilles", "Poulet asiatique aux légumes & nouilles", "wok", "wok", ["poulet", "dinde"], ["poivron", "carotte", "brocoli", "champignons", "courgette"], ["vermicelles", "pates"], extras=["gingembre", "sauce soja réduite en sel"], minutes=18, quick=True),
    B("steak_tomates_pates", "Steak haché aux tomates fondantes & pâtes", "tomato_pasta", "pasta", ["boeuf_steak_hache5"], ["tomate"], ["pates"], extras=["herbes de Provence", "ail"], minutes=20, moods=["comfort"]),
    B("poulet_ananas_riz", "Poulet à l'ananas, haricots verts & riz", "fruit_skillet", "wok", ["poulet"], ["haricot_vert"], ["riz"], extras=["gingembre"], minutes=20, fruits=["ananas"]),
    B("cabillaud_poireaux_semoule", "Cabillaud, fondue de poireaux & semoule", "oven", "fish", ["cabillaud", "colin", "merlu"], ["poireau"], ["semoule"], extras=["citron", "ciboulette"], minutes=25),
    B("saumon_pommes_vapeur", "Saumon au four & pommes de terre vapeur", "oven", "fish", ["saumon", "truite"], HOT, ["pomme_de_terre"], extras=["citron", "aneth"], minutes=30),
    B("oeufs_courge_lentilles", "Œufs, courge rôtie & lentilles corail", "eggs_legume", "eggs", ["oeuf"], ["potimarron"], ["lentilles_corail", "lentilles"], extras=["curry", "coriandre"], minutes=25, moods=["veg", "comfort"]),
    B("pates_aubergines_thon", "Pâtes aux aubergines fondantes & thon", "tomato_pasta", "pasta", ["thon"], ["aubergine"], ["pates"], extras=["origan", "ail"], minutes=20),
    B("risotto_courgettes_crevettes", "Risotto crémeux aux courgettes & crevettes", "risotto", "risotto", ["crevettes", "gambas", "saint_jacques"], ["courgette"], ["riz", "riz_complet"], extras=["ciboulette"], minutes=25, moods=["comfort"]),
    B("salade_lentilles_tofu", "Salade de lentilles, carottes & tofu", "warm_salad", "salad", ["tofu", "tempeh"], ["carotte"], ["lentilles"], extras=["citron", "cumin"], minutes=15, quick=True, moods=["veg", "fresh"]),
    B("frittata_pdt_champignons", "Frittata aux pommes de terre & champignons", "frittata", "eggs", ["oeuf"], ["champignons", "epinard", "courgette", "poireau"], ["pomme_de_terre"], extras=["persil", "muscade"], minutes=25, moods=["veg"]),
    B("cabillaud_brocoli", "Cabillaud au court-bouillon & brocolis", "poach", "fish", WHITE_FISH, ["brocoli", "chou_fleur", "haricot_vert"], None, requires=("protein", "vegetables"), extras=["citron"], minutes=15, quick=True),
    B("thon_quinoa_legumes", "Thon, quinoa & petits légumes", "bowl", "bowl", ["thon"], FRESH_VEG, ["quinoa", "boulgour"], extras=["paprika", "citron"], minutes=12, quick=True, moods=["fresh", "quick"]),
    B("boulettes_haricots_pdt", "Boulettes de viande, haricots verts & pommes de terre", "meatballs", "meat", ["boeuf_steak_hache5", "dinde"], ["haricot_vert"], ["pomme_de_terre"], extras=["paprika", "persil"], minutes=30, moods=["comfort"]),
    B("gambas_courgettes_pdt", "Gambas grillées, courgettes & pommes de terre", "grill", "fish", ["gambas", "crevettes"], ["courgette"], ["pomme_de_terre"], extras=["citron", "ail", "persil"], minutes=20),
    B("poulet_champignons_riz", "Poulet aux champignons & riz", "skillet", "meat", ["poulet", "dinde", "pintade"], ["champignons"], ["riz", "riz_complet"], extras=["persil"], minutes=20),
    B("porc_legumes_pdt", "Rôti de porc, légumes & pommes de terre", "roast", "meat", ["porc_maigre", "veau"], HOT, ["pomme_de_terre", "patate_douce"], extras=["paprika", "herbes de Provence"], minutes=35, moods=["comfort"]),
    B("chakchouka_oeufs", "Chakchouka tomates, poivrons & œufs", "chakchouka", "eggs", ["oeuf"], ["tomate", "poivron"], ["pain_complet", "semoule", "boulgour"], extras=["paprika", "cumin"], minutes=20, moods=["veg"]),
    B("dorade_courgettes", "Filet de dorade au four & courgettes poêlées", "oven", "fish", ["dorade", "bar", "sole"], ["courgette"], None, requires=("protein", "vegetables"), extras=["citron", "thym"], minutes=25),
    B("salade_haricots_oeufs", "Salade tiède de haricots verts & œufs", "warm_salad", "salad", ["oeuf"], ["haricot_vert"], ["pain_complet", "pomme_de_terre"], extras=["citron", "persil"], minutes=15, quick=True, moods=["fresh", "veg"]),
    B("bruschetta_jambon_tomate", "Bruschetta tomate & jambon", "bruschetta", "toast", ["jambon_blanc", "blanc_poulet_tranches", "blanc_dinde_tranches"], ["tomate"], ["pain_complet"], extras=["basilic", "origan"], minutes=10, quick=True, moods=["quick"]),
    B("colin_carottes_pdt", "Colin au four, purée de carottes & pommes de terre", "oven", "fish", ["colin", "merlu", "lieu_noir"], ["carotte"], ["pomme_de_terre"], extras=["citron", "persil"], minutes=30, moods=["comfort"]),
    B("cabillaud_provencale_riz_noir", "Cabillaud, tomates à la provençale & riz noir", "provencal", "fish", ["cabillaud", "lotte", "merlu"], ["tomate"], ["riz_noir", "riz"], extras=["ail", "herbes de Provence"], minutes=25),
    B("brochettes_saumon_semoule", "Brochettes de saumon & semoule", "skewers", "fish", ["saumon", "poulet", "dinde", "gambas"], ["poivron", "courgette", "champignons", "tomate"], ["semoule", "boulgour", "riz"], extras=["citron", "paprika"], minutes=20),
    B("pates_cremeuses_poulet_courgette", "Pâtes crémeuses poulet & courgette", "creamy_pasta", "pasta", ["poulet", "dinde"], ["courgette"], ["pates"], extras=["ail", "persil"], minutes=15, quick=True, moods=["comfort", "quick"]),
    B("pates_saumon_epinards", "Pâtes crémeuses saumon & épinards", "creamy_pasta", "pasta", ["saumon", "truite"], ["epinard"], ["pates"], extras=["citron", "aneth"], minutes=15, quick=True, moods=["comfort"]),
    B("pates_crevettes_citron", "Pâtes crevettes, ail & citron", "creamy_pasta", "pasta", ["crevettes", "gambas"], ["courgette", "epinard", "poireau", "brocoli"], ["pates"], extras=["ail", "citron", "persil"], minutes=12, quick=True, moods=["quick"]),
    B("bolognaise_dinde", "Pâtes façon bolognaise légère de dinde", "bolognese", "pasta", ["dinde", "boeuf_steak_hache5"], ["tomate", "carotte"], ["pates"], extras=["oignon", "herbes de Provence", "basilic"], minutes=25, moods=["comfort"]),
    B("pates_pesto_courgette", "Pâtes au pesto léger & courgette", "pesto_pasta", "pasta", ["poulet", "dinde"] + PLANT, ["courgette"], ["pates"], extras=["basilic", "ail"], minutes=15, quick=True, moods=["veg"]),
    B("bowl_burger", "Bowl burger complet", "burger_bowl", "bowl", ["boeuf_steak_hache5"], FRESH_VEG, ["pomme_de_terre", "patate_douce"], extras=["paprika", "moutarde", "cornichon"], minutes=20),
    B("bowl_tacos", "Bowl tacos au bœuf", "taco_bowl", "bowl", ["boeuf_steak_hache5", "poulet"], ["tomate", "salade_verte", "poivron"], ["riz", "riz_complet", "haricots_rouges", "haricots_blancs"], extras=["cumin", "paprika", "citron vert", "coriandre"], minutes=18),
    B("bowl_coreen", "Bowl de bœuf façon coréenne", "korean_bowl", "bowl", ["boeuf_steak_hache5", "boeuf_bavette"], ["carotte", "concombre", "epinard", "champignons"], ["riz", "riz_complet"], extras=["gingembre", "ail", "sauce soja réduite en sel"], minutes=20),
    B("poivrons_farcis", "Poivrons farcis façon burger", "stuffed", "meat", ["boeuf_steak_hache5", "dinde"], ["poivron"], ["riz", "riz_complet", "quinoa"], extras=["paprika", "persil"], minutes=30, moods=["comfort"]),
    B("chili_vegetarien", "Chili végétarien", "chili", "curry", PLANT, ["tomate", "poivron"], ["haricots_rouges", "haricots_blancs", "lentilles"], extras=["cumin", "paprika", "coriandre"], minutes=25, moods=["veg", "comfort"]),
    B("omelette_champignons", "Omelette aux champignons", "frittata", "eggs", ["oeuf"], ["champignons", "epinard", "courgette", "poireau"], ["pain_complet", "pomme_de_terre", "patate_douce", "semoule", "quinoa"], extras=["persil", "muscade"], minutes=12, quick=True, moods=["veg", "quick"]),
    B("poke_crevettes", "Poke bowl aux crevettes parfumées", "fresh_bowl", "bowl", ["crevettes", "gambas", "saumon"], FRESH_VEG, ["riz", "quinoa"], extras=["citron", "coriandre", "gingembre"], minutes=15, quick=True, moods=["fresh"]),
    B("tartine_thon_crudites", "Tartine de thon & crudités", "fresh_toast", "toast", ["thon"], FRESH_VEG, ["pain_complet", "biscottes"], extras=["citron", "ciboulette"], minutes=10, quick=True, moods=["fresh", "quick"]),
    B("moussaka_vegetarienne", "Moussaka végétarienne légère", "layered", "gratin", ["tofu", "tempeh"], ["aubergine"], ["riz", "quinoa"], extras=["origan", "ail"], minutes=30, moods=["veg", "comfort"]),
    B("croque_jambon_legumes", "Croque jambon & légumes fondants", "hot_toast", "toast", ["jambon_blanc", "blanc_poulet_tranches", "blanc_dinde_tranches"], ["tomate", "champignons", "epinard", "courgette"], ["pain_complet"], extras=["moutarde", "origan"], minutes=15, quick=True, moods=["quick", "comfort"]),
    B("carbonara_legere", "Pâtes façon carbonara légère", "carbonara", "pasta", ["oeuf", "jambon_blanc", "bacon_maigre"], ["courgette", "champignons", "epinard", "poireau"], ["pates"], extras=["poivre", "muscade"], minutes=15, quick=True, moods=["comfort"]),
    B("ratatouille_oeufs_semoule", "Œufs, ratatouille & semoule", "ratatouille_eggs", "eggs", ["oeuf"], ["ratatouille"], ["semoule"], extras=["herbes de Provence", "basilic"], minutes=20, moods=["veg"]),
    B("ratatouille_plate", "Ratatouille, semoule & {protein}", "ratatouille_plate", "curry", MAIN_COOK, ["ratatouille"], ["semoule", "boulgour", "riz"], extras=["herbes de Provence", "basilic"], minutes=18, adaptive=True),
    B("gnocchi_brocoli", "Gnocchis poêlés au brocoli & {protein}", "gnocchi_skillet", "pasta", MAIN_COOK, ["brocoli", "courgette", "epinard", "tomate", "champignons"], ["gnocchi"], extras=["ail", "parmesan râpé (pincée)"], minutes=15, quick=True, adaptive=True),
    B("gratin_courgette_creme", "Gratin de courgettes à la crème & {protein}", "gratin", "gratin", MAIN_COOK, ["courgette"], ["pomme_de_terre", "patate_douce", "semoule", "quinoa", "gnocchi"], extras=["muscade", "ail"], minutes=30, adaptive=True, moods=["comfort"]),
    B("gratin_potimarron", "Gratin de potimarron & {protein}", "gratin", "gratin", MAIN_COOK, ["potimarron"], ["patate_douce", "semoule", "quinoa", "boulgour", "gnocchi"], extras=["muscade", "thym"], minutes=30, adaptive=True, moods=["comfort"]),
    B("gratin_pdt_poireau_saumon", "Gratin de pommes de terre, poireaux & saumon", "gratin", "gratin", ["saumon", "truite"], ["poireau"], ["pomme_de_terre"], extras=["muscade", "aneth"], minutes=30, moods=["comfort"]),
    B("courgette_farcie_thon", "Courgette farcie au thon", "stuffed", "gratin", ["thon"], ["courgette"], ["ble", "boulgour", "quinoa", "riz"], extras=["ciboulette", "citron"], minutes=28),
    B("gambas_poireaux_quinoa", "Gambas, fondue de poireaux & quinoa", "skillet", "fish", ["gambas", "crevettes"], ["poireau"], ["quinoa"], extras=["citron", "persil"], minutes=20),
    B("tofu_nouilles_legumes", "Tofu grillé & nouilles aux légumes", "wok", "wok", ["tofu", "tempeh", "seitan"], ["poivron", "carotte", "brocoli", "champignons", "courgette"], ["vermicelles", "pates"], extras=["gingembre", "sauce soja réduite en sel"], minutes=18, moods=["veg"]),
    B("riz_cantonais", "Riz cantonais léger", "fried_rice", "wok", ["gambas", "crevettes", "oeuf", "jambon_blanc"], ["carotte", "poivron", "champignons"], ["riz", "riz_complet"], extras=["ciboulette", "sauce soja réduite en sel"], minutes=18, quick=True),
    B("butternut_oeuf", "Courge rôtie aux épices & œuf coulant", "roast_egg", "eggs", ["oeuf"], ["potimarron"], ["quinoa", "boulgour", "lentilles"], extras=["paprika", "cumin"], minutes=28, moods=["veg", "comfort"]),
    # --- Recettes supplémentaires (variété : viandes, poissons, coquillages, végétal, soupes-repas, salades)
    B("poulet_citron_haricots_riz", "Poulet au citron, haricots verts & riz", "skillet", "meat", ["poulet", "dinde"], ["haricot_vert"], ["riz", "riz_complet"], extras=["citron", "thym"], minutes=20),
    B("dinde_curry_chou_fleur", "Curry de dinde au chou-fleur & riz", "curry", "curry", ["dinde", "poulet"], ["chou_fleur"], ["riz", "riz_complet", "quinoa"], extras=["curry", "coriandre"], minutes=22, moods=["comfort"]),
    B("saumon_laque_brocoli", "Saumon laqué, brocolis & riz", "skillet", "salmon", ["saumon", "truite"], ["brocoli"], ["riz", "riz_complet"], extras=["sauce soja réduite en sel", "gingembre", "graines de sésame"], minutes=18),
    B("truite_herbes_haricots_pdt", "Truite aux herbes, haricots verts & pommes de terre", "oven", "fish", ["truite", "saumon"], ["haricot_vert"], ["pomme_de_terre"], extras=["citron", "persil"], minutes=25),
    B("maquereau_ratatouille_semoule", "Maquereau grillé, ratatouille & semoule", "grill", "fish", ["maquereau", "sardines"], ["ratatouille", "tomate"], ["semoule", "boulgour"], extras=["citron", "herbes de Provence"], minutes=20),
    B("sardines_tomates_pdt", "Sardines grillées, tomates & pommes de terre", "grill", "fish", ["sardines", "maquereau"], ["tomate"], ["pomme_de_terre"], extras=["citron", "persil"], minutes=20),
    B("lieu_chou_fleur_lentilles", "Lieu noir, chou-fleur rôti & lentilles", "oven", "fish", ["lieu_noir", "colin", "merlu"], ["chou_fleur"], ["lentilles", "lentilles_corail"], extras=["cumin", "citron"], minutes=28),
    B("dahl_lentilles_corail", "Dahl de lentilles corail, épinards & œuf", "curry", "curry", ["oeuf", "tofu"], ["epinard", "carotte", "tomate"], ["lentilles_corail", "riz"], extras=["curry", "gingembre", "coriandre"], minutes=22, moods=["veg", "comfort"]),
    B("boeuf_carottes_mijote", "Bœuf mijoté aux carottes & pommes de terre", "stew", "meat", ["boeuf", "boeuf_bavette"], ["carotte", "champignons", "navet"], ["pomme_de_terre", "patate_douce"], extras=["thym", "laurier", "oignon"], minutes=45, moods=["comfort"]),
    B("bavette_haricots_pdt", "Bavette grillée, haricots verts & pommes de terre", "grill", "meat", ["boeuf_bavette", "boeuf"], ["haricot_vert", "champignons"], ["pomme_de_terre", "patate_douce"], extras=["échalote", "persil"], minutes=20),
    B("veau_champignons_pates", "Sauté de veau aux champignons & pâtes", "skillet", "meat", ["veau", "porc_maigre"], ["champignons", "carotte"], ["pates", "riz"], extras=["moutarde", "persil"], minutes=22),
    B("porc_moutarde_poireaux", "Filet de porc à la moutarde, poireaux & riz", "oven", "meat", ["porc_maigre", "veau"], ["poireau", "champignons"], ["riz", "riz_complet", "pomme_de_terre"], extras=["moutarde", "thym"], minutes=30),
    B("wok_boeuf_brocoli", "Wok de bœuf au brocoli & nouilles", "wok", "wok", ["boeuf", "boeuf_bavette"], ["brocoli", "poivron", "carotte"], ["vermicelles", "pates", "riz"], extras=["sauce soja réduite en sel", "gingembre", "ail"], minutes=18, quick=True),
    B("crevettes_ail_courgettes_riz", "Crevettes à l'ail, courgettes & riz", "skillet", "shrimp", ["crevettes", "gambas"], ["courgette", "poivron"], ["riz", "riz_complet", "quinoa"], extras=["ail", "citron", "persil"], minutes=15, quick=True, moods=["quick"]),
    B("saint_jacques_poireaux_riz_noir", "Noix de Saint-Jacques, fondue de poireaux & riz noir", "skillet", "shrimp", ["saint_jacques", "gambas"], ["poireau"], ["riz_noir", "riz"], extras=["citron", "ciboulette"], minutes=20),
    B("moules_marinieres_pdt", "Moules marinières & pommes de terre vapeur", "poach", "shrimp", ["moules"], ["poireau", "carotte", "celeri"], ["pomme_de_terre"], extras=["persil", "échalote"], minutes=25),
    B("salade_pois_chiches_thon", "Salade de pois chiches, thon & crudités", "warm_salad", "salad", ["thon", "oeuf"], FRESH_VEG, ["pois_chiches", "haricots_blancs"], extras=["citron", "cumin", "persil"], minutes=12, quick=True, moods=["fresh", "quick"]),
    B("taboule_poulet", "Taboulé de boulgour au poulet & menthe", "warm_salad", "salad", ["poulet", "dinde", "blanc_poulet_tranches"], ["tomate", "concombre"], ["boulgour", "semoule", "quinoa"], extras=["menthe", "citron"], minutes=15, quick=True, moods=["fresh"]),
    B("salade_nicoise", "Salade niçoise légère", "warm_salad", "salad", ["thon", "oeuf"], ["tomate", "haricot_vert", "salade_verte"], ["pomme_de_terre"], extras=["basilic", "citron"], minutes=15, quick=True, moods=["fresh"]),
    B("soupe_lentilles_jambon", "Soupe-repas lentilles, carottes & jambon", "stew", "soup", ["jambon_blanc", "poulet"], ["carotte", "poireau", "celeri"], ["lentilles", "pomme_de_terre"], extras=["cumin", "thym"], minutes=30, moods=["comfort"]),
    B("veloute_potimarron_oeuf", "Velouté de potimarron, œuf mollet & pain", "stew", "soup", ["oeuf"], ["potimarron", "carotte"], ["pain_complet", "pomme_de_terre"], extras=["muscade", "ciboulette"], minutes=25, moods=["comfort", "veg"]),
    B("hachis_parmentier_dinde", "Hachis parmentier de dinde & épinards", "parmentier", "gratin", ["dinde", "boeuf_steak_hache5"], ["epinard", "carotte"], ["pomme_de_terre", "patate_douce"], extras=["muscade", "persil"], minutes=35, moods=["comfort"]),
    B("gratin_chou_fleur_jambon", "Gratin de chou-fleur & jambon", "gratin", "gratin", ["jambon_blanc", "poulet"], ["chou_fleur", "brocoli"], ["pomme_de_terre", "pates"], extras=["muscade", "ail"], minutes=30, moods=["comfort"]),
    B("tofu_sesame_quinoa", "Tofu grillé au sésame, légumes & quinoa", "skillet", "tofu", ["tofu", "tempeh"], ["brocoli", "carotte", "poivron"], ["quinoa", "riz", "boulgour"], extras=["graines de sésame", "sauce soja réduite en sel", "gingembre"], minutes=18, moods=["veg"]),
    B("tempeh_curry_patate_douce", "Curry de tempeh & patate douce", "curry", "curry", ["tempeh", "tofu", "seitan"], ["epinard", "chou_fleur", "poivron"], ["patate_douce", "riz"], extras=["curry", "lait de coco léger", "coriandre"], minutes=25, moods=["veg", "comfort"]),
    B("omelette_asperges_pdt", "Omelette aux asperges & pommes de terre", "frittata", "eggs", ["oeuf"], ["asperge", "champignons", "poireau"], ["pomme_de_terre"], extras=["ciboulette", "poivre"], minutes=15, quick=True, moods=["veg", "quick"]),
    B("pintade_choux_bruxelles", "Pintade rôtie, choux de Bruxelles & patate douce", "roast", "meat", ["pintade", "poulet"], ["chou_bruxelles", "carotte"], ["patate_douce", "pomme_de_terre"], extras=["thym", "ail"], minutes=40, moods=["comfort"]),
    B("dorade_fenouil_pdt", "Dorade au fenouil & pommes de terre", "oven", "fish", ["dorade", "bar"], ["fenouil", "tomate"], ["pomme_de_terre"], extras=["citron", "aneth"], minutes=30),
    B("tartine_roulee_poulet", "Tartine roulée poulet & crudités", "sandwich", "toast", ["blanc_poulet_tranches", "blanc_dinde_tranches", "jambon_blanc"], FRESH_VEG, ["pain_complet"], extras=["moutarde", "ciboulette"], minutes=8, quick=True, moods=["quick", "fresh"]),
    # --- Modèles adaptatifs (technique imposée, aliments prescrits)
    B("adapt_gratin", "Gratin de {veg} & {protein}", "gratin", "gratin", MAIN_COOK, ["courgette", "brocoli", "chou_fleur", "poireau", "epinard", "aubergine", "potimarron", "fenouil", "endive", "blette"], ["pomme_de_terre", "patate_douce", "pates", "gnocchi", "riz", "quinoa", "boulgour", "ble", "semoule", "polenta"], extras=["muscade", "ail"], minutes=30, adaptive=True, moods=["comfort"]),
    B("adapt_parmentier", "Parmentier léger de {protein} & {veg}", "parmentier", "gratin", ["boeuf_steak_hache5", "dinde", "cabillaud", "colin", "saumon"], ["carotte", "epinard", "poireau", "champignons", "courgette", "brocoli", "potimarron"], ["pomme_de_terre", "patate_douce"], extras=["muscade", "persil"], minutes=30, adaptive=True, moods=["comfort"]),
    B("adapt_fresh_bowl", "Bowl frais {protein}, {veg} & {starch}", "fresh_bowl", "bowl", COLD_PROT, FRESH_VEG, COLD_STARCH, extras=["citron", "herbes fraîches"], minutes=15, quick=True, adaptive=True, moods=["fresh", "quick"]),
    B("adapt_wok", "Wok de {protein}, {veg} & {starch}", "wok", "wok", MAIN_COOK, ["poivron", "carotte", "brocoli", "champignons", "courgette", "chou_fleur", "haricot_vert", "epinard"], ["riz", "riz_complet", "pates", "vermicelles", "quinoa"], extras=["gingembre", "ail"], minutes=18, adaptive=True),
    B("adapt_farci", "{veg} farcis au {protein} & {starch}", "stuffed", "gratin", ["boeuf_steak_hache5", "dinde", "poulet", "thon", "tofu"], ["courgette", "poivron", "aubergine", "tomate"], ["riz", "riz_complet", "quinoa", "boulgour", "ble", "semoule"], extras=["paprika", "herbes de Provence"], minutes=30, adaptive=True),
    B("adapt_curry", "Curry doux de {protein}, {veg} & {starch}", "curry", "curry", MAIN_COOK, ["courgette", "carotte", "chou_fleur", "epinard", "poivron", "champignons", "brocoli", "haricot_vert", "potimarron"], ["riz", "riz_complet", "quinoa", "boulgour", "semoule", "lentilles", "lentilles_corail", "pois_chiches"], extras=["curry", "coriandre"], minutes=22, adaptive=True, moods=["comfort"]),
    B("adapt_salad", "Salade composée {protein}, {veg} & {starch}", "warm_salad", "salad", COLD_PROT, FRESH_VEG + ["haricot_vert", "brocoli"], COLD_STARCH, extras=["citron", "moutarde", "herbes fraîches"], minutes=12, quick=True, adaptive=True, moods=["fresh", "quick"]),
    B("adapt_risotto", "Risotto crémeux {veg} & {protein}", "risotto", "risotto", ["poulet", "dinde", "crevettes", "gambas", "saint_jacques", "saumon", "cabillaud", "tofu"], ["courgette", "champignons", "asperge", "poireau", "epinard", "potimarron"], ["riz", "riz_complet"], extras=["persil", "poivre"], minutes=25, adaptive=True, moods=["comfort"]),
    B("adapt_croque", "Croque chaud {protein} & {veg}", "hot_toast", "toast", ["jambon_blanc", "blanc_poulet_tranches", "blanc_dinde_tranches", "poulet", "dinde"] + PLANT, ["tomate", "champignons", "epinard", "courgette", "poireau"], ["pain_complet"], extras=["moutarde", "origan"], minutes=15, quick=True, adaptive=True, moods=["quick"]),
    B("adapt_oeufs_cocotte", "Œufs cocotte aux {veg}", "eggs_cocotte", "eggs", ["oeuf"], ["epinard", "champignons", "poireau", "courgette", "tomate", "asperge"], ["pain_complet", "pomme_de_terre", "patate_douce", "semoule", "quinoa"], extras=["ciboulette", "poivre"], minutes=18, adaptive=True, moods=["veg"]),
    B("adapt_quiche", "Quiche sans pâte {veg} & {protein}", "quiche", "eggs", ["oeuf"], ["epinard", "poireau", "courgette", "brocoli", "champignons", "tomate"], ["pain_complet", "pomme_de_terre", "patate_douce", "quinoa", "semoule"], extras=["muscade", "herbes de Provence"], minutes=35, adaptive=True, moods=["veg", "comfort"]),
    B("adapt_tian", "Œufs & tian de {veg}", "tian", "eggs", ["oeuf"], ["courgette", "aubergine", "tomate", "poivron"], ["semoule", "quinoa", "boulgour", "pain_complet"], extras=["thym", "basilic"], minutes=35, adaptive=True, moods=["veg"]),
    B("adapt_croquettes_thon", "Croquettes de thon & {veg}", "croquettes", "fish", ["thon", "saumon", "cabillaud"], HOT, ["pomme_de_terre", "patate_douce"], extras=["ciboulette", "citron"], minutes=22, adaptive=True),
    B("adapt_pdt_farcie", "Pomme de terre farcie {protein} & {veg}", "potato_stuffed", "gratin", ["boeuf_steak_hache5", "dinde", "poulet", "thon", "jambon_blanc", "tofu"], ["champignons", "epinard", "poireau", "brocoli", "courgette", "tomate"], ["pomme_de_terre", "patate_douce"], extras=["paprika", "persil"], minutes=30, adaptive=True, moods=["comfort"]),
    B("adapt_lasagnes", "Gratin de pâtes façon lasagnes {protein} & {veg}", "layered", "gratin", ["boeuf_steak_hache5", "dinde", "poulet", "thon", "tofu"], ["tomate", "champignons", "epinard", "courgette", "poireau", "aubergine"], ["pates"], extras=["origan", "basilic"], minutes=30, adaptive=True, moods=["comfort"]),
    B("adapt_brochettes", "Brochettes de {protein}, {veg} & {starch}", "skewers", "meat", ["poulet", "dinde", "boeuf", "boeuf_bavette", "saumon", "gambas", "crevettes", "tofu"], ["courgette", "poivron", "champignons", "aubergine", "tomate"], ["riz", "riz_complet", "quinoa", "boulgour", "semoule", "pomme_de_terre", "patate_douce"], extras=["citron", "paprika", "herbes de Provence"], minutes=20, adaptive=True),
    B("adapt_soupe_froide", "Soupe froide de {veg} & {protein}", "cold_soup", "soup", ["crevettes", "gambas", "cabillaud", "colin", "oeuf", "tofu"], ["courgette", "tomate", "concombre"], ["pomme_de_terre", "patate_douce", "quinoa", "boulgour", "pain_complet"], extras=["basilic", "citron"], minutes=20, adaptive=True, moods=["fresh"]),
    B("adapt_papillote", "Papillote de {protein} aux {veg}", "papillote", "fish", [*WHITE_FISH, "saumon", "truite", "poulet", "dinde"], HOT, ["riz", "riz_complet", "quinoa", "boulgour", "semoule", "pomme_de_terre", "patate_douce"], extras=["citron", "thym"], minutes=30, adaptive=True),
    B("adapt_mijote", "Mijoté fondant de {protein} aux {veg}", "stew", "curry", ["poulet", "dinde", "veau", "porc_maigre", "boeuf", "boeuf_bavette", "tofu", "tempeh"], ["carotte", "champignons", "poireau", "navet", "tomate", "haricot_vert", "fenouil"], ["pomme_de_terre", "patate_douce", "riz", "semoule", "boulgour", "lentilles", "pois_chiches"], extras=["thym", "laurier", "oignon"], minutes=40, adaptive=True, moods=["comfort"]),
    B("adapt_poelee", "Poêlée minute {protein}, {veg} & {starch}", "skillet", "wok", MAIN_COOK, HOT, ["riz", "riz_complet", "pates", "quinoa", "boulgour", "semoule", "pomme_de_terre", "gnocchi", "lentilles", "pois_chiches"], extras=["paprika", "ail", "persil"], minutes=15, quick=True, adaptive=True, moods=["quick"]),
    B("adapt_tartines_repas", "Tartines-repas {protein} & {veg}", "sandwich", "toast", COLD_PROT, FRESH_VEG, ["pain_complet", "biscottes"], extras=["moutarde", "ciboulette"], minutes=10, quick=True, adaptive=True, moods=["quick", "fresh"]),
]

BREAKFAST_BLUEPRINTS: List[Dict[str, Any]] = [
    B("tartines_gourmandes", "Tartines gourmandes", "toast", "sweet_toast", starches=["pain_complet", "biscottes"], requires=("starch",), minutes=8, quick=True),
    B("petit_dej_traditionnel", "Petit-déjeuner traditionnel", "toast", "sweet_toast", starches=["pain_complet", "biscottes"], requires=("starch",), minutes=8, quick=True),
    B("porridge", "Porridge crémeux", "porridge", "porridge", starches=["avoine"], requires=("starch", "dairy"), minutes=10),
    B("overnight_oats", "Overnight oats", "overnight", "porridge", starches=["avoine"], requires=("starch", "dairy"), minutes=5, quick=True),
    B("bowl_granola", "Bowl granola & laitage", "granola_bowl", "granola", starches=["granola"], requires=("starch", "dairy"), minutes=5, quick=True),
    B("bowl_fruite", "Bowl fruité du matin", "fruit_bowl", "granola", starches=["avoine", "granola"], requires=("starch", "fruit"), minutes=7, quick=True),
    B("energy_oat_bowl", "Bol d'énergie aux flocons d'avoine", "energy_bowl", "porridge", starches=["avoine"], requires=("starch", "dairy"), minutes=10),
    B("smoothie_avoine", "Smoothie vitaminé avoine & fruit", "smoothie", "smoothie", starches=["avoine"], requires=("starch", "dairy", "fruit"), dairies=["lait", "lait_vegetal", "yaourt_nature", "skyr", "fromage_blanc"], minutes=5, quick=True),
    B("pancakes_avoine", "Pancakes avoine & fruit", "pancakes", "pancakes", starches=["avoine"], requires=("starch", "dairy", "fruit"), minutes=15),
    B("crepes_avoine", "Crêpes fines avoine & fruit", "crepes", "pancakes", starches=["avoine"], requires=("starch", "dairy", "fruit"), minutes=15),
    B("bowl_cake", "Bowl cake avoine & fruit", "bowl_cake", "pancakes", starches=["avoine"], requires=("starch", "dairy", "fruit"), minutes=12),
    B("baked_oats", "Baked oats fruités", "baked_oats", "porridge", starches=["avoine"], requires=("starch", "dairy", "fruit"), minutes=25),
    B("verrine", "Verrine petit-déjeuner", "layered_bf", "granola", starches=["avoine", "granola"], requires=("starch", "dairy", "fruit"), minutes=6, quick=True),
    B("tartines_salees", "Tartines salées", "savory_toast", "sweet_toast", starches=["pain_complet", "biscottes", "muffin_anglais"], requires=("starch", "protein"), minutes=10, quick=True),
    B("omelette_matin", "Assiette omelette", "omelette", "eggs", proteins=["oeuf"], requires=("protein",), minutes=10, quick=True),
    B("assiette_salee", "Assiette salée du matin", "savory_plate", "savory_breakfast", requires=("protein",), minutes=8, quick=True),
    B("toast_proteine", "Toast salé protéiné", "savory_toast", "savory_breakfast", starches=["pain_complet", "biscottes", "muffin_anglais"], requires=("starch", "protein"), minutes=10, quick=True),
    B("oeufs_brouilles", "Œufs brouillés crémeux & tartine", "scrambled", "eggs", proteins=["oeuf"], starches=["pain_complet", "biscottes", "muffin_anglais"], requires=("protein", "starch"), minutes=10, quick=True),
]

SAVORY_BF = {"tartines_salees", "omelette_matin", "assiette_salee", "toast_proteine", "oeufs_brouilles"}


def _n(c: Optional[Dict[str, Any]], default: str) -> str:
    return c["food_name"].lower() if c else default


def _de(name: str) -> str:
    n = name.lower()
    h_aspire = n.startswith(("hareng", "haricot", "homard"))
    return ("d'" + n) if (n[:1] in "aeiouyhéèêœ" and not h_aspire) else ("de " + n)


def _q(c: Optional[Dict[str, Any]]) -> str:
    if not c:
        return ""
    return f"{c['grams']:g} g {_de(c['food_name'])}"


def _extras(bp: Dict[str, Any]) -> str:
    ex = bp.get("extras") or []
    return f"Assaisonner avec {', '.join(ex)}, saler légèrement et poivrer." if ex else "Saler légèrement et poivrer."


def _fat(fat: Optional[Dict[str, Any]]) -> str:
    return f"Utiliser uniquement {_q(fat)} pour la cuisson ou l'assaisonnement." if fat else "Cuire dans une poêle antiadhésive avec un petit fond d'eau si besoin."


def starch_step(st: Optional[Dict[str, Any]]) -> str:
    if not st:
        return ""
    t = FOODS[st["food_id"]]["tags"]
    n = st["food_name"].lower()
    if "tuber" in t:
        return f"cuire {n} à la vapeur ou à l'eau 20 à 25 minutes (poids cuit visé : {st['grams']:g} g)."
    if "legume" in t:
        return f"réchauffer ou cuire {n} (poids cuit visé : {st['grams']:g} g), égoutter."
    if "bread" in t:
        return f"prévoir {st['grams']:g} g de {n}, légèrement toasté si souhaité."
    return f"cuire {n} dans un grand volume d'eau bouillante selon le paquet (poids cuit visé : {st['grams']:g} g), égoutter."


def protein_step(p: Optional[Dict[str, Any]]) -> str:
    if not p:
        return ""
    t = FOODS[p["food_id"]]["tags"]
    n = p["food_name"].lower()
    if "egg" in t:
        return f"cuire les œufs ({p['grams']:g} g, soit environ {max(1, round(p['grams'] / 50))} œufs) selon l'envie : mollets 6 min, durs 9 min, ou brouillés à feu doux."
    if "fish" in t and "cold" not in t:
        return f"cuire {n} 8 à 12 minutes au four à 180 °C ou 3 à 4 minutes par face à la poêle, jusqu'à ce que la chair se détache."
    if "shellfish" in t:
        return f"saisir {n} 2 à 3 minutes par face à feu vif, jusqu'à ce qu'ils soient nacrés."
    if "cold" in t or "deli" in t:
        return f"découper {n} en lanières, sans cuisson."
    if "plant" in t:
        return f"couper {n} en dés et dorer 5 à 6 minutes à feu moyen-vif."
    if "red_meat" in t:
        return f"saisir {n} 2 à 4 minutes par face selon la cuisson souhaitée, laisser reposer 2 minutes."
    return f"cuire {n} 5 à 7 minutes par face à feu moyen jusqu'à ce qu'il soit bien cuit à cœur."


def veg_prep(v: Optional[Dict[str, Any]]) -> str:
    if not v:
        return ""
    return f"laver et détailler {v['food_name'].lower()} ({v['grams']:g} g) en morceaux réguliers."


def veg_cook(v: Optional[Dict[str, Any]], mode: str, fat: Optional[Dict[str, Any]]) -> str:
    if not v:
        return ""
    n = v["food_name"].lower()
    if "raw" in FOODS[v["food_id"]]["tags"] and "hot" not in FOODS[v["food_id"]]["tags"]:
        return f"servir {n} crus, en fines lamelles ou râpés."
    f = f" avec {_q(fat)}" if fat else ""
    if mode == "oven":
        return f"enfourner {n} 20 à 25 minutes à 180 °C{f}."
    if mode == "wok":
        return f"faire sauter {n} 5 à 7 minutes à feu vif{f}, ils doivent rester croquants."
    if mode == "steam":
        return f"cuire {n} 8 à 12 minutes à la vapeur, ils doivent rester légèrement fermes."
    return f"faire revenir {n} 8 à 10 minutes à feu moyen{f}."


def build_main_steps(bp: Dict[str, Any], comp: Dict[str, Dict[str, Any]]) -> List[str]:
    p, v, st, fat, dairy = comp.get("protein"), comp.get("vegetables"), comp.get("starch"), comp.get("fat"), comp.get("dairy")
    pn, vn, sn = _n(p, "la source de protéines"), _n(v, "les légumes"), _n(st, "le féculent")
    m = bp["method"]
    S: List[str] = []
    if v:
        S.append(f"Préparer les ingrédients : {veg_prep(v)}")
    if m in ("grill", "skillet", "roast"):
        if st: S.append(f"Accompagnement : {starch_step(st)}")
        if p: S.append(f"Cuisson de la protéine : {protein_step(p)}")
        if v: S.append(f"Cuisson des légumes : {veg_cook(v, 'skillet', fat)}")
        S.append(f"Finition : {_extras(bp)} {_fat(fat)}")
    elif m in ("oven", "papillote", "poach"):
        S.append("Préchauffer le four à 180 °C." if m != "poach" else "Porter à ébullition une casserole d'eau avec un peu de sel, du citron et du thym.")
        if st: S.append(f"Préparer le féculent : {starch_step(st)}")
        if p: S.append(f"Cuire la protéine : {protein_step(p) if m != 'papillote' else f'déposer {pn} sur une feuille de papier cuisson avec {vn}, fermer la papillote et enfourner 20 à 25 minutes.'}")
        if v and m != "papillote": S.append(f"Cuire les légumes : {veg_cook(v, 'oven' if m == 'oven' else 'steam', fat)}")
        S.append(f"Finition : {_extras(bp)} {_fat(fat)}")
    elif m in ("curry", "stew", "chili"):
        if st: S.append(f"Préparer le féculent : {starch_step(st)}")
        S.append(f"Base : faire revenir {pn} avec {vn} 5 minutes à feu moyen{' avec ' + _q(fat) if fat else ''}.")
        S.append("Mijoter : ajouter un fond d'eau (ou de coulis de tomate pour le chili), couvrir et laisser cuire doucement 12 à 15 minutes." if m != "stew" else "Mijoter : mouiller à hauteur, couvrir et laisser cuire à feu doux 30 à 35 minutes.")
        S.append(f"Finition : {_extras(bp)} Servir avec {sn}.")
    elif m in ("wok", "fried_rice", "fruit_skillet"):
        if st: S.append(f"Préparer le féculent : {starch_step(st)}")
        if p: S.append(f"Saisir {pn} dans un wok ou une grande poêle bien chaude 3 à 5 minutes.")
        if v: S.append(f"Ajouter les légumes : {veg_cook(v, 'wok', fat)}")
        if m == "fruit_skillet" and comp.get("fruit"): S.append(f"Ajouter {_q(comp['fruit'])} en dés 2 minutes en fin de cuisson pour caraméliser légèrement.")
        S.append(f"Assembler : incorporer {sn}, mélanger 1 à 2 minutes. {_extras(bp)} {_fat(fat)}")
    elif m in ("tomato_pasta", "bolognese", "creamy_pasta", "pesto_pasta", "carbonara", "gnocchi_skillet"):
        if st: S.append(f"Cuire le féculent : {starch_step(st)}")
        if v: S.append(f"Préparer la garniture : faire cuire {vn} 8 à 12 minutes à feu moyen pour obtenir une base fondante{' avec ' + _q(fat) if fat else ''}.")
        if p: S.append(f"Cuire la protéine : {protein_step(p)} L'ajouter à la garniture.")
        if m == "creamy_pasta" and dairy:
            S.append(f"Lier : hors du feu, ajouter {_q(dairy)} pour une sauce crémeuse sans ajout de matière grasse.")
        elif m == "carbonara" and p and "egg" in FOODS[p["food_id"]]["tags"]:
            S.append("Lier : hors du feu, mélanger l'œuf battu aux pâtes chaudes pour napper sans coaguler.")
        S.append(f"Assembler : incorporer {sn}, mélanger 1 à 2 minutes. {_extras(bp)}")
    elif m in ("gratin", "layered", "parmentier", "quiche", "tian"):
        S.append("Préchauffer le four à 190 °C.")
        if st: S.append(f"Préparer le féculent : {starch_step(st)}{' Écraser en purée.' if m == 'parmentier' else ''}")
        if p: S.append(f"Préparer la protéine : {protein_step(p)}")
        if v: S.append(f"Précuire les légumes : {veg_cook(v, 'skillet', fat)}")
        S.append(f"Monter le plat : alterner {sn}, {vn} et {pn} dans un plat{' ; napper de ' + _q(dairy) if dairy and 'cream' in FOODS[dairy['food_id']]['tags'] else ''}. Enfourner 15 à 20 minutes jusqu'à une surface dorée.")
        S.append(f"Finition : {_extras(bp)}")
    elif m in ("stuffed", "potato_stuffed"):
        S.append("Préchauffer le four à 180 °C.")
        if m == "stuffed" and v: S.append(f"Creuser {vn} et réserver la chair.")
        if st: S.append(f"Préparer le féculent : {starch_step(st)}")
        S.append(f"Farce : faire revenir {pn} avec la chair des légumes, mélanger avec {sn}. {_extras(bp)}")
        S.append(f"Garnir {vn if m == 'stuffed' else sn} et enfourner 20 à 25 minutes.")
    elif m in ("risotto",):
        S.append(f"Faire revenir {vn} 3 minutes{' avec ' + _q(fat) if fat else ''}, ajouter le riz et nacrer 1 minute.")
        S.append("Mouiller louche par louche avec de l'eau chaude ou un bouillon dégraissé, en remuant, 18 minutes.")
        if p: S.append(f"Cuire la protéine à part : {protein_step(p)}")
        S.append(f"Finition : incorporer {pn}{' et ' + _q(dairy) if dairy else ''}. {_extras(bp)}")
    elif m in ("warm_salad", "fresh_bowl", "bowl", "cold_soup", "burger_bowl", "taco_bowl", "korean_bowl"):
        if st: S.append(f"Préparer le féculent : {starch_step(st)} Laisser tiédir.")
        if p: S.append(f"Préparer la protéine : {protein_step(p)}")
        if m == "cold_soup" and v: S.append(f"Mixer {vn} avec un peu d'eau glacée, du citron et du basilic ; réserver au frais.")
        S.append(f"Assembler : disposer {sn}, {vn} et {pn} dans un bol ou une assiette creuse.")
        S.append(f"Sauce : mélanger {_q(fat) if fat else 'un filet de citron'} avec {', '.join(bp['extras'])}. Verser et servir.")
    elif m in ("hot_toast", "bruschetta", "fresh_toast", "sandwich"):
        S.append(f"Toaster légèrement {sn}.")
        if v: S.append(f"Garnir : répartir {vn} {'préalablement poêlés' if m == 'hot_toast' else 'en fines tranches'} sur le pain.")
        if p: S.append(f"Ajouter {pn}{' et ' + _q(dairy) if dairy and 'cheese' in FOODS[dairy['food_id']]['tags'] else ''}.")
        if m in ("hot_toast", "bruschetta"): S.append("Passer 5 à 8 minutes sous le gril du four jusqu'à ce que le dessus soit doré.")
        S.append(f"Finition : {_extras(bp)} {_fat(fat)}")
    elif m in ("frittata", "eggs_cocotte", "chakchouka", "ratatouille_eggs", "eggs_legume", "roast_egg", "scrambled"):
        if st: S.append(f"Préparer le féculent : {starch_step(st)}")
        if v: S.append(f"Cuire les légumes : {veg_cook(v, 'skillet', fat)}")
        if m == "frittata": S.append(f"Verser les œufs battus ({_q(p)}) sur les légumes, cuire 6 à 8 minutes à feu doux puis 2 minutes sous le gril.")
        elif m == "eggs_cocotte": S.append(f"Répartir {vn} dans des ramequins, casser les œufs dessus et cuire 12 minutes au bain-marie à 180 °C.")
        elif m == "chakchouka": S.append("Creuser des nids dans les légumes, casser les œufs dedans, couvrir et cuire 5 à 6 minutes.")
        else: S.append(f"Cuire les œufs : {protein_step(p)}")
        S.append(f"Servir avec {sn}. {_extras(bp)}")
    elif m in ("meatballs", "croquettes", "skewers", "provencal"):
        if st: S.append(f"Préparer le féculent : {starch_step(st)}")
        if m == "meatballs": S.append(f"Façonner {pn} en boulettes avec les épices, dorer 8 à 10 minutes à la poêle.")
        elif m == "croquettes": S.append(f"Mélanger {pn} émietté avec une partie de {sn} écrasé, façonner des galettes et dorer 4 minutes par face.")
        elif m == "skewers": S.append(f"Monter des brochettes en alternant {pn} et {vn}, griller 10 à 12 minutes en tournant.")
        else: S.append(f"Disposer {vn} coupés en deux avec ail et herbes, rôtir 20 minutes à 190 °C ; cuire {pn} 8 à 10 minutes.")
        if v and m != "skewers": S.append(f"Cuisson des légumes : {veg_cook(v, 'skillet', fat)}")
        S.append(f"Finition : {_extras(bp)} {_fat(fat)}")
    else:
        if st: S.append(f"Préparer le féculent : {starch_step(st)}")
        if p: S.append(f"Cuire la protéine : {protein_step(p)}")
        if v: S.append(f"Cuire les légumes : {veg_cook(v, 'skillet', fat)}")
        S.append(f"Finition : {_extras(bp)} {_fat(fat)}")
    if comp.get("dairy") and m not in ("creamy_pasta", "gratin", "risotto"):
        S.append(f"Laitage : servir {_q(dairy)} en fin de repas ou en accompagnement.")
    if comp.get("fruit") and m != "fruit_skillet":
        S.append(f"Dessert : {_q(comp['fruit'])}.")
    return S


def build_breakfast_steps(bp: Dict[str, Any], comp: Dict[str, Dict[str, Any]]) -> List[str]:
    st, dairy, fruit, p, fat, sweet = comp.get("starch"), comp.get("dairy"), comp.get("fruit"), comp.get("protein"), comp.get("fat"), comp.get("sweet")
    m = bp["method"]
    S: List[str] = []
    fr = f"{fruit['food_name'].lower()} ({fruit['grams']:g} g)" if fruit else "le fruit"
    if m == "toast":
        S.append(f"Toaster {_q(st)} selon le goût.")
        if fat: S.append(f"Tartiner avec {_q(fat)}.")
        if sweet: S.append(f"Ajouter {_q(sweet)} en fine couche.")
        if dairy: S.append(f"Servir avec {_q(dairy)}.")
        if fruit: S.append(f"Terminer par {fr}, entier ou en morceaux.")
    elif m == "porridge":
        S.append(f"Verser {_q(st)} et {_q(dairy)} dans une casserole (ou un bol pour le micro-ondes).")
        S.append("Cuire 3 à 5 minutes à feu doux en remuant jusqu'à une texture crémeuse.")
        if fruit: S.append(f"Garnir avec {fr} coupé en morceaux et une pincée de cannelle.")
    elif m == "overnight":
        S.append(f"La veille : mélanger {_q(st)} avec {_q(dairy)} dans un bocal.")
        S.append("Fermer et laisser reposer une nuit au réfrigérateur.")
        if fruit: S.append(f"Au matin : ajouter {fr} en morceaux et déguster frais.")
    elif m in ("granola_bowl", "fruit_bowl", "energy_bowl", "layered_bf"):
        S.append(f"Verser {_q(dairy) if dairy else 'le laitage'} dans un bol{' ou une verrine' if m == 'layered_bf' else ''}.")
        if fruit: S.append(f"Ajouter {fr} coupé en morceaux{' en couches alternées' if m == 'layered_bf' else ''}.")
        S.append(f"Parsemer de {_q(st)} au dernier moment pour garder le croquant.")
        if m == "energy_bowl": S.append("Ajouter une pincée de cannelle ou de cacao non sucré pour le goût.")
    elif m == "smoothie":
        S.append(f"Mettre {_q(st)}, {_q(dairy)} et {fr} dans un blender.")
        S.append("Mixer 1 minute jusqu'à une texture lisse ; ajouter quelques glaçons si souhaité.")
        S.append("Servir immédiatement dans un grand verre.")
    elif m in ("pancakes", "crepes", "bowl_cake", "baked_oats"):
        S.append(f"Mixer {_q(st)} en poudre fine, mélanger avec {_q(dairy)} et {'la moitié de ' + fr + ' écrasé' if fruit else 'un œuf'}.")
        if m == "pancakes": S.append("Cuire de petits pancakes 2 minutes par face dans une poêle antiadhésive chaude, sans matière grasse.")
        elif m == "crepes": S.append("Détendre avec un peu d'eau, cuire de fines crêpes 1 minute par face.")
        elif m == "bowl_cake": S.append("Verser dans un bol et cuire 2 à 3 minutes au micro-ondes (ou 15 min au four à 180 °C).")
        else: S.append("Verser dans un petit plat et enfourner 20 minutes à 180 °C.")
        if fruit: S.append(f"Servir avec le reste de {fr} en morceaux.")
    elif m in ("savory_toast",):
        S.append(f"Toaster {_q(st)}.")
        if dairy: S.append(f"Tartiner avec {_q(dairy)}.")
        if p: S.append(f"Déposer {pn(p)}.")
        if fruit: S.append(f"Accompagner de {fr}.")
    elif m in ("omelette", "scrambled"):
        S.append(f"Battre les œufs ({_q(p)}) avec une pincée de sel et de poivre.")
        S.append("Cuire à feu doux dans une poêle antiadhésive en remuant délicatement, 3 à 4 minutes." if m == "scrambled" else "Cuire l'omelette 3 à 4 minutes à feu moyen, replier.")
        if st: S.append(f"Servir avec {_q(st)}{' et ' + _q(dairy) if dairy else ''}.")
        if fruit: S.append(f"Terminer par {fr}.")
    else:  # savory_plate
        if p: S.append(f"Disposer {pn(p)} dans l'assiette.")
        if st: S.append(f"Ajouter {_q(st)}{' et ' + _q(dairy) if dairy else ''}.")
        if fruit: S.append(f"Accompagner de {fr}.")
    return S


def pn(p: Dict[str, Any]) -> str:
    t = FOODS[p["food_id"]]["tags"]
    if "egg" in t:
        return f"les œufs ({_q(p)}) cuits au plat ou brouillés"
    return _q(p)


def build_snack_steps(comp: Dict[str, Dict[str, Any]]) -> List[str]:
    S = []
    if comp.get("fruit"): S.append(f"Prendre {_q(comp['fruit'])}, entier ou en morceaux.")
    if comp.get("oleaginous"): S.append(f"Ajouter {_q(comp['oleaginous'])} (une petite poignée).")
    if comp.get("chocolate"): S.append(f"Terminer par {_q(comp['chocolate'])}, à savourer lentement.")
    if comp.get("dairy"): S.append(f"Compléter avec {_q(comp['dairy'])}.")
    return S

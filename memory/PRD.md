# Mon plan alimentaire — PRD

## Vision
Application mobile (Expo React Native) portage de https://elegant-starlight-eebd4c.netlify.app — un outil français premium de plan alimentaire hebdomadaire suivant les recommandations d'une diététicienne. Thème premium foncé (vert mousse / or antique / obsidienne), pas d'IA, tout en français.

## Fonctionnalités livrées (MVP)

### Authentification
- **Email/mot de passe** (bcrypt, min 6 caractères)
- **Google (Emergent Google Auth)** — flow universel avec `POST /api/auth/session`
- Sessions 7 jours en SecureStore (mobile) / localStorage (web)

### Configuration des cibles (Planner / Bottom sheet)
- 4 repas configurables : Petit-déjeuner, Déjeuner, Collation, Dîner
- Petit-déjeuner : variantes "Les deux / Sucré / Salé"
- Toggle actif/inactif par repas
- Steppers +/- 10g par aliment de référence
- Durée du programme : 2 / 4 / 6 / 8 semaines

### Génération de menus
- Génération server-side d'un programme complet (semaines × 7 jours × repas actifs)
- Pool d'aliments par catégorie (féculents, protéines, laitages, fruits, légumes, oléagineux, chocolat…)
- Persistance en MongoDB, historique interrogeable

### Accueil (Home)
- Salutation personnalisée + logout
- Carte hero éditoriale du jour
- Cartes statistiques (poids courant, delta, nb pesées)
- Menus du jour (semaine 1 · jour actuel)

### Inventaire maison
- 3 emplacements : Frigo / Congélateur / Placards
- Ajout via bottom sheet
- Toggle "priorité ⚡" en or antique
- Suppression rapide

### Suivi du poids
- Ajout de pesée (date, kg, tour de taille, énergie 1-5, satiété 1-5, activité 1-5, note)
- Graphique en barres (12 dernières pesées)
- Statistiques : dernière pesée, delta précédente, delta depuis début
- Historique complet supprimable

## Itération 2 — parité avec le site original (livrée)

### Moteur de recettes (backend `foods.py`, `recipes.py`, `engine.py`)
- ≈170 aliments (rayon de course, conversion cru/cuit, unités d'achat, saisonnalité des fruits)
- Équivalences avec conversion par portion (Viandes blanches / rouges / Poissons blancs / gras / Œufs / Crustacés / Tofu…, Féculents cuits / légumineuses / pommes de terre / pain…)
- ≈75 recettes types (livre pro + modèles adaptatifs : gratin, wok, curry, risotto, bowl, chakchouka, croque, papillote, mijoté… ; porridge, overnight oats, pancakes avoine, smoothie, tartines salées…) avec nom, étapes guidées, temps, difficulté (60 % Facile / 30 % Élaborée / 10 % Créative), image d'ambiance
- Règles : pas de même protéine déjeuner/dîner, anti-répétition sur la semaine, max fruits/jour, fromage max jour/semaine, produits sucrés max le matin, exclusions (aliment ou famille), priorité aux aliments Maison (⚡ urgent), recette de la semaine
- Cibles : 3 trames petit-déjeuner (salé / sucré céréales / sucré pain), variante Les deux / Sucré / Salé, aliment de référence par ligne, collation active, copier le déjeuner, réinitialiser, règles pro, durée 2/4/6/8 semaines, coller texte (`POST /targets/parse-text`)

### Courses (onglet dédié)
- Générées par semaine depuis les menus, groupées par rayon, quantités crues à acheter (+ « pour X g cuits »), unités approximatives (œufs, pots…), bloc « Déjà à la maison » exclu, cases à cocher persistées, barre de progression

### Actions repas (`POST /programs/{id}/meals/action`)
- ✓ Fait, ❤ Favori, avis (J'ai aimé / Moyen / Pas pour moi → recette évitée), 🔄 Changer le repas, ⚡ Je n'ai pas le temps, envies (frais / réconfort / rapide / végétarien), ↻ remplacer un aliment par un équivalent, ⇄ interversion déjeuner/dîner (si portions identiques)

### Écrans
- Accueil « Aujourd'hui » : hero, progression des repas faits, « À prévoir », cartes repas illustrées, Cuisiner / Fait
- Menus : semaine + jour, lignes illustrées, recette de la semaine, ✓ / 🔄, interversion
- Fiche recette (modal) : Dans votre assiette, Préparation, badges, toutes les actions
- Mode cuisine (plein écran, écran maintenu allumé) : étapes cochables, Repas terminé
- Config cibles (modal plein écran) + historique des programmes (charger / supprimer)
- Maison : options « Utiliser en priorité ce que j'ai » et regroupement ensemble / séparément

## Itération 3 — design lumineux & nouvelles fonctionnalités (livrée)
- **Thème clair premium par défaut** (crème #FAF7F0 / olive #1F2A1E / vert mousse #4E6B4A / or #B08D57), animations d'apparition (Reanimated FadeInDown) sur cartes et lignes
- **Export PDF** (Menus → 🖨) : semaine complète (menus, grammages, temps) + liste de courses par rayon ; impression sur web, partage PDF sur mobile (expo-print / expo-sharing)
- **Photos de plats** : appareil photo / galerie (expo-image-picker) → `POST /programs/{id}/meals/photo` → Emergent Object Storage (`backend/storage.py`), lecture `GET /files/{path}?token=`, suppression ; la photo remplace l'illustration du plat (recette, menus, accueil)
- **Rappel du jour** (Accueil) : prochain repas à prévoir, heure cible (7h30 / 12h30 / 16h30 / 19h30), temps de préparation, « Cuisiner »
- **Défis** (`GET /programs/{id}/badges`) : Première recette, Explorateur (10 recettes), Série de 3 jours, Gourmet (3 coups de cœur), Courses bouclées, Semaine parfaite — section « Mes défis » sur l'Accueil avec progression

## Itération 4 — confort & personnalisation (livrée)
- **Mode sombre** : écran Réglages (Accueil → ⚙) avec Lumineux / Sombre / Automatique, mémorisé sur l'appareil (AsyncStorage) ; `useTheme` réactif + `colors` dynamique (Proxy) dans `src/theme.ts` ; déconnexion déplacée dans Réglages
- **Partage de recette** (fiche → 🔗) : texte complet (nom, temps, assiette, étapes) via Share natif ; navigator.share ou presse-papiers sur web
- **Suivi visuel** : courbe SVG lissée par semaine (`WeightChart`), ligne d'objectif (`PUT /preferences/goal`), carte d'encouragement par paliers (25/50/75 %, objectif atteint) avec barre de progression
- **Notes personnelles** : note privée par recette (`PUT /preferences/notes`), pré-remplie à chaque retour de la recette

## Itération 5 — quotidien & motivation (livrée)
- **Hydratation** (Accueil) : anneau de progression, + / − verre, objectif ajustable (`/hydration/today`, `/hydration`, `/hydration/goal`)
- **Galerie photos** (`/photos`, `GET /photos`) : toutes les photos de plats groupées par programme / semaine, ouverture de la recette
- **Repas à l'extérieur** (fiche recette) : guide « Le bon choix au restaurant » adapté aux portions du repas + action `outside` (compté comme fait)
- **Recettes favorites** (`/favorites`, `GET /favorites`) : liste des coups de cœur du programme actif avec Cuisiner en un geste
- Accueil : raccourcis défilants Courses / Favoris / Photos / Maison

## Identité visuelle — logo « La Diététique, Aurelia Isnardon » (livré)
- Assets : `frontend/assets/brand/logo.png` (olive) et `logo-light.png` (crème, thème sombre) ; icône / adaptive icon / favicon / splash régénérés (fond crème #FAF7F0, variante sombre)
- Composant `BrandLogo` (taille, tagline) : écran de connexion (hero), inscription, chargement, en-tête Accueil, carte « À propos » dans Réglages, en-tête du PDF exporté

## Itération 6 — organisation & motivation (livrée)
- **Bilan hebdo** (Accueil, `GET /programs/{id}/recap/{week}`) : repas faits, hydratation moyenne, tendance poids, courses, conseil personnalisé
- **Recherche recettes** (Menus 🔍) : par nom ou ingrédient sur toutes les semaines, ouverture directe de la fiche
- **Batch cooking** (Menus → carte, écran `/batch`, `GET /programs/{id}/batch/{week}`) : aliments communs à plusieurs repas (quantité totale, repas concernés, conseil de conservation), 2 sessions suggérées, minutes gagnées
- **Splash animé** : logo (ZoomIn) + signature (FadeInUp), affichage minimum 1,3 s

## Itération 7 — cuisine au quotidien (livrée)
- **Substituts rapides** (fiche recette, tap sur un ingrédient) : équivalents de la même famille puis autres familles autorisées, grammages convertis (`GET /programs/{id}/meals/substitutes`, action `set_component`)
- **Portions famille** : ×2 / ×4 sur les quantités affichées, la portion personnelle reste visible
- **Minuteur cuisine** (mode cuisine) : « Lancer N min » sur les étapes chronométrées, pause / arrêt, vibration + alerte à la fin
- **Semaine prochaine** (Accueil, samedi/dimanche) : aperçu des menus de la semaine suivante, « Courses pour lundi » ouvre la liste de la bonne semaine

## Itération 8 — parité avec la nouvelle version du site (livrée)
- **Taille du foyer** sur les courses (Pour moi / ×2 / ×4, `?household=`) et **partage / copie** de la liste en texte
- **Annuler la dernière modification** de repas (snapshot serveur, action `undo`, boutons sur Menus et Recette)
- **Badges lifestyle** sur chaque recette : Sans cuisson · Sans four · À emporter · Air fryer OK
- **Semaine en cours automatique** (calculée depuis la date de création du programme) sur Accueil, Menus et Courses
- Déjà couvert par les itérations précédentes : recherche recettes, photos, favoris, mode cuisine, suivi poids avec tendance, badges/défis, coller texte, prépa (batch cooking), repas extérieur

## Itération 9 — impression frigo & confort (livrée)
- **Fiche frigo (2 pages max)** : Menus → 🖨 → « Fiche frigo » : page 1 tableau 7 jours × 4 repas avec grammages, page 2 exécution condensée des déjeuners/dîners (2 colonnes, étapes numérotées) ; + « Semaine + courses » et « Tout le programme »
- **Taille du texte** (Réglages : Normal / Grand / Très grand) appliquée à toute l'app via `makeStyles`, persistante
- **Sauvegarde** : export JSON (`GET /backup`) et restauration (`POST /backup/restore`) depuis Réglages
- **Guide de démarrage** 3 étapes sur l'Accueil sans programme

## Itération 10 — fiche frigo redessinée & invités (livrée)
- **Fiche frigo v2** : design épuré (cartes par jour, typographie serif/olive/or), sous chaque plat les ingrédients + la recette détaillée (étapes numérotées), vignettes photos, exactement 2 pages A4 (lundi→jeudi / vendredi→dimanche + repères)
- **Repas invités** : nombre de convives par repas (action `guests`, chips Pour moi / ×2 / ×4 dans la recette) → liste de courses adaptée, portion personnelle inchangée
- **Rappel pesée** (Suivi) : carte le lundi ou après 7 jours sans pesée, bouton « Peser »
- Non réalisé : liste de courses vocale (nécessite une synthèse vocale et un build natif)

## Stack technique
- Frontend : Expo Router 57, Reanimated 4, gorhom/bottom-sheet, expo-image, expo-linear-gradient, @react-native-vector-icons/lucide, expo-blur
- Backend : FastAPI, Motor (MongoDB), bcrypt, httpx (Emergent Google Auth)
- Storage : MongoDB (users, user_sessions, targets, programs, weights, inventory)

## Endpoints API (tous préfixés `/api`)
- `POST /auth/signup` `POST /auth/login` `POST /auth/session` `GET /auth/me` `POST /auth/logout`
- `GET /targets` `PUT /targets`
- `POST /programs/generate` `GET /programs` `GET /programs/current` `GET /programs/{id}` `DELETE /programs/{id}`
- `GET|POST|DELETE /weights` / `/weights/{id}`
- `GET|POST /inventory`, `PUT|DELETE /inventory/{id}`

## Design
- Palette lumineuse (depuis itération 3) : crème `#FAF7F0`, olive `#1F2A1E`, vert mousse `#4E6B4A` (brand), or antique `#B08D57` (accent) — le thème sombre reste défini dans `theme.ts`
- Typographie native, poids fins pour les titres, uppercase letter-spacing pour les eyebrows
- Bottom sheets @gorhom/bottom-sheet pour la config lourde
- 5 onglets bas : Accueil / Menus / Courses / Maison / Suivi

## Business enhancement — Monétisation possible (post-MVP)
Freemium : 1 programme actif gratuit ; abonnement mensuel pour multi-programmes, export PDF de la semaine, synchronisation cloud multi-appareils et mode partage avec la diététicienne (réduit le friction de re-saisir chez le pro).


## Itération 12 — bibliothèque d'équivalences & cohérence nutritionnelle (livrée)
- **Équivalences « Cible »** basées sur la bibliothèque professionnelle (valeurs du site d'origine) : portions par famille (`foods.py` EQUIVALENCES) + portions propres à l'aliment (`FOODS[...]["portion"]` : thon 100 g, raisin/cerises/figue 104 g). Sous chaque ligne : « Vous pouvez remplacer X g de … par : • Y g de … » recalculé à chaque changement de quantité (`src/equivalents.ts`, `foods.line_equivalents`). Changer l'aliment de référence convertit la quantité.
- **Règle pro pain/biscottes** : au déjeuner/dîner, pain ou biscottes à la place du féculent → +80 g de légumes ajoutés automatiquement (`engine.apply_bread_rule`, champ `rule_bonus` / `base_grams` sur les composants, affiché dans la fiche recette).
- **Collation** : groupe Laitage (0 g par défaut, équivalences du petit-déjeuner hors laits) — migration automatique des cibles existantes.
- **Ail & oignon** → catégorie « Condiments & aromates », plus jamais générés comme légume.
- **Exclusions** : aliments ET assaisonnements (extras) exclus jamais proposés (génération, substituts, recherche).
- **Recherche recettes élargie** (`GET /recipes/search?q=&meal=&filters=`) : idées hors menu compatibles avec portions/exclusions, filtres 🥡 À emporter / ⚡ ≤ 15 min / 🌱 Végétarien / 🍳 Sans four ; action `apply_recipe` (value `{blueprint_id, food_id}`) remplace le déjeuner/dîner du jour sélectionné.
- **+29 recettes** (104 modèles de repas principaux), variété : une recette de la semaine précédente revient rarement (`prev_bps`), références d'aliments vérifiées.
- **Nom du plat dynamique** après remplacement d'un ingrédient (`engine.rename_after_swap`).
- **Hydratation** : objectif de départ 1 L (4 verres de 25 cl), réglable par 0,25 L, affichage en litres.
- **Mes favoris** + **Contacter ma diététicienne** (mailto:aurelia.isnardon@gmail.com) sur l'Accueil et dans Réglages.
- Question support : export vers un autre compte Emergent → répondu (Save to GitHub / Pull from GitHub).

## Itération 13 — photos fidèles au plat & textes complets (livrée)
- `engine.pick_image` réécrit : l'aliment réellement servi prime (saumon/truite → photos saumon dont poke bowl ; thon → assiette thon ; crevettes/gambas → crevettes / pâtes aux crevettes / curry / salade / poêlée fruits de mer ; moules → poêlée fruits de mer ; poisson blanc → 3 photos de poisson blanc selon technique, jamais de saumon ; bœuf → steak / tranché ; volaille rôtie ; brochettes ; œufs au four ; gratin ; lasagnes ; parmentier ; soupes potimarron/tomate/verte ; ratatouille ; croque / sandwich / tartines ; riz cantonais ; nouilles ; mijoté). 30 nouvelles photos dans `recipes.IMG`. Migration automatique des programmes existants (`_ensure_metrics`) + collations renommées « A, B & C ».
- Textes : suppression des troncatures (noms de plats et ingrédients complets sur Accueil, Menus, Favoris, Rappel, Recette de la semaine), boutons de la fiche recette en retour à la ligne, libellés Suivi ajustés, bilan hydratation en litres.

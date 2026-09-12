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

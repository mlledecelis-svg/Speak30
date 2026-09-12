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
- Palette Glass/Luxe DARK : `#0A0A0A` (obsidienne), `#4E6B4A` (vert mousse — brand), `#B08D57` (or antique — accent)
- Typographie native, poids fins pour les titres, uppercase letter-spacing pour les eyebrows
- Bottom sheets @gorhom/bottom-sheet pour la config lourde
- 4 onglets bas : Accueil / Menus / Maison / Suivi

## Business enhancement — Monétisation possible (post-MVP)
Freemium : 1 programme actif gratuit ; abonnement mensuel pour multi-programmes, export PDF de la semaine, synchronisation cloud multi-appareils et mode partage avec la diététicienne (réduit le friction de re-saisir chez le pro).

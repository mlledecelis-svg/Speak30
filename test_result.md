#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
user_problem_statement: "Mon plan alimentaire (Expo + FastAPI). Itération 2 : reproduire fidèlement le site https://elegant-starlight-eebd4c.netlify.app — moteur de recettes (≈75 recettes types, étapes, temps, difficulté), liste de courses auto-générée par semaine et par rayon, mode cuisine, changer le repas / version rapide / envies, interversion déjeuner-dîner, favoris & avis, repas fait, priorité aux aliments Maison, coller texte du planning, règles pro, exclusions, historique des programmes."

backend:
  - task: "GET /api/library + GET/PUT /api/targets (nouvelle structure breakfast.savory/sweet_cereal/sweet_bread + items {category, ref, options, grams}, rules)"
    implemented: true
    working: "NA"
    file: "backend/server.py, backend/foods.py"
  - task: "POST /api/targets/parse-text (analyse texte collé)"
    implemented: true
    working: "NA"
    file: "backend/engine.py"
  - task: "POST /api/programs/generate — meals = {recipe{name,steps,minutes,difficulty,image,quick,moods}, components[], pantry_used, done, favorite, rating}; weeks[].featured; can_swap"
    implemented: true
    working: "NA"
    file: "backend/engine.py, backend/recipes.py"
  - task: "GET /api/programs/{id}/shopping/{week} + POST /shopping/toggle (sections par rayon, raw_grams, units, home list, progress)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
  - task: "POST /api/programs/{id}/meals/action (replace, quick, replace_component, done, favorite, rating, swap_day, mood)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
  - task: "GET /api/programs, POST /programs/{id}/activate, DELETE, GET /preferences"
    implemented: true
    working: "NA"
    file: "backend/server.py"

frontend:
  - task: "Accueil Aujourd'hui (hero, progression, cartes repas MealCard, Cuisiner/Fait, sélecteur semaine)"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/index.tsx, frontend/src/components/MealCard.tsx"
  - task: "Menus (semaine/jour, lignes repas avec image, ✓ fait, 🔄 changer, ⇄ déjeuner/dîner, recette de la semaine)"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/planner.tsx"
  - task: "Courses (onglet, semaine, progression, déjà à la maison, rayons, cases à cocher)"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/shopping.tsx"
  - task: "Fiche recette modal (/recipe) : ingrédients + swap composant, étapes, mode cuisine, changer, pas le temps, envies, favori, avis, fait"
    implemented: true
    working: "NA"
    file: "frontend/app/recipe.tsx"
  - task: "Mode cuisine (/cooking) étapes cochables + Repas terminé"
    implemented: true
    working: "NA"
    file: "frontend/app/cooking.tsx"
  - task: "Config cibles (/config) : saisie / coller texte, variantes petit-déj, 3 trames, steppers, chips aliment de référence, réinitialiser, copier déjeuner, collation active, règles pro, exclusions, durée, générer, historique"
    implemented: true
    working: "NA"
    file: "frontend/app/config.tsx"
  - task: "Maison : options priorité / regroupement (rules.pantry_priority, pantry_grouping)"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/inventory.tsx"

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 2

test_plan:
  current_focus:
    - "Backend: génération, courses, actions repas, parse-text"
    - "Frontend: flux complet config → génération → menus → recette → mode cuisine → courses"
  stuck_tasks: []
  test_all: true

agent_communication:
  - agent: "main"
    message: "Itération 2 complète. Credentials dans /app/memory/test_credentials.md (testuser1@test.fr / testpass123). Le programme existant de l'utilisateur test a déjà été régénéré au nouveau format. Web preview : les images Unsplash peuvent être lentes."

  - agent: "main"
    message: "Bug utilisateur : 'Générer mon programme' → écran d'erreur. Cause : cibles (targets) et programmes de l'ancien format (itération 1) en base → KeyError 'ref' (500) côté backend et crash de rendu côté frontend. Corrections : normalize_program robuste (migration des anciens formats, variantes, règles), suppression au démarrage des programmes ancien format, filtres NEW_FORMAT sur /programs*, api.ts tolérant aux réponses non-JSON, garde-fous frontend (options ?? [], meals sans recipe ignorés), Alert sur échec de génération. Plus dédup protéine midi/soir et swap_day (catégories + can_swap) corrigés après itération précédente."

  - agent: "main"
    message: "Itération 3 : thème lumineux (crème/olive/or) par défaut + animations FadeInDown ; Export PDF (bouton export-pdf sur Menus : expo-print/expo-sharing, print dialog sur web) ; Photos de plats (recipe-photo → expo-image-picker → POST /api/programs/{id}/meals/photo multipart (week,day,meal query) → Emergent Object Storage, lecture GET /api/files/{path}?token=..., DELETE photo) ; Rappel du jour (reminder-card / reminder-cook sur Accueil) ; Défis (GET /api/programs/{id}/badges, section 'Mes défis' badges-row / badge-<id> sur Accueil). EMERGENT_LLM_KEY ajouté dans backend/.env."

  - agent: "main"
    message: "Itération 4 : Mode sombre (écran /settings via open-settings sur Accueil : theme-light/dark/system, persistance AsyncStorage, logout-button déplacé dans Réglages) ; Partage recette (recipe-share : Share natif / navigator.share ou presse-papiers sur web) ; Suivi visuel (WeightChart SVG moyenne hebdo + ligne d'objectif, goal-input/goal-save → PUT /api/preferences/goal, milestone-card) ; Notes personnelles (note-input/note-save → PUT /api/preferences/notes {blueprint_id, note}, GET /api/preferences renvoie notes & goal_weight)."

  - agent: "main"
    message: "Itération 5 : Hydratation (GET /api/hydration/today, POST /api/hydration {delta}, PUT /api/hydration/goal {goal 2-20} ; HydrationCard sur Accueil : hydration-plus/minus/goal/count) ; Galerie photos (GET /api/photos ; écran /photos via home-go-photos, photo-tile-i) ; Favoris (GET /api/favorites ; écran /favorites via home-go-favorites, fav-row-i, fav-cook-i) ; Repas extérieur (action 'outside' dans meals/action → meal.outside + done ; recette : outside-toggle → outside-guide → outside-mark). Quick cards Accueil désormais défilantes (Courses, Favoris, Photos, Maison)."

  - agent: "main"
    message: "Itération 6 : Bilan hebdo (GET /api/programs/{id}/recap/{week} ; WeeklyRecap recap-card sur Accueil) ; Recherche recettes (Menus : search-toggle → search-input, search-results, search-result-i, filtre nom + ingrédients sur toutes les semaines) ; Batch cooking (GET /api/programs/{id}/batch/{week} ; Menus batch-open → écran /batch?week= : batch-hero, sessions, batch-group-<food_id>, batch-close) ; Splash animé (logo ZoomIn + tagline FadeInUp, min 1,3 s, testID splash)."

  - agent: "main"
    message: "Itération 7 : Substituts rapides (GET /api/programs/{id}/meals/substitutes?week&day&meal&index → {current, substitutes[{food_id, food_name, grams, same_family}]} ; action set_component {index, food_id} ; recette : tap component-i → subs-i → sub-<food_id>) ; Portions famille (people-1/2/4, people-hint, grammages ×n affichés, 'moi : X g') ; Minuteur cuisine (cooking : timer-start-i sur étapes contenant 'N min', timer-bar / timer-left / timer-toggle / timer-stop, vibration + Alert à 0) ; Semaine prochaine (Accueil, affichée samedi/dimanche si semaine suivante : next-week-card, next-week-shopping → Courses semaine suivante via param week, next-week-menus)."

  - agent: "main"
    message: "Itération 8 (parité nouvelle version du site) : Taille du foyer sur Courses (GET shopping/{week}?household=1..6, chips household-1/2/4, quantités ×n) ; Partager/copier la liste (champ text dans la réponse shopping, bouton share-shopping) ; Annuler la dernière modification (action 'undo' ; snapshot 'undo' sur le programme après replace/quick/replace_component/set_component/swap_day ; can_undo dans la réponse ; boutons undo-button (Menus) et recipe-undo (Recette)) ; badges lifestyle sur les recettes (recipe.lifestyle : Sans cuisson / Sans four / À emporter / Air fryer OK ; testID lifestyle-<badge>) ; semaine en cours automatique selon la date de création du programme (Accueil/Menus/Courses)."

  - agent: "main"
    message: "Itération 9 : Impression (Menus → 🖨 export-pdf ouvre print-options : print-fridge = fiche frigo 2 pages (page 1 tableau 7 jours × 4 repas, page 2 exécution condensée des recettes en 2 colonnes), print-week = semaine + courses, print-all = tout le programme) ; Taille du texte (Réglages text-scale-1/1.15/1.3, appliqué via makeStyles, persistant) ; Sauvegarde (GET /api/backup, POST /api/backup/restore ; Réglages backup-export / backup-input / backup-restore / backup-msg) ; Guide de démarrage 3 étapes (start-guide sur l'Accueil sans programme)."

  - agent: "main"
    message: "Itération 10 : Fiche frigo redessinée (buildFridgeHtml : cartes par jour en grille 2 colonnes, page 1 lundi→jeudi, page 2 vendredi→dimanche + repères ; sous chaque plat : ingrédients + recette détaillée (4 étapes déjeuner/dîner, 2 étapes petit-déj/collation) ; vignette photo si photo du plat) ; Planning invités (action 'guests' value 1-8 → meal.guests ; chips people-1/2/4 de la recette enregistrent désormais le nombre de convives ; la liste de courses multiplie les quantités de ce repas) ; Rappel pesée (Suivi : carte weigh-reminder le lundi ou si dernière pesée ≥ 7 jours, bouton weigh-now ouvre la saisie). Liste vocale non implémentée (nécessite TTS + build natif)."

  - agent: "main"
    message: "Itération 11 : Calories par plat (foods.KCAL kcal/100 g, component.kcal, recipe.kcal ; migration automatique des programmes existants via _ensure_metrics sur GET /programs/current et /programs/{id} ; affichage MealCard, lignes Menus + total journée day-kcal, badge recipe-kcal, kcal par ingrédient) ; Photos cohérentes : pick_image choisit l'image selon technique + protéine réellement servie (pâtes, risotto, curry, wok, gratin, bowl/salade, toast, œufs/chakchouka, crevettes, saumon, poisson blanc, tofu, viande rouge, volaille) et est recalculée lors des remplacements d'aliments ; Correction débordement des chips d'avis (J'ai aimé / Moyen / Pas pour moi) : hauteur auto, texte centré sur 2 lignes."

  - agent: "main"
    message: "Itération 12 : Équivalences bibliothèque (foods.EQUIVALENCES portions pro : pain pdj 40 / biscottes 25 / avoine 30 / granola 25 ; repas : féculents cuits 100, pdt 130, pain 35, biscottes 20 ; viande blanche 100, rouge 90, poisson blanc 120, gras 90, crustacés 120, tofu 90 ; portions par aliment FOODS[..]['portion'] : thon 100, raisin/cerises/figue 104) ; GET /api/library renvoie equivalences[].portion + foods[{id,name,portion}] + rules_info.bread_vegetable_bonus_g ; écran /config : bloc <testID>-equivalents 'Vous pouvez remplacer X g de … par : • Y g de …' sous chaque ligne, recalculé au changement de quantité ; chip de référence convertit la quantité. Règle pain/biscottes au déjeuner/dîner → +80 g légumes (component.rule_bonus, base_grams ; recette rule-bonus-i). Collation : ligne dairy (0 g) ajoutée automatiquement (GET /targets). Ail/oignon → cat 'condiment'. Exclusions : extras exclus filtrés (Ctx.extras_ok). Recherche élargie : GET /api/recipes/search?q=&meal=lunch&filters=takeaway,quick,veg,no_oven → results[{blueprint_id,name,image,minutes,quick,lifestyle,vegetarian,matched_food,ingredients}] ; Menus : filter-<k> chips, search-results (programme), suggestions-meta, suggestion-i, apply-i-lunch|dinner → action apply_recipe {blueprint_id, food_id} (snapshot undo). +29 recettes (104), prev_bps variété. Nom du plat mis à jour après remplacement d'ingrédient (rename_after_swap). Hydratation : goal par défaut 4 verres (1 L), HydrationCard en litres (hydration-count 'X L', hydration-goal-dec/inc par 0,25 L). Réglages : settings-favorites, settings-contact (mailto aurelia.isnardon@gmail.com) ; Accueil : home-contact. Tests iteration5 (goal 4, progress 75) et iteration11 (thon hors FATTY_FISH) mis à jour."

  - agent: "main"
    message: "Itération 13 : pick_image réécrit (aliment servi × technique ; poisson blanc ≠ saumon ; 30 nouvelles photos IMG : white_fish/_grill/_skillet, salmon_plate/_grill/_bowl, shrimp_curry/_pasta/_salad, seafood_pan, beef_steak/_sliced/_pasta, roast_poultry, skewers, tuna_salad, composed_salad, eggs_baked, soup_tomato/_pumpkin/_green, ratatouille, lasagna, parmentier, croque, sandwich, fresh_toast, fried_rice, noodles, stew, fish_tomato, curry_rice) ; _ensure_metrics migre images + noms de collation (format 'A, B & C') ; tartines_salees → image sweet_toast (tartines). Frontend : numberOfLines retirés (MealCard nom/ingrédients, planner rowName, favoris, rappel), featured 2 lignes, boutons recette flexWrap, libellés Suivi (Dernière / Écart préc. / Depuis début), WeeklyRecap hydratation en litres. Tests : test_iteration11 (cohérence via pick_image), test_iteration13 (agent) verts."

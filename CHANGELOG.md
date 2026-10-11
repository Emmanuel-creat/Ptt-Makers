# Journal des évolutions

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [2.7.0] : 2026-10-11

La logique d'un vrai logiciel : la deuxième vague du plan des 200 améliorations.

### Ajouté
- **Formules** : un champ de collection peut être calculé (`quantite * prix`), et un texte peut afficher le résultat d'un calcul : `{{prix * quantite}}`, `{{somme(produits.valeur)}}`, `{{moyenne(notes)}}`, `{{nombre(produits)}}`, `{{min(…)}}`, `{{max(…)}}`, `{{arrondi(total / 3, 2)}}`, et `&` pour coller des textes. Une formule fausse est signalée dans le panneau Variables et n'empêche jamais l'application de marcher ; une division par zéro n'affiche rien.
- **Recherche, filtre et tri** sur un tableau ou une répétition reliés à une collection : une variable de recherche (sans tenir compte des accents ni des majuscules, valeurs calculées comprises), un filtre (égal, différent, contient, plus grand, plus petit, coché, pas coché) dont la valeur peut suivre une variable, et un tri croissant ou décroissant. La collection ne change pas, seul l'affichage suit.
- **Vérification des formulaires** : un champ peut être obligatoire, demander un nombre minimal de caractères, un nombre entre un minimum et un maximum ; une adresse e-mail est toujours vérifiée. La nouvelle action « Vérifier un formulaire » affiche les erreurs sous les champs, place le curseur sur la première et arrête les actions suivantes. L'erreur disparaît dès que le champ est corrigé.
- **Pages qui reçoivent une valeur** : l'action « Aller sur une page » peut envoyer une valeur (`{{element.nom}}`), que la page range dans sa variable « Valeur reçue ». L'adresse devient `#fiche/Café`, qu'on peut partager.
- **Action « Attendre »** : une pause en millisecondes avant l'action suivante. La page montre ce qui a déjà changé avant chaque pause et chaque chargement.
- **Actions en chaîne** : un chargement d'API attend maintenant la réponse avant de passer à l'action suivante (le code généré utilise `async` et `await`).
- « Créer un formulaire et un tableau » ajoute une barre de recherche, rend le premier champ obligatoire et vérifie le formulaire avant d'ajouter la fiche.
- **Modèle Gestion de stock** : un champ calculé « Valeur », un chiffre clé qui additionne la valeur du stock et une recherche dans le tableau. Le **modèle Formulaire de contact** vérifie ses champs avant l'envoi.
- L'assistant IA connaît les formules, la vérification, la recherche, le filtre, le tri, les pages qui reçoivent une valeur et l'action « Attendre ».

### Modifié
- Renommer une variable met aussi à jour les formules, la recherche, la valeur reçue par une page et la valeur envoyée par « Aller sur une page ».
- Tests : 142 tests unitaires et 31 tests de bout en bout.

## [2.6.0] : 2026-10-11

Une vraie base de données dans le projet : la première vague du plan des 200 améliorations.

### Ajouté
- **Collections** : un nouveau type de variable, une liste de fiches aux champs typés (texte, nombre, date, oui/non, image, lien). Les champs et les fiches de départ se modifient dans le panneau Variables.
- **Import CSV** : un fichier séparé par des points-virgules, des virgules ou des tabulations remplit une collection ; les types des champs sont devinés (nombres à la française, dates jj/mm/aaaa, oui/non).
- **Tableau relié** : la propriété « Collection affichée » d'un tableau lui donne une colonne par champ ; il se met à jour tout seul, met les valeurs en forme (1 250,5 · 11/10/2026 · Oui), affiche les images et les liens, propose un bouton « Supprimer » par ligne et un texte quand la collection est vide.
- **Action « Ajouter une fiche à une collection »** : une valeur par champ, qui peut venir d'un champ de saisie (`{{nom_saisi}}`).
- **Créer un formulaire et un tableau** : un clic construit, pour une collection, le formulaire (un champ par champ, relié à une nouvelle variable), le bouton Ajouter qui vide ensuite le formulaire, et le tableau relié.
- **Garder dans le navigateur** : une variable cochée est enregistrée dans le navigateur de l'application générée et revient après un rechargement.
- Une **répétition** parcourt aussi une collection, et « Insérer une variable » propose directement ses champs (`{{element.prix}}`).
- « Retirer un élément » et « Vider une liste » marchent sur une collection ; le champ texte accepte le type **Date**.
- **Modèle Gestion de stock** : produits, formulaire, tableau, chiffre clé du nombre de produits, données gardées.
- L'assistant IA crée des collections (champs, fiches, données gardées), des tableaux reliés et l'action « Ajouter une fiche ».

### Corrigé
- Un champ relié à une variable Nombre accepte la virgule décimale (« 12,5 »).

### Modifié
- Tests : 126 tests unitaires et 31 tests de bout en bout.

## [2.5.0] : 2026-10-11

Des briques de logiciel professionnel : tableaux, graphiques, calendrier, kanban, discussion.

### Ajouté
- **Nouvelle famille « Pro »** dans la bibliothèque, avec 8 briques :
  - **Tableau** : titres de colonnes et lignes écrites en texte (cellules séparées par des points-virgules), lignes alternées, tri d'un clic sur un titre.
  - **Graphique** : barres, courbe ou anneau à partir de lignes « étiquette : valeur », avec unité, valeurs affichées, échelle ronde et légende.
  - **Chiffre clé** : libellé, grand chiffre, évolution en vert ou en rouge et icône dessinée, pour les tableaux de bord.
  - **Progression** : une barre de 0 à 100 %, qui peut suivre une variable (`{{score}}`).
  - **Calendrier** : un mois complet qui commence le lundi, avec les événements sur leurs jours.
  - **Kanban** : des colonnes de cartes ; dans l'application, on les fait glisser d'une colonne à l'autre ou on clique leur flèche, et les compteurs se mettent à jour.
  - **Discussion** : des bulles de conversation (les tiennes à droite) et une zone pour écrire et envoyer un message.
  - **Barre d'onglets** : la barre du bas des applications mobiles, avec une icône et le nom de chaque page, collée en bas de l'écran.
- Ces briques suivent le style du projet (couleurs, arrondis, relief, flou) et s'exportent en HTML, React et Vue.
- **Trois modèles** : Tableau de bord, Gestion de projet (kanban, calendrier, avancement relié à un bouton) et Messagerie mobile (trois écrans et barre d'onglets).
- L'assistant IA connaît les nouvelles briques et peut les utiliser.

### Modifié
- Tests : 112 tests unitaires et 29 tests de bout en bout.

## [2.4.0] : 2026-10-11

Une interface de logiciel professionnel, inspirée de Blender : sombre, compacte, rangée par espaces de travail.

### Ajouté
- **Interface pro** (par défaut) : gris sombre, panneaux serrés, champs et boutons compacts, couleur de sélection orange et bleu de marque, zone de création sur une grille.
- **Barre de menus** : Fichier, Édition, Ajouter, Affichage et Aide. Chaque commande affiche son raccourci ; on passe d'un menu à l'autre au survol, `Échap` referme.
- **Espaces de travail** en onglets : Construction, Style, Logique, Code et Aperçu. Chacun range les panneaux pour une tâche (par exemple Code ouvre le code en grand à droite, Logique ouvre les variables).
- **Barre d'outils verticale** sur la zone de création : sélectionner la page, ajouter une section, une carte, un titre, un paragraphe, un bouton, un champ, une image ou une icône près de la sélection.
- **Onglets d'icônes** dans les propriétés : Contenu, Mise en page, Apparence, Texte, Interactions et Style du projet, qui ouvrent et font défiler jusqu'à la bonne section.
- **Barre d'état** en bas : gestes utiles, nombre de briques, de pages et de variables, et version.
- **Écran d'accueil** au démarrage : nouveau projet depuis un modèle, projets récents, reprise du projet en cours, nouveautés et guide. Il se rouvre depuis Fichier, et se désactive avec « Afficher au démarrage ».
- **Interface classique** toujours disponible (bouton Disposition, réglage « Interface », ou menu Affichage), avec ses thèmes clair, sombre et système.

### Modifié
- Sur les écrans moyens, la barre du haut garde les icônes des boutons secondaires (leurs libellés restent dans les menus et pour les lecteurs d'écran).
- Tests : 94 tests unitaires et 27 tests de bout en bout.

## [2.3.0] : 2026-10-11

Premier pas de la version pro : un moteur de styles et 24 styles prêts à l'emploi.

### Ajouté
- **Studio de style** (sélectionne la page, puis « Style du projet ») : 24 styles qui habillent toutes les pages d'un clic. Néomorphisme sombre, nuit et jaune, verre givré, photo et tuiles de verre, verre de nuit à halos, verre liquide, néomorphisme clair, pâte à modeler, néobrutalisme, éditorial, typographie géante, utilitaire dense, bento, dégradé vif, pastel, chrome, Y2K, nature, terminal, carnet papier, pro sobre, spatial, dessiné à la main et collage.
- Chaque réglage du style se change à la main : couleur principale, texte sur la couleur, fond des pages (couleur ou dégradé), surfaces, texte, texte secondaire, barre de menu, bordures, ambiance claire ou sombre, arrondis des cartes et des boutons, relief (plat, doux, porté, néomorphisme, décalé, verre), intensité, flou derrière les surfaces, police du texte et police des titres.
- Quatre nouvelles polices : grotesque, éditoriale, géométrique et manuscrite (chargées depuis Google Fonts seulement quand le style les utilise).
- **Adapter toutes les briques au style** : retire les couleurs, bordures, ombres et arrondis donnés à la main pour que tout le projet suive le style (annulable).
- L'assistant IA choisit un style adapté à l'application qu'il crée, et garde tes réglages du Studio quand il modifie le projet.

### Modifié
- Les cartes, champs, boutons, onglets, accordéons, fenêtres, barres de menu et étiquettes prennent leurs couleurs dans le style du projet. Sans style, rien ne change à l'écran.
- Tests : 94 tests unitaires et 23 tests de bout en bout.

## [2.2.0] : 2026-10-11

Plus aucun emoji : des icônes dessinées à la place.

### Modifié
- La brique **Icône** propose 52 icônes dessinées en SVG (étoile, cœur, téléphone, e-mail, maison, fusée…), avec une recherche par nom. Elles suivent la taille et la couleur du texte, et s'affichent pareil sur tous les appareils.
- Les projets créés avant gardent leur icône : chaque ancien emoji est remplacé par l'icône dessinée équivalente.
- Le code exporté (HTML, React, Vue) contient le SVG de l'icône, sans emoji.
- Les modèles de départ, les messages de l'éditeur, le README et le guide n'utilisent plus d'emoji ; la documentation utilise des icônes dans `docs/icones/`.
- L'assistant IA n'écrit plus d'emoji : il ajoute une brique Icône quand il veut illustrer.

## [2.1.0] : 2026-10-11

Placer une brique où on veut : la page peut devenir une grille aimantée.

### Ajouté
- **Disposition « Sur une grille »** (Propriétés de la page, Mise en page) : la page devient une grille de 12 colonnes et de rangées de 40 px. Une brique glissée se pose sur la case la plus proche, par exemple un bouton de menu tout en haut à gauche.
- Pendant un glisser-déposer, les lignes de la grille ressortent et un cadre montre la case où la brique va se poser, avec son numéro de colonne et de rangée.
- **Poignée de taille** en bas à droite de la brique sélectionnée, et réglages **Colonne, Rangée, Largeur (colonnes), Hauteur (rangées)** dans les propriétés.
- Raccourcis : `Alt + ↑ / ↓` monte ou descend la brique d'une rangée, `Alt + ← / →` la décale d'une colonne.
- En passant sur la grille, chaque brique garde à peu près sa hauteur ; en revenant « En pile », elles s'empilent à nouveau.
- Sur mobile (moins de 600 px), les briques de la grille s'empilent dans l'ordre de lecture (de haut en bas, de gauche à droite), dans l'éditeur comme dans le code exporté.
- Le code généré utilise CSS Grid (`grid-column`, `grid-row`), et l'assistant IA sait créer et modifier des pages en grille.
- Tests : 84 tests unitaires et 21 tests de bout en bout.

## [2.0.0] : 2026-10-11

**Ptt-Makers Pro** : un assistant IA construit des applications complètes avec les mêmes briques que toi.

### Ajouté
- **Assistant IA** (bouton « Assistant IA · Pro ») avec trois modes :
  - **Créer une appli** : décris ton idée, l'assistant fabrique un nouveau projet (pages, briques, variables, actions, thème) qui s'ouvre dans Mes projets.
  - **Modifier ce projet** : une consigne (« ajoute une page contact et un menu ») et le projet est mis à jour ; `Ctrl/⌘ + Z` annule.
  - **Expliquer le code** : une question sur le code généré, la réponse s'écrit en direct.
- Deux façons de connecter l'assistant : une **clé API Anthropic personnelle**, gardée dans le navigateur, ou un **serveur relais** (dossier `serveur-ia/`, Cloudflare Worker gratuit) qui garde la clé côté serveur pour une classe ou un club.
- L'assistant utilise le modèle Claude Opus 5.5 avec une sortie JSON contrôlée par un schéma : le projet reçu est vérifié avant d'être ouvert (briques, propriétés et actions inconnues ignorées).
- Tests : 78 tests unitaires (format d'échange, aller-retour de tous les modèles, relais) et 20 tests de bout en bout (dont l'assistant avec une API simulée).

## [1.3.0] : 2026-10-11

Apprendre en jouant, partager d'un lien et continuer dans React ou Vue.

### Ajouté
- **Défis guidés** (bouton « Défis ») : 6 défis du plus facile au plus avancé (première page, compteur, bonjour prénom, liste de courses, site de deux pages, fenêtre surprise). Chaque défi s'ouvre dans un nouveau projet ; une carte suit les étapes, qui se cochent toutes seules, avec un indice pour la suivante.
- **Lien de partage** (Exporter) : le projet entier est compressé dans l'adresse. La personne qui ouvre le lien reçoit une copie dans « Mes projets ». Rien n'est envoyé sur un serveur.
- **Export React** (`App.jsx` + `App.css`) et **export Vue** (`App.vue`) : la structure devient du JSX ou un gabarit Vue, le comportement est lancé quand le composant s'affiche.
- Tests : 68 tests unitaires (dont le rendu des exports avec les vrais React et Vue) et 18 tests de bout en bout.

## [1.2.0] : 2026-10-11

Des sites plus riches et mieux rangés : six nouvelles briques, un thème, des blocs réutilisables, des réglages par écran et plusieurs projets.

### Ajouté
- **Nouvelles briques** : Onglets, Accordéon (questions-réponses), Fenêtre (modale à ouvrir par une action), Barre de menu (liens vers toutes les pages, page affichée mise en avant), Vidéo (YouTube ou fichier `.mp4`/`.webm`) et Icône (emoji). Les briques à contenu arrivent avec un exemple prêt à modifier.
- **Thème du projet** (réglages de la page) : couleur principale, arrondi et police, appliqués aux boutons, liens, onglets et champs.
- **Mes composants** : un bouton enregistre la brique sélectionnée et son contenu ; le bloc apparaît dans la bibliothèque, à glisser ou ajouter d'un clic autant de fois que voulu.
- **Réglages par format** : dans les propriétés, « Style pour » tous les écrans, la tablette ou le mobile, et « Masquer sur ce format ». Le CSS exporté contient les `@media` correspondants.
- **Mes projets** : plusieurs projets enregistrés dans le navigateur (ouvrir, dupliquer, supprimer). Un modèle ou un import crée un nouveau projet au lieu d'écraser l'actuel. `Ctrl/⌘ + S` enregistre tout de suite.
- Tests : 50 tests unitaires et 15 tests de bout en bout.

### Modifié
- L'ancien projet unique est repris automatiquement comme premier projet de « Mes projets ».

## [1.1.0] : 2026-10-11

Ptt-Makers sait maintenant créer de vraies petites applications : plusieurs pages, des listes, de la logique et des données venues d'Internet.

### Ajouté
- Mise en ligne automatique sur GitHub Pages à chaque mise à jour de `main`.
- Éditeur utilisable sur téléphone : une zone à la fois et une barre d'onglets en bas de l'écran.
- **Pages multiples** : onglets de pages au-dessus de la zone de création (ajouter, renommer, dupliquer, réordonner, choisir la page d'accueil, supprimer). L'export reste un seul fichier, avec une navigation par l'adresse (`#nom-de-la-page`).
- Action « Aller sur une page » et liens vers une page du projet. L'aperçu s'ouvre sur la page en cours d'édition.
- **Listes dynamiques** : variables de type Liste, brique **Répétition** qui crée une copie de son contenu par élément (`{{element}}`, `{{element.nom}}`, `{{position}}`), texte affiché quand la liste est vide, grille de cartes.
- Actions de liste : ajouter un élément, retirer l'élément de la copie cliquée (ou le premier, ou le dernier), vider la liste.
- **Conditions** : action « Si… alors… sinon… » (vrai, faux, égal, différent, plus grand, plus petit, vide, non vide), imbricable.
- **Données d'API** : action « Charger des données » (JSON) vers une variable, avec un chemin facultatif dans la réponse, et actions **au chargement de la page**.
- Images dont l'adresse peut venir d'une variable ou d'un élément de liste.
- Modèles : Liste de tâches, Annuaire (API), Site de plusieurs pages.
- Tests : 43 tests unitaires et 12 tests de bout en bout.

### Corrigé
- Un texte contenant `$&` ou `$'` était mal recopié dans la page exportée.
- Une page masquée (attribut `hidden`) restait visible à cause du style `.page`.

## [1.0.0] : 2026-10-11

Première version de Ptt-Makers.

### Ajouté
- Cahier des charges et dossier de conception (`docs/`).
- Espace de travail en quatre zones (outils, création, propriétés, aperçu/code), redimensionnables, repliables, aperçu à droite ou en bas, disposition mémorisée.
- Identité visuelle : logo, couleur de marque, code couleur des familles de briques, thèmes clair / sombre / système.
- 18 briques réparties en 4 familles, recherche dans la bibliothèque, ajout par glisser-déposer ou par clic.
- Zone de création : sélection, survol, indicateur de dépôt, réorganisation, barre d'actions flottante, fil d'Ariane, édition du texte sur place, formats mobile / tablette / ordinateur.
- Arbre des calques réorganisable, renommage des briques.
- Panneau Propriétés : contenu, mise en page, apparence, typographie, interactions, visibilité.
- Variables (texte, nombre, vrai/faux), textes dynamiques `{{nom}}`, liaison des champs, affichage conditionnel, renommage propagé.
- Actions au clic : modifier / ajouter / inverser une variable, afficher / masquer / basculer une brique, défiler, message, lien.
- Générateur de code HTML / CSS / JS lisible et commenté, coloration syntaxique, surlignage de la brique sélectionnée, copie et téléchargement.
- Aperçu interactif isolé, ouverture dans un nouvel onglet.
- Annuler / rétablir avec regroupement des frappes, copier / coller, dupliquer, raccourcis clavier.
- Sauvegarde automatique locale, export HTML autonome, fichiers séparés ou projet `.json`, import.
- Modèles : page vierge, page d'accueil, compteur, formulaire de contact, carte de profil.
- Mode débutant avec visite guidée et aides contextuelles.
- Tests : 31 tests unitaires (modèle, générateur, exécution du code exporté, éditeur) et 8 tests de bout en bout.
- Intégration continue GitHub Actions (lint, typage, tests, build, tests de bout en bout).

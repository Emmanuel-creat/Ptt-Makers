# Journal des évolutions

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

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

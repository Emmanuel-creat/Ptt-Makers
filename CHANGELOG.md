# Journal des évolutions

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

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

# Journal des évolutions

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

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

# Ptt-Makers : cahier des charges

> Version 1.3 · 11 octobre 2026

## 1. Problématique

Créer une application, même simple, demande aujourd'hui de maîtriser plusieurs langages (HTML, CSS, JavaScript), des outils de développement et des concepts abstraits (état, événements, mise en page). Les débutants abandonnent souvent avant d'avoir vu leur idée prendre forme, et les outils « no-code » existants cachent le code : on produit quelque chose, mais on ne comprend pas comment ça marche.

**Question de départ :** comment permettre à n'importe qui de transformer une idée en logiciel concret, rapidement, tout en comprenant ce qui se passe sous le capot ?

## 2. Solution imaginée

Ptt-Makers est un **atelier visuel de création logicielle** qui fonctionne dans le navigateur :

- on **assemble des briques visuelles** (sections, textes, boutons, champs, images…) par glisser-déposer ;
- on **règle leurs propriétés** (contenu, style, mise en page, interactions) dans un panneau dédié ;
- on **voit le résultat en direct** dans un aperçu interactif ;
- on **lit le code généré en temps réel** (HTML, CSS, JavaScript), avec la partie correspondant à la brique sélectionnée surlignée.

Le code produit est du web standard, lisible et commenté en français : il peut être téléchargé et réutilisé tel quel.

### Ce qui rend Ptt-Makers original

| Idée | Effet pour l'utilisateur |
|---|---|
| Lien visuel brique ↔ code | Sélectionner une brique surligne ses lignes de code : on apprend en construisant. |
| Briques d'interaction en langage naturel | « Quand on clique → ajouter 1 à *compteur* » génère un vrai gestionnaire d'événement JavaScript. |
| Variables et textes dynamiques | `Bonjour {{prenom}}` relie un champ de saisie à un texte, sans écrire de code. |
| Code pédagogique | Noms d'éléments lisibles, commentaires en français, structure simple. |
| Espace de travail personnalisable | Panneaux redimensionnables, repliables, aperçu à droite ou en bas, thème clair/sombre. |

## 3. Public visé

| Profil | Besoin principal |
|---|---|
| Débutant / élève | Créer un premier projet sans blocage et comprendre le code. Mode guidé avec explications. |
| Enseignant / formateur | Montrer le lien entre interface et code, préparer des modèles. |
| Utilisateur expérimenté | Prototyper vite une interface et récupérer un code propre. |

## 4. Périmètre fonctionnel (version 1)

### 4.1 Espace de travail
- **F1** Interface en quatre zones distinctes : outils (briques et calques), zone de création, propriétés, aperçu/code.
- **F2** Panneaux redimensionnables à la souris et au clavier, repliables, position du dock aperçu/code au choix (droite ou bas), réinitialisation de la disposition.
- **F3** Thème clair, sombre ou système. Préférences mémorisées.
- **F4** Mode débutant : visite guidée au premier lancement, descriptions des briques, aides contextuelles.

### 4.2 Briques
- **F5** Bibliothèque de briques classées par familles colorées :
  - *Structure* : Section, Ligne, Colonne, Grille, Carte
  - *Texte* : Titre, Paragraphe, Lien, Étiquette, Liste
  - *Interaction* : Bouton, Champ texte, Zone de texte, Case à cocher, Menu déroulant
  - *Médias* : Image, Séparateur, Espace
- **F6** Recherche dans la bibliothèque.
- **F7** Ajout par glisser-déposer ou par clic (ajout dans le conteneur sélectionné).

### 4.3 Zone de création
- **F8** Rendu fidèle des briques, sélection au clic, survol mis en évidence, indicateur de dépôt (avant / après / dedans).
- **F9** Réorganisation par glisser-déposer dans la zone de création et dans l'arbre des calques.
- **F10** Barre d'actions sur la brique sélectionnée : monter, descendre, dupliquer, sélectionner le parent, supprimer.
- **F11** Fil d'Ariane de la sélection.
- **F12** Formats d'affichage : mobile, tablette, ordinateur.

### 4.4 Propriétés
- **F13** Contenu propre à chaque brique (texte, lien, options…).
- **F14** Mise en page (direction, alignement, espacement, taille), apparence (couleurs, bordures, arrondis, ombres), typographie.
- **F15** Interactions : liste d'actions déclenchées au clic (modifier/ajouter à une variable, inverser une variable, afficher/masquer/basculer une brique, message, ouvrir un lien, défiler jusqu'à une brique).
- **F16** Variables du projet (texte, nombre, vrai/faux), liaison des champs de saisie, affichage conditionnel, textes dynamiques `{{variable}}`.

### 4.5 Aperçu et code
- **F17** Aperçu interactif en temps réel, isolé (iframe sandbox).
- **F18** Code HTML / CSS / JS généré en temps réel, coloration syntaxique, surlignage de la brique sélectionnée, copie en un clic.
- **F19** Export : page HTML autonome, projet `.json` ; import de projet `.json`.

### 4.6 Confort
- **F20** Annuler / rétablir (historique), raccourcis clavier, aide des raccourcis.
- **F21** Sauvegarde automatique locale.
- **F22** Modèles de départ : page vierge, page d'accueil, compteur, formulaire de contact, carte de profil.

### 4.7 Applications (version 1.1)
- **F23** Mise en ligne de l'éditeur sur GitHub Pages, utilisable sur téléphone (une zone à la fois, onglets en bas).
- **F24** Pages multiples : créer, renommer, dupliquer, réordonner, supprimer, choisir la page d'accueil ; naviguer par une action ou un lien ; export en un seul fichier avec navigation par l'adresse.
- **F25** Listes dynamiques : variables de type Liste, brique Répétition (`{{element}}`, `{{element.champ}}`, `{{position}}`), actions ajouter / retirer / vider.
- **F26** Conditions : action « Si… alors… sinon… » imbricable.
- **F27** Données d'API : action « Charger des données » (JSON) vers une variable, actions au chargement d'une page.

### 4.8 Sites plus riches (version 1.2)
- **F28** Briques Onglets, Accordéon, Fenêtre, Barre de menu, Vidéo et Icône, avec un contenu d'exemple à l'ajout.
- **F29** Thème du projet : couleur principale, arrondi, police.
- **F30** Mes composants : enregistrer un bloc et le réutiliser depuis la bibliothèque.
- **F31** Réglages par format : style propre à la tablette ou au mobile, masquer une brique sur un format ; export en `@media`.
- **F32** Mes projets : plusieurs projets dans le navigateur (ouvrir, dupliquer, supprimer) ; un modèle ou un import crée un nouveau projet.

### 4.9 Apprendre et partager (version 1.3)
- **F33** Défis guidés : objectifs en étapes vérifiées automatiquement sur le projet, avec indice et suivi des défis réussis.
- **F34** Lien de partage : le projet compressé dans l'adresse, ouvert comme une copie dans Mes projets.
- **F35** Export React (`App.jsx`, `App.css`) et Vue (`App.vue`).

## 5. Exigences non fonctionnelles

- **Ergonomie** : chaque outil identifiable (icône + libellé + couleur de famille), hiérarchie visuelle claire, retours visuels à chaque interaction.
- **Accessibilité** : navigation clavier, focus visible, contrastes WCAG AA, libellés ARIA, alternative au glisser-déposer (ajout par clic, boutons monter/descendre).
- **Performance** : mise à jour de l'aperçu et du code en moins de 100 ms pour un projet de taille courante.
- **Sécurité** : textes utilisateur échappés dans le code généré, aperçu isolé, liens limités à `http(s)`/`mailto`.
- **Portabilité** : application web statique, sans serveur, fonctionne sur les navigateurs récents.
- **Qualité** : code TypeScript typé, tests unitaires (modèle, génération de code) et tests de bout en bout.

## 6. Hors périmètre (pistes futures)

Comptes utilisateurs et sauvegarde en ligne, collaboration temps réel. Ces pistes sont planifiées dans les versions suivantes (voir le [journal des évolutions](../CHANGELOG.md)).

## 7. Critères d'acceptation

1. Un débutant crée une page avec un titre, un champ « prénom » et un texte « Bonjour {{prenom}} » sans écrire de code, et l'aperçu réagit à la saisie.
2. Le modèle « Compteur » fonctionne dans l'aperçu et dans la page HTML exportée.
3. Sélectionner une brique surligne son code HTML et CSS.
4. Annuler / rétablir couvre ajout, déplacement, suppression et modifications de propriétés.
5. Rechargement de la page : le projet et la disposition de l'espace de travail sont restaurés.
6. Le modèle « Liste de tâches » ajoute et retire des tâches dans l'aperçu ; le modèle « Site de plusieurs pages » passe d'une page à l'autre par un bouton et par le menu ; le modèle « Annuaire » affiche les données reçues d'une API.
7. Un bloc enregistré dans Mes composants se place à nouveau en un clic ; une brique masquée sur mobile disparaît de l'aperçu mobile seulement ; choisir un modèle garde l'ancien projet dans Mes projets.
8. Le défi « Ma première page » se coche au fil des ajouts ; un lien de partage ouvert dans un autre navigateur affiche le même projet ; l'export React s'affiche et fonctionne dans React.
9. Les tests automatisés passent (`npm test`, `npm run test:e2e`) et la compilation (`npm run build`) réussit.

# Guide d'utilisation de Ptt-Makers

## Premiers pas

1. Ouvre Ptt-Makers : une **visite guidée** présente les quatre zones (tu peux la revoir depuis l'aide `?`).
2. Choisis un **modèle** (bouton *Modèles* en haut à droite) ou pars d'une **page vierge**.
3. Ajoute des briques, règle-les, teste dans l'**aperçu**, lis le **code**.
4. **Exporte** ta page quand elle te plaît.

## Les quatre zones

| Zone | Où | À quoi elle sert |
|---|---|---|
| Outils | à gauche | **Briques** (la bibliothèque), **Calques** (la structure du projet), **Variables** (les données de l'application). |
| Création | au centre | Ta page, telle qu'elle sera. Clique pour sélectionner, glisse pour déplacer, double-clique un texte pour l'écrire directement. |
| Propriétés | à droite | Tout ce qu'on peut régler sur la brique sélectionnée. |
| Aperçu / Code | en bas (ou à droite) | L'application qui fonctionne vraiment, et son code HTML, CSS et JavaScript. |

Les bords entre zones se **redimensionnent** (glisser, ou flèches du clavier ; double-clic pour revenir à la taille par défaut). Le bouton ⚙ de la barre du haut permet de **masquer** une zone ou de placer l'aperçu **à droite** ou **en bas**.

## Les briques

| Famille | Briques |
|---|---|
| 🟪 Structure | Section, Ligne (côte à côte), Colonne (empilé), Grille, Carte, Répétition |
| 🟦 Texte | Titre, Paragraphe, Lien, Étiquette, Liste |
| 🟩 Interaction | Bouton, Champ texte, Zone de texte, Case à cocher, Menu déroulant |
| 🟧 Médias | Image, Séparateur, Espace |

- **Ajouter** : glisse une brique vers la zone de création (une ligne violette montre où elle ira), ou **clique** dessus pour l'ajouter dans la brique sélectionnée.
- **Déplacer** : glisse-la dans la zone de création ou dans les **calques** ; ou utilise les flèches de la barre flottante.
- **Renommer** : double-clic dans les calques, ou dans l'en-tête du panneau Propriétés.

## Rendre la page interactive

### Les variables
Une variable garde une information : un **texte**, un **nombre** ou **vrai/faux**. Crée-les dans l'onglet *Variables*.

- Pour **afficher** une variable dans un texte, écris `{{nom}}` (ou utilise le bouton `{ }` à droite du champ).
- Pour la **remplir** avec un champ de saisie, choisis-la dans *Enregistrer dans la variable*.
- Pour **montrer une brique seulement si** une variable est vraie, utilise *Afficher seulement si* (section Interactions).

### Les actions « au clic »
Dans la section **Interactions** d'une brique, ajoute des actions qui s'exécutent quand on clique dessus dans l'aperçu :
donner une valeur à une variable, ajouter un nombre, inverser vrai/faux, afficher/masquer une brique, défiler jusqu'à une brique, afficher un message, ouvrir un lien.

> Exemple : un bouton « + 1 » avec l'action *Ajouter 1 à compteur*, et un titre `{{compteur}}`. C'est le modèle **Compteur**.

Les actions sont rangées par familles : variables, listes, logique, pages et briques, autres (message, lien, données d'API).

### Les conditions
L'action **Si… alors… sinon…** teste une variable (vraie, fausse, égale à, plus grande que, vide…) et lance les actions de la branche *Alors* ou *Sinon*. Une condition peut en contenir d'autres.

> Exemple : *Si nouvelle n'est pas vide, alors ajouter `{{nouvelle}}` à taches et vider nouvelle, sinon afficher « Écris d'abord une tâche ».* C'est le bouton « Ajouter » du modèle **Liste de tâches**.

## Les listes

1. Dans *Variables*, crée une variable de type **Liste**. Ses éléments de départ s'écrivent un par ligne.
2. Ajoute une brique **Répétition** (famille Structure) et choisis la liste à parcourir.
3. Place des briques dedans : elles seront **copiées pour chaque élément**. Écris `{{element}}` pour afficher l'élément, `{{position}}` pour son numéro.
4. Un bouton placé dans la répétition peut **retirer l'élément de sa copie**.

![Le modèle Liste de tâches : une répétition, une condition « Si… alors… sinon… » et son code JavaScript](captures/liste-taches.png)

`{{taches}}` écrit ailleurs affiche le **nombre** d'éléments de la liste. Dans la zone de création, la première copie est modifiable et les suivantes apparaissent en transparence.

## Plusieurs pages

Les **onglets au-dessus de la zone de création** listent les pages. Le bouton **+ Page** en ajoute une ; le bouton **⋯** permet de la renommer, la dupliquer, la déplacer, en faire la page d'accueil (🏠) ou la supprimer. Double-clique un onglet pour le renommer.

Pour passer d'une page à l'autre : l'action **Aller sur une page**, ou un **Lien** dont le champ *Vers une page du projet* est rempli. L'aperçu s'ouvre sur la page en cours d'édition. Dans le code exporté, toutes les pages sont dans `index.html` et l'adresse se termine par `#nom-de-la-page`.

## Charger des données (API)

Sélectionne une page (*Réglages de la page*) puis la section **Au chargement de la page**, et ajoute l'action **Charger des données** :

- l'**adresse** d'une API qui renvoie du JSON (elle doit commencer par `https://`) ;
- la **variable** qui recevra le résultat (une Liste pour un tableau de données) ;
- un **chemin** facultatif pour ne garder qu'une partie de la réponse (ex. `results` ou `data.items`).

Dans une répétition, `{{element.name}}` ou `{{element.address.city}}` affiche un champ de chaque élément. Le modèle **Annuaire (API)** montre tout cela avec une API de démonstration.

## Comprendre le code

Ouvre l'onglet **Code** : `index.html` (la structure), `style.css` (l'apparence), `script.js` (le comportement).
Les lignes de la brique sélectionnée sont **surlignées**, et un point violet signale les fichiers qui la contiennent. Chaque élément porte l'identifiant visible dans les propriétés (ex. `#bouton-2`).

## Enregistrer et exporter

- Ton projet est **sauvegardé automatiquement** dans ton navigateur.
- **Exporter** propose : une page HTML autonome, les trois fichiers séparés, ou le projet `.json` (à réimporter plus tard).

## Raccourcis clavier

| Raccourci | Action |
|---|---|
| `Ctrl/⌘ + Z` · `Ctrl/⌘ + Maj + Z` | Annuler · Rétablir |
| `Suppr` | Supprimer la brique |
| `Ctrl/⌘ + D` | Dupliquer |
| `Ctrl/⌘ + C` · `Ctrl/⌘ + V` | Copier · Coller dans la sélection |
| `Alt + ↑` · `Alt + ↓` | Monter · Descendre |
| `Échap` | Sélectionner le parent |
| `Entrée` | Modifier le texte sur place |
| `?` | Aide |

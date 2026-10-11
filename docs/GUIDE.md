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
| 🟪 Structure | Section, Ligne (côte à côte), Colonne (empilé), Grille, Carte |
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

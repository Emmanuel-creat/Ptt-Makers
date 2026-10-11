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
| 🟪 Structure | Section, Ligne (côte à côte), Colonne (empilé), Grille, Carte, Répétition, Onglets, Accordéon, Fenêtre, Barre de menu |
| 🟦 Texte | Titre, Paragraphe, Lien, Étiquette, Liste |
| 🟩 Interaction | Bouton, Champ texte, Zone de texte, Case à cocher, Menu déroulant |
| 🟧 Médias | Image, Vidéo, Icône, Séparateur, Espace |

- **Ajouter** : glisse une brique vers la zone de création (une ligne violette montre où elle ira), ou **clique** dessus pour l'ajouter dans la brique sélectionnée.
- **Déplacer** : glisse-la dans la zone de création ou dans les **calques** ; ou utilise les flèches de la barre flottante.
- **Renommer** : double-clic dans les calques, ou dans l'en-tête du panneau Propriétés.

![Barre de menu, onglets, accordéon et icône dans la zone de création](captures/briques-avancees.png)

### Les briques avancées

- **Onglets** : chaque bloc à l'intérieur est un panneau, et son nom (dans les calques) devient le titre de l'onglet. Dans la zone de création, clique un titre pour modifier son panneau.
- **Accordéon** : même principe, chaque bloc est une question qui s'ouvre au clic. Le réglage « Premier ouvert » ouvre la première au départ.
- **Fenêtre** : elle est cachée au départ. Ajoute à un bouton l'action « Afficher une brique » pour l'ouvrir ; la croix ou un clic à côté la referme.
- **Barre de menu** : elle affiche un lien vers chaque page du projet et met en avant la page affichée.
- **Vidéo** : colle l'adresse d'une vidéo YouTube ou d'un fichier `.mp4` / `.webm`.
- **Icône** : choisis un emoji dans la grille ou tape le tien.

### Mes composants

Sélectionne un bloc (une carte, un menu…) et clique sur l'icône 📦 en haut des propriétés : il rejoint la famille **Mes composants** de la bibliothèque. Glisse-le ou clique dessus pour en placer une copie. Le × de la tuile le retire de la bibliothèque, sans toucher aux copies déjà placées.

## Thème et formats

- **Thème du projet** : sélectionne la page, puis ouvre « Thème du projet » dans les propriétés. La couleur principale, l'arrondi et la police s'appliquent aux boutons, liens, onglets et champs de tout le projet.
- **Style pour un format** : en haut des propriétés, « Style pour » choisit tous les écrans, la tablette (moins de 900 px) ou le mobile (moins de 600 px). Les réglages faits sur tablette ou mobile ne changent que ce format ; le chiffre à côté de l'icône compte ces réglages. « Masquer sur ce format » cache la brique sur ce format seulement (elle reste visible en transparence dans la zone de création).

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

## L'assistant IA (version Pro)

Le bouton **Assistant IA · Pro** ouvre l'assistant. La première fois, il demande comment se connecter :

- **Ta clé API Anthropic** (créée sur console.anthropic.com) : elle reste dans ton navigateur et n'est envoyée qu'à l'API d'Anthropic. Évite cette option sur un ordinateur partagé.
- **Ou l'adresse d'un serveur relais** : la clé est gardée sur un serveur (voir `serveur-ia/README.md`). Pratique pour une classe.

Ensuite, trois modes :

| Mode | Ce que tu écris | Ce qui se passe |
|---|---|---|
| Créer une appli | Une description (« un quiz de 3 questions avec un score ») | Un nouveau projet s'ouvre, construit avec les briques. Ton projet actuel reste dans Mes projets. |
| Modifier ce projet | Une consigne (« ajoute une page contact ») | Le projet ouvert est mis à jour. `Ctrl/⌘ + Z` annule tout le changement. |
| Expliquer le code | Une question (« à quoi sert afficher() ? ») | La réponse s'écrit en direct, en français simple. |

Tout ce que l'assistant crée se modifie ensuite à la main, comme n'importe quel projet.

## Les défis guidés

Le bouton **Défis** propose des objectifs à réaliser pas à pas (Facile, Moyen, Avancé). Un défi s'ouvre dans un nouveau projet ; une carte en bas à gauche de la zone de création montre les étapes. Elles se cochent toutes seules dès que ton projet les remplit, et la prochaine étape affiche un indice. La flèche réduit la carte, la croix la ferme.

## Comprendre le code

Ouvre l'onglet **Code** : `index.html` (la structure), `style.css` (l'apparence), `script.js` (le comportement).
Les lignes de la brique sélectionnée sont **surlignées**, et un point violet signale les fichiers qui la contiennent. Chaque élément porte l'identifiant visible dans les propriétés (ex. `#bouton-2`).

## Enregistrer et exporter

- Ton projet est **sauvegardé automatiquement** dans ton navigateur (`Ctrl/⌘ + S` enregistre tout de suite).
- **Mes projets** (en haut à droite) liste tous tes projets : ouvrir, dupliquer, supprimer. Choisir un modèle ou importer un `.json` crée un nouveau projet : l'actuel reste dans la liste.
- **Exporter** propose : une page HTML autonome, les trois fichiers séparés, un **composant React** (`App.jsx` et `App.css`), un **composant Vue** (`App.vue`), ou le projet `.json` (à réimporter plus tard).
- **Copier un lien de partage** met tout le projet dans l'adresse (rien ne part sur un serveur). La personne qui ouvre le lien reçoit sa propre copie dans « Mes projets ».
- Pour React ou Vue : crée un projet avec `npm create vite@latest` (modèle *react* ou *vue*), puis remplace `src/App.jsx` et `src/App.css`, ou `src/App.vue`, par les fichiers exportés.

## Raccourcis clavier

| Raccourci | Action |
|---|---|
| `Ctrl/⌘ + Z` · `Ctrl/⌘ + Maj + Z` | Annuler · Rétablir |
| `Ctrl/⌘ + S` | Enregistrer tout de suite |
| `Suppr` | Supprimer la brique |
| `Ctrl/⌘ + D` | Dupliquer |
| `Ctrl/⌘ + C` · `Ctrl/⌘ + V` | Copier · Coller dans la sélection |
| `Alt + ↑` · `Alt + ↓` | Monter · Descendre |
| `Échap` | Sélectionner le parent |
| `Entrée` | Modifier le texte sur place |
| `?` | Aide |

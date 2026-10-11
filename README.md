# Ptt-Makers

**L'atelier visuel de création logicielle.** Assemble des briques, règle-les, teste ton application en direct… et regarde le vrai code s'écrire en même temps.

👉 **Essayer en ligne : [emmanuel-creat.github.io/Ptt-Makers](https://emmanuel-creat.github.io/Ptt-Makers/)** (fonctionne aussi sur téléphone).

![Ptt-Makers en thème clair : bibliothèque de briques, zone de création, propriétés et code surligné](docs/captures/editeur-clair.png)

## Pourquoi ?

Créer une application demande de maîtriser plusieurs langages et des notions abstraites. Les outils « no-code » simplifient, mais cachent le code : on produit sans comprendre. Ptt-Makers fait les deux : on **construit visuellement** et on **apprend comment ça marche**, parce que chaque brique est reliée à ses lignes de HTML, CSS et JavaScript.

## Ce que tu peux faire

- 🧱 **25 briques** en 4 familles colorées (structure, texte, interaction, médias), dont des onglets, un accordéon, une fenêtre, une barre de menu et une vidéo, à glisser ou à ajouter d'un clic.
- 🖱️ **Zone de création** fidèle au résultat : sélection, glisser-déposer avec indicateur, barre d'actions flottante, édition du texte sur place, formats mobile / tablette / ordinateur.
- 🎛️ **Propriétés** claires : contenu, mise en page, apparence, typographie, interactions.
- ⚡ **Interactions sans code** : variables, textes dynamiques `{{nom}}`, champs reliés, affichage conditionnel, actions au clic.
- 📄 **Plusieurs pages** avec navigation, dans un seul fichier exporté.
- 🔁 **Listes dynamiques** : une brique Répétition affiche une copie par élément (tâches, fiches, produits…).
- 🧠 **Logique** : actions « Si… alors… sinon… » et **données d'API** chargées à l'ouverture d'une page.
- 🎨 **Thème du projet** (couleur, arrondi, police) et **Mes composants** : enregistre un bloc pour le réutiliser partout.
- 📱 **Réglages par format** : un style différent, ou une brique masquée, sur tablette ou sur mobile.
- 🗂️ **Mes projets** : plusieurs projets enregistrés dans le navigateur, et un **lien de partage** qui contient tout le projet.
- 🏆 **Défis guidés** : des objectifs en quelques étapes qui se cochent toutes seules.
- 👀 **Aperçu interactif** en temps réel, isolé dans une iframe.
- 💻 **Code en direct** (HTML / CSS / JS) commenté en français, coloré, avec **surlignage de la brique sélectionnée**.
- 🧭 **Espace de travail personnalisable** : panneaux redimensionnables et repliables, aperçu à droite ou en bas, thème clair / sombre / système.
- 🎓 **Mode débutant** : visite guidée, explications et astuces partout.
- ↩️ Annuler / rétablir, raccourcis clavier, sauvegarde automatique, 8 modèles de départ (dont une liste de tâches, un annuaire relié à une API et un site de plusieurs pages), export HTML, **composant React ou Vue**, ou projet `.json`.

![Ptt-Makers en thème sombre, format mobile, avec les calques et l'aperçu à droite](docs/captures/editeur-sombre.png)

## Démarrer

Prérequis : [Node.js](https://nodejs.org) 22 ou plus.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérification TypeScript + build de production dans `dist/` |
| `npm run preview` | Sert le build de production |
| `npm test` | Tests unitaires (Vitest) |
| `npm run test:e2e` | Tests de bout en bout (Playwright, Chromium) |
| `npm run lint` | Analyse statique (oxlint) |

Le dossier `dist/` est un site statique : il peut être hébergé tel quel (GitHub Pages, Netlify…).

## Documentation

- [Cahier des charges](docs/CAHIER_DES_CHARGES.md) : problématique, solution, fonctionnalités, critères d'acceptation.
- [Dossier de conception](docs/CONCEPTION.md) : architecture, modèle de données, identité visuelle, sécurité, tests.
- [Guide d'utilisation](docs/GUIDE.md) : prise en main et raccourcis.
- [Journal des évolutions](CHANGELOG.md).

## Pile technique

React 19 · TypeScript · Vite · Zustand · lucide-react · Vitest · Playwright. Aucune dépendance serveur.

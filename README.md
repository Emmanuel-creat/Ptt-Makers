# Ptt-Makers

**L'atelier visuel de création logicielle.** Assemble des briques, règle-les, teste ton application en direct… et regarde le vrai code s'écrire en même temps.

<img src="docs/icones/essayer.svg" width="18" height="18" alt=""> **Essayer en ligne : [emmanuel-creat.github.io/Ptt-Makers](https://emmanuel-creat.github.io/Ptt-Makers/)** (fonctionne aussi sur téléphone).

![L'interface pro de Ptt-Makers : barre de menus, espaces de travail, barre d'outils verticale, propriétés à onglets d'icônes et code surligné](docs/captures/interface-pro.png)

## Pourquoi ?

Créer une application demande de maîtriser plusieurs langages et des notions abstraites. Les outils « no-code » simplifient, mais cachent le code : on produit sans comprendre. Ptt-Makers fait les deux : on **construit visuellement** et on **apprend comment ça marche**, parce que chaque brique est reliée à ses lignes de HTML, CSS et JavaScript.

## Ce que tu peux faire

- <img src="docs/icones/espace.svg" width="18" height="18" alt=""> **Interface de logiciel pro**, façon Blender : barre de menus, espaces de travail (Construction, Style, Logique, Code, Aperçu), barre d'outils verticale, propriétés à onglets d'icônes, barre d'état et écran d'accueil. L'interface classique claire reste à un clic.
- <img src="docs/icones/briques.svg" width="18" height="18" alt=""> **25 briques** en 4 familles colorées (structure, texte, interaction, médias), dont des onglets, un accordéon, une fenêtre, une barre de menu et une vidéo, à glisser ou à ajouter d'un clic.
- <img src="docs/icones/zone-creation.svg" width="18" height="18" alt=""> **Zone de création** fidèle au résultat : sélection, glisser-déposer avec indicateur, barre d'actions flottante, édition du texte sur place, formats mobile / tablette / ordinateur.
- <img src="docs/icones/proprietes.svg" width="18" height="18" alt=""> **Propriétés** claires : contenu, mise en page, apparence, typographie, interactions.
- <img src="docs/icones/interactions.svg" width="18" height="18" alt=""> **Interactions sans code** : variables, textes dynamiques `{{nom}}`, champs reliés, affichage conditionnel, actions au clic.
- <img src="docs/icones/pages.svg" width="18" height="18" alt=""> **Plusieurs pages** avec navigation, dans un seul fichier exporté.
- <img src="docs/icones/listes.svg" width="18" height="18" alt=""> **Listes dynamiques** : une brique Répétition affiche une copie par élément (tâches, fiches, produits…).
- <img src="docs/icones/logique.svg" width="18" height="18" alt=""> **Logique** : actions « Si… alors… sinon… » et **données d'API** chargées à l'ouverture d'une page.
- <img src="docs/icones/theme.svg" width="18" height="18" alt=""> **Studio de style** : 24 styles prêts à l'emploi (néomorphisme, verre givré, néobrutalisme, bento, terminal…) qui habillent tout le projet d'un clic, et chaque réglage modifiable (couleurs, relief, flou, arrondis, polices).
- <img src="docs/icones/paquet.svg" width="18" height="18" alt=""> **Mes composants** : enregistre un bloc pour le réutiliser partout.
- <img src="docs/icones/formats.svg" width="18" height="18" alt=""> **Réglages par format** : un style différent, ou une brique masquée, sur tablette ou sur mobile.
- <img src="docs/icones/projets.svg" width="18" height="18" alt=""> **Mes projets** : plusieurs projets enregistrés dans le navigateur, et un **lien de partage** qui contient tout le projet.
- <img src="docs/icones/defis.svg" width="18" height="18" alt=""> **Défis guidés** : des objectifs en quelques étapes qui se cochent toutes seules.
- <img src="docs/icones/grille.svg" width="18" height="18" alt=""> **Placement libre sur une grille** : passe une page « Sur une grille » et pose chaque brique où tu veux (un bouton de menu en haut à gauche, une image à droite…), elle s'aimante sur la case la plus proche.
- <img src="docs/icones/assistant.svg" width="18" height="18" alt=""> **Version Pro, assistant IA** : décris une application, il la construit avec les briques ; il modifie ton projet sur demande et explique le code. Avec ta clé Anthropic ou un [serveur relais](serveur-ia/README.md).
- <img src="docs/icones/apercu.svg" width="18" height="18" alt=""> **Aperçu interactif** en temps réel, isolé dans une iframe.
- <img src="docs/icones/code.svg" width="18" height="18" alt=""> **Code en direct** (HTML / CSS / JS) commenté en français, coloré, avec **surlignage de la brique sélectionnée**.
- <img src="docs/icones/espace.svg" width="18" height="18" alt=""> **Espace de travail personnalisable** : panneaux redimensionnables et repliables, aperçu à droite ou en bas, thème clair / sombre / système.
- <img src="docs/icones/debutant.svg" width="18" height="18" alt=""> **Mode débutant** : visite guidée, explications et astuces partout.
- <img src="docs/icones/outils.svg" width="18" height="18" alt=""> Annuler / rétablir, raccourcis clavier, sauvegarde automatique, 8 modèles de départ (dont une liste de tâches, un annuaire relié à une API et un site de plusieurs pages), export HTML, **composant React ou Vue**, ou projet `.json`.

![Une page en grille : le bouton de menu est posé en haut à gauche, l'image en haut à droite](docs/captures/grille.png)

![L'assistant IA de la version Pro](docs/captures/assistant-ia.png)

![Le Studio de style : le style « Verre de nuit à halos » appliqué à tout le projet](docs/captures/studio-style.png)

![L'écran d'accueil : nouveau projet depuis un modèle, projets récents, nouveautés et guide](docs/captures/ecran-accueil.png)

![L'interface classique en thème clair : bibliothèque de briques, zone de création, propriétés et code surligné](docs/captures/editeur-clair.png)

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

# Ptt-Makers : dossier de conception

> Version 2.0 · 11 octobre 2026 · complète le [cahier des charges](CAHIER_DES_CHARGES.md)

## 1. Choix techniques

| Besoin | Choix | Pourquoi |
|---|---|---|
| Interface riche et réactive | **React 19 + TypeScript** | Composants réutilisables, typage strict du modèle de données. |
| Outillage | **Vite** | Démarrage instantané, build statique léger (~110 ko gzip). |
| État de l'éditeur | **Zustand** | Store simple, sélecteurs fins (seules les briques modifiées se redessinent), facile à tester hors React. |
| Icônes | **lucide-react** | Jeu cohérent, lisible, importé à l'unité. |
| Polices | **Inter** (interface) et **JetBrains Mono** (code), auto-hébergées | Lisibilité, pas d'appel réseau externe. |
| Tests | **Vitest** (+ jsdom) et **Playwright** | Unitaires rapides et parcours utilisateur réels dans Chromium. |

Aucun serveur : tout fonctionne dans le navigateur, le projet est sauvegardé dans le `localStorage`.

## 2. Architecture

```
src/
├── model/        Modèle de données (aucune dépendance à React)
│   ├── types.ts        Brique, style, action, variable, projet
│   ├── bricks.ts       Catalogue des 25 briques + familles
│   ├── actions.ts      Parcours des actions (conditions imbriquées comprises)
│   ├── tree.ts         Opérations sur l'arbre (insérer, déplacer, dupliquer…)
│   ├── freeGrid.ts     Page en grille : cases, tailles de départ, remise en ordre
│   ├── variables.ts    Textes dynamiques {{nom}}, conversions
│   ├── refactor.ts     Renommage / usages d'une variable
│   └── templates.ts    Modèles de départ + validation d'import
├── codegen/      Générateur de code (pur, testé)
│   ├── generate.ts     Projet → index.html + style.css + script.js + carte des lignes
│   ├── style.ts        Styles d'une brique (partagés éditeur / export)
│   ├── baseCss.ts      Styles de base des briques
│   ├── escape.ts       Échappement HTML/JS, liens sûrs
│   └── highlight.ts    Coloration syntaxique maison
├── store/
│   ├── editor.ts       Projet, sélection, glisser-déposer, historique, sauvegarde
│   └── workspace.ts    Disposition, thème, préférences (persistées)
├── components/   Interface (TopBar, PagesBar, Palette, Layers, Canvas, Inspector, Dock…)
├── hooks/        Raccourcis clavier, thème
└── styles/       Jetons de design + feuille de l'éditeur
```

### Flux de données

```
 Action utilisateur ──▶ store/editor (commit → historique) ──▶ project
                                                                  │
                    ┌─────────────────────────────────────────────┼──────────────────────┐
                    ▼                                             ▼                      ▼
        Zone de création (CanvasNode)               codegen/generate()        Sauvegarde locale
        même HTML + mêmes styles                    │            │            (300 ms de délai)
                                                     ▼            ▼
                                              Aperçu (iframe)   Onglet Code + surlignage
```

Principe clé : **une seule source de vérité pour le rendu**. `styleEntries()` produit les déclarations CSS d'une brique ; la zone de création les applique en `style` React et le générateur les écrit dans `style.css`. Les classes de base (`.btn`, `.card`, `.field`…) sont injectées dans l'éditeur exactement comme dans le code exporté. Ce qu'on voit en créant est donc ce qu'on obtient.

## 3. Modèle de données

Le projet est un **arbre aplati** : un dictionnaire `id → brique`, chaque brique connaissant son parent et ses enfants. Les mises à jour sont immuables (copie des seuls nœuds touchés), ce qui rend l'historique annuler/rétablir trivial (on garde les versions précédentes) et les rendus React efficaces.

```ts
interface BrickNode {
  id: string            // lisible et unique : « bouton-2 », sert aussi d'id HTML
  type: BrickType       // 'button', 'card', 'heading'…
  name: string          // nom affiché dans les calques
  props: Record<string, string | number | boolean>  // contenu
  style: BrickStyle     // mise en page, apparence, typographie
  children: string[]
  parent: string | null
  onClick: Action[]     // interactions
  onLoad?: Action[]     // pages : actions au chargement
  hidden?: boolean      // masquée au démarrage
  showIf?: string       // visible si la variable est vraie
  responsive?: { tablet?: StyleOverride; mobile?: StyleOverride }  // réglages par format
  place?: { col: number; row: number; w: number; h: number }      // case sur une page en grille
}
```

Un projet contient plusieurs **pages** : `pages` liste les briques « page » (sans parent) dans l'ordre des onglets, et `rootId` désigne la page d'accueil. Les anciens projets (sans `pages`) sont mis à niveau à l'ouverture (`parseProject`).

Les variables ont quatre types : texte, nombre, vrai/faux et **liste** (valeur de départ : une liste de textes ; à l'exécution, une liste peut aussi contenir les objets reçus d'une API).

Les **identifiants lisibles** (`titre-1`, `bouton-3`) sont un choix pédagogique : ils apparaissent tels quels dans le HTML, le CSS et le JavaScript, ce qui permet de relier facilement ce qu'on voit à ce qu'on lit.

### Interactions

Une action est un objet simple, traduit en une ligne de JavaScript lisible :

| Action | Code généré |
|---|---|
| Ajouter 1 à `score` | `etat.score = etat.score + 1;` |
| Donner « Bonjour » à `msg` | ``etat.msg = `Bonjour`;`` |
| Inverser `ouvert` | `etat.ouvert = !etat.ouvert;` |
| Afficher / masquer une brique | `document.getElementById("carte-1").toggleAttribute("hidden");` |
| Message | ``alert(`Merci ${etat.nom} !`);`` |
| Ajouter à une liste | ``etat.taches.push(`${etat.nouvelle}`);`` |
| Retirer l'élément de la copie | `etat.taches.splice(position - 1, 1);` |
| Si… alors… sinon… | `if (etat.score > 10) { … } else { … }` |
| Aller sur une page | `allerA("page-2");` |
| Charger des données | `fetch(…).then((reponse) => reponse.json()).then((donnees) => { … })` |

Le script généré suit toujours le même plan, commenté en français : 1) les variables (`etat`), 2) la fonction `afficher()` qui met la page à jour, puis selon le projet la liaison des champs, les réactions aux clics, la navigation entre les pages et les actions au chargement. Les sections absentes ne sont pas écrites, et les numéros se suivent.

### Répétitions

Une brique **Répétition** devient un `<template>` dans le HTML. Son contenu est enveloppé dans `<div class="repeat-item">` (en `display: contents`, pour que la mise en page de la répétition s'applique directement aux briques). Comme il y aura plusieurs copies, les briques répétées n'ont pas d'`id` mais une classe du même nom (`.texte-2`), utilisée par le CSS et le JavaScript. La fonction `rendreListe()` clone le modèle pour chaque élément ; le code de chaque copie reçoit `copie`, `element` et `position`, ce qui permet à un bouton de retirer « son » élément. Une répétition placée dans une autre est rendue comme un simple bloc.

### Pages

Toutes les pages sont dans `index.html` (`<main class="page">`), seules les autres pages ont l'attribut `hidden`. `afficherPage()` lit l'adresse (`#page-2`) et montre la bonne page ; `allerA()` change l'adresse ; les liens `href="#…"` vers une page passent par `allerA()` (indispensable dans l'aperçu `srcdoc`, où une ancre serait résolue par rapport à l'adresse de l'éditeur). L'aperçu démarre sur la page éditée en remplaçant la constante `PAGE_DEPART`.

### Thème, composants et formats

- `theme` (facultatif) garde la couleur principale, l'arrondi et la police. Le CSS de base utilise des variables (`var(--couleur, #6c5ce7)`, `var(--arrondi)`, `var(--police)`) : le générateur écrit seulement un bloc `:root` quand un thème est choisi, et la zone de création pose les mêmes variables sur son cadre.
- `components` garde les blocs de « Mes composants » : chacun est un petit arbre aplati copié au moment de l'enregistrement. L'insertion le clone avec de nouveaux identifiants (`cloneSubtree`), comme un coller.
- `responsive.tablet` et `responsive.mobile` ne gardent que les différences avec le style de base, plus `hide`. Le CSS exporté les écrit dans `@media (max-width: 900px)` puis `@media (max-width: 600px)` ; la zone de création calcule le style affiché avec `effectiveStyle(brique, format)`.

### Briques avancées

Les onglets donnent une barre de boutons `role="tab"` puis un panneau par bloc enfant (les suivants avec `hidden`) ; l'accordéon donne des `<details>`/`<summary>` (aucun script) ; la fenêtre est un fond fixe `hidden` contenant `.modal-box`, sur laquelle porte le style réglé ; la barre de menu écrit un lien par page, que `afficherPage()` met en avant. Une vidéo YouTube passe par `youtube-nocookie.com`.

### Plusieurs projets

Chaque projet est rangé sous sa propre clé (`ptt-makers:projet:<id>`), avec un index (`ptt-makers:projets` : nom, date, nombre de pages) et l'identifiant du projet ouvert. Ouvrir un projet repart d'un historique vide. Le projet unique de la version 1.0 est repris au premier lancement.

### Défis, partage et export React / Vue

- Un **défi** (`src/model/challenges.ts`) est une liste d'étapes ; chaque étape est une fonction `done(projet)` qui lit le projet (briques, variables, actions, thème). La carte du défi recalcule les étapes à chaque modification : il n'y a rien à « valider ».
- Le **lien de partage** contient le projet en JSON compressé (`CompressionStream('deflate-raw')`) puis encodé en base64 pour une adresse (`#projet=…`). À l'ouverture, `parseProject` vérifie le contenu, le projet est ajouté à Mes projets et l'adresse est nettoyée.
- **React et Vue** (`src/codegen/frameworks.ts`) partent du code généré : le HTML devient du JSX (`class` → `className`, valeurs de départ en `defaultValue`, commentaires en `{/* */}`) ou un gabarit Vue avec `v-pre` (les `{{…}}` restent pour le script), et le script est lancé dans `useEffect` (une seule fois, même en mode strict) ou `onMounted`. Le modèle d'une répétition reste un `<template>` HTML.

### Page en grille (version 2.1)

- Une page passe en placement libre avec la propriété `layout: 'grille'`. Sa classe devient `page grille` : `display: grid`, 12 colonnes `minmax(0, 1fr)` et des rangées `minmax(40px, auto)` (une rangée s'agrandit si son contenu dépasse, rien n'est coupé).
- Chaque enfant direct garde sa case dans `place` (colonne, rangée, largeur, hauteur), traduite en `grid-column: 1 / span 3; grid-row: 1 / span 1`. Les chevauchements sont permis, comme sur une table de montage.
- `fixPlacements` (`src/model/freeGrid.ts`) passe après chaque modification : une brique arrivée sur la grille sans case est posée sous les autres, une brique sortie de la grille perd sa case, deux copies superposées sont séparées, et l'ordre des enfants suit la grille (de haut en bas, de gauche à droite). Cet ordre sert sur mobile : une requête de conteneur (`@container (max-width: 600px)`) remet chaque brique sur toute la largeur, dans l'ordre du document.
- Dans la zone de création, la case visée se calcule à partir des pistes que le navigateur a vraiment tracées (`getComputedStyle(page).gridTemplateColumns` et `gridTemplateRows`), puis on prolonge avec des rangées de 40 px sous la dernière brique. On mémorise l'endroit où la brique a été attrapée, pour qu'elle ne saute pas sous le pointeur.

### Assistant IA (version Pro)

- **Format d'échange** (`src/ai/format.ts`) : les schémas JSON des sorties structurées ne peuvent pas être récursifs. Le projet est donc décrit à plat, comme le modèle interne : une liste de pages et une liste de briques qui nomment leur parent par une `ref`. Propriétés et styles sont des listes clé / valeur, et une action « Si » contient des actions simples. Le schéma est construit à partir du catalogue des briques, et la liste des briques avec leurs propriétés est écrite dans les consignes de l'IA à partir du même catalogue : une nouvelle brique est connue de l'assistant sans autre changement.
- **Vérification** : `aiToProject` reconstruit le projet avec `buildApp` (le même code que les modèles). Briques, propriétés, styles et noms de variables inconnus sont ignorés ; une brique au parent inconnu va sur la première page. `projectToAi` fait le chemin inverse pour le mode « Modifier » ; l'aller-retour de chaque modèle redonne exactement le même code.
- **Appel** (`src/ai/assistant.ts`) : SDK officiel `@anthropic-ai/sdk`, chargé seulement à la première utilisation. Modèle `claude-opus-5-5`, réponse en flux (on affiche le nombre de caractères reçus), `output_config.format` avec le schéma, et le repli automatique du serveur en cas de refus. Les erreurs de l'API sont traduites en messages clairs.
- **Clé** : en mode clé personnelle, le navigateur appelle l'API directement (option `dangerouslyAllowBrowser` du SDK) ; la clé reste dans le stockage local de ce navigateur. Le **relais** (`serveur-ia/worker.js`) n'accepte que `POST /v1/messages` depuis les origines autorisées, impose le modèle, limite la taille des réponses et ajoute la clé côté serveur.

## 4. Identité visuelle

- **Nom et logo** : trois briques empilées aux couleurs des familles, la brique du haut en violet de marque.
- **Couleur de marque** : violet `#6C5CE7` (clair) / `#8A7BFF` (sombre), pour évoquer la créativité, technologie, douceur.
- **Familles de briques** (code couleur constant : bibliothèque, calques, cadres de sélection, propriétés) :
  - Structure `#6C5CE7` · Texte `#0B9BD8` · Interaction `#0FA678` · Médias `#E8900C`
  - Les variables ont leur propre accent rose `#EC4899` (`{ }`).
- **Typographie** : Inter (interface, 13,5 px de base), JetBrains Mono sans ligatures pour le code.
- **Formes** : rayons 7 / 10 / 14 px, ombres douces, fond de zone de création pointillé façon « table à dessin ».
- **Thèmes** : clair, sombre ou système ; tous les jetons sont des variables CSS (`src/styles/tokens.css`).
- **Mouvement** : transitions courtes (150–300 ms), désactivées si l'utilisateur préfère réduire les animations.

## 5. Ergonomie

- **Quatre zones** séparées par des poignées redimensionnables (souris ou clavier), chacune repliable ; l'aperçu se place à droite ou en bas. La disposition est mémorisée.
- **Toujours plusieurs façons de faire** : glisser-déposer *ou* clic ; zone de création *ou* calques ; barre d'outils flottante *ou* raccourcis clavier.
- **Retour immédiat** : cadre de sélection coloré par famille, survol, indicateur de dépôt (ligne avant/après ou cadre « Dans … »), notifications, point « en direct ».
- **Mode débutant** (activé par défaut) : visite guidée, descriptions de chaque brique et famille, astuces contextuelles, explication du surlignage du code. Désactivable pour les utilisateurs expérimentés.
- **Accessibilité** : rôles ARIA (onglets, arbre, séparateurs, fenêtres modales), focus visible, focus piégé dans les fenêtres, libellés sur tous les boutons icônes.

## 6. Sécurité

- Tous les textes saisis sont échappés dans le HTML ; le JavaScript utilise des gabarits échappés et `textContent`.
- Les valeurs de style passent par une liste blanche (longueurs, couleurs) : impossible d'injecter du CSS.
- Les liens n'acceptent que `http(s)`, `mailto`, `tel` et les ancres ; les images que `http(s)` et `data:image`.
- L'aperçu tourne dans une `iframe` `sandbox` (scripts autorisés, mais sans accès à l'éditeur).
- `</script>` dans un texte ne peut pas refermer le script intégré.
- Les adresses d'API doivent commencer par `http(s)://` ; les chemins dans la réponse n'acceptent que des noms et des numéros (`data.items.0`). Les données reçues sont affichées avec `textContent`, jamais interprétées comme du HTML.

## 7. Tests

| Niveau | Fichiers | Ce qui est vérifié |
|---|---|---|
| Unitaires | `src/ai/format.test.ts`, `serveur-ia/worker.test.js` | Aller-retour de chaque modèle par le format de l'IA (code identique), réponse avec des éléments invalides, schéma non récursif et fermé, relais (clé ajoutée, modèle imposé, origines refusées). |
| Unitaires | `src/model/*.test.ts` | Défis (validés par les modèles correspondants), identifiants, déplacements, interdiction de déposer un conteneur en lui-même, duplication, variables, renommage. |
| Unitaires | `src/codegen/*.test.ts` | HTML/CSS/JS générés, échappement, liens dangereux, CSS injecté, carte des lignes, conditions, répétitions, pages, adresses d'API refusées, JavaScript valide pour tous les modèles, exécution réelle du code exporté (compteur, formulaire, profil, tâches, annuaire avec API simulée, site de plusieurs pages, onglets, fenêtre et menu). Thème et `@media` par format. Export React compilé et affiché avec React, export Vue monté avec Vue, lien de partage aller-retour. |
| Unitaires | `src/store/editor.test.ts` | Ajout dans la sélection, regroupement des frappes dans l'historique, copier-coller, renommage de variable (jusque dans les conditions), pages (ajout, accueil, suppression, annulation), style par format, Mes composants, Mes projets. |
| Bout en bout | `e2e/editor.spec.ts` | Visite guidée, ajout et édition, glisser-déposer, variables liées (critère 1), compteur (critère 2), annuler/rétablir (critère 4), restauration après rechargement (critère 5), édition directe du texte, éditeur sur mobile, liste de tâches, navigation entre pages, données d'API (réponse simulée), Mes composants, masquer sur mobile, Mes projets, défi guidé, lien de partage, export React, assistant IA (création, explication en flux, modification annulable) avec une API simulée. |

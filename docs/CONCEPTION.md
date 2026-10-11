# Ptt-Makers : dossier de conception

> Version 1.0 · 11 octobre 2026 · complète le [cahier des charges](CAHIER_DES_CHARGES.md)

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
│   ├── bricks.ts       Catalogue des 18 briques + familles
│   ├── tree.ts         Opérations sur l'arbre (insérer, déplacer, dupliquer…)
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
├── components/   Interface (TopBar, Palette, Layers, Canvas, Inspector, Dock…)
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
  hidden?: boolean      // masquée au démarrage
  showIf?: string       // visible si la variable est vraie
}
```

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

Le script généré suit toujours le même plan, commenté en français : 1) les variables (`etat`), 2) la fonction `afficher()` qui met la page à jour, 3) la liaison des champs, 4) les réactions aux clics.

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

## 7. Tests

| Niveau | Fichiers | Ce qui est vérifié |
|---|---|---|
| Unitaires | `src/model/*.test.ts` | Identifiants, déplacements, interdiction de déposer un conteneur en lui-même, duplication, variables, renommage. |
| Unitaires | `src/codegen/*.test.ts` | HTML/CSS/JS générés, échappement, liens dangereux, CSS injecté, carte des lignes, JavaScript valide pour tous les modèles, exécution réelle du code exporté (compteur, formulaire, profil). |
| Unitaires | `src/store/editor.test.ts` | Ajout dans la sélection, regroupement des frappes dans l'historique, copier-coller, renommage de variable. |
| Bout en bout | `e2e/editor.spec.ts` | Visite guidée, ajout et édition, glisser-déposer, variables liées (critère 1), compteur (critère 2), annuler/rétablir (critère 4), restauration après rechargement (critère 5), édition directe du texte. |

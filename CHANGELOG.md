# Journal des évolutions

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [2.13.0] : 2026-10-11

Un style de logiciel pro : la septième vague du plan des 200 améliorations.

### Ajouté
- **États d'une brique** : dans les propriétés, sous le choix du format, l'**état réglé** (Normal, Survol, Focus, Appui, Désactivé). Seul ce qui change est gardé, et la zone de création montre l'état choisi sur la brique sélectionnée. Le code généré ajoute `:hover`, `:focus-visible` (ou `:focus-within` pour un conteneur ou un champ), `:active` et `:disabled`, avec une transition douce. Un nouveau réglage **Taille (%)** grossit ou rétrécit une brique (104 au survol, 97 à l'appui).
- **Désactiver si** (Interactions) : un bouton ou un champ reste visible mais ne réagit plus tant qu'une variable est vraie ; son allure se règle dans l'état *Désactivé*.
- **Variantes de composants** : une copie liée choisit une variante de son composant (« Mise en avant », « Danger »…). Le style réglé sur une copie qui a une variante change la variante, sur toutes les copies qui l'utilisent ; l'intérieur reste partagé par toutes les copies. Détacher une copie garde l'allure de sa variante.
- **Mode sombre de l'application générée** (Studio de style, *Version sombre*) : une ambiance sombre calculée à partir du style (claire pour un style déjà sombre), **selon l'appareil** ou **avec un bouton**. La nouvelle action **Changer d'ambiance** bascule et garde le choix dans le navigateur. Le Studio peut montrer l'autre ambiance dans la zone de création.
- **Aligner et répartir une sélection** : avec plusieurs briques sélectionnées, six boutons d'alignement (gauche, centre, droite, haut, milieu, bas) et, sur une page en grille, deux boutons pour répartir avec le même écart. Hors grille, chaque brique prend le même alignement propre.
- **Gabarits de pages** (bouton *Gabarit* à côté de *Page*, ou menu Ajouter) : tableau de bord, paramètres, connexion, liste et détail. Les pages arrivent avec leurs variables et leurs liens vers les autres pages ; une variable du même nom mais d'un autre type est renommée.
- Le modèle Back-office passe en ambiance sombre avec l'appareil, a un bouton *Clair ou sombre* et des effets au survol.
- L'assistant IA connaît les états, « Désactiver si », la version sombre et l'action *Changer d'ambiance*.

## [2.12.0] : 2026-10-11

Des écrans de vrai logiciel : la sixième vague du plan des 200 améliorations.

### Ajouté
- **Brique Formulaire** (famille Interaction) : elle regroupe ses champs, vérifie chacun avant l'envoi et lance ses actions *à l'envoi* (un nouvel événement, réglé dans *Interactions*). Elle a son bouton d'envoi, un **message de succès** qui peut citer les valeurs (`Merci {{nom}} !`) et peut **se vider après l'envoi**, en remettant les variables reliées à leur valeur de départ. La touche Entrée envoie le formulaire.
- **Dates et heures** : un champ de saisie peut être une date, une heure, une date avec heure, un téléphone ou une adresse web. Minimum et maximum s'appliquent aussi aux dates (« Choisis 31/12/2026 ou avant. »), et un téléphone ou une adresse web mal écrits sont refusés.
- **Cadre d'application** et **En-tête d'application** (famille Structure) : une barre latérale avec le nom du logiciel et les liens de toutes les pages (la page ouverte est mise en valeur), une zone principale, et un en-tête avec titre, sous-titre et boutons à droite. Sur mobile, la barre latérale passe en haut.
- **Tableau avancé** : des **cases modifiables** directement dans le tableau (Entrée ou clic ailleurs pour valider), des **cases à cocher** par ligne avec *Tout sélectionner* et une barre *Supprimer la sélection*, et des **colonnes redimensionnables** à la souris. Le tri marche aussi sur les cases modifiables.
- **Grilles à zones nommées** : une grille accepte un modèle de colonnes (`1fr 2fr`, `minmax(260px, 1fr) 2fr`) et des **zones** dessinées en texte, une ligne par rangée (`stats stats graphique`). Dans *Mise en page*, chaque brique de la grille choisit sa zone ou le nombre de colonnes qu'elle couvre ; dans une rangée ou une colonne, elle peut **grandir**, s'aligner à part ou changer d'ordre. Sur mobile, tout s'empile.
- **Modèle Back-office** (famille Pilotage et équipe) : barre latérale, tableau de bord en zones, formulaire vérifié qui ajoute un client, tableau modifiable avec sélection. La galerie compte 30 modèles.
- L'assistant IA connaît le formulaire, le cadre et l'en-tête d'application, les zones de grille et les options du tableau.

## [2.11.0] : 2026-10-11

Une logique d'application complète : la cinquième vague du plan des 200 améliorations.

### Ajouté
- **Nouveaux événements** : en plus du clic, une brique réagit au **survol**, et un champ à **chaque lettre tapée**, au **changement de valeur** et à une **touche** (Entrée, Échap, flèches, Espace). Dans *Interactions*, des pastilles choisissent l'événement et comptent ses actions. Une page a aussi sa **minuterie** : des actions répétées toutes les N secondes tant qu'elle est affichée (horloge, compte à rebours, données rafraîchies).
- **Appels d'API complets** : l'action *Appeler une API* choisit sa méthode (GET, POST, PUT, PATCH, DELETE), envoie un **corps JSON** (une ligne « nom: valeur » par champ, avec des `{{variables}}`) et des **en-têtes** (par exemple `Authorization: Bearer {{jeton}}`). Une valeur écrite seule, comme `{{age}}`, garde son type. Une réponse en erreur ne remplace pas la variable.
- **Conditions et/ou** : une action *Si* peut tester plusieurs conditions, reliées par « et » (toutes vraies) ou « ou » (au moins une). La valeur comparée peut être **une autre variable**, écrite `{{nom}}`.
- **Fonctions réutilisables** (panneau Variables) : une suite d'actions nommée, écrite une fois et lancée de partout avec l'action *Lancer une fonction*. Renommer une fonction ou une variable met tous les appels à jour. Une fonction qui finirait par se relancer elle-même est signalée dans les Problèmes et ses appels sont ignorés dans le code.
- **Débogueur** dans l'aperçu (bouton en forme d'insecte) : la liste des actions lancées, avec la brique et l'événement d'où elles viennent, et les variables en direct. En mode **pas à pas**, chaque action attend *Action suivante* et la page montre l'effet de la précédente. Le débogueur n'existe que dans l'aperçu, jamais dans le code exporté.
- Le modèle Liste de tâches ajoute une tâche avec la touche Entrée.
- L'assistant IA connaît les événements, la minuterie, les appels d'API complets, les conditions et/ou et les fonctions.

## [2.10.0] : 2026-10-11

Des logiciels prêts à livrer : la quatrième vague du plan des 200 améliorations.

### Ajouté
- **Galerie de modèles** : 29 modèles rangés en cinq familles (pour démarrer, sites et pages, applications, gestion et métiers, pilotage et équipe), avec une recherche qui ne tient compte ni des accents ni des majuscules.
- **17 nouveaux modèles**, dont les **modèles métiers** : CRM clients (pipeline en kanban), facturation (totaux HT, TVA et TTC calculés), réservations (calendrier), ressources humaines, puis suivi des dépenses, bibliothèque, notes des élèves, support client, recrutement, flotte de véhicules, salle de sport, carnet de recettes, inventaire du matériel, suivi des heures, inscriptions à un événement, dons d'une association et espace membres. Chacun a sa collection gardée dans le navigateur, ses chiffres clés calculés, son formulaire et son tableau avec recherche.
- **Brique Code personnalisé** (famille Pro) : du HTML, du CSS et du JavaScript écrits à la main. Le script reçoit `bloc` (la brique) et `etat` (les variables de l'application). Dans l'éditeur, le code tourne dans un cadre isolé, sans accès à l'éditeur ni à tes projets ; une erreur de JavaScript s'affiche dans le panneau Problèmes.
- **Application installable (PWA)** dans *Exporter* : un .zip avec la page, un manifeste (nom, couleurs, icônes dessinées aux couleurs du projet), un service worker qui la garde pour l'ouvrir sans internet, et de quoi l'emballer pour **Android et iOS avec Capacitor** (`npm run android`, `npm run ios`). Un fichier LISEZ-MOI explique chaque étape.
- **Comptes dans l'application** : les actions *Créer un compte*, *Se connecter* et *Se déconnecter*, et le réglage de page *Réservée aux personnes connectées*, qui renvoie sur la page de connexion. Le mot de passe n'est jamais gardé en clair (empreinte SHA-256). Les comptes restent dans le navigateur de chaque personne : pour des comptes partagés entre appareils, il faudra un serveur.
- L'assistant IA connaît les actions de comptes, les pages réservées, les pages qui reçoivent une valeur et les variables gardées après un rechargement.

### Corrigé
- Un texte vidé exprès (l'évolution d'un chiffre clé, par exemple) ne reprend plus sa valeur par défaut quand l'assistant IA modifie le projet.

## [2.9.0] : 2026-10-11

Un éditeur de logiciel pro : la troisième vague du plan des 200 améliorations.

### Ajouté
- **Multi-sélection** : `Maj + clic` (ou `Ctrl + clic`) dans la zone de création ou les calques ajoute une brique à la sélection, encadrée en pointillés. Les propriétés montrent alors les actions communes : grouper, dupliquer, supprimer. `Suppr`, `Ctrl + D` et `Échap` agissent sur toute la sélection.
- **Grouper et dégrouper** : `Ctrl + G` range les briques sélectionnées dans un groupe (une rangée ou une pile selon leur parent, dans l'ordre de la page ; sur une page en grille, le groupe prend la place qui les entoure). `Ctrl + Maj + G`, ou le bouton Dégrouper des propriétés, sort le contenu d'un bloc et retire le bloc.
- **Composants liés** : un bloc enregistré dans Mes composants devient un composant maître, et chaque copie placée reste liée. Changer l'intérieur d'une copie change toutes les autres et le composant ; le nom, la place, « masquée au départ » et « afficher seulement si » restent propres à chaque copie. Un bandeau le rappelle dans les propriétés, avec **Détacher cette copie** ; une icône le signale dans les calques. Un seul Ctrl+Z annule le changement partout.
- **Panneau Problèmes**, à côté de l'aperçu et du code : variables, champs, pages ou briques qui n'existent plus, `{{element}}` hors d'une répétition, formules mal écrites, action qui vise le mauvais type de variable, adresse d'API sans `https://`, et des conseils (image sans description, bouton sans texte, lien qui ne mène nulle part, page vide, variable inutilisée). Un clic sélectionne la brique ou ouvre la variable ; la barre d'état affiche le nombre d'erreurs.
- **Versions nommées** (menu Fichier, *Versions…*) : enregistre une photo du projet avec un nom, reviens-y plus tard. Avant chaque retour, l'état actuel est gardé dans une version automatique, et Ctrl+Z annule le retour. Jusqu'à 30 versions par projet, dans le navigateur.

### Modifié
- Retirer un composant de Mes composants détache ses copies, qui restent sur la page.

## [2.8.0] : 2026-10-11

Ptt-Makers s'installe sur l'ordinateur.

### Ajouté
- **Version pour ordinateur** : un paquet (Windows, macOS, Linux) qui installe l'atelier en un seul fichier, utilisable sans internet, et pose un **raccourci sur le bureau** avec l'icône de Ptt-Makers. L'atelier s'ouvre dans sa propre fenêtre avec Edge, Chrome, Brave ou Chromium. Sous Windows, le raccourci est aussi dans le menu Démarrer, sans droits administrateur.
- **Icône d'application** dessinée (les trois blocs de Ptt-Makers sur fond nuit), aux formats Windows, macOS et Linux.
- Menu Fichier : **Installer sur mon ordinateur** télécharge le paquet, mis à jour à chaque publication sur le site.
- `npm run paquet:local` prépare le paquet dans `dist-local/`.

## [2.7.0] : 2026-10-11

La logique d'un vrai logiciel : la deuxième vague du plan des 200 améliorations.

### Ajouté
- **Formules** : un champ de collection peut être calculé (`quantite * prix`), et un texte peut afficher le résultat d'un calcul : `{{prix * quantite}}`, `{{somme(produits.valeur)}}`, `{{moyenne(notes)}}`, `{{nombre(produits)}}`, `{{min(…)}}`, `{{max(…)}}`, `{{arrondi(total / 3, 2)}}`, et `&` pour coller des textes. Une formule fausse est signalée dans le panneau Variables et n'empêche jamais l'application de marcher ; une division par zéro n'affiche rien.
- **Recherche, filtre et tri** sur un tableau ou une répétition reliés à une collection : une variable de recherche (sans tenir compte des accents ni des majuscules, valeurs calculées comprises), un filtre (égal, différent, contient, plus grand, plus petit, coché, pas coché) dont la valeur peut suivre une variable, et un tri croissant ou décroissant. La collection ne change pas, seul l'affichage suit.
- **Vérification des formulaires** : un champ peut être obligatoire, demander un nombre minimal de caractères, un nombre entre un minimum et un maximum ; une adresse e-mail est toujours vérifiée. La nouvelle action « Vérifier un formulaire » affiche les erreurs sous les champs, place le curseur sur la première et arrête les actions suivantes. L'erreur disparaît dès que le champ est corrigé.
- **Pages qui reçoivent une valeur** : l'action « Aller sur une page » peut envoyer une valeur (`{{element.nom}}`), que la page range dans sa variable « Valeur reçue ». L'adresse devient `#fiche/Café`, qu'on peut partager.
- **Action « Attendre »** : une pause en millisecondes avant l'action suivante. La page montre ce qui a déjà changé avant chaque pause et chaque chargement.
- **Actions en chaîne** : un chargement d'API attend maintenant la réponse avant de passer à l'action suivante (le code généré utilise `async` et `await`).
- « Créer un formulaire et un tableau » ajoute une barre de recherche, rend le premier champ obligatoire et vérifie le formulaire avant d'ajouter la fiche.
- **Modèle Gestion de stock** : un champ calculé « Valeur », un chiffre clé qui additionne la valeur du stock et une recherche dans le tableau. Le **modèle Formulaire de contact** vérifie ses champs avant l'envoi.
- L'assistant IA connaît les formules, la vérification, la recherche, le filtre, le tri, les pages qui reçoivent une valeur et l'action « Attendre ».

### Modifié
- Renommer une variable met aussi à jour les formules, la recherche, la valeur reçue par une page et la valeur envoyée par « Aller sur une page ».
- Tests : 142 tests unitaires et 31 tests de bout en bout.

## [2.6.0] : 2026-10-11

Une vraie base de données dans le projet : la première vague du plan des 200 améliorations.

### Ajouté
- **Collections** : un nouveau type de variable, une liste de fiches aux champs typés (texte, nombre, date, oui/non, image, lien). Les champs et les fiches de départ se modifient dans le panneau Variables.
- **Import CSV** : un fichier séparé par des points-virgules, des virgules ou des tabulations remplit une collection ; les types des champs sont devinés (nombres à la française, dates jj/mm/aaaa, oui/non).
- **Tableau relié** : la propriété « Collection affichée » d'un tableau lui donne une colonne par champ ; il se met à jour tout seul, met les valeurs en forme (1 250,5 · 11/10/2026 · Oui), affiche les images et les liens, propose un bouton « Supprimer » par ligne et un texte quand la collection est vide.
- **Action « Ajouter une fiche à une collection »** : une valeur par champ, qui peut venir d'un champ de saisie (`{{nom_saisi}}`).
- **Créer un formulaire et un tableau** : un clic construit, pour une collection, le formulaire (un champ par champ, relié à une nouvelle variable), le bouton Ajouter qui vide ensuite le formulaire, et le tableau relié.
- **Garder dans le navigateur** : une variable cochée est enregistrée dans le navigateur de l'application générée et revient après un rechargement.
- Une **répétition** parcourt aussi une collection, et « Insérer une variable » propose directement ses champs (`{{element.prix}}`).
- « Retirer un élément » et « Vider une liste » marchent sur une collection ; le champ texte accepte le type **Date**.
- **Modèle Gestion de stock** : produits, formulaire, tableau, chiffre clé du nombre de produits, données gardées.
- L'assistant IA crée des collections (champs, fiches, données gardées), des tableaux reliés et l'action « Ajouter une fiche ».

### Corrigé
- Un champ relié à une variable Nombre accepte la virgule décimale (« 12,5 »).

### Modifié
- Tests : 126 tests unitaires et 31 tests de bout en bout.

## [2.5.0] : 2026-10-11

Des briques de logiciel professionnel : tableaux, graphiques, calendrier, kanban, discussion.

### Ajouté
- **Nouvelle famille « Pro »** dans la bibliothèque, avec 8 briques :
  - **Tableau** : titres de colonnes et lignes écrites en texte (cellules séparées par des points-virgules), lignes alternées, tri d'un clic sur un titre.
  - **Graphique** : barres, courbe ou anneau à partir de lignes « étiquette : valeur », avec unité, valeurs affichées, échelle ronde et légende.
  - **Chiffre clé** : libellé, grand chiffre, évolution en vert ou en rouge et icône dessinée, pour les tableaux de bord.
  - **Progression** : une barre de 0 à 100 %, qui peut suivre une variable (`{{score}}`).
  - **Calendrier** : un mois complet qui commence le lundi, avec les événements sur leurs jours.
  - **Kanban** : des colonnes de cartes ; dans l'application, on les fait glisser d'une colonne à l'autre ou on clique leur flèche, et les compteurs se mettent à jour.
  - **Discussion** : des bulles de conversation (les tiennes à droite) et une zone pour écrire et envoyer un message.
  - **Barre d'onglets** : la barre du bas des applications mobiles, avec une icône et le nom de chaque page, collée en bas de l'écran.
- Ces briques suivent le style du projet (couleurs, arrondis, relief, flou) et s'exportent en HTML, React et Vue.
- **Trois modèles** : Tableau de bord, Gestion de projet (kanban, calendrier, avancement relié à un bouton) et Messagerie mobile (trois écrans et barre d'onglets).
- L'assistant IA connaît les nouvelles briques et peut les utiliser.

### Modifié
- Tests : 112 tests unitaires et 29 tests de bout en bout.

## [2.4.0] : 2026-10-11

Une interface de logiciel professionnel, inspirée de Blender : sombre, compacte, rangée par espaces de travail.

### Ajouté
- **Interface pro** (par défaut) : gris sombre, panneaux serrés, champs et boutons compacts, couleur de sélection orange et bleu de marque, zone de création sur une grille.
- **Barre de menus** : Fichier, Édition, Ajouter, Affichage et Aide. Chaque commande affiche son raccourci ; on passe d'un menu à l'autre au survol, `Échap` referme.
- **Espaces de travail** en onglets : Construction, Style, Logique, Code et Aperçu. Chacun range les panneaux pour une tâche (par exemple Code ouvre le code en grand à droite, Logique ouvre les variables).
- **Barre d'outils verticale** sur la zone de création : sélectionner la page, ajouter une section, une carte, un titre, un paragraphe, un bouton, un champ, une image ou une icône près de la sélection.
- **Onglets d'icônes** dans les propriétés : Contenu, Mise en page, Apparence, Texte, Interactions et Style du projet, qui ouvrent et font défiler jusqu'à la bonne section.
- **Barre d'état** en bas : gestes utiles, nombre de briques, de pages et de variables, et version.
- **Écran d'accueil** au démarrage : nouveau projet depuis un modèle, projets récents, reprise du projet en cours, nouveautés et guide. Il se rouvre depuis Fichier, et se désactive avec « Afficher au démarrage ».
- **Interface classique** toujours disponible (bouton Disposition, réglage « Interface », ou menu Affichage), avec ses thèmes clair, sombre et système.

### Modifié
- Sur les écrans moyens, la barre du haut garde les icônes des boutons secondaires (leurs libellés restent dans les menus et pour les lecteurs d'écran).
- Tests : 94 tests unitaires et 27 tests de bout en bout.

## [2.3.0] : 2026-10-11

Premier pas de la version pro : un moteur de styles et 24 styles prêts à l'emploi.

### Ajouté
- **Studio de style** (sélectionne la page, puis « Style du projet ») : 24 styles qui habillent toutes les pages d'un clic. Néomorphisme sombre, nuit et jaune, verre givré, photo et tuiles de verre, verre de nuit à halos, verre liquide, néomorphisme clair, pâte à modeler, néobrutalisme, éditorial, typographie géante, utilitaire dense, bento, dégradé vif, pastel, chrome, Y2K, nature, terminal, carnet papier, pro sobre, spatial, dessiné à la main et collage.
- Chaque réglage du style se change à la main : couleur principale, texte sur la couleur, fond des pages (couleur ou dégradé), surfaces, texte, texte secondaire, barre de menu, bordures, ambiance claire ou sombre, arrondis des cartes et des boutons, relief (plat, doux, porté, néomorphisme, décalé, verre), intensité, flou derrière les surfaces, police du texte et police des titres.
- Quatre nouvelles polices : grotesque, éditoriale, géométrique et manuscrite (chargées depuis Google Fonts seulement quand le style les utilise).
- **Adapter toutes les briques au style** : retire les couleurs, bordures, ombres et arrondis donnés à la main pour que tout le projet suive le style (annulable).
- L'assistant IA choisit un style adapté à l'application qu'il crée, et garde tes réglages du Studio quand il modifie le projet.

### Modifié
- Les cartes, champs, boutons, onglets, accordéons, fenêtres, barres de menu et étiquettes prennent leurs couleurs dans le style du projet. Sans style, rien ne change à l'écran.
- Tests : 94 tests unitaires et 23 tests de bout en bout.

## [2.2.0] : 2026-10-11

Plus aucun emoji : des icônes dessinées à la place.

### Modifié
- La brique **Icône** propose 52 icônes dessinées en SVG (étoile, cœur, téléphone, e-mail, maison, fusée…), avec une recherche par nom. Elles suivent la taille et la couleur du texte, et s'affichent pareil sur tous les appareils.
- Les projets créés avant gardent leur icône : chaque ancien emoji est remplacé par l'icône dessinée équivalente.
- Le code exporté (HTML, React, Vue) contient le SVG de l'icône, sans emoji.
- Les modèles de départ, les messages de l'éditeur, le README et le guide n'utilisent plus d'emoji ; la documentation utilise des icônes dans `docs/icones/`.
- L'assistant IA n'écrit plus d'emoji : il ajoute une brique Icône quand il veut illustrer.

## [2.1.0] : 2026-10-11

Placer une brique où on veut : la page peut devenir une grille aimantée.

### Ajouté
- **Disposition « Sur une grille »** (Propriétés de la page, Mise en page) : la page devient une grille de 12 colonnes et de rangées de 40 px. Une brique glissée se pose sur la case la plus proche, par exemple un bouton de menu tout en haut à gauche.
- Pendant un glisser-déposer, les lignes de la grille ressortent et un cadre montre la case où la brique va se poser, avec son numéro de colonne et de rangée.
- **Poignée de taille** en bas à droite de la brique sélectionnée, et réglages **Colonne, Rangée, Largeur (colonnes), Hauteur (rangées)** dans les propriétés.
- Raccourcis : `Alt + ↑ / ↓` monte ou descend la brique d'une rangée, `Alt + ← / →` la décale d'une colonne.
- En passant sur la grille, chaque brique garde à peu près sa hauteur ; en revenant « En pile », elles s'empilent à nouveau.
- Sur mobile (moins de 600 px), les briques de la grille s'empilent dans l'ordre de lecture (de haut en bas, de gauche à droite), dans l'éditeur comme dans le code exporté.
- Le code généré utilise CSS Grid (`grid-column`, `grid-row`), et l'assistant IA sait créer et modifier des pages en grille.
- Tests : 84 tests unitaires et 21 tests de bout en bout.

## [2.0.0] : 2026-10-11

**Ptt-Makers Pro** : un assistant IA construit des applications complètes avec les mêmes briques que toi.

### Ajouté
- **Assistant IA** (bouton « Assistant IA · Pro ») avec trois modes :
  - **Créer une appli** : décris ton idée, l'assistant fabrique un nouveau projet (pages, briques, variables, actions, thème) qui s'ouvre dans Mes projets.
  - **Modifier ce projet** : une consigne (« ajoute une page contact et un menu ») et le projet est mis à jour ; `Ctrl/⌘ + Z` annule.
  - **Expliquer le code** : une question sur le code généré, la réponse s'écrit en direct.
- Deux façons de connecter l'assistant : une **clé API Anthropic personnelle**, gardée dans le navigateur, ou un **serveur relais** (dossier `serveur-ia/`, Cloudflare Worker gratuit) qui garde la clé côté serveur pour une classe ou un club.
- L'assistant utilise le modèle Claude Opus 5.5 avec une sortie JSON contrôlée par un schéma : le projet reçu est vérifié avant d'être ouvert (briques, propriétés et actions inconnues ignorées).
- Tests : 78 tests unitaires (format d'échange, aller-retour de tous les modèles, relais) et 20 tests de bout en bout (dont l'assistant avec une API simulée).

## [1.3.0] : 2026-10-11

Apprendre en jouant, partager d'un lien et continuer dans React ou Vue.

### Ajouté
- **Défis guidés** (bouton « Défis ») : 6 défis du plus facile au plus avancé (première page, compteur, bonjour prénom, liste de courses, site de deux pages, fenêtre surprise). Chaque défi s'ouvre dans un nouveau projet ; une carte suit les étapes, qui se cochent toutes seules, avec un indice pour la suivante.
- **Lien de partage** (Exporter) : le projet entier est compressé dans l'adresse. La personne qui ouvre le lien reçoit une copie dans « Mes projets ». Rien n'est envoyé sur un serveur.
- **Export React** (`App.jsx` + `App.css`) et **export Vue** (`App.vue`) : la structure devient du JSX ou un gabarit Vue, le comportement est lancé quand le composant s'affiche.
- Tests : 68 tests unitaires (dont le rendu des exports avec les vrais React et Vue) et 18 tests de bout en bout.

## [1.2.0] : 2026-10-11

Des sites plus riches et mieux rangés : six nouvelles briques, un thème, des blocs réutilisables, des réglages par écran et plusieurs projets.

### Ajouté
- **Nouvelles briques** : Onglets, Accordéon (questions-réponses), Fenêtre (modale à ouvrir par une action), Barre de menu (liens vers toutes les pages, page affichée mise en avant), Vidéo (YouTube ou fichier `.mp4`/`.webm`) et Icône (emoji). Les briques à contenu arrivent avec un exemple prêt à modifier.
- **Thème du projet** (réglages de la page) : couleur principale, arrondi et police, appliqués aux boutons, liens, onglets et champs.
- **Mes composants** : un bouton enregistre la brique sélectionnée et son contenu ; le bloc apparaît dans la bibliothèque, à glisser ou ajouter d'un clic autant de fois que voulu.
- **Réglages par format** : dans les propriétés, « Style pour » tous les écrans, la tablette ou le mobile, et « Masquer sur ce format ». Le CSS exporté contient les `@media` correspondants.
- **Mes projets** : plusieurs projets enregistrés dans le navigateur (ouvrir, dupliquer, supprimer). Un modèle ou un import crée un nouveau projet au lieu d'écraser l'actuel. `Ctrl/⌘ + S` enregistre tout de suite.
- Tests : 50 tests unitaires et 15 tests de bout en bout.

### Modifié
- L'ancien projet unique est repris automatiquement comme premier projet de « Mes projets ».

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

import { FILTER_OPS } from './collections'
import type { BrickStyle, BrickType, Category, PropValue, VariableKind } from './types'

/** Recherche, filtre et tri : communs au tableau et à la répétition. */
const VIEW_FIELDS: FieldDef[] = [
  {
    key: 'search',
    label: 'Recherche (variable du texte cherché)',
    kind: 'variable',
    kinds: ['text'],
    help: 'Relie un champ de saisie à cette variable : seuls les éléments qui contiennent le texte restent affichés.',
  },
  { key: 'filterField', label: 'Filtrer sur le champ', kind: 'field' },
  { key: 'filterOp', label: 'Condition du filtre', kind: 'select', options: FILTER_OPS.map(({ value, label }) => ({ value, label })) },
  { key: 'filterValue', label: 'Valeur du filtre', kind: 'text', dynamic: true, placeholder: '{{categorie_choisie}}', help: 'Vide : tout est affiché.' },
  { key: 'sortField', label: 'Trier par', kind: 'field' },
  {
    key: 'sortDir',
    label: 'Ordre du tri',
    kind: 'select',
    options: [
      { value: 'asc', label: 'Croissant (A à Z, 1 à 9)' },
      { value: 'desc', label: 'Décroissant (Z à A, 9 à 1)' },
    ],
  },
]
/** Règles de validation d'un champ de formulaire (vérifiées par l'action « Vérifier le formulaire »). */
const validationFields = (opts: { length?: boolean; range?: boolean } = {}): FieldDef[] => [
  { key: 'required', label: 'Obligatoire', kind: 'boolean' },
  ...(opts.length ? [{ key: 'minLength', label: 'Nombre minimal de caractères', kind: 'number', help: '0 : pas de minimum.' } as FieldDef] : []),
  ...(opts.range
    ? ([
        { key: 'min', label: 'Nombre minimum', kind: 'text', placeholder: 'aucun' },
        { key: 'max', label: 'Nombre maximum', kind: 'text', placeholder: 'aucun' },
      ] as FieldDef[])
    : []),
  { key: 'errorText', label: 'Message d’erreur', kind: 'text', placeholder: 'Message automatique', help: 'Affiché sous le champ quand la règle n’est pas respectée.' },
]

const VIEW_DEFAULTS = { search: '', filterField: '', filterOp: 'eq', filterValue: '', sortField: '', sortDir: 'asc' }

export type FieldKind = 'text' | 'textarea' | 'code' | 'number' | 'select' | 'boolean' | 'variable' | 'url' | 'page' | 'icon' | 'field'

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  options?: { value: string; label: string }[]
  placeholder?: string
  help?: string
  /** Le texte accepte les variables {{nom}}. */
  dynamic?: boolean
  /** Champ « variable » : types de variables acceptés. */
  kinds?: VariableKind[]
}

/** Contenu de départ ajouté avec une brique (ex. deux onglets dans « Onglets »). */
export interface StarterSpec {
  type: BrickType
  name?: string
  props?: Record<string, PropValue>
  style?: BrickStyle
  children?: StarterSpec[]
}

export interface BrickDef {
  type: BrickType
  label: string
  category: Category
  /** Nom de l'icône lucide (voir components/BrickIcon). */
  icon: string
  description: string
  /** Peut contenir d'autres briques. */
  container: boolean
  /** Préfixe des identifiants générés (ex. « bouton » → bouton-1). */
  idPrefix: string
  fields: FieldDef[]
  defaultProps: Record<string, PropValue>
  defaultStyle: BrickStyle
  starter?: StarterSpec[]
}

export interface CategoryDef {
  id: Category
  label: string
  description: string
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'structure', label: 'Structure', description: 'Organisent la page et regroupent les autres briques.' },
  { id: 'texte', label: 'Texte', description: 'Affichent des titres, paragraphes, liens et listes.' },
  { id: 'interaction', label: 'Interaction', description: "Réagissent aux actions de l'utilisateur." },
  { id: 'medias', label: 'Médias', description: 'Images et éléments de mise en forme.' },
  { id: 'pro', label: 'Pro', description: 'Tableaux, graphiques, calendrier, kanban, discussion : les briques des logiciels.' },
]

export const BRICKS: Record<BrickType, BrickDef> = {
  page: {
    type: 'page',
    label: 'Page',
    category: 'structure',
    icon: 'file',
    description: 'La page entière. Tout le projet est construit à l’intérieur.',
    container: true,
    idPrefix: 'page',
    fields: [
      { key: 'title', label: "Titre de l'onglet", kind: 'text' },
      {
        key: 'paramVar',
        label: 'Valeur reçue dans la variable',
        kind: 'variable',
        kinds: ['text', 'number'],
        help: 'Quand une action « Aller sur une page » envoie une valeur (ex. le nom d’un produit), elle arrive dans cette variable.',
      },
      {
        key: 'loginVar',
        label: 'Réservée aux personnes connectées',
        kind: 'variable',
        kinds: ['text'],
        help: 'La variable qui reçoit la personne connectée (actions « Se connecter » et « Créer un compte »). Vide : la page est ouverte à tous.',
      },
      { key: 'loginPage', label: 'Sinon, aller sur la page', kind: 'page', help: 'La page de connexion.' },
    ],
    defaultProps: { title: 'Mon projet', paramVar: '', loginVar: '', loginPage: '' },
    defaultStyle: { direction: 'column', gap: 16, padding: 24 },
  },
  section: {
    type: 'section',
    label: 'Section',
    category: 'structure',
    icon: 'square',
    description: 'Un grand bloc de page qui empile son contenu verticalement.',
    container: true,
    idPrefix: 'section',
    fields: [],
    defaultProps: {},
    defaultStyle: { direction: 'column', gap: 12, padding: 24, borderRadius: 12 },
  },
  row: {
    type: 'row',
    label: 'Ligne',
    category: 'structure',
    icon: 'columns',
    description: 'Place les briques côte à côte, de gauche à droite.',
    container: true,
    idPrefix: 'ligne',
    fields: [],
    defaultProps: {},
    defaultStyle: { direction: 'row', gap: 12, align: 'center', wrap: true },
  },
  stack: {
    type: 'stack',
    label: 'Colonne',
    category: 'structure',
    icon: 'rows',
    description: 'Empile les briques les unes sous les autres.',
    container: true,
    idPrefix: 'colonne',
    fields: [],
    defaultProps: {},
    defaultStyle: { direction: 'column', gap: 8 },
  },
  grid: {
    type: 'grid',
    label: 'Grille',
    category: 'structure',
    icon: 'grid',
    description: 'Range les briques dans une grille de colonnes égales.',
    container: true,
    idPrefix: 'grille',
    fields: [{ key: 'columns', label: 'Nombre de colonnes', kind: 'number' }],
    defaultProps: { columns: 3 },
    defaultStyle: { gap: 16 },
  },
  card: {
    type: 'card',
    label: 'Carte',
    category: 'structure',
    icon: 'card',
    description: 'Un encadré avec fond, bordure arrondie et ombre légère.',
    container: true,
    idPrefix: 'carte',
    fields: [],
    defaultProps: {},
    defaultStyle: {
      direction: 'column',
      gap: 8,
      padding: 20,
    },
  },
  repeat: {
    type: 'repeat',
    label: 'Répétition',
    category: 'structure',
    icon: 'repeat',
    description: 'Répète son contenu pour chaque élément d’une liste. Écris {{element}} pour afficher l’élément.',
    container: true,
    idPrefix: 'repetition',
    fields: [
      { key: 'source', label: 'Liste à parcourir', kind: 'variable', kinds: ['list', 'collection'] },
      { key: 'columns', label: 'Colonnes', kind: 'number', help: '1 pour une liste, plus pour une grille de cartes.' },
      { key: 'empty', label: 'Texte si la liste est vide', kind: 'text', placeholder: 'Rien pour le moment.' },
      ...VIEW_FIELDS,
    ],
    defaultProps: { source: '', columns: 1, empty: '', ...VIEW_DEFAULTS },
    defaultStyle: { direction: 'column', gap: 10 },
  },
  tabs: {
    type: 'tabs',
    label: 'Onglets',
    category: 'structure',
    icon: 'tabs',
    description: 'Range le contenu en onglets. Chaque brique placée dedans devient un onglet, son nom en est le titre.',
    container: true,
    idPrefix: 'onglets',
    fields: [],
    defaultProps: {},
    defaultStyle: { gap: 12 },
    starter: [
      { type: 'stack', name: 'Premier onglet', children: [{ type: 'text', props: { text: 'Contenu du premier onglet.' } }] },
      { type: 'stack', name: 'Deuxième onglet', children: [{ type: 'text', props: { text: 'Contenu du deuxième onglet.' } }] },
    ],
  },
  accordion: {
    type: 'accordion',
    label: 'Accordéon',
    category: 'structure',
    icon: 'accordion',
    description: 'Des volets qui s’ouvrent et se ferment (FAQ…). Chaque brique placée dedans est un volet, son nom en est le titre.',
    container: true,
    idPrefix: 'accordeon',
    fields: [{ key: 'firstOpen', label: 'Premier volet ouvert au départ', kind: 'boolean' }],
    defaultProps: { firstOpen: true },
    defaultStyle: { gap: 8 },
    starter: [
      { type: 'stack', name: 'Comment ça marche ?', children: [{ type: 'text', props: { text: 'Une réponse claire et courte.' } }] },
      { type: 'stack', name: 'Est-ce gratuit ?', children: [{ type: 'text', props: { text: 'Oui, entièrement.' } }] },
    ],
  },
  modal: {
    type: 'modal',
    label: 'Fenêtre',
    category: 'structure',
    icon: 'modal',
    description: 'Une fenêtre qui s’ouvre par-dessus la page avec l’action « Afficher une brique ». Cachée au départ.',
    container: true,
    idPrefix: 'fenetre',
    fields: [{ key: 'label', label: 'Titre pour les lecteurs d’écran', kind: 'text' }],
    defaultProps: { label: 'Fenêtre' },
    defaultStyle: { direction: 'column', gap: 12, padding: 28, maxWidth: '480px' },
    starter: [
      { type: 'heading', props: { text: 'Bonne nouvelle !', level: '2' } },
      { type: 'text', props: { text: 'Écris ici le message de ta fenêtre.' } },
    ],
  },
  navbar: {
    type: 'navbar',
    label: 'Barre de menu',
    category: 'structure',
    icon: 'navbar',
    description: 'Une barre de navigation avec un lien vers chaque page du projet, mise à jour automatiquement.',
    container: false,
    idPrefix: 'menu-nav',
    fields: [{ key: 'brand', label: 'Nom affiché à gauche', kind: 'text', dynamic: true }],
    defaultProps: { brand: 'Mon site' },
    defaultStyle: { padding: 16, gap: 16 },
  },
  heading: {
    type: 'heading',
    label: 'Titre',
    category: 'texte',
    icon: 'heading',
    description: 'Un titre pour introduire une partie de la page.',
    container: false,
    idPrefix: 'titre',
    fields: [
      { key: 'text', label: 'Texte', kind: 'text', dynamic: true },
      {
        key: 'level',
        label: 'Niveau',
        kind: 'select',
        options: [
          { value: '1', label: 'Titre principal (H1)' },
          { value: '2', label: 'Sous-titre (H2)' },
          { value: '3', label: 'Petit titre (H3)' },
        ],
      },
    ],
    defaultProps: { text: 'Un titre accrocheur', level: '2' },
    defaultStyle: {},
  },
  text: {
    type: 'text',
    label: 'Paragraphe',
    category: 'texte',
    icon: 'text',
    description: 'Un bloc de texte courant.',
    container: false,
    idPrefix: 'texte',
    fields: [{ key: 'text', label: 'Texte', kind: 'textarea', dynamic: true }],
    defaultProps: { text: 'Écris ici ton texte. Tu peux afficher une variable avec {{nom}}.' },
    defaultStyle: {},
  },
  link: {
    type: 'link',
    label: 'Lien',
    category: 'texte',
    icon: 'link',
    description: 'Un texte cliquable qui mène vers une autre adresse.',
    container: false,
    idPrefix: 'lien',
    fields: [
      { key: 'text', label: 'Texte', kind: 'text', dynamic: true },
      { key: 'page', label: 'Vers une page du projet', kind: 'page', help: 'Si une page est choisie, le lien y mène au lieu de l’adresse.' },
      { key: 'href', label: 'Adresse', kind: 'url', placeholder: 'https://…' },
      { key: 'newTab', label: 'Ouvrir dans un nouvel onglet', kind: 'boolean' },
    ],
    defaultProps: { text: 'En savoir plus', href: 'https://example.com', newTab: true, page: '' },
    defaultStyle: {},
  },
  badge: {
    type: 'badge',
    label: 'Étiquette',
    category: 'texte',
    icon: 'tag',
    description: 'Un petit mot mis en valeur (nouveau, promo, statut…).',
    container: false,
    idPrefix: 'etiquette',
    fields: [{ key: 'text', label: 'Texte', kind: 'text', dynamic: true }],
    defaultProps: { text: 'Nouveau' },
    defaultStyle: {},
  },
  list: {
    type: 'list',
    label: 'Liste',
    category: 'texte',
    icon: 'list',
    description: 'Une liste à puces ou numérotée. Un élément par ligne.',
    container: false,
    idPrefix: 'liste',
    fields: [
      { key: 'items', label: 'Éléments (un par ligne)', kind: 'textarea' },
      { key: 'ordered', label: 'Liste numérotée', kind: 'boolean' },
    ],
    defaultProps: { items: 'Premier point\nDeuxième point\nTroisième point', ordered: false },
    defaultStyle: {},
  },
  button: {
    type: 'button',
    label: 'Bouton',
    category: 'interaction',
    icon: 'button',
    description: 'Un bouton qui déclenche des actions quand on clique dessus.',
    container: false,
    idPrefix: 'bouton',
    fields: [
      { key: 'text', label: 'Texte', kind: 'text', dynamic: true },
      {
        key: 'variant',
        label: 'Apparence',
        kind: 'select',
        options: [
          { value: 'primary', label: 'Principal' },
          { value: 'secondary', label: 'Secondaire' },
          { value: 'ghost', label: 'Discret' },
        ],
      },
    ],
    defaultProps: { text: 'Cliquer ici', variant: 'primary' },
    defaultStyle: {},
  },
  input: {
    type: 'input',
    label: 'Champ texte',
    category: 'interaction',
    icon: 'input',
    description: 'Une case où l’utilisateur peut écrire. Relie-la à une variable.',
    container: false,
    idPrefix: 'champ',
    fields: [
      { key: 'label', label: 'Libellé', kind: 'text' },
      { key: 'placeholder', label: 'Texte indicatif', kind: 'text' },
      {
        key: 'inputType',
        label: 'Type',
        kind: 'select',
        options: [
          { value: 'text', label: 'Texte' },
          { value: 'email', label: 'E-mail' },
          { value: 'number', label: 'Nombre' },
          { value: 'date', label: 'Date' },
          { value: 'password', label: 'Mot de passe' },
        ],
      },
      { key: 'bind', label: 'Enregistrer dans la variable', kind: 'variable', kinds: ['text', 'number', 'boolean'], help: 'Ce qui est écrit met à jour la variable.' },
      ...validationFields({ length: true, range: true }),
    ],
    defaultProps: { label: 'Ton prénom', placeholder: 'Ex. Camille', inputType: 'text', bind: '', required: false, minLength: 0, min: '', max: '', errorText: '' },
    defaultStyle: {},
  },
  textarea: {
    type: 'textarea',
    label: 'Zone de texte',
    category: 'interaction',
    icon: 'textarea',
    description: 'Un grand champ pour écrire plusieurs lignes.',
    container: false,
    idPrefix: 'zone',
    fields: [
      { key: 'label', label: 'Libellé', kind: 'text' },
      { key: 'placeholder', label: 'Texte indicatif', kind: 'text' },
      { key: 'bind', label: 'Enregistrer dans la variable', kind: 'variable', kinds: ['text', 'number', 'boolean'] },
      ...validationFields({ length: true }),
    ],
    defaultProps: { label: 'Message', placeholder: 'Écris ton message…', bind: '', required: false, minLength: 0, errorText: '' },
    defaultStyle: {},
  },
  checkbox: {
    type: 'checkbox',
    label: 'Case à cocher',
    category: 'interaction',
    icon: 'checkbox',
    description: 'Une case oui/non. Idéale avec une variable vrai/faux.',
    container: false,
    idPrefix: 'case',
    fields: [
      { key: 'label', label: 'Libellé', kind: 'text' },
      { key: 'bind', label: 'Enregistrer dans la variable', kind: 'variable', kinds: ['boolean', 'text'] },
      ...validationFields(),
    ],
    defaultProps: { label: "J'accepte les conditions", bind: '', required: false, errorText: '' },
    defaultStyle: {},
  },
  select: {
    type: 'select',
    label: 'Menu déroulant',
    category: 'interaction',
    icon: 'select',
    description: 'Une liste de choix. Un choix par ligne.',
    container: false,
    idPrefix: 'menu',
    fields: [
      { key: 'label', label: 'Libellé', kind: 'text' },
      { key: 'options', label: 'Choix (un par ligne)', kind: 'textarea' },
      { key: 'bind', label: 'Enregistrer dans la variable', kind: 'variable', kinds: ['text', 'number', 'boolean'] },
      ...validationFields(),
    ],
    defaultProps: { label: 'Ton choix', options: 'Option A\nOption B\nOption C', bind: '', required: false, errorText: '' },
    defaultStyle: {},
  },
  image: {
    type: 'image',
    label: 'Image',
    category: 'medias',
    icon: 'image',
    description: 'Affiche une image à partir de son adresse.',
    container: false,
    idPrefix: 'image',
    fields: [
      { key: 'src', label: "Adresse de l'image", kind: 'url', placeholder: 'https://…', dynamic: true },
      { key: 'alt', label: 'Description (accessibilité)', kind: 'text', help: 'Lue par les lecteurs d’écran.' },
    ],
    defaultProps: { src: '', alt: 'Illustration' },
    defaultStyle: { width: '100%', borderRadius: 12 },
  },
  video: {
    type: 'video',
    label: 'Vidéo',
    category: 'medias',
    icon: 'video',
    description: 'Une vidéo YouTube ou un fichier vidéo (.mp4, .webm).',
    container: false,
    idPrefix: 'video',
    fields: [
      { key: 'src', label: 'Adresse de la vidéo', kind: 'url', placeholder: 'https://www.youtube.com/watch?v=…', help: 'Lien YouTube ou adresse d’un fichier .mp4 / .webm.' },
      { key: 'title', label: 'Titre (accessibilité)', kind: 'text' },
    ],
    defaultProps: { src: '', title: 'Vidéo' },
    defaultStyle: { width: '100%', borderRadius: 12 },
  },
  icon: {
    type: 'icon',
    label: 'Icône',
    category: 'medias',
    icon: 'smile',
    description: 'Un pictogramme dessiné (étoile, cœur, téléphone…) à la taille et à la couleur de ton choix.',
    container: false,
    idPrefix: 'icone',
    fields: [
      { key: 'symbol', label: 'Icône', kind: 'icon' },
      { key: 'label', label: 'Signification (accessibilité)', kind: 'text', help: 'Laisse vide si l’icône est décorative.' },
    ],
    defaultProps: { symbol: 'etoile', label: '' },
    defaultStyle: { fontSize: 40 },
  },
  divider: {
    type: 'divider',
    label: 'Séparateur',
    category: 'medias',
    icon: 'divider',
    description: 'Une ligne horizontale pour séparer deux parties.',
    container: false,
    idPrefix: 'separateur',
    fields: [],
    defaultProps: {},
    defaultStyle: {},
  },
  spacer: {
    type: 'spacer',
    label: 'Espace',
    category: 'medias',
    icon: 'spacer',
    description: 'Un espace vide pour aérer la mise en page.',
    container: false,
    idPrefix: 'espace',
    fields: [],
    defaultProps: {},
    defaultStyle: { height: '32px' },
  },
  table: {
    type: 'table',
    label: 'Tableau',
    category: 'pro',
    icon: 'table',
    description: 'Un tableau de données en lignes et colonnes, triable d’un clic sur un titre de colonne.',
    container: false,
    idPrefix: 'tableau',
    fields: [
      { key: 'source', label: 'Collection affichée', kind: 'variable', kinds: ['collection'], help: 'Relie le tableau à une collection : il se met à jour tout seul. Sinon, écris les lignes ci-dessous.' },
      { key: 'rowDelete', label: 'Bouton « Supprimer » sur chaque ligne', kind: 'boolean', help: 'Seulement pour un tableau relié à une collection.' },
      { key: 'empty', label: 'Texte si la collection est vide', kind: 'text', placeholder: 'Aucune donnée pour le moment.' },
      ...VIEW_FIELDS,
      { key: 'columns', label: 'Colonnes', kind: 'text', help: 'Les titres, séparés par des points-virgules.' },
      { key: 'rows', label: 'Lignes (une par ligne)', kind: 'textarea', help: 'Les cellules sont séparées par des points-virgules. Ex. : Camille ; Design ; Lyon' },
      { key: 'striped', label: 'Lignes alternées', kind: 'boolean' },
      { key: 'sortable', label: 'Trier en cliquant un titre', kind: 'boolean' },
    ],
    defaultProps: {
      source: '',
      rowDelete: false,
      empty: '',
      ...VIEW_DEFAULTS,
      columns: 'Nom ; Rôle ; Ville ; Statut',
      rows: 'Camille Martin ; Design ; Lyon ; Actif\nYanis Benali ; Développement ; Paris ; Actif\nLéa Dubois ; Marketing ; Nantes ; En congé\nHugo Petit ; Ventes ; Lille ; Actif',
      striped: true,
      sortable: true,
    },
    defaultStyle: {},
  },
  chart: {
    type: 'chart',
    label: 'Graphique',
    category: 'pro',
    icon: 'chart',
    description: 'Un graphique en barres, en courbe ou en anneau, dessiné à partir de tes données.',
    container: false,
    idPrefix: 'graphique',
    fields: [
      {
        key: 'kind',
        label: 'Type',
        kind: 'select',
        options: [
          { value: 'barres', label: 'Barres' },
          { value: 'courbe', label: 'Courbe' },
          { value: 'anneau', label: 'Anneau' },
        ],
      },
      { key: 'data', label: 'Données (une par ligne)', kind: 'textarea', help: 'Étiquette : valeur. Ex. : Lundi : 12' },
      { key: 'unit', label: 'Unité', kind: 'text', placeholder: '€, %, km…' },
      { key: 'showValues', label: 'Afficher les valeurs', kind: 'boolean' },
    ],
    defaultProps: { kind: 'barres', data: 'Lun : 12\nMar : 19\nMer : 15\nJeu : 24\nVen : 21\nSam : 9', unit: '', showValues: true },
    defaultStyle: {},
  },
  calendar: {
    type: 'calendar',
    label: 'Calendrier',
    category: 'pro',
    icon: 'calendar',
    description: 'Un mois en calendrier, avec tes événements sur les bons jours.',
    container: false,
    idPrefix: 'calendrier',
    fields: [
      { key: 'month', label: 'Mois', kind: 'text', placeholder: 'AAAA-MM', help: 'Ex. 2026-10. Vide : le mois en cours.' },
      { key: 'events', label: 'Événements (un par ligne)', kind: 'textarea', help: 'Jour : événement. Ex. : 12 : Réunion d’équipe' },
    ],
    defaultProps: { month: '', events: '3 : Lancement du projet\n12 : Réunion d’équipe\n18 : Démo client\n27 : Bilan du mois' },
    defaultStyle: {},
  },
  kanban: {
    type: 'kanban',
    label: 'Kanban',
    category: 'pro',
    icon: 'kanban',
    description: 'Des colonnes de cartes à faire glisser (à faire, en cours, terminé…), comme dans un outil de gestion de projet.',
    container: false,
    idPrefix: 'kanban',
    fields: [
      { key: 'columns', label: 'Colonnes (une par ligne)', kind: 'textarea', help: 'Titre : carte ; carte. Ex. : À faire : Maquette ; Logo' },
    ],
    defaultProps: { columns: 'À faire : Rédiger le cahier des charges ; Choisir les couleurs\nEn cours : Maquette de l’accueil\nTerminé : Réunion de lancement' },
    defaultStyle: { gap: 12 },
  },
  chat: {
    type: 'chat',
    label: 'Discussion',
    category: 'pro',
    icon: 'chat',
    description: 'Une conversation en bulles, avec une zone pour écrire et envoyer un message.',
    container: false,
    idPrefix: 'discussion',
    fields: [
      { key: 'messages', label: 'Messages (un par ligne)', kind: 'textarea', help: 'Auteur : message. Ex. : Alex : Salut !' },
      { key: 'me', label: 'Ton nom', kind: 'text', help: 'Tes messages s’affichent à droite.' },
      { key: 'composer', label: 'Zone pour écrire', kind: 'boolean' },
      { key: 'placeholder', label: 'Texte indicatif', kind: 'text' },
    ],
    defaultProps: {
      messages: 'Alex : Salut ! Tu as vu la nouvelle maquette ?\nMoi : Oui, elle est superbe.\nAlex : On la présente demain ?',
      me: 'Moi',
      composer: true,
      placeholder: 'Écris un message…',
    },
    defaultStyle: { padding: 16, gap: 12 },
  },
  code: {
    type: 'code',
    label: 'Code personnalisé',
    category: 'pro',
    icon: 'code',
    description: 'Ton propre HTML, CSS et JavaScript, pour ce que les autres briques ne savent pas encore faire.',
    container: false,
    idPrefix: 'code',
    fields: [
      { key: 'html', label: 'HTML', kind: 'code', help: 'Le contenu de la brique.' },
      { key: 'css', label: 'CSS', kind: 'code', help: 'Ajouté au style de toute la page. Commence tes sélecteurs par la classe de tes éléments.' },
      {
        key: 'js',
        label: 'JavaScript',
        kind: 'code',
        help: 'Lancé une fois la page prête. « bloc » est la brique elle-même, « etat » contient les variables de l’application.',
      },
    ],
    defaultProps: {
      html: '<p class="horloge">--:--:--</p>',
      css: '.horloge {\n  margin: 0;\n  font: 700 2.4rem/1 ui-monospace, monospace;\n  text-align: center;\n}',
      js: 'const horloge = bloc.querySelector(".horloge");\nconst tic = () => (horloge.textContent = new Date().toLocaleTimeString("fr-FR"));\ntic();\nsetInterval(tic, 1000);',
    },
    defaultStyle: { padding: 12 },
  },
  tabbar: {
    type: 'tabbar',
    label: 'Barre d’onglets',
    category: 'pro',
    icon: 'tabbar',
    description: 'La barre du bas des applications mobiles : une icône et un nom par page, mise à jour automatiquement.',
    container: false,
    idPrefix: 'onglets-bas',
    fields: [{ key: 'icons', label: 'Icônes (une par page)', kind: 'textarea', help: 'Dans l’ordre des pages. Ex. : maison, recherche, message, personne, reglages' }],
    defaultProps: { icons: 'maison\nrecherche\nmessage\npersonne' },
    defaultStyle: {},
  },
  stat: {
    type: 'stat',
    label: 'Chiffre clé',
    category: 'pro',
    icon: 'stat',
    description: 'Un indicateur de tableau de bord : un libellé, un grand chiffre et son évolution.',
    container: false,
    idPrefix: 'chiffre',
    fields: [
      { key: 'label', label: 'Libellé', kind: 'text', dynamic: true },
      { key: 'value', label: 'Valeur', kind: 'text', dynamic: true, help: 'Peut afficher une variable : {{total}} €' },
      { key: 'delta', label: 'Évolution', kind: 'text', help: 'Commence par + (en vert) ou - (en rouge). Ex. : +12 %' },
      { key: 'symbol', label: 'Icône', kind: 'icon' },
    ],
    defaultProps: { label: 'Chiffre d’affaires', value: '12 480 €', delta: '+8,2 %', symbol: 'paiement' },
    defaultStyle: { padding: 20 },
  },
  progress: {
    type: 'progress',
    label: 'Progression',
    category: 'pro',
    icon: 'progress',
    description: 'Une barre qui se remplit de 0 à 100 %, par exemple pour un objectif ou un chargement.',
    container: false,
    idPrefix: 'progression',
    fields: [
      { key: 'label', label: 'Libellé', kind: 'text', dynamic: true },
      { key: 'value', label: 'Valeur (0 à 100)', kind: 'text', dynamic: true, help: 'Un nombre, ou une variable : {{score}}' },
    ],
    defaultProps: { label: 'Objectif du mois', value: '65' },
    defaultStyle: {},
  },
}

export const PALETTE_ORDER: BrickType[] = [
  'section',
  'row',
  'stack',
  'grid',
  'card',
  'repeat',
  'tabs',
  'accordion',
  'modal',
  'navbar',
  'heading',
  'text',
  'link',
  'badge',
  'list',
  'button',
  'input',
  'textarea',
  'checkbox',
  'select',
  'image',
  'video',
  'icon',
  'divider',
  'spacer',
  'table',
  'chart',
  'stat',
  'progress',
  'calendar',
  'kanban',
  'chat',
  'tabbar',
  'code',
]

export const isContainer = (type: BrickType) => BRICKS[type].container

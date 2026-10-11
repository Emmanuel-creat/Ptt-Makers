import type { FontId, StyleTokens } from './styles'

export type BrickType =
  | 'page'
  | 'section'
  | 'row'
  | 'stack'
  | 'grid'
  | 'card'
  | 'repeat'
  | 'tabs'
  | 'accordion'
  | 'modal'
  | 'navbar'
  | 'heading'
  | 'text'
  | 'link'
  | 'badge'
  | 'list'
  | 'button'
  | 'input'
  | 'textarea'
  | 'checkbox'
  | 'select'
  | 'image'
  | 'video'
  | 'icon'
  | 'divider'
  | 'spacer'
  | 'table'
  | 'chart'
  | 'calendar'
  | 'kanban'
  | 'chat'
  | 'tabbar'
  | 'stat'
  | 'progress'
  | 'code'
  | 'form'
  | 'appshell'
  | 'appheader'

export type Category = 'structure' | 'texte' | 'interaction' | 'medias' | 'pro'

export type Align = 'start' | 'center' | 'end' | 'stretch'
export type Justify = 'start' | 'center' | 'end' | 'space-between'
export type Shadow = 'none' | 'sm' | 'md' | 'lg'

/** Styles réglables depuis le panneau Propriétés. Toutes les valeurs sont optionnelles. */
export interface BrickStyle {
  direction?: 'row' | 'column'
  gap?: number
  align?: Align
  justify?: Justify
  wrap?: boolean
  padding?: number
  margin?: number
  width?: string
  maxWidth?: string
  height?: string
  background?: string
  color?: string
  borderRadius?: number
  borderWidth?: number
  borderColor?: string
  shadow?: Shadow
  opacity?: number
  fontSize?: number
  fontWeight?: '400' | '500' | '600' | '700' | '800'
  textAlign?: 'left' | 'center' | 'right'
  /** Dans une rangée ou une pile : prendre la place restante. */
  grow?: boolean
  /** Alignement propre, différent de celui choisi par le parent. */
  alignSelf?: Align
  /** Position dans le parent (les plus petits d'abord). */
  order?: number
  /** Dans une grille : la zone nommée occupée, ou le nombre de colonnes couvertes. */
  area?: string
  span?: number
  /** Taille en pourcentage (100 = normale), utile au survol ou à l'appui. */
  scale?: number
}

export type PropValue = string | number | boolean

/** Formats d'écran qui peuvent avoir leurs propres réglages de style. */
export type ResponsiveScope = 'tablet' | 'mobile'

/** Réglages qui remplacent le style de base sur un format plus petit. */
export type StyleOverride = Partial<BrickStyle> & {
  /** Brique cachée sur ce format. */
  hide?: boolean
}

/** États d'une brique qui peuvent avoir leur propre style. */
export type StateScope = 'hover' | 'focus' | 'active' | 'disabled'
export const STATE_SCOPES: StateScope[] = ['hover', 'focus', 'active', 'disabled']
export const isStateScope = (s: unknown): s is StateScope => STATE_SCOPES.includes(s as StateScope)

/** Comparaisons possibles dans une action « Si ». */
export type ConditionOp = 'true' | 'false' | 'eq' | 'neq' | 'gt' | 'lt' | 'empty' | 'notEmpty'

/** Une comparaison : variable, opérateur, valeur (un texte, un nombre ou {{une autre variable}}). */
export interface Condition {
  variable: string
  op: ConditionOp
  value: string
}

export type Action =
  | { type: 'set'; variable: string; value: string }
  | { type: 'add'; variable: string; amount: number }
  | { type: 'toggleVar'; variable: string }
  | { type: 'show' | 'hide' | 'toggle' | 'scrollTo'; target: string }
  | { type: 'alert'; message: string }
  | { type: 'openUrl'; url: string }
  /** Aller sur une autre page du projet, avec une valeur facultative (ex. l'identifiant d'une fiche) que la page reçoit. */
  | { type: 'navigate'; page: string; value?: string }
  /** Vérifier les champs d'un formulaire : s'il y a une erreur, les actions suivantes ne sont pas faites. */
  | { type: 'validate'; target: string }
  /** Attendre un moment avant l'action suivante (en millisecondes). */
  | { type: 'wait'; ms: number }
  /** Ajouter un élément à la fin d'une liste. */
  | { type: 'listAdd'; variable: string; value: string }
  /** Retirer un élément : celui de la copie cliquée (dans une répétition), le premier ou le dernier. */
  | { type: 'listRemove'; variable: string; which: 'current' | 'first' | 'last' }
  | { type: 'listClear'; variable: string }
  /**
   * Si la condition est remplie, faire « alors », sinon faire « sinon ». `more` ajoute d'autres conditions, reliées par
   * `join` (« et » : toutes vraies, « ou » : au moins une). La valeur comparée peut être une autre variable : {{nom}}.
   */
  | { type: 'if'; variable: string; op: ConditionOp; value: string; then: Action[]; else: Action[]; join?: 'and' | 'or'; more?: Condition[] }
  /**
   * Appeler une adresse web (API JSON). GET charge des données dans la variable ; POST, PUT, PATCH et DELETE envoient
   * le corps (une ligne « nom: valeur » par champ, avec des {{variables}}) et peuvent garder la réponse.
   * Les en-têtes s'écrivent aussi une ligne « Nom: valeur » chacun.
   */
  | { type: 'fetch'; url: string; variable: string; path: string; method?: HttpMethod; headers?: string; body?: string }
  /** Ajouter une fiche à une collection : une valeur (qui peut contenir des {{variables}}) par champ. */
  | { type: 'addRecord'; variable: string; values: Record<string, string> }
  /** Comptes de l'application : créer un compte, se connecter (la variable reçoit l'e-mail), se déconnecter (elle est vidée). */
  | { type: 'signup'; variable: string; email: string; password: string }
  | { type: 'login'; variable: string; email: string; password: string }
  | { type: 'logout'; variable: string }
  /** Lancer une fonction réutilisable du projet (ses actions, puis on continue). */
  | { type: 'call'; name: string }
  /** Passer de l'ambiance claire à la sombre (ou l'inverse) ; le choix est gardé dans le navigateur. */
  | { type: 'toggleTheme' }

export type ActionType = Action['type']

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

/** Les listes d'actions d'une brique, une par événement. */
export type EventField = 'onClick' | 'onLoad' | 'onHover' | 'onInput' | 'onChange' | 'onKey' | 'onTimer' | 'onSubmit'

/** Case occupée sur une page en grille : colonne et rangée de départ (à partir de 1), largeur en colonnes, hauteur en rangées. */
export interface GridPlace {
  col: number
  row: number
  w: number
  h: number
}

export interface BrickNode {
  /** Identifiant lisible, unique, réutilisé comme id HTML (ex. « bouton-2 »). */
  id: string
  type: BrickType
  /** Nom affiché dans les calques. */
  name: string
  props: Record<string, PropValue>
  style: BrickStyle
  children: string[]
  parent: string | null
  /** Actions déclenchées au clic. */
  onClick: Action[]
  /** Pages uniquement : actions lancées quand la page s'affiche. */
  onLoad?: Action[]
  /** Quand la souris arrive sur la brique. */
  onHover?: Action[]
  /** Champs : à chaque lettre tapée, et quand la valeur est validée (champ quitté, choix fait, case cochée). */
  onInput?: Action[]
  onChange?: Action[]
  /** Champs : quand on appuie sur la touche choisie (props.eventKey, Entrée par défaut). */
  onKey?: Action[]
  /** Pages : actions répétées toutes les props.timerMs millisecondes. */
  onTimer?: Action[]
  /** Formulaires : actions lancées à l'envoi, une fois tous les champs vérifiés. */
  onSubmit?: Action[]
  /** Style propre à la tablette (largeur ≤ 900 px) et au mobile (≤ 600 px). */
  responsive?: Partial<Record<ResponsiveScope, StyleOverride>>
  /** Style au survol, au focus, à l'appui et quand la brique est désactivée (seulement ce qui change). */
  states?: Partial<Record<StateScope, Partial<BrickStyle>>>
  /** Boutons et champs : désactivés tant que cette variable est « vraie ». */
  disabledIf?: string
  /** Masquée au démarrage (peut être affichée par une action). */
  hidden?: boolean
  /** Affichée seulement si cette variable est « vraie ». */
  showIf?: string
  /** Position sur la grille, quand le parent est une page en placement libre. */
  place?: GridPlace
  /** Copie liée d'un composant de Mes composants : modifier une copie met à jour toutes les autres. */
  instanceOf?: string
  /** Copie liée : la variante du composant qu'elle affiche (son style s'ajoute à celui de la copie). */
  variant?: string
}

export type VariableKind = 'text' | 'number' | 'boolean' | 'list' | 'collection'

/** Types des champs d'une collection. */
export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'image' | 'link' | 'formula'

/** Un champ d'une collection (une colonne de la base de données). */
export interface CollectionField {
  /** Nom technique, utilisé dans {{element.nom}}. */
  name: string
  /** Nom affiché (titre de colonne). */
  label: string
  type: FieldType
  /** Champ calculé : sa formule, avec les autres champs (ex. « prix * quantite »). */
  formula?: string
}

/** Une fiche d'une collection : une valeur par champ. */
export type DataRecord = Record<string, string | number | boolean>

export type VariableValue = string | number | boolean | string[] | DataRecord[]

export interface Variable {
  name: string
  kind: VariableKind
  /** Valeur de départ (une liste de textes pour « list », des fiches pour « collection »). */
  initial: VariableValue
  /** Collections : les champs de chaque fiche. */
  fields?: CollectionField[]
  /** Gardée dans le navigateur de l'application générée : elle survit à un rechargement. */
  persist?: boolean
}

/** Thème du projet, partagé par toutes les pages : un style prêt à l'emploi et les réglages changés à la main. */
export interface ProjectTheme {
  /** Style choisi (voir model/styles). */
  style?: string
  /** Réglages changés dans le Studio de style. */
  tokens?: Partial<StyleTokens>
  /**
   * Version sombre de l'application générée (claire pour un style sombre) : « auto » suit le réglage de l'appareil,
   * « bouton » ne change qu'avec l'action « Changer d'ambiance ». Les deux gardent le choix de la personne.
   */
  darkMode?: 'auto' | 'bouton'
  /** Anciens réglages (avant le moteur de styles), toujours pris en compte. */
  primary?: string
  radius?: number
  font?: FontId
}

/** Fonction réutilisable : une suite d'actions nommée, lancée par l'action « Lancer une fonction ». */
export interface AppFunction {
  name: string
  actions: Action[]
}

/** Bloc réutilisable enregistré par l'utilisateur (une copie est insérée à chaque utilisation). */
export interface SavedComponent {
  id: string
  name: string
  rootId: string
  nodes: Record<string, BrickNode>
  /** Variantes : un même composant avec un autre style (« Mise en avant », « Danger »…). */
  variants?: ComponentVariant[]
}

/** Une variante d'un composant : ce qui change dans le style de sa racine. */
export interface ComponentVariant {
  name: string
  style: Partial<BrickStyle>
}

export interface Project {
  version: 1
  name: string
  /** Page d'accueil (la première affichée). */
  rootId: string
  /** Toutes les pages, dans l'ordre des onglets. Chaque page est une brique « page » sans parent. */
  pages: string[]
  nodes: Record<string, BrickNode>
  variables: Variable[]
  theme?: ProjectTheme
  components?: SavedComponent[]
  functions?: AppFunction[]
}

export type DropPosition = 'before' | 'after' | 'inside'

export interface DropTarget {
  id: string
  position: DropPosition
  /** Page en grille : case visée par le pointeur (coin haut gauche de la brique déposée). */
  cell?: { col: number; row: number }
}

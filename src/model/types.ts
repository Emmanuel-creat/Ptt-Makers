export type BrickType =
  | 'page'
  | 'section'
  | 'row'
  | 'stack'
  | 'grid'
  | 'card'
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
  | 'divider'
  | 'spacer'

export type Category = 'structure' | 'texte' | 'interaction' | 'medias'

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
}

export type PropValue = string | number | boolean

export type Action =
  | { type: 'set'; variable: string; value: string }
  | { type: 'add'; variable: string; amount: number }
  | { type: 'toggleVar'; variable: string }
  | { type: 'show' | 'hide' | 'toggle' | 'scrollTo'; target: string }
  | { type: 'alert'; message: string }
  | { type: 'openUrl'; url: string }

export type ActionType = Action['type']

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
  /** Masquée au démarrage (peut être affichée par une action). */
  hidden?: boolean
  /** Affichée seulement si cette variable est « vraie ». */
  showIf?: string
}

export type VariableKind = 'text' | 'number' | 'boolean'

export interface Variable {
  name: string
  kind: VariableKind
  initial: string | number | boolean
}

export interface Project {
  version: 1
  name: string
  rootId: string
  nodes: Record<string, BrickNode>
  variables: Variable[]
}

export type DropPosition = 'before' | 'after' | 'inside'

export interface DropTarget {
  id: string
  position: DropPosition
}

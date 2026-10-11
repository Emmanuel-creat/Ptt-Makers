import { BRICKS, type FieldDef } from '../model/bricks'
import { buildApp, type PageSpec, type Spec } from '../model/templates'
import type { Action, BrickNode, BrickStyle, BrickType, ConditionOp, Project, PropValue, Variable, VariableKind } from '../model/types'

/**
 * Format d'échange entre Ptt-Makers et l'IA.
 * Le schéma JSON ne peut pas être récursif : l'arbre des briques est donc une liste
 * à plat où chaque brique nomme son parent, comme dans le modèle du projet.
 */

export interface AiKeyValue {
  key: string
  value: string
}

export interface AiBaseAction {
  type: Exclude<Action['type'], 'if'>
  variable: string
  value: string
  amount: number
  target: string
  message: string
  url: string
  page: string
  which: 'current' | 'first' | 'last' | ''
  path: string
}

export interface AiAction extends Omit<AiBaseAction, 'type'> {
  type: Action['type']
  op: ConditionOp | ''
  then: AiBaseAction[]
  else: AiBaseAction[]
}

export interface AiBrick {
  ref: string
  parent: string
  type: Exclude<BrickType, 'page'>
  name: string
  props: AiKeyValue[]
  style: AiKeyValue[]
  hidden: boolean
  showIf: string
  onClick: AiAction[]
}

export interface AiPage {
  ref: string
  name: string
  title: string
  style: AiKeyValue[]
  onLoad: AiAction[]
}

export interface AiVariable {
  name: string
  kind: VariableKind
  initial: string
}

export interface AiProject {
  name: string
  summary: string
  theme: { primary: string; radius: number; font: 'inter' | 'system' | 'arrondie' | 'serif' | 'mono' | '' }
  variables: AiVariable[]
  pages: AiPage[]
  bricks: AiBrick[]
}

/* --------------------------------- Schéma -------------------------------- */

const ACTION_TYPES: Action['type'][] = [
  'set',
  'add',
  'toggleVar',
  'show',
  'hide',
  'toggle',
  'scrollTo',
  'alert',
  'openUrl',
  'navigate',
  'listAdd',
  'listRemove',
  'listClear',
  'if',
  'fetch',
]
const BRICK_TYPES = (Object.keys(BRICKS) as BrickType[]).filter((t) => t !== 'page')
const STYLE_KEYS: (keyof BrickStyle)[] = [
  'direction',
  'gap',
  'align',
  'justify',
  'wrap',
  'padding',
  'margin',
  'width',
  'maxWidth',
  'height',
  'background',
  'color',
  'borderRadius',
  'borderWidth',
  'borderColor',
  'shadow',
  'opacity',
  'fontSize',
  'fontWeight',
  'textAlign',
]
const NUMERIC_STYLE = new Set<keyof BrickStyle>(['gap', 'padding', 'margin', 'borderRadius', 'borderWidth', 'opacity', 'fontSize'])

const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
})
const str = { type: 'string' }
const keyValues = (keys?: string[]) => ({ type: 'array', items: obj({ key: keys ? { type: 'string', enum: keys } : str, value: str }) })

const baseActionProps = {
  type: { type: 'string', enum: ACTION_TYPES.filter((t) => t !== 'if') },
  variable: str,
  value: str,
  amount: { type: 'number' },
  target: str,
  message: str,
  url: str,
  page: str,
  which: { type: 'string', enum: ['current', 'first', 'last', ''] },
  path: str,
}
const baseAction = obj(baseActionProps)
const action = obj({
  ...baseActionProps,
  type: { type: 'string', enum: ACTION_TYPES },
  op: { type: 'string', enum: ['true', 'false', 'eq', 'neq', 'gt', 'lt', 'empty', 'notEmpty', ''] },
  then: { type: 'array', items: baseAction },
  else: { type: 'array', items: baseAction },
})

export const PROJECT_SCHEMA = obj({
  name: str,
  summary: str,
  theme: obj({ primary: str, radius: { type: 'number' }, font: { type: 'string', enum: ['inter', 'system', 'arrondie', 'serif', 'mono', ''] } }),
  variables: { type: 'array', items: obj({ name: str, kind: { type: 'string', enum: ['text', 'number', 'boolean', 'list'] }, initial: str }) },
  pages: { type: 'array', items: obj({ ref: str, name: str, title: str, style: keyValues(STYLE_KEYS), onLoad: { type: 'array', items: action } }) },
  bricks: {
    type: 'array',
    items: obj({
      ref: str,
      parent: str,
      type: { type: 'string', enum: BRICK_TYPES },
      name: str,
      props: keyValues(),
      style: keyValues(STYLE_KEYS),
      hidden: { type: 'boolean' },
      showIf: str,
      onClick: { type: 'array', items: action },
    }),
  },
})

/* ------------------------- Description pour l'IA ------------------------- */

const fieldDoc = (f: FieldDef) => {
  const extra = f.kind === 'select' && f.options ? ` (${f.options.map((o) => o.value).join(' | ')})` : ''
  return `${f.key}: ${f.kind}${extra}`
}

/** Liste des briques et de leurs propriétés, tirée du catalogue de l'éditeur. */
export function brickCatalog(): string {
  return BRICK_TYPES.map((t) => {
    const d = BRICKS[t]
    const fields = d.fields.map(fieldDoc).join(', ')
    return `- ${t}${d.container ? ' (conteneur)' : ''} : ${d.description}${fields ? ` Propriétés : ${fields}.` : ''}`
  }).join('\n')
}

/* ------------------------- Réponse de l'IA → projet ------------------------ */

function toStyle(list: AiKeyValue[]): BrickStyle | undefined {
  const style: Record<string, PropValue> = {}
  for (const { key, value } of list ?? []) {
    if (!STYLE_KEYS.includes(key as keyof BrickStyle) || value === '') continue
    if (NUMERIC_STYLE.has(key as keyof BrickStyle)) {
      const n = Number.parseFloat(value)
      if (Number.isFinite(n)) style[key] = n
    } else if (key === 'wrap') style[key] = value === 'true'
    else style[key] = value
  }
  return Object.keys(style).length ? (style as BrickStyle) : undefined
}

function toProps(type: BrickType, list: AiKeyValue[]): Record<string, PropValue> {
  const fields = BRICKS[type].fields
  const props: Record<string, PropValue> = {}
  for (const { key, value } of list ?? []) {
    const f = fields.find((x) => x.key === key)
    if (!f) continue
    if (f.kind === 'number') {
      const n = Number.parseFloat(value)
      if (Number.isFinite(n)) props[key] = n
    } else if (f.kind === 'boolean') props[key] = value === 'true'
    else props[key] = value
  }
  return props
}

const at = (ref: string) => (ref && !ref.startsWith('@') ? `@${ref}` : ref)

function toAction(a: AiBaseAction | AiAction): Action | null {
  switch (a.type) {
    case 'set':
      return { type: 'set', variable: a.variable, value: a.value }
    case 'add':
      return { type: 'add', variable: a.variable, amount: Number.isFinite(a.amount) ? a.amount : 1 }
    case 'toggleVar':
    case 'listClear':
      return { type: a.type, variable: a.variable }
    case 'show':
    case 'hide':
    case 'toggle':
    case 'scrollTo':
      return { type: a.type, target: at(a.target) }
    case 'alert':
      return { type: 'alert', message: a.message }
    case 'openUrl':
      return { type: 'openUrl', url: a.url }
    case 'navigate':
      return { type: 'navigate', page: at(a.page) }
    case 'listAdd':
      return { type: 'listAdd', variable: a.variable, value: a.value }
    case 'listRemove':
      return { type: 'listRemove', variable: a.variable, which: a.which || 'current' }
    case 'fetch':
      return { type: 'fetch', url: a.url, variable: a.variable, path: a.path }
    case 'if': {
      const full = a as AiAction
      return {
        type: 'if',
        variable: full.variable,
        op: full.op || 'true',
        value: full.value,
        then: toActions(full.then),
        else: toActions(full.else),
      }
    }
    default:
      return null
  }
}

const toActions = (list: (AiBaseAction | AiAction)[] | undefined) => (list ?? []).map(toAction).filter((a): a is Action => !!a)

function toVariable(v: AiVariable): Variable | null {
  const name = String(v.name ?? '').trim()
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return null
  const raw = String(v.initial ?? '')
  switch (v.kind) {
    case 'number':
      return { name, kind: 'number', initial: Number.parseFloat(raw) || 0 }
    case 'boolean':
      return { name, kind: 'boolean', initial: raw === 'true' }
    case 'list':
      return { name, kind: 'list', initial: raw.split('\n').map((s) => s.trim()).filter(Boolean) }
    default:
      return { name, kind: 'text', initial: raw }
  }
}

/** Construit un vrai projet Ptt-Makers à partir de la réponse de l'IA (les briques inconnues sont ignorées). */
export function aiToProject(ai: AiProject): Project {
  const pageRefs = new Set(ai.pages.map((p) => p.ref))
  const known = new Set<string>([...pageRefs])
  const children = new Map<string, Spec[]>()
  const specs = new Map<string, Spec>()

  // Les parents doivent exister et être des conteneurs ; sinon la brique va sur la première page.
  for (const b of ai.bricks) {
    if (!BRICKS[b.type] || b.type === ('page' as BrickType) || known.has(b.ref)) continue
    known.add(b.ref)
    const props = toProps(b.type, b.props)
    if (b.type === 'link' && typeof props.page === 'string' && props.page) props.page = at(props.page)
    const spec: Spec = {
      type: b.type,
      ref: b.ref,
      name: b.name || undefined,
      props,
      style: toStyle(b.style),
      hidden: b.hidden || undefined,
      showIf: b.showIf || undefined,
      onClick: toActions(b.onClick),
      children: [],
    }
    specs.set(b.ref, spec)
  }
  const firstPage = ai.pages[0]?.ref ?? 'accueil'
  for (const b of ai.bricks) {
    const spec = specs.get(b.ref)
    if (!spec) continue
    const parentSpec = specs.get(b.parent)
    if (parentSpec && BRICKS[parentSpec.type].container && b.parent !== b.ref) parentSpec.children!.push(spec)
    else {
      const page = pageRefs.has(b.parent) ? b.parent : firstPage
      children.set(page, [...(children.get(page) ?? []), spec])
    }
  }

  const pages: PageSpec[] = (ai.pages.length ? ai.pages : [{ ref: firstPage, name: 'Accueil', title: ai.name, style: [], onLoad: [] }]).map((p) => ({
    ref: p.ref,
    name: p.name || 'Page',
    title: p.title || undefined,
    style: toStyle(p.style),
    onLoad: toActions(p.onLoad),
    children: children.get(p.ref) ?? [],
  }))
  const variables = ai.variables.map(toVariable).filter((v): v is Variable => !!v)
  const project = buildApp(ai.name || 'Projet IA', pages, variables)
  const theme = ai.theme
  if (theme && (theme.primary || theme.font || theme.radius)) {
    project.theme = {
      primary: /^#[0-9a-f]{6}$/i.test(theme.primary) ? theme.primary : undefined,
      radius: theme.radius > 0 ? theme.radius : undefined,
      font: theme.font || undefined,
    }
  }
  return project
}

/* ------------------------ Projet → format de l'IA ------------------------ */

const kv = (o: Record<string, unknown>): AiKeyValue[] =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([key, value]) => ({ key, value: String(value) }))

function fromAction(a: Action): AiAction {
  const base: AiAction = {
    type: a.type,
    variable: '',
    value: '',
    amount: 0,
    target: '',
    message: '',
    url: '',
    page: '',
    which: '',
    path: '',
    op: '',
    then: [],
    else: [],
  }
  const full = { ...base, ...a } as AiAction
  if (a.type === 'if') {
    full.then = a.then.map((x) => ({ ...fromAction(x), type: x.type as AiBaseAction['type'] }))
    full.else = a.else.map((x) => ({ ...fromAction(x), type: x.type as AiBaseAction['type'] }))
  }
  return full
}

/** Décrit le projet ouvert dans le format de l'IA, pour qu'elle le modifie. */
export function projectToAi(p: Project): AiProject {
  const bricks: AiBrick[] = []
  const walk = (node: BrickNode) => {
    for (const id of node.children) {
      const c = p.nodes[id]
      if (!c) continue
      bricks.push({
        ref: c.id,
        parent: node.id,
        type: c.type as AiBrick['type'],
        name: c.name,
        props: kv(c.props),
        style: kv(c.style as Record<string, unknown>),
        hidden: !!c.hidden,
        showIf: c.showIf ?? '',
        onClick: (c.onClick ?? []).map(fromAction),
      })
      walk(c)
    }
  }
  const pages = p.pages.map((id) => {
    const page = p.nodes[id]
    walk(page)
    return { ref: id, name: page.name, title: String(page.props.title ?? ''), style: kv(page.style as Record<string, unknown>), onLoad: (page.onLoad ?? []).map(fromAction) }
  })
  return {
    name: p.name,
    summary: '',
    theme: { primary: p.theme?.primary ?? '', radius: p.theme?.radius ?? 0, font: p.theme?.font ?? '' },
    variables: p.variables.map((v) => ({ name: v.name, kind: v.kind, initial: Array.isArray(v.initial) ? v.initial.join('\n') : String(v.initial) })),
    pages,
    bricks,
  }
}

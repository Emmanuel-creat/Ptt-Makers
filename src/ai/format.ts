import { BRICKS, type FieldDef } from '../model/bricks'
import { clampPlace, isFreeGrid } from '../model/freeGrid'
import { ICON_NAMES } from '../model/icons'
import { FONT_IDS, STYLE_IDS, stylePreset, type FontId } from '../model/styles'
import { buildApp, type PageSpec, type Spec } from '../model/templates'
import type { Action, BrickNode, BrickStyle, BrickType, CollectionField, ConditionOp, Project, ProjectTheme, PropValue, Variable, VariableKind } from '../model/types'
import { DEFAULT_FIELDS, FIELD_TYPE_LABEL, inferFields, isRecord } from '../model/collections'

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
  /** Case sur une page en grille (tout à 0 si la page est en pile). */
  place: { col: number; row: number; w: number; h: number }
}

export interface AiPage {
  ref: string
  name: string
  title: string
  style: AiKeyValue[]
  onLoad: AiAction[]
  layout: 'pile' | 'grille'
  /** Variable qui reçoit la valeur envoyée à la page (vide : aucune). */
  paramVar?: string
  /** Page réservée : variable de la personne connectée et ref de la page de connexion (vides : page ouverte à tous). */
  loginVar?: string
  loginPage?: string
}

export interface AiVariable {
  name: string
  kind: VariableKind
  initial: string
  /** Gardée dans le navigateur après un rechargement. */
  persist?: boolean
}

export interface AiProject {
  name: string
  summary: string
  theme: { style: string; primary: string; radius: number; font: FontId | '' }
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
  'addRecord',
  'if',
  'fetch',
  'validate',
  'wait',
  'signup',
  'login',
  'logout',
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
  theme: obj({
    style: { type: 'string', enum: [...STYLE_IDS, ''] },
    primary: str,
    radius: { type: 'number' },
    font: { type: 'string', enum: [...FONT_IDS, ''] },
  }),
  variables: { type: 'array', items: obj({ name: str, kind: { type: 'string', enum: ['text', 'number', 'boolean', 'list', 'collection'] }, initial: str, persist: { type: 'boolean' } }) },
  pages: {
    type: 'array',
    items: obj({ ref: str, name: str, title: str, style: keyValues(STYLE_KEYS), onLoad: { type: 'array', items: action }, layout: { type: 'string', enum: ['pile', 'grille'] }, paramVar: str, loginVar: str, loginPage: str }),
  },
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
      place: obj({ col: { type: 'integer' }, row: { type: 'integer' }, w: { type: 'integer' }, h: { type: 'integer' } }),
    }),
  },
})

/* ------------------------- Description pour l'IA ------------------------- */

const fieldDoc = (f: FieldDef) => {
  const extra =
    f.kind === 'select' && f.options
      ? ` (${f.options.map((o) => o.value).join(' | ')})`
      : f.kind === 'icon'
        ? ` (un nom parmi : ${ICON_NAMES.join(', ')})`
        : ''
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
      return a.value ? { type: 'navigate', page: at(a.page), value: a.value } : { type: 'navigate', page: at(a.page) }
    case 'validate':
      return { type: 'validate', target: at(a.target) }
    case 'wait':
      return { type: 'wait', ms: Number.isFinite(a.amount) && a.amount > 0 ? a.amount : 1000 }
    case 'listAdd':
      return { type: 'listAdd', variable: a.variable, value: a.value }
    case 'listRemove':
      return { type: 'listRemove', variable: a.variable, which: a.which || 'current' }
    case 'fetch':
      return { type: 'fetch', url: a.url, variable: a.variable, path: a.path }
    // Comptes : value = l'e-mail, message = le mot de passe (avec des {{variables}})
    case 'signup':
    case 'login':
      return { type: a.type, variable: a.variable, email: a.value, password: a.message }
    case 'logout':
      return { type: 'logout', variable: a.variable }
    case 'addRecord': {
      // value : les valeurs de la fiche en JSON, ex. {"nom": "{{nom_saisi}}", "prix": "{{prix_saisi}}"}
      let values: Record<string, string> = {}
      try {
        const parsed: unknown = JSON.parse(a.value || '{}')
        if (isRecord(parsed)) values = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)]))
      } catch {
        values = {}
      }
      return { type: 'addRecord', variable: a.variable, values }
    }
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
  const made = toVariableValue(v)
  return made && v.persist && !made.persist ? { ...made, persist: true } : made
}

function toVariableValue(v: AiVariable): Variable | null {
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
    case 'collection': {
      // Les fiches arrivent en JSON : [{"nom": "…", "prix": 12}, …]
      // ou avec leurs champs : {"champs": [{"name", "label", "type"}], "fiches": […], "garder": true}
      let parsed: unknown = []
      try {
        parsed = JSON.parse(raw || '[]')
      } catch {
        parsed = []
      }
      const box = isRecord(parsed) ? (parsed as Record<string, unknown>) : null
      const list = Array.isArray(parsed) ? parsed : Array.isArray(box?.fiches) ? box.fiches : []
      const records = (list as unknown[]).filter(isRecord)
      const given = Array.isArray(box?.champs)
        ? (box.champs as unknown[]).filter(
            (f): f is CollectionField =>
              isRecord(f) && typeof f.name === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(f.name) && String(f.type) in FIELD_TYPE_LABEL,
          )
        : []
      const fields = given.length
        ? given.map((f) => ({ name: f.name, label: String(f.label || f.name), type: f.type, ...(f.type === 'formula' ? { formula: String(f.formula ?? '') } : {}) }))
        : records.length
          ? inferFields(records)
          : DEFAULT_FIELDS
      return { name, kind: 'collection', fields, initial: records, ...(box?.garder === true ? { persist: true } : {}) }
    }
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
      place: b.place && b.place.col > 0 && b.place.row > 0 && b.place.w > 0 && b.place.h > 0 ? clampPlace(b.place) : undefined,
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

  const pages: PageSpec[] = (ai.pages.length ? ai.pages : [{ ref: firstPage, name: 'Accueil', title: ai.name, style: [], onLoad: [], layout: 'pile' as const, paramVar: '', loginVar: '', loginPage: '' }]).map((p) => ({
    ref: p.ref,
    name: p.name || 'Page',
    title: p.title || undefined,
    style: toStyle(p.style),
    onLoad: toActions(p.onLoad),
    grid: p.layout === 'grille' || undefined,
    paramVar: p.paramVar || undefined,
    login: p.loginVar && p.loginPage ? { variable: p.loginVar, page: at(p.loginPage) } : undefined,
    children: children.get(p.ref) ?? [],
  }))
  const variables = ai.variables.map(toVariable).filter((v): v is Variable => !!v)
  const project = buildApp(ai.name || 'Projet IA', pages, variables)
  const theme = ai.theme
  if (theme && (theme.style || theme.primary || theme.font || theme.radius)) {
    const t: ProjectTheme = {
      style: stylePreset(theme.style) ? theme.style : undefined,
      primary: /^#[0-9a-f]{6}$/i.test(theme.primary) ? theme.primary : undefined,
      radius: theme.radius > 0 ? theme.radius : undefined,
      font: (FONT_IDS as readonly string[]).includes(theme.font) ? (theme.font as FontId) : undefined,
    }
    for (const k of Object.keys(t) as (keyof ProjectTheme)[]) if (t[k] === undefined) delete t[k]
    if (Object.keys(t).length) project.theme = t
  }
  return project
}

/* ------------------------ Projet → format de l'IA ------------------------ */

const kv = (o: Record<string, unknown>): AiKeyValue[] =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([key, value]) => ({ key, value: String(value) }))

/** Comme kv, mais un texte vidé exprès reste vide : sinon la valeur par défaut de la brique reviendrait. */
const propsKv = (type: BrickType, o: Record<string, unknown>): AiKeyValue[] =>
  Object.entries(o)
    .filter(([key, v]) => v !== undefined && (v !== '' || !!BRICKS[type].defaultProps[key]))
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
  if (a.type === 'addRecord') {
    delete (full as Partial<AiAction> & { values?: unknown }).values
    full.value = JSON.stringify(a.values ?? {})
  }
  if (a.type === 'signup' || a.type === 'login') {
    const extra = full as Partial<AiAction> & { email?: unknown; password?: unknown }
    delete extra.email
    delete extra.password
    full.value = a.email
    full.message = a.password
  }
  if (a.type === 'wait') {
    delete (full as Partial<AiAction> & { ms?: unknown }).ms
    full.amount = a.ms
  }
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
        props: propsKv(c.type, c.props),
        style: kv(c.style as Record<string, unknown>),
        hidden: !!c.hidden,
        showIf: c.showIf ?? '',
        onClick: (c.onClick ?? []).map(fromAction),
        place: c.place ? { ...c.place } : { col: 0, row: 0, w: 0, h: 0 },
      })
      walk(c)
    }
  }
  const pages = p.pages.map((id) => {
    const page = p.nodes[id]
    walk(page)
    return {
      ref: id,
      name: page.name,
      title: String(page.props.title ?? ''),
      style: kv(page.style as Record<string, unknown>),
      onLoad: (page.onLoad ?? []).map(fromAction),
      layout: isFreeGrid(page) ? ('grille' as const) : ('pile' as const),
      paramVar: String(page.props.paramVar ?? ''),
      loginVar: String(page.props.loginVar ?? ''),
      loginPage: String(page.props.loginPage ?? ''),
    }
  })
  return {
    name: p.name,
    summary: '',
    theme: { style: p.theme?.style ?? '', primary: p.theme?.primary ?? '', radius: p.theme?.radius ?? 0, font: p.theme?.font ?? '' },
    variables: p.variables.map((v) => ({
      name: v.name,
      kind: v.kind,
      initial:
        v.kind === 'collection'
          ? JSON.stringify({ champs: v.fields ?? [], fiches: v.initial, ...(v.persist ? { garder: true } : {}) })
          : Array.isArray(v.initial)
            ? v.initial.join('\n')
            : String(v.initial),
      persist: !!v.persist,
    })),
    pages,
    bricks,
  }
}

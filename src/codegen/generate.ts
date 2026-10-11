import { BRICKS } from '../model/bricks'
import { iconSvg } from '../model/icons'
import { fieldsOf, isCollection, isListLike, normalize, type FilterOp } from '../model/collections'
import { compileExpr, compileRecordField, exprHelpers, type CompileEnv } from '../model/expressions'
import type { Action, BrickNode, CollectionField, Project, Variable } from '../model/types'
import { interpolate, parseTemplate, toVariableName } from '../model/variables'
import { BASE_CSS, PLACEHOLDER_IMAGE, brickClass } from './baseCss'
import { escapeHtml, escapeTemplate, safeHref, safeImageSrc, videoSource } from './escape'
import { closeSafe } from './customCode'
import { proHtml, shownField, tableSource, tabbarIcons } from './proBricks'
import { BREAKPOINTS, overrideEntries, styleEntries, themeEntries, themeFontsUrl } from './style'

export type LineRange = [start: number, end: number]

export interface GeneratedCode {
  html: string
  css: string
  js: string
  /** Lignes (numérotées à partir de 1) occupées par chaque brique dans chaque fichier. */
  map: Record<string, { html?: LineRange; css?: LineRange; js?: LineRange }>
}

class Emitter {
  lines: string[] = []
  push(line = '') {
    this.lines.push(line)
  }
  get line() {
    return this.lines.length
  }
  toString() {
    return this.lines.join('\n') + '\n'
  }
}

/** Contexte partagé pendant la génération. */
interface Gen {
  project: Project
  map: GeneratedCode['map']
  /** Pour chaque brique placée dans une répétition : l'identifiant de cette répétition. */
  repeatOf: Map<string, string>
  /** Répétitions actives (les répétitions imbriquées dans une autre sont rendues comme un simple bloc). */
  repeats: Set<string>
}

function setRange(map: GeneratedCode['map'], id: string, kind: 'html' | 'css' | 'js', range: LineRange) {
  map[id] = { ...map[id], [kind]: range }
}

function createGen(project: Project): Gen {
  const repeatOf = new Map<string, string>()
  const repeats = new Set<string>()
  const visit = (id: string, repeat: string | null) => {
    const n = project.nodes[id]
    if (!n) return
    if (repeat) repeatOf.set(id, repeat)
    let inner = repeat
    if (n.type === 'repeat' && !repeat) {
      repeats.add(id)
      inner = id
    }
    n.children.forEach((c) => visit(c, inner))
  }
  for (const p of project.pages) visit(p, null)
  return { project, map: {}, repeatOf, repeats }
}

/** Ordre du document : toutes les pages, de haut en bas. */
function documentOrder(project: Project): BrickNode[] {
  const order: BrickNode[] = []
  const visit = (id: string) => {
    const n = project.nodes[id]
    if (!n) return
    order.push(n)
    n.children.forEach(visit)
  }
  project.pages.forEach(visit)
  return order
}

/** Sélecteur CSS d'une brique : un id, ou une classe pour les briques répétées (il y en a plusieurs copies). */
const selectorOf = (g: Gen, id: string) => (g.repeatOf.has(id) ? `.${id}` : `#${id}`)
/** Sélecteur qui reçoit le style réglé : pour une fenêtre, c'est la boîte et non le fond sombre. */
const styleSelector = (g: Gen, node: BrickNode) => selectorOf(g, node.id) + (node.type === 'modal' ? ' > .modal-box' : '')

/* ---------------------------------- HTML --------------------------------- */

function attrs(list: [string, string | true | null | undefined][]): string {
  return list
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escapeHtml(String(v))}"`))
    .join('')
}

function isInitiallyHidden(node: BrickNode, variables: Variable[]): boolean {
  if (node.hidden) return true
  if (node.showIf) {
    const v = variables.find((x) => x.name === node.showIf)
    if (v) return Array.isArray(v.initial) ? v.initial.length === 0 : !v.initial
  }
  return false
}

const lines = (s: unknown) =>
  String(s ?? '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)

const INPUT_TYPES = ['text', 'email', 'number', 'date', 'password']

/** Les règles d'un champ de formulaire, en attributs HTML (required, minlength, min, max). */
function validationAttrs(node: BrickNode): { list: [string, string | true | null][]; checked: boolean } {
  const p = node.props
  const type = String(p.inputType || 'text')
  const out: [string, string | true | null][] = []
  if (p.required) out.push(['required', true])
  const minLength = Number(p.minLength) || 0
  if (minLength > 0 && (node.type === 'textarea' || (node.type === 'input' && type !== 'number' && type !== 'date'))) out.push(['minlength', String(minLength)])
  if (node.type === 'input' && type === 'number') {
    for (const k of ['min', 'max'] as const) {
      const n = Number(String(p[k] ?? '').replace(',', '.'))
      if (String(p[k] ?? '').trim() && Number.isFinite(n)) out.push([k, String(n)])
    }
  }
  // Une adresse e-mail est toujours vérifiée, même facultative.
  if (!out.length && !(node.type === 'input' && type === 'email')) return { list: out, checked: false }
  out.push(['data-erreur', String(p.errorText ?? '').trim() || null])
  return { list: out, checked: true }
}

/** La zone (cachée au départ) où s'affiche l'erreur d'un champ. */
const errorHtml = (node: BrickNode, repeated: boolean) =>
  `<small${attrs([['class', 'field-error'], ['id', repeated ? null : `${node.id}-erreur`], ['role', 'alert'], ['hidden', true]])}></small>`

function emitNode(out: Emitter, g: Gen, node: BrickNode, indent: string) {
  const { project } = g
  const { variables } = project
  const p = node.props
  const start = out.line + 1
  const repeated = g.repeatOf.has(node.id)
  const cls = [brickClass(node), repeated ? node.id : ''].filter(Boolean).join(' ')
  const isOtherPage = node.type === 'page' && project.pages.length > 1 && node.id !== project.rootId
  const parent = node.parent ? project.nodes[node.parent] : null
  // Dans des onglets, seul le premier panneau est visible au départ.
  const otherTab = parent?.type === 'tabs' && parent.children.indexOf(node.id) > 0
  const hidden = isInitiallyHidden(node, variables) || isOtherPage || otherTab || node.type === 'modal' ? true : null
  const base: [string, string | true | null][] = [
    ['id', repeated ? null : node.id],
    ['class', cls],
    ['hidden', hidden],
  ]
  const text = (key: string) => escapeHtml(interpolate(String(p[key] ?? ''), variables))
  const inner = indent + '  '
  const children = (ind: string) => {
    for (const c of node.children) if (project.nodes[c]) emitNode(out, g, project.nodes[c], ind)
  }
  const kids = node.children.map((c) => project.nodes[c]).filter(Boolean)

  switch (node.type) {
    case 'page':
    case 'section':
    case 'row':
    case 'stack':
    case 'grid':
    case 'card':
    case 'repeat': {
      const tag = node.type === 'page' ? 'main' : node.type === 'section' ? 'section' : 'div'
      if (node.type === 'repeat' && g.repeats.has(node.id)) {
        const source = String(p.source ?? '')
        out.push(`${indent}<!-- ${escapeHtml(node.name)} : une copie par élément de « ${escapeHtml(source || '?')} » -->`)
        out.push(`${indent}<${tag}${attrs(base)}>`)
        out.push(`${inner}<template>`)
        out.push(`${inner}  <div class="repeat-item">`)
        children(inner + '    ')
        out.push(`${inner}  </div>`)
        out.push(`${inner}</template>`)
        out.push(`${indent}</${tag}>`)
        break
      }
      out.push(`${indent}<!-- ${escapeHtml(node.name)} -->`)
      if (node.children.length === 0) {
        out.push(`${indent}<${tag}${attrs(base)}></${tag}>`)
      } else {
        out.push(`${indent}<${tag}${attrs(base)}>`)
        children(inner)
        out.push(`${indent}</${tag}>`)
      }
      break
    }
    case 'tabs': {
      out.push(`${indent}<!-- ${escapeHtml(node.name)} : un panneau par onglet -->`)
      out.push(`${indent}<div${attrs(base)}>`)
      out.push(`${inner}<div class="tabs-bar" role="tablist">`)
      kids.forEach((k, i) => out.push(`${inner}  <button type="button" role="tab" aria-selected="${i === 0}">${escapeHtml(k.name)}</button>`))
      out.push(`${inner}</div>`)
      children(inner)
      out.push(`${indent}</div>`)
      break
    }
    case 'accordion': {
      out.push(`${indent}<!-- ${escapeHtml(node.name)} : un volet par brique -->`)
      out.push(`${indent}<div${attrs(base)}>`)
      kids.forEach((k, i) => {
        out.push(`${inner}<details class="accordion-item"${i === 0 && p.firstOpen ? ' open' : ''}>`)
        out.push(`${inner}  <summary>${escapeHtml(k.name)}</summary>`)
        emitNode(out, g, k, inner + '  ')
        out.push(`${inner}</details>`)
      })
      out.push(`${indent}</div>`)
      break
    }
    case 'modal': {
      out.push(`${indent}<!-- ${escapeHtml(node.name)} : cachée au départ, s'ouvre avec « Afficher » -->`)
      out.push(`${indent}<div${attrs(base)}>`)
      out.push(`${inner}<div class="modal-box" role="dialog" aria-modal="true" aria-label="${escapeHtml(String(p.label || node.name))}">`)
      out.push(`${inner}  <button type="button" class="modal-close" aria-label="Fermer">×</button>`)
      children(inner + '  ')
      out.push(`${inner}</div>`)
      out.push(`${indent}</div>`)
      break
    }
    case 'navbar': {
      out.push(`${indent}<nav${attrs([...base, ['aria-label', 'Navigation principale']])}>`)
      if (String(p.brand ?? '').trim()) out.push(`${inner}<strong class="navbar-brand">${text('brand')}</strong>`)
      out.push(`${inner}<div class="navbar-links">`)
      for (const id of project.pages) {
        const pg = project.nodes[id]
        if (pg) out.push(`${inner}  <a href="#${id}"${id === project.rootId ? ' class="is-active"' : ''}>${escapeHtml(pg.name)}</a>`)
      }
      out.push(`${inner}</div>`)
      out.push(`${indent}</nav>`)
      break
    }
    case 'video': {
      const v = videoSource(String(p.src))
      const title = String(p.title || 'Vidéo')
      if (v?.kind === 'youtube') {
        out.push(
          `${indent}<iframe${attrs([...base, ['src', v.embed], ['title', title], ['loading', 'lazy'], ['allow', 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen'], ['allowfullscreen', true]])}></iframe>`,
        )
      } else if (v?.kind === 'file') {
        out.push(`${indent}<video${attrs([...base, ['src', v.src], ['title', title], ['controls', true], ['preload', 'metadata']])}></video>`)
      } else {
        out.push(`${indent}<!-- ${escapeHtml(node.name)} : ajoute l'adresse d'une vidéo YouTube ou d'un fichier .mp4 -->`)
        out.push(`${indent}<div${attrs([...base, ['role', 'img'], ['aria-label', title]])}></div>`)
      }
      break
    }
    case 'code':
      // Le HTML écrit à la main est posé par le script (partie « Ton code personnalisé »).
      out.push(`${indent}<!-- ${escapeHtml(node.name)} : code personnalisé -->`)
      out.push(`${indent}<div${attrs(base)}></div>`)
      break
    case 'icon': {
      const label = String(p.label ?? '').trim()
      out.push(`${indent}<span${attrs([...base, ...(label ? ([['role', 'img'], ['aria-label', label]] as [string, string][]) : ([['aria-hidden', 'true']] as [string, string][]))])}>${iconSvg(String(p.symbol ?? ''))}</span>`)
      break
    }
    case 'heading': {
      const level = ['1', '2', '3'].includes(String(p.level)) ? p.level : '2'
      out.push(`${indent}<h${level}${attrs(base)}>${text('text')}</h${level}>`)
      break
    }
    case 'text':
      out.push(`${indent}<p${attrs(base)}>${text('text')}</p>`)
      break
    case 'badge':
      out.push(`${indent}<span${attrs(base)}>${text('text')}</span>`)
      break
    case 'link': {
      const page = String(p.page ?? '')
      const toPage = page && project.pages.includes(page)
      out.push(
        `${indent}<a${attrs([
          ...base,
          ['href', toPage ? `#${page}` : safeHref(String(p.href))],
          ['target', !toPage && p.newTab ? '_blank' : null],
          ['rel', !toPage && p.newTab ? 'noopener' : null],
        ])}>${text('text')}</a>`,
      )
      break
    }
    case 'list': {
      const tag = p.ordered ? 'ol' : 'ul'
      out.push(`${indent}<${tag}${attrs(base)}>`)
      for (const it of lines(p.items)) out.push(`${inner}<li>${escapeHtml(interpolate(it, variables))}</li>`)
      out.push(`${indent}</${tag}>`)
      break
    }
    case 'button':
      out.push(`${indent}<button type="button"${attrs(base)}>${text('text')}</button>`)
      break
    case 'input':
    case 'textarea':
    case 'select': {
      const bound = variables.find((v) => v.name === p.bind)
      const value = bound ? String(bound.initial) : ''
      out.push(`${indent}<label${attrs(base)}>`)
      const rules = validationAttrs(node)
      // Avec un message d'erreur dans le libellé, le nom du champ reste son libellé seul.
      const named = rules.checked && !repeated
      out.push(`${inner}<span${attrs([['id', named ? `${node.id}-libelle` : null]])}>${escapeHtml(String(p.label ?? ''))}</span>`)
      const fieldAttrs: [string, string | true | null][] = [
        ['id', repeated ? null : `${node.id}-champ`],
        ['placeholder', node.type === 'select' ? null : String(p.placeholder ?? '')],
        ...rules.list,
        ['aria-labelledby', named ? `${node.id}-libelle` : null],
        ['aria-describedby', named ? `${node.id}-erreur` : null],
      ]
      if (node.type === 'input') {
        const type = INPUT_TYPES.includes(String(p.inputType)) ? String(p.inputType) : 'text'
        out.push(`${inner}<input${attrs([['type', type], ...fieldAttrs, ['value', value]])}>`)
      } else if (node.type === 'textarea') {
        out.push(`${inner}<textarea${attrs(fieldAttrs)}>${escapeHtml(value)}</textarea>`)
      } else {
        out.push(`${inner}<select${attrs(fieldAttrs)}>`)
        for (const o of lines(p.options)) {
          out.push(`${inner}  <option${attrs([['selected', o === value ? true : null]])}>${escapeHtml(o)}</option>`)
        }
        out.push(`${inner}</select>`)
      }
      if (rules.checked) out.push(`${inner}${errorHtml(node, repeated)}`)
      out.push(`${indent}</label>`)
      break
    }
    case 'checkbox': {
      const bound = variables.find((v) => v.name === p.bind)
      out.push(`${indent}<label${attrs(base)}>`)
      const rules = validationAttrs(node)
      const named = rules.checked && !repeated
      out.push(
        `${inner}<input type="checkbox"${attrs([
          ['id', repeated ? null : `${node.id}-champ`],
          ['checked', bound?.initial ? true : null],
          ...rules.list,
          ['aria-labelledby', named ? `${node.id}-libelle` : null],
          ['aria-describedby', named ? `${node.id}-erreur` : null],
        ])}>`,
      )
      out.push(`${inner}<span${attrs([['id', named ? `${node.id}-libelle` : null]])}>${escapeHtml(String(p.label ?? ''))}</span>`)
      if (rules.checked) out.push(`${inner}${errorHtml(node, repeated)}`)
      out.push(`${indent}</label>`)
      break
    }
    case 'image':
      out.push(
        `${indent}<img${attrs([
          ...base,
          ['src', safeImageSrc(interpolate(String(p.src), variables)) ?? PLACEHOLDER_IMAGE],
          ['alt', interpolate(String(p.alt ?? ''), variables)],
        ])}>`,
      )
      break
    case 'table':
    case 'chart':
    case 'calendar':
    case 'kanban':
    case 'chat':
    case 'stat':
    case 'progress': {
      const content = proHtml(node.type, p, (t) => interpolate(t, variables), variables) ?? []
      out.push(`${indent}<!-- ${escapeHtml(node.name)} -->`)
      const extra: [string, string | null][] = node.type === 'chat' ? [['data-moi', String(p.me ?? '').trim() || null]] : []
      out.push(`${indent}<div${attrs([...base, ...extra])}>`)
      for (const l of content) out.push(inner + l)
      out.push(`${indent}</div>`)
      break
    }
    case 'tabbar': {
      const icons = tabbarIcons(p, project.pages.length)
      out.push(`${indent}<nav${attrs([...base, ['aria-label', 'Navigation de l’application']])}>`)
      project.pages.forEach((id, i) => {
        const pg = project.nodes[id]
        if (!pg) return
        out.push(`${inner}<a href="#${id}"${id === project.rootId ? ' class="is-active"' : ''}>${iconSvg(icons[i])}<span>${escapeHtml(pg.name)}</span></a>`)
      })
      out.push(`${indent}</nav>`)
      break
    }
    case 'divider':
      out.push(`${indent}<hr${attrs(base)}>`)
      break
    case 'spacer':
      out.push(`${indent}<div${attrs([...base, ['aria-hidden', 'true']])}></div>`)
      break
  }
  setRange(g.map, node.id, 'html', [start, out.line])
}

/* ---------------------------------- CSS ---------------------------------- */

function emitCss(g: Gen): string {
  const out = new Emitter()
  out.push('body { margin: 0; }')
  for (const l of BASE_CSS.trimEnd().split('\n')) out.push(l)
  out.push('')
  const theme = themeEntries(g.project.theme)
  if (theme.length) {
    out.push('/* Style du projet : couleurs, surfaces, relief, arrondis et polices */')
    out.push(':root {')
    for (const [k, v] of theme) out.push(`  ${k}: ${v};`)
    out.push('}')
    out.push('')
  }
  out.push('/* Styles de tes briques */')
  const order = documentOrder(g.project)
  const cleanName = (n: BrickNode) => n.name.replace(/[*/<>]/g, '')
  for (const node of order) {
    const entries = styleEntries(node)
    if (!entries.length) continue
    const start = out.line + 1
    out.push(`/* ${cleanName(node)} */`)
    out.push(`${styleSelector(g, node)} {`)
    for (const [k, v] of entries) out.push(`  ${k}: ${v};`)
    out.push('}')
    setRange(g.map, node.id, 'css', [start, out.line])
  }
  for (const node of order.filter((n) => n.type === 'code' && String(n.props.css ?? '').trim())) {
    out.push('')
    out.push(`/* Code personnalisé : ${cleanName(node)} */`)
    for (const l of closeSafe(String(node.props.css), 'style').trimEnd().split('\n')) out.push(l)
  }
  // Réglages propres aux petits écrans, du plus grand au plus petit.
  for (const bp of BREAKPOINTS) {
    const rules = order.map((n) => [n, overrideEntries(n, n.responsive?.[bp.scope])] as const).filter(([, e]) => e.length)
    if (!rules.length) continue
    out.push('')
    out.push(`/* ${bp.label} (largeur jusqu'à ${bp.maxWidth} px) */`)
    out.push(`@media (max-width: ${bp.maxWidth}px) {`)
    for (const [n, entries] of rules) {
      out.push(`  /* ${cleanName(n)} */`)
      out.push(`  ${styleSelector(g, n)} {`)
      for (const [k, v] of entries) out.push(`    ${k}: ${v};`)
      out.push('  }')
    }
    out.push('}')
  }
  return out.toString()
}

/* ------------------------------- JavaScript ------------------------------ */

const jsString = (s: string) => JSON.stringify(s)
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ')
/** « Bouton 3 « + 1 » » : le nom de la brique suivi de son texte, pour des commentaires parlants. */
function commentName(n: BrickNode): string {
  const text = typeof n.props.text === 'string' ? n.props.text.trim() : ''
  const short = text.length > 32 ? `${text.slice(0, 31)}…` : text
  return oneLine(short && !n.name.includes(short) ? `${n.name} « ${short} »` : n.name)
}

function jsValue(v: Variable['initial']): string {
  if (Array.isArray(v) && v.some((x) => typeof x === 'object')) {
    // Collection : une fiche par ligne, plus facile à lire.
    return v.length ? `[\n${v.map((r) => `    ${JSON.stringify(r)},`).join('\n')}\n  ]` : '[]'
  }
  if (Array.isArray(v)) return `[${v.map((x) => jsString(String(x))).join(', ')}]`
  return typeof v === 'string' ? jsString(v) : String(v)
}

/** {{element}}, {{element.nom}} et {{position}} : valables seulement dans une répétition. */
const isScopeToken = (name: string) => name === 'element' || name === 'position' || name.startsWith('element.')

/** element.prix → « element?.prix » ; un champ calculé de la collection parcourue devient sa formule. */
function elementAccess(name: string, fields?: CollectionField[]): string {
  const [, first, ...rest] = name.split('.')
  if (first && fields?.some((f) => f.name === first && f.type === 'formula') && !rest.length) return compileRecordField('element', first, fields)
  return name.replace(/\.([A-Za-z0-9_]+)/g, (_, k: string) => (/^\d/.test(k) ? `?.[${k}]` : `?.${k}`))
}

/** Comment une formule lit les variables, et l'élément d'une répétition. */
function exprCompileEnv(variables: Variable[], inRepeat: boolean, fields?: CollectionField[]): CompileEnv {
  const find = (n: string) => variables.find((v) => v.name === n)
  return {
    ref: (path) => {
      const name = path.join('.')
      if (inRepeat && isScopeToken(name)) return name === 'position' || name === 'element' ? name : elementAccess(name, fields)
      const v = find(path[0])
      if (!v || path.length > 1) return null
      return isListLike(v) ? `etat.${v.name}.length` : `etat.${v.name}`
    },
    list: (path) => {
      const v = find(path[0])
      if (!v || !isListLike(v) || path.length > 2) return null
      if (path.length === 1) return { list: `etat.${v.name}`, read: (x) => x }
      return { list: `etat.${v.name}`, read: (x) => compileRecordField(x, path[1], v.fields) }
    },
    isNumber: (path) => {
      if (inRepeat && path[0] === 'position') return true
      if (inRepeat && path[0] === 'element' && path.length === 2) return fields?.find((f) => f.name === path[1])?.type === 'number'
      const v = find(path[0])
      return !!v && path.length === 1 && (v.kind === 'number' || isListLike(v))
    },
  }
}

/** « Bonjour {{prenom}} » → `Bonjour ${etat.prenom}` */
function jsTemplate(text: string, variables: Variable[], inRepeat = false, fields?: CollectionField[]): string {
  const body = parseTemplate(text)
    .map((part) => {
      if (part.kind === 'var') {
        const v = variables.find((x) => x.name === part.name)
        if (v) return isListLike(v) ? `\${etat.${v.name}.length}` : `\${etat.${v.name}}`
        if (inRepeat && isScopeToken(part.name)) {
          if (part.name === 'position') return '${position}'
          if (part.name === 'element') return '${element}'
          const access = elementAccess(part.name, fields)
          return access.startsWith('(') ? `\${enTexte${access}}` : `\${${access} ?? ""}`
        }
        return escapeTemplate(`{{${part.name}}}`)
      }
      if (part.kind === 'expr') {
        const js = compileExpr(part.expr, exprCompileEnv(variables, inRepeat, fields))
        return js == null ? escapeTemplate(`{{${part.src}}}`) : `\${enTexte(${js})}`
      }
      return escapeTemplate(part.value)
    })
    .join('')
  return body ? '`' + body + '`' : '""'
}

/** Le texte contient-il des {{…}} que le script doit remplacer ? */
function needsTemplate(text: unknown, variables: Variable[], inRepeat: boolean, fields?: CollectionField[]): boolean {
  if (typeof text !== 'string') return false
  return parseTemplate(text).some(
    (p) =>
      (p.kind === 'var' && (variables.some((v) => v.name === p.name) || (inRepeat && isScopeToken(p.name)))) ||
      (p.kind === 'expr' && compileExpr(p.expr, exprCompileEnv(variables, inRepeat, fields)) != null),
  )
}

/**
 * Les réglages « recherche, filtre, tri » d'une répétition ou d'un tableau, en JavaScript :
 * un objet passé à vue(). null quand la brique montre la liste telle quelle.
 */
function viewJs(n: BrickNode, variables: Variable[], fields: CollectionField[] | undefined, indent: string): string | null {
  const p = n.props
  const entries: string[] = []
  const search = variables.find((v) => v.name === p.search && !isListLike(v))
  const read = (field: string) => compileRecordField('x', field, fields)
  if (search) {
    entries.push(`recherche: etat.${search.name}`)
    const computed = (fields ?? []).filter((f) => f.type === 'formula')
    const shown = (f: CollectionField) => {
      const js = read(f.name)
      return js.startsWith('(') ? `enTexte${js}` : `enTexte(${js})`
    }
    if (fields) entries.push(`texte: (x) => [${[...computed.map(shown), '...Object.values(x)'].join(', ')}].join(" ")`)
  }
  const field = String(p.filterField ?? '')
  if (field && fields?.some((f) => f.name === field)) {
    const op = String(p.filterOp || 'eq') as FilterOp
    const type = fields.find((f) => f.name === field)?.type
    const raw = String(p.filterValue ?? '')
    const value = jsTemplate(raw, variables)
    const isStatic = !needsTemplate(raw, variables, false)
    const numeric = type === 'number' || type === 'formula'
    const num = isStatic ? String(Number(raw.replace(',', '.')) || 0) : `Number(String(${value}).replace(",", "."))`
    const text = isStatic ? jsString(normalize(raw)) : `normaliser(${value})`
    let test: string | null = null
    switch (op) {
      case 'checked':
        test = `${read(field)} === true`
        break
      case 'unchecked':
        test = `${read(field)} !== true`
        break
      case 'contains':
        test = `normaliser(${read(field)}).includes(${text})`
        break
      case 'gt':
      case 'lt': {
        const sign = op === 'gt' ? '>' : '<'
        test = numeric ? `Number(${read(field)}) ${sign} ${num}` : `comparer(${read(field)}, ${isStatic ? jsString(raw) : value}) ${sign} 0`
        break
      }
      default: {
        const sign = op === 'neq' ? '!==' : '==='
        test = type === 'number' ? `Number(${read(field)}) ${sign} ${num}` : `normaliser(${read(field)}) ${sign} ${text}`
      }
    }
    const needsValue = op !== 'checked' && op !== 'unchecked'
    if (needsValue && isStatic && !raw.trim()) test = null
    if (test) entries.push(needsValue && !isStatic ? `filtre: ${value} === "" ? null : (x) => ${test}` : `filtre: (x) => ${test}`)
  }
  const sortField = String(p.sortField ?? '')
  if (sortField && (fields ? fields.some((f) => f.name === sortField) : false)) {
    entries.push(`tri: (x) => ${read(sortField)}`)
    if (p.sortDir === 'desc') entries.push('inverse: true')
  }
  if (!entries.length) return null
  return `{\n${entries.map((e) => `${indent}  ${e},`).join('\n')}\n${indent}}`
}

const CONDITION_LABEL: Record<Extract<Action, { type: 'if' }>['op'], string> = {
  true: 'est vrai',
  false: 'est faux',
  eq: '=',
  neq: '≠',
  gt: '>',
  lt: '<',
  empty: 'est vide',
  notEmpty: "n'est pas vide",
}

export function describeAction(a: Action, project: Project): string {
  const name = (id: string) => project.nodes[id]?.name ?? id
  switch (a.type) {
    case 'set':
      return `${a.variable} = ${a.value}`
    case 'add':
      return `${a.variable} ${a.amount >= 0 ? '+' : '−'} ${Math.abs(a.amount)}`
    case 'toggleVar':
      return `inverser ${a.variable}`
    case 'show':
      return `afficher « ${name(a.target)} »`
    case 'hide':
      return `masquer « ${name(a.target)} »`
    case 'toggle':
      return `afficher/masquer « ${name(a.target)} »`
    case 'scrollTo':
      return `aller à « ${name(a.target)} »`
    case 'alert':
      return 'message'
    case 'openUrl':
      return 'ouvrir un lien'
    case 'navigate':
      return `page « ${name(a.page)} »${a.value?.trim() ? ' avec une valeur' : ''}`
    case 'validate':
      return `vérifier « ${name(a.target)} »`
    case 'wait':
      return `attendre ${formatDelay(a.ms)}`
    case 'listAdd':
      return `ajouter à ${a.variable}`
    case 'listRemove':
      return `retirer de ${a.variable}`
    case 'listClear':
      return `vider ${a.variable}`
    case 'if':
      return `si ${a.variable} ${CONDITION_LABEL[a.op]}${['eq', 'neq', 'gt', 'lt'].includes(a.op) ? ` ${a.value}` : ''}`
    case 'fetch':
      return `charger ${a.variable}`
    case 'addRecord':
      return `ajouter une fiche à ${a.variable}`
    case 'signup':
      return 'créer un compte'
    case 'login':
      return 'se connecter'
    case 'logout':
      return 'se déconnecter'
  }
}

/** 1500 → « 1,5 s », 300 → « 300 ms ». */
function formatDelay(ms: number): string {
  const n = Math.max(0, Number(ms) || 0)
  return n >= 1000 ? `${String(Math.round(n / 100) / 10).replace('.', ',')} s` : `${n} ms`
}

/** Les actions doivent-elles attendre (chargement, pause) ? Leur fonction devient alors « async ». */
export function needsAsync(actions: Action[]): boolean {
  return actions.some(
    (a) => a.type === 'fetch' || a.type === 'wait' || a.type === 'signup' || a.type === 'login' || (a.type === 'if' && (needsAsync(a.then) || needsAsync(a.else))),
  )
}

/** Une vérification de formulaire arrête les actions avec « return » : il faut être dans une fonction. */
function needsFunction(actions: Action[]): boolean {
  return actions.some(
    (a) => a.type === 'validate' || a.type === 'signup' || a.type === 'login' || (a.type === 'if' && (needsFunction(a.then) || needsFunction(a.else))),
  )
}

/** Où se trouve l'action : dans une copie de répétition ou non. */
interface ActionCtx {
  repeat: string | null
  /** Champs de la collection parcourue par la répétition (champs calculés). */
  fields?: CollectionField[]
  /** La répétition montre une vue (filtrée ou triée) : on retrouve l'élément par lui-même, pas par sa position. */
  byElement?: boolean
}

const indentLines = (ls: string[]) => ls.map((l) => `  ${l}`)

function conditionExpr(a: Extract<Action, { type: 'if' }>, v: Variable): string {
  const ref = `etat.${v.name}`
  const list = isListLike(v)
  const size = list ? `${ref}.length` : ref
  const num = String(Number(String(a.value).replace(',', '.')) || 0)
  const compared =
    list || v.kind === 'number' ? num : v.kind === 'boolean' ? String(a.value === 'true') : jsTemplate(a.value, [])
  switch (a.op) {
    case 'true':
      return list ? `${size} > 0` : ref
    case 'false':
      return list ? `${size} === 0` : `!${ref}`
    case 'empty':
      return list ? `${size} === 0` : v.kind === 'text' ? `${ref} === ""` : `!${ref}`
    case 'notEmpty':
      return list ? `${size} > 0` : v.kind === 'text' ? `${ref} !== ""` : `Boolean(${ref})`
    case 'eq':
      return `${size} === ${compared}`
    case 'neq':
      return `${size} !== ${compared}`
    case 'gt':
      return `${v.kind === 'text' ? `${ref}.length` : size} > ${num}`
    case 'lt':
      return `${v.kind === 'text' ? `${ref}.length` : size} < ${num}`
  }
}

/** Chemin « results.0.name » → « ?.results?.[0]?.name ». */
function jsPath(path: string): string | null {
  const t = path.trim()
  if (!t) return ''
  if (!/^[A-Za-z0-9_$]+(\.[A-Za-z0-9_$]+)*$/.test(t)) return null
  return t
    .split('.')
    .map((k) => (/^\d+$/.test(k) ? `?.[${k}]` : `?.${k}`))
    .join('')
}

function actionLines(a: Action, g: Gen, ctx: ActionCtx): { lines: string[]; changesState: boolean } {
  const { project } = g
  const vars = project.variables
  const find = (n: string) => vars.find((v) => v.name === n)
  const inRepeat = ctx.repeat != null
  const tpl = (s: string) => jsTemplate(s, vars, inRepeat, ctx.fields)
  const missingVar = (n: string) => ({ lines: [`// Action ignorée : la variable « ${n || '?'} » n'existe pas.`], changesState: false })
  const ignored = (why: string) => ({ lines: [`// Action ignorée : ${why}`], changesState: false })
  const el = (id: string) => {
    const r = g.repeatOf.get(id)
    if (!r) return `document.getElementById(${jsString(id)})`
    if (r === ctx.repeat) return `copie.querySelector(${jsString(`.${id}`)})`
    return `document.querySelector(${jsString(`.${id}`)})`
  }

  switch (a.type) {
    case 'set': {
      const v = find(a.variable)
      if (!v) return missingVar(a.variable)
      const value =
        v.kind === 'number'
          ? String(Number(a.value) || 0)
          : v.kind === 'boolean'
            ? String(a.value === 'true')
            : isListLike(v)
              ? '[]'
              : tpl(a.value)
      return { lines: [`etat.${v.name} = ${value};`], changesState: true }
    }
    case 'add': {
      const v = find(a.variable)
      if (!v) return missingVar(a.variable)
      const amount = Number(a.amount) || 0
      const op = amount >= 0 ? `+ ${amount}` : `- ${Math.abs(amount)}`
      return { lines: [`etat.${v.name} = etat.${v.name} ${op};`], changesState: true }
    }
    case 'toggleVar': {
      const v = find(a.variable)
      if (!v) return missingVar(a.variable)
      return { lines: [`etat.${v.name} = !etat.${v.name};`], changesState: true }
    }
    case 'show':
    case 'hide':
    case 'toggle':
    case 'scrollTo': {
      if (!project.nodes[a.target]) return ignored('la brique visée n’existe plus.')
      const line =
        a.type === 'show'
          ? `${el(a.target)}.hidden = false;`
          : a.type === 'hide'
            ? `${el(a.target)}.hidden = true;`
            : a.type === 'toggle'
              ? `${el(a.target)}.toggleAttribute("hidden");`
              : `${el(a.target)}.scrollIntoView({ behavior: "smooth" });`
      return { lines: [line], changesState: false }
    }
    case 'alert':
      return { lines: [`alert(${tpl(a.message)});`], changesState: false }
    case 'openUrl':
      return { lines: [`window.open(${jsString(safeHref(a.url))}, "_blank");`], changesState: false }
    case 'navigate': {
      if (!project.pages.includes(a.page)) return ignored('la page visée n’existe plus.')
      if (project.pages.length < 2) return ignored('le projet n’a qu’une seule page.')
      const value = a.value?.trim() ? tpl(a.value.trim()) : null
      return { lines: [`allerA(${jsString(a.page)}${value ? `, ${value}` : ''});`], changesState: false }
    }
    case 'validate': {
      if (!project.nodes[a.target]) return ignored('la brique à vérifier n’existe plus.')
      return { lines: [`if (!verifier(${el(a.target)})) return;`], changesState: false }
    }
    case 'wait': {
      const ms = Math.max(0, Math.round(Number(a.ms) || 0))
      return { lines: [`await new Promise((suite) => setTimeout(suite, ${ms}));`], changesState: false }
    }
    case 'listAdd': {
      const v = find(a.variable)
      if (!v || v.kind !== 'list') return missingVar(a.variable)
      return { lines: [`etat.${v.name}.push(${tpl(a.value)});`], changesState: true }
    }
    case 'listRemove': {
      const v = find(a.variable)
      if (!v || !isListLike(v)) return missingVar(a.variable)
      if (a.which === 'current') {
        if (!inRepeat) return ignored('« l’élément de cette copie » ne marche que dans une répétition.')
        const index = ctx.byElement ? `etat.${v.name}.indexOf(element)` : 'position - 1'
        return { lines: [`etat.${v.name}.splice(${index}, 1);`], changesState: true }
      }
      return { lines: [`etat.${v.name}.${a.which === 'first' ? 'shift' : 'pop'}();`], changesState: true }
    }
    case 'listClear': {
      const v = find(a.variable)
      if (!v || !isListLike(v)) return missingVar(a.variable)
      return { lines: [`etat.${v.name} = [];`], changesState: true }
    }
    case 'if': {
      const v = find(a.variable)
      if (!v) return missingVar(a.variable)
      const thenR = blockLines(a.then, g, ctx)
      const elseR = blockLines(a.else, g, ctx)
      const out = [`if (${conditionExpr(a, v)}) {`]
      out.push(...indentLines(thenR.lines))
      if (!thenR.lines.length) out.push('  // Rien à faire')
      if (elseR.lines.length) {
        out.push('} else {')
        out.push(...indentLines(elseR.lines))
      }
      out.push('}')
      return { lines: out, changesState: thenR.changesState || elseR.changesState }
    }
    case 'fetch': {
      const v = find(a.variable)
      if (!v) return missingVar(a.variable)
      if (!/^https?:\/\//i.test(a.url.trim())) return ignored('l’adresse doit commencer par https://')
      const path = jsPath(a.path)
      if (path == null) return ignored(`le chemin « ${oneLine(a.path)} » n’est pas valide.`)
      const read = `donnees${path}`
      const convert =
        isListLike(v)
          ? `Array.isArray(valeur) ? valeur : []`
          : v.kind === 'number'
            ? 'Number(valeur) || 0'
            : v.kind === 'boolean'
              ? 'Boolean(valeur)'
              : 'typeof valeur === "object" ? JSON.stringify(valeur) : String(valeur ?? "")'
      // await : les actions suivantes attendent que les données soient arrivées.
      return {
        lines: [
          'try {',
          `  const reponse = await fetch(${tpl(a.url.trim())});`,
          '  const donnees = await reponse.json();',
          `  const valeur = ${read};`,
          `  etat.${v.name} = ${convert};`,
          '  afficher();',
          '} catch (erreur) {',
          '  console.error("Chargement impossible :", erreur);',
          '}',
        ],
        changesState: false,
      }
    }
    case 'addRecord': {
      const v = find(a.variable)
      if (!isCollection(v)) return missingVar(a.variable)
      const lines = [`etat.${v.name}.push({`]
      for (const f of fieldsOf(v).filter((x) => x.type !== 'formula')) {
        const raw = a.values?.[f.name] ?? ''
        const text = tpl(raw)
        let value = text
        if (f.type === 'number') value = text === '""' ? '0' : `Number(String(${text}).replace(",", ".")) || 0`
        else if (f.type === 'boolean') value = text === '""' ? 'false' : `["oui", "vrai", "true", "1"].includes(String(${text}).trim().toLowerCase())`
        lines.push(`  ${f.name}: ${value},`)
      }
      lines.push('});')
      return { lines, changesState: true }
    }
    case 'signup':
    case 'login': {
      const v = find(a.variable)
      if (!v || v.kind !== 'text') return missingVar(a.variable)
      const fn = a.type === 'signup' ? 'creerCompte' : 'connecter'
      return {
        lines: [
          '{',
          `  const email = String(${tpl(a.email)}).trim().toLowerCase();`,
          `  const erreur = await ${fn}(email, String(${tpl(a.password)}));`,
          '  if (erreur) {',
          '    alert(erreur);',
          '    return;',
          '  }',
          `  etat.${v.name} = email;`,
          '}',
        ],
        changesState: true,
      }
    }
    case 'logout': {
      const v = find(a.variable)
      if (!v || v.kind !== 'text') return missingVar(a.variable)
      return { lines: [`etat.${v.name} = "";`], changesState: true }
    }
  }
}

/** Une suite d'actions ; avant une pause ou un chargement, la page est mise à jour pour montrer ce qui a déjà changé. */
function blockLines(actions: Action[], g: Gen, ctx: ActionCtx): { lines: string[]; changesState: boolean } {
  const lines: string[] = []
  let pending = false
  let changes = false
  for (const a of actions) {
    if ((a.type === 'wait' || a.type === 'fetch') && pending) {
      lines.push('afficher();')
      pending = false
    }
    const r = actionLines(a, g, ctx)
    pending ||= r.changesState
    changes ||= r.changesState
    lines.push(...r.lines)
  }
  return { lines, changesState: changes }
}

function emitActionsBlock(out: Emitter, g: Gen, actions: Action[], ctx: ActionCtx, indent: string) {
  const r = blockLines(actions, g, ctx)
  for (const l of r.lines) out.push(`${indent}${l}`)
  if (r.changesState) out.push(`${indent}afficher();`)
}

/** Propriétés dont le texte peut contenir des {{…}} : [clé, propriété DOM]. */
/** Propriétés qui peuvent afficher une variable : [propriété de la brique, ce qu'on met à jour, texte ajouté après]. */
function dynamicProps(n: BrickNode): [string, string, string?][] {
  switch (n.type) {
    case 'image':
      return [['src', 'src']]
    case 'stat':
      return [
        ['label', 'querySelector(".stat-label").textContent'],
        ['value', 'querySelector(".stat-value").textContent'],
        ...(String(n.props.delta ?? '').trim() ? [['delta', 'querySelector(".stat-delta").textContent'] as [string, string]] : []),
      ]
    case 'progress':
      return [
        ['label', 'querySelector(".progress-head span").textContent'],
        ['value', 'querySelector("progress").value'],
        ['value', 'querySelector(".progress-value").textContent', ' %'],
      ]
    default:
      return [['text', 'textContent']]
  }
}

function emitJs(g: Gen): string {
  const out = new Emitter()
  const { project } = g
  const { variables } = project
  const order = documentOrder(project)
  const multi = project.pages.length > 1
  const outside = order.filter((n) => !g.repeatOf.has(n.id))

  const known = (name: unknown) => typeof name === 'string' && variables.some((v) => v.name === name)
  const dynamicTexts = outside.filter((n) => dynamicProps(n).some(([k]) => needsTemplate(n.props[k], variables, false)))
  const dynamicLists = outside.filter((n) => n.type === 'list' && needsTemplate(n.props.items, variables, false))
  const conditional = outside.filter((n) => known(n.showIf))
  const boundFields = outside.filter((n) => ['input', 'textarea', 'select', 'checkbox'].includes(n.type) && known(n.props.bind))
  const boundTables = outside.filter((n) => n.type === 'table' && tableSource(n.props, variables))
  const persisted = variables.filter((v) => v.persist)
  const clickable = outside.filter((n) => n.onClick.length > 0)
  const repeats = order.filter((n) => g.repeats.has(n.id))
  const loads = project.pages.map((id) => project.nodes[id]).filter((p) => p?.onLoad?.length)
  const hasTabs = order.some((n) => n.type === 'tabs')
  const hasModals = order.some((n) => n.type === 'modal')
  const hasNavbar = order.some((n) => n.type === 'navbar')
  const hasTabbar = order.some((n) => n.type === 'tabbar')
  const hasSortable = order.some((n) => n.type === 'table' && n.props.sortable)
  const hasKanban = order.some((n) => n.type === 'kanban')
  const hasChat = order.some((n) => n.type === 'chat' && n.props.composer)
  const hasWidgets = hasSortable || hasKanban || hasChat
  const customCode = outside.filter((n) => n.type === 'code')

  out.push('// Code généré par Ptt-Makers. Tu peux le lire, le copier et le modifier librement !')

  if (!variables.length && !clickable.length && !repeats.length && !multi && !loads.length && !hasTabs && !hasModals && !hasWidgets && !customCode.length) {
    out.push('// Ce projet ne contient pas encore d’interactions.')
    out.push('// Ajoute une variable ou une action « Au clic » pour voir du JavaScript apparaître ici.')
    return out.toString()
  }

  let step = 0
  const title = (t: string) => {
    out.push('')
    out.push(`// ${++step}. ${t}`)
  }
  const showIfExpr = (name: string) => {
    const v = variables.find((x) => x.name === name)!
    return isListLike(v) ? `etat.${name}.length === 0` : `!etat.${name}`
  }

  title("Les variables de l'application (son « état »)")
  if (variables.length) {
    out.push('const etat = {')
    for (const v of variables) out.push(`  ${v.name}: ${jsValue(v.initial)},`)
    out.push('};')
  } else {
    out.push('const etat = {};')
  }

  if (persisted.length) {
    title('Données gardées dans ce navigateur : elles restent après un rechargement de la page')
    const slug = toVariableName(project.name).toLowerCase() || 'projet'
    out.push(`const CLE_SAUVEGARDE = ${jsString(`ptt-makers:${slug}`)};`)
    out.push(`const A_GARDER = [${persisted.map((v) => jsString(v.name)).join(', ')}];`)
    out.push('try {')
    out.push('  const gardees = JSON.parse(localStorage.getItem(CLE_SAUVEGARDE) || "{}");')
    out.push('  for (const nom of A_GARDER) if (nom in gardees) etat[nom] = gardees[nom];')
    out.push('} catch {')
    out.push('  // Navigateur sans stockage (navigation privée…) : on garde les valeurs de départ.')
    out.push('}')
    out.push('')
    out.push('function sauvegarder() {')
    out.push('  try {')
    out.push('    localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify(Object.fromEntries(A_GARDER.map((nom) => [nom, etat[nom]]))));')
    out.push('  } catch {')
    out.push('    // Stockage plein ou bloqué : les données restent seulement en mémoire.')
    out.push('  }')
    out.push('}')
  }

  title('Met à jour la page à partir des variables')
  out.push('function afficher() {')
  if (!dynamicTexts.length && !dynamicLists.length && !conditional.length && !boundFields.length && !repeats.length && !boundTables.length) {
    out.push('  // Rien à mettre à jour pour le moment.')
  }
  for (const n of dynamicTexts) {
    for (const [k, prop, after = ''] of dynamicProps(n)) {
      if (!needsTemplate(n.props[k], variables, false)) continue
      out.push(`  document.getElementById(${jsString(n.id)}).${prop} = ${jsTemplate(String(n.props[k]) + after, variables)};`)
    }
  }
  for (const n of dynamicLists) {
    out.push(`  document.getElementById(${jsString(n.id)}).replaceChildren(`)
    out.push(`    ...[${lines(n.props.items).map((i) => jsTemplate(i, variables)).join(', ')}].map((texte) => {`)
    out.push('      const element = document.createElement("li");')
    out.push('      element.textContent = texte;')
    out.push('      return element;')
    out.push('    }),')
    out.push('  );')
  }
  for (const n of conditional) {
    out.push(`  document.getElementById(${jsString(n.id)}).hidden = ${showIfExpr(String(n.showIf))};`)
  }
  for (const n of boundFields) {
    const field = `document.getElementById(${jsString(`${n.id}-champ`)})`
    if (n.type === 'checkbox') out.push(`  ${field}.checked = Boolean(etat.${n.props.bind});`)
    else out.push(`  remplir(${jsString(`${n.id}-champ`)}, etat.${n.props.bind});`)
  }
  for (const r of repeats) emitRepeat(out, g, r, order, showIfExpr)
  for (const n of boundTables) {
    const v = tableSource(n.props, variables)!
    const start = out.line + 1
    const fields = fieldsOf(v)
    const champs = fields.map((f) =>
      f.type === 'formula'
        ? `[${jsString(f.name)}, ${jsString(shownField(f).type)}, (ligne) => ${compileRecordField('ligne', f.name, fields)}]`
        : `[${jsString(f.name)}, ${jsString(f.type)}]`,
    )
    out.push(`  // ${oneLine(n.name)} : une ligne par fiche de etat.${v.name}`)
    const view = viewJs(n, variables, fields, '  ')
    out.push(`  rendreTableau(${jsString(n.id)}, etat.${v.name}, [${champs.join(', ')}], ${n.props.rowDelete ? 'true' : 'false'}${view ? `, ${view}` : ''});`)
    setRange(g.map, n.id, 'js', [start, out.line])
  }
  if (persisted.length) out.push('  sauvegarder();')
  out.push('}')

  if (boundTables.length) {
    out.push('')
    out.push('// Remplit un tableau avec les fiches d’une collection')
    out.push('function rendreTableau(id, liste, champs, suppression, reglages) {')
    out.push('  const conteneur = document.getElementById(id);')
    out.push('  const lignes = reglages ? vue(liste, reglages) : liste;')
    out.push('  conteneur.querySelector("tbody").replaceChildren(')
    out.push('    ...lignes.map((ligne) => {')
    out.push('      const tr = document.createElement("tr");')
    out.push('      for (const [nom, type, calcul] of champs) {')
    out.push('        const td = document.createElement("td");')
    out.push('        td.append(cellule(calcul ? calcul(ligne) : ligne[nom], type));')
    out.push('        tr.append(td);')
    out.push('      }')
    out.push('      if (suppression) {')
    out.push('        const td = document.createElement("td");')
    out.push('        const bouton = document.createElement("button");')
    out.push('        bouton.type = "button";')
    out.push('        bouton.className = "table-delete";')
    out.push('        bouton.textContent = "Supprimer";')
    out.push('        bouton.addEventListener("click", () => {')
    out.push('          liste.splice(liste.indexOf(ligne), 1);')
    out.push('          afficher();')
    out.push('        });')
    out.push('        td.append(bouton);')
    out.push('        tr.append(td);')
    out.push('      }')
    out.push('      return tr;')
    out.push('    }),')
    out.push('  );')
    out.push('  conteneur.querySelector(".table-empty").hidden = lignes.length > 0;')
    out.push('}')
    out.push('')
    out.push('// Contenu d’une case : une image, un lien ou un texte mis en forme')
    out.push('function cellule(valeur, type) {')
    out.push('  const texte = String(valeur ?? "");')
    out.push('  if (type === "image") {')
    out.push('    if (!/^(https?:\\/\\/|data:image\\/)/i.test(texte)) return "";')
    out.push('    const image = document.createElement("img");')
    out.push('    image.className = "table-img";')
    out.push('    image.src = texte;')
    out.push('    image.alt = "";')
    out.push('    return image;')
    out.push('  }')
    out.push('  if (type === "link" && /^https?:\\/\\//i.test(texte)) {')
    out.push('    const lien = document.createElement("a");')
    out.push('    lien.href = texte;')
    out.push('    lien.target = "_blank";')
    out.push('    lien.rel = "noopener";')
    out.push('    lien.textContent = texte.replace(/^https?:\\/\\//i, "");')
    out.push('    return lien;')
    out.push('  }')
    out.push('  return formater(valeur, type);')
    out.push('}')
    out.push('')
    out.push('// 1250.5 → « 1 250,5 », 2026-10-11 → « 11/10/2026 », vrai → « Oui »')
    out.push('function formater(valeur, type) {')
    out.push('  if (valeur === undefined || valeur === null || valeur === "") return "";')
    out.push('  if (type === "number") {')
    out.push('    const nombre = Number(valeur);')
    out.push('    if (!Number.isFinite(nombre)) return Number.isNaN(nombre) ? String(valeur) : "";')
    out.push('    return String(Math.round(nombre * 100) / 100).replace(".", ",").replace(/\\B(?=(\\d{3})+(?!\\d))/g, " ");')
    out.push('  }')
    out.push('  if (type === "boolean") return valeur === true || valeur === "true" ? "Oui" : "Non";')
    out.push('  if (type === "date") {')
    out.push('    const morceaux = /^(\\d{4})-(\\d{2})-(\\d{2})/.exec(String(valeur));')
    out.push('    return morceaux ? `${morceaux[3]}/${morceaux[2]}/${morceaux[1]}` : String(valeur);')
    out.push('  }')
    out.push('  return typeof valeur === "object" ? JSON.stringify(valeur) : String(valeur);')
    out.push('}')
  }

  if (boundFields.some((n) => n.type !== 'checkbox')) {
    out.push('')
    out.push('// Remplit un champ sans déplacer le curseur pendant la saisie')
    out.push('function remplir(id, valeur) {')
    out.push('  const champ = document.getElementById(id);')
    out.push('  if (champ.value !== String(valeur)) champ.value = valeur;')
    out.push('}')
  }

  if (repeats.length) {
    out.push('')
    out.push('// Crée une copie du modèle pour chaque élément d’une liste')
    out.push('function rendreListe(id, elements, remplirCopie, messageSiVide) {')
    out.push('  const conteneur = document.getElementById(id);')
    out.push('  const modele = conteneur.querySelector("template");')
    out.push('  conteneur.replaceChildren(modele);')
    out.push('  elements.forEach((element, index) => {')
    out.push('    const copie = modele.content.firstElementChild.cloneNode(true);')
    out.push('    remplirCopie(copie, element, index + 1);')
    out.push('    conteneur.append(copie);')
    out.push('  });')
    out.push('  if (!elements.length && messageSiVide) {')
    out.push('    const vide = document.createElement("p");')
    out.push('    vide.className = "repeat-empty";')
    out.push('    vide.textContent = messageSiVide;')
    out.push('    conteneur.append(vide);')
    out.push('  }')
    out.push('}')
  }

  if (boundFields.length) {
    title('Relie les champs de saisie aux variables')
    for (const n of boundFields) {
      const v = variables.find((x) => x.name === n.props.bind)!
      const start = out.line + 1
      const event = n.type === 'checkbox' || n.type === 'select' ? 'change' : 'input'
      let read = 'evenement.target.value'
      if (n.type === 'checkbox') read = v.kind === 'boolean' ? 'evenement.target.checked' : 'evenement.target.checked ? "oui" : "non"'
      else if (v.kind === 'number') read = 'Number(evenement.target.value.replace(",", ".")) || 0'
      else if (v.kind === 'boolean') read = 'evenement.target.value !== ""'
      out.push(`// ${commentName(n)}`)
      out.push(`document.getElementById(${jsString(`${n.id}-champ`)}).addEventListener(${jsString(event)}, (evenement) => {`)
      out.push(`  etat.${v.name} = ${read};`)
      out.push('  afficher();')
      out.push('});')
      setRange(g.map, n.id, 'js', [start, out.line])
    }
  }

  if (clickable.length) {
    title('Réagit aux clics')
    for (const n of clickable) {
      const start = out.line + 1
      out.push(`// ${commentName(n)} : ${n.onClick.map((a) => describeAction(a, project)).join(', ')}`)
      out.push(`document.getElementById(${jsString(n.id)}).addEventListener("click", ${needsAsync(n.onClick) ? 'async ' : ''}() => {`)
      emitActionsBlock(out, g, n.onClick, { repeat: null }, '  ')
      out.push('});')
      setRange(g.map, n.id, 'js', [start, out.line])
    }
  }

  if (multi) {
    title('Navigation entre les pages (l’adresse se termine par #nom-de-la-page)')
    out.push(`const PAGES = [${project.pages.map(jsString).join(', ')}];`)
    out.push(`const PAGE_DEPART = ${jsString(project.rootId)};`)
    out.push('')
    const receivers = project.pages
      .map((id) => project.nodes[id])
      .map((p) => [p, variables.find((v) => v.name === p?.props.paramVar && (v.kind === 'text' || v.kind === 'number'))] as const)
      .filter(([p, v]) => p && v)
    if (receivers.length) {
      out.push('// Une page peut recevoir une valeur : #fiche/Café ouvre la page « fiche » avec « Café »')
      out.push('const VALEURS_RECUES = {')
      for (const [p, v] of receivers) {
        out.push(`  ${jsString(p!.id)}: (valeur) => (etat.${v!.name} = ${v!.kind === 'number' ? 'Number(valeur) || 0' : 'valeur'}),`)
      }
      out.push('};')
      out.push('')
    }
    out.push('function allerA(page, valeur) {')
    out.push('  const adresse = valeur === undefined || valeur === "" ? page : page + "/" + encodeURIComponent(valeur);')
    out.push('  if (location.hash === "#" + adresse) afficherPage();')
    out.push('  else location.hash = adresse;')
    out.push('}')
    out.push('')
    const guarded = project.pages
      .map((id) => project.nodes[id])
      .filter((p) => p && variables.some((v) => v.name === p.props.loginVar && v.kind === 'text') && project.pages.includes(String(p.props.loginPage)) && p.props.loginPage !== p.id)
    if (guarded.length) {
      out.push('// Pages réservées aux personnes connectées : sinon, on les envoie sur la page de connexion')
      out.push('const PAGES_RESERVEES = {')
      for (const p of guarded) out.push(`  ${jsString(p.id)}: () => (etat.${String(p.props.loginVar)} ? null : ${jsString(String(p.props.loginPage))}),`)
      out.push('};')
      out.push('')
    }
    out.push('function afficherPage() {')
    out.push('  const [demandee, ...reste] = location.hash.slice(1).split("/");')
    out.push('  const page = PAGES.includes(demandee) ? demandee : PAGE_DEPART;')
    if (guarded.length) {
      out.push('  const connexion = PAGES_RESERVEES[page]?.();')
      out.push('  if (connexion) return allerA(connexion);')
    }
    if (receivers.length) {
      out.push('  if (reste.length && VALEURS_RECUES[page]) {')
      out.push('    VALEURS_RECUES[page](decodeURIComponent(reste.join("/")));')
      out.push('    afficher();')
      out.push('  }')
    }
    out.push('  for (const id of PAGES) document.getElementById(id).hidden = id !== page;')
    out.push('  window.scrollTo(0, 0);')
    if (hasNavbar || hasTabbar) {
      out.push('  for (const lien of document.querySelectorAll(".navbar a, .tabbar a")) {')
      out.push('    lien.classList.toggle("is-active", lien.getAttribute("href") === "#" + page);')
      out.push('  }')
    }
    if (loads.length) out.push('  auChargement[page]?.();')
    out.push('}')
    out.push('window.addEventListener("hashchange", afficherPage);')
    out.push('')
    out.push('// Les liens vers une page du projet passent par allerA')
    out.push('for (const lien of document.querySelectorAll(\'a[href^="#"]\')) {')
    out.push('  lien.addEventListener("click", (evenement) => {')
    out.push('    const page = lien.getAttribute("href").slice(1);')
    out.push('    if (!PAGES.includes(page)) return;')
    out.push('    evenement.preventDefault();')
    out.push('    allerA(page);')
    out.push('  });')
    out.push('}')

    if (loads.length) {
      title('Actions lancées quand une page s’affiche')
      out.push('const auChargement = {')
      for (const p of loads) {
        const start = out.line + 1
        out.push(`  // ${oneLine(p.name)}`)
        out.push(`  ${jsString(p.id)}: ${needsAsync(p.onLoad!) ? 'async ' : ''}() => {`)
        emitActionsBlock(out, g, p.onLoad!, { repeat: null }, '    ')
        out.push('  },')
        setRange(g.map, p.id, 'js', [start, out.line])
      }
      out.push('};')
    }
  }

  if (hasTabs) {
    title('Onglets : un clic sur un titre affiche son panneau')
    out.push('for (const onglets of document.querySelectorAll(".tabs")) {')
    out.push('  const titres = [...onglets.querySelectorAll(":scope > .tabs-bar > button")];')
    out.push('  const panneaux = [...onglets.children].slice(1);')
    out.push('  titres.forEach((titre, i) => {')
    out.push('    titre.addEventListener("click", () => {')
    out.push('      titres.forEach((t, j) => t.setAttribute("aria-selected", String(i === j)));')
    out.push('      panneaux.forEach((panneau, j) => (panneau.hidden = i !== j));')
    out.push('    });')
    out.push('  });')
    out.push('}')
  }

  if (hasModals) {
    title('Fenêtres : la croix ou un clic à côté les referme')
    out.push('for (const fenetre of document.querySelectorAll(".modal")) {')
    out.push('  fenetre.addEventListener("click", (evenement) => {')
    out.push('    if (evenement.target === fenetre || evenement.target.closest(".modal-close")) fenetre.hidden = true;')
    out.push('  });')
    out.push('}')
  }

  if (hasSortable) {
    title('Tableaux : un clic sur un titre de colonne trie les lignes')
    out.push('for (const tableau of document.querySelectorAll(".table")) {')
    out.push('  const titres = [...tableau.querySelectorAll("th button")];')
    out.push('  titres.forEach((bouton, colonne) => {')
    out.push('    bouton.addEventListener("click", () => {')
    out.push('      const th = bouton.parentElement;')
    out.push('      const croissant = th.getAttribute("aria-sort") !== "ascending";')
    out.push('      for (const autre of tableau.querySelectorAll("th")) autre.removeAttribute("aria-sort");')
    out.push('      th.setAttribute("aria-sort", croissant ? "ascending" : "descending");')
    out.push('      const corps = tableau.querySelector("tbody");')
    out.push('      const lignes = [...corps.rows].sort((a, b) => {')
    out.push('        const x = a.cells[colonne]?.textContent ?? "";')
    out.push('        const y = b.cells[colonne]?.textContent ?? "";')
    out.push('        const ordre = x.localeCompare(y, "fr", { numeric: true });')
    out.push('        return croissant ? ordre : -ordre;')
    out.push('      });')
    out.push('      corps.append(...lignes);')
    out.push('    });')
    out.push('  });')
    out.push('}')
  }

  if (hasKanban) {
    title('Kanban : glisse une carte dans une autre colonne, ou utilise sa flèche')
    out.push('for (const kanban of document.querySelectorAll(".kanban")) {')
    out.push('  const colonnes = [...kanban.querySelectorAll(".kanban-cards")];')
    out.push('  const compter = () => {')
    out.push('    for (const liste of colonnes) {')
    out.push('      liste.parentElement.querySelector(".kanban-count").textContent = liste.children.length;')
    out.push('    }')
    out.push('  };')
    out.push('  let deplacee = null;')
    out.push('  kanban.addEventListener("dragstart", (evenement) => {')
    out.push('    deplacee = evenement.target.closest(".kanban-card");')
    out.push('    deplacee?.classList.add("is-dragging");')
    out.push('  });')
    out.push('  kanban.addEventListener("dragend", () => {')
    out.push('    deplacee?.classList.remove("is-dragging");')
    out.push('    deplacee = null;')
    out.push('  });')
    out.push('  for (const liste of colonnes) {')
    out.push('    liste.addEventListener("dragover", (evenement) => evenement.preventDefault());')
    out.push('    liste.addEventListener("drop", (evenement) => {')
    out.push('      evenement.preventDefault();')
    out.push('      if (!deplacee) return;')
    out.push('      const apres = [...liste.children].find((carte) => {')
    out.push('        const boite = carte.getBoundingClientRect();')
    out.push('        return evenement.clientY < boite.top + boite.height / 2;')
    out.push('      });')
    out.push('      liste.insertBefore(deplacee, apres ?? null);')
    out.push('      compter();')
    out.push('    });')
    out.push('  }')
    out.push('  kanban.addEventListener("click", (evenement) => {')
    out.push('    const bouton = evenement.target.closest(".kanban-move");')
    out.push('    if (!bouton) return;')
    out.push('    const carte = bouton.closest(".kanban-card");')
    out.push('    const suivante = colonnes[(colonnes.indexOf(carte.parentElement) + 1) % colonnes.length];')
    out.push('    suivante.append(carte);')
    out.push('    bouton.focus();')
    out.push('    compter();')
    out.push('  });')
    out.push('}')
  }

  if (hasChat) {
    title('Discussion : envoyer un message l’ajoute en bas de la conversation')
    out.push('for (const discussion of document.querySelectorAll(".chat")) {')
    out.push('  const formulaire = discussion.querySelector(".chat-form");')
    out.push('  if (!formulaire) continue;')
    out.push('  const auteur = discussion.dataset.moi || "Moi";')
    out.push('  formulaire.addEventListener("submit", (evenement) => {')
    out.push('    evenement.preventDefault();')
    out.push('    const champ = formulaire.querySelector("input");')
    out.push('    const texte = champ.value.trim();')
    out.push('    if (!texte) return;')
    out.push('    const message = document.createElement("div");')
    out.push('    message.className = "chat-msg is-me";')
    out.push('    const nom = document.createElement("span");')
    out.push('    nom.className = "chat-author";')
    out.push('    nom.textContent = auteur;')
    out.push('    const bulle = document.createElement("p");')
    out.push('    bulle.className = "chat-bubble";')
    out.push('    bulle.textContent = texte;')
    out.push('    message.append(nom, bulle);')
    out.push('    const fil = discussion.querySelector(".chat-messages");')
    out.push('    fil.append(message);')
    out.push('    fil.scrollTop = fil.scrollHeight;')
    out.push('    champ.value = "";')
    out.push('  });')
    out.push('}')
  }

  out.push('')
  out.push('// Premier affichage')
  out.push('afficher();')
  if (multi) out.push('afficherPage();')
  else if (loads.length) {
    const p = loads[0]
    title('Au chargement de la page')
    const start = out.line + 1
    const asyncLoad = needsAsync(p.onLoad!)
    if (asyncLoad || needsFunction(p.onLoad!)) {
      out.push(`(${asyncLoad ? 'async ' : ''}() => {`)
      emitActionsBlock(out, g, p.onLoad!, { repeat: null }, '  ')
      out.push('})();')
    } else emitActionsBlock(out, g, p.onLoad!, { repeat: null }, '')
    setRange(g.map, p.id, 'js', [start, out.line])
  }
  if (/\bverifier\(/.test(out.toString())) {
    title('Vérification des formulaires : chaque champ suit ses règles, la première erreur reçoit le curseur')
    out.push('function verifier(zone) {')
    out.push('  const champs = zone.matches("input, textarea, select") ? [zone] : [...zone.querySelectorAll("input, textarea, select")];')
    out.push('  let premier = null;')
    out.push('  for (const champ of champs) {')
    out.push('    if (!montrerErreur(champ) && !premier) premier = champ;')
    out.push('    if (!champ.dataset.suivi) {')
    out.push('      // Une fois signalée, l’erreur disparaît dès que le champ est corrigé.')
    out.push('      champ.dataset.suivi = "oui";')
    out.push('      champ.addEventListener(champ.type === "checkbox" || champ.tagName === "SELECT" ? "change" : "input", () => montrerErreur(champ));')
    out.push('    }')
    out.push('  }')
    out.push('  premier?.focus();')
    out.push('  return !premier;')
    out.push('}')
    out.push('')
    out.push('function montrerErreur(champ) {')
    out.push('  const message = erreurDe(champ);')
    out.push('  const boite = champ.closest("label");')
    out.push('  const zone = boite?.querySelector(".field-error");')
    out.push('  boite?.classList.toggle("is-invalid", Boolean(message));')
    out.push('  champ.setAttribute("aria-invalid", String(Boolean(message)));')
    out.push('  if (zone) {')
    out.push('    zone.textContent = message;')
    out.push('    zone.hidden = !message;')
    out.push('  }')
    out.push('  return !message;')
    out.push('}')
    out.push('')
    out.push('function erreurDe(champ) {')
    out.push('  const perso = champ.dataset.erreur;')
    out.push('  if (champ.type === "checkbox") return champ.required && !champ.checked ? perso || "Coche cette case pour continuer." : "";')
    out.push('  const valeur = champ.value.trim();')
    out.push('  if (!valeur) return champ.required ? perso || "Ce champ est obligatoire." : "";')
    out.push('  if (champ.minLength > 0 && valeur.length < champ.minLength) return perso || `Écris au moins ${champ.minLength} caractères.`;')
    out.push('  if (champ.type === "email" && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(valeur)) return perso || "Cette adresse e-mail n’est pas valide.";')
    out.push('  if (champ.type === "number") {')
    out.push('    const nombre = Number(valeur.replace(",", "."));')
    out.push('    if (Number.isNaN(nombre)) return perso || "Écris un nombre.";')
    out.push('    if (champ.min !== "" && nombre < Number(champ.min)) return perso || `Le nombre doit être au moins ${champ.min}.`;')
    out.push('    if (champ.max !== "" && nombre > Number(champ.max)) return perso || `Le nombre doit être au plus ${champ.max}.`;')
    out.push('  }')
    out.push('  return "";')
    out.push('}')
  }
  if (/\bvue\(etat\.|rendreTableau\([^\n]*, \{$/m.test(out.toString())) {
    title('Recherche, filtre et tri : la liste elle-même ne change pas, seul l’affichage suit les réglages')
    out.push('function vue(liste, reglages) {')
    out.push('  let elements = liste;')
    out.push('  if (reglages.recherche) {')
    out.push('    const mot = normaliser(reglages.recherche);')
    out.push('    elements = elements.filter((x) => normaliser(reglages.texte ? reglages.texte(x) : x).includes(mot));')
    out.push('  }')
    out.push('  if (reglages.filtre) elements = elements.filter(reglages.filtre);')
    out.push('  if (reglages.tri) {')
    out.push('    const sens = reglages.inverse ? -1 : 1;')
    out.push('    elements = [...elements].sort((a, b) => comparer(reglages.tri(a), reglages.tri(b)) * sens);')
    out.push('  }')
    out.push('  return elements;')
    out.push('}')
  }
  const usesVue = /\b(vue|normaliser|comparer)\(/.test(out.toString())
  if (usesVue) {
    out.push('')
    out.push('// « Épicerie » et « epicerie » sont le même mot pour la recherche')
    out.push('function normaliser(valeur) {')
    out.push('  return String(valeur ?? "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().trim();')
    out.push('}')
    out.push('')
    out.push('// Deux nombres se comparent comme des nombres, le reste dans l’ordre alphabétique')
    out.push('function comparer(a, b) {')
    out.push('  if (typeof a === "number" && typeof b === "number") return a - b;')
    out.push('  return String(a ?? "").localeCompare(String(b ?? ""), "fr", { numeric: true });')
    out.push('}')
  }
  if (customCode.length) {
    title('Ton code personnalisé : chaque bloc reçoit « bloc » (la brique) et peut lire ou changer « etat »')
    for (const n of customCode) {
      out.push(`// ${commentName(n)}`)
      out.push(`(function (bloc) {`)
      out.push(`  bloc.innerHTML = ${closeSafe(jsString(String(n.props.html ?? '')), 'script')};`)
      for (const l of closeSafe(String(n.props.js ?? ''), 'script').split('\n')) out.push(l ? `  ${l}` : '')
      out.push(`})(document.getElementById(${jsString(n.id)}));`)
    }
  }
  if (/\bawait (creerCompte|connecter)\(/.test(out.toString())) {
    title('Comptes de l’application')
    for (const l of ACCOUNT_HELPERS(slugName(project.name))) out.push(l)
  }
  const helpers = exprHelpers(out.toString())
  if (helpers.length) {
    title('Outils de calcul pour les formules')
    for (const l of helpers) out.push(l)
  }
  return out.toString()
}

/** Une répétition : remplit chaque copie et branche ses clics. */
function emitRepeat(out: Emitter, g: Gen, r: BrickNode, order: BrickNode[], showIfExpr: (name: string) => string) {
  const { variables } = g.project
  const start = out.line + 1
  const source = variables.find((v) => v.name === r.props.source && isListLike(v))
  if (!source) {
    out.push(`  // ${oneLine(r.name)} : choisis une liste à parcourir dans ses propriétés.`)
    setRange(g.map, r.id, 'js', [start, out.line])
    return
  }
  const members = order.filter((n) => g.repeatOf.get(n.id) === r.id)
  const q = (n: BrickNode) => `copie.querySelector(${jsString(`.${n.id}`)})`
  const empty = String(r.props.empty ?? '').trim()
  out.push(`  // ${oneLine(r.name)} : une copie par élément de etat.${source.name}`)
  const view = viewJs(r, variables, source.fields, '  ')
  const list = view ? `vue(etat.${source.name}, ${view})` : `etat.${source.name}`
  out.push(`  rendreListe(${jsString(r.id)}, ${list}, (copie, element, position) => {`)
  for (const n of members) {
    for (const [k, prop, after = ''] of dynamicProps(n)) {
      if (needsTemplate(n.props[k], variables, true, source.fields)) out.push(`    ${q(n)}.${prop} = ${jsTemplate(String(n.props[k]) + after, variables, true, source.fields)};`)
    }
    if (n.showIf && variables.some((v) => v.name === n.showIf)) out.push(`    ${q(n)}.hidden = ${showIfExpr(n.showIf)};`)
  }
  for (const n of members.filter((m) => m.onClick.length)) {
    const s = out.line + 1
    out.push(`    // ${commentName(n)} : ${n.onClick.map((a) => describeAction(a, g.project)).join(', ')}`)
    out.push(`    ${q(n)}.addEventListener("click", ${needsAsync(n.onClick) ? 'async ' : ''}() => {`)
    emitActionsBlock(out, g, n.onClick, { repeat: r.id, fields: source.fields, byElement: !!view }, '      ')
    out.push('    });')
    setRange(g.map, n.id, 'js', [s, out.line])
  }
  out.push(`  }${empty ? `, ${jsString(empty)}` : ''});`)
  setRange(g.map, r.id, 'js', [start, out.line])
}

const slugName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'application'

/** Créer un compte et se connecter, sans serveur : les comptes restent dans le navigateur de chaque personne. */
const ACCOUNT_HELPERS = (key: string): string[] => [
  '// Les comptes sont gardés dans ce navigateur, et le mot de passe n’y est jamais écrit en clair :',
  '// seule son empreinte (SHA-256) est gardée. Chaque appareil a ses propres comptes : pour des comptes',
  '// partagés entre appareils, il faudra un serveur.',
  `const CLE_COMPTES = ${jsString(`${key}:comptes`)};`,
  'let comptesSansStockage = {};',
  'function lireComptes() {',
  '  try {',
  '    return JSON.parse(localStorage.getItem(CLE_COMPTES)) || {};',
  '  } catch {',
  '    return comptesSansStockage;',
  '  }',
  '}',
  'function ecrireComptes(comptes) {',
  '  comptesSansStockage = comptes;',
  '  try {',
  '    localStorage.setItem(CLE_COMPTES, JSON.stringify(comptes));',
  '  } catch {',
  '    // Stockage bloqué (aperçu, navigation privée) : les comptes durent le temps de la visite.',
  '  }',
  '}',
  'async function empreinte(email, motDePasse) {',
  '  const octets = new TextEncoder().encode(email + ":" + motDePasse);',
  '  const resultat = await crypto.subtle.digest("SHA-256", octets);',
  '  return [...new Uint8Array(resultat)].map((o) => o.toString(16).padStart(2, "0")).join("");',
  '}',
  '// Renvoie un message d’erreur, ou "" si tout va bien',
  'async function creerCompte(email, motDePasse) {',
  '  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return "Écris une adresse e-mail valide.";',
  '  if (motDePasse.length < 6) return "Le mot de passe doit avoir au moins 6 caractères.";',
  '  const comptes = lireComptes();',
  '  if (comptes[email]) return "Un compte existe déjà avec cette adresse.";',
  '  comptes[email] = await empreinte(email, motDePasse);',
  '  ecrireComptes(comptes);',
  '  return "";',
  '}',
  'async function connecter(email, motDePasse) {',
  '  const comptes = lireComptes();',
  '  if (!comptes[email] || comptes[email] !== (await empreinte(email, motDePasse))) return "E-mail ou mot de passe incorrect.";',
  '  return "";',
  '}',
]

/* -------------------------------- Ensemble ------------------------------- */

export function generate(project: Project): GeneratedCode {
  const g = createGen(project)
  const root = project.nodes[project.rootId]
  const html = new Emitter()
  html.push('<!DOCTYPE html>')
  html.push('<html lang="fr">')
  html.push('<head>')
  html.push('  <meta charset="UTF-8">')
  html.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">')
  html.push(`  <title>${escapeHtml(String(root.props.title || project.name))}</title>`)
  const fonts = themeFontsUrl(project.theme)
  if (fonts) html.push(`  <link rel="stylesheet" href="${fonts.replace(/&/g, '&amp;')}">`)
  html.push('  <link rel="stylesheet" href="style.css">')
  html.push('</head>')
  html.push('<body>')
  for (const id of project.pages) if (project.nodes[id]) emitNode(html, g, project.nodes[id], '  ')
  html.push('  <script src="script.js"></script>')
  html.push('</body>')
  html.push('</html>')

  const css = emitCss(g)
  const js = emitJs(g)
  return { html: html.toString(), css, js, map: g.map }
}

/** Fichier HTML unique (styles et script intégrés) : utilisé pour l'aperçu et l'export. */
export function bundle(code: GeneratedCode, options: { startPage?: string } = {}): string {
  let js = code.js
  if (options.startPage) js = js.replace(/^const PAGE_DEPART = .*;$/m, () => `const PAGE_DEPART = ${jsString(options.startPage!)};`)
  const safeJs = js.replace(/<\/(script)/gi, '<\\/$1')
  // Remplacements par fonction : un « $& » dans le code ne doit pas être interprété.
  return code.html
    .replace('  <link rel="stylesheet" href="style.css">', () => `  <style>\n${code.css}  </style>`)
    .replace('  <script src="script.js"></script>', () => `  <script>\n${safeJs}  </script>`)
}

export const brickLabel = (node: BrickNode) => BRICKS[node.type].label

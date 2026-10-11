import { BRICKS } from '../model/bricks'
import type { Action, BrickNode, Project, Variable } from '../model/types'
import { interpolate, parseTemplate } from '../model/variables'
import { BASE_CSS, PLACEHOLDER_IMAGE, brickClass } from './baseCss'
import { escapeHtml, escapeTemplate, safeHref, safeImageSrc } from './escape'
import { styleEntries } from './style'

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

function emitNode(out: Emitter, g: Gen, node: BrickNode, indent: string) {
  const { project } = g
  const { variables } = project
  const p = node.props
  const start = out.line + 1
  const repeated = g.repeatOf.has(node.id)
  const cls = [brickClass(node), repeated ? node.id : ''].filter(Boolean).join(' ')
  const isOtherPage = node.type === 'page' && project.pages.length > 1 && node.id !== project.rootId
  const hidden = isInitiallyHidden(node, variables) || isOtherPage ? true : null
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
      out.push(`${inner}<span>${escapeHtml(String(p.label ?? ''))}</span>`)
      const fieldAttrs: [string, string | true | null][] = [
        ['id', repeated ? null : `${node.id}-champ`],
        ['placeholder', node.type === 'select' ? null : String(p.placeholder ?? '')],
      ]
      if (node.type === 'input') {
        const type = ['text', 'email', 'number', 'password'].includes(String(p.inputType)) ? String(p.inputType) : 'text'
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
      out.push(`${indent}</label>`)
      break
    }
    case 'checkbox': {
      const bound = variables.find((v) => v.name === p.bind)
      out.push(`${indent}<label${attrs(base)}>`)
      out.push(`${inner}<input type="checkbox"${attrs([['id', repeated ? null : `${node.id}-champ`], ['checked', bound?.initial ? true : null]])}>`)
      out.push(`${inner}<span>${escapeHtml(String(p.label ?? ''))}</span>`)
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
  out.push('/* Styles de tes briques */')
  for (const node of documentOrder(g.project)) {
    const entries = styleEntries(node)
    if (!entries.length) continue
    const start = out.line + 1
    out.push(`/* ${node.name.replace(/[*/<>]/g, '')} */`)
    out.push(`${selectorOf(g, node.id)} {`)
    for (const [k, v] of entries) out.push(`  ${k}: ${v};`)
    out.push('}')
    setRange(g.map, node.id, 'css', [start, out.line])
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
  if (Array.isArray(v)) return `[${v.map(jsString).join(', ')}]`
  return typeof v === 'string' ? jsString(v) : String(v)
}

/** {{element}}, {{element.nom}} et {{position}} : valables seulement dans une répétition. */
const isScopeToken = (name: string) => name === 'element' || name === 'position' || name.startsWith('element.')

/** « Bonjour {{prenom}} » → `Bonjour ${etat.prenom}` */
function jsTemplate(text: string, variables: Variable[], inRepeat = false): string {
  const body = parseTemplate(text)
    .map((part) => {
      if (part.kind === 'var') {
        const v = variables.find((x) => x.name === part.name)
        if (v) return v.kind === 'list' ? `\${etat.${v.name}.length}` : `\${etat.${v.name}}`
        if (inRepeat && isScopeToken(part.name)) {
          if (part.name === 'position') return '${position}'
          if (part.name === 'element') return '${element}'
          return `\${${part.name.replace(/\.([A-Za-z0-9_]+)/g, (_, k: string) => (/^\d/.test(k) ? `?.[${k}]` : `?.${k}`))} ?? ""}`
        }
        return escapeTemplate(`{{${part.name}}}`)
      }
      return escapeTemplate(part.value)
    })
    .join('')
  return body ? '`' + body + '`' : '""'
}

/** Le texte contient-il des {{…}} que le script doit remplacer ? */
function needsTemplate(text: unknown, variables: Variable[], inRepeat: boolean): boolean {
  if (typeof text !== 'string') return false
  return parseTemplate(text).some((p) => p.kind === 'var' && (variables.some((v) => v.name === p.name) || (inRepeat && isScopeToken(p.name))))
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
      return `page « ${name(a.page)} »`
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
  }
}

/** Où se trouve l'action : dans une copie de répétition ou non. */
interface ActionCtx {
  repeat: string | null
}

const indentLines = (ls: string[]) => ls.map((l) => `  ${l}`)

function conditionExpr(a: Extract<Action, { type: 'if' }>, v: Variable): string {
  const ref = `etat.${v.name}`
  const list = v.kind === 'list'
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
  const tpl = (s: string) => jsTemplate(s, vars, inRepeat)
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
            : v.kind === 'list'
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
      return { lines: [`allerA(${jsString(a.page)});`], changesState: false }
    }
    case 'listAdd': {
      const v = find(a.variable)
      if (!v || v.kind !== 'list') return missingVar(a.variable)
      return { lines: [`etat.${v.name}.push(${tpl(a.value)});`], changesState: true }
    }
    case 'listRemove': {
      const v = find(a.variable)
      if (!v || v.kind !== 'list') return missingVar(a.variable)
      if (a.which === 'current') {
        if (!inRepeat) return ignored('« l’élément de cette copie » ne marche que dans une répétition.')
        return { lines: [`etat.${v.name}.splice(position - 1, 1);`], changesState: true }
      }
      return { lines: [`etat.${v.name}.${a.which === 'first' ? 'shift' : 'pop'}();`], changesState: true }
    }
    case 'listClear': {
      const v = find(a.variable)
      if (!v || v.kind !== 'list') return missingVar(a.variable)
      return { lines: [`etat.${v.name} = [];`], changesState: true }
    }
    case 'if': {
      const v = find(a.variable)
      if (!v) return missingVar(a.variable)
      const thenR = a.then.map((x) => actionLines(x, g, ctx))
      const elseR = a.else.map((x) => actionLines(x, g, ctx))
      const out = [`if (${conditionExpr(a, v)}) {`]
      out.push(...indentLines(thenR.flatMap((r) => r.lines)))
      if (!thenR.length) out.push('  // Rien à faire')
      if (elseR.length) {
        out.push('} else {')
        out.push(...indentLines(elseR.flatMap((r) => r.lines)))
      }
      out.push('}')
      return { lines: out, changesState: [...thenR, ...elseR].some((r) => r.changesState) }
    }
    case 'fetch': {
      const v = find(a.variable)
      if (!v) return missingVar(a.variable)
      if (!/^https?:\/\//i.test(a.url.trim())) return ignored('l’adresse doit commencer par https://')
      const path = jsPath(a.path)
      if (path == null) return ignored(`le chemin « ${oneLine(a.path)} » n’est pas valide.`)
      const read = `donnees${path}`
      const convert =
        v.kind === 'list'
          ? `Array.isArray(valeur) ? valeur : []`
          : v.kind === 'number'
            ? 'Number(valeur) || 0'
            : v.kind === 'boolean'
              ? 'Boolean(valeur)'
              : 'typeof valeur === "object" ? JSON.stringify(valeur) : String(valeur ?? "")'
      return {
        lines: [
          `fetch(${tpl(a.url.trim())})`,
          '  .then((reponse) => reponse.json())',
          '  .then((donnees) => {',
          `    const valeur = ${read};`,
          `    etat.${v.name} = ${convert};`,
          '    afficher();',
          '  })',
          '  .catch((erreur) => console.error("Chargement impossible :", erreur));',
        ],
        changesState: false,
      }
    }
  }
}

function emitActionsBlock(out: Emitter, g: Gen, actions: Action[], ctx: ActionCtx, indent: string) {
  let changes = false
  for (const a of actions) {
    const r = actionLines(a, g, ctx)
    changes ||= r.changesState
    for (const l of r.lines) out.push(`${indent}${l}`)
  }
  if (changes) out.push(`${indent}afficher();`)
}

/** Propriétés dont le texte peut contenir des {{…}} : [clé, propriété DOM]. */
function dynamicProps(n: BrickNode): [string, 'textContent' | 'src'][] {
  if (n.type === 'image') return [['src', 'src']]
  return [['text', 'textContent']]
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
  const clickable = outside.filter((n) => n.onClick.length > 0)
  const repeats = order.filter((n) => g.repeats.has(n.id))
  const loads = project.pages.map((id) => project.nodes[id]).filter((p) => p?.onLoad?.length)

  out.push('// Code généré par Ptt-Makers. Tu peux le lire, le copier et le modifier librement !')

  if (!variables.length && !clickable.length && !repeats.length && !multi && !loads.length) {
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
    return v.kind === 'list' ? `etat.${name}.length === 0` : `!etat.${name}`
  }

  title("Les variables de l'application (son « état »)")
  if (variables.length) {
    out.push('const etat = {')
    for (const v of variables) out.push(`  ${v.name}: ${jsValue(v.initial)},`)
    out.push('};')
  } else {
    out.push('const etat = {};')
  }

  title('Met à jour la page à partir des variables')
  out.push('function afficher() {')
  if (!dynamicTexts.length && !dynamicLists.length && !conditional.length && !boundFields.length && !repeats.length) {
    out.push('  // Rien à mettre à jour pour le moment.')
  }
  for (const n of dynamicTexts) {
    for (const [k, prop] of dynamicProps(n)) {
      if (!needsTemplate(n.props[k], variables, false)) continue
      out.push(`  document.getElementById(${jsString(n.id)}).${prop} = ${jsTemplate(String(n.props[k]), variables)};`)
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
  out.push('}')

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
      else if (v.kind === 'number') read = 'Number(evenement.target.value) || 0'
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
      out.push(`document.getElementById(${jsString(n.id)}).addEventListener("click", () => {`)
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
    out.push('function allerA(page) {')
    out.push('  if (location.hash === "#" + page) afficherPage();')
    out.push('  else location.hash = page;')
    out.push('}')
    out.push('')
    out.push('function afficherPage() {')
    out.push('  const demandee = location.hash.slice(1);')
    out.push('  const page = PAGES.includes(demandee) ? demandee : PAGE_DEPART;')
    out.push('  for (const id of PAGES) document.getElementById(id).hidden = id !== page;')
    out.push('  window.scrollTo(0, 0);')
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
        out.push(`  ${jsString(p.id)}: () => {`)
        emitActionsBlock(out, g, p.onLoad!, { repeat: null }, '    ')
        out.push('  },')
        setRange(g.map, p.id, 'js', [start, out.line])
      }
      out.push('};')
    }
  }

  out.push('')
  out.push('// Premier affichage')
  out.push('afficher();')
  if (multi) out.push('afficherPage();')
  else if (loads.length) {
    const p = loads[0]
    title('Au chargement de la page')
    const start = out.line + 1
    emitActionsBlock(out, g, p.onLoad!, { repeat: null }, '')
    setRange(g.map, p.id, 'js', [start, out.line])
  }
  return out.toString()
}

/** Une répétition : remplit chaque copie et branche ses clics. */
function emitRepeat(out: Emitter, g: Gen, r: BrickNode, order: BrickNode[], showIfExpr: (name: string) => string) {
  const { variables } = g.project
  const start = out.line + 1
  const source = variables.find((v) => v.name === r.props.source && v.kind === 'list')
  if (!source) {
    out.push(`  // ${oneLine(r.name)} : choisis une liste à parcourir dans ses propriétés.`)
    setRange(g.map, r.id, 'js', [start, out.line])
    return
  }
  const members = order.filter((n) => g.repeatOf.get(n.id) === r.id)
  const q = (n: BrickNode) => `copie.querySelector(${jsString(`.${n.id}`)})`
  const empty = String(r.props.empty ?? '').trim()
  out.push(`  // ${oneLine(r.name)} : une copie par élément de etat.${source.name}`)
  out.push(`  rendreListe(${jsString(r.id)}, etat.${source.name}, (copie, element, position) => {`)
  for (const n of members) {
    for (const [k, prop] of dynamicProps(n)) {
      if (needsTemplate(n.props[k], variables, true)) out.push(`    ${q(n)}.${prop} = ${jsTemplate(String(n.props[k]), variables, true)};`)
    }
    if (n.showIf && variables.some((v) => v.name === n.showIf)) out.push(`    ${q(n)}.hidden = ${showIfExpr(n.showIf)};`)
  }
  for (const n of members.filter((m) => m.onClick.length)) {
    const s = out.line + 1
    out.push(`    // ${commentName(n)} : ${n.onClick.map((a) => describeAction(a, g.project)).join(', ')}`)
    out.push(`    ${q(n)}.addEventListener("click", () => {`)
    emitActionsBlock(out, g, n.onClick, { repeat: r.id }, '      ')
    out.push('    });')
    setRange(g.map, n.id, 'js', [s, out.line])
  }
  out.push(`  }${empty ? `, ${jsString(empty)}` : ''});`)
  setRange(g.map, r.id, 'js', [start, out.line])
}

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

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

/** Champs dont le texte peut contenir des variables {{nom}}. */
const DYNAMIC_KEYS = ['text']

function setRange(map: GeneratedCode['map'], id: string, kind: 'html' | 'css' | 'js', range: LineRange) {
  map[id] = { ...map[id], [kind]: range }
}

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
    if (v) return !v.initial
  }
  return false
}

function emitNode(out: Emitter, project: Project, node: BrickNode, indent: string, map: GeneratedCode['map']) {
  const { variables } = project
  const p = node.props
  const start = out.line + 1
  const cls = brickClass(node)
  const hidden = isInitiallyHidden(node, variables) ? true : null
  const base: [string, string | true | null][] = [
    ['id', node.id],
    ['class', cls],
    ['hidden', hidden],
  ]
  const text = (key: string) => escapeHtml(interpolate(String(p[key] ?? ''), variables))
  const inner = indent + '  '

  switch (node.type) {
    case 'page':
    case 'section':
    case 'row':
    case 'stack':
    case 'grid':
    case 'card': {
      const tag = node.type === 'page' ? 'main' : node.type === 'section' ? 'section' : 'div'
      out.push(`${indent}<!-- ${escapeHtml(node.name)} -->`)
      if (node.children.length === 0) {
        out.push(`${indent}<${tag}${attrs(base)}></${tag}>`)
      } else {
        out.push(`${indent}<${tag}${attrs(base)}>`)
        for (const c of node.children) emitNode(out, project, project.nodes[c], inner, map)
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
    case 'link':
      out.push(
        `${indent}<a${attrs([
          ...base,
          ['href', safeHref(String(p.href))],
          ['target', p.newTab ? '_blank' : null],
          ['rel', p.newTab ? 'noopener' : null],
        ])}>${text('text')}</a>`,
      )
      break
    case 'list': {
      const tag = p.ordered ? 'ol' : 'ul'
      const items = String(p.items ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      out.push(`${indent}<${tag}${attrs(base)}>`)
      for (const it of items) out.push(`${inner}<li>${escapeHtml(interpolate(it, variables))}</li>`)
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
        ['id', `${node.id}-champ`],
        ['placeholder', node.type === 'select' ? null : String(p.placeholder ?? '')],
      ]
      if (node.type === 'input') {
        const type = ['text', 'email', 'number', 'password'].includes(String(p.inputType)) ? String(p.inputType) : 'text'
        out.push(`${inner}<input${attrs([['type', type], ...fieldAttrs, ['value', value]])}>`)
      } else if (node.type === 'textarea') {
        out.push(`${inner}<textarea${attrs(fieldAttrs)}>${escapeHtml(value)}</textarea>`)
      } else {
        const options = String(p.options ?? '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
        out.push(`${inner}<select${attrs(fieldAttrs)}>`)
        for (const o of options) {
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
      out.push(`${inner}<input type="checkbox"${attrs([['id', `${node.id}-champ`], ['checked', bound?.initial ? true : null]])}>`)
      out.push(`${inner}<span>${escapeHtml(String(p.label ?? ''))}</span>`)
      out.push(`${indent}</label>`)
      break
    }
    case 'image':
      out.push(
        `${indent}<img${attrs([...base, ['src', safeImageSrc(String(p.src)) ?? PLACEHOLDER_IMAGE], ['alt', String(p.alt ?? '')]])}>`,
      )
      break
    case 'divider':
      out.push(`${indent}<hr${attrs(base)}>`)
      break
    case 'spacer':
      out.push(`${indent}<div${attrs([...base, ['aria-hidden', 'true']])}></div>`)
      break
  }
  setRange(map, node.id, 'html', [start, out.line])
}

/* ---------------------------------- CSS ---------------------------------- */

function emitCss(project: Project, map: GeneratedCode['map']): string {
  const out = new Emitter()
  out.push('body { margin: 0; }')
  for (const l of BASE_CSS.trimEnd().split('\n')) out.push(l)
  out.push('')
  out.push('/* Styles de tes briques */')
  const visit = (id: string) => {
    const node = project.nodes[id]
    if (!node) return
    const entries = styleEntries(node)
    if (entries.length) {
      const start = out.line + 1
      out.push(`/* ${node.name.replace(/[*/<>]/g, '')} */`)
      out.push(`#${node.id} {`)
      for (const [k, v] of entries) out.push(`  ${k}: ${v};`)
      out.push('}')
      setRange(map, node.id, 'css', [start, out.line])
    }
    node.children.forEach(visit)
  }
  visit(project.rootId)
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
  return typeof v === 'string' ? jsString(v) : String(v)
}

/** « Bonjour {{prenom}} » → `Bonjour ${etat.prenom}` */
function jsTemplate(text: string, variables: Variable[]): string {
  const body = parseTemplate(text)
    .map((part) => {
      if (part.kind === 'var' && variables.some((v) => v.name === part.name)) return `\${etat.${part.name}}`
      return escapeTemplate(part.kind === 'var' ? `{{${part.name}}}` : part.value)
    })
    .join('')
  return '`' + body + '`'
}

function describeAction(a: Action, project: Project): string {
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
  }
}

export { describeAction }

function actionLines(a: Action, project: Project): { lines: string[]; changesState: boolean } {
  const vars = project.variables
  const find = (n: string) => vars.find((v) => v.name === n)
  const el = (id: string) => `document.getElementById(${jsString(id)})`
  const missingVar = (n: string) => ({ lines: [`// Action ignorée : la variable « ${n || '?'} » n'existe pas.`], changesState: false })
  const missingTarget = () => ({ lines: ['// Action ignorée : la brique visée n’existe plus.'], changesState: false })

  switch (a.type) {
    case 'set': {
      const v = find(a.variable)
      if (!v) return missingVar(a.variable)
      const value =
        v.kind === 'number'
          ? String(Number(a.value) || 0)
          : v.kind === 'boolean'
            ? String(a.value === 'true')
            : jsTemplate(a.value, vars)
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
      if (!project.nodes[a.target]) return missingTarget()
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
      return { lines: [`alert(${jsTemplate(a.message, vars)});`], changesState: false }
    case 'openUrl':
      return { lines: [`window.open(${jsString(safeHref(a.url))}, "_blank");`], changesState: false }
  }
}

function emitJs(project: Project, map: GeneratedCode['map']): string {
  const out = new Emitter()
  const { variables, nodes } = project
  const order: BrickNode[] = []
  const visit = (id: string) => {
    const n = nodes[id]
    if (!n) return
    order.push(n)
    n.children.forEach(visit)
  }
  visit(project.rootId)

  const known = (name: unknown) => typeof name === 'string' && variables.some((v) => v.name === name)
  const dynamicTexts = order.filter((n) =>
    DYNAMIC_KEYS.some((k) => typeof n.props[k] === 'string' && parseTemplate(String(n.props[k])).some((p) => p.kind === 'var' && known(p.name))),
  )
  const dynamicLists = order.filter(
    (n) => n.type === 'list' && parseTemplate(String(n.props.items ?? '')).some((p) => p.kind === 'var' && known(p.name)),
  )
  const conditional = order.filter((n) => known(n.showIf))
  const boundFields = order.filter((n) => ['input', 'textarea', 'select', 'checkbox'].includes(n.type) && known(n.props.bind))
  const clickable = order.filter((n) => n.onClick.length > 0)

  out.push('// Code généré par Ptt-Makers. Tu peux le lire, le copier et le modifier librement !')

  if (!variables.length && !clickable.length) {
    out.push('// Ce projet ne contient pas encore d’interactions.')
    out.push('// Ajoute une variable ou une action « Au clic » pour voir du JavaScript apparaître ici.')
    return out.toString()
  }

  out.push('')
  out.push("// 1. Les variables de l'application (son « état »)")
  if (variables.length) {
    out.push('const etat = {')
    for (const v of variables) out.push(`  ${v.name}: ${jsValue(v.initial)},`)
    out.push('};')
  } else {
    out.push('const etat = {};')
  }

  out.push('')
  out.push('// 2. Met à jour la page à partir des variables')
  out.push('function afficher() {')
  if (!dynamicTexts.length && !dynamicLists.length && !conditional.length && !boundFields.length) {
    out.push('  // Rien à mettre à jour pour le moment.')
  }
  for (const n of dynamicTexts) {
    out.push(`  document.getElementById(${jsString(n.id)}).textContent = ${jsTemplate(String(n.props.text), variables)};`)
  }
  for (const n of dynamicLists) {
    const items = String(n.props.items ?? '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    out.push(`  document.getElementById(${jsString(n.id)}).replaceChildren(`)
    out.push(`    ...[${items.map((i) => jsTemplate(i, variables)).join(', ')}].map((texte) => {`)
    out.push('      const element = document.createElement("li");')
    out.push('      element.textContent = texte;')
    out.push('      return element;')
    out.push('    }),')
    out.push('  );')
  }
  for (const n of conditional) {
    out.push(`  document.getElementById(${jsString(n.id)}).hidden = !etat.${n.showIf};`)
  }
  for (const n of boundFields) {
    const field = `document.getElementById(${jsString(`${n.id}-champ`)})`
    if (n.type === 'checkbox') out.push(`  ${field}.checked = Boolean(etat.${n.props.bind});`)
    else out.push(`  remplir(${jsString(`${n.id}-champ`)}, etat.${n.props.bind});`)
  }
  out.push('}')

  if (boundFields.some((n) => n.type !== 'checkbox')) {
    out.push('')
    out.push('// Remplit un champ sans déplacer le curseur pendant la saisie')
    out.push('function remplir(id, valeur) {')
    out.push('  const champ = document.getElementById(id);')
    out.push('  if (champ.value !== String(valeur)) champ.value = valeur;')
    out.push('}')
  }

  if (boundFields.length) {
    out.push('')
    out.push('// 3. Relie les champs de saisie aux variables')
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
      setRange(map, n.id, 'js', [start, out.line])
    }
  }

  if (clickable.length) {
    out.push('')
    out.push(`// ${boundFields.length ? '4' : '3'}. Réagit aux clics`)
    for (const n of clickable) {
      const start = out.line + 1
      out.push(`// ${commentName(n)} : ${n.onClick.map((a) => describeAction(a, project)).join(', ')}`)
      out.push(`document.getElementById(${jsString(n.id)}).addEventListener("click", () => {`)
      let changes = false
      for (const a of n.onClick) {
        const r = actionLines(a, project)
        changes ||= r.changesState
        for (const l of r.lines) out.push(`  ${l}`)
      }
      if (changes) out.push('  afficher();')
      out.push('});')
      setRange(map, n.id, 'js', [start, out.line])
    }
  }

  out.push('')
  out.push('// Premier affichage')
  out.push('afficher();')
  return out.toString()
}

/* -------------------------------- Ensemble ------------------------------- */

export function generate(project: Project): GeneratedCode {
  const map: GeneratedCode['map'] = {}
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
  emitNode(html, project, root, '  ', map)
  html.push('  <script src="script.js"></script>')
  html.push('</body>')
  html.push('</html>')

  const css = emitCss(project, map)
  const js = emitJs(project, map)
  return { html: html.toString(), css, js, map }
}

/** Fichier HTML unique (styles et script intégrés) : utilisé pour l'aperçu et l'export. */
export function bundle(code: GeneratedCode): string {
  const safeJs = code.js.replace(/<\/(script)/gi, '<\\/$1')
  return code.html
    .replace('  <link rel="stylesheet" href="style.css">', `  <style>\n${code.css}  </style>`)
    .replace('  <script src="script.js"></script>', `  <script>\n${safeJs}  </script>`)
}

export const brickLabel = (node: BrickNode) => BRICKS[node.type].label

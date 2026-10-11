import { forEachAction, forEachNodeAction, mapActions, mapNodeActions } from './actions'
import type { Nodes } from './tree'
import type { Action, AppFunction } from './types'

/** Propriétés qui contiennent directement un nom de variable. */
const VARIABLE_PROPS = new Set(['bind', 'source', 'search', 'paramVar', 'loginVar'])

/** Renomme une variable partout où elle est utilisée (textes {{…}}, liaisons, conditions, actions). */
export function renameVariableInNodes(nodes: Nodes, from: string, to: string): Nodes {
  const swap = (s: string) => renameInTemplates(s, from, to)
  const renameAction = variableRenamer(from, to)
  const out: Nodes = {}
  for (const [id, n] of Object.entries(nodes)) {
    const props = { ...n.props }
    for (const [k, v] of Object.entries(props)) {
      if (typeof v === 'string') props[k] = VARIABLE_PROPS.has(k) ? (v === from ? to : v) : swap(v)
    }
    out[id] = {
      ...mapNodeActions(n, renameAction),
      props,
      showIf: n.showIf === from ? to : n.showIf,
      disabledIf: n.disabledIf === from ? to : n.disabledIf,
    }
  }
  return out
}

/** Renomme une variable dans les fonctions réutilisables du projet. */
export function renameVariableInFunctions(functions: AppFunction[] | undefined, from: string, to: string): AppFunction[] | undefined {
  if (!functions) return functions
  const renameAction = variableRenamer(from, to)
  return functions.map((f) => ({ ...f, actions: mapActions(f.actions, renameAction) }))
}

/** Renomme une fonction dans toutes les actions « Lancer une fonction ». */
export function renameFunctionCalls<T extends Action>(actions: T[], from: string, to: string): Action[] {
  return mapActions(actions, (a) => (a.type === 'call' && a.name === from ? { ...a, name: to } : a))
}

function variableRenamer(from: string, to: string) {
  const swap = (s: string) => renameInTemplates(s, from, to)
  return (a: Action): Action => {
    let next = 'variable' in a && a.variable === from ? { ...a, variable: to } : a
    if (next.type === 'alert') next = { ...next, message: swap(next.message) }
    if (next.type === 'set' || next.type === 'listAdd' || next.type === 'if') next = { ...next, value: swap(next.value) }
    if (next.type === 'if' && next.more)
      next = { ...next, more: next.more.map((c) => ({ ...c, variable: c.variable === from ? to : c.variable, value: swap(c.value) })) }
    if (next.type === 'fetch')
      next = { ...next, url: swap(next.url), ...(next.headers ? { headers: swap(next.headers) } : {}), ...(next.body ? { body: swap(next.body) } : {}) }
    if (next.type === 'navigate' && next.value) next = { ...next, value: swap(next.value) }
    if (next.type === 'addRecord') next = { ...next, values: Object.fromEntries(Object.entries(next.values ?? {}).map(([k, v]) => [k, swap(v)])) }
    if (next.type === 'signup' || next.type === 'login') next = { ...next, email: swap(next.email), password: swap(next.password) }
    return next
  }
}

/** Un nom entier dans une formule : ni précédé d'un point (champ), ni suivi d'une lettre. */
const nameRe = (name: string) => new RegExp(`(^|[^A-Za-z0-9_.])${name}(?![A-Za-z0-9_])`, 'g')

/** Renomme une variable dans les {{…}} d'un texte, formules comprises ({{prix * quantite}}). */
export function renameInTemplates(text: string, from: string, to: string): string {
  return text.replace(/\{\{([^{}]+?)\}\}/g, (whole, inner: string) => {
    const re = nameRe(from)
    return re.test(inner) ? `{{${inner.replace(nameRe(from), (_m, before: string) => `${before}${to}`)}}}` : whole
  })
}

/** Le texte utilise-t-il la variable dans un {{…}} ? */
function usesInTemplates(text: string, name: string): boolean {
  return [...text.matchAll(/\{\{([^{}]+?)\}\}/g)].some((m) => nameRe(name).test(m[1]))
}

/** Nombre d'endroits où une variable est utilisée (pour prévenir avant suppression). */
export function countVariableUses(nodes: Nodes, name: string, functions?: AppFunction[]): number {
  const re = { test: (s: string) => usesInTemplates(s, name) }
  let count = 0
  const countAction = (a: Action) => {
    if ('variable' in a && a.variable === name) count++
    else if (a.type === 'alert' && re.test(a.message)) count++
    else if ((a.type === 'set' || a.type === 'listAdd' || a.type === 'if') && re.test(a.value)) count++
    else if (a.type === 'fetch' && [a.url, a.headers ?? '', a.body ?? ''].some((s) => re.test(s))) count++
    else if (a.type === 'if' && a.more?.some((c) => c.variable === name || re.test(c.value))) count++
    else if (a.type === 'navigate' && a.value && re.test(a.value)) count++
    else if (a.type === 'addRecord' && Object.values(a.values ?? {}).some((v) => re.test(v))) count++
    else if ((a.type === 'signup' || a.type === 'login') && (re.test(a.email) || re.test(a.password))) count++
  }
  for (const n of Object.values(nodes)) {
    for (const [k, v] of Object.entries(n.props)) {
      if (typeof v === 'string' && ((VARIABLE_PROPS.has(k) && v === name) || re.test(v))) count++
    }
    if (n.showIf === name) count++
    if (n.disabledIf === name) count++
    forEachNodeAction(n, countAction)
  }
  for (const f of functions ?? []) forEachAction(f.actions, countAction)
  return count
}

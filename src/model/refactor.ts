import { forEachAction, mapActions } from './actions'
import type { Nodes } from './tree'
import type { Action } from './types'

/** Propriétés qui contiennent directement un nom de variable. */
const VARIABLE_PROPS = new Set(['bind', 'source'])

/** Renomme une variable partout où elle est utilisée (textes {{…}}, liaisons, conditions, actions). */
export function renameVariableInNodes(nodes: Nodes, from: string, to: string): Nodes {
  const re = new RegExp(`\\{\\{\\s*${from}\\s*\\}\\}`, 'g')
  const swap = (s: string) => s.replace(re, `{{${to}}}`)
  const renameAction = (a: Action): Action => {
    let next = 'variable' in a && a.variable === from ? { ...a, variable: to } : a
    if (next.type === 'alert') next = { ...next, message: swap(next.message) }
    if (next.type === 'set' || next.type === 'listAdd' || next.type === 'if') next = { ...next, value: swap(next.value) }
    if (next.type === 'fetch') next = { ...next, url: swap(next.url) }
    return next
  }
  const out: Nodes = {}
  for (const [id, n] of Object.entries(nodes)) {
    const props = { ...n.props }
    for (const [k, v] of Object.entries(props)) {
      if (typeof v === 'string') props[k] = VARIABLE_PROPS.has(k) ? (v === from ? to : v) : swap(v)
    }
    out[id] = {
      ...n,
      props,
      showIf: n.showIf === from ? to : n.showIf,
      onClick: mapActions(n.onClick, renameAction),
      ...(n.onLoad ? { onLoad: mapActions(n.onLoad, renameAction) } : {}),
    }
  }
  return out
}

/** Nombre d'endroits où une variable est utilisée (pour prévenir avant suppression). */
export function countVariableUses(nodes: Nodes, name: string): number {
  const re = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`)
  let count = 0
  const countAction = (a: Action) => {
    if ('variable' in a && a.variable === name) count++
    else if (a.type === 'alert' && re.test(a.message)) count++
    else if ((a.type === 'set' || a.type === 'listAdd' || a.type === 'if') && re.test(a.value)) count++
    else if (a.type === 'fetch' && re.test(a.url)) count++
  }
  for (const n of Object.values(nodes)) {
    for (const [k, v] of Object.entries(n.props)) {
      if (typeof v === 'string' && ((VARIABLE_PROPS.has(k) && v === name) || re.test(v))) count++
    }
    if (n.showIf === name) count++
    forEachAction(n.onClick, countAction)
    if (n.onLoad) forEachAction(n.onLoad, countAction)
  }
  return count
}

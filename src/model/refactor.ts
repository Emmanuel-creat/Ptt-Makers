import type { Nodes } from './tree'

/** Renomme une variable partout où elle est utilisée (textes {{…}}, liaisons, conditions, actions). */
export function renameVariableInNodes(nodes: Nodes, from: string, to: string): Nodes {
  const re = new RegExp(`\\{\\{\\s*${from}\\s*\\}\\}`, 'g')
  const out: Nodes = {}
  for (const [id, n] of Object.entries(nodes)) {
    const props = { ...n.props }
    for (const [k, v] of Object.entries(props)) {
      if (typeof v === 'string') props[k] = k === 'bind' && v === from ? to : v.replace(re, `{{${to}}}`)
    }
    out[id] = {
      ...n,
      props,
      showIf: n.showIf === from ? to : n.showIf,
      onClick: n.onClick.map((a) => {
        if ('variable' in a && a.variable === from) return { ...a, variable: to }
        if (a.type === 'alert') return { ...a, message: a.message.replace(re, `{{${to}}}`) }
        if (a.type === 'set') return { ...a, value: a.value.replace(re, `{{${to}}}`) }
        return a
      }),
    }
  }
  return out
}

/** Nombre d'endroits où une variable est utilisée (pour prévenir avant suppression). */
export function countVariableUses(nodes: Nodes, name: string): number {
  const re = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`)
  let count = 0
  for (const n of Object.values(nodes)) {
    for (const [k, v] of Object.entries(n.props)) {
      if (typeof v === 'string' && ((k === 'bind' && v === name) || re.test(v))) count++
    }
    if (n.showIf === name) count++
    for (const a of n.onClick) {
      if ('variable' in a && a.variable === name) count++
      else if (a.type === 'alert' && re.test(a.message)) count++
    }
  }
  return count
}

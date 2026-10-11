import type { Action, AppFunction, BrickNode, BrickType, EventField } from './types'

/** Tous les événements qui peuvent lancer des actions. */
export const EVENT_FIELDS: EventField[] = ['onClick', 'onLoad', 'onHover', 'onInput', 'onChange', 'onKey', 'onTimer', 'onSubmit']

export const FIELD_TYPES: BrickType[] = ['input', 'textarea', 'select', 'checkbox']

/** Les événements proposés pour une brique, dans l'ordre d'affichage. */
export function eventsFor(type: BrickType): EventField[] {
  if (type === 'page') return ['onLoad', 'onTimer']
  if (type === 'form') return ['onSubmit', 'onHover']
  if (FIELD_TYPES.includes(type)) return ['onChange', 'onInput', 'onKey', 'onClick', 'onHover']
  return ['onClick', 'onHover']
}

/** Applique `fn` à toutes les listes d'actions d'une brique (celles qui existent). */
export function mapNodeActions(node: BrickNode, fn: (a: Action) => Action): BrickNode {
  const out: BrickNode = { ...node, onClick: mapActions(node.onClick ?? [], fn) }
  for (const f of EVENT_FIELDS) if (f !== 'onClick' && node[f]) out[f] = mapActions(node[f]!, fn)
  return out
}

/** Parcourt toutes les actions d'une brique, tous événements confondus. */
export function forEachNodeAction(node: BrickNode, fn: (a: Action, field: EventField) => void) {
  for (const f of EVENT_FIELDS) if (node[f]) forEachAction(node[f]!, (a) => fn(a, f))
}

/** Applique `fn` à chaque action, y compris celles rangées dans « alors » / « sinon » d'une condition. */
export function mapActions(actions: Action[], fn: (a: Action) => Action): Action[] {
  return actions.map((a) => {
    const next = fn(a)
    if (next.type === 'if') return { ...next, then: mapActions(next.then, fn), else: mapActions(next.else, fn) }
    return next
  })
}

/** Parcourt toutes les actions, conditions comprises. */
export function forEachAction(actions: Action[], fn: (a: Action) => void) {
  for (const a of actions) {
    fn(a)
    if (a.type === 'if') {
      forEachAction(a.then, fn)
      forEachAction(a.else, fn)
    }
  }
}

/** Nombre total d'actions (conditions comprises). */
export function countActions(actions: Action[] | undefined): number {
  let n = 0
  if (actions) forEachAction(actions, () => n++)
  return n
}

/** Actions qui lisent ou modifient une variable. */
export const actionVariable = (a: Action): string | null => ('variable' in a ? a.variable : null)

/** Lignes « nom: valeur » (en-têtes et corps d'un appel d'API). Une ligne sans « : » garde une clé vide. */
export function linePairs(text: string | undefined): { key: string; value: string; line: string }[] {
  return (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf(':')
      return i <= 0 ? { key: '', value: '', line } : { key: line.slice(0, i).trim(), value: line.slice(i + 1).trim(), line }
    })
}

/** Fonctions qui finissent par s'appeler elles-mêmes (directement ou par une autre) : elles tourneraient sans fin. */
export function loopingFunctions(functions: AppFunction[] | undefined): Set<string> {
  const calls = new Map<string, string[]>()
  for (const f of functions ?? []) {
    const names: string[] = []
    forEachAction(f.actions, (a) => {
      if (a.type === 'call') names.push(a.name)
    })
    calls.set(f.name, names)
  }
  const looping = new Set<string>()
  for (const start of calls.keys()) {
    const seen = new Set<string>()
    const stack = [...(calls.get(start) ?? [])]
    while (stack.length) {
      const n = stack.pop()!
      if (n === start) {
        looping.add(start)
        break
      }
      if (seen.has(n)) continue
      seen.add(n)
      stack.push(...(calls.get(n) ?? []))
    }
  }
  return looping
}

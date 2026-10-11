import type { Action } from './types'

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

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { walk } from '../model/tree'
import type { Action, ActionType } from '../model/types'
import { useEditor } from '../store/editor'
import { NumberInput, SelectInput, TextInput, VariableSelect } from './fields'
import { IconButton } from './ui'

export const ACTION_LABELS: Record<ActionType, string> = {
  set: 'Donner une valeur à une variable',
  add: 'Ajouter un nombre à une variable',
  toggleVar: 'Inverser une variable vrai/faux',
  show: 'Afficher une brique',
  hide: 'Masquer une brique',
  toggle: 'Afficher ou masquer une brique',
  scrollTo: "Faire défiler jusqu'à une brique",
  alert: 'Afficher un message',
  openUrl: 'Ouvrir un lien',
}

function defaultAction(type: ActionType, firstVar: string, selfId: string): Action {
  switch (type) {
    case 'set':
      return { type, variable: firstVar, value: '' }
    case 'add':
      return { type, variable: firstVar, amount: 1 }
    case 'toggleVar':
      return { type, variable: firstVar }
    case 'alert':
      return { type, message: 'Bravo !' }
    case 'openUrl':
      return { type, url: 'https://' }
    default:
      return { type, target: selfId }
  }
}

/** Éditeur des actions « Au clic » d'une brique, en langage naturel. */
export function ActionsEditor({ id }: { id: string }) {
  const actions = useEditor((s) => s.project.nodes[id]?.onClick ?? [])
  const variables = useEditor((s) => s.project.variables)
  const nodes = useEditor((s) => s.project.nodes)
  const rootId = useEditor((s) => s.project.rootId)
  const setActions = useEditor((s) => s.setActions)

  const targets: { value: string; label: string }[] = []
  walk(nodes, rootId, (n, depth) => {
    if (n.parent) targets.push({ value: n.id, label: `${'  '.repeat(Math.max(0, depth - 1))}${n.name}` })
  })

  const update = (i: number, a: Action) => setActions(id, actions.map((x, j) => (j === i ? a : x)))
  const move = (i: number, d: -1 | 1) => {
    const next = [...actions]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    setActions(id, next)
  }

  return (
    <div className="pm-actions">
      {actions.length > 0 && <p className="pm-actions-when">Quand on clique sur cette brique :</p>}
      <ol className="pm-action-list">
        {actions.map((a, i) => (
          <li key={i} className="pm-action">
            <div className="pm-action-head">
              <span className="pm-action-num">{i + 1}</span>
              <SelectInput
                value={a.type}
                options={Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }))}
                onChange={(t) => update(i, defaultAction(t as ActionType, variables[0]?.name ?? '', id))}
              />
              <div className="pm-action-tools">
                <IconButton label="Monter" className="pm-icon-btn-sm" tipSide="top" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp size={13} />
                </IconButton>
                <IconButton
                  label="Descendre"
                  className="pm-icon-btn-sm"
                  tipSide="top"
                  disabled={i === actions.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={13} />
                </IconButton>
                <IconButton
                  label="Supprimer l'action"
                  className="pm-icon-btn-sm is-danger"
                  tipSide="top"
                  onClick={() => setActions(id, actions.filter((_, j) => j !== i))}
                >
                  <Trash2 size={13} />
                </IconButton>
              </div>
            </div>
            <div className="pm-action-body">
              {(a.type === 'set' || a.type === 'add' || a.type === 'toggleVar') && (
                <VariableSelect
                  value={a.variable}
                  kinds={a.type === 'add' ? ['number'] : a.type === 'toggleVar' ? ['boolean'] : undefined}
                  placeholder="Choisir une variable…"
                  onChange={(variable) => update(i, { ...a, variable })}
                />
              )}
              {a.type === 'set' && <SetValue action={a} onChange={(value) => update(i, { ...a, value })} />}
              {a.type === 'add' && (
                <div className="pm-inline">
                  <span>de</span>
                  <NumberInput value={a.amount} unit="" min={-100000} max={100000} placeholder="1" onChange={(v) => update(i, { ...a, amount: v ?? 0 })} />
                  <span className="pm-muted">(négatif pour retirer)</span>
                </div>
              )}
              {(a.type === 'show' || a.type === 'hide' || a.type === 'toggle' || a.type === 'scrollTo') && (
                <SelectInput value={a.target} options={targets} placeholder="Choisir une brique…" onChange={(target) => update(i, { ...a, target })} />
              )}
              {a.type === 'alert' && <TextInput value={a.message} dynamic onChange={(message) => update(i, { ...a, message })} />}
              {a.type === 'openUrl' && <TextInput value={a.url} placeholder="https://…" onChange={(url) => update(i, { ...a, url })} />}
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="pm-btn pm-btn-dashed"
        onClick={() => setActions(id, [...actions, defaultAction(variables.length ? 'add' : 'alert', variables.find((v) => v.kind === 'number')?.name ?? variables[0]?.name ?? '', id)])}
      >
        <Plus size={15} /> Ajouter une action au clic
      </button>
    </div>
  )
}

function SetValue({ action, onChange }: { action: Extract<Action, { type: 'set' }>; onChange: (v: string) => void }) {
  const variable = useEditor((s) => s.project.variables.find((v) => v.name === action.variable))
  if (variable?.kind === 'boolean') {
    return (
      <SelectInput
        value={action.value === 'true' ? 'true' : 'false'}
        options={[
          { value: 'true', label: 'Vrai' },
          { value: 'false', label: 'Faux' },
        ]}
        onChange={onChange}
      />
    )
  }
  return (
    <div className="pm-inline">
      <span>à</span>
      <TextInput value={action.value} dynamic={variable?.kind !== 'number'} placeholder={variable?.kind === 'number' ? '0' : 'texte'} onChange={onChange} />
    </div>
  )
}

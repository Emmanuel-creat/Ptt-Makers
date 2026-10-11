import { ArrowDown, ArrowUp, CornerDownRight, Plus, Trash2 } from 'lucide-react'
import { countActions } from '../model/actions'
import { FIELD_TYPE_LABEL, fieldsOf, isCollection } from '../model/collections'
import { repeatOf, walk } from '../model/tree'
import type { Action, ActionType, ConditionOp, VariableKind } from '../model/types'
import { useEditor } from '../store/editor'
import { NumberInput, SelectInput, TextInput, VariableSelect } from './fields'
import { IconButton } from './ui'

export const ACTION_LABELS: Record<ActionType, string> = {
  set: 'Donner une valeur à une variable',
  add: 'Ajouter un nombre à une variable',
  toggleVar: 'Inverser une variable vrai/faux',
  listAdd: 'Ajouter un élément à une liste',
  listRemove: "Retirer un élément d'une liste",
  listClear: 'Vider une liste',
  if: 'Si… alors… sinon…',
  navigate: 'Aller sur une page',
  show: 'Afficher une brique',
  hide: 'Masquer une brique',
  toggle: 'Afficher ou masquer une brique',
  scrollTo: "Faire défiler jusqu'à une brique",
  alert: 'Afficher un message',
  openUrl: 'Ouvrir un lien',
  fetch: 'Charger des données (API)',
  addRecord: 'Ajouter une fiche à une collection',
  validate: 'Vérifier un formulaire',
  wait: 'Attendre',
}

const ACTION_GROUPS: { label: string; types: ActionType[] }[] = [
  { label: 'Variables', types: ['set', 'add', 'toggleVar'] },
  { label: 'Listes et collections', types: ['listAdd', 'addRecord', 'listRemove', 'listClear'] },
  { label: 'Logique', types: ['if', 'validate', 'wait'] },
  { label: 'Pages et briques', types: ['navigate', 'show', 'hide', 'toggle', 'scrollTo'] },
  { label: 'Autres', types: ['alert', 'openUrl', 'fetch'] },
]

const CONDITION_OPS: { value: ConditionOp; label: string; needsValue?: boolean }[] = [
  { value: 'true', label: 'est vrai / non vide' },
  { value: 'false', label: 'est faux / vide' },
  { value: 'eq', label: 'est égal à', needsValue: true },
  { value: 'neq', label: 'est différent de', needsValue: true },
  { value: 'gt', label: 'est plus grand que', needsValue: true },
  { value: 'lt', label: 'est plus petit que', needsValue: true },
  { value: 'empty', label: 'est vide' },
  { value: 'notEmpty', label: "n'est pas vide" },
]

const NO_ACTIONS: Action[] = []

/** Ce que l'éditeur doit savoir de l'endroit où se trouvent les actions. */
interface Ctx {
  selfId: string
  /** Les actions sont dans une copie de répétition : {{element}} et « cet élément » sont disponibles. */
  inRepeat: boolean
  firstVar: (kinds?: VariableKind[]) => string
  firstPage: string
  /** La brique qui contient celle-ci : le formulaire à vérifier, le plus souvent. */
  parentId: string
}

function defaultAction(type: ActionType, ctx: Ctx): Action {
  switch (type) {
    case 'set':
      return { type, variable: ctx.firstVar(['text', 'number', 'boolean']), value: '' }
    case 'add':
      return { type, variable: ctx.firstVar(['number']), amount: 1 }
    case 'toggleVar':
      return { type, variable: ctx.firstVar(['boolean']) }
    case 'listAdd':
      return { type, variable: ctx.firstVar(['list']), value: '' }
    case 'listRemove':
      return { type, variable: ctx.firstVar(['list', 'collection']), which: ctx.inRepeat ? 'current' : 'last' }
    case 'listClear':
      return { type, variable: ctx.firstVar(['list', 'collection']) }
    case 'addRecord':
      return { type, variable: ctx.firstVar(['collection']), values: {} }
    case 'if':
      return { type, variable: ctx.firstVar(), op: 'true', value: '', then: [], else: [] }
    case 'navigate':
      return { type, page: ctx.firstPage }
    case 'alert':
      return { type, message: 'Bravo !' }
    case 'openUrl':
      return { type, url: 'https://' }
    case 'fetch':
      return { type, url: 'https://', variable: ctx.firstVar(['list']), path: '' }
    case 'validate':
      return { type, target: ctx.parentId }
    case 'wait':
      return { type, ms: 1000 }
    default:
      return { type, target: ctx.selfId }
  }
}

/** Éditeur des actions d'une brique (« Au clic ») ou d'une page (« Au chargement »), en langage naturel. */
export function ActionsEditor({ id, field = 'onClick' }: { id: string; field?: 'onClick' | 'onLoad' }) {
  const actions = useEditor((s) => s.project.nodes[id]?.[field] ?? NO_ACTIONS)
  const variables = useEditor((s) => s.project.variables)
  const pages = useEditor((s) => s.project.pages)
  const inRepeat = useEditor((s) => repeatOf(s.project.nodes, id) != null)
  const parentId = useEditor((s) => s.project.nodes[id]?.parent ?? id)
  const setActions = useEditor((s) => s.setActions)
  const ctx: Ctx = {
    selfId: id,
    inRepeat,
    firstVar: (kinds) => (kinds ? variables.find((v) => kinds.includes(v.kind)) : variables[0])?.name ?? '',
    firstPage: pages.find((p) => p !== id) ?? pages[0],
    parentId,
  }
  const onChange = (next: Action[]) => setActions(id, next, field)
  const firstKind = variables.find((v) => v.kind === 'number') ? 'add' : variables.length ? 'set' : 'alert'

  return (
    <div className="pm-actions">
      {actions.length > 0 && (
        <p className="pm-actions-when">{field === 'onLoad' ? 'Quand la page s’affiche :' : 'Quand on clique sur cette brique :'}</p>
      )}
      <ActionList actions={actions} onChange={onChange} ctx={ctx} />
      <button type="button" className="pm-btn pm-btn-dashed" onClick={() => onChange([...actions, defaultAction(field === 'onLoad' ? 'fetch' : firstKind, ctx)])}>
        <Plus size={15} /> {field === 'onLoad' ? 'Ajouter une action au chargement' : 'Ajouter une action au clic'}
      </button>
    </div>
  )
}

function ActionList({ actions, onChange, ctx }: { actions: Action[]; onChange: (a: Action[]) => void; ctx: Ctx }) {
  const update = (i: number, a: Action) => onChange(actions.map((x, j) => (j === i ? a : x)))
  const move = (i: number, d: -1 | 1) => {
    const next = [...actions]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }
  return (
    <ol className="pm-action-list">
      {actions.map((a, i) => (
        <li key={i} className={`pm-action ${a.type === 'if' ? 'is-if' : ''}`}>
          <div className="pm-action-head">
            <span className="pm-action-num">{i + 1}</span>
            <select className="pm-input" aria-label="Type d'action" value={a.type} onChange={(e) => update(i, defaultAction(e.target.value as ActionType, ctx))}>
              {ACTION_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.types.map((t) => (
                    <option key={t} value={t}>
                      {ACTION_LABELS[t]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="pm-action-tools">
              <IconButton label="Monter" className="pm-icon-btn-sm" tipSide="top" disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp size={13} />
              </IconButton>
              <IconButton label="Descendre" className="pm-icon-btn-sm" tipSide="top" disabled={i === actions.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown size={13} />
              </IconButton>
              <IconButton
                label="Supprimer l'action"
                className="pm-icon-btn-sm is-danger"
                tipSide="top"
                onClick={() => onChange(actions.filter((_, j) => j !== i))}
              >
                <Trash2 size={13} />
              </IconButton>
            </div>
          </div>
          <div className="pm-action-body">
            <ActionFields action={a} onChange={(next) => update(i, next)} ctx={ctx} />
          </div>
        </li>
      ))}
    </ol>
  )
}

function ActionFields({ action: a, onChange, ctx }: { action: Action; onChange: (a: Action) => void; ctx: Ctx }) {
  switch (a.type) {
    case 'set':
    case 'add':
    case 'toggleVar':
      return (
        <>
          <VariableSelect
            value={a.variable}
            kinds={a.type === 'add' ? ['number'] : a.type === 'toggleVar' ? ['boolean'] : ['text', 'number', 'boolean']}
            placeholder="Choisir une variable…"
            onChange={(variable) => onChange({ ...a, variable })}
          />
          {a.type === 'set' && <SetValue action={a} onChange={(value) => onChange({ ...a, value })} />}
          {a.type === 'add' && (
            <div className="pm-inline">
              <span>de</span>
              <NumberInput value={a.amount} unit="" min={-100000} max={100000} placeholder="1" onChange={(v) => onChange({ ...a, amount: v ?? 0 })} />
              <span className="pm-muted">(négatif pour retirer)</span>
            </div>
          )}
        </>
      )
    case 'listAdd':
    case 'listRemove':
    case 'listClear':
      return (
        <>
          <VariableSelect
            value={a.variable}
            kinds={a.type === 'listAdd' ? ['list'] : ['list', 'collection']}
            placeholder="Choisir une liste…"
            onChange={(variable) => onChange({ ...a, variable })}
          />
          {a.type === 'listAdd' && (
            <div className="pm-inline">
              <span>valeur</span>
              <TextInput value={a.value} dynamic placeholder="{{nouvelle}}" onChange={(value) => onChange({ ...a, value })} />
            </div>
          )}
          {a.type === 'listRemove' && (
            <SelectInput
              value={a.which}
              onChange={(which) => onChange({ ...a, which: which as typeof a.which })}
              options={[
                ...(ctx.inRepeat ? [{ value: 'current', label: "L'élément de cette copie" }] : []),
                { value: 'first', label: 'Le premier élément' },
                { value: 'last', label: 'Le dernier élément' },
              ]}
            />
          )}
        </>
      )
    case 'addRecord':
      return <AddRecordFields action={a} onChange={onChange} />
    case 'if':
      return <IfFields action={a} onChange={onChange} ctx={ctx} />
    case 'navigate':
      return (
        <>
          <PageSelect value={a.page} onChange={(page) => onChange({ ...a, page })} />
          <div className="pm-inline">
            <span>en envoyant</span>
            <TextInput
              value={a.value ?? ''}
              dynamic
              placeholder={ctx.inRepeat ? '(facultatif) {{element.nom}}' : '(facultatif) {{choix}}'}
              onChange={(value) => onChange({ ...a, value })}
            />
          </div>
          {a.value?.trim() && <p className="pm-row-help">La page reçoit cette valeur dans la variable choisie dans ses propriétés (« Valeur reçue dans la variable »).</p>}
        </>
      )
    case 'validate':
      return (
        <>
          <TargetSelect value={a.target} onChange={(target) => onChange({ ...a, target })} />
          <p className="pm-row-help">
            Vérifie les champs de cette brique (obligatoire, longueur, e-mail, nombre). S’il y a une erreur, elle s’affiche sous le champ et les actions
            suivantes ne sont pas faites.
          </p>
        </>
      )
    case 'wait':
      return (
        <div className="pm-inline">
          <NumberInput value={a.ms} unit="ms" min={0} max={600000} placeholder="1000" onChange={(v) => onChange({ ...a, ms: v ?? 0 })} />
          <span className="pm-muted">puis les actions suivantes</span>
        </div>
      )
    case 'show':
    case 'hide':
    case 'toggle':
    case 'scrollTo':
      return <TargetSelect value={a.target} onChange={(target) => onChange({ ...a, target })} />
    case 'alert':
      return <TextInput value={a.message} dynamic onChange={(message) => onChange({ ...a, message })} />
    case 'openUrl':
      return <TextInput value={a.url} placeholder="https://…" onChange={(url) => onChange({ ...a, url })} />
    case 'fetch':
      return (
        <>
          <TextInput value={a.url} dynamic placeholder="https://api.exemple.com/donnees" onChange={(url) => onChange({ ...a, url })} />
          <div className="pm-inline">
            <span>dans</span>
            <VariableSelect value={a.variable} placeholder="Choisir une variable…" onChange={(variable) => onChange({ ...a, variable })} />
          </div>
          <div className="pm-inline">
            <span>chemin</span>
            <TextInput value={a.path} placeholder="(facultatif) ex. results" onChange={(path) => onChange({ ...a, path })} />
          </div>
          <p className="pm-row-help">
            L’adresse doit renvoyer du JSON. Le chemin choisit une partie de la réponse (ex. <code>data.items</code>). Dans une liste, chaque
            élément s’affiche avec <code>{'{{element.nom}}'}</code>.
          </p>
        </>
      )
  }
}

function AddRecordFields({ action: a, onChange }: { action: Extract<Action, { type: 'addRecord' }>; onChange: (a: Action) => void }) {
  const variable = useEditor((s) => s.project.variables.find((v) => v.name === a.variable))
  const fields = variable && isCollection(variable) ? fieldsOf(variable).filter((f) => f.type !== 'formula') : []
  return (
    <>
      <VariableSelect value={a.variable} kinds={['collection']} placeholder="Choisir une collection…" onChange={(v) => onChange({ ...a, variable: v })} />
      {fields.map((f) => (
        <div key={f.name} className="pm-inline pm-record-value">
          <span title={FIELD_TYPE_LABEL[f.type]}>{f.label}</span>
          <TextInput
            value={a.values?.[f.name] ?? ''}
            dynamic
            placeholder={`{{${a.variable}_${f.name}}}`}
            onChange={(value) => onChange({ ...a, values: { ...a.values, [f.name]: value } })}
          />
        </div>
      ))}
      {fields.length > 0 && (
        <p className="pm-row-help">
          Écris une valeur ou une variable reliée à un champ de saisie, par exemple <code>{'{{nom_saisi}}'}</code>.
        </p>
      )}
    </>
  )
}

function IfFields({ action: a, onChange, ctx }: { action: Extract<Action, { type: 'if' }>; onChange: (a: Action) => void; ctx: Ctx }) {
  const variable = useEditor((s) => s.project.variables.find((v) => v.name === a.variable))
  const op = CONDITION_OPS.find((o) => o.value === a.op)
  return (
    <>
      <div className="pm-inline">
        <span>si</span>
        <VariableSelect value={a.variable} placeholder="Choisir une variable…" onChange={(v) => onChange({ ...a, variable: v })} />
      </div>
      <SelectInput value={a.op} options={CONDITION_OPS} onChange={(v) => onChange({ ...a, op: v as ConditionOp })} />
      {op?.needsValue &&
        (variable?.kind === 'boolean' ? (
          <SelectInput
            value={a.value === 'true' ? 'true' : 'false'}
            options={[
              { value: 'true', label: 'Vrai' },
              { value: 'false', label: 'Faux' },
            ]}
            onChange={(value) => onChange({ ...a, value })}
          />
        ) : (
          <TextInput
            value={a.value}
            placeholder={variable?.kind === 'text' && !['gt', 'lt'].includes(a.op) ? 'texte' : variable?.kind === 'list' ? 'nombre d’éléments' : '0'}
            onChange={(value) => onChange({ ...a, value })}
          />
        ))}
      <Branch label="Alors" actions={a.then} onChange={(then) => onChange({ ...a, then })} ctx={ctx} />
      <Branch label="Sinon" actions={a.else} onChange={(els) => onChange({ ...a, else: els })} ctx={ctx} />
    </>
  )
}

function Branch({ label, actions, onChange, ctx }: { label: string; actions: Action[]; onChange: (a: Action[]) => void; ctx: Ctx }) {
  return (
    <div className="pm-branch">
      <p className="pm-branch-label">
        <CornerDownRight size={13} aria-hidden="true" /> {label}
        {actions.length > 0 && <span className="pm-muted"> · {countActions(actions)} action(s)</span>}
      </p>
      <ActionList actions={actions} onChange={onChange} ctx={ctx} />
      <button type="button" className="pm-btn pm-btn-dashed pm-btn-sm" onClick={() => onChange([...actions, defaultAction('alert', ctx)])}>
        <Plus size={13} /> Action
      </button>
    </div>
  )
}

export function PageSelect({ id, value, onChange, placeholder }: { id?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const pages = useEditor((s) => s.project.pages)
  const nodes = useEditor((s) => s.project.nodes)
  return (
    <SelectInput
      id={id}
      value={value}
      placeholder={placeholder ?? 'Choisir une page…'}
      options={pages.map((p) => ({ value: p, label: nodes[p]?.name ?? p }))}
      onChange={onChange}
    />
  )
}

function TargetSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const nodes = useEditor((s) => s.project.nodes)
  const pages = useEditor((s) => s.project.pages)
  return (
    <select className="pm-input" aria-label="Brique visée" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choisir une brique…</option>
      {pages.map((p) => {
        const items: { value: string; label: string }[] = []
        walk(nodes, p, (n, depth) => {
          if (n.parent) items.push({ value: n.id, label: `${'  '.repeat(Math.max(0, depth - 1))}${n.name}` })
        })
        return (
          <optgroup key={p} label={nodes[p]?.name ?? p}>
            {items.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </optgroup>
        )
      })}
    </select>
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

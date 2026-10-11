import { ArrowDown, ArrowUp, CornerDownRight, Plus, Trash2 } from 'lucide-react'
import { countActions, eventsFor } from '../model/actions'
import { FIELD_TYPE_LABEL, fieldsOf, isCollection } from '../model/collections'
import { repeatOf, walk } from '../model/tree'
import { useState } from 'react'
import { HTTP_METHODS, type Action, type ActionType, type AppFunction, type Condition, type ConditionOp, type EventField, type HttpMethod, type VariableKind } from '../model/types'
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
  fetch: 'Appeler une API (charger ou envoyer)',
  addRecord: 'Ajouter une fiche à une collection',
  validate: 'Vérifier un formulaire',
  wait: 'Attendre',
  signup: 'Créer un compte',
  login: 'Se connecter',
  logout: 'Se déconnecter',
  call: 'Lancer une fonction',
}

const ACTION_GROUPS: { label: string; types: ActionType[] }[] = [
  { label: 'Variables', types: ['set', 'add', 'toggleVar'] },
  { label: 'Listes et collections', types: ['listAdd', 'addRecord', 'listRemove', 'listClear'] },
  { label: 'Logique', types: ['if', 'call', 'validate', 'wait'] },
  { label: 'Pages et briques', types: ['navigate', 'show', 'hide', 'toggle', 'scrollTo'] },
  { label: 'Comptes', types: ['signup', 'login', 'logout'] },
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
const NO_FUNCTIONS: AppFunction[] = []

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
    case 'signup':
    case 'login':
      return { type, variable: ctx.firstVar(['text']), email: '', password: '' }
    case 'logout':
      return { type, variable: ctx.firstVar(['text']) }
    case 'call':
      return { type, name: useEditor.getState().project.functions?.[0]?.name ?? '' }
    default:
      return { type, target: ctx.selfId }
  }
}

/** Ce que dit chaque événement, dans l'éditeur. */
export const EVENT_LABELS: Record<EventField, { tab: string; when: string; add: string }> = {
  onClick: { tab: 'Clic', when: 'Quand on clique sur cette brique :', add: 'Ajouter une action au clic' },
  onLoad: { tab: 'Chargement', when: 'Quand la page s’affiche :', add: 'Ajouter une action au chargement' },
  onHover: { tab: 'Survol', when: 'Quand la souris arrive sur cette brique :', add: 'Ajouter une action au survol' },
  onInput: { tab: 'Saisie', when: 'À chaque lettre tapée :', add: 'Ajouter une action à la saisie' },
  onChange: { tab: 'Changement', when: 'Quand la valeur est validée :', add: 'Ajouter une action au changement' },
  onKey: { tab: 'Touche', when: 'Quand on appuie sur la touche choisie :', add: 'Ajouter une action à la touche' },
  onTimer: { tab: 'Minuterie', when: 'À chaque tour de la minuterie :', add: 'Ajouter une action à la minuterie' },
}

export const EVENT_KEYS = [
  { value: 'Enter', label: 'Entrée' },
  { value: 'Escape', label: 'Échap' },
  { value: 'ArrowUp', label: 'Flèche haut' },
  { value: 'ArrowDown', label: 'Flèche bas' },
  { value: ' ', label: 'Espace' },
]

/** Éditeur des actions d'une brique pour un événement (clic, survol, saisie...) ou d'une page (chargement, minuterie), en langage naturel. */
export function ActionsEditor({ id, field = 'onClick' }: { id: string; field?: EventField }) {
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
  const label = EVENT_LABELS[field]

  return (
    <div className="pm-actions">
      {actions.length > 0 && <p className="pm-actions-when">{label.when}</p>}
      <ActionList actions={actions} onChange={onChange} ctx={ctx} />
      <button type="button" className="pm-btn pm-btn-dashed" onClick={() => onChange([...actions, defaultAction(field === 'onLoad' ? 'fetch' : firstKind, ctx)])}>
        <Plus size={15} /> {label.add}
      </button>
    </div>
  )
}

/** Actions d'une fonction réutilisable (panneau Variables). */
export function FunctionActionsEditor({ name }: { name: string }) {
  const actions = useEditor((s) => s.project.functions?.find((f) => f.name === name)?.actions ?? NO_ACTIONS)
  const variables = useEditor((s) => s.project.variables)
  const pages = useEditor((s) => s.project.pages)
  const page = useEditor((s) => s.currentPage)
  const setFunctionActions = useEditor((s) => s.setFunctionActions)
  const ctx: Ctx = {
    selfId: page,
    inRepeat: false,
    firstVar: (kinds) => (kinds ? variables.find((v) => kinds.includes(v.kind)) : variables[0])?.name ?? '',
    firstPage: pages.find((p) => p !== page) ?? pages[0],
    parentId: page,
  }
  const onChange = (next: Action[]) => setFunctionActions(name, next)
  return (
    <div className="pm-actions">
      <ActionList actions={actions} onChange={onChange} ctx={ctx} />
      <button type="button" className="pm-btn pm-btn-dashed pm-btn-sm" onClick={() => onChange([...actions, defaultAction(variables.length ? 'set' : 'alert', ctx)])}>
        <Plus size={13} /> Action
      </button>
    </div>
  )
}

/** Choix de l'événement (clic, survol, saisie, touche...) puis ses actions. */
export function EventsEditor({ id }: { id: string }) {
  const node = useEditor((s) => s.project.nodes[id])
  const updateProps = useEditor((s) => s.updateProps)
  const events: EventField[] = node ? eventsFor(node.type).filter((f) => f !== 'onLoad' && f !== 'onTimer') : []
  const [picked, setPicked] = useState<EventField | null>(null)
  const has = (f: EventField | null): f is EventField => f != null && events.includes(f)
  if (!node) return null
  const current = has(picked) ? picked : (events.find((f) => node[f]?.length) ?? events[0])
  return (
    <div className="pm-events">
      {events.length > 1 && (
        <div className="pm-events-tabs" role="radiogroup" aria-label="Événement">
          {events.map((f) => {
            const n = countActions(node[f])
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={f === current}
                className={`pm-chip-btn${f === current ? ' is-on' : ''}`}
                onClick={() => setPicked(f)}
              >
                {EVENT_LABELS[f].tab}
                {n > 0 && <span className="pm-events-count">{n}</span>}
              </button>
            )
          })}
        </div>
      )}
      {current === 'onKey' && (
        <label className="pm-events-key">
          <span>Touche</span>
          <SelectInput
            value={String(node.props.eventKey ?? 'Enter')}
            options={EVENT_KEYS}
            onChange={(v) => updateProps(id, { eventKey: v })}
          />
        </label>
      )}
      <ActionsEditor key={current} id={id} field={current} />
    </div>
  )
}

/** Minuterie d'une page : l'intervalle (en secondes) puis les actions répétées. */
export function TimerEditor({ id }: { id: string }) {
  const ms = useEditor((s) => s.project.nodes[id]?.props.timerMs)
  const updateProps = useEditor((s) => s.updateProps)
  return (
    <div className="pm-events">
      <label className="pm-events-key">
        <span>Toutes les</span>
        <NumberInput
          value={ms ? Number(ms) / 1000 : undefined}
          unit="s"
          min={0.1}
          max={3600}
          step={0.5}
          placeholder="5"
          onChange={(v) => updateProps(id, { timerMs: v ? Math.round(v * 1000) : 0 })}
        />
      </label>
      <ActionsEditor id={id} field="onTimer" />
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
    case 'signup':
    case 'login':
    case 'logout':
      return (
        <>
          {a.type !== 'logout' && (
            <>
              <div className="pm-inline">
                <span>e-mail</span>
                <TextInput value={a.email} dynamic placeholder="{{email}}" onChange={(email) => onChange({ ...a, email })} />
              </div>
              <div className="pm-inline">
                <span>mot de passe</span>
                <TextInput value={a.password} dynamic placeholder="{{mot_de_passe}}" onChange={(password) => onChange({ ...a, password })} />
              </div>
            </>
          )}
          <div className="pm-inline">
            <span>{a.type === 'logout' ? 'vider' : 'personne connectée dans'}</span>
            <VariableSelect value={a.variable} kinds={['text']} placeholder="Choisir une variable…" onChange={(variable) => onChange({ ...a, variable })} />
          </div>
          {a.type !== 'logout' && (
            <p className="pm-row-help">
              Si l’e-mail ou le mot de passe ne vont pas, un message le dit et les actions suivantes ne sont pas faites. Les comptes sont gardés dans le navigateur de chaque
              personne, avec le mot de passe chiffré : c’est un espace personnel, pas encore un vrai serveur de comptes.
            </p>
          )}
        </>
      )
    case 'if':
      return <IfFields action={a} onChange={onChange} ctx={ctx} />
    case 'call':
      return <CallFields action={a} onChange={onChange} />
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
    case 'fetch': {
      const method = a.method ?? 'GET'
      const sends = method !== 'GET'
      return (
        <>
          <div className="pm-inline">
            <SelectInput
              value={method}
              options={HTTP_METHODS.map((m) => ({ value: m, label: m }))}
              onChange={(m) => onChange({ ...a, method: m === 'GET' ? undefined : (m as HttpMethod) })}
            />
            <TextInput value={a.url} dynamic placeholder="https://api.exemple.com/donnees" onChange={(url) => onChange({ ...a, url })} />
          </div>
          <div className="pm-inline">
            <span>{sends ? 'réponse dans' : 'dans'}</span>
            <VariableSelect
              value={a.variable}
              placeholder={sends ? 'Ne pas garder la réponse' : 'Choisir une variable…'}
              onChange={(variable) => onChange({ ...a, variable })}
            />
          </div>
          {(!sends || a.variable) && (
            <div className="pm-inline">
              <span>chemin</span>
              <TextInput value={a.path} placeholder="(facultatif) ex. results" onChange={(path) => onChange({ ...a, path })} />
            </div>
          )}
          {sends && (
            <label className="pm-fetch-block">
              <span>Corps envoyé (une ligne « nom: valeur »)</span>
              <TextInput value={a.body ?? ''} multiline dynamic placeholder={'nom: {{nom}}\nemail: {{email}}'} onChange={(body) => onChange({ ...a, body: body || undefined })} />
            </label>
          )}
          <details className="pm-fetch-more" open={!!a.headers}>
            <summary>En-têtes</summary>
            <TextInput
              value={a.headers ?? ''}
              multiline
              dynamic
              placeholder={'Authorization: Bearer {{jeton}}'}
              onChange={(headers) => onChange({ ...a, headers: headers || undefined })}
            />
          </details>
          <p className="pm-row-help">
            {sends
              ? 'Le corps part en JSON. Une valeur écrite seule, comme {{age}}, garde son type (nombre, liste...).'
              : 'L’adresse doit renvoyer du JSON. Le chemin choisit une partie de la réponse (ex. data.items).'}
          </p>
        </>
      )
    }
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

function CallFields({ action: a, onChange }: { action: Extract<Action, { type: 'call' }>; onChange: (a: Action) => void }) {
  const functions = useEditor((s) => s.project.functions ?? NO_FUNCTIONS)
  if (!functions.length) return <p className="pm-row-help">Crée d’abord une fonction dans le panneau Variables, rubrique « Fonctions réutilisables ».</p>
  return (
    <SelectInput
      value={a.name}
      placeholder="Choisir une fonction…"
      options={functions.map((f) => ({ value: f.name, label: `${f.name} (${countActions(f.actions)} action${countActions(f.actions) > 1 ? 's' : ''})` }))}
      onChange={(name) => onChange({ ...a, name })}
    />
  )
}

function ConditionFields({ cond, onChange, lead }: { cond: Condition; onChange: (c: Condition) => void; lead: React.ReactNode }) {
  const variable = useEditor((s) => s.project.variables.find((v) => v.name === cond.variable))
  const op = CONDITION_OPS.find((o) => o.value === cond.op)
  return (
    <>
      <div className="pm-inline">
        {lead}
        <VariableSelect value={cond.variable} placeholder="Choisir une variable…" onChange={(v) => onChange({ ...cond, variable: v })} />
      </div>
      <SelectInput value={cond.op} options={CONDITION_OPS} onChange={(v) => onChange({ ...cond, op: v as ConditionOp })} />
      {op?.needsValue &&
        (variable?.kind === 'boolean' ? (
          <SelectInput
            value={cond.value === 'true' ? 'true' : 'false'}
            options={[
              { value: 'true', label: 'Vrai' },
              { value: 'false', label: 'Faux' },
            ]}
            onChange={(value) => onChange({ ...cond, value })}
          />
        ) : (
          <TextInput
            value={cond.value}
            dynamic
            placeholder={variable?.kind === 'text' && !['gt', 'lt'].includes(cond.op) ? 'texte ou {{variable}}' : variable?.kind === 'list' ? 'nombre d’éléments' : '0 ou {{variable}}'}
            onChange={(value) => onChange({ ...cond, value })}
          />
        ))}
    </>
  )
}

function IfFields({ action: a, onChange, ctx }: { action: Extract<Action, { type: 'if' }>; onChange: (a: Action) => void; ctx: Ctx }) {
  const more = a.more ?? []
  const join = a.join ?? 'and'
  const setMore = (next: Condition[]) => onChange({ ...a, more: next.length ? next : undefined, join: next.length ? join : undefined })
  return (
    <>
      <ConditionFields cond={a} onChange={(c) => onChange({ ...a, variable: c.variable, op: c.op, value: c.value })} lead={<span>si</span>} />
      {more.map((c, i) => (
        <div className="pm-condition-more" key={i}>
          <ConditionFields
            cond={c}
            onChange={(next) => setMore(more.map((x, j) => (j === i ? next : x)))}
            lead={
              i === 0 ? (
                <select className="pm-input pm-join" aria-label="Relier les conditions" value={join} onChange={(e) => onChange({ ...a, join: e.target.value as 'and' | 'or' })}>
                  <option value="and">et</option>
                  <option value="or">ou</option>
                </select>
              ) : (
                <span>{join === 'or' ? 'ou' : 'et'}</span>
              )
            }
          />
          <IconButton label="Retirer cette condition" onClick={() => setMore(more.filter((_, j) => j !== i))}>
            <Trash2 size={13} />
          </IconButton>
        </div>
      ))}
      <button
        type="button"
        className="pm-btn pm-btn-dashed pm-btn-sm"
        onClick={() => setMore([...more, { variable: a.variable, op: 'true', value: '' }])}
      >
        <Plus size={13} /> Condition
      </button>
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

import { Check, KeyRound, Lightbulb, LoaderCircle, Sparkles, Wand2, X } from 'lucide-react'
import { useState } from 'react'
import { describeError, explain, generateProject, isConfigured, modifyProject, readSettings, writeSettings, type AiSettings } from '../ai/assistant'
import { aiToProject } from '../ai/format'
import { brickTitle, changeCount, diffProjects, graftBrick, type ProjectChanges } from '../ai/review'
import { bundle, generate } from '../codegen/generate'
import type { Project } from '../model/types'
import { useEditor } from '../store/editor'
import { Modal } from './Dialogs'
import { Segmented, Switch } from './ui'

type Mode = 'create' | 'modify' | 'explain'

/** Changements proposés par l'assistant, en attente d'être appliqués ou rejetés. */
interface Review {
  project: Project
  changes: ProjectChanges
  summary: string
  /** Retouche ciblée : la brique à resélectionner après avoir appliqué. */
  focus?: { id: string; page: string }
}

const IDEAS = [
  'Un quiz de 3 questions sur l’espace avec un score et un message à la fin',
  'Le site d’un club de basket : accueil, horaires des entraînements, contact avec formulaire',
  'Une liste de courses avec ajout, suppression et un compteur d’articles',
  'Une petite boutique : grille de 6 produits, panier et page de commande',
]

/** Assistant IA (version Pro) : créer, modifier ou comprendre une application. */
export function AssistantDialog({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<AiSettings>(readSettings)
  const [editing, setEditing] = useState(!isConfigured(settings))
  const [mode, setMode] = useState<Mode>('create')
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [review, setReview] = useState<Review | null>(null)
  const selected = useEditor((st) => (st.selectedId ? st.project.nodes[st.selectedId] : undefined))
  const target = selected && selected.type !== 'page' ? selected : undefined
  const [onlySelected, setOnlySelected] = useState(true)

  const apply = () => {
    if (!review) return
    const ed = useEditor.getState()
    ed.loadProject(review.project)
    if (review.focus && review.project.nodes[review.focus.id]) useEditor.setState({ selectedId: review.focus.id, currentPage: review.focus.page })
    ed.notify('Changements de l’assistant appliqués (Ctrl+Z pour annuler)')
    setAnswer(review.summary)
    setReview(null)
    setPrompt('')
  }
  const reject = () => {
    setReview(null)
    useEditor.getState().notify('Changements de l’assistant rejetés : ton projet n’a pas bougé')
  }

  const run = async () => {
    const text = prompt.trim()
    if (!text || busy) return
    setBusy(true)
    setError('')
    setAnswer('')
    setReview(null)
    setProgress(0)
    const ed = useEditor.getState()
    try {
      if (mode === 'explain') {
        const code = generate(ed.project)
        await explain(settings, text, `index.html\n${code.html}\n\nstyle.css\n${code.css}\n\nscript.js\n${code.js}`, setAnswer)
      } else if (mode === 'create') {
        const ai = await generateProject(settings, text, setProgress)
        const project = aiToProject(ai)
        ed.createProject(project)
        ed.notify(`« ${project.name} » créé par l’assistant`)
        setAnswer(ai.summary || 'Ton application est prête.')
        setPrompt('')
      } else {
        const focus = target && onlySelected ? { id: target.id, page: ed.currentPage } : undefined
        const ai = await modifyProject(settings, ed.project, text, setProgress, focus?.id)
        const refs = new Map<string, string>()
        const next = aiToProject(ai, refs)
        const current = useEditor.getState().project
        let project: Project
        let changes: ProjectChanges
        if (focus) {
          const grafted = graftBrick(current, next, refs, focus.id)
          if (!grafted) throw new Error('L’assistant a retiré la brique au lieu de la modifier. Reformule ta demande.')
          project = grafted
          changes = diffProjects(current, grafted, new Map(Object.keys(grafted.nodes).map((id) => [id, id])))
        } else {
          // Les réglages faits dans le Studio de style restent si l'assistant garde le même style.
          const theme = next.theme && current.theme?.tokens && next.theme.style === current.theme.style ? { ...next.theme, tokens: current.theme.tokens } : next.theme
          project = { ...next, theme, name: current.name, appVersion: current.appVersion, components: current.components }
          changes = diffProjects(current, project, refs)
        }
        if (!changeCount(changes)) setAnswer('L’assistant n’a rien changé. Essaie de préciser ta demande.')
        else setReview({ project, changes, summary: ai.summary || 'C’est fait.', focus })
      }
    } catch (e) {
      setError(await describeError(e))
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <Modal title="Assistant IA · Pro" subtitle="Connecte l’assistant une fois, il reste prêt dans ce navigateur." onClose={onClose}>
        <SettingsForm
          initial={settings}
          onSave={(s) => {
            writeSettings(s)
            setSettings(s)
            setEditing(!isConfigured(s))
          }}
        />
      </Modal>
    )
  }

  return (
    <Modal title="Assistant IA · Pro" subtitle="Décris ce que tu veux : l’assistant construit avec les mêmes briques que toi." onClose={onClose} wide>
      <div className="pm-ai">
        <div className="pm-ai-top">
          <Segmented
            label="Que faire ?"
            value={mode}
            onChange={(m) => {
              setMode(m)
              setReview(null)
              setAnswer('')
              setError('')
            }}
            options={[
              { value: 'create', label: 'Créer une appli' },
              { value: 'modify', label: 'Modifier ce projet' },
              { value: 'explain', label: 'Expliquer le code' },
            ]}
          />
          <button type="button" className="pm-btn pm-btn-ghost" onClick={() => setEditing(true)}>
            <KeyRound size={15} /> Réglages
          </button>
        </div>
        <label className="pm-ai-label" htmlFor="pm-ai-prompt">
          {mode === 'create' ? 'Décris ton application' : mode === 'modify' ? 'Que faut-il changer ?' : 'Ta question sur le code'}
        </label>
        <textarea
          id="pm-ai-prompt"
          className="pm-input pm-ai-prompt"
          rows={4}
          value={prompt}
          placeholder={
            mode === 'create'
              ? 'Ex. Un site pour mon association, avec une page d’accueil, les événements et un formulaire d’inscription.'
              : mode === 'modify'
                ? 'Ex. Ajoute une page « À propos » et un menu en haut de chaque page.'
                : 'Ex. À quoi sert la fonction afficher() ? Pourquoi mon bouton ne fait rien ?'
          }
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run()
          }}
        />
        {mode === 'modify' && target && (
          <Switch checked={onlySelected} onChange={setOnlySelected} label={`Seulement la brique sélectionnée : ${brickTitle(target)}`} />
        )}
        {mode === 'create' && !prompt && (
          <div className="pm-ai-ideas">
            <Lightbulb size={14} aria-hidden="true" />
            {IDEAS.map((idea) => (
              <button key={idea} type="button" className="pm-ai-idea" onClick={() => setPrompt(idea)}>
                {idea}
              </button>
            ))}
          </div>
        )}
        <div className="pm-ai-actions">
          <button type="button" className="pm-btn pm-btn-primary" disabled={busy || !prompt.trim()} onClick={run}>
            {busy ? <LoaderCircle size={16} className="pm-spin" /> : mode === 'explain' ? <Sparkles size={16} /> : <Wand2 size={16} />}
            {busy ? (mode === 'explain' ? 'L’assistant réfléchit…' : 'L’assistant construit…') : mode === 'create' ? 'Créer l’application' : mode === 'modify' ? 'Modifier le projet' : 'Demander'}
          </button>
          {busy && mode !== 'explain' && <span className="pm-muted">{progress ? `${progress.toLocaleString('fr-FR')} caractères reçus` : 'Préparation…'}</span>}
          {mode === 'modify' && !busy && <span className="pm-muted">Tu verras les changements avant de les appliquer.</span>}
        </div>
        {error && (
          <p className="pm-ai-error" role="alert">
            {error}
          </p>
        )}
        {review && <ReviewPanel review={review} onApply={apply} onReject={reject} />}
        {answer && (
          <div className="pm-ai-answer" aria-live="polite">
            {answer}
          </div>
        )}
      </div>
    </Modal>
  )
}

const SHOWN = 8

function ChangeList({ title, items, kind }: { title: string; items: string[]; kind: 'added' | 'removed' | 'changed' }) {
  if (!items.length) return null
  return (
    <div className={`pm-ai-changes is-${kind}`}>
      <strong>
        {title} ({items.length})
      </strong>
      <ul>
        {items.slice(0, SHOWN).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
        {items.length > SHOWN && <li className="pm-muted">et {items.length - SHOWN} autres</li>}
      </ul>
    </div>
  )
}

/** Relecture : ce qui change, un aperçu du résultat, et le choix d'appliquer ou non. */
function ReviewPanel({ review, onApply, onReject }: { review: Review; onApply: () => void; onReject: () => void }) {
  const html = bundle(generate(review.project), { startPage: review.focus?.page })
  return (
    <section className="pm-ai-review" aria-label="Changements proposés">
      <p className="pm-ai-review-summary">{review.summary}</p>
      <div className="pm-ai-review-body">
        <div className="pm-ai-review-lists">
          <ChangeList title="Ajouté" items={review.changes.added} kind="added" />
          <ChangeList title="Modifié" items={review.changes.changed} kind="changed" />
          <ChangeList title="Retiré" items={review.changes.removed} kind="removed" />
        </div>
        <iframe className="pm-ai-review-frame" title="Aperçu des changements proposés" sandbox="allow-scripts allow-forms" srcDoc={html} />
      </div>
      <div className="pm-ai-actions">
        <button type="button" className="pm-btn pm-btn-primary" onClick={onApply}>
          <Check size={16} /> Appliquer
        </button>
        <button type="button" className="pm-btn pm-btn-ghost" onClick={onReject}>
          <X size={16} /> Rejeter
        </button>
      </div>
    </section>
  )
}

function SettingsForm({ initial, onSave }: { initial: AiSettings; onSave: (s: AiSettings) => void }) {
  const [apiKey, setApiKey] = useState(initial.apiKey)
  const [proxyUrl, setProxyUrl] = useState(initial.proxyUrl)
  return (
    <form
      className="pm-ai-settings"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ apiKey: apiKey.trim(), proxyUrl: proxyUrl.trim() })
      }}
    >
      <label htmlFor="pm-ai-key">Ta clé API Anthropic</label>
      <input
        id="pm-ai-key"
        className="pm-input pm-mono"
        type="password"
        autoComplete="off"
        placeholder="sk-ant-…"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
      />
      <small>
        Crée-la sur <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>. Elle reste dans ce navigateur et
        n’est envoyée qu’à l’API d’Anthropic. N’utilise pas cette option sur un ordinateur partagé.
      </small>
      <label htmlFor="pm-ai-proxy">Ou l’adresse de ton serveur relais (facultatif)</label>
      <input
        id="pm-ai-proxy"
        className="pm-input pm-mono"
        type="url"
        placeholder="https://ptt-makers-ia.mon-compte.workers.dev"
        value={proxyUrl}
        onChange={(e) => setProxyUrl(e.target.value)}
      />
      <small>Le relais garde la clé sur un serveur : pratique pour une classe ou un club. Voir le dossier serveur-ia du projet.</small>
      <div className="pm-ai-actions">
        <button type="submit" className="pm-btn pm-btn-primary" disabled={!apiKey.trim() && !proxyUrl.trim()}>
          Enregistrer
        </button>
        {(initial.apiKey || initial.proxyUrl) && (
          <button type="button" className="pm-btn pm-btn-ghost" onClick={() => onSave({ apiKey: '', proxyUrl: '' })}>
            Effacer la clé
          </button>
        )}
      </div>
    </form>
  )
}

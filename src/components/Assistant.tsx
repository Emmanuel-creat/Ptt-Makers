import { KeyRound, Lightbulb, LoaderCircle, Sparkles, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { describeError, explain, generateProject, isConfigured, modifyProject, readSettings, writeSettings, type AiSettings } from '../ai/assistant'
import { aiToProject } from '../ai/format'
import { generate } from '../codegen/generate'
import { useEditor } from '../store/editor'
import { Modal } from './Dialogs'
import { Segmented } from './ui'

type Mode = 'create' | 'modify' | 'explain'

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

  const run = async () => {
    const text = prompt.trim()
    if (!text || busy) return
    setBusy(true)
    setError('')
    setAnswer('')
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
        const ai = await modifyProject(settings, ed.project, text, setProgress)
        const next = aiToProject(ai)
        const current = useEditor.getState().project
        ed.loadProject({ ...next, name: current.name, components: current.components })
        ed.notify('Projet modifié par l’assistant (Ctrl+Z pour annuler)')
        setAnswer(ai.summary || 'C’est fait.')
        setPrompt('')
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
          {mode === 'modify' && !busy && <span className="pm-muted">Tu pourras annuler avec Ctrl+Z.</span>}
        </div>
        {error && (
          <p className="pm-ai-error" role="alert">
            {error}
          </p>
        )}
        {answer && (
          <div className="pm-ai-answer" aria-live="polite">
            {answer}
          </div>
        )}
      </div>
    </Modal>
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

import { Check, ChevronDown, ChevronUp, Circle, Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CHALLENGES, challengeProgress } from '../model/challenges'
import { useEditor } from '../store/editor'
import { useWorkspace } from '../store/workspace'

/** Carte flottante du défi en cours : les étapes se cochent toutes seules. */
export function ChallengePanel() {
  const challenge = useWorkspace((s) => s.challenge)
  const done = useWorkspace((s) => s.challengesDone)
  const set = useWorkspace((s) => s.set)
  const [small, setSmall] = useState(false)
  const project = useEditor((s) => s.project)
  const projectId = useEditor((s) => s.projectId)
  const def = challenge && challenge.projectId === projectId ? CHALLENGES.find((c) => c.id === challenge.id) : undefined
  const progress = useMemo(() => (def ? challengeProgress(def, project) : []), [def, project])
  const count = progress.filter(Boolean).length
  const finished = !!def && count === def.steps.length

  useEffect(() => {
    if (!finished || !def || done.includes(def.id)) return
    set({ challengesDone: [...done, def.id] })
    useEditor.getState().notify(`Bravo ! Défi « ${def.name} » réussi 🎉`)
  }, [finished, def, done, set])

  if (!def) return null
  const next = progress.indexOf(false)

  return (
    <aside className={`pm-challenge ${finished ? 'is-done' : ''} ${small ? 'is-small' : ''}`} aria-label={`Défi : ${def.name}`}>
      <header className="pm-challenge-head">
        <Trophy size={16} aria-hidden="true" />
        <strong>{def.name}</strong>
        <span className="pm-challenge-count">
          {count}/{def.steps.length}
        </span>
        <button type="button" className="pm-icon-btn" aria-label={small ? 'Agrandir le défi' : 'Réduire le défi'} onClick={() => setSmall(!small)}>
          {small ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button type="button" className="pm-icon-btn" aria-label="Fermer le défi" onClick={() => set({ challenge: null })}>
          <X size={14} />
        </button>
      </header>
      <div className="pm-challenge-bar" aria-hidden="true">
        <span style={{ width: `${(count / def.steps.length) * 100}%` }} />
      </div>
      {small ? null : finished ? (
        <div className="pm-challenge-win">
          <p>Défi réussi ! Teste ton travail dans l’aperçu, puis essaie le suivant.</p>
          <button type="button" className="pm-btn pm-btn-primary" onClick={() => set({ challenge: null, dialog: 'challenges' })}>
            Autres défis
          </button>
        </div>
      ) : (
        <ol className="pm-challenge-steps">
          {def.steps.map((s, i) => (
            <li key={s.label} className={progress[i] ? 'is-ok' : i === next ? 'is-next' : ''}>
              {progress[i] ? <Check size={14} aria-label="fait" /> : <Circle size={14} aria-hidden="true" />}
              <span>
                {s.label}
                {i === next && <small>{s.hint}</small>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}

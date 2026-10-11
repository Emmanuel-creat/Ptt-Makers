import { useLayoutEffect, useState } from 'react'
import { useWorkspace } from '../store/workspace'
import { Logo } from './TopBar'

const STEPS = [
  {
    target: null,
    title: 'Bienvenue dans Ptt-Makers !',
    text: "Ici, tu construis des applications en assemblant des briques, et tu vois le vrai code s'écrire en même temps. Petit tour en 4 étapes ?",
  },
  {
    target: 'bricks',
    title: '1. Les briques',
    text: 'Chaque famille a sa couleur : structure, texte, interaction, médias. Glisse une brique vers la zone de création, ou clique dessus.',
  },
  {
    target: 'canvas',
    title: '2. La zone de création',
    text: 'Clique sur une brique pour la sélectionner, glisse-la pour la déplacer, double-clique un texte pour le modifier directement.',
  },
  {
    target: 'inspector',
    title: '3. Les propriétés',
    text: "Règle le contenu, la mise en page, les couleurs… et les interactions : que se passe-t-il quand on clique ?",
  },
  {
    target: 'dock',
    title: '4. Aperçu et code',
    text: "Teste ton application en direct, puis ouvre l'onglet Code : les lignes de la brique sélectionnée sont surlignées.",
  },
] as const

type Box = { top: number; left: number; width: number; height: number }

/** Visite guidée affichée au premier lancement (et depuis l'aide). */
export function Onboarding() {
  const done = useWorkspace((s) => s.onboardingDone)
  const set = useWorkspace((s) => s.set)
  const [step, setStep] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const current = STEPS[step]

  useLayoutEffect(() => {
    if (done) return
    const measure = () => {
      const el = current.target ? document.querySelector(`[data-tour="${current.target}"]`) : null
      const r = el?.getBoundingClientRect()
      setBox(r && r.width > 0 ? { top: r.top, left: r.left, width: r.width, height: r.height } : null)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [current, done])

  if (done) return null
  const finish = () => {
    set({ onboardingDone: true })
    setStep(0)
  }
  const last = step === STEPS.length - 1

  // La bulle se place à côté de la zone éclairée, sinon au centre.
  let cardStyle: React.CSSProperties = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  if (box) {
    const w = 340
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (box.left + box.width + w + 24 < vw) cardStyle = { top: Math.min(box.top + 24, vh - 260), left: box.left + box.width + 16 }
    else if (box.left - w - 16 > 0) cardStyle = { top: Math.min(box.top + 24, vh - 260), left: box.left - w - 16 }
    else cardStyle = { top: Math.max(16, box.top - 200), left: Math.max(16, Math.min(vw - w - 16, box.left + 24)) }
  }

  return (
    <div className="pm-tour" role="dialog" aria-modal="true" aria-labelledby="pm-tour-title">
      {box ? <div className="pm-tour-spot" style={box} /> : <div className="pm-tour-dim" />}
      <div className="pm-tour-card" style={cardStyle}>
        {step === 0 && <Logo size={40} />}
        <h2 id="pm-tour-title">{current.title}</h2>
        <p>{current.text}</p>
        <div className="pm-tour-foot">
          <div className="pm-tour-dots" aria-label={`Étape ${step + 1} sur ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <span key={i} className={i === step ? 'is-active' : ''} />
            ))}
          </div>
          <button type="button" className="pm-btn pm-btn-ghost" onClick={finish}>
            {step === 0 ? 'Plus tard' : 'Passer'}
          </button>
          <button type="button" className="pm-btn pm-btn-primary" autoFocus onClick={() => (last ? finish() : setStep(step + 1))}>
            {step === 0 ? "C'est parti" : last ? 'Terminer' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  )
}

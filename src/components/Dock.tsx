import { Bug, Check, CircleAlert, Code2, Copy, Download, ExternalLink, Eye, Info, RotateCcw, StepForward, Trash2 } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { bundle, generate, type GeneratedCode } from '../codegen/generate'
import { highlightLines, type Lang } from '../codegen/highlight'
import type { Project } from '../model/types'
import { useEditor } from '../store/editor'
import { DEVICE_WIDTH, useWorkspace, type CodeTab } from '../store/workspace'
import { downloadFile } from '../utils/download'
import { ProblemsPanel, useProblems } from './ProblemsPanel'
import { IconButton } from './ui'

const cache = new WeakMap<Project, GeneratedCode>()
/** Code généré pour le projet courant (calculé une seule fois par version du projet). */
export function useGeneratedCode(): GeneratedCode {
  const project = useDeferredValue(useEditor((s) => s.project))
  return useMemo(() => {
    let code = cache.get(project)
    if (!code) {
      code = generate(project)
      cache.set(project, code)
    }
    return code
  }, [project])
}

/** Dock Aperçu / Code. */
export function Dock() {
  const tab = useWorkspace((s) => s.dockTab)
  const set = useWorkspace((s) => s.set)
  const problems = useProblems()
  const errors = problems.filter((p) => p.level === 'erreur').length
  return (
    <div className="pm-dock-inner">
      <div className="pm-tabs" role="tablist" aria-label="Aperçu et code">
        <button type="button" role="tab" aria-selected={tab === 'preview'} className="pm-tab" onClick={() => set({ dockTab: 'preview' })}>
          <Eye size={15} /> Aperçu
        </button>
        <button type="button" role="tab" aria-selected={tab === 'code'} className="pm-tab" onClick={() => set({ dockTab: 'code' })}>
          <Code2 size={15} /> Code
        </button>
        <button type="button" role="tab" aria-selected={tab === 'problems'} className="pm-tab" onClick={() => set({ dockTab: 'problems' })}>
          <CircleAlert size={15} /> Problèmes
          {problems.length > 0 && <span className={`pm-tab-count ${errors ? 'is-error' : ''}`}>{problems.length}</span>}
        </button>
        <span className="pm-live-dot" data-tip="Mis à jour en temps réel">
          en direct
        </span>
      </div>
      {tab === 'preview' ? <Preview /> : tab === 'code' ? <CodeView /> : <ProblemsPanel />}
    </div>
  )
}

/** Code de l'aperçu avec débogueur (jamais exporté). */
function useDebugCode(on: boolean): GeneratedCode | null {
  const project = useDeferredValue(useEditor((s) => s.project))
  return useMemo(() => (on ? generate(project, { debug: true }) : null), [project, on])
}

interface DebugStep {
  n: number
  text: string
}

function Preview() {
  const [debug, setDebug] = useState(false)
  const normal = useGeneratedCode()
  const debugCode = useDebugCode(debug)
  const code = debugCode ?? normal
  const frameRef = useRef<HTMLIFrameElement>(null)
  const device = useWorkspace((s) => s.device)
  const name = useEditor((s) => s.project.name)
  const currentPage = useEditor((s) => s.currentPage)
  const pageName = useEditor((s) => (s.project.pages.length > 1 ? s.project.nodes[s.currentPage]?.name : null))
  const [reloadKey, setReloadKey] = useState(0)
  // L'aperçu s'ouvre sur la page affichée dans la zone de création.
  const html = useMemo(() => bundle(code, { startPage: currentPage }), [code, currentPage])
  const width = DEVICE_WIDTH[device]

  const openInTab = () => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <div className="pm-preview">
      <div className="pm-dock-toolbar">
        <span className="pm-muted pm-truncate">
          {name}
          {pageName ? ` · ${pageName}` : ''} · {width ? `${width} px` : 'pleine largeur'}
        </span>
        <IconButton label="Débogueur : suivre les actions une par une" active={debug} onClick={() => setDebug((d) => !d)}>
          <Bug size={15} />
        </IconButton>
        <IconButton label="Recommencer (remet les variables à zéro)" onClick={() => setReloadKey((k) => k + 1)}>
          <RotateCcw size={15} />
        </IconButton>
        <IconButton label="Ouvrir dans un nouvel onglet" onClick={openInTab}>
          <ExternalLink size={15} />
        </IconButton>
      </div>
      <div className={`pm-preview-stage${debug ? ' has-debugger' : ''}`}>
        <iframe
          ref={frameRef}
          key={reloadKey}
          title="Aperçu interactif du projet"
          className="pm-preview-frame"
          style={{ width: width ? width : '100%' }}
          sandbox="allow-scripts allow-modals allow-popups allow-forms"
          srcDoc={html}
        />
        {debug && <DebuggerPanel frameRef={frameRef} resetKey={`${reloadKey}:${html.length}`} />}
      </div>
    </div>
  )
}

/** Débogueur : la suite des actions lancées, les variables en direct, et le mode pas à pas. */
function DebuggerPanel({ frameRef, resetKey }: { frameRef: React.RefObject<HTMLIFrameElement | null>; resetKey: string }) {
  const [steps, setSteps] = useState<DebugStep[]>([])
  const [state, setState] = useState<Record<string, unknown>>({})
  const [stepMode, setStepMode] = useState(false)
  const [paused, setPaused] = useState(false)
  const counter = useRef(0)

  // Un nouvel aperçu repart de zéro.
  const [seenKey, setSeenKey] = useState(resetKey)
  if (seenKey !== resetKey) {
    setSeenKey(resetKey)
    setSteps([])
    setPaused(false)
  }

  const send = (data: Record<string, unknown>) => frameRef.current?.contentWindow?.postMessage({ ptt: 'debogueur', ...data }, '*')

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow || !e.data || typeof e.data !== 'object') return
      if (e.data.ptt === 'etat') setState(e.data.etat ?? {})
      if (e.data.ptt === 'pas') {
        const text = String(e.data.texte ?? '')
        setSteps((list) => [...list.slice(-99), { n: ++counter.current, text }])
        setPaused(!!e.data.pause)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [frameRef])

  // Le mode pas à pas est renvoyé à chaque chargement de l'aperçu.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const sync = () => frame.contentWindow?.postMessage({ ptt: 'debogueur', pasAPas: stepMode }, '*')
    sync()
    frame.addEventListener('load', sync)
    return () => frame.removeEventListener('load', sync)
  }, [frameRef, stepMode, resetKey])

  const listRef = useRef<HTMLOListElement>(null)
  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' })
  }, [steps])

  return (
    <aside className="pm-debugger" aria-label="Débogueur">
      <div className="pm-debugger-bar">
        <label className="pm-debugger-mode">
          <input
            type="checkbox"
            checked={stepMode}
            onChange={(e) => {
              setStepMode(e.target.checked)
              if (!e.target.checked) setPaused(false)
              send({ pasAPas: e.target.checked })
            }}
          />
          Pas à pas
        </label>
        <button
          type="button"
          className="pm-btn pm-btn-primary pm-btn-sm"
          disabled={!paused}
          onClick={() => {
            setPaused(false)
            send({ suivant: true })
          }}
        >
          <StepForward size={14} /> Action suivante
        </button>
        <IconButton label="Effacer la liste" onClick={() => setSteps([])}>
          <Trash2 size={14} />
        </IconButton>
      </div>
      <p className="pm-debugger-title">Actions</p>
      {steps.length ? (
        <ol className="pm-debugger-steps" ref={listRef}>
          {steps.map((s, i) => (
            <li key={s.n} className={paused && i === steps.length - 1 ? 'is-current' : ''}>
              <span className="pm-debugger-n">{s.n}</span>
              {s.text}
            </li>
          ))}
        </ol>
      ) : (
        <p className="pm-muted pm-debugger-empty">Clique, tape ou survole dans l’aperçu : chaque action lancée s’affiche ici.</p>
      )}
      <p className="pm-debugger-title">Variables</p>
      <dl className="pm-debugger-vars">
        {Object.entries(state).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{formatDebugValue(v)}</dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}

function formatDebugValue(v: unknown): string {
  if (Array.isArray(v)) return `${v.length} élément(s)${v.length ? ` : ${v.slice(0, 3).map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ')}${v.length > 3 ? '…' : ''}` : ''}`
  if (typeof v === 'string') return `« ${v} »`
  return String(v)
}

const FILES: Record<CodeTab, { file: string; lang: Lang; mime: string }> = {
  html: { file: 'index.html', lang: 'html', mime: 'text/html' },
  css: { file: 'style.css', lang: 'css', mime: 'text/css' },
  js: { file: 'script.js', lang: 'js', mime: 'text/javascript' },
}

function CodeView() {
  const code = useGeneratedCode()
  const tab = useWorkspace((s) => s.codeTab)
  const beginner = useWorkspace((s) => s.beginner)
  const set = useWorkspace((s) => s.set)
  const selectedId = useEditor((s) => s.selectedId)
  const selectedName = useEditor((s) => (s.selectedId ? s.project.nodes[s.selectedId]?.name : null))
  const [copied, setCopied] = useState(false)
  const source = code[tab]
  const lines = useMemo(() => highlightLines(source, FILES[tab].lang), [source, tab])
  const range = selectedId ? code.map[selectedId]?.[tab] : undefined
  const firstLine = range?.[0]
  const scrollRef = useRef<HTMLDivElement>(null)

  // Amène les lignes de la brique sélectionnée à l'écran.
  useEffect(() => {
    if (!firstLine || !scrollRef.current) return
    const el = scrollRef.current.querySelector(`[data-line="${firstLine}"]`) as HTMLElement | null
    if (!el) return
    const box = scrollRef.current
    const top = el.offsetTop - box.clientHeight / 3
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [selectedId, tab, firstLine])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      useEditor.getState().notify('Copie impossible dans ce navigateur')
    }
  }

  return (
    <div className="pm-code">
      <div className="pm-dock-toolbar">
        <div className="pm-code-tabs" role="tablist" aria-label="Fichier">
          {(Object.keys(FILES) as CodeTab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`pm-code-tab is-${t}`}
              onClick={() => set({ codeTab: t })}
            >
              {FILES[t].file}
              {selectedId && code.map[selectedId]?.[t] && <span className="pm-code-dot" aria-label="contient la brique sélectionnée" />}
            </button>
          ))}
        </div>
        <IconButton label={copied ? 'Copié !' : 'Copier le code'} onClick={copy}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </IconButton>
        <IconButton label={`Télécharger ${FILES[tab].file}`} onClick={() => downloadFile(FILES[tab].file, source, FILES[tab].mime)}>
          <Download size={15} />
        </IconButton>
      </div>
      {beginner && (
        <p className="pm-code-hint">
          <Info size={14} aria-hidden="true" />
          {selectedName
            ? range
              ? `Les lignes surlignées correspondent à « ${selectedName} ».`
              : `« ${selectedName} » n'a pas de code dans ce fichier.`
            : 'Sélectionne une brique pour surligner son code.'}
        </p>
      )}
      <div className="pm-code-scroll" ref={scrollRef} tabIndex={0} aria-label={`Code ${FILES[tab].file}`}>
        <pre className="pm-code-pre">
          {lines.map((html, i) => {
            const n = i + 1
            const hl = range && n >= range[0] && n <= range[1]
            return (
              <div key={i} data-line={n} className={`pm-code-line ${hl ? 'is-hl' : ''}`}>
                <span className="pm-code-num" aria-hidden="true">
                  {n}
                </span>
                <code dangerouslySetInnerHTML={{ __html: html || ' ' }} />
              </div>
            )
          })}
        </pre>
      </div>
    </div>
  )
}

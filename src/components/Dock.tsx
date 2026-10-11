import { Check, Code2, Copy, Download, ExternalLink, Eye, Info, RotateCcw } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { bundle, generate, type GeneratedCode } from '../codegen/generate'
import { highlightLines, type Lang } from '../codegen/highlight'
import type { Project } from '../model/types'
import { useEditor } from '../store/editor'
import { DEVICE_WIDTH, useWorkspace, type CodeTab } from '../store/workspace'
import { downloadFile } from '../utils/download'
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
  return (
    <div className="pm-dock-inner">
      <div className="pm-tabs" role="tablist" aria-label="Aperçu et code">
        <button type="button" role="tab" aria-selected={tab === 'preview'} className="pm-tab" onClick={() => set({ dockTab: 'preview' })}>
          <Eye size={15} /> Aperçu
        </button>
        <button type="button" role="tab" aria-selected={tab === 'code'} className="pm-tab" onClick={() => set({ dockTab: 'code' })}>
          <Code2 size={15} /> Code
        </button>
        <span className="pm-live-dot" data-tip="Mis à jour en temps réel">
          en direct
        </span>
      </div>
      {tab === 'preview' ? <Preview /> : <CodeView />}
    </div>
  )
}

function Preview() {
  const code = useGeneratedCode()
  const device = useWorkspace((s) => s.device)
  const name = useEditor((s) => s.project.name)
  const [reloadKey, setReloadKey] = useState(0)
  const html = useMemo(() => bundle(code), [code])
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
          {name} · {width ? `${width} px` : 'pleine largeur'}
        </span>
        <IconButton label="Recommencer (remet les variables à zéro)" onClick={() => setReloadKey((k) => k + 1)}>
          <RotateCcw size={15} />
        </IconButton>
        <IconButton label="Ouvrir dans un nouvel onglet" onClick={openInTab}>
          <ExternalLink size={15} />
        </IconButton>
      </div>
      <div className="pm-preview-stage">
        <iframe
          key={reloadKey}
          title="Aperçu interactif du projet"
          className="pm-preview-frame"
          style={{ width: width ? width : '100%' }}
          sandbox="allow-scripts allow-modals allow-popups allow-forms"
          srcDoc={html}
        />
      </div>
    </div>
  )
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

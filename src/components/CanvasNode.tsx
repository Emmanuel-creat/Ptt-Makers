import { createContext, memo, useContext, type ReactNode } from 'react'
import { BRICKS } from '../model/bricks'
import { SVG_ATTRS, iconNode } from '../model/icons'
import { PLACEHOLDER_IMAGE, brickClass } from '../codegen/baseCss'
import { safeImageSrc, videoSource } from '../codegen/escape'
import { proHtml, tabbarIcons } from '../codegen/proBricks'
import { isListLike } from '../model/collections'
import { effectiveStyle, reactStyle } from '../codegen/style'
import type { BrickNode, Variable } from '../model/types'
import { interpolate, parseTemplate, resolveToken, type RepeatScope } from '../model/variables'
import { useEditor } from '../store/editor'
import { useWorkspace, type Device } from '../store/workspace'

/** Copie de répétition en cours de rendu : l'élément affiché et s'il s'agit d'une copie (non modifiable). */
interface RepeatFrame extends RepeatScope {
  copy: boolean
}
const RepeatContext = createContext<RepeatFrame | null>(null)

/** Nombre maximal de copies dessinées dans la zone de création. */
const MAX_CANVAS_COPIES = 3

/** Affiche un texte en remplaçant {{variable}} par sa valeur de départ, surlignée. */
function DynamicText({ text, variables, scope }: { text: string; variables: Variable[]; scope?: RepeatScope | null }) {
  const parts = parseTemplate(text)
  if (parts.every((p) => p.kind === 'text')) return <>{text}</>
  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === 'text') return p.value
        const value = resolveToken(p.name, variables, scope ?? undefined)
        const isScope = scope && (p.name === 'position' || p.name.startsWith('element'))
        const known = value != null && value !== ''
        return (
          <mark
            key={i}
            className={`pm-var-mark ${isScope ? 'is-scope' : ''} ${value == null ? 'is-unknown' : ''}`}
            title={isScope ? `« ${p.name} » : rempli pour chaque élément` : value != null ? `Variable « ${p.name} »` : `Variable « ${p.name} » inconnue`}
          >
            {known ? value : `{{${p.name}}}`}
          </mark>
        )
      })}
    </>
  )
}

/**
 * Rendu d'une brique dans la zone de création. Le HTML et les styles sont les mêmes que dans le code
 * généré ; seuls les attributs data-* servent à l'éditeur (sélection, glisser-déposer).
 */
export const CanvasNode = memo(function CanvasNode({ id }: { id: string }) {
  const node = useEditor((s) => s.project.nodes[id])
  const variables = useEditor((s) => s.project.variables)
  const editing = useEditor((s) => s.editingId === id)
  const frame = useContext(RepeatContext)
  const device = useWorkspace((s) => s.device)
  if (!node) return null
  return renderNode(node, variables, editing && !frame?.copy, frame, device)
})

/** Texte modifiable directement dans la zone de création (double-clic). */
function InlineEditor({ node }: { node: BrickNode }) {
  const { updateProps, setEditing } = useEditor.getState()
  const multiline = node.type === 'text'
  const finish = (el: HTMLElement, save: boolean) => {
    const value = (el.innerText ?? '').replace(/\n$/, '')
    if (save && value !== node.props.text) updateProps(node.id, { text: multiline ? value : value.replace(/\n/g, ' ') })
    setEditing(null)
  }
  return (
    <span
      className="pm-inline-edit"
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      ref={(el) => {
        if (el && document.activeElement !== el) {
          el.focus()
          const range = document.createRange()
          range.selectNodeContents(el)
          const sel = window.getSelection()
          sel?.removeAllRanges()
          sel?.addRange(range)
        }
      }}
      onBlur={(e) => finish(e.currentTarget, true)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') {
          e.preventDefault()
          finish(e.currentTarget, false)
        } else if (e.key === 'Enter' && (!multiline || e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
    >
      {String(node.props.text ?? '')}
    </span>
  )
}

const SVG_PROPS = Object.fromEntries(SVG_ATTRS.map(([k, v]) => [k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), v]))

/** Icône dessinée (même SVG que dans le code généré). */
export function IconSvg({ name }: { name: string }) {
  return (
    <svg {...SVG_PROPS} aria-hidden="true">
      {iconNode(name).map(([tag, attrs], i) => {
        const Tag = tag as 'path'
        return <Tag key={i} {...attrs} />
      })}
    </svg>
  )
}

export const INLINE_EDITABLE = new Set(['heading', 'text', 'badge', 'button', 'link'])

function renderNode(node: BrickNode, variables: Variable[], editing: boolean, frame: RepeatFrame | null, device: Device): ReactNode {
  const p = node.props
  // Le style vu dépend du format choisi (réglages propres à la tablette et au mobile).
  const view = effectiveStyle(node, device)
  const def = BRICKS[node.type]
  const condVar = node.showIf ? variables.find((v) => v.name === node.showIf) : undefined
  const conditionalHidden = node.showIf ? !condVar || (Array.isArray(condVar.initial) ? condVar.initial.length === 0 : !condVar.initial) : false
  const copy = !!frame?.copy
  const common = {
    // Les copies d'une répétition ne sont pas sélectionnables : on modifie la première.
    'data-ptt-id': copy ? undefined : node.id,
    'data-ptt-copy': copy ? 'true' : undefined,
    'data-ptt-label': node.name,
    'data-ghost': node.hidden || conditionalHidden || view.hidden ? 'true' : undefined,
    'data-empty': def.container && node.children.length === 0 ? 'true' : undefined,
    className: brickClass(node) || undefined,
    style: node.type === 'modal' ? undefined : reactStyle(node, view.style),
    draggable: node.parent && !editing && !copy ? true : undefined,
  }
  const text = (key: string) =>
    editing && key === 'text' ? <InlineEditor node={node} /> : <DynamicText text={String(p[key] ?? '')} variables={variables} scope={frame} />
  const children = node.children.map((c) => <CanvasNode key={c} id={c} />)
  const bound = (name: unknown) => variables.find((v) => v.name === name)

  switch (node.type) {
    case 'page':
      return <main {...common}>{children}</main>
    case 'section':
      return <section {...common}>{children}</section>
    case 'row':
    case 'stack':
    case 'grid':
    case 'card':
      return <div {...common}>{children}</div>
    case 'repeat': {
      if (frame) return <div {...common}>{children}</div>
      const source = variables.find((v) => v.name === p.source && isListLike(v))
      const items = source && Array.isArray(source.initial) ? source.initial : []
      // Sans élément de départ (ex. données d'API), on montre quand même le modèle une fois.
      const shown: unknown[] = items.length ? items.slice(0, MAX_CANVAS_COPIES) : [undefined]
      return (
        <div {...common} data-ptt-repeat={source ? `${items.length} élément(s) · ${source.name}` : 'Choisis une liste'}>
          {shown.map((element, i) => (
            <RepeatContext.Provider key={i} value={{ element, position: i + 1, copy: i > 0 }}>
              <div className="repeat-item">{children}</div>
            </RepeatContext.Provider>
          ))}
        </div>
      )
    }
    case 'heading': {
      const level = String(p.level)
      if (level === '1') return <h1 {...common}>{text('text')}</h1>
      if (level === '3') return <h3 {...common}>{text('text')}</h3>
      return <h2 {...common}>{text('text')}</h2>
    }
    case 'text':
      return <p {...common}>{text('text')}</p>
    case 'badge':
      return <span {...common}>{text('text')}</span>
    case 'link':
      return (
        <a {...common} href="#" onClick={(e) => e.preventDefault()}>
          {text('text')}
        </a>
      )
    case 'list': {
      const items = String(p.items ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      const lis = items.map((it, i) => (
        <li key={i}>
          <DynamicText text={it} variables={variables} scope={frame} />
        </li>
      ))
      return p.ordered ? <ol {...common}>{lis}</ol> : <ul {...common}>{lis}</ul>
    }
    case 'button':
      return (
        <button type="button" {...common} tabIndex={-1}>
          {text('text')}
        </button>
      )
    case 'input':
    case 'textarea':
    case 'select': {
      const value = bound(p.bind) ? String(bound(p.bind)!.initial) : ''
      const options = String(p.options ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      return (
        <label {...common}>
          <span>{String(p.label ?? '')}</span>
          {node.type === 'input' && (
            <input type={String(p.inputType || 'text')} placeholder={String(p.placeholder ?? '')} value={value} readOnly tabIndex={-1} />
          )}
          {node.type === 'textarea' && <textarea placeholder={String(p.placeholder ?? '')} value={value} readOnly tabIndex={-1} />}
          {node.type === 'select' && (
            <select value={options.includes(value) ? value : options[0]} tabIndex={-1} onChange={() => {}}>
              {options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          )}
        </label>
      )
    }
    case 'checkbox':
      return (
        <label {...common}>
          <input type="checkbox" checked={Boolean(bound(p.bind)?.initial)} readOnly tabIndex={-1} />
          <span>{String(p.label ?? '')}</span>
        </label>
      )
    case 'tabs':
      return <TabsView common={common} node={node} />
    case 'accordion':
      return (
        <div {...common}>
          {node.children.map((c, i) => (
            <AccordionItem key={c} id={c} open={i === 0 && !!p.firstOpen} />
          ))}
        </div>
      )
    case 'modal':
      return (
        <div {...common}>
          <div className="modal-box" style={reactStyle(node, view.style)}>
            <span className="modal-close" aria-hidden="true">
              ×
            </span>
            {children}
          </div>
        </div>
      )
    case 'navbar':
      return (
        <nav {...common}>
          {String(p.brand ?? '').trim() && (
            <strong className="navbar-brand">
              <DynamicText text={String(p.brand)} variables={variables} scope={frame} />
            </strong>
          )}
          <NavbarLinks />
        </nav>
      )
    case 'video': {
      const v = videoSource(String(p.src))
      if (v?.kind === 'file') return <video {...common} src={v.src} muted preload="metadata" />
      return (
        <div {...common} role="img" aria-label={String(p.title || 'Vidéo')}>
          <span
            className="pm-video-poster"
            style={v?.kind === 'youtube' ? { backgroundImage: `url("${v.thumbnail}")` } : undefined}
            data-empty-video={v ? undefined : 'true'}
          >
            <span className="pm-video-play" aria-hidden="true">
              ▶
            </span>
          </span>
        </div>
      )
    }
    case 'icon':
      return (
        <span {...common} aria-hidden="true">
          <IconSvg name={String(p.symbol ?? '')} />
        </span>
      )
    case 'image':
      return (
        <img
          {...common}
          src={safeImageSrc(interpolate(String(p.src), variables, frame ?? undefined)) ?? PLACEHOLDER_IMAGE}
          alt={interpolate(String(p.alt ?? ''), variables, frame ?? undefined)}
        />
      )
    case 'table':
    case 'chart':
    case 'calendar':
    case 'kanban':
    case 'chat':
    case 'stat':
    case 'progress': {
      // Même HTML que dans le code généré ; un envoi de message reste sans effet dans l'éditeur.
      const html = (proHtml(node.type, p, (t) => interpolate(t, variables, frame ?? undefined), variables) ?? []).join('\n')
      return <div {...common} data-moi={node.type === 'chat' ? String(p.me ?? '') || undefined : undefined} onSubmit={(e) => e.preventDefault()} dangerouslySetInnerHTML={{ __html: html }} />
    }
    case 'tabbar':
      return (
        <nav {...common}>
          <TabbarLinks icons={String(p.icons ?? '')} />
        </nav>
      )
    case 'divider':
      return <hr {...common} />
    case 'spacer':
      return <div {...common} />
  }
}

type Common = Record<string, unknown>

/** Onglets : on voit le panneau qui contient la sélection (ou le premier). Cliquer un titre le sélectionne. */
function TabsView({ common, node }: { common: Common; node: BrickNode }) {
  const nodes = useEditor((s) => s.project.nodes)
  const active = useEditor((s) => {
    let cur = s.selectedId
    while (cur && s.project.nodes[cur]?.parent && s.project.nodes[cur].parent !== node.id) cur = s.project.nodes[cur].parent
    return cur && s.project.nodes[cur]?.parent === node.id ? cur : node.children[0]
  })
  return (
    <div {...common}>
      <div className="tabs-bar" role="tablist">
        {node.children.map((c) => (
          <button key={c} type="button" role="tab" aria-selected={c === active} data-ptt-select={c} tabIndex={-1}>
            {nodes[c]?.name}
          </button>
        ))}
      </div>
      {node.children
        .filter((c) => c === active)
        .map((c) => (
          <CanvasNode key={c} id={c} />
        ))}
    </div>
  )
}

/** Volet d'accordéon : toujours ouvert dans la zone de création pour pouvoir modifier son contenu. */
function AccordionItem({ id, open }: { id: string; open: boolean }) {
  const name = useEditor((s) => s.project.nodes[id]?.name)
  return (
    <details className="accordion-item" open data-first-open={open || undefined}>
      <summary data-ptt-select={id} onClick={(e) => e.preventDefault()}>
        {name}
      </summary>
      <CanvasNode id={id} />
    </details>
  )
}

/** Liens de la barre de menu : un par page, celui de la page affichée est mis en valeur. */
function NavbarLinks() {
  const pages = useEditor((s) => s.project.pages)
  const nodes = useEditor((s) => s.project.nodes)
  const current = useEditor((s) => s.currentPage)
  return (
    <div className="navbar-links">
      {pages.map((id) => (
        <a key={id} href="#" className={id === current ? 'is-active' : undefined} onClick={(e) => e.preventDefault()} data-ptt-page={id}>
          {nodes[id]?.name}
        </a>
      ))}
    </div>
  )
}

/** Barre d'onglets : une icône et le nom de chaque page ; un clic ouvre la page dans l'éditeur. */
function TabbarLinks({ icons }: { icons: string }) {
  const pages = useEditor((s) => s.project.pages)
  const nodes = useEditor((s) => s.project.nodes)
  const current = useEditor((s) => s.currentPage)
  const names = tabbarIcons({ icons }, pages.length)
  return (
    <>
      {pages.map((id, i) => (
        <a key={id} href="#" className={id === current ? 'is-active' : undefined} onClick={(e) => e.preventDefault()} data-ptt-page={id}>
          <IconSvg name={names[i]} />
          <span>{nodes[id]?.name}</span>
        </a>
      ))}
    </>
  )
}

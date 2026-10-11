import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowRightToLine,
  Copy,
  FileText,
  Grid3x3,
  LayoutPanelLeft,
  MousePointerClick,
  Monitor,
  Package,
  Palette as PaletteIcon,
  Smartphone,
  Sparkles,
  Tablet,
  Rocket,
  Rows3,
  Trash2,
  Type,
  Zap,
} from 'lucide-react'
import { useContext, useState } from 'react'
import { BRICKS, CATEGORIES, type FieldDef } from '../model/bricks'
import { GRID_COLUMNS, GRID_ROW, isFreeGrid } from '../model/freeGrid'
import { ICON_NAMES, iconLabel, resolveIcon } from '../model/icons'
import { IconSvg } from './CanvasNode'
import { STYLE_PRESETS, resolveTokens, stylePreset, type FontId, type ShadowKind, type StyleTokens } from '../model/styles'
import type { BrickNode, BrickStyle, GridPlace, StyleOverride } from '../model/types'
import { useEditor } from '../store/editor'
import { useWorkspace } from '../store/workspace'
import { repeatOf } from '../model/tree'
import { ActionsEditor, PageSelect } from './ActionsEditor'
import { BrickBadge } from './BrickIcon'
import { ColorInput, NumberInput, SelectInput, TextInput, VariableSelect } from './fields'
import { REPEAT_TOKENS, ScopeTokens } from './scope'
import { IconButton, Row, Section, Segmented, Switch } from './ui'

const TEXT_TYPES = new Set(['page', 'section', 'row', 'stack', 'grid', 'card', 'heading', 'text', 'link', 'badge', 'list', 'button'])

/** Panneau Propriétés : tout ce qu'on peut régler sur la brique sélectionnée. */
export function Inspector() {
  const selectedId = useEditor((s) => s.selectedId)
  const node = useEditor((s) => (s.selectedId ? s.project.nodes[s.selectedId] : null))
  const inRepeat = useEditor((s) => (s.selectedId ? repeatOf(s.project.nodes, s.selectedId) != null : false))
  if (!selectedId || !node) return <NoSelection />
  return (
    <ScopeTokens.Provider value={inRepeat ? REPEAT_TOKENS : NO_TOKENS}>
      <NodeInspector key={node.id} node={node} />
    </ScopeTokens.Provider>
  )
}

const NO_TOKENS: { token: string; hint: string }[] = []

function NoSelection() {
  const rootId = useEditor((s) => s.currentPage)
  const select = useEditor((s) => s.select)
  return (
    <div className="pm-inspector-empty">
      <div className="pm-inspector-empty-icon" aria-hidden="true">
        <MousePointerClick size={26} />
      </div>
      <h3>Aucune brique sélectionnée</h3>
      <p>Clique sur une brique dans la zone de création ou dans les calques pour voir et modifier ses propriétés.</p>
      <button type="button" className="pm-btn pm-btn-secondary" onClick={() => select(rootId)}>
        <FileText size={15} /> Réglages de la page
      </button>
    </div>
  )
}

function NodeInspector({ node }: { node: BrickNode }) {
  const def = BRICKS[node.type]
  const beginner = useWorkspace((s) => s.beginner)
  const { updateNode, updateProps, updateStyle, duplicate, remove, notify, saveComponent } = useEditor.getState()
  const scope = useWorkspace((s) => s.styleScope)
  // Sur un format plus petit, on lit et on écrit seulement ce qui change pour ce format.
  const s: StyleOverride = scope === 'all' ? node.style : (node.responsive?.[scope] ?? {})
  const setStyle = (patch: Partial<StyleOverride>) => updateStyle(node.id, patch, scope)
  const isRoot = !node.parent
  const category = CATEGORIES.find((c) => c.id === def.category)!

  return (
    <div className="pm-inspector" data-cat={def.category}>
      <header className="pm-inspector-head">
        <BrickBadge type={node.type} size="lg" />
        <div className="pm-inspector-title">
          <input
            className="pm-name-input"
            aria-label="Nom de la brique"
            value={node.name}
            onChange={(e) => updateNode(node.id, { name: e.target.value })}
          />
          <div className="pm-inspector-meta">
            <span className="pm-chip" data-cat={def.category}>
              {def.label}
            </span>
            <button
              type="button"
              className="pm-chip pm-chip-id"
              data-tip="Identifiant HTML · cliquer pour copier"
              onClick={() => {
                navigator.clipboard?.writeText(`#${node.id}`).catch(() => {})
                notify(`#${node.id} copié`)
              }}
            >
              #{node.id}
            </button>
          </div>
        </div>
        {!isRoot && (
          <div className="pm-inspector-actions">
            <IconButton label="Enregistrer dans Mes composants" onClick={() => saveComponent(node.id)}>
              <Package size={15} />
            </IconButton>
            <IconButton label="Dupliquer" shortcut="Ctrl+D" onClick={() => duplicate(node.id)}>
              <Copy size={15} />
            </IconButton>
            <IconButton label="Supprimer" shortcut="Suppr" className="is-danger" onClick={() => remove(node.id)}>
              <Trash2 size={15} />
            </IconButton>
          </div>
        )}
      </header>
      {beginner && (
        <p className="pm-inspector-desc">
          {def.description} <span className="pm-muted">Famille : {category.label}.</span>
        </p>
      )}

      <div className="pm-inspector-scroll">
        {def.fields.length > 0 && (
          <Section title="Contenu" icon={<FileText size={15} />}>
            {def.fields.map((f) => (
              <ContentField key={f.key} field={f} node={node} onChange={(v) => updateProps(node.id, { [f.key]: v })} />
            ))}
          </Section>
        )}

        <ScopeBar node={node} />

        <Section title="Mise en page" icon={<LayoutPanelLeft size={15} />}>
          {isRoot && scope === 'all' && <LayoutRow node={node} />}
          {node.place && scope === 'all' && <PlaceRows node={node} />}
          {def.container && node.type !== 'grid' && !isFreeGrid(node) && (
            <>
              <Row label="Direction">
                {() => (
                  <Segmented
                    label="Direction"
                    value={s.direction ?? (node.type === 'row' ? 'row' : 'column')}
                    onChange={(direction) => setStyle({ direction })}
                    options={[
                      { value: 'column', label: 'Verticale', icon: <ArrowDownToLine size={15} /> },
                      { value: 'row', label: 'Horizontale', icon: <ArrowRightToLine size={15} /> },
                    ]}
                  />
                )}
              </Row>
              <Row label="Aligner">
                {(id) => (
                  <SelectInput
                    id={id}
                    value={s.align}
                    placeholder="Étirer (par défaut)"
                    onChange={(v) => setStyle({ align: (v || undefined) as BrickStyle['align'] })}
                    options={[
                      { value: 'start', label: 'Au début' },
                      { value: 'center', label: 'Au centre' },
                      { value: 'end', label: 'À la fin' },
                      { value: 'stretch', label: 'Étirer' },
                    ]}
                  />
                )}
              </Row>
              <Row label="Répartir">
                {(id) => (
                  <SelectInput
                    id={id}
                    value={s.justify}
                    placeholder="Au début (par défaut)"
                    onChange={(v) => setStyle({ justify: (v || undefined) as BrickStyle['justify'] })}
                    options={[
                      { value: 'start', label: 'Au début' },
                      { value: 'center', label: 'Au centre' },
                      { value: 'end', label: 'À la fin' },
                      { value: 'space-between', label: 'Espacer régulièrement' },
                    ]}
                  />
                )}
              </Row>
              <Row label="Retour à la ligne">
                {() => <Switch checked={!!s.wrap} onChange={(wrap) => setStyle({ wrap: wrap || undefined })} label={s.wrap ? 'Oui' : 'Non'} />}
              </Row>
            </>
          )}
          {def.container && (
            <Row label="Écart" help={beginner ? 'Espace entre les briques contenues.' : undefined}>
              {(id) => <NumberInput id={id} value={s.gap} onChange={(gap) => setStyle({ gap })} placeholder="0" />}
            </Row>
          )}
          <div className="pm-row-pair">
            <Row label="Marge intérieure">
              {(id) => <NumberInput id={id} value={s.padding} onChange={(padding) => setStyle({ padding })} placeholder="0" />}
            </Row>
            <Row label="Marge extérieure">
              {(id) => <NumberInput id={id} value={s.margin} onChange={(margin) => setStyle({ margin })} placeholder="0" />}
            </Row>
          </div>
          {!isRoot && (
            <>
              <div className="pm-row-pair">
                <Row label="Largeur">
                  {(id) => <LengthInput id={id} value={s.width} onChange={(width) => setStyle({ width })} />}
                </Row>
                <Row label="Largeur max.">
                  {(id) => <LengthInput id={id} value={s.maxWidth} onChange={(maxWidth) => setStyle({ maxWidth })} />}
                </Row>
              </div>
              <Row label="Hauteur">{(id) => <LengthInput id={id} value={s.height} onChange={(height) => setStyle({ height })} />}</Row>
            </>
          )}
        </Section>

        <Section title="Apparence" icon={<PaletteIcon size={15} />}>
          <Row label="Fond">{(id) => <ColorInput id={id} value={s.background} onChange={(background) => setStyle({ background })} />}</Row>
          <Row label="Couleur du texte">{(id) => <ColorInput id={id} value={s.color} onChange={(color) => setStyle({ color })} />}</Row>
          <div className="pm-row-pair">
            <Row label="Arrondi">
              {(id) => <NumberInput id={id} value={s.borderRadius} onChange={(borderRadius) => setStyle({ borderRadius })} placeholder="0" max={999} />}
            </Row>
            <Row label="Bordure">
              {(id) => <NumberInput id={id} value={s.borderWidth} onChange={(borderWidth) => setStyle({ borderWidth })} placeholder="0" max={20} />}
            </Row>
          </div>
          {!!s.borderWidth && (
            <Row label="Couleur de bordure">
              {(id) => <ColorInput id={id} value={s.borderColor} onChange={(borderColor) => setStyle({ borderColor })} />}
            </Row>
          )}
          <Row label="Ombre">
            {() => (
              <Segmented
                label="Ombre"
                size="sm"
                value={s.shadow ?? 'none'}
                onChange={(shadow) => setStyle({ shadow: shadow === 'none' ? undefined : shadow })}
                options={[
                  { value: 'none', label: 'Aucune' },
                  { value: 'sm', label: 'Légère' },
                  { value: 'md', label: 'Moyenne' },
                  { value: 'lg', label: 'Forte' },
                ]}
              />
            )}
          </Row>
          <Row label="Opacité">
            {(id) => (
              <div className="pm-range">
                <input
                  id={id}
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={s.opacity ?? 1}
                  onChange={(e) => setStyle({ opacity: Number(e.target.value) >= 1 ? undefined : Number(e.target.value) })}
                />
                <span className="pm-mono">{Math.round((s.opacity ?? 1) * 100)} %</span>
              </div>
            )}
          </Row>
        </Section>

        {TEXT_TYPES.has(node.type) && (
          <Section title="Texte" icon={<Type size={15} />} defaultOpen={!def.container}>
            <div className="pm-row-pair">
              <Row label="Taille">
                {(id) => <NumberInput id={id} value={s.fontSize} onChange={(fontSize) => setStyle({ fontSize })} min={8} max={160} />}
              </Row>
              <Row label="Graisse">
                {(id) => (
                  <SelectInput
                    id={id}
                    value={s.fontWeight}
                    placeholder="Auto"
                    onChange={(v) => setStyle({ fontWeight: (v || undefined) as BrickStyle['fontWeight'] })}
                    options={[
                      { value: '400', label: 'Normale' },
                      { value: '500', label: 'Medium' },
                      { value: '600', label: 'Semi-gras' },
                      { value: '700', label: 'Gras' },
                      { value: '800', label: 'Très gras' },
                    ]}
                  />
                )}
              </Row>
            </div>
            <Row label="Alignement">
              {() => (
                <Segmented
                  label="Alignement du texte"
                  value={s.textAlign}
                  onChange={(textAlign) => setStyle({ textAlign: s.textAlign === textAlign ? undefined : textAlign })}
                  options={[
                    { value: 'left', label: 'À gauche', icon: <AlignLeft size={15} /> },
                    { value: 'center', label: 'Centré', icon: <AlignCenter size={15} /> },
                    { value: 'right', label: 'À droite', icon: <AlignRight size={15} /> },
                  ]}
                />
              )}
            </Row>
          </Section>
        )}

        {isRoot && <ThemeSection />}

        {isRoot && (
          <Section
            title="Au chargement de la page"
            icon={<Rocket size={15} />}
            defaultOpen={!!node.onLoad?.length}
            badge={node.onLoad?.length ? <span className="pm-count">{node.onLoad.length}</span> : undefined}
          >
            {beginner && (
              <p className="pm-row-help">
                Ces actions se lancent à chaque fois que la page s'affiche : idéal pour charger des données depuis une API.
              </p>
            )}
            <ActionsEditor id={node.id} field="onLoad" />
          </Section>
        )}

        {!isRoot && (
          <Section
            title="Interactions"
            icon={<Zap size={15} />}
            defaultOpen={node.type === 'button' || node.onClick.length > 0 || !!node.showIf || !!node.hidden}
            badge={node.onClick.length ? <span className="pm-count">{node.onClick.length}</span> : undefined}
          >
            {beginner && (
              <p className="pm-row-help">
                Les actions transforment ta page en application : elles s'exécutent quand on clique sur la brique dans l'aperçu.
              </p>
            )}
            <ActionsEditor id={node.id} />
            <div className="pm-divider" />
            <Row label="Visibilité au démarrage">
              {() => (
                <Switch
                  checked={!node.hidden}
                  onChange={(visible) => updateNode(node.id, { hidden: visible ? undefined : true })}
                  label={node.hidden ? 'Masquée' : 'Visible'}
                />
              )}
            </Row>
            <Row label="Afficher seulement si" help="La brique est visible quand cette variable est vraie (ou non vide).">
              {(id) => <VariableSelect id={id} value={node.showIf} onChange={(v) => updateNode(node.id, { showIf: v || undefined })} placeholder="Toujours" />}
            </Row>
          </Section>
        )}
      </div>
    </div>
  )
}

/** Page : briques empilées (comme un document) ou posées librement sur une grille. */
function LayoutRow({ node }: { node: BrickNode }) {
  const beginner = useWorkspace((s) => s.beginner)
  const grid = isFreeGrid(node)
  const change = (value: 'pile' | 'grille') => {
    const on = value === 'grille'
    // Chaque brique garde à peu près sa hauteur actuelle en passant sur la grille.
    const rows: Record<string, number> = {}
    if (on) {
      const pageEl = document.querySelector(`.pm-frame [data-ptt-id="${CSS.escape(node.id)}"]`)
      const gap = node.style.gap ?? 0
      for (const c of node.children) {
        const el = pageEl?.querySelector(`[data-ptt-id="${CSS.escape(c)}"]`)
        const h = el?.getBoundingClientRect().height
        if (h) rows[c] = Math.max(1, Math.round((h + gap) / (GRID_ROW + gap)))
      }
    }
    useEditor.getState().setLayout(node.id, on, rows)
  }
  return (
    <Row
      label="Disposition"
      help={
        grid
          ? 'Glisse une brique où tu veux : elle se pose sur la case la plus proche. La poignée en bas à droite change sa taille. Sur mobile, les briques s’empilent.'
          : beginner
            ? 'Sur une grille, tu poses chaque brique où tu veux (en haut à gauche, au centre…).'
            : undefined
      }
    >
      {() => (
        <Segmented
          label="Disposition"
          value={grid ? 'grille' : 'pile'}
          onChange={change}
          options={[
            { value: 'pile', label: 'En pile', icon: <Rows3 size={15} /> },
            { value: 'grille', label: 'Sur une grille', icon: <Grid3x3 size={15} /> },
          ]}
        />
      )}
    </Row>
  )
}

/** Brique posée sur une page en grille : sa case et sa taille, en colonnes et en rangées. */
function PlaceRows({ node }: { node: BrickNode }) {
  const place = node.place!
  const setPlace = (patch: Partial<GridPlace>) => useEditor.getState().setPlace(node.id, patch)
  return (
    <>
      <div className="pm-row-pair">
        <Row label="Colonne">
          {(id) => <NumberInput id={id} value={place.col} unit="" min={1} max={GRID_COLUMNS} onChange={(col) => col && setPlace({ col })} />}
        </Row>
        <Row label="Rangée">
          {(id) => <NumberInput id={id} value={place.row} unit="" min={1} max={500} onChange={(row) => row && setPlace({ row })} />}
        </Row>
      </div>
      <div className="pm-row-pair">
        <Row label="Largeur (colonnes)">
          {(id) => <NumberInput id={id} value={place.w} unit="" min={1} max={GRID_COLUMNS} onChange={(w) => w && setPlace({ w })} />}
        </Row>
        <Row label="Hauteur (rangées)">
          {(id) => <NumberInput id={id} value={place.h} unit="" min={1} max={60} onChange={(h) => h && setPlace({ h })} />}
        </Row>
      </div>
    </>
  )
}

function ContentField({ field: f, node, onChange }: { field: FieldDef; node: BrickNode; onChange: (v: string | number | boolean) => void }) {
  const value = node.props[f.key]
  const inRepeat = useContext(ScopeTokens).length > 0
  const tip = inRepeat
    ? 'Astuce : {{element}} affiche l’élément de la liste, {{element.nom}} un de ses champs, {{position}} son numéro.'
    : 'Astuce : {{nom}} affiche la valeur d’une variable.'
  if (f.kind === 'boolean') {
    return <Row label={f.label}>{() => <Switch checked={!!value} onChange={onChange} label={value ? 'Oui' : 'Non'} />}</Row>
  }
  return (
    <Row label={f.label} help={f.help ?? (f.dynamic ? tip : undefined)} stacked>
      {(id) => {
        switch (f.kind) {
          case 'select':
            return <SelectInput id={id} value={String(value ?? '')} options={f.options ?? []} onChange={onChange} />
          case 'number':
            return <NumberInput id={id} value={Number(value) || undefined} unit="" min={1} max={12} onChange={(v) => onChange(v ?? 1)} />
          case 'variable':
            return <VariableSelect id={id} value={String(value ?? '') || undefined} onChange={onChange} kinds={f.kinds} />
          case 'icon':
            return <IconInput id={id} value={String(value ?? '')} onChange={onChange} />
          case 'page':
            return <PageSelect id={id} value={String(value ?? '')} onChange={onChange} placeholder="Aucune (utiliser l’adresse)" />
          case 'textarea':
            return <TextInput id={id} value={String(value ?? '')} onChange={onChange} multiline dynamic={f.dynamic} placeholder={f.placeholder} />
          default:
            return <TextInput id={id} value={String(value ?? '')} onChange={onChange} dynamic={f.dynamic} placeholder={f.placeholder} />
        }
      }}
    </Row>
  )
}

/** Longueur libre : « 300 », « 50% », « auto »… */
function LengthInput({ id, value, onChange }: { id?: string; value: string | undefined; onChange: (v: string | undefined) => void }) {
  return (
    <input
      id={id}
      className="pm-input pm-mono"
      placeholder="auto"
      value={value ?? ''}
      list="pm-length-suggestions"
      onChange={(e) => onChange(e.target.value.trim() || undefined)}
    />
  )
}

const SCOPE_INFO = {
  tablet: 'Ces réglages ne s’appliquent qu’en dessous de 900 px de large (tablette et mobile).',
  mobile: 'Ces réglages ne s’appliquent qu’en dessous de 600 px de large (mobile).',
}

/** Choix du format dont on règle le style : tous les écrans, tablette ou mobile. */
function ScopeBar({ node }: { node: BrickNode }) {
  const scope = useWorkspace((s) => s.styleScope)
  const set = useWorkspace((s) => s.set)
  const updateStyle = useEditor((s) => s.updateStyle)
  const count = (k: 'tablet' | 'mobile') => Object.keys(node.responsive?.[k] ?? {}).length
  return (
    <div className="pm-scope">
      <p className="pm-scope-label">
        Style pour : <strong>{scope === 'all' ? 'tous les écrans' : scope === 'tablet' ? 'tablette et mobile' : 'mobile'}</strong>
      </p>
      <Segmented
        label="Format réglé"
        size="sm"
        value={scope}
        onChange={(styleScope) => set({ styleScope, device: styleScope === 'all' ? 'desktop' : styleScope })}
        options={[
          { value: 'all', label: 'Tous les écrans', icon: <Monitor size={14} /> },
          { value: 'tablet', label: `Tablette${count('tablet') ? ` · ${count('tablet')}` : ''}`, icon: <Tablet size={14} /> },
          { value: 'mobile', label: `Mobile${count('mobile') ? ` · ${count('mobile')}` : ''}`, icon: <Smartphone size={14} /> },
        ]}
      />
      {scope !== 'all' && (
        <div className="pm-scope-info">
          <p>{SCOPE_INFO[scope]}</p>
          {node.parent && (
            <Switch
              checked={!!node.responsive?.[scope]?.hide}
              onChange={(hide) => updateStyle(node.id, { hide: hide || undefined }, scope)}
              label="Masquer sur ce format"
            />
          )}
        </div>
      )}
    </div>
  )
}

const FONTS: { value: FontId; label: string }[] = [
  { value: 'inter', label: 'Inter (par défaut)' },
  { value: 'system', label: 'Police du système' },
  { value: 'arrondie', label: 'Arrondie' },
  { value: 'serif', label: 'Avec empattements (classique)' },
  { value: 'mono', label: 'Machine à écrire' },
  { value: 'grotesque', label: 'Grotesque (titres forts)' },
  { value: 'editoriale', label: 'Éditoriale (magazine)' },
  { value: 'geometrique', label: 'Géométrique (moderne)' },
  { value: 'manuscrite', label: 'Manuscrite' },
]

const SHADOW_KINDS: { value: ShadowKind; label: string }[] = [
  { value: 'aucune', label: 'Aucune (plat)' },
  { value: 'douce', label: 'Douce' },
  { value: 'portee', label: 'Portée (flottante)' },
  { value: 'relief', label: 'Relief (néomorphisme)' },
  { value: 'decalee', label: 'Décalée (néobrutalisme)' },
  { value: 'verre', label: 'Verre (reflet)' },
]

/** Petit aperçu d'un style : son fond, une surface et sa couleur principale. */
function StyleSwatch({ tokens }: { tokens: Partial<StyleTokens> }) {
  return (
    <span className="pm-style-sw" style={{ background: tokens.background ?? '#ffffff' }} aria-hidden="true">
      <span style={{ background: tokens.surface ?? '#ffffff', borderRadius: Math.min(8, tokens.cardRadius ?? 6), border: tokens.borderWidth ? `1px solid ${tokens.border}` : undefined }} />
      <span style={{ background: tokens.accent ?? '#6c5ce7' }} />
    </span>
  )
}

/** Studio de style : un style prêt à l'emploi pour tout le projet, puis chaque réglage à la main. */
function ThemeSection() {
  const theme = useEditor((s) => s.project.theme)
  const chooseStyle = useEditor((s) => s.chooseStyle)
  const updateTokens = useEditor((s) => s.updateTokens)
  const adopt = useEditor((s) => s.adoptStyle)
  const t = resolveTokens(theme)
  const set = <K extends keyof StyleTokens>(k: K) => (v: StyleTokens[K] | undefined) => updateTokens({ [k]: v } as Partial<StyleTokens>)
  const color = (k: 'accent' | 'onAccent' | 'background' | 'surface' | 'text' | 'muted' | 'bar' | 'onBar' | 'border', label: string, help?: string) => (
    <Row label={label} help={help}>{(id) => <ColorInput id={id} value={t[k]} onChange={set(k)} />}</Row>
  )
  const custom = Object.keys(theme?.tokens ?? {}).length > 0
  return (
    <Section title="Style du projet" icon={<Sparkles size={15} />} defaultOpen={false} badge={theme?.style ? <span className="pm-section-note">{stylePreset(theme.style)?.name}</span> : undefined}>
      <p className="pm-row-help">Un style habille toutes les pages d'un coup : couleurs, surfaces, relief, flou, arrondis et polices.</p>
      <div className="pm-style-grid" role="listbox" aria-label="Styles proposés">
        <button type="button" role="option" aria-selected={!theme?.style} className="pm-style-opt" onClick={() => chooseStyle(null)}>
          <StyleSwatch tokens={{}} />
          <span>Sans style</span>
        </button>
        {STYLE_PRESETS.map((p) => (
          <button key={p.id} type="button" role="option" aria-selected={theme?.style === p.id} className="pm-style-opt" data-tip={p.origin} onClick={() => chooseStyle(p.id)}>
            <StyleSwatch tokens={p.tokens} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
      <div className="pm-style-actions">
        <button type="button" className="pm-btn pm-btn-secondary" onClick={adopt} data-tip="Retire les couleurs, bordures, ombres et arrondis donnés à la main aux briques">
          Adapter toutes les briques au style
        </button>
        {custom && (
          <button
            type="button"
            className="pm-btn pm-btn-ghost"
            onClick={() => updateTokens(Object.fromEntries(Object.keys(theme?.tokens ?? {}).map((k) => [k, undefined])) as Partial<StyleTokens>)}
          >
            Revenir aux réglages du style
          </button>
        )}
      </div>

      <h4 className="pm-sub">Couleurs</h4>
      {color('accent', 'Couleur principale')}
      {color('onAccent', 'Texte sur la couleur principale')}
      {color('background', 'Fond des pages', 'Une couleur ou un dégradé, par exemple linear-gradient(160deg, #ff6a3d, #7a2cff).')}
      {color('surface', 'Surfaces (cartes, champs, fenêtres)')}
      {color('text', 'Texte')}
      {color('muted', 'Texte secondaire')}
      {color('bar', 'Barre de menu')}
      {color('onBar', 'Texte de la barre de menu')}
      {color('border', 'Bordures')}
      <Row label="Ambiance">
        {() => (
          <Segmented
            label="Ambiance"
            size="sm"
            value={t.dark ? 'sombre' : 'claire'}
            onChange={(v) => set('dark')(v === 'sombre')}
            options={[
              { value: 'claire', label: 'Claire' },
              { value: 'sombre', label: 'Sombre' },
            ]}
          />
        )}
      </Row>

      <h4 className="pm-sub">Formes</h4>
      <Row label="Épaisseur des bordures">{(id) => <NumberInput id={id} value={t.borderWidth} placeholder="1" max={8} onChange={set('borderWidth')} />}</Row>
      <Row label="Arrondi des cartes">{(id) => <NumberInput id={id} value={t.cardRadius} placeholder="14" max={60} onChange={set('cardRadius')} />}</Row>
      <Row label="Arrondi des boutons et champs" help="999 donne des boutons en pilule.">
        {(id) => <NumberInput id={id} value={t.radius} placeholder="10" max={999} onChange={set('radius')} />}
      </Row>

      <h4 className="pm-sub">Relief et verre</h4>
      <Row label="Relief">
        {(id) => <SelectInput id={id} value={t.shadow ?? 'douce'} options={SHADOW_KINDS} onChange={(v) => set('shadow')(v as ShadowKind)} />}
      </Row>
      <Row label="Intensité du relief">
        {() => (
          <Segmented
            label="Intensité du relief"
            size="sm"
            value={String(t.depth ?? 1) as '1' | '2' | '3'}
            onChange={(v) => set('depth')(Number(v))}
            options={[
              { value: '1', label: 'Léger' },
              { value: '2', label: 'Moyen' },
              { value: '3', label: 'Fort' },
            ]}
          />
        )}
      </Row>
      <Row label="Flou derrière les surfaces" help="Effet verre : visible quand le fond est un dégradé ou une image.">
        {(id) => <NumberInput id={id} value={t.blur} placeholder="0" max={40} onChange={set('blur')} />}
      </Row>

      <h4 className="pm-sub">Polices</h4>
      <Row label="Police du texte">{(id) => <SelectInput id={id} value={t.font ?? 'inter'} options={FONTS} onChange={(v) => set('font')(v as FontId)} />}</Row>
      <Row label="Police des titres">
        {(id) => <SelectInput id={id} value={t.headingFont ?? t.font ?? 'inter'} options={FONTS} onChange={(v) => set('headingFont')(v as FontId)} />}
      </Row>
    </Section>
  )
}

/** Choix d'une icône dessinée, avec une recherche par nom. */
function IconInput({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState('')
  const current = resolveIcon(value)
  const q = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const shown = ICON_NAMES.filter((n) => !q || n.includes(q) || iconLabel(n).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q))
  return (
    <div className="pm-icon-pick">
      <input
        id={id}
        className="pm-input"
        value={query}
        placeholder={`Chercher (actuelle : ${iconLabel(current)})`}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Chercher une icône"
      />
      <div className="pm-icon-grid" role="listbox" aria-label="Icônes proposées">
        {shown.map((n) => (
          <button
            key={n}
            type="button"
            role="option"
            aria-selected={n === current}
            aria-label={iconLabel(n)}
            data-tip={iconLabel(n)}
            className="pm-icon-opt"
            onClick={() => onChange(n)}
          >
            <IconSvg name={n} />
          </button>
        ))}
        {shown.length === 0 && <span className="pm-muted">Aucune icône ne correspond.</span>}
      </div>
    </div>
  )
}

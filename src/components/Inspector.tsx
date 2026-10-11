import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowRightToLine,
  Copy,
  FileText,
  LayoutPanelLeft,
  MousePointerClick,
  Palette as PaletteIcon,
  Rocket,
  Trash2,
  Type,
  Zap,
} from 'lucide-react'
import { useContext } from 'react'
import { BRICKS, CATEGORIES, type FieldDef } from '../model/bricks'
import type { BrickNode, BrickStyle } from '../model/types'
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
  const { updateNode, updateProps, updateStyle, duplicate, remove, notify } = useEditor.getState()
  const s = node.style
  const setStyle = (patch: Partial<BrickStyle>) => updateStyle(node.id, patch)
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

        <Section title="Mise en page" icon={<LayoutPanelLeft size={15} />}>
          {def.container && node.type !== 'grid' && (
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

import { applyView, fieldsOf, formatField, isCollection, recordsOf, viewOptions } from '../model/collections'
import { formulaIsNumber, readRecordField } from '../model/expressions'
import { iconSvg } from '../model/icons'
import type { BrickType, CollectionField, DataRecord, PropValue, Variable } from '../model/types'
import { escapeHtml, safeHref, safeImageSrc } from './escape'

/**
 * Briques pro (tableau, graphique, calendrier, kanban, discussion, chiffre clé, progression).
 * Chaque fonction renvoie les lignes HTML du contenu de la brique : le code généré les place
 * dans la balise de la brique, et la zone de création affiche exactement le même HTML.
 */

type Props = Record<string, PropValue>
/** Remplace les {{variables}} par leur valeur de départ. */
type Fill = (text: string) => string

const lines = (s: unknown) =>
  String(s ?? '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)

/** Découpe « a ; b ; c » en cellules. */
const cells = (line: string) => line.split(';').map((c) => c.trim())

/** Sépare « Étiquette : valeur » au premier deux-points. */
function pair(line: string): [string, string] {
  const i = line.indexOf(':')
  return i < 0 ? [line.trim(), ''] : [line.slice(0, i).trim(), line.slice(i + 1).trim()]
}

/** Nombre écrit à la française (virgule, espaces) ou avec un point. */
export function parseNumber(s: string): number {
  const n = Number(String(s).replace(/[\s  ]/g, '').replace(',', '.').replace(/[^\d.+-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** 1250.5 → « 1 250,5 » (deux décimales au plus). */
export function formatNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100
  const [int, dec] = Math.abs(rounded).toString().split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${rounded < 0 ? '-' : ''}${grouped}${dec ? ',' + dec : ''}`
}

/* --------------------------------- Tableau -------------------------------- */

export function tableHtml(p: Props, fill: Fill): string[] {
  const head = cells(String(p.columns ?? ''))
  const body = lines(p.rows).map(cells)
  const width = Math.max(head.length, ...body.map((r) => r.length), 1)
  const out = ['<table>']
  if (head.some(Boolean)) {
    out.push('  <thead>', '    <tr>')
    for (let i = 0; i < width; i++) {
      const label = escapeHtml(fill(head[i] ?? ''))
      out.push(p.sortable ? `      <th scope="col"><button type="button">${label}</button></th>` : `      <th scope="col">${label}</th>`)
    }
    out.push('    </tr>', '  </thead>')
  }
  out.push('  <tbody>')
  for (const row of body) {
    out.push(`    <tr>${Array.from({ length: width }, (_, i) => `<td>${escapeHtml(fill(row[i] ?? ''))}</td>`).join('')}</tr>`)
  }
  out.push('  </tbody>', '</table>')
  return out
}

/** Une cellule d'un tableau relié à une collection (le script généré suit la même règle). */
export function recordCellHtml(value: unknown, field: CollectionField): string {
  if (field.type === 'image') {
    const src = safeImageSrc(String(value ?? ''))
    return src ? `<img class="table-img" src="${escapeHtml(src)}" alt="">` : ''
  }
  if (field.type === 'link' && value) {
    const href = String(value)
    return `<a href="${escapeHtml(safeHref(href))}" target="_blank" rel="noopener">${escapeHtml(href.replace(/^https?:\/\//i, ''))}</a>`
  }
  return escapeHtml(formatField(value, field.type))
}

/** Un champ calculé s'affiche comme un nombre ou comme un texte, selon sa formule. */
export const shownField = (f: CollectionField): CollectionField => (f.type === 'formula' ? { ...f, type: formulaIsNumber(f) ? 'number' : 'text' } : f)

/** Tableau relié à une collection : une colonne par champ, une ligne par fiche. */
export function collectionTableHtml(p: Props, fields: CollectionField[], records: DataRecord[]): string[] {
  const out: string[] = []
  // Sélection : une barre (cachée tant que rien n'est coché) et une colonne de cases.
  if (p.selectable) {
    out.push(
      '<div class="table-bar" hidden>',
      '  <span class="table-count"></span>',
      '  <button type="button" class="table-delete">Supprimer la sélection</button>',
      '</div>',
    )
  }
  out.push('<table>', '  <thead>', '    <tr>')
  if (p.selectable) out.push('      <th scope="col" class="table-select"><input type="checkbox" aria-label="Tout sélectionner"></th>')
  for (const f of fields) {
    const label = escapeHtml(f.label)
    out.push(p.sortable ? `      <th scope="col"><button type="button">${label}</button></th>` : `      <th scope="col">${label}</th>`)
  }
  if (p.rowDelete) out.push('      <th scope="col"><span class="table-actions-title">Actions</span></th>')
  out.push('    </tr>', '  </thead>', '  <tbody>')
  for (const r of records) {
    const tds = fields.map((f) => `<td>${recordCellHtml(readRecordField(r, f.name, fields), shownField(f))}</td>`)
    if (p.selectable) tds.unshift('<td class="table-select"><input type="checkbox" aria-label="Sélectionner cette ligne"></td>')
    if (p.rowDelete) tds.push('<td><button type="button" class="table-delete">Supprimer</button></td>')
    out.push(`    <tr>${tds.join('')}</tr>`)
  }
  out.push('  </tbody>', '</table>')
  const empty = escapeHtml(String(p.empty ?? '').trim() || 'Aucune donnée pour le moment.')
  out.push(`<p class="table-empty"${records.length ? ' hidden' : ''}>${empty}</p>`)
  return out
}

/** La collection affichée par un tableau, si sa propriété « source » en désigne une. */
export function tableSource(p: Props, variables: Variable[]): Variable | undefined {
  const v = variables.find((x) => x.name === p.source)
  return isCollection(v) ? v : undefined
}

/* -------------------------------- Graphique ------------------------------- */

export type ChartKind = 'barres' | 'courbe' | 'anneau'

export function chartData(p: Props): { label: string; value: number }[] {
  return lines(p.data).map((l) => {
    const [label, raw] = pair(l)
    return { label, value: parseNumber(raw) }
  })
}

/** Pas de l'échelle : un nombre rond (1, 2 ou 5 × 10ⁿ) pour 5 graduations au plus. */
export function niceStep(max: number): number {
  if (max <= 0) return 1
  const raw = max / 5
  const pow = 10 ** Math.floor(Math.log10(raw))
  for (const m of [1, 2, 5, 10]) if (m * pow >= raw) return m * pow
  return 10 * pow
}

const r1 = (n: number) => Math.round(n * 10) / 10

export function chartHtml(p: Props): string[] {
  const data = chartData(p)
  const kind: ChartKind = p.kind === 'courbe' || p.kind === 'anneau' ? p.kind : 'barres'
  const unit = String(p.unit ?? '').trim()
  const fmt = (n: number) => `${formatNumber(n)}${unit ? ' ' + unit : ''}`
  const kindLabel = kind === 'barres' ? 'en barres' : kind === 'courbe' ? 'en courbe' : 'en anneau'
  const summary = `Graphique ${kindLabel} : ${data.map((d) => `${d.label} ${fmt(d.value)}`).join(', ') || 'aucune donnée'}`
  const label = escapeHtml(summary)

  if (kind === 'anneau') {
    const sum = data.reduce((s, d) => s + Math.max(0, d.value), 0)
    const total = sum || 1
    const r = 70
    const c = 2 * Math.PI * r
    let offset = 0
    const out = [`<svg viewBox="0 0 220 220" role="img" aria-label="${label}">`]
    out.push(`  <circle class="chart-track" cx="110" cy="110" r="${r}"></circle>`)
    data.forEach((d, i) => {
      const len = (Math.max(0, d.value) / total) * c
      out.push(
        `  <circle class="chart-slice serie-${(i % 6) + 1}" cx="110" cy="110" r="${r}" stroke-dasharray="${r1(len)} ${r1(c - len)}" stroke-dashoffset="${r1(-offset)}" transform="rotate(-90 110 110)"></circle>`,
      )
      offset += len
    })
    // Au centre, le total (sauf pour des pourcentages, qui font toujours 100 %).
    if (unit !== '%') out.push(`  <text class="chart-total" x="110" y="116" text-anchor="middle">${escapeHtml(fmt(sum))}</text>`)
    out.push('</svg>')
    out.push('<ul class="chart-legend">')
    data.forEach((d, i) => {
      out.push(`  <li><span class="chart-key serie-${(i % 6) + 1}"></span>${escapeHtml(d.label)} <strong>${escapeHtml(fmt(d.value))}</strong></li>`)
    })
    out.push('</ul>')
    return out
  }

  const W = 400
  const H = 220
  const left = 40
  const bottom = 190
  const top = 16
  const step = niceStep(Math.max(0, ...data.map((d) => d.value)))
  const ticks = Math.max(1, Math.ceil(Math.max(0, ...data.map((d) => d.value)) / step))
  const max = step * ticks
  const y = (v: number) => r1(bottom - (Math.max(0, v) / max) * (bottom - top))
  const out = [`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">`]
  for (let i = 0; i <= ticks; i++) {
    const v = step * i
    out.push(`  <line class="chart-grid" x1="${left}" y1="${y(v)}" x2="${W - 8}" y2="${y(v)}"></line>`)
    out.push(`  <text class="chart-axis" x="${left - 6}" y="${y(v) + 4}" text-anchor="end">${escapeHtml(formatNumber(v))}</text>`)
  }
  const n = Math.max(data.length, 1)
  const slot = (W - 8 - left) / n
  const cx = (i: number) => r1(left + slot * i + slot / 2)
  if (kind === 'barres') {
    const bw = r1(Math.min(48, slot * 0.6))
    data.forEach((d, i) => {
      out.push(`  <rect class="chart-bar serie-1" x="${r1(cx(i) - bw / 2)}" y="${y(d.value)}" width="${bw}" height="${r1(bottom - y(d.value))}" rx="4"></rect>`)
      if (p.showValues) out.push(`  <text class="chart-value" x="${cx(i)}" y="${y(d.value) - 6}" text-anchor="middle">${escapeHtml(fmt(d.value))}</text>`)
    })
  } else if (data.length) {
    const pts = data.map((d, i) => `${cx(i)},${y(d.value)}`)
    out.push(`  <path class="chart-area serie-1" d="M${cx(0)},${bottom} L${pts.join(' L')} L${cx(data.length - 1)},${bottom} Z"></path>`)
    out.push(`  <polyline class="chart-line serie-1" points="${pts.join(' ')}"></polyline>`)
    data.forEach((d, i) => {
      out.push(`  <circle class="chart-dot serie-1" cx="${cx(i)}" cy="${y(d.value)}" r="4"></circle>`)
      if (p.showValues) out.push(`  <text class="chart-value" x="${cx(i)}" y="${y(d.value) - 10}" text-anchor="middle">${escapeHtml(fmt(d.value))}</text>`)
    })
  }
  data.forEach((d, i) => out.push(`  <text class="chart-axis" x="${cx(i)}" y="${bottom + 18}" text-anchor="middle">${escapeHtml(d.label)}</text>`))
  out.push('</svg>')
  return out
}

/* -------------------------------- Calendrier ------------------------------ */

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const DAYS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

/** « 2026-10 » → année et mois (0 à 11) ; sinon le mois en cours. */
export function calendarMonth(value: unknown, today = new Date()): { year: number; month: number } {
  const m = String(value ?? '').trim().match(/^(\d{4})-(\d{1,2})$/)
  if (m && +m[2] >= 1 && +m[2] <= 12) return { year: +m[1], month: +m[2] - 1 }
  return { year: today.getFullYear(), month: today.getMonth() }
}

export function calendarHtml(p: Props, fill: Fill, today = new Date()): string[] {
  const { year, month } = calendarMonth(p.month, today)
  const events = new Map<number, string[]>()
  for (const l of lines(p.events)) {
    const [day, what] = pair(l)
    const d = Number.parseInt(day, 10)
    if (d >= 1 && d <= 31 && what) events.set(d, [...(events.get(d) ?? []), what])
  }
  const count = new Date(year, month + 1, 0).getDate()
  const lead = (new Date(year, month, 1).getDay() + 6) % 7
  const out = [`<p class="calendar-title">${MONTHS[month]} ${year}</p>`, '<table>', '  <thead>']
  out.push(`    <tr>${DAYS.map((d) => `<th scope="col">${d}</th>`).join('')}</tr>`)
  out.push('  </thead>', '  <tbody>')
  const slots: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)]
  while (slots.length % 7) slots.push(null)
  for (let w = 0; w < slots.length; w += 7) {
    const tds = slots.slice(w, w + 7).map((d) => {
      if (d == null) return '<td></td>'
      const ev = events.get(d)
      if (!ev) return `<td><span class="calendar-day">${d}</span></td>`
      return `<td class="has-event"><span class="calendar-day">${d}</span>${ev.map((e) => `<span class="calendar-event">${escapeHtml(fill(e))}</span>`).join('')}</td>`
    })
    out.push(`    <tr>${tds.join('')}</tr>`)
  }
  out.push('  </tbody>', '</table>')
  return out
}

/* ---------------------------------- Kanban -------------------------------- */

export function kanbanColumns(p: Props): { title: string; cards: string[] }[] {
  return lines(p.columns).map((l) => {
    const [title, rest] = pair(l)
    return { title, cards: rest ? cells(rest).filter(Boolean) : [] }
  })
}

export function kanbanHtml(p: Props, fill: Fill): string[] {
  const out: string[] = []
  for (const col of kanbanColumns(p)) {
    out.push('<div class="kanban-col">')
    out.push(`  <p class="kanban-title">${escapeHtml(fill(col.title))} <span class="kanban-count">${col.cards.length}</span></p>`)
    out.push('  <ul class="kanban-cards">')
    for (const card of col.cards) {
      out.push(
        `    <li class="kanban-card" draggable="true"><span>${escapeHtml(fill(card))}</span><button type="button" class="kanban-move" aria-label="Passer à la colonne suivante">→</button></li>`,
      )
    }
    out.push('  </ul>')
    out.push('</div>')
  }
  return out
}

/* -------------------------------- Discussion ------------------------------ */

export function chatHtml(p: Props, fill: Fill): string[] {
  const me = String(p.me ?? '').trim().toLowerCase()
  const out = ['<div class="chat-messages" role="log" aria-live="polite">']
  for (const l of lines(p.messages)) {
    const [author, text] = pair(l)
    const mine = !!me && author.toLowerCase() === me
    out.push(`  <div class="chat-msg${mine ? ' is-me' : ''}">`)
    out.push(`    <span class="chat-author">${escapeHtml(fill(author))}</span>`)
    out.push(`    <p class="chat-bubble">${escapeHtml(fill(text))}</p>`)
    out.push('  </div>')
  }
  out.push('</div>')
  if (p.composer) {
    out.push('<form class="chat-form">')
    out.push(`  <input type="text" aria-label="Écrire un message" placeholder="${escapeHtml(String(p.placeholder ?? ''))}">`)
    out.push('  <button type="submit" class="btn btn-primary">Envoyer</button>')
    out.push('</form>')
  }
  return out
}

/* --------------------------- Chiffre clé, progression --------------------- */

export function statHtml(p: Props, fill: Fill): string[] {
  const delta = fill(String(p.delta ?? '')).trim()
  const trend = delta.startsWith('-') || delta.startsWith('−') ? ' is-down' : delta ? ' is-up' : ''
  const out: string[] = []
  const icon = String(p.symbol ?? '').trim()
  if (icon) out.push(`<span class="stat-icon" aria-hidden="true">${iconSvg(icon)}</span>`)
  out.push(`<span class="stat-label">${escapeHtml(fill(String(p.label ?? '')))}</span>`)
  out.push(`<strong class="stat-value">${escapeHtml(fill(String(p.value ?? '')))}</strong>`)
  if (delta) out.push(`<span class="stat-delta${trend}">${escapeHtml(delta)}</span>`)
  return out
}

/** Valeur de la barre de progression, ramenée entre 0 et 100. */
export const progressValue = (raw: string) => Math.min(100, Math.max(0, parseNumber(raw)))

export function progressHtml(p: Props, fill: Fill): string[] {
  const label = escapeHtml(fill(String(p.label ?? '')))
  const value = progressValue(fill(String(p.value ?? '')))
  return [
    '<div class="progress-head">',
    `  <span>${label}</span>`,
    `  <span class="progress-value">${formatNumber(value)} %</span>`,
    '</div>',
    `<progress max="100" value="${value}" aria-label="${label}">${formatNumber(value)} %</progress>`,
  ]
}

/* ------------------------------ Barre d'onglets ---------------------------- */

/** Icône de chaque page de la barre d'onglets (une par ligne, dans l'ordre des pages). */
export function tabbarIcons(p: Props, count: number): string[] {
  const given = lines(p.icons)
  const fallback = ['maison', 'recherche', 'message', 'personne', 'reglages']
  return Array.from({ length: count }, (_, i) => given[i] || fallback[i % fallback.length])
}

/** Contenu HTML d'une brique pro (sauf la barre d'onglets, qui dépend des pages), ou null pour les autres briques. */
export function proHtml(type: BrickType, p: Props, fill: Fill, variables: Variable[] = []): string[] | null {
  switch (type) {
    case 'table': {
      const source = tableSource(p, variables)
      if (!source) return tableHtml(p, fill)
      const fields = fieldsOf(source)
      return collectionTableHtml(p, fields, applyView(recordsOf(source), fields, viewOptions(p, variables, fill)) as DataRecord[])
    }
    case 'chart':
      return chartHtml(p)
    case 'calendar':
      return calendarHtml(p, fill)
    case 'kanban':
      return kanbanHtml(p, fill)
    case 'chat':
      return chatHtml(p, fill)
    case 'stat':
      return statHtml(p, fill)
    case 'progress':
      return progressHtml(p, fill)
    default:
      return null
  }
}

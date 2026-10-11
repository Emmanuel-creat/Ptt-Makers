import { resolveIcon } from './icons'
import type { BrickNode } from './types'

/**
 * Format des projets enregistrés. Chaque projet garde le format avec lequel il a été écrit ;
 * à l'ouverture, les étapes de mise à niveau s'enchaînent jusqu'au format actuel.
 *
 * 1 : un seul écran (avant les pages multiples), sans liste « pages ».
 * 2 : plusieurs pages ; les icônes pouvaient être des emoji.
 * 3 : icônes dessinées seulement, briques complètes (listes d'enfants et d'actions), numéro de version de l'application.
 */
export const PROJECT_FORMAT = 3

type Raw = Record<string, unknown> & { nodes?: Record<string, Partial<BrickNode>>; pages?: unknown; rootId?: unknown; format?: unknown }

const STEPS: Record<number, (p: Raw) => Raw> = {
  // 1 → 2 : la liste des pages, avec la page d'accueil en premier.
  1: (p) => {
    const nodes = p.nodes ?? {}
    const root = String(p.rootId ?? '')
    const listed = Array.isArray(p.pages) ? (p.pages as unknown[]).map(String) : []
    const pages = listed.filter((id, i) => nodes[id]?.type === 'page' && !nodes[id]?.parent && listed.indexOf(id) === i)
    if (nodes[root] && !pages.includes(root)) pages.unshift(root)
    return { ...p, pages }
  },
  // 2 → 3 : briques complètes, icônes emoji remplacées par les icônes dessinées, enfants disparus retirés.
  2: (p) => {
    const nodes: Record<string, Partial<BrickNode>> = {}
    for (const [id, raw] of Object.entries(p.nodes ?? {})) {
      if (!raw || typeof raw !== 'object') continue
      const n: Partial<BrickNode> = { ...raw, id: typeof raw.id === 'string' ? raw.id : id }
      n.children = Array.isArray(n.children) ? n.children : []
      n.onClick = Array.isArray(n.onClick) ? n.onClick : []
      n.props = n.props && typeof n.props === 'object' ? { ...n.props } : {}
      n.style = n.style && typeof n.style === 'object' ? n.style : {}
      if (typeof n.name !== 'string') n.name = n.id!
      if (n.parent === undefined) n.parent = null
      if ((n.type === 'icon' || n.type === 'stat') && n.props.symbol !== undefined) n.props.symbol = resolveIcon(n.props.symbol)
      nodes[id] = n
    }
    for (const n of Object.values(nodes)) n.children = n.children!.filter((c) => typeof c === 'string' && nodes[c])
    return { ...p, nodes, appVersion: typeof p.appVersion === 'string' ? p.appVersion : '1.0.0' }
  },
}

export interface Migration {
  project: Raw | null
  /** Format d'origine, s'il a fallu mettre le projet à niveau. */
  from?: number
  /** Projet écrit par une version plus récente de Ptt-Makers. */
  tooNew?: boolean
}

/** Met un projet lu (fichier, navigateur, lien) au format actuel, étape par étape. */
export function migrateProject(value: unknown): Migration {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { project: null }
  let p = value as Raw
  const format = typeof p.format === 'number' && Number.isInteger(p.format) && p.format >= 1 ? p.format : Array.isArray(p.pages) ? 2 : 1
  if (format > PROJECT_FORMAT) return { project: null, tooNew: true }
  for (let f = format; f < PROJECT_FORMAT; f++) p = STEPS[f](p)
  // La liste des pages est toujours revérifiée : un fichier modifié à la main peut l'avoir abîmée.
  p = { ...STEPS[1](p), format: PROJECT_FORMAT }
  return format < PROJECT_FORMAT ? { project: p, from: format } : { project: p }
}

/** Numéro de version d'une application : « 1.4.2 » (majeure, mineure, correctif). */
export const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)$/

/** Le numéro suivant : un correctif, une évolution (mineure) ou une nouvelle version majeure. */
export function bumpVersion(version: string | undefined, kind: 'correctif' | 'evolution' | 'majeure'): string {
  const m = VERSION_RE.exec(version ?? '') ?? [null, '1', '0', '0']
  const [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (kind === 'majeure') return `${major + 1}.0.0`
  if (kind === 'evolution') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

import { parseProject } from '../model/templates'
import type { Project } from '../model/types'

/** Résumé d'un projet enregistré dans le navigateur (pour « Mes projets »). */
export interface ProjectMeta {
  id: string
  name: string
  updatedAt: number
  pages: number
}

const INDEX_KEY = 'ptt-makers:projets'
const CURRENT_KEY = 'ptt-makers:projet-actuel'
/** Clé de la version 1.0, qui ne gardait qu'un seul projet. */
export const LEGACY_KEY = 'ptt-makers:projet'
const projectKey = (id: string) => `ptt-makers:projet:${id}`

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  } catch {
    /* stockage plein ou bloqué : on ignore */
  }
}

export const newProjectId = () => `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function listProjects(): ProjectMeta[] {
  const list = read<ProjectMeta[]>(INDEX_KEY)
  return Array.isArray(list) ? [...list].sort((a, b) => b.updatedAt - a.updatedAt) : []
}

export function readProject(id: string): Project | null {
  return parseProject(read(projectKey(id)))
}

export function writeProject(id: string, project: Project) {
  write(projectKey(id), project)
  const meta: ProjectMeta = { id, name: project.name, updatedAt: Date.now(), pages: project.pages.length }
  write(INDEX_KEY, [meta, ...listProjects().filter((m) => m.id !== id)])
}

export function removeStoredProject(id: string) {
  try {
    localStorage.removeItem(projectKey(id))
  } catch {
    /* ignoré */
  }
  write(INDEX_KEY, listProjects().filter((m) => m.id !== id))
}

export const currentProjectId = () => read<string>(CURRENT_KEY)
export const setCurrentProjectId = (id: string) => write(CURRENT_KEY, JSON.stringify(id))

/** Reprend le projet unique de la version 1.0 comme premier projet de la liste. */
export function migrateLegacy() {
  if (read(INDEX_KEY)) return
  const legacy = parseProject(read(LEGACY_KEY))
  if (!legacy) return
  const id = newProjectId()
  writeProject(id, legacy)
  setCurrentProjectId(id)
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* ignoré */
  }
}

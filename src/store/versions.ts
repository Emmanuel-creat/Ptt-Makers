import { parseProject } from '../model/templates'
import type { Project } from '../model/types'

/** Une version nommée d'un projet : une photo du projet à un moment choisi. */
export interface Version {
  id: string
  name: string
  at: number
  /** Enregistrée toute seule (avant de revenir à une autre version). */
  auto?: boolean
  project: Project
}

/** Au-delà, les plus anciennes versions automatiques partent d'abord, puis les plus anciennes tout court. */
export const MAX_VERSIONS = 30

const key = (projectId: string) => `ptt-makers:versions:${projectId}`

export function listVersions(projectId: string): Version[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key(projectId)) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.flatMap((v) => {
      const project = parseProject(v?.project)
      return project && typeof v.name === 'string' ? [{ id: String(v.id), name: v.name, at: Number(v.at) || 0, auto: !!v.auto, project }] : []
    })
  } catch {
    return []
  }
}

function write(projectId: string, list: Version[]): boolean {
  try {
    localStorage.setItem(key(projectId), JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

/** Enregistre une version (la plus récente en premier). Renvoie false si le navigateur n'a plus de place. */
export function saveVersion(projectId: string, name: string, project: Project, auto = false): Version | null {
  const version: Version = {
    id: `v-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || 'Sans nom',
    at: Date.now(),
    ...(auto ? { auto } : {}),
    project: structuredClone(project),
  }
  const list = [version, ...listVersions(projectId)]
  while (list.length > MAX_VERSIONS) {
    const oldestAuto = list.findLastIndex((v) => v.auto)
    list.splice(oldestAuto > 0 ? oldestAuto : list.length - 1, 1)
  }
  return write(projectId, list) ? version : null
}

export function removeVersion(projectId: string, versionId: string) {
  write(projectId, listVersions(projectId).filter((v) => v.id !== versionId))
}

export function removeAllVersions(projectId: string) {
  try {
    localStorage.removeItem(key(projectId))
  } catch {
    /* ignoré */
  }
}

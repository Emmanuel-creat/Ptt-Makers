import { beforeEach, describe, expect, it } from 'vitest'
import { buildProject } from '../model/templates'
import { MAX_VERSIONS, listVersions, removeAllVersions, removeVersion, saveVersion } from './versions'

describe('versions nommées', () => {
  beforeEach(() => localStorage.clear())

  it('enregistre, liste et supprime les versions d’un projet', () => {
    const project = buildProject('Essai', {}, [])
    const a = saveVersion('p1', 'Première', project)!
    saveVersion('p1', '  ', { ...project, name: 'Changé' })
    saveVersion('p2', 'Autre projet', project)
    const list = listVersions('p1')
    expect(list.map((v) => v.name)).toEqual(['Sans nom', 'Première'])
    expect(list[0].project.name).toBe('Changé')
    removeVersion('p1', a.id)
    expect(listVersions('p1')).toHaveLength(1)
    removeAllVersions('p1')
    expect(listVersions('p1')).toEqual([])
    expect(listVersions('p2')).toHaveLength(1)
  })

  it('garde au plus MAX_VERSIONS versions, en retirant d’abord les automatiques', () => {
    const project = buildProject('Essai', {}, [])
    saveVersion('p', 'à garder', project)
    saveVersion('p', 'auto', project, true)
    for (let i = 0; i < MAX_VERSIONS - 1; i++) saveVersion('p', `v${i}`, project)
    const names = listVersions('p').map((v) => v.name)
    expect(names).toHaveLength(MAX_VERSIONS)
    expect(names).toContain('à garder')
    expect(names).not.toContain('auto')
  })

  it('ignore un stockage abîmé', () => {
    localStorage.setItem('ptt-makers:versions:x', '{pas du json')
    expect(listVersions('x')).toEqual([])
  })
})

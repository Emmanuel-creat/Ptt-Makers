import { describe, expect, it } from 'vitest'
import { bumpVersion, migrateProject, PROJECT_FORMAT } from './migrate'
import { parseProject } from './templates'

/** Un projet tel que l'écrivait la version 1.0 : une seule page, pas de format, une icône emoji. */
const V1 = {
  version: 1,
  name: 'Ancien',
  rootId: 'page',
  variables: [],
  nodes: {
    page: { id: 'page', type: 'page', name: 'Page', props: { title: 'Ancien' }, style: {}, children: ['icone-1', 'disparu'], parent: null, onClick: [] },
    'icone-1': { id: 'icone-1', type: 'icon', name: 'Icône', props: { symbol: '⭐' }, style: {}, parent: 'page' },
  },
}

describe('numéros de version et mise à niveau des projets', () => {
  it('met un projet de la version 1.0 au format actuel', () => {
    const m = migrateProject(structuredClone(V1))
    expect(m.from).toBe(1)
    const p = parseProject(structuredClone(V1))!
    expect(p.format).toBe(PROJECT_FORMAT)
    expect(p.pages).toEqual(['page'])
    expect(p.nodes.page.children).toEqual(['icone-1'])
    expect(p.nodes['icone-1'].onClick).toEqual([])
    expect(p.nodes['icone-1'].children).toEqual([])
    expect(p.nodes['icone-1'].props.symbol).toBe('etoile')
    expect(p.appVersion).toBe('1.0.0')
  })

  it('refuse un projet écrit par une version plus récente, et un objet qui n’est pas un projet', () => {
    expect(migrateProject({ ...V1, format: PROJECT_FORMAT + 1 }).tooNew).toBe(true)
    expect(parseProject({ ...V1, format: PROJECT_FORMAT + 1 })).toBeNull()
    expect(parseProject([1, 2])).toBeNull()
    expect(parseProject({ version: 2 })).toBeNull()
  })

  it('calcule le numéro suivant', () => {
    expect(bumpVersion('1.4.2', 'correctif')).toBe('1.4.3')
    expect(bumpVersion('1.4.2', 'evolution')).toBe('1.5.0')
    expect(bumpVersion('1.4.2', 'majeure')).toBe('2.0.0')
    expect(bumpVersion(undefined, 'evolution')).toBe('1.1.0')
  })
})

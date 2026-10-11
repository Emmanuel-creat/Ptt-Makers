import { describe, expect, it } from 'vitest'
import { BUSINESS_TEMPLATES } from './businessTemplates'
import { TEMPLATES, TEMPLATE_FAMILIES } from './templates'
import { interpolate } from './variables'

describe('modèles de gestion', () => {
  it.each(BUSINESS_TEMPLATES.map((t) => t.id))('les chiffres clés du modèle %s se calculent', (id) => {
    const project = BUSINESS_TEMPLATES.find((t) => t.id === id)!.create()
    const stats = Object.values(project.nodes).filter((n) => n.type === 'stat')
    expect(stats.length).toBeGreaterThan(0)
    for (const s of stats) {
      const value = interpolate(String(s.props.value), project.variables)
      expect(value, `${id} : ${s.props.label}`).not.toMatch(/NaN|undefined|\{\{|^\s*€?\s*$/)
    }
    expect(Object.values(project.nodes).some((n) => n.type === 'table')).toBe(true)
  })

  it('la facture calcule la TVA et le TTC', () => {
    const project = BUSINESS_TEMPLATES.find((t) => t.id === 'facturation')!.create()
    expect(interpolate('{{arrondi(somme(lignes.total_ht), 2)}}', project.variables)).toBe('1 940')
    expect(interpolate('{{arrondi(somme(lignes.total_ttc), 2)}}', project.variables)).toBe('2 284')
  })

  it('chaque modèle a un identifiant unique et une famille connue', () => {
    const ids = TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of TEMPLATES) expect(TEMPLATE_FAMILIES.map((f) => f.id)).toContain(t.family)
  })
})

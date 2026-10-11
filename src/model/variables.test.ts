import { describe, expect, it } from 'vitest'
import { countVariableUses, renameVariableInNodes } from './refactor'
import { buildProject } from './templates'
import { coerce, interpolate, parseTemplate, toVariableName } from './variables'

describe('variables', () => {
  it('découpe un texte dynamique', () => {
    expect(parseTemplate('Bonjour {{ prenom }} !')).toEqual([
      { kind: 'text', value: 'Bonjour ' },
      { kind: 'var', name: 'prenom' },
      { kind: 'text', value: ' !' },
    ])
  })

  it('remplace par la valeur initiale et laisse les inconnues', () => {
    const vars = [{ name: 'n', kind: 'number' as const, initial: 3 }]
    expect(interpolate('{{n}} / {{x}}', vars)).toBe('3 / {{x}}')
  })

  it('convertit les saisies', () => {
    expect(coerce('4,5', 'number')).toBe(4.5)
    expect(coerce('abc', 'number')).toBe(0)
    expect(coerce('true', 'boolean')).toBe(true)
  })

  it('fabrique des noms valides', () => {
    expect(toVariableName('Mon prénom')).toBe('Mon_prenom')
    expect(toVariableName('2 choses')).toBe('_2_choses')
    expect(toVariableName('  ')).toBe('')
  })

  it('renomme une variable partout', () => {
    const p = buildProject(
      'T',
      {},
      [
        { type: 'text', props: { text: 'Salut {{nom}}' }, showIf: 'nom' },
        { type: 'input', props: { bind: 'nom' } },
        { type: 'button', onClick: [{ type: 'set', variable: 'nom', value: 'x' }, { type: 'alert', message: '{{nom}}' }] },
      ],
      [{ name: 'nom', kind: 'text', initial: '' }],
    )
    expect(countVariableUses(p.nodes, 'nom')).toBe(5)
    const n = renameVariableInNodes(p.nodes, 'nom', 'prenom')
    expect(n['texte-1'].props.text).toBe('Salut {{prenom}}')
    expect(n['texte-1'].showIf).toBe('prenom')
    expect(n['champ-1'].props.bind).toBe('prenom')
    expect(n['bouton-1'].onClick).toEqual([
      { type: 'set', variable: 'prenom', value: 'x' },
      { type: 'alert', message: '{{prenom}}' },
    ])
    expect(countVariableUses(n, 'nom')).toBe(0)
  })
})

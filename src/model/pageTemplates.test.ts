import { describe, expect, it } from 'vitest'
import { generate } from '../codegen/generate'
import { buildProject } from './appBuilder'
import { PAGE_TEMPLATES, addPageTemplate } from './pageTemplates'
import { findProblems } from './problems'

describe('gabarits de pages', () => {
  it.each(PAGE_TEMPLATES.map((t) => [t.name, t] as const))('« %s » s’ajoute sans erreur et donne du code valide', (_, template) => {
    const start = buildProject('Projet', {}, [{ type: 'heading', props: { text: 'Accueil', level: '1' } }])
    const { project, firstPage } = addPageTemplate(start, template)
    expect(project.pages.length).toBe(1 + template.pages().length)
    expect(project.pages[0]).toBe('page')
    expect(project.nodes[firstPage].name).toBe(template.pages()[0].name)
    expect(findProblems(project).filter((p) => p.level === 'erreur')).toEqual([])
    const { js } = generate(project, { debug: true })
    expect(() => new Function(js)).not.toThrow()
  })

  it('relie les pages entre elles et à la page d’accueil, et renomme une variable de type différent', () => {
    const start = buildProject('Projet', {}, [], [{ name: 'utilisateur', kind: 'number', initial: 0 }])
    const login = addPageTemplate(start, PAGE_TEMPLATES.find((t) => t.id === 'connexion')!).project
    expect(login.variables.map((v) => v.name)).toContain('utilisateur_2')
    const actions = Object.values(login.nodes).flatMap((n) => n.onClick)
    expect(actions.filter((a) => a.type === 'navigate').every((a) => a.type === 'navigate' && a.page === 'page')).toBe(true)
    expect(actions.some((a) => a.type === 'login' && a.variable === 'utilisateur_2')).toBe(true)

    const list = addPageTemplate(login, PAGE_TEMPLATES.find((t) => t.id === 'liste-detail')!).project
    const [, , liste, detail] = list.pages
    const all = Object.values(list.nodes).flatMap((n) => n.onClick)
    expect(all.some((a) => a.type === 'navigate' && a.page === detail && a.value === '{{element.nom}}')).toBe(true)
    expect(all.some((a) => a.type === 'navigate' && a.page === liste)).toBe(true)
    expect(list.nodes[detail].props.paramVar).toBe('fiche_choisie')
  })
})

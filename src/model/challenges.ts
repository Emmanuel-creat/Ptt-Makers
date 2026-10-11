import { forEachNodeAction } from './actions'
import { BRICKS } from './bricks'
import type { Action, BrickNode, BrickType, Project } from './types'
import { parseTemplate } from './variables'

/** Un défi guidé : un objectif découpé en étapes vérifiées automatiquement sur le projet. */
export interface ChallengeStep {
  label: string
  hint: string
  done: (p: Project) => boolean
}

export interface Challenge {
  id: string
  name: string
  goal: string
  level: 1 | 2 | 3
  steps: ChallengeStep[]
}

const bricks = (p: Project, type?: BrickType) => Object.values(p.nodes).filter((n) => !type || n.type === type)
const has = (p: Project, type: BrickType) => bricks(p, type).length > 0

const allActions = (p: Project): Action[] => {
  const list: Action[] = []
  for (const n of bricks(p)) {
    forEachNodeAction(n, (a) => list.push(a))
  }
  return list
}
const hasAction = (p: Project, test: (a: Action) => boolean) => allActions(p).some(test)

const varsOf = (p: Project, kind: string) => p.variables.filter((v) => v.kind === kind).map((v) => v.name)

/** Une brique dont le texte affiche l'une des variables données ({{nom}}). */
const showsVariable = (p: Project, names: string[]) =>
  bricks(p).some((n: BrickNode) =>
    ['text', 'label', 'title'].some((k) =>
      parseTemplate(String(n.props[k] ?? '')).some((part) => part.kind === 'var' && names.includes(part.name)),
    ),
  )

export const CHALLENGES: Challenge[] = [
  {
    id: 'premiere-page',
    name: 'Ma première page',
    goal: 'Un titre à toi et un bouton.',
    level: 1,
    steps: [
      { label: 'Ajoute un titre', hint: 'Famille Texte, brique « Titre ».', done: (p) => has(p, 'heading') },
      {
        label: 'Écris ton propre titre',
        hint: 'Double-clique le titre dans la zone de création, ou change « Texte » dans les propriétés.',
        done: (p) => bricks(p, 'heading').some((n) => n.props.text !== BRICKS.heading.defaultProps.text && String(n.props.text).trim() !== ''),
      },
      { label: 'Ajoute un bouton', hint: 'Famille Interaction, brique « Bouton ».', done: (p) => has(p, 'button') },
      {
        label: 'Donne-lui une couleur de fond',
        hint: 'Propriétés du bouton, partie Apparence, « Fond ».',
        done: (p) => bricks(p, 'button').some((n) => !!n.style.background),
      },
    ],
  },
  {
    id: 'compteur',
    name: 'Un bouton qui compte',
    goal: 'Chaque clic ajoute 1 à un nombre affiché.',
    level: 1,
    steps: [
      { label: 'Crée une variable Nombre', hint: 'Onglet Variables à gauche, type « Nombre ».', done: (p) => varsOf(p, 'number').length > 0 },
      {
        label: 'Affiche-la dans un texte',
        hint: 'Écris {{nom}} dans le texte d’un titre ou d’un paragraphe.',
        done: (p) => showsVariable(p, varsOf(p, 'number')),
      },
      {
        label: 'Ajoute 1 au clic sur un bouton',
        hint: 'Propriétés du bouton, « Ajouter une action au clic » : « Ajouter un nombre à une variable ».',
        done: (p) => hasAction(p, (a) => a.type === 'add' && varsOf(p, 'number').includes(a.variable)),
      },
    ],
  },
  {
    id: 'bonjour',
    name: 'Bonjour, prénom !',
    goal: 'Un champ où l’on tape son prénom, et un texte qui dit bonjour.',
    level: 1,
    steps: [
      { label: 'Ajoute un champ texte', hint: 'Famille Interaction, « Champ texte ».', done: (p) => has(p, 'input') },
      {
        label: 'Relie-le à une variable',
        hint: 'Crée une variable Texte « prenom », puis choisis-la dans « Enregistrer dans la variable ».',
        done: (p) => bricks(p, 'input').some((n) => varsOf(p, 'text').includes(String(n.props.bind ?? ''))),
      },
      {
        label: 'Écris « Bonjour {{prenom}} »',
        hint: 'Dans un paragraphe, avec le nom de ta variable entre doubles accolades.',
        done: (p) => {
          const bound = bricks(p, 'input').map((n) => String(n.props.bind ?? ''))
          return showsVariable(p, bound.filter(Boolean))
        },
      },
    ],
  },
  {
    id: 'courses',
    name: 'Ma liste de courses',
    goal: 'On ajoute des articles et chacun s’affiche dans la liste.',
    level: 2,
    steps: [
      { label: 'Crée une variable Liste', hint: 'Onglet Variables, type « Liste ».', done: (p) => varsOf(p, 'list').length > 0 },
      {
        label: 'Ajoute une Répétition sur cette liste',
        hint: 'Famille Structure, « Répétition », puis choisis ta liste dans « Liste à parcourir ».',
        done: (p) => bricks(p, 'repeat').some((n) => varsOf(p, 'list').includes(String(n.props.source ?? ''))),
      },
      {
        label: 'Affiche {{element}} dans la répétition',
        hint: 'Mets un paragraphe dans la répétition avec le texte {{element}}.',
        done: (p) => bricks(p).some((n) => /\{\{\s*element/.test(String(n.props.text ?? ''))),
      },
      {
        label: 'Un bouton ajoute un article',
        hint: '« Ajouter une action au clic » : « Ajouter un élément à une liste ».',
        done: (p) => hasAction(p, (a) => a.type === 'listAdd'),
      },
    ],
  },
  {
    id: 'deux-pages',
    name: 'Un site de deux pages',
    goal: 'Deux pages et un moyen de passer de l’une à l’autre.',
    level: 2,
    steps: [
      { label: 'Ajoute une deuxième page', hint: 'Bouton « + Page » au-dessus de la zone de création.', done: (p) => p.pages.length >= 2 },
      {
        label: 'Ajoute une Barre de menu',
        hint: 'Famille Structure, « Barre de menu » : elle montre un lien par page.',
        done: (p) => has(p, 'navbar'),
      },
      {
        label: 'Un bouton mène à une autre page',
        hint: '« Ajouter une action au clic » : « Aller sur une page ».',
        done: (p) => hasAction(p, (a) => a.type === 'navigate'),
      },
    ],
  },
  {
    id: 'fenetre',
    name: 'La fenêtre surprise',
    goal: 'Un bouton ouvre une fenêtre par-dessus la page.',
    level: 3,
    steps: [
      { label: 'Ajoute une Fenêtre', hint: 'Famille Structure, « Fenêtre ».', done: (p) => has(p, 'modal') },
      {
        label: 'Un bouton l’ouvre',
        hint: '« Ajouter une action au clic » : « Afficher une brique », puis choisis la fenêtre.',
        done: (p) => {
          const modals = bricks(p, 'modal').map((n) => n.id)
          return hasAction(p, (a) => (a.type === 'show' || a.type === 'toggle') && modals.includes(a.target))
        },
      },
      {
        label: 'Choisis un thème pour le projet',
        hint: 'Sélectionne la page, puis « Thème du projet » dans les propriétés.',
        done: (p) => !!p.theme?.primary,
      },
    ],
  },
]

export const challengeProgress = (c: Challenge, p: Project) => c.steps.map((s) => s.done(p))

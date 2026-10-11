import { BRICKS } from './bricks'
import { makeNode, type Nodes } from './tree'
import type { Action, BrickStyle, BrickType, Project, PropValue, Variable } from './types'

/** Description compacte d'un arbre de briques pour écrire les modèles. */
interface Spec {
  type: BrickType
  ref?: string
  name?: string
  props?: Record<string, PropValue>
  style?: BrickStyle
  hidden?: boolean
  showIf?: string
  /** Les cibles peuvent s'écrire « @ref » pour viser une autre brique du modèle. */
  onClick?: Action[]
  children?: Spec[]
}

export const ROOT_ID = 'page'

export function buildProject(
  name: string,
  page: { title?: string; style?: BrickStyle },
  children: Spec[],
  variables: Variable[] = [],
): Project {
  const root = {
    ...makeNode({}, 'page', { props: { title: page.title ?? name }, style: page.style, name: 'Page' }),
    id: ROOT_ID,
  }
  let nodes: Nodes = { [ROOT_ID]: root }
  const refs = new Map<string, string>()
  const pending: { id: string; actions: Action[] }[] = []

  const add = (spec: Spec, parentId: string) => {
    const node = makeNode(nodes, spec.type, { props: spec.props, style: spec.style, name: spec.name })
    node.parent = parentId
    node.hidden = spec.hidden
    node.showIf = spec.showIf
    nodes = { ...nodes, [node.id]: node, [parentId]: { ...nodes[parentId], children: [...nodes[parentId].children, node.id] } }
    if (spec.ref) refs.set(spec.ref, node.id)
    if (spec.onClick) pending.push({ id: node.id, actions: spec.onClick })
    spec.children?.forEach((c) => add(c, node.id))
  }
  children.forEach((c) => add(c, ROOT_ID))

  for (const { id, actions } of pending) {
    nodes[id] = {
      ...nodes[id],
      onClick: actions.map((a) =>
        'target' in a && a.target.startsWith('@') ? { ...a, target: refs.get(a.target.slice(1)) ?? a.target } : a,
      ),
    }
  }
  return { version: 1, name, rootId: ROOT_ID, nodes, variables }
}

export interface Template {
  id: string
  name: string
  description: string
  /** Couleur d'accent de la vignette. */
  accent: string
  create: () => Project
}

const H = (text: string, level: '1' | '2' | '3', style?: BrickStyle): Spec => ({
  type: 'heading',
  props: { text, level },
  style,
})
const P = (text: string, style?: BrickStyle): Spec => ({ type: 'text', props: { text }, style })

export const TEMPLATES: Template[] = [
  {
    id: 'vierge',
    name: 'Page vierge',
    description: 'Une page blanche pour partir de zéro.',
    accent: '#94a3b8',
    create: () => buildProject('Nouveau projet', {}, []),
  },
  {
    id: 'accueil',
    name: "Page d'accueil",
    description: 'Présente une idée avec un grand titre, des boutons et trois atouts.',
    accent: '#6c5ce7',
    create: () =>
      buildProject('Page d’accueil', { title: 'Mon super projet', style: { padding: 0, gap: 0, background: '#ffffff', color: '#1b1d29' } }, [
        {
          type: 'section',
          name: 'Bandeau',
          style: { padding: 56, gap: 18, align: 'center', textAlign: 'center', background: '#f3f1ff', borderRadius: 0 },
          children: [
            { type: 'badge', props: { text: '✨ Nouveau' }, style: { margin: 0 } },
            H('Donne vie à tes idées', '1', { maxWidth: '720px' }),
            P('Une phrase courte qui explique ce que ton projet apporte et pourquoi il est utile.', {
              maxWidth: '560px',
              color: '#4b5068',
              fontSize: 18,
            }),
            {
              type: 'row',
              name: 'Boutons',
              style: { justify: 'center', gap: 12 },
              children: [
                { type: 'button', props: { text: 'Découvrir', variant: 'primary' }, onClick: [{ type: 'scrollTo', target: '@atouts' }] },
                {
                  type: 'button',
                  props: { text: 'Nous contacter', variant: 'secondary' },
                  onClick: [{ type: 'alert', message: 'Merci ! On te répond très vite.' }],
                },
              ],
            },
          ],
        },
        {
          type: 'section',
          ref: 'atouts',
          name: 'Atouts',
          style: { padding: 48, gap: 24 },
          children: [
            H('Pourquoi choisir ce projet ?', '2', { textAlign: 'center' }),
            {
              type: 'grid',
              props: { columns: 3 },
              children: [
                ['⚡ Rapide', 'Tout se met en place en quelques minutes.'],
                ['🎨 Personnalisable', 'Couleurs, textes et mise en page à ton image.'],
                ['🤝 Accessible', 'Pensé pour être simple à utiliser par tout le monde.'],
              ].map(
                ([t, d]): Spec => ({
                  type: 'card',
                  children: [H(t, '3'), P(d, { color: '#5b6075' })],
                }),
              ),
            },
          ],
        },
        {
          type: 'section',
          name: 'Pied de page',
          style: { padding: 24, background: '#1b1d29', color: '#c7cad8', align: 'center', borderRadius: 0 },
          children: [P('© 2026 · Fait avec Ptt-Makers', { fontSize: 14 })],
        },
      ]),
  },
  {
    id: 'compteur',
    name: 'Compteur',
    description: 'Découvre les variables : des boutons qui changent un nombre.',
    accent: '#10b981',
    create: () =>
      buildProject(
        'Compteur',
        { style: { padding: 32, align: 'center', justify: 'center', background: '#f5f6fa', color: '#1b1d29' } },
        [
          {
            type: 'card',
            name: 'Carte compteur',
            style: { padding: 32, gap: 16, align: 'center', width: '100%', maxWidth: '420px', shadow: 'md' },
            children: [
              { type: 'badge', props: { text: 'Exemple de variable' } },
              H('Mon compteur', '2'),
              {
                type: 'heading',
                name: 'Valeur',
                props: { text: '{{compteur}}', level: '1' },
                style: { fontSize: 64, color: '#6c5ce7' },
              },
              {
                type: 'row',
                style: { justify: 'center', gap: 10 },
                children: [
                  { type: 'button', props: { text: '− 1', variant: 'secondary' }, onClick: [{ type: 'add', variable: 'compteur', amount: -1 }] },
                  { type: 'button', props: { text: 'Remettre à 0', variant: 'ghost' }, onClick: [{ type: 'set', variable: 'compteur', value: '0' }] },
                  { type: 'button', props: { text: '+ 1', variant: 'primary' }, onClick: [{ type: 'add', variable: 'compteur', amount: 1 }] },
                ],
              },
              P('Clique sur les boutons dans l’aperçu, puis regarde l’onglet JS du code.', {
                fontSize: 14,
                color: '#6b7083',
                textAlign: 'center',
              }),
            ],
          },
        ],
        [{ name: 'compteur', kind: 'number', initial: 0 }],
      ),
  },
  {
    id: 'contact',
    name: 'Formulaire de contact',
    description: 'Des champs reliés à des variables et un message de confirmation.',
    accent: '#0ea5e9',
    create: () =>
      buildProject(
        'Formulaire de contact',
        { style: { padding: 32, align: 'center', background: '#eef6fb', color: '#1b1d29' } },
        [
          {
            type: 'card',
            name: 'Formulaire',
            style: { padding: 28, gap: 14, width: '100%', maxWidth: '480px', shadow: 'md' },
            children: [
              H('Contacte-nous', '2'),
              P('Bonjour {{nom}} ! Laisse-nous un message, on te répond vite.', { color: '#4b5068' }),
              { type: 'input', props: { label: 'Ton prénom', placeholder: 'Ex. Camille', inputType: 'text', bind: 'nom' } },
              { type: 'input', props: { label: 'Ton e-mail', placeholder: 'camille@exemple.fr', inputType: 'email', bind: 'email' } },
              { type: 'textarea', props: { label: 'Ton message', placeholder: 'Écris ici…', bind: 'message' } },
              { type: 'checkbox', props: { label: 'Je veux recevoir la lettre d’information', bind: 'abonne' } },
              {
                type: 'button',
                props: { text: 'Envoyer', variant: 'primary' },
                style: { width: '100%' },
                onClick: [{ type: 'set', variable: 'envoye', value: 'true' }],
              },
              {
                type: 'card',
                name: 'Confirmation',
                showIf: 'envoye',
                style: { padding: 14, background: '#ecfdf5', borderColor: '#a7f3d0', shadow: 'none', color: '#065f46' },
                children: [P('✅ Merci {{nom}}, ton message a bien été envoyé !')],
              },
            ],
          },
        ],
        [
          { name: 'nom', kind: 'text', initial: '' },
          { name: 'email', kind: 'text', initial: '' },
          { name: 'message', kind: 'text', initial: '' },
          { name: 'abonne', kind: 'boolean', initial: false },
          { name: 'envoye', kind: 'boolean', initial: false },
        ],
      ),
  },
  {
    id: 'profil',
    name: 'Carte de profil',
    description: 'Une carte de présentation avec un bouton « Suivre ».',
    accent: '#f59e0b',
    create: () =>
      buildProject(
        'Carte de profil',
        { style: { padding: 32, align: 'center', justify: 'center', background: '#fff7ed', color: '#1b1d29' } },
        [
          {
            type: 'card',
            name: 'Profil',
            style: { padding: 0, gap: 0, width: '100%', maxWidth: '360px', shadow: 'lg', borderWidth: 0 },
            children: [
              { type: 'image', props: { src: '', alt: 'Photo de couverture' }, style: { height: '140px', borderRadius: 14 } },
              {
                type: 'stack',
                style: { padding: 24, gap: 10 },
                children: [
                  H('Alex Martin', '2'),
                  { type: 'badge', props: { text: 'Créateur·rice d’applis' }, style: { background: '#ffedd5', color: '#9a3412' } },
                  P('J’imagine des outils simples pour rendre le numérique plus agréable.', { color: '#4b5068' }),
                  { type: 'text', name: 'Abonnés', props: { text: '{{abonnes}} abonnés' }, style: { fontWeight: '600' } },
                  {
                    type: 'row',
                    style: { gap: 10 },
                    children: [
                      {
                        type: 'button',
                        props: { text: 'Suivre', variant: 'primary' },
                        onClick: [{ type: 'add', variable: 'abonnes', amount: 1 }],
                      },
                      { type: 'link', props: { text: 'Voir le portfolio', href: 'https://example.com', newTab: true } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        [{ name: 'abonnes', kind: 'number', initial: 128 }],
      ),
  },
]

export const createDefaultProject = () => TEMPLATES[1].create()

/** Vérifie grossièrement qu'un objet importé est bien un projet Ptt-Makers. */
export function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false
  const p = value as Project
  if (p.version !== 1 || typeof p.rootId !== 'string' || !p.nodes || !p.nodes[p.rootId] || !Array.isArray(p.variables)) return false
  return Object.values(p.nodes).every(
    (n) => n && typeof n.id === 'string' && n.type in BRICKS && Array.isArray(n.children) && Array.isArray(n.onClick) && typeof n.props === 'object',
  )
}

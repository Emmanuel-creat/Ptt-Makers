import { BRICKS } from './bricks'
import { mapActions } from './actions'
import { makeNode, type Nodes } from './tree'
import type { Action, BrickStyle, BrickType, Project, PropValue, Variable } from './types'

/** Description compacte d'un arbre de briques pour écrire les modèles. */
export interface Spec {
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

/** Une page d'un modèle. */
export interface PageSpec {
  ref?: string
  name: string
  title?: string
  style?: BrickStyle
  /** Actions lancées quand la page s'affiche. */
  onLoad?: Action[]
  children: Spec[]
}

/** Construit un projet de plusieurs pages ; la première est la page d'accueil. */
export function buildApp(name: string, pages: PageSpec[], variables: Variable[] = []): Project {
  let nodes: Nodes = {}
  const refs = new Map<string, string>()
  const pending: { id: string; key: 'onClick' | 'onLoad'; actions: Action[] }[] = []
  const pageIds: string[] = []

  const add = (spec: Spec, parentId: string) => {
    const node = makeNode(nodes, spec.type, { props: spec.props, style: spec.style, name: spec.name })
    node.parent = parentId
    node.hidden = spec.hidden
    node.showIf = spec.showIf
    nodes = { ...nodes, [node.id]: node, [parentId]: { ...nodes[parentId], children: [...nodes[parentId].children, node.id] } }
    if (spec.ref) refs.set(spec.ref, node.id)
    if (spec.onClick) pending.push({ id: node.id, key: 'onClick', actions: spec.onClick })
    spec.children?.forEach((c) => add(c, node.id))
  }

  pages.forEach((page, i) => {
    const made = makeNode(nodes, 'page', { props: { title: page.title ?? (i === 0 ? name : page.name) }, style: page.style, name: page.name })
    const id = i === 0 ? ROOT_ID : made.id
    nodes = { ...nodes, [id]: { ...made, id } }
    pageIds.push(id)
    if (page.ref) refs.set(page.ref, id)
    if (page.onLoad) pending.push({ id, key: 'onLoad', actions: page.onLoad })
    page.children.forEach((c) => add(c, id))
  })

  const resolve = (ref: string) => (ref.startsWith('@') ? (refs.get(ref.slice(1)) ?? ref) : ref)
  for (const { id, key, actions } of pending) {
    nodes[id] = {
      ...nodes[id],
      [key]: mapActions(actions, (a) =>
        'target' in a ? { ...a, target: resolve(a.target) } : a.type === 'navigate' ? { ...a, page: resolve(a.page) } : a,
      ),
    }
  }
  for (const node of Object.values(nodes)) {
    if (node.type === 'link' && typeof node.props.page === 'string' && node.props.page) {
      nodes[node.id] = { ...node, props: { ...node.props, page: resolve(node.props.page) } }
    }
  }
  return { version: 1, name, rootId: ROOT_ID, pages: pageIds, nodes, variables }
}

export function buildProject(
  name: string,
  page: { title?: string; style?: BrickStyle; onLoad?: Action[] },
  children: Spec[],
  variables: Variable[] = [],
): Project {
  return buildApp(name, [{ name: 'Page', title: page.title ?? name, style: page.style, onLoad: page.onLoad, children }], variables)
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
  {
    id: 'taches',
    name: 'Liste de tâches',
    description: 'Une vraie petite appli : ajouter, cocher et retirer des tâches avec une liste.',
    accent: '#8b5cf6',
    create: () =>
      buildProject(
        'Liste de tâches',
        { style: { padding: 32, align: 'center', background: '#f5f3ff', color: '#1b1d29' } },
        [
          {
            type: 'card',
            name: 'Appli tâches',
            style: { padding: 28, gap: 16, width: '100%', maxWidth: '520px', shadow: 'md' },
            children: [
              H('Mes tâches', '2'),
              P('{{taches}} tâche(s) à faire', { color: '#6b7083', fontSize: 14 }),
              {
                type: 'row',
                name: 'Ajout',
                style: { gap: 8, align: 'end', wrap: false },
                children: [
                  { type: 'input', props: { label: 'Nouvelle tâche', placeholder: 'Ex. Réviser les maths', inputType: 'text', bind: 'nouvelle' }, style: { width: '100%' } },
                  {
                    type: 'button',
                    props: { text: 'Ajouter', variant: 'primary' },
                    onClick: [
                      {
                        type: 'if',
                        variable: 'nouvelle',
                        op: 'notEmpty',
                        value: '',
                        then: [
                          { type: 'listAdd', variable: 'taches', value: '{{nouvelle}}' },
                          { type: 'set', variable: 'nouvelle', value: '' },
                        ],
                        else: [{ type: 'alert', message: 'Écris d’abord une tâche.' }],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'repeat',
                name: 'Tâches',
                props: { source: 'taches', columns: 1, empty: 'Bravo, plus rien à faire ! 🎉' },
                style: { gap: 8 },
                children: [
                  {
                    type: 'row',
                    name: 'Ligne de tâche',
                    style: { gap: 10, justify: 'space-between', padding: 10, background: '#f8f7ff', borderRadius: 10, wrap: false },
                    children: [
                      { type: 'text', name: 'Texte de la tâche', props: { text: '{{position}}. {{element}}' } },
                      {
                        type: 'button',
                        props: { text: 'Fait ✓', variant: 'secondary' },
                        onClick: [{ type: 'listRemove', variable: 'taches', which: 'current' }],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'button',
                props: { text: 'Tout effacer', variant: 'ghost' },
                onClick: [{ type: 'listClear', variable: 'taches' }],
              },
            ],
          },
        ],
        [
          { name: 'taches', kind: 'list', initial: ['Découvrir Ptt-Makers', 'Créer ma première appli'] },
          { name: 'nouvelle', kind: 'text', initial: '' },
        ],
      ),
  },
  {
    id: 'annuaire',
    name: 'Annuaire (API)',
    description: 'Charge des données depuis Internet et les affiche en cartes.',
    accent: '#0d9488',
    create: () =>
      buildProject(
        'Annuaire',
        {
          style: { padding: 32, gap: 20, background: '#f0fdfa', color: '#1b1d29' },
          onLoad: [{ type: 'fetch', url: 'https://jsonplaceholder.typicode.com/users', variable: 'personnes', path: '' }],
        },
        [
          H('Annuaire', '1'),
          P('Ces fiches viennent d’une API : elles sont chargées quand la page s’ouvre. {{personnes}} personnes trouvées.', { color: '#4b5068' }),
          {
            type: 'repeat',
            name: 'Fiches',
            props: { source: 'personnes', columns: 3, empty: 'Chargement…' },
            style: { gap: 16 },
            children: [
              {
                type: 'card',
                name: 'Fiche',
                style: { gap: 6 },
                children: [
                  H('{{element.name}}', '3'),
                  P('✉️ {{element.email}}', { fontSize: 14, color: '#4b5068' }),
                  P('🏙️ {{element.address.city}}', { fontSize: 14, color: '#4b5068' }),
                  { type: 'button', props: { text: 'Saluer', variant: 'secondary' }, onClick: [{ type: 'alert', message: 'Bonjour {{element.name}} !' }] },
                ],
              },
            ],
          },
        ],
        [{ name: 'personnes', kind: 'list', initial: [] }],
      ),
  },
  {
    id: 'site',
    name: 'Site de plusieurs pages',
    description: 'Accueil, À propos et Contact, avec un menu pour passer d’une page à l’autre.',
    accent: '#e11d48',
    create: () => {
      const menu = (): Spec => ({
        type: 'row',
        name: 'Menu',
        style: { gap: 16, padding: 16, background: '#1b1d29', justify: 'center' },
        children: [
          { type: 'link', props: { text: 'Accueil', page: '@accueil', href: '', newTab: false }, style: { color: '#ffffff' } },
          { type: 'link', props: { text: 'À propos', page: '@apropos', href: '', newTab: false }, style: { color: '#ffffff' } },
          { type: 'link', props: { text: 'Contact', page: '@contact', href: '', newTab: false }, style: { color: '#ffffff' } },
        ],
      })
      const pageStyle: BrickStyle = { padding: 0, gap: 0, background: '#ffffff', color: '#1b1d29' }
      const body = (children: Spec[]): Spec => ({ type: 'section', style: { padding: 40, gap: 16, borderRadius: 0 }, children })
      return buildApp('Mon site', [
        {
          ref: 'accueil',
          name: 'Accueil',
          title: 'Mon site',
          style: pageStyle,
          children: [
            menu(),
            body([
              H('Bienvenue sur mon site', '1'),
              P('Chaque page est un onglet au-dessus de la zone de création. Le menu passe de l’une à l’autre.'),
              { type: 'button', props: { text: 'Me contacter', variant: 'primary' }, onClick: [{ type: 'navigate', page: '@contact' }] },
            ]),
          ],
        },
        {
          ref: 'apropos',
          name: 'À propos',
          style: pageStyle,
          children: [menu(), body([H('À propos', '1'), P('Raconte ici ton histoire, ton projet ou ton équipe.')])],
        },
        {
          ref: 'contact',
          name: 'Contact',
          style: pageStyle,
          children: [
            menu(),
            body([
              H('Contact', '1'),
              { type: 'input', props: { label: 'Ton e-mail', placeholder: 'toi@exemple.fr', inputType: 'email', bind: 'email' } },
              { type: 'button', props: { text: 'Envoyer', variant: 'primary' }, onClick: [{ type: 'alert', message: 'Merci, on t’écrit à {{email}} !' }] },
            ]),
          ],
        },
      ], [{ name: 'email', kind: 'text', initial: '' }])
    },
  },
]

export const createDefaultProject = () => TEMPLATES[1].create()

/** Vérifie grossièrement qu'un objet importé est bien un projet Ptt-Makers. */
export function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false
  const p = value as Project
  if (p.version !== 1 || typeof p.rootId !== 'string' || !p.nodes || !p.nodes[p.rootId] || !Array.isArray(p.variables)) return false
  if (p.pages !== undefined && !Array.isArray(p.pages)) return false
  return Object.values(p.nodes).every(
    (n) => n && typeof n.id === 'string' && n.type in BRICKS && Array.isArray(n.children) && Array.isArray(n.onClick) && typeof n.props === 'object',
  )
}

/** Valide un projet importé et le met à niveau (les projets d'avant les pages multiples n'ont pas de liste « pages »). */
export function parseProject(value: unknown): Project | null {
  if (!isProject(value)) return null
  const p = value
  const pages = (p.pages ?? []).filter((id, i, all) => p.nodes[id]?.type === 'page' && !p.nodes[id].parent && all.indexOf(id) === i)
  if (!pages.includes(p.rootId)) pages.unshift(p.rootId)
  return { ...p, pages }
}

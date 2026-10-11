import { afterEach, describe, expect, it } from 'vitest'
import { TEMPLATES } from '../model/templates'
import { toReact } from './frameworks'
import { generate } from './generate'
import { calendarHtml, calendarMonth, chartHtml, formatNumber, kanbanColumns, niceStep, parseNumber, progressValue, tableHtml } from './proBricks'

const id = (t: string) => t

describe('briques pro : contenu', () => {
  it('lit et écrit les nombres à la française', () => {
    expect(parseNumber('12 480,5 €')).toBe(12480.5)
    expect(parseNumber('3.25')).toBe(3.25)
    expect(parseNumber('abc')).toBe(0)
    expect(formatNumber(1250.5)).toBe('1 250,5')
    expect(formatNumber(-3)).toBe('-3')
    expect(progressValue('140')).toBe(100)
    expect(progressValue('-5')).toBe(0)
  })

  it('choisit une échelle ronde pour les graphiques', () => {
    expect(niceStep(24)).toBe(5)
    expect(niceStep(9300)).toBe(2000)
    expect(niceStep(0)).toBe(1)
  })

  it('tableau : titres, cellules échappées, colonnes manquantes complétées', () => {
    const html = tableHtml({ columns: 'Nom ; Ville', rows: 'Léa ; Lyon\n<b>Tom</b>', sortable: true }, id).join('\n')
    expect(html).toContain('<th scope="col"><button type="button">Nom</button></th>')
    expect(html).toContain('<td>&lt;b&gt;Tom&lt;/b&gt;</td><td></td>')
    expect(html).not.toContain('<b>')
  })

  it('graphique : une barre par donnée et une description pour les lecteurs d’écran', () => {
    const html = chartHtml({ kind: 'barres', data: 'Lun : 12\nMar : 18', unit: '€' }).join('\n')
    expect(html.match(/class="chart-bar/g)).toHaveLength(2)
    expect(html).toContain('aria-label="Graphique en barres : Lun 12 €, Mar 18 €"')
    const donut = chartHtml({ kind: 'anneau', data: 'A : 1\nB : 3' }).join('\n')
    expect(donut.match(/class="chart-slice/g)).toHaveLength(2)
    expect(donut).toContain('<strong>3</strong>')
  })

  it('calendrier : le mois commence le bon jour et place les événements', () => {
    expect(calendarMonth('2026-10')).toEqual({ year: 2026, month: 9 })
    expect(calendarMonth('n’importe quoi', new Date(2025, 1, 3))).toEqual({ year: 2025, month: 1 })
    const html = calendarHtml({ month: '2026-10', events: '12 : Réunion\n12 : Repas\n40 : Hors du mois' }, id).join('\n')
    expect(html).toContain('octobre 2026')
    // Le 1er octobre 2026 est un jeudi : trois cases vides avant.
    expect(html).toContain('<tr><td></td><td></td><td></td><td><span class="calendar-day">1</span></td>')
    expect(html).toContain('<td class="has-event"><span class="calendar-day">12</span><span class="calendar-event">Réunion</span><span class="calendar-event">Repas</span></td>')
    expect(html).not.toContain('Hors du mois')
  })

  it('kanban : colonnes et cartes', () => {
    expect(kanbanColumns({ columns: 'À faire : A ; B\nFini :' })).toEqual([
      { title: 'À faire', cards: ['A', 'B'] },
      { title: 'Fini', cards: [] },
    ])
  })
})

const listeners: [string, EventListener][] = []

/** Charge le code généré d'un modèle dans le DOM de test et lance son script. */
function run(templateId: string) {
  const code = generate(TEMPLATES.find((t) => t.id === templateId)!.create())
  document.body.innerHTML = code.html.slice(code.html.indexOf('<body>') + 6, code.html.indexOf('<script'))
  // Les écouteurs posés sur window (navigation entre pages) sont retirés après chaque test.
  const add = window.addEventListener
  window.addEventListener = ((type: string, fn: EventListener) => {
    listeners.push([type, fn])
    add.call(window, type, fn)
  }) as typeof window.addEventListener
  try {
    new Function(code.js)()
  } finally {
    window.addEventListener = add
  }
}

afterEach(() => {
  for (const [type, fn] of listeners.splice(0)) window.removeEventListener(type, fn)
  document.body.innerHTML = ''
})

describe('briques pro : le code exporté fonctionne', () => {
  it('kanban : la flèche passe la carte dans la colonne suivante', () => {
    run('projet')
    const counts = () => [...document.querySelectorAll('.kanban-count')].map((c) => c.textContent)
    expect(counts()).toEqual(['3', '2', '1', '2'])
    ;(document.querySelector('.kanban-move') as HTMLButtonElement).click()
    expect(counts()).toEqual(['2', '3', '1', '2'])
    expect(document.querySelectorAll('.kanban-cards')[1].lastElementChild!.textContent).toContain('Écrire les textes')
  })

  it('progression reliée à une variable', () => {
    run('projet')
    const button = [...document.querySelectorAll('button')].find((b) => b.textContent === '+10 %')!
    button.click()
    expect((document.querySelector('progress') as HTMLProgressElement).value).toBe(50)
    expect(document.querySelector('.progress-value')!.textContent).toBe('50 %')
  })

  it('discussion : envoyer un message l’ajoute à droite', () => {
    run('messagerie')
    const input = document.querySelector('.chat-form input') as HTMLInputElement
    input.value = 'Bonjour !'
    ;(document.querySelector('.chat-form') as HTMLFormElement).requestSubmit()
    const last = [...document.querySelectorAll('.chat-msg')].pop()!
    expect(last.classList.contains('is-me')).toBe(true)
    expect(last.textContent).toContain('Bonjour !')
    expect(input.value).toBe('')
  })

  it('tableau : un clic sur un titre trie les lignes, un deuxième inverse', () => {
    run('tableau-bord')
    const sortBy = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('th button')].find((b) => b.textContent === label)!.click()
    const clients = () => [...document.querySelectorAll('.table tbody tr')].map((r) => (r as HTMLTableRowElement).cells[1].textContent)
    sortBy('Client')
    expect(clients()[0]).toBe('Camille Martin')
    expect(document.querySelector('th[aria-sort="ascending"]')!.textContent).toBe('Client')
    sortBy('Client')
    expect(clients()[0]).toBe('Yanis Benali')
  })

  it('barre d’onglets : un lien par page, celui de la page affichée est actif', () => {
    run('messagerie')
    const links = [...document.querySelectorAll<HTMLAnchorElement>('#onglets-bas-1 a')]
    expect(links.map((a) => a.textContent)).toEqual(['Discussions', 'Contacts', 'Profil'])
    expect(links[0].classList.contains('is-active')).toBe(true)
  })
})

describe('briques pro : export React', () => {
  it('les attributs SVG du graphique passent en JSX', () => {
    const { jsx } = toReact(TEMPLATES.find((t) => t.id === 'tableau-bord')!.create())
    expect(jsx).toContain('strokeDasharray=')
    expect(jsx).toContain('textAnchor="middle"')
    expect(jsx).not.toContain('stroke-dasharray')
  })
})

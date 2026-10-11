import { expect, test, type Page } from '@playwright/test'

/** Ouvre l'éditeur sur une page vierge, sans la visite guidée. */
async function openBlank(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: 'Plus tard' }).click()
  await page.getByRole('button', { name: 'Modèles' }).click()
  await page.getByRole('button', { name: /Page vierge/ }).click()
}

const preview = (page: Page) => page.frameLocator('iframe.pm-preview-frame')

test('affiche la visite guidée au premier lancement', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Bienvenue dans Ptt-Makers !' })).toBeVisible()
  await page.getByRole('button', { name: "C'est parti" }).click()
  await expect(page.getByRole('heading', { name: '1. Les briques' })).toBeVisible()
  await page.getByRole('button', { name: 'Passer' }).click()
  await expect(page.locator('.pm-tour')).toHaveCount(0)
})

test('ajoute une brique au clic, la modifie et voit le résultat partout', async ({ page }) => {
  await openBlank(page)
  await page.locator('.pm-tile', { hasText: 'Titre' }).click()
  const text = page.getByLabel('Texte', { exact: true })
  await text.fill('Bonjour le monde')
  await expect(page.locator('.pm-frame h2')).toHaveText('Bonjour le monde')
  await expect(preview(page).locator('h2')).toHaveText('Bonjour le monde')
  await page.getByRole('tab', { name: 'Code' }).click()
  await expect(page.locator('.pm-code-line.is-hl')).toContainText('<h2 id="titre-1">Bonjour le monde</h2>')
})

test('glisse une brique depuis la bibliothèque vers la zone de création', async ({ page }) => {
  await openBlank(page)
  await page.locator('.pm-tile', { hasText: 'Carte' }).dragTo(page.locator('.pm-frame .page'))
  await page.locator('.pm-tile', { hasText: 'Bouton' }).dragTo(page.locator('.pm-frame [data-ptt-id="carte-1"]'))
  await expect(page.locator('.pm-frame [data-ptt-id="carte-1"] [data-ptt-id="bouton-1"]')).toBeVisible()
  await page.getByRole('tab', { name: 'Calques' }).click()
  await expect(page.locator('.pm-layer', { hasText: 'Bouton 1' })).toBeVisible()
})

test('un champ relié à une variable met à jour un texte dynamique (critère n°1)', async ({ page }) => {
  await openBlank(page)
  await page.getByRole('tab', { name: 'Variables' }).click()
  await page.getByLabel('Nom de la nouvelle variable').fill('prenom')
  await page.getByRole('button', { name: 'Créer la variable' }).click()

  await page.getByRole('tab', { name: 'Briques' }).click()
  await page.locator('.pm-tile', { hasText: 'Champ texte' }).click()
  await page.getByLabel('Enregistrer dans la variable').selectOption('prenom')
  await page.locator('.pm-frame').click({ position: { x: 5, y: 5 } })
  await page.locator('.pm-tile', { hasText: 'Paragraphe' }).click()
  await page.getByLabel('Texte', { exact: true }).fill('Bonjour {{prenom}} !')

  await preview(page).locator('#champ-1-champ').fill('Camille')
  await expect(preview(page).locator('#texte-1')).toHaveText('Bonjour Camille !')
})

test('le modèle Compteur fonctionne dans l’aperçu (critère n°2)', async ({ page }) => {
  await openBlank(page)
  await page.getByRole('button', { name: 'Modèles' }).click()
  await page.getByRole('button', { name: /Compteur/ }).click()
  const p = preview(page)
  await p.getByRole('button', { name: '+ 1' }).click()
  await p.getByRole('button', { name: '+ 1' }).click()
  await p.getByRole('button', { name: '+ 1' }).click()
  await p.getByRole('button', { name: '− 1' }).click()
  await expect(p.locator('#titre-2')).toHaveText('2')
  await p.getByRole('button', { name: 'Remettre à 0' }).click()
  await expect(p.locator('#titre-2')).toHaveText('0')
})

test('annuler et rétablir une suppression (critère n°4)', async ({ page }) => {
  await openBlank(page)
  await page.locator('.pm-tile', { hasText: 'Titre' }).click()
  await page.locator('.pm-tile', { hasText: 'Paragraphe' }).click()
  await page.locator('.pm-frame [data-ptt-id="titre-1"]').click()
  await page.keyboard.press('Delete')
  await expect(page.locator('.pm-frame [data-ptt-id="titre-1"]')).toHaveCount(0)
  await page.keyboard.press('Control+z')
  await expect(page.locator('.pm-frame [data-ptt-id="titre-1"]')).toHaveCount(1)
  await page.keyboard.press('Control+Shift+z')
  await expect(page.locator('.pm-frame [data-ptt-id="titre-1"]')).toHaveCount(0)
})

test('le projet et la disposition sont restaurés après rechargement (critère n°5)', async ({ page }) => {
  await openBlank(page)
  await page.locator('.pm-tile', { hasText: 'Titre' }).click()
  await page.getByLabel('Texte', { exact: true }).fill('Je reste là')
  await page.getByRole('button', { name: 'Replier le panneau' }).first().click()
  await page.waitForTimeout(500)
  await page.reload()
  await expect(page.locator('.pm-frame h2')).toHaveText('Je reste là')
  await expect(page.getByRole('button', { name: 'Afficher les briques' })).toBeVisible()
})

test('modifier un texte directement dans la zone de création', async ({ page }) => {
  await openBlank(page)
  await page.locator('.pm-tile', { hasText: 'Titre' }).click()
  await page.locator('.pm-frame [data-ptt-id="titre-1"]').dblclick()
  await page.keyboard.press('Control+a')
  await page.keyboard.type('Écrit sur place')
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Texte', { exact: true })).toHaveValue('Écrit sur place')
})

test.describe('sur mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('une zone à la fois, avec la barre d’onglets en bas', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.getByRole('button', { name: 'Outils' }).click()
    await page.locator('.pm-tile', { hasText: 'Titre' }).click()
    // Après l'ajout, on revient automatiquement à la zone de création.
    await expect(page.locator('.pm-frame [data-ptt-id="titre-4"]')).toBeVisible()
    await page.getByRole('button', { name: 'Propriétés' }).click()
    await page.getByLabel('Texte', { exact: true }).fill('Créé sur mobile')
    await page.getByRole('button', { name: 'Aperçu' }).click()
    await expect(preview(page).locator('#titre-6')).toHaveText('Créé sur mobile')
  })
})

/** Ouvre un modèle depuis la fenêtre « Modèles ». */
async function openTemplate(page: Page, name: RegExp) {
  await openBlank(page)
  await page.getByRole('button', { name: 'Modèles' }).click()
  await page.getByRole('button', { name }).click()
}

test.describe('applications : listes, conditions, pages et API', () => {
  test('liste de tâches : ajouter et retirer dans l’aperçu', async ({ page }) => {
    await openTemplate(page, /Liste de tâches/)
    const p = preview(page)
    await expect(p.locator('#repetition-1 .repeat-item')).toHaveCount(2)
    await p.locator('#champ-1-champ').fill('Arroser les plantes')
    await p.locator('#bouton-1').click()
    await expect(p.locator('#repetition-1 .repeat-item')).toHaveCount(3)
    await expect(p.locator('#repetition-1 .repeat-item').nth(2)).toContainText('3. Arroser les plantes')
    await p.locator('#repetition-1 .bouton-2').first().click()
    await expect(p.locator('#repetition-1 .repeat-item')).toHaveCount(2)
    await expect(p.locator('#texte-1')).toHaveText('2 tâche(s) à faire')
  })

  test('pages : ajouter une page, naviguer avec un bouton', async ({ page }) => {
    await openTemplate(page, /Site de plusieurs pages/)
    await expect(page.getByRole('tab', { name: /Accueil/ })).toHaveAttribute('aria-selected', 'true')
    const p = preview(page)
    await expect(p.locator('#titre-1')).toBeVisible()
    await p.locator('#bouton-1').click()
    await expect(p.locator('#page-2')).toBeVisible()
    await expect(p.locator('#page')).toBeHidden()
    await p.locator('#lien-8').click()
    await expect(p.locator('#page-1')).toBeVisible()

    // L'aperçu suit la page ouverte dans la zone de création.
    await page.getByRole('tab', { name: /Contact/ }).click()
    await expect(p.locator('#page-2')).toBeVisible()

    await page.getByRole('button', { name: 'Ajouter une page' }).click()
    await expect(page.getByRole('tab', { name: /Page 4/ })).toHaveAttribute('aria-selected', 'true')
    await page.locator('.pm-tile', { hasText: 'Titre' }).click()
    await expect(page.locator('.pm-frame [data-ptt-id="titre-4"]')).toBeVisible()
    await expect(page.locator('.pm-frame [data-ptt-id="titre-1"]')).toHaveCount(0)
  })

  test('API : les données chargées s’affichent dans une répétition', async ({ page }) => {
    await page.route('https://jsonplaceholder.typicode.com/users', (route) =>
      route.fulfill({
        json: [{ name: 'Léa Martin', email: 'lea@ex.fr', address: { city: 'Lyon' } }],
        headers: { 'access-control-allow-origin': '*' },
      }),
    )
    await openTemplate(page, /Annuaire/)
    const p = preview(page)
    await expect(p.locator('#repetition-1 .carte-1')).toHaveCount(1)
    await expect(p.locator('#repetition-1 .carte-1')).toContainText('Léa Martin')
    await expect(p.locator('#texte-1')).toContainText('1 personnes trouvées')
  })
})

test.describe('composants, formats et projets', () => {
  test('enregistrer un bloc dans Mes composants et le réutiliser', async ({ page }) => {
    await openBlank(page)
    await page.locator('.pm-tile', { hasText: 'Carte' }).click()
    await page.getByRole('button', { name: 'Enregistrer dans Mes composants' }).click()
    const tile = page.getByRole('button', { name: /Ajouter le composant/ })
    await expect(tile).toBeVisible()
    await page.locator('.pm-frame .page').click({ position: { x: 5, y: 5 } })
    await tile.click()
    await expect(page.locator('.pm-frame .page > .card')).toHaveCount(2)
  })

  test('masquer une brique sur mobile seulement', async ({ page }) => {
    await openBlank(page)
    await page.locator('.pm-tile', { hasText: 'Titre' }).click()
    const scope = page.getByRole('radiogroup', { name: 'Format réglé' })
    await scope.getByRole('radio', { name: 'Mobile' }).click()
    await page.getByText('Masquer sur ce format').click()
    await expect(scope.getByRole('radio', { name: 'Mobile · 1' })).toBeVisible()
    await page.getByRole('tab', { name: 'Code' }).click()
    await page.getByRole('tab', { name: 'CSS' }).click()
    await expect(page.locator('.pm-code')).toContainText('@media (max-width: 600px)')
  })

  test('Mes projets : un modèle ouvre un nouveau projet, l’ancien reste', async ({ page }) => {
    await openBlank(page)
    await page.getByLabel('Nom du projet').fill('Mon site')
    await page.getByRole('button', { name: 'Modèles' }).click()
    await page.getByRole('button', { name: /Compteur/ }).click()
    await expect(page.getByLabel('Nom du projet')).toHaveValue('Compteur')
    await page.getByRole('button', { name: 'Mes projets' }).click()
    const dialog = page.getByRole('dialog', { name: 'Mes projets' })
    await dialog.getByRole('button', { name: /Mon site/ }).first().click()
    await expect(page.getByLabel('Nom du projet')).toHaveValue('Mon site')
  })
})

test.describe('défis, partage et frameworks', () => {
  test('un défi se coche tout seul', async ({ page }) => {
    await openBlank(page)
    await page.getByRole('button', { name: 'Défis' }).click()
    await page.locator('.pm-challenge-card', { hasText: 'Ma première page' }).getByRole('button', { name: 'Commencer' }).click()
    const panel = page.getByRole('complementary', { name: 'Défi : Ma première page' })
    await expect(panel).toContainText('0/4')
    await page.locator('.pm-tile', { hasText: 'Titre' }).click()
    await page.getByLabel('Texte', { exact: true }).fill('Mon super site')
    await expect(panel).toContainText('2/4')
    await expect(panel).toContainText('Famille Interaction')
  })

  test('un lien de partage ouvre une copie du projet', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openBlank(page)
    await page.getByLabel('Nom du projet').fill('Projet partagé')
    await page.locator('.pm-tile', { hasText: 'Titre' }).click()
    await page.getByLabel('Texte', { exact: true }).fill('Coucou depuis le lien')
    await page.getByRole('button', { name: 'Exporter' }).click()
    await page.getByRole('button', { name: /Copier un lien de partage/ }).click()
    await expect(page.getByText(/Lien copié/)).toBeVisible()
    const url = await page.evaluate(() => navigator.clipboard.readText())
    expect(url).toContain('#projet=')

    const other = await context.newPage()
    await other.goto('/')
    await other.evaluate(() => localStorage.clear())
    await other.goto(url)
    await expect(other.getByLabel('Nom du projet')).toHaveValue('Projet partagé')
    await expect(other.locator('.pm-frame h2')).toHaveText('Coucou depuis le lien')
    expect(other.url()).not.toContain('#projet=')
  })

  test('exporter un composant React', async ({ page }) => {
    await openBlank(page)
    await page.getByRole('button', { name: 'Exporter' }).click()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: /Composant React/ }).click()
    expect((await download).suggestedFilename()).toBe('App.jsx')
  })
})

test.describe('assistant IA (Pro)', () => {
  /** Réponse de l'API simulée en flux (SSE), comme l'enverrait Claude. */
  const sse = (text: string) => {
    const ev = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`
    const half = Math.floor(text.length / 2)
    return [
      ev('message_start', {
        message: { id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } },
      }),
      ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }),
      ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: text.slice(0, half) } }),
      ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: text.slice(half) } }),
      ev('content_block_stop', { index: 0 }),
      ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 100 } }),
      ev('message_stop', {}),
    ].join('')
  }

  test('crée une application à partir d’une description', async ({ page }) => {
    const sent: { headers: Record<string, string>; body: { model: string; output_config: { format: { type: string } } } }[] = []
    const answer = {
      name: 'Compteur de verres d’eau',
      summary: 'Un bouton ajoute un verre et le total s’affiche.',
      theme: { primary: '#0ea5e9', radius: 12, font: 'arrondie' },
      variables: [{ name: 'verres', kind: 'number', initial: '0' }],
      pages: [{ ref: 'accueil', name: 'Accueil', title: 'Eau', style: [], onLoad: [] }],
      bricks: [
        { ref: 'total', parent: 'accueil', type: 'heading', name: 'Total', props: [{ key: 'text', value: '{{verres}} verres' }], style: [], hidden: false, showIf: '', onClick: [] },
        {
          ref: 'plus',
          parent: 'accueil',
          type: 'button',
          name: 'Ajouter',
          props: [{ key: 'text', value: '+1 verre' }],
          style: [],
          hidden: false,
          showIf: '',
          onClick: [{ type: 'add', variable: 'verres', value: '', amount: 1, target: '', message: '', url: '', page: '', which: '', path: '', op: '', then: [], else: [] }],
        },
      ],
    }
    await page.route('https://api.anthropic.com/**', async (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' } })
      sent.push({ headers: route.request().headers(), body: route.request().postDataJSON() })
      await route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream', 'access-control-allow-origin': '*' }, body: sse(JSON.stringify(answer)) })
    })
    await openBlank(page)
    await page.getByRole('button', { name: /Assistant IA/ }).click()
    await page.getByLabel('Ta clé API Anthropic').fill('sk-ant-test')
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await page.getByLabel('Décris ton application').fill('Un compteur de verres d’eau')
    await page.getByRole('button', { name: 'Créer l’application' }).click()
    await expect(page.getByText('Un bouton ajoute un verre et le total s’affiche.')).toBeVisible()

    expect(sent[0].headers['x-api-key']).toBe('sk-ant-test')
    expect(sent[0].headers['anthropic-dangerous-direct-browser-access']).toBe('true')
    expect(sent[0].body.model).toBe('claude-opus-5-5')
    expect(sent[0].body.output_config.format.type).toBe('json_schema')

    await page.getByRole('button', { name: 'Fermer' }).click()
    await expect(page.getByLabel('Nom du projet')).toHaveValue('Compteur de verres d’eau')
    await preview(page).getByRole('button', { name: '+1 verre' }).click()
    await expect(preview(page).locator('h2')).toHaveText('1 verres')
  })

  test('explique le code en direct et modifie le projet (annulable)', async ({ page }) => {
    let call = 0
    const modified = {
      name: 'x',
      summary: 'J’ai ajouté un titre.',
      theme: { primary: '', radius: 0, font: '' },
      variables: [],
      pages: [{ ref: 'page', name: 'Page', title: 'Nouveau projet', style: [], onLoad: [] }],
      bricks: [{ ref: 'titre', parent: 'page', type: 'heading', name: '', props: [{ key: 'text', value: 'Titre ajouté par l’IA' }], style: [], hidden: false, showIf: '', onClick: [] }],
    }
    await page.route('https://api.anthropic.com/**', async (route) => {
      call++
      const text = call === 1 ? 'La fonction afficher() met la page à jour.' : JSON.stringify(modified)
      await route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream', 'access-control-allow-origin': '*' }, body: sse(text) })
    })
    await openBlank(page)
    await page.evaluate(() => localStorage.setItem('ptt-makers:ia', JSON.stringify({ apiKey: 'sk-ant-test', proxyUrl: '' })))
    await page.getByRole('button', { name: /Assistant IA/ }).click()
    await page.getByRole('radio', { name: 'Expliquer le code' }).click()
    await page.getByLabel('Ta question sur le code').fill('À quoi sert afficher() ?')
    await page.getByRole('button', { name: 'Demander' }).click()
    await expect(page.locator('.pm-ai-answer')).toHaveText('La fonction afficher() met la page à jour.')

    await page.getByRole('radio', { name: 'Modifier ce projet' }).click()
    await page.getByLabel('Que faut-il changer ?').fill('Ajoute un titre')
    await page.getByRole('button', { name: 'Modifier le projet' }).click()
    await expect(page.locator('.pm-ai-answer')).toHaveText('J’ai ajouté un titre.')
    await page.getByRole('button', { name: 'Fermer' }).click()
    await expect(page.locator('.pm-frame h2')).toHaveText('Titre ajouté par l’IA')
    await page.keyboard.press('Control+z')
    await expect(page.getByText('Titre ajouté par l’IA')).toHaveCount(0)
  })
})

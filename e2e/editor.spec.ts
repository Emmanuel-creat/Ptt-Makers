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
  await page.getByRole('tab', { name: 'Code', exact: true }).click()
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
    await page.getByRole('tab', { name: 'Code', exact: true }).click()
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

test.describe('page en grille', () => {
  test('pose une brique où on veut sur la grille, la déplace et l’agrandit', async ({ page }) => {
    await openBlank(page)
    await page.getByRole('button', { name: 'Réglages de la page' }).click()
    await page.getByRole('radio', { name: 'Sur une grille' }).click()
    const grid = page.locator('.pm-frame .page.grille')
    await expect(grid).toBeVisible()
    await expect(page.getByTestId('grille')).toBeVisible()
    const box = (await grid.boundingBox())!

    // Un bouton de menu en haut à gauche, un titre en haut à droite.
    await page.locator('.pm-tile', { hasText: 'Bouton' }).first().dragTo(grid, { targetPosition: { x: 30, y: 30 } })
    await page.locator('.pm-tile', { hasText: 'Titre' }).dragTo(grid, { targetPosition: { x: box.width - 60, y: 30 } })
    const btn = page.locator('.pm-frame [data-ptt-id="bouton-1"]')
    const title = page.locator('.pm-frame [data-ptt-id="titre-1"]')
    await expect(btn).toHaveCSS('grid-column-start', '1')
    await expect(btn).toHaveCSS('grid-row-start', '1')
    await expect(title).toHaveCSS('grid-column-start', '5')
    await expect(title).toHaveCSS('grid-row-start', '1')

    // Déplacer le bouton plus bas : il garde sa taille.
    await btn.dragTo(grid, { targetPosition: { x: 30, y: 200 } })
    await expect(btn).not.toHaveCSS('grid-row-start', '1')

    // Agrandir avec les réglages de position.
    await page.getByLabel('Largeur (colonnes)').fill('6')
    await expect(btn).toHaveCSS('grid-column-end', 'span 6')
    await expect(preview(page).locator('#bouton-1')).toHaveCSS('grid-column-end', 'span 6')

    // Sur mobile, tout s'empile sur une colonne.
    await page.getByRole('radiogroup', { name: "Format d'affichage" }).getByRole('radio', { name: 'Mobile' }).click()
    await expect(page.getByTestId('grille')).toHaveCount(0)
    // (le cadre change de largeur avec une petite animation)
    await expect
      .poll(async () => {
        const t = (await title.boundingBox())!
        const b = (await btn.boundingBox())!
        return Math.abs(t.x - b.x) < 2 && b.y > t.y
      })
      .toBe(true)
  })
})

test.describe('icônes dessinées', () => {
  test('choisit une icône dessinée, sans emoji dans la page', async ({ page }) => {
    await openBlank(page)
    await page.locator('.pm-tile', { hasText: 'Icône' }).click()
    await page.getByLabel('Chercher une icône').fill('fus')
    await page.getByRole('listbox', { name: 'Icônes proposées' }).getByRole('option', { name: 'Fusée' }).click()
    await expect(page.getByRole('option', { name: 'Fusée' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.pm-frame [data-ptt-id="icone-1"] svg')).toBeVisible()
    await expect(preview(page).locator('#icone-1 svg path').first()).toBeAttached()
    const text = await preview(page).locator('body').innerText()
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})

test.describe('studio de style', () => {
  test('applique un style à tout le projet, dans l’éditeur et dans l’aperçu', async ({ page }) => {
    await openBlank(page)
    await page.locator('.pm-tile', { hasText: 'Carte' }).click()
    await page.locator('.pm-frame .page').click({ position: { x: 4, y: 4 } })
    await page.getByRole('button', { name: /^Style du projet/ }).click()
    await page.getByRole('listbox', { name: 'Styles proposés' }).getByRole('option', { name: 'Nuit et jaune' }).click()
    await expect(page.locator('.pm-frame .page')).toHaveCSS('background-color', 'rgb(17, 18, 21)')
    await expect(page.locator('.pm-frame [data-ptt-id="carte-1"]')).toHaveCSS('background-color', 'rgb(29, 31, 36)')
    await expect(preview(page).locator('#page')).toHaveCSS('background-color', 'rgb(17, 18, 21)')

    // Un réglage du Studio change tout le projet.
    await page.getByLabel('Arrondi des cartes').fill('0')
    await expect(page.locator('.pm-frame [data-ptt-id="carte-1"]')).toHaveCSS('border-top-left-radius', '0px')

    // Une couleur donnée à la main masque le style, jusqu'à « Adapter toutes les briques ».
    await page.locator('.pm-frame [data-ptt-id="carte-1"]').click()
    await page.getByLabel('Fond', { exact: true }).fill('#ff0000')
    await expect(page.locator('.pm-frame [data-ptt-id="carte-1"]')).toHaveCSS('background-color', 'rgb(255, 0, 0)')
    await page.locator('.pm-frame .page').click({ position: { x: 4, y: 4 } })
    await page.getByRole('button', { name: /^Style du projet/ }).click()
    await page.getByRole('button', { name: 'Adapter toutes les briques au style' }).click()
    await expect(page.locator('.pm-frame [data-ptt-id="carte-1"]')).toHaveCSS('background-color', 'rgb(29, 31, 36)')
  })
})

test.describe('interface pro', () => {
  test("l'écran d'accueil s'ouvre au démarrage et se ferme avec Échap", async ({ page }) => {
    await openBlank(page)
    await page.reload()
    const splash = page.getByRole('dialog', { name: "Écran d'accueil" })
    await expect(splash).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(splash).toHaveCount(0)
    // On peut le rouvrir depuis le menu Fichier, puis le désactiver au démarrage.
    await page.getByRole('navigation', { name: 'Menus' }).getByRole('button', { name: 'Fichier' }).click()
    await page.getByRole('menuitem', { name: "Écran d'accueil" }).click()
    await expect(splash).toBeVisible()
    await splash.getByLabel('Afficher au démarrage').uncheck()
    await page.reload()
    await expect(page.locator('.pm-toolstrip')).toBeVisible()
    await expect(splash).toHaveCount(0)
  })

  test("un nouveau projet se crée depuis l'écran d'accueil", async ({ page }) => {
    await openBlank(page)
    await page.reload()
    await page.getByRole('dialog', { name: "Écran d'accueil" }).getByRole('button', { name: 'Compteur' }).click()
    await expect(page.getByLabel('Nom du projet')).toHaveValue('Compteur')
  })

  test('menus, barre d’outils et espaces de travail', async ({ page }) => {
    await openBlank(page)
    await expect(page.locator('html')).toHaveAttribute('data-ui', 'pro')
    // La barre d'outils ajoute une brique, le menu Édition l'annule.
    await page.getByRole('toolbar', { name: 'Outils rapides' }).getByRole('button', { name: 'Titre' }).click()
    await expect(page.locator('.pm-frame [data-ptt-id="titre-1"]')).toBeVisible()
    await page.getByRole('navigation', { name: 'Menus' }).getByRole('button', { name: 'Édition' }).click()
    await page.getByRole('menuitem', { name: /Annuler/ }).click()
    await expect(page.locator('.pm-frame [data-ptt-id="titre-1"]')).toHaveCount(0)
    // L'espace Code range le code à droite, en grand.
    await page.getByRole('tab', { name: 'Espace Code' }).click()
    await expect(page.getByRole('tab', { name: 'Espace Code' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: 'Code', exact: true })).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('tab', { name: 'Espace Construction' }).click()
    await expect(page.getByRole('tab', { name: 'Aperçu', exact: true })).toHaveAttribute('aria-selected', 'true')
  })

  test("l'interface classique reste disponible", async ({ page }) => {
    await openBlank(page)
    await page.getByRole('button', { name: "Disposition de l'espace de travail" }).click()
    await page.getByRole('radiogroup', { name: 'Interface' }).getByRole('radio', { name: 'Classique' }).click()
    await expect(page.locator('html')).not.toHaveAttribute('data-ui', 'pro')
    await expect(page.getByRole('navigation', { name: 'Menus' })).toHaveCount(0)
    await expect(page.locator('.pm-toolstrip')).toHaveCount(0)
  })
})

test.describe('briques pro', () => {
  test('un kanban et une discussion fonctionnent dans l’aperçu', async ({ page }) => {
    await openBlank(page)
    await page.locator('.pm-tile', { hasText: 'Kanban' }).click()
    await expect(page.locator('.pm-frame .kanban-card')).toHaveCount(4)
    await page.locator('.pm-frame .page').click({ position: { x: 4, y: 4 } })
    await page.locator('.pm-tile', { hasText: 'Discussion' }).click()
    const counts = preview(page).locator('.kanban-count')
    await expect(counts).toHaveText(['2', '1', '1'])
    await preview(page).locator('.kanban-move').first().click()
    await expect(counts).toHaveText(['1', '2', '1'])
    await preview(page).getByLabel('Écrire un message').fill('Ça avance bien')
    await preview(page).getByRole('button', { name: 'Envoyer' }).click()
    await expect(preview(page).locator('.chat-msg.is-me').last()).toContainText('Ça avance bien')
  })

  test('le modèle Tableau de bord affiche ses graphiques et trie son tableau', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.getByRole('button', { name: 'Plus tard' }).click()
    await page.getByRole('button', { name: 'Modèles' }).click()
    await page.getByRole('button', { name: /Tableau de bord/ }).click()
    await expect(page.locator('.pm-frame .stat')).toHaveCount(4)
    await expect(page.locator('.pm-frame .chart svg')).toHaveCount(2)
    await preview(page).getByRole('button', { name: 'Montant' }).click()
    await expect(preview(page).locator('.table tbody tr').first()).toContainText('19,90 €')
  })
})

test.describe('données', () => {
  test('une collection crée son formulaire et son tableau, qui marchent dans l’aperçu', async ({ page }) => {
    await openBlank(page)
    await page.getByRole('tab', { name: 'Variables' }).click()
    await page.getByLabel('Nom de la nouvelle variable').fill('clients')
    await page.getByLabel('Type de la variable').selectOption('collection')
    await page.getByRole('button', { name: 'Créer la variable' }).click()
    await page.getByLabel('Nom du nouveau champ').fill('Ville')
    await page.getByRole('button', { name: 'Ajouter le champ' }).click()
    await page.getByRole('button', { name: 'Ajouter une fiche' }).click()
    await page.getByLabel('Nom de la fiche 1').fill('Camille')
    await page.getByLabel('Ville de la fiche 1').fill('Lyon')
    await page.getByRole('button', { name: 'Créer un formulaire et un tableau' }).click()

    await expect(page.locator('.pm-frame .table tbody tr')).toHaveCount(1)
    const rows = preview(page).locator('.table tbody tr')
    await expect(rows).toHaveCount(1)
    // Le nom est obligatoire : sans lui, la fiche n'est pas ajoutée.
    await preview(page).getByRole('button', { name: 'Ajouter' }).click()
    await expect(preview(page).locator('.field-error').first()).toHaveText('Ce champ est obligatoire.')
    await expect(rows).toHaveCount(1)
    await preview(page).getByLabel('Nom', { exact: true }).fill('Yanis')
    await preview(page).getByLabel('Ville', { exact: true }).fill('Paris')
    await preview(page).getByRole('button', { name: 'Ajouter' }).click()
    await expect(rows).toHaveCount(2)
    await expect(rows.nth(1)).toContainText('Yanis')
    await expect(rows.nth(1)).toContainText('Paris')
    await preview(page).getByLabel('Rechercher').fill('lyon')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Camille')
    await preview(page).getByLabel('Rechercher').fill('')
    await expect(rows).toHaveCount(2)
    await rows.first().getByRole('button', { name: 'Supprimer' }).click()
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Yanis')
  })

  test('un fichier CSV remplit une collection', async ({ page }) => {
    await openBlank(page)
    await page.getByRole('tab', { name: 'Variables' }).click()
    await page.getByLabel('Nom de la nouvelle variable').fill('villes')
    await page.getByLabel('Type de la variable').selectOption('collection')
    await page.getByRole('button', { name: 'Créer la variable' }).click()
    await page.getByLabel('Fichier CSV à importer dans villes').setInputFiles({
      name: 'villes.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Ville;Habitants\nLyon;522 000\nNantes;323 000\n'),
    })
    await expect(page.getByLabel('Habitants de la fiche 2')).toHaveValue('323000')
    await page.getByRole('button', { name: 'Créer un formulaire et un tableau' }).click()
    await expect(preview(page).locator('.table tbody tr').first()).toContainText('522 000')
  })
})

test.describe('outils de l’éditeur', () => {
  test('sélectionner plusieurs briques et les grouper', async ({ page }) => {
    await openBlank(page)
    await page.locator('.pm-tile', { hasText: 'Titre' }).click()
    await page.locator('.pm-tile', { hasText: 'Bouton' }).click()
    await page.locator('.pm-frame h2').click()
    await page.locator('.pm-frame .page > button').click({ modifiers: ['Shift'] })
    await expect(page.getByText('2 briques sélectionnées')).toBeVisible()
    await page.getByRole('button', { name: 'Grouper', exact: true }).click()
    await expect(page.locator('.pm-frame .page > *')).toHaveCount(1)
    await expect(page.locator('.pm-frame .page > * > h2')).toBeVisible()
    await page.keyboard.press('Control+Shift+G')
    await expect(page.locator('.pm-frame .page > *')).toHaveCount(2)
  })

  test('une copie liée d’un composant suit les changements', async ({ page }) => {
    await openBlank(page)
    await page.locator('.pm-tile', { hasText: 'Carte' }).click()
    await page.locator('.pm-tile', { hasText: 'Titre' }).click()
    await page.locator('.pm-frame .page > .card').click({ position: { x: 4, y: 4 } })
    await page.getByRole('button', { name: 'Enregistrer dans Mes composants' }).click()
    await page.locator('.pm-frame .page').click({ position: { x: 5, y: 5 } })
    await page.getByRole('button', { name: /Ajouter le composant/ }).click()
    await expect(page.getByText(/Copie liée du composant/)).toBeVisible()
    await page.locator('.pm-frame .page > .card').nth(1).locator('h2').click()
    await page.getByLabel('Texte', { exact: true }).fill('Même titre partout')
    await expect(page.locator('.pm-frame .page > .card h2').first()).toHaveText('Même titre partout')
  })

  test('le panneau Problèmes mène à la brique concernée', async ({ page }) => {
    await openBlank(page)
    await page.locator('.pm-tile', { hasText: 'Bouton' }).click()
    await page.getByLabel('Texte', { exact: true }).fill('')
    await page.locator('.pm-frame .page').click({ position: { x: 5, y: 5 } })
    await page.getByRole('tab', { name: /Problèmes/ }).click()
    await page.getByRole('button', { name: /Un bouton n’a pas de texte/ }).click()
    await expect(page.locator('.pm-frame .pm-ov-select, .pm-ov-select')).toHaveCount(1)
  })

  test('revenir à une version enregistrée', async ({ page }) => {
    await openBlank(page)
    await page.locator('.pm-tile', { hasText: 'Titre' }).click()
    await page.getByRole('button', { name: 'Fichier', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Versions…' }).click()
    await page.getByLabel('Nom de la version').fill('Avec un titre')
    await page.getByRole('button', { name: 'Enregistrer cette version' }).click()
    await page.keyboard.press('Escape')
    await expect(page.locator('.pm-modal')).toHaveCount(0)
    await page.locator('.pm-frame [data-ptt-id="titre-1"]').click()
    await page.locator('.pm-inspector-actions').getByRole('button', { name: 'Supprimer', exact: true }).click()
    await expect(page.locator('.pm-frame [data-ptt-id="titre-1"]')).toHaveCount(0)
    await page.getByRole('button', { name: 'Fichier', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Versions…' }).click()
    await page.locator('.pm-project', { hasText: 'Avec un titre' }).getByRole('button', { name: 'Revenir à cette version' }).click()
    await expect(page.locator('.pm-frame [data-ptt-id="titre-1"]')).toHaveCount(1)
  })
})


test.describe('logiciels prêts à livrer', () => {
  test('la galerie se filtre par famille et par recherche, et ouvre un modèle métier', async ({ page }) => {
    await openBlank(page)
    await page.getByRole('button', { name: 'Modèles' }).click()
    await page.getByRole('radio', { name: 'Gestion et métiers' }).click()
    await expect(page.getByRole('button', { name: /Liste de tâches/ })).toHaveCount(0)
    await page.getByLabel('Chercher un modèle').fill('tva')
    await expect(page.locator('.pm-template')).toHaveCount(1)
    await page.getByRole('button', { name: /Facturation/ }).click()
    await expect(preview(page).locator('.stat-value').nth(2)).toHaveText('2 284 €')
  })

  test('la brique de code personnalisé tourne dans l’aperçu', async ({ page }) => {
    await openBlank(page)
    await page.locator('.pm-tile', { hasText: 'Code personnalisé' }).click()
    await page.getByLabel('HTML', { exact: true }).fill('<p class="salut">Salut</p>')
    await page.getByLabel('JavaScript', { exact: true }).fill('bloc.querySelector(".salut").textContent = "Bonjour " + (2 + 3);')
    await expect(preview(page).locator('#code-1 .salut')).toHaveText('Bonjour 5')
    await expect(page.frameLocator('.pm-frame .pm-code-frame').locator('.salut')).toHaveText('Bonjour 5')
  })

  test('les comptes ouvrent la page réservée dans l’aperçu', async ({ page }) => {
    await openTemplate(page, /Espace membres/)
    const p = preview(page)
    await p.getByRole('button', { name: 'Mon espace' }).click()
    await expect(p.getByRole('heading', { name: 'Connexion' })).toBeVisible()
    await p.getByLabel('E-mail').fill('lina@exemple.fr')
    await p.getByLabel('Mot de passe').fill('secret42')
    await p.getByRole('button', { name: 'Créer un compte' }).click()
    await expect(p.getByRole('heading', { name: 'Bonjour lina@exemple.fr' })).toBeVisible()
  })

  test('exporter une application installable', async ({ page }) => {
    await openBlank(page)
    await page.getByRole('button', { name: 'Exporter' }).click()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: /Application installable/ }).click()
    expect((await download).suggestedFilename()).toBe('nouveau-projet-application.zip')
  })
})

test.describe('logique avancée', () => {
  test('la touche Entrée ajoute une tâche, et l’événement se règle dans Interactions', async ({ page }) => {
    await openTemplate(page, /Liste de tâches/)
    const p = preview(page)
    await p.locator('#champ-1-champ').fill('Lire un livre')
    await p.locator('#champ-1-champ').press('Enter')
    await expect(p.locator('#repetition-1 .repeat-item')).toHaveCount(3)
    await page.locator('.pm-frame [data-ptt-id="champ-1"]').click()
    await expect(page.getByRole('radio', { name: /Touche/ })).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('radio', { name: /Survol/ }).click()
    await expect(page.getByRole('button', { name: 'Ajouter une action au survol' })).toBeVisible()
  })

  test('une fonction réutilisable lancée par un bouton', async ({ page }) => {
    await openBlank(page)
    await page.getByRole('tab', { name: 'Variables' }).click()
    await page.getByLabel('Nom de la nouvelle variable').fill('message')
    await page.getByRole('button', { name: 'Créer la variable' }).click()
    await page.getByLabel('Nom de la nouvelle fonction').fill('saluer')
    await page.getByRole('button', { name: 'Créer la fonction' }).click()
    await page.locator('.pm-function-body').getByRole('button', { name: 'Action' }).click()
    await page.locator('.pm-function-body textarea, .pm-function-body input:not([aria-label="Nom de la fonction"])').last().fill('Bonjour')

    await page.getByRole('tab', { name: 'Briques' }).click()
    await page.locator('.pm-tile', { hasText: 'Paragraphe' }).click()
    await page.getByLabel('Texte', { exact: true }).fill('{{message}}')
    await page.locator('.pm-frame').click({ position: { x: 5, y: 5 } })
    await page.locator('.pm-tile', { hasText: 'Bouton' }).click()
    await page.getByRole('button', { name: 'Ajouter une action au clic' }).click()
    await page.locator('.pm-actions select').first().selectOption({ label: 'Lancer une fonction' })
    await preview(page).locator('#bouton-1').click()
    await expect(preview(page).locator('#texte-1')).toHaveText('Bonjour')
  })

  test('le débogueur avance action par action', async ({ page }) => {
    await openTemplate(page, /Compteur/)
    await page.getByRole('button', { name: 'Débogueur : suivre les actions une par une' }).click()
    const panel = page.getByRole('complementary', { name: 'Débogueur' })
    await panel.getByLabel('Pas à pas').check()
    const p = preview(page)
    await p.getByRole('button', { name: '+ 1' }).click()
    await expect(panel.locator('.pm-debugger-steps li.is-current')).toContainText('au clic')
    await expect(p.locator('#titre-2')).toHaveText('0')
    await panel.getByRole('button', { name: 'Action suivante' }).click()
    await expect(p.locator('#titre-2')).toHaveText('1')
    await expect(panel.locator('.pm-debugger-vars')).toContainText('1')
  })
})

test.describe('logiciels de gestion', () => {
  test('le back-office : barre latérale, formulaire vérifié et tableau modifiable', async ({ page }) => {
    await openTemplate(page, /Back-office/)
    const p = preview(page)
    await expect(p.locator('.stat-value').first()).toHaveText('3')
    await p.locator('.app-sidebar').getByRole('link', { name: 'Clients' }).click()
    await expect(p.getByRole('heading', { name: 'Clients', level: 1 })).toBeVisible()
    const rows = p.locator('.table tbody tr')
    await expect(rows).toHaveCount(3)

    // Le formulaire refuse un envoi incomplet, puis ajoute la fiche et annonce le succès.
    await p.getByRole('button', { name: 'Ajouter le client' }).click()
    await expect(p.locator('.field-error').first()).toHaveText('Ce champ est obligatoire.')
    await p.getByLabel('Nom du client').fill('Fleurs de Lyon')
    await p.getByLabel('E-mail', { exact: true }).fill('pas-un-mail')
    await p.getByLabel('Rendez-vous', { exact: true }).fill('2026-12-01')
    await p.getByLabel('Montant (€)', { exact: true }).fill('500')
    await p.getByRole('button', { name: 'Ajouter le client' }).click()
    await expect(rows).toHaveCount(3)
    await p.getByLabel('E-mail', { exact: true }).fill('fleurs@lyon.fr')
    await p.getByRole('button', { name: 'Ajouter le client' }).click()
    await expect(rows).toHaveCount(4)
    await expect(p.locator('.form-success')).toHaveText('Fleurs de Lyon est ajouté.')

    // Une case se modifie dans le tableau.
    const cell = rows.first().getByRole('textbox', { name: 'nom' })
    await cell.fill('Boulangerie Durand')
    await cell.press('Enter')
    await expect(rows.first().getByRole('textbox', { name: 'nom' })).toHaveValue('Boulangerie Durand')

    // Cocher deux lignes puis les supprimer ensemble.
    await rows.nth(0).getByLabel('Sélectionner cette ligne').check()
    await rows.nth(1).getByLabel('Sélectionner cette ligne').check()
    await expect(p.locator('.table-count')).toHaveText('2 ligne(s) sélectionnée(s)')
    await p.getByRole('button', { name: 'Supprimer la sélection' }).click()
    await expect(rows).toHaveCount(2)
  })
})

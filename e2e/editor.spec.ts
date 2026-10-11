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
    await expect(page.locator('.pm-frame [data-ptt-id="titre-6"]')).toBeVisible()
    await page.getByRole('button', { name: 'Propriétés' }).click()
    await page.getByLabel('Texte', { exact: true }).fill('Créé sur mobile')
    await page.getByRole('button', { name: 'Aperçu' }).click()
    await expect(preview(page).locator('#titre-6')).toHaveText('Créé sur mobile')
  })
})

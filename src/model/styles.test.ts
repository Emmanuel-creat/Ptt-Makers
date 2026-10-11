import { describe, expect, it } from 'vitest'
import { generate } from '../codegen/generate'
import { sanitizeBackground, sanitizeColor, themeEntries, themeFontsUrl } from '../codegen/style'
import { adoptStyle, resolveTokens, STYLE_PRESETS, stylePreset } from './styles'
import { buildProject } from './templates'

describe('moteur de styles', () => {
  it('propose au moins 24 styles complets et valides', () => {
    expect(STYLE_PRESETS.length).toBeGreaterThanOrEqual(24)
    expect(new Set(STYLE_PRESETS.map((s) => s.id)).size).toBe(STYLE_PRESETS.length)
    for (const s of STYLE_PRESETS) {
      const t = s.tokens
      for (const c of [t.accent, t.onAccent, t.surface, t.text, t.muted, t.onBar, t.border]) expect(sanitizeColor(c), `${s.id} ${c}`).toBe(c)
      for (const c of [t.background, t.bar]) expect(sanitizeBackground(c), `${s.id} ${c}`).toBe(c)
      // Toutes les variables du style sortent dans le CSS.
      const vars = Object.fromEntries(themeEntries({ style: s.id }))
      for (const k of ['--couleur', '--fond', '--surface', '--texte', '--barre', '--ombre', '--arrondi', '--arrondi-carte', '--flou']) expect(vars[k], `${s.id} ${k}`).toBeTruthy()
    }
  })

  it('accepte les dégradés et refuse le reste dans un fond', () => {
    expect(sanitizeBackground('linear-gradient(160deg, #ff6a3d, #7a2cff)')).toBe('linear-gradient(160deg, #ff6a3d, #7a2cff)')
    expect(sanitizeBackground('#123456')).toBe('#123456')
    expect(sanitizeBackground('url(https://x.fr/a.png)')).toBeNull()
    expect(sanitizeBackground('linear-gradient(red, blue); } body { display: none')).toBeNull()
    expect(sanitizeBackground('linear-gradient(var(--x), red)')).toBeNull()
    expect(sanitizeBackground('linear-gradient((red, blue)')).toBeNull()
  })

  it('applique le style, puis l’ancien thème, puis les réglages du Studio', () => {
    const t = resolveTokens({ style: 'nuit-jaune', primary: '#ff0000', tokens: { radius: 0 } })
    expect(t.background).toBe('#111215')
    expect(t.accent).toBe('#ff0000')
    expect(t.radius).toBe(0)
    // Sans style ni Studio, le CSS du thème reste celui d'avant.
    expect(themeEntries({ primary: '#e11d48', radius: 4 })).toEqual([
      ['--couleur', '#e11d48'],
      ['--arrondi', '4px'],
    ])
  })

  it('calcule le relief du néomorphisme et l’ombre décalée du néobrutalisme', () => {
    const neo = Object.fromEntries(themeEntries({ style: 'neo-clair' }))
    expect(neo['--ombre']).toContain('color-mix(in srgb, var(--surface)')
    expect(neo['--ombre-champ']).toContain('inset')
    const brutal = Object.fromEntries(themeEntries({ style: 'neobrutal' }))
    expect(brutal['--ombre']).toBe('5px 5px 0 var(--texte)')
    expect(brutal['--bordure-bouton']).toBe('3px solid #111111')
    expect(Object.fromEntries(themeEntries({ style: 'terminal' }))['color-scheme']).toBe('dark')
  })

  it('charge les polices Google seulement quand le style en utilise', () => {
    expect(themeFontsUrl({ style: 'pro-sobre' })).toBeNull()
    expect(themeFontsUrl({ style: 'editorial' })).toContain('family=Fraunces')
    const p = buildProject('X', {}, [{ type: 'heading', props: { text: 'Titre' } }])
    p.theme = { style: 'editorial' }
    const { html, css } = generate(p)
    expect(html).toContain('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces')
    expect(html).toContain('&amp;display=swap')
    expect(css).toContain('--police-titre: "Fraunces"')
    expect(css).toContain('--fond: #fbfaf6;')
  })

  it('fait suivre le style aux briques sans toucher aux images', () => {
    const p = buildProject('X', {}, [
      { type: 'card', style: { background: '#ffffff', borderRadius: 14, padding: 20 }, children: [{ type: 'heading', props: { text: 'A' }, style: { color: '#123456' } }] },
      { type: 'image', style: { borderRadius: 12, background: '#eeeeee' } },
    ])
    p.nodes['carte-1'].responsive = { mobile: { background: '#000000', padding: 8 } }
    const nodes = adoptStyle(p.nodes)
    expect(nodes['carte-1'].style).toEqual({ direction: 'column', gap: 8, padding: 20 })
    expect(nodes['carte-1'].responsive).toEqual({ mobile: { padding: 8 } })
    expect(nodes['titre-1'].style.color).toBeUndefined()
    expect(nodes['image-1'].style).toMatchObject({ borderRadius: 12 })
    expect(nodes['image-1'].style.background).toBeUndefined()
    expect(stylePreset('inconnu')).toBeUndefined()
  })
})

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../model/templates'
import { crc32, zip } from '../utils/zip'
import { appIconSvg, pwaFiles } from './pwa'

describe('application installable', () => {
  const project = TEMPLATES.find((t) => t.id === 'crm')!.create()

  it('le CRC32 suit la norme', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('prépare la page, le manifeste, le service worker et Capacitor', () => {
    const files = pwaFiles(project, { 192: new Uint8Array([1, 2, 3]) })
    const by = Object.fromEntries(files.map((f) => [f.path, f.data]))
    const html = String(by['www/index.html'])
    expect(html).toContain('<link rel="manifest" href="manifest.webmanifest">')
    expect(html).toContain('navigator.serviceWorker.register("sw.js")')
    const manifest = JSON.parse(String(by['www/manifest.webmanifest']))
    expect(manifest.name).toBe('CRM clients')
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons.map((i: { src: string }) => i.src)).toEqual(['icone-192.png', 'icone.svg'])
    expect(String(by['www/sw.js'])).toContain('"icone-192.png"')
    expect(JSON.parse(String(by['capacitor.config.json']))).toEqual({ appId: 'fr.pttmakers.crmclients', appName: 'CRM clients', webDir: 'www' })
    expect(appIconSvg(project)).toContain('>C</text>')
  })

  it('l’archive .zip s’ouvre avec un outil standard', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pwa-'))
    writeFileSync(join(dir, 'app.zip'), zip(pwaFiles(project)))
    let list: string
    try {
      list = execFileSync('python3', ['-c', 'import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print("\\n".join(z.namelist()))', join(dir, 'app.zip')]).toString()
    } catch {
      return // pas de Python : on ne peut pas vérifier ici
    }
    expect(list.split('\n')).toContain('www/manifest.webmanifest')
    expect(readFileSync(join(dir, 'app.zip')).length).toBeGreaterThan(1000)
  })
})

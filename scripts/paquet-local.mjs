// Prépare le paquet « Ptt-Makers pour ordinateur » : l'atelier en un seul fichier,
// les icônes et les installateurs Windows, macOS et Linux, rangés dans un .zip.
import { execFileSync } from 'node:child_process'
import { chmodSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const racine = new URL('..', import.meta.url).pathname
const { version } = JSON.parse(readFileSync(join(racine, 'package.json'), 'utf8'))
const sortie = join(racine, 'dist-local')
const paquet = join(sortie, 'Ptt-Makers')

execFileSync('npx', ['vite', 'build', '-c', 'vite.local.config.ts'], { cwd: racine, stdio: 'inherit' })

rmSync(paquet, { recursive: true, force: true })
mkdirSync(join(paquet, 'application'), { recursive: true })
cpSync(join(sortie, 'index.html'), join(paquet, 'application', 'index.html'))
cpSync(join(racine, 'local'), paquet, { recursive: true })
rmSync(join(paquet, 'icones', 'ptt-makers.svg'))

// Le numéro de version de l'application macOS suit celui du projet.
const mac = join(paquet, 'Installer-macOS.command')
writeFileSync(mac, readFileSync(mac, 'utf8').replace('<string>VERSION</string>', `<string>${version}</string>`))
for (const script of ['Installer-macOS.command', 'installer-linux.sh']) chmodSync(join(paquet, script), 0o755)

const zip = join(sortie, 'Ptt-Makers-local.zip')
rmSync(zip, { force: true })
execFileSync('zip', ['-r', '-X', '-q', zip, 'Ptt-Makers'], { cwd: sortie })
console.log(`Paquet prêt : dist-local/Ptt-Makers-local.zip (version ${version})`)

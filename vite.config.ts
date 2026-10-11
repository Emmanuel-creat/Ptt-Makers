/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react()],
  // Chemins relatifs : l'application fonctionne aussi hébergée dans un sous-dossier (GitHub Pages…).
  base: './',
  // Numéro de version affiché dans l'écran d'accueil et la barre d'état.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
})

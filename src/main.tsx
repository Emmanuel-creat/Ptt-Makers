import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/tokens.css'
import './styles/app.css'
import { BASE_CSS } from './codegen/baseCss'

// Les styles de base des briques sont injectés tels qu'ils apparaissent dans le code généré.
const base = document.createElement('style')
base.dataset.ptt = 'base'
base.textContent = BASE_CSS
document.head.appendChild(base)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

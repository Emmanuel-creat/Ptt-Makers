import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/tokens.css'
import './styles/app.css'
import './styles/pro.css'
import { BASE_CSS } from './codegen/baseCss'
import { useEditor } from './store/editor'
import { readSharedProject } from './utils/share'

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

// Un lien de partage (…/#projet=…) ouvre une copie du projet dans « Mes projets ».
async function openSharedProject() {
  const project = await readSharedProject()
  if (project === undefined) return
  const { createProject, notify } = useEditor.getState()
  if (!project) return notify('Ce lien de partage est abîmé : le projet ne peut pas être ouvert')
  createProject(project)
  notify(`Projet partagé « ${project.name} » ouvert dans Mes projets`)
}
openSharedProject()
window.addEventListener('hashchange', openSharedProject)

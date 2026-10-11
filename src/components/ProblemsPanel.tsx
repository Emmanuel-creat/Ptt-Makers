import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react'
import { useDeferredValue, useMemo } from 'react'
import { findProblems, type Problem } from '../model/problems'
import type { Project } from '../model/types'
import { useEditor } from '../store/editor'
import { useWorkspace } from '../store/workspace'

const cache = new WeakMap<Project, Problem[]>()

/** Les problèmes du projet ouvert (calculés une seule fois par version du projet). */
export function useProblems(): Problem[] {
  const project = useDeferredValue(useEditor((s) => s.project))
  return useMemo(() => {
    let list = cache.get(project)
    if (!list) {
      list = findProblems(project)
      cache.set(project, list)
    }
    return list
  }, [project])
}

/** Liste des erreurs et des conseils ; un clic mène à la brique ou à la variable concernée. */
export function ProblemsPanel() {
  const problems = useProblems()
  const nodes = useEditor((s) => s.project.nodes)
  const select = useEditor((s) => s.select)
  const setWorkspace = useWorkspace((s) => s.set)
  const errors = problems.filter((p) => p.level === 'erreur').length

  const open = (p: Problem) => {
    if (p.nodeId && nodes[p.nodeId]) select(p.nodeId)
    else if (p.variable) setWorkspace({ leftTab: 'variables', leftCollapsed: false })
  }

  if (!problems.length) {
    return (
      <div className="pm-problems-empty">
        <CircleCheck size={28} aria-hidden="true" />
        <strong>Aucun problème</strong>
        <span>Toutes les variables, pages et briques utilisées existent bien.</span>
      </div>
    )
  }
  return (
    <div className="pm-problems">
      <p className="pm-problems-summary">
        {errors ? `${errors} ${errors > 1 ? 'erreurs' : 'erreur'}` : 'Aucune erreur'} · {problems.length - errors}{' '}
        {problems.length - errors > 1 ? 'conseils' : 'conseil'}
      </p>
      <ul className="pm-problems-list">
        {problems.map((p) => {
          const where = p.nodeId ? nodes[p.nodeId]?.name : p.variable ? `Variable ${p.variable}` : null
          return (
            <li key={p.key}>
              <button type="button" className={`pm-problem is-${p.level === 'erreur' ? 'error' : 'warning'}`} onClick={() => open(p)}>
                {p.level === 'erreur' ? <CircleAlert size={15} aria-label="Erreur" /> : <TriangleAlert size={15} aria-label="Conseil" />}
                <span className="pm-problem-text">{p.message}</span>
                {where && <span className="pm-problem-where">{where}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

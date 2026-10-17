import { Component, Suspense, useEffect, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Play } from 'lucide-react'
import { materials } from '../../content'
import { MaterialSwitcher } from '../../components/MaterialSwitcher'
import { TextBlock } from '../../components/TextBlock'
import { findSim, simsForMaterial } from '../../lib/sims'
import type { MaterialId } from '../../types/chem'
import { NotFound } from './NotFound'

/** Full-panel host for one concept sim: a slim header, then the sim fills the rest. */
export default function SimHostPage() {
  const { id, simId } = useParams()
  const material = id ? materials[id as MaterialId] : undefined
  const sim = findSim(simId)

  useEffect(() => {
    if (sim && material) document.title = `${sim.title}: ${material.short} | ChemZoom`
    return () => void (document.title = 'ChemZoom')
  }, [sim, material])

  if (!material || !sim) return <NotFound />
  const applies = sim.appliesTo === 'all' ? undefined : sim.appliesTo
  if (applies && !applies.includes(material.id)) return <NotFound />
  const pairId = sim.pairWith?.[material.id]
  const compareWith = pairId ? materials[pairId] : undefined
  const others = simsForMaterial(material.id).filter((s) => s.id !== sim.id)
  const Sim = sim.Component

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-line/70 bg-surface/60 px-3 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Link
            to={`/m/${material.id}`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-surface-2"
          >
            <ArrowLeft aria-hidden className="size-4" />
            {material.short}
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-ink sm:text-2xl">
              <Play aria-hidden className="size-5 text-primary" />
              {sim.title}
              {compareWith && (
                <span className="text-base font-normal text-ink-muted">
                  : {material.short} and {compareWith.short}
                </span>
              )}
            </h1>
          </div>
          <div className="w-full lg:w-auto">
            <MaterialSwitcher current={material.id} only={applies} hrefFor={(m) => `/m/${m}/sim/${sim.id}`} />
          </div>
        </div>
        <TextBlock text={sim.question} className="mt-2" />
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <SimBoundary key={`${sim.id}:${material.id}`}>
          <Suspense fallback={<p className="p-6 text-ink-muted">Loading the sim</p>}>
            <Sim material={material} compareWith={compareWith} />
          </Suspense>
        </SimBoundary>
      </div>
      {others.length > 0 && (
        <nav aria-label="Other sims" className="flex shrink-0 gap-2 overflow-x-auto border-t border-line/70 bg-surface/60 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-5">
          <span className="shrink-0 self-center text-sm text-ink-muted">More:</span>
          {others.map((s) => (
            <Link
              key={s.id}
              to={`/m/${material.id}/sim/${s.id}`}
              replace
              className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-line px-3.5 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-surface-2"
            >
              {s.title}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}

/** A sim that throws shows a calm message instead of taking the whole app down. */
class SimBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error('Sim crashed:', error)
  }
  render() {
    if (this.state.error)
      return (
        <div className="p-6">
          <p className="font-semibold text-ink">This sim hit a problem.</p>
          <p className="mt-1 text-sm text-ink-muted">{this.state.error.message}</p>
        </div>
      )
    return this.props.children
  }
}

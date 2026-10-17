import { Component, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ArrowLeft, FlaskConical } from 'lucide-react'
import clsx from 'clsx'
import { TextBlock } from '../../components/TextBlock'
import { materialPath } from '../../lib/routes'
import { simsForMaterial } from '../../lib/sims'
import type { SimDef } from '../../sims/types'
import type { Material, ZoomLevel } from '../../types/chem'

// Experiments play inside the material page (spec/design-intent.md P9): found from the stage and the
// panel, started with a link that keeps the zoom step, ended with "Back to the zoom".

export interface ExperimentLinkProps {
  material: Material
  level: ZoomLevel
  /** The experiment playing now, if any. */
  active: string | null
}

/** Link state: set when an experiment was opened from the zoom, so "Back to the zoom" can step back in history. */
export interface ExperimentNavState {
  fromZoom?: boolean
}

function ExperimentLink({ material, level, active, sim, className, activeClassName, icon = true }: ExperimentLinkProps & { sim: SimDef; className: string; activeClassName: string; icon?: boolean }) {
  const on = sim.id === active
  return (
    <Link
      to={materialPath(material.id, level, sim.id)}
      // Opening one from the zoom adds a history entry (the browser's back closes it); hopping between experiments replaces it.
      replace={!!active}
      state={{ fromZoom: true } satisfies ExperimentNavState}
      aria-current={on ? 'page' : undefined}
      title={sim.question.simple}
      className={clsx('inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors duration-200', on ? activeClassName : className)}
    >
      {icon && <FlaskConical aria-hidden className="size-4 shrink-0" />}
      {sim.title}
    </Link>
  )
}

/** The row on the stage itself: a flask, the word "Experiments", and each experiment's name. */
export function StageExperiments({ material, level, active }: ExperimentLinkProps) {
  const list = simsForMaterial(material.id)
  if (!list.length) return null
  return (
    <nav
      aria-label="Experiments"
      className="pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto rounded-2xl border border-line/60 bg-stage/80 p-1.5 backdrop-blur-md [scrollbar-width:none]"
    >
      <span className="shrink-0 px-2 text-sm font-semibold text-ink">Experiments</span>
      {list.map((s) => (
        <ExperimentLink
          key={s.id}
          sim={s}
          material={material}
          level={level}
          active={active}
          className="border-line bg-surface/80 text-ink hover:border-primary hover:text-primary"
          activeClassName="border-primary bg-primary text-stage"
        />
      ))}
    </nav>
  )
}

/** The panel's Experiments card: every experiment for this material, each one a question you can play with. */
export function ExperimentsCard({ material, level, active }: ExperimentLinkProps) {
  const list = simsForMaterial(material.id)
  if (!list.length) return null
  return (
    <section aria-labelledby="experiments-title" className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="experiments-title" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <FlaskConical aria-hidden className="size-5" style={{ color: material.accent }} />
          Experiments
        </h2>
        <p className="text-sm text-ink-muted">{active ? 'Try another one:' : 'Each one plays right here, in the 3D view.'}</p>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {list.map((s) => (
          <li key={s.id}>
            <ExperimentLink
              sim={s}
              material={material}
              level={level}
              active={active}
              className="border-line bg-surface-2/60 text-ink hover:border-primary hover:text-primary"
              activeClassName="border-primary bg-primary/15 text-primary"
              icon={false}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * The panel while an experiment plays: its name and question, then the slot the sim renders its controls,
 * readout and caption into (`slotRef`), with "Back to the zoom".
 */
export function ExperimentPanel({ sim, material, partner, onBack, slotRef }: { sim: SimDef; material: Material; partner?: Material; onBack: () => void; slotRef: (el: HTMLDivElement | null) => void }) {
  return (
    <section aria-label={`Experiment: ${sim.title}`} className="rounded-xl border border-primary/40 bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto flex items-center gap-2 text-sm font-semibold text-primary">
          <FlaskConical aria-hidden className="size-4" />
          Experiment
          {partner && (
            <span className="font-normal text-ink-muted">
              {material.short} beside {partner.short}
            </span>
          )}
        </p>
        <BackToZoom onBack={onBack} />
      </div>
      <h2 className="mt-1 font-display text-2xl font-semibold text-ink">{sim.title}</h2>
      <TextBlock text={sim.question} className="mt-1" />
      <div ref={slotRef} className="mt-4" />
    </section>
  )
}

export function BackToZoom({ onBack, onStage }: { onBack: () => void; onStage?: boolean }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={clsx(
        'pointer-events-auto inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border pr-3.5 pl-2.5 text-sm font-semibold transition-colors duration-200',
        onStage ? 'border-primary bg-primary text-stage hover:bg-ink' : 'border-line text-ink hover:bg-surface-2',
      )}
    >
      <ArrowLeft aria-hidden className="size-4" />
      Back to the zoom
    </button>
  )
}

/** An experiment that throws shows a calm message in the panel instead of taking the page down. */
export class ExperimentBoundary extends Component<{ children: ReactNode; slot: HTMLElement }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error('Experiment crashed:', error)
  }
  render() {
    if (this.state.error)
      return createPortal(
        <div>
          <p className="font-semibold text-ink">This experiment hit a problem.</p>
          <p className="mt-1 text-sm text-ink-muted">{this.state.error.message}</p>
        </div>,
        this.props.slot,
      )
    return this.props.children
  }
}

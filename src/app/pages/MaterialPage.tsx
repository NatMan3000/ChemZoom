import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Blend, Hand, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { materials } from '../../content'
import { MaterialSwitcher } from '../../components/MaterialSwitcher'
import { ZoomRail } from '../../components/ZoomRail'
import { defaultAtomIndex } from '../../lib/atoms'
import { getMoleculeSafe } from '../../lib/molecules'
import { EXPERIMENT_PARAM, experimentFor, materialPath, partnerFor, simApplies } from '../../lib/routes'
import { isZoomLevel, levelIndex, ZOOM_STEPS } from '../../lib/zoom'
import { ZoomStage } from '../../scenes/ZoomStage'
import { SimSlotsContext, type SimSlots } from '../../sims/shared/slots'
import type { SimDef } from '../../sims/types'
import { ZOOM_LEVELS, type Material, type MaterialId, type ZoomLevel } from '../../types/chem'
import { BackToZoom, ExperimentBoundary, ExperimentPanel, ExperimentsCard, StageExperiments, type ExperimentNavState } from '../material/Experiments'
import { AtAGlance, MaterialMore } from '../material/MaterialMore'
import { StageFoot } from '../material/StageFoot'
import { StepCard } from '../material/StepCard'
import { NotFound } from './NotFound'

export default function MaterialPage() {
  const { id, step } = useParams()
  const [params] = useSearchParams()
  const material = id ? materials[id as MaterialId] : undefined
  if (!material) return <NotFound />
  return <MaterialView material={material} level={isZoomLevel(step) ? step : 'spool'} experiment={experimentFor(material, params.get(EXPERIMENT_PARAM))} />
}

function MaterialView({ material, level, experiment }: { material: Material; level: ZoomLevel; experiment: SimDef | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const molecule = getMoleculeSafe(material.oligomer)
  const defaultGroup = molecule?.groups.some((g) => g.id === material.repeatUnitGroup) ? material.repeatUnitGroup : null

  // Per-material choices reset when the material changes, without remounting the stage.
  // The molecule step arrives with the whole piece lit (highlight null); the stage still frames and outlines
  // the repeat unit you zoomed into (D19, 17 Oct).
  const [pick, setPick] = useState<{ mid: string; group: string | null; atom: number | null }>({ mid: material.id, group: null, atom: null })
  const highlight = pick.mid === material.id ? pick.group : null
  const selectedAtom = pick.mid === material.id ? pick.atom : null
  const setHighlight = (group: string | null) => setPick({ mid: material.id, group, atom: null })
  const setAtom = useCallback(
    (atom: number | null) => setPick((p) => ({ mid: material.id, group: p.mid === material.id ? p.group : null, atom })),
    [material.id],
  )
  // The atom step always shows one atom: the one picked, else a backbone carbon in the lit repeat unit (P7).
  // The page resolves it so the stage and the panel can never disagree.
  const atomIndex = level === 'atom' && molecule ? (selectedAtom ?? defaultAtomIndex(molecule, highlight ?? defaultGroup)) : selectedAtom

  const [spaceFill, setSpaceFill] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)

  const go = useCallback((l: ZoomLevel) => navigate(materialPath(material.id, l), { replace: true }), [navigate, material.id])
  const idx = levelIndex(level)

  // The continuous zoom crossed into another level: the rail, panel and URL follow (replace, so Back is not flooded).
  const onLevelChange = useCallback(
    (l: ZoomLevel) => {
      if (experiment || l === level) return
      go(l)
    },
    [experiment, level, go],
  )

  // A tapped atom at the molecule step, or the atom the zoom dived into, becomes the atom on show.
  const onAtomClick = useCallback(
    (i: number | null) => {
      if (i === null) {
        if (level !== 'atom') setAtom(null) // a click on empty stage must not empty the atom step
        return
      }
      setAtom(i)
      if (level === 'molecule') go('atom')
    },
    [level, setAtom, go],
  )

  const closeExperiment = useCallback(() => {
    if ((location.state as ExperimentNavState | null)?.fromZoom) navigate(-1)
    else navigate(materialPath(material.id, level), { replace: true })
  }, [location.state, navigate, material.id, level])

  // Arrow keys step through the zoom (not while an experiment plays); Escape ends an experiment.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.altKey || e.metaKey || e.ctrlKey) return
      if (experiment) {
        if (e.key !== 'Escape') return
        closeExperiment()
      } else if (e.key === 'ArrowRight' && idx < ZOOM_LEVELS.length - 1) go(ZOOM_LEVELS[idx + 1])
      else if (e.key === 'ArrowLeft' && idx > 0) go(ZOOM_LEVELS[idx - 1])
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, idx, experiment, closeExperiment])

  useEffect(() => {
    document.title = experiment ? `${experiment.title}: ${material.short} | ChemZoom` : `${material.short}: ${ZOOM_STEPS[idx].label} | ChemZoom`
    return () => void (document.title = 'ChemZoom')
  }, [material.short, idx, experiment])

  // The two places a playing experiment draws into: the stage (its 3D view) and the panel (its controls).
  const [stageSlot, setStageSlot] = useState<HTMLDivElement | null>(null)
  const [panelSlot, setPanelSlot] = useState<HTMLDivElement | null>(null)
  const slots = useMemo<SimSlots | null>(() => (stageSlot && panelSlot ? { stage: stageSlot, panel: panelSlot } : null), [stageSlot, panelSlot])
  const partner = experiment ? partnerFor(experiment, material) : undefined
  const Sim = experiment?.Component

  // Keep the experiment's stage clear of the zoom rail (desktop standard: nothing important under the rail).
  const railRef = useRef<HTMLDivElement>(null)
  const railRight = useRailRight(railRef)

  const switchHref = (m: MaterialId) => {
    const keep = experiment && simApplies(experiment, m) ? experiment.id : null
    return materialPath(m, level, keep)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row" style={{ ['--accent' as string]: material.accent }}>
      {/* Stage */}
      <section
        aria-label={experiment ? `Experiment: ${experiment.title}, ${material.short}` : `3D view: ${material.short}, ${ZOOM_STEPS[idx].label.toLowerCase()} step`}
        className="relative h-[55%] shrink-0 overflow-hidden md:h-auto md:min-w-0 md:flex-1"
        style={{ ['--rail-right' as string]: `${railRight}px` }}
      >
        <div
          aria-hidden
          className={clsx('absolute inset-0', experiment && 'hidden')}
          style={{ background: `radial-gradient(ellipse 70% 60% at 55% 45%, ${material.accent}1f, transparent 70%), radial-gradient(ellipse 120% 90% at 50% 120%, #1b2440, transparent 70%)` }}
        />
        {/* The zoom stays mounted under an experiment, so "Back to the zoom" returns to the same view. */}
        <div className={clsx('absolute inset-0 touch-none', experiment && 'invisible')} aria-hidden={experiment ? true : undefined}>
          <ZoomStage
            material={material}
            level={level}
            onLevelChange={onLevelChange}
            highlight={highlight}
            selectedAtom={atomIndex}
            onAtomClick={onAtomClick}
            spaceFill={spaceFill}
            resetSignal={resetSignal}
          />
        </div>
        {experiment && (
          <div ref={setStageSlot} className="absolute inset-0 bg-stage md:left-[var(--rail-right)]">
            <p className="grid h-full place-items-center text-ink-muted">Setting up the experiment</p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 flex flex-col p-2 sm:p-3">
          <div className="flex items-start gap-2">
            <div ref={railRef} className="pointer-events-auto hidden rounded-2xl border border-line/60 bg-stage/75 p-1.5 backdrop-blur-md md:block">
              <ZoomRail level={level} onChange={go} orientation="vertical" />
            </div>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              {experiment ? (
                <BackToZoom onBack={closeExperiment} onStage />
              ) : (
                <>
                  <span className="hidden items-center gap-1.5 rounded-full border border-line/60 bg-stage/75 px-3 py-1.5 text-sm text-ink-muted backdrop-blur-md xl:inline-flex">
                    <Hand aria-hidden className="size-4" /> Drag to turn, scroll to zoom
                  </span>
                  <span className="rounded-full border border-line/60 bg-stage/75 px-3 py-1.5 text-sm font-semibold text-ink backdrop-blur-md tabular-nums">{ZOOM_STEPS[idx].scale}</span>
                  {level === 'molecule' && molecule && (
                    <button
                      type="button"
                      onClick={() => setSpaceFill((s) => !s)}
                      aria-pressed={spaceFill}
                      title="Show each atom at its real size"
                      className={clsx(
                        'pointer-events-auto inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold backdrop-blur-md transition-colors duration-200',
                        spaceFill ? 'border-primary bg-primary text-stage' : 'border-line/60 bg-stage/75 text-ink hover:border-ink-muted',
                      )}
                    >
                      <Blend aria-hidden className="size-4" />
                      Space-filling
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setResetSignal((n) => n + 1)}
                    aria-label="Reset the view"
                    title="Reset the view"
                    className="pointer-events-auto grid size-9 place-items-center rounded-full border border-line/60 bg-stage/75 text-ink-muted backdrop-blur-md transition-colors duration-200 hover:text-ink"
                  >
                    <RotateCcw aria-hidden className="size-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {!experiment && (
            <div className="mt-auto flex flex-col items-start gap-2 lg:flex-row lg:items-end">
              <StageFoot material={material} level={level} molecule={molecule} />
              <div className="max-w-full lg:ml-auto">
                <StageExperiments material={material} level={level} active={null} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Phone: the zoom rail becomes a step bar under the stage. */}
      <div className="shrink-0 border-y border-line/70 bg-surface/70 px-1.5 py-1 md:hidden">
        <ZoomRail level={level} onChange={go} orientation="horizontal" />
      </div>

      {/* Story panel: the page's one scroll container. At 1920x1080 its default content fits one screen (P5). */}
      <aside
        aria-label={`${material.short} story`}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-stage md:w-[26rem] md:flex-none md:border-l md:border-line/70 lg:w-[min(40%,48rem)]"
      >
        <div className="flex flex-col gap-3 p-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-4 md:pb-3 lg:px-5">
          <header className="flex flex-col gap-2">
            <MaterialSwitcher current={material.id} hrefFor={switchHref} />
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h1 className="flex flex-wrap items-baseline gap-x-3 font-display text-3xl font-bold text-ink">
                  <span style={{ color: material.accent }}>{material.short}</span>
                  <span className="text-lg font-semibold text-ink-muted">{material.fullName}</span>
                </h1>
                <p className="text-base font-semibold text-ink sm:ml-auto">{material.nickname}</p>
              </div>
              {/* The big idea's simple line only: its deeper layer opens first in "More about" so Deeper does not push the step card down. */}
              <p className="mt-1 text-base leading-relaxed text-ink">{material.keyIdea.simple}</p>
            </div>
          </header>

          {experiment ? (
            <ExperimentPanel sim={experiment} material={material} partner={partner} onBack={closeExperiment} slotRef={setPanelSlot} />
          ) : (
            <StepCard material={material} level={level} molecule={molecule} go={go} highlight={highlight} setHighlight={setHighlight} atomIndex={atomIndex} setAtom={setAtom} />
          )}

          <ExperimentsCard material={material} level={level} active={experiment?.id ?? null} />
          <AtAGlance material={material} />
          <MaterialMore material={material} />
        </div>
      </aside>

      {Sim && experiment && slots && (
        <SimSlotsContext.Provider value={slots}>
          <ExperimentBoundary key={`${experiment.id}:${material.id}`} slot={slots.panel}>
            <Sim material={material} compareWith={partner} />
          </ExperimentBoundary>
        </SimSlotsContext.Provider>
      )}
    </div>
  )
}

/** The rail's right edge within the stage, in px, kept current as the rail resizes. 0 when it is hidden. */
function useRailRight(ref: React.RefObject<HTMLDivElement | null>): number {
  const [right, setRight] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setRight(el.offsetWidth ? el.offsetLeft + el.offsetWidth + 8 : 0)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return right
}

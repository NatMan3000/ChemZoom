import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Blend, ChevronLeft, ChevronRight, FlaskConical, GitCompareArrows, Hand, Layers, Lightbulb, ListChecks, Play, Printer, RotateCcw, Sprout } from 'lucide-react'
import clsx from 'clsx'
import { materials } from '../../content'
import { AtomLegend } from '../../components/AtomLegend'
import { Card } from '../../components/Card'
import { Formula } from '../../components/Formula'
import { ElementCard } from '../../components/ElementCard'
import { MaterialSwitcher } from '../../components/MaterialSwitcher'
import { SourceLinks } from '../../components/SourceLinks'
import { StageKey, type StageKeyItem } from '../../components/StageKey'
import { TempsTable } from '../../components/TempsTable'
import { TextBlock } from '../../components/TextBlock'
import { TraitBars } from '../../components/TraitBars'
import { ZoomRail } from '../../components/ZoomRail'
import { getMoleculeSafe } from '../../lib/molecules'
import { simsForMaterial } from '../../lib/sims'
import { moleculesFor, sourcesFor } from '../../lib/sources'
import { formatMetres, metresPerSpool } from '../../lib/spool'
import { MORPHOLOGY_LABELS } from '../../lib/text'
import { isZoomLevel, levelIndex, ZOOM_STEPS } from '../../lib/zoom'
import { RUBBER_COLOUR, ROLE_LABELS, roleColour } from '../../scenes/palette'
import { chainRoles, tangleRoles } from '../../scenes/stageKeys'
import { ZoomStage } from '../../scenes/ZoomStage'
import { ZOOM_LEVELS, type Material, type MaterialId, type Molecule, type ZoomLevel } from '../../types/chem'
import { NotFound } from './NotFound'

export default function MaterialPage() {
  const { id, step } = useParams()
  const material = id ? materials[id as MaterialId] : undefined
  if (!material) return <NotFound />
  return <MaterialView material={material} level={isZoomLevel(step) ? step : 'spool'} />
}

function MaterialView({ material, level }: { material: Material; level: ZoomLevel }) {
  const navigate = useNavigate()
  const molecule = getMoleculeSafe(material.oligomer)
  const defaultGroup = molecule?.groups.some((g) => g.id === material.repeatUnitGroup) ? material.repeatUnitGroup : null

  // Per-material choices reset when the material changes, without remounting the stage.
  const [pick, setPick] = useState<{ mid: string; group: string | null; atom: number | null }>({ mid: material.id, group: defaultGroup, atom: null })
  const highlight = pick.mid === material.id ? pick.group : defaultGroup
  const selectedAtom = pick.mid === material.id ? pick.atom : null
  const setHighlight = (group: string | null) => setPick({ mid: material.id, group, atom: null })
  const setAtom = useCallback(
    (atom: number | null) => setPick((p) => ({ mid: material.id, group: p.mid === material.id ? p.group : defaultGroup, atom })),
    [material.id, defaultGroup],
  )
  const [spaceFill, setSpaceFill] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)

  const go = useCallback((l: ZoomLevel) => navigate(`/m/${material.id}/${l}`, { replace: true }), [navigate, material.id])
  const idx = levelIndex(level)

  // Arrow keys step through the zoom when focus is not in a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.altKey || e.metaKey || e.ctrlKey) return
      if (e.key === 'ArrowRight' && idx < ZOOM_LEVELS.length - 1) go(ZOOM_LEVELS[idx + 1])
      else if (e.key === 'ArrowLeft' && idx > 0) go(ZOOM_LEVELS[idx - 1])
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, idx])

  useEffect(() => {
    document.title = `${material.short}: ${ZOOM_STEPS[idx].label} | ChemZoom`
    return () => void (document.title = 'ChemZoom')
  }, [material.short, idx])

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row" style={{ ['--accent' as string]: material.accent }}>
      {/* Stage */}
      <section aria-label={`3D view: ${material.short}, ${ZOOM_STEPS[idx].label.toLowerCase()} step`} className="relative h-[55%] shrink-0 overflow-hidden md:h-auto md:min-w-0 md:flex-1">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse 70% 60% at 55% 45%, ${material.accent}1f, transparent 70%), radial-gradient(ellipse 120% 90% at 50% 120%, #1b2440, transparent 70%)` }}
        />
        <div className="absolute inset-0 touch-none">
          <ZoomStage material={material} level={level} highlight={highlight} selectedAtom={selectedAtom} onAtomClick={setAtom} spaceFill={spaceFill} resetSignal={resetSignal} />
        </div>

        <div className="pointer-events-none absolute inset-0 flex flex-col p-2 sm:p-3">
          <div className="flex items-start gap-2">
            <div className="pointer-events-auto hidden rounded-2xl border border-line/60 bg-stage/75 p-1.5 backdrop-blur-md md:block">
              <ZoomRail level={level} onChange={go} orientation="vertical" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden rounded-full border border-line/60 bg-stage/75 px-3 py-1.5 text-xs text-ink-muted backdrop-blur-md lg:inline-flex lg:items-center lg:gap-1.5">
                <Hand aria-hidden className="size-3.5" /> Drag to turn, scroll to zoom
              </span>
              <span className="rounded-full border border-line/60 bg-stage/75 px-3 py-1.5 text-xs font-semibold text-ink backdrop-blur-md tabular-nums">
                {ZOOM_STEPS[idx].scale}
              </span>
              <button
                type="button"
                onClick={() => setResetSignal((n) => n + 1)}
                aria-label="Reset the view"
                title="Reset the view"
                className="pointer-events-auto grid size-9 place-items-center rounded-full border border-line/60 bg-stage/75 text-ink-muted backdrop-blur-md transition-colors duration-200 hover:text-ink"
              >
                <RotateCcw aria-hidden className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-auto flex items-end gap-2">
            <StageFoot material={material} level={level} molecule={molecule} />
            {level === 'atom' && molecule && (
              <button
                type="button"
                onClick={() => setSpaceFill((s) => !s)}
                aria-pressed={spaceFill}
                className={clsx(
                  'pointer-events-auto ml-auto inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold backdrop-blur-md transition-colors duration-200',
                  spaceFill ? 'border-primary bg-primary text-stage' : 'border-line/60 bg-stage/75 text-ink hover:border-ink-muted',
                )}
              >
                <Blend aria-hidden className="size-4" />
                Space-filling
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Phone: the zoom rail becomes a step bar under the stage. */}
      <div className="shrink-0 border-y border-line/70 bg-surface/70 px-1.5 py-1 md:hidden">
        <ZoomRail level={level} onChange={go} orientation="horizontal" />
      </div>

      {/* Story panel: the page's one scroll container. */}
      <aside aria-label={`${material.short} story`} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-stage md:w-[24rem] md:flex-none md:border-l md:border-line/70 lg:w-[min(36%,40rem)]">
        <div className="flex flex-col gap-4 p-3 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:p-5">
          <MaterialSwitcher current={material.id} hrefFor={(m) => `/m/${m}/${level}`} />

          <header>
            <h1 className="flex flex-wrap items-baseline gap-x-3 font-display text-3xl font-bold text-ink sm:text-4xl">
              <span style={{ color: material.accent }}>{material.short}</span>
              <span className="text-lg font-semibold text-ink-muted sm:text-xl">{material.fullName}</span>
            </h1>
            <p className="mt-1 text-base font-semibold text-ink">{material.nickname}</p>
          </header>

          <StepCard material={material} level={level} molecule={molecule} go={go} highlight={highlight} setHighlight={setHighlight} selectedAtom={selectedAtom} setAtom={setAtom} />

          <Card title="The big idea" icon={Lightbulb} accent={material.accent}>
            <TextBlock text={material.keyIdea} size="lg" />
          </Card>

          <SimsCard material={material} />

          <Card title="Printing it" icon={Printer} accent={material.accent}>
            <TempsTable material={material} />
            {material.print.tips.length > 0 && (
              <ul className="mt-4 flex flex-col gap-3">
                {material.print.tips.map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: material.accent }} />
                    <TextBlock text={t} className="min-w-0 flex-1" />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="How it stacks up" icon={ListChecks} accent={material.accent}>
            <TraitBars material={material} />
            <Link
              to={`/compare?a=${material.id}&b=${material.id === 'pla' ? 'petg' : 'pla'}`}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-ink"
            >
              <GitCompareArrows aria-hidden className="size-4" />
              Compare {material.short} with another filament
            </Link>
          </Card>

          <Card title="What it is made from" icon={Sprout} accent={material.accent}>
            <TextBlock text={material.madeFrom} />
            <BuildingBlocks material={material} />
          </Card>

          {material.facts.length > 0 && (
            <Card title="Did you know?" icon={FlaskConical} accent={material.accent}>
              <ul className="flex flex-col gap-4">
                {material.facts.map((f, i) => (
                  <li key={i} className="border-b border-line/60 pb-4 last:border-b-0 last:pb-0">
                    <TextBlock text={f.text} />
                    <SourceLinks sources={f.sources} className="mt-2" />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Where this comes from" icon={Layers} accent={material.accent}>
            {sourcesFor(material).length ? (
              <SourceLinks sources={sourcesFor(material)} label="Sources" />
            ) : (
              <p className="text-sm text-ink-muted">Sources for {material.short} are being checked.</p>
            )}
            <Link to="/sources" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-ink">
              Every source in ChemZoom <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Card>
        </div>
      </aside>
    </div>
  )
}

/** The bottom-left of the stage: what the colours mean at this step. */
function StageFoot({ material, level, molecule }: { material: Material; level: ZoomLevel; molecule: Molecule | null }) {
  let items: StageKeyItem[] | null = null
  if (level === 'tangle')
    items = tangleRoles(material).map((r) => ({ colour: r === 'rubber' ? RUBBER_COLOUR : `#${roleColour(material.accent, r, 0.7).getHexString()}`, label: ROLE_LABELS[r] }))
  if (level === 'chain')
    items = chainRoles(material).map((r) => ({
      colour: `#${roleColour(material.accent, r, 0.6).getHexString()}`,
      label: r === 'focus' ? 'The unit we zoom into next' : r === 'soft' ? 'Soft segment' : material.morphology === 'segmented' ? 'Hard segment' : 'One repeat unit',
    }))
  if (items) return <StageKey items={items} />
  if ((level === 'molecule' || level === 'atom') && molecule)
    return (
      <div className="pointer-events-auto rounded-2xl border border-line/60 bg-stage/75 px-3 py-2 backdrop-blur-md">
        <AtomLegend molecule={molecule} />
      </div>
    )
  return null
}

function StepCard({
  material,
  level,
  molecule,
  go,
  highlight,
  setHighlight,
  selectedAtom,
  setAtom,
}: {
  material: Material
  level: ZoomLevel
  molecule: Molecule | null
  go: (l: ZoomLevel) => void
  highlight: string | null
  setHighlight: (g: string | null) => void
  selectedAtom: number | null
  setAtom: (a: number | null) => void
}) {
  const idx = levelIndex(level)
  const info = ZOOM_STEPS[idx]
  const prev = ZOOM_STEPS[idx - 1]
  const next = ZOOM_STEPS[idx + 1]
  const Icon = info.icon
  return (
    <section aria-live="polite" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Icon aria-hidden className="size-4" />
        Step {idx + 1} of 6: {info.label}
      </p>
      <TextBlock text={material.zoom[level]} size="lg" className="mt-2" />

      {level === 'spool' && <SpoolMaths material={material} />}
      {level === 'tangle' && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-sm text-ink">
          <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: material.accent }} />
          {MORPHOLOGY_LABELS[material.morphology]}
        </p>
      )}
      {level === 'molecule' && molecule && <GroupPicker molecule={molecule} highlight={highlight} setHighlight={setHighlight} accent={material.accent} />}
      {level === 'atom' && molecule && <AtomStep molecule={molecule} selectedAtom={selectedAtom} setAtom={setAtom} />}
      {(level === 'molecule' || level === 'atom') && !molecule && (
        <p className="mt-4 text-sm text-ink-muted">The 3D model for {material.short} is still being built.</p>
      )}

      <div className="mt-5 flex gap-2">
        {prev && (
          <button
            type="button"
            onClick={() => go(prev.level)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-surface-2"
          >
            <ChevronLeft aria-hidden className="size-4" />
            <span>
              Zoom out<span className="hidden sm:inline md:hidden xl:inline">: {prev.label}</span>
            </span>
          </button>
        )}
        {next && (
          <button
            type="button"
            onClick={() => go(next.level)}
            className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-stage transition-colors duration-200 hover:bg-ink"
          >
            <span>
              Zoom in<span className="hidden sm:inline md:hidden xl:inline">: {next.label}</span>
            </span>
            <ChevronRight aria-hidden className="size-4" />
          </button>
        )}
      </div>
    </section>
  )
}

function SpoolMaths({ material }: { material: Material }) {
  const metres = metresPerSpool(material.densityGcm3)
  return (
    <div className="mt-4 rounded-lg bg-surface-2 p-4">
      <p className="text-sm text-ink-muted">One 1 kg spool of {material.short} holds about</p>
      <p className="font-display text-4xl font-bold tabular-nums" style={{ color: material.accent }}>
        {formatMetres(metres)}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        of 1.75 mm strand. Worked out from how heavy {material.short} is for its size: {material.densityGcm3} g per cubic centimetre.
      </p>
    </div>
  )
}

function GroupPicker({ molecule, highlight, setHighlight, accent }: { molecule: Molecule; highlight: string | null; setHighlight: (g: string | null) => void; accent: string }) {
  const active = molecule.groups.find((g) => g.id === highlight)
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm text-ink-muted">Tap a part to light it up:</p>
      <div className="flex flex-wrap gap-2">
        {molecule.groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setHighlight(highlight === g.id ? null : g.id)}
            aria-pressed={highlight === g.id}
            className={clsx(
              'min-h-10 rounded-full border px-3.5 text-sm font-semibold transition-colors duration-200',
              highlight === g.id ? 'border-transparent text-stage' : 'border-line text-ink hover:bg-surface-2',
            )}
            style={highlight === g.id ? { backgroundColor: accent } : undefined}
          >
            {g.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setHighlight(null)}
          aria-pressed={highlight === null}
          className={clsx(
            'min-h-10 rounded-full border px-3.5 text-sm font-semibold transition-colors duration-200',
            highlight === null ? 'border-primary bg-primary/15 text-primary' : 'border-line text-ink-muted hover:bg-surface-2',
          )}
        >
          Show it all
        </button>
      </div>
      {active?.note && <TextBlock text={active.note} className="mt-3 rounded-lg bg-surface-2 p-3" />}
      <p className="mt-3 text-sm text-ink-muted">
        {molecule.name} <span className="tabular-nums">(<Formula formula={molecule.formula} />)</span>
      </p>
    </div>
  )
}

function AtomStep({ molecule, selectedAtom, setAtom }: { molecule: Molecule; selectedAtom: number | null; setAtom: (a: number | null) => void }) {
  const atom = selectedAtom !== null ? molecule.atoms[selectedAtom] : undefined
  const bondsHere = useMemo(() => {
    if (selectedAtom === null) return 0
    return molecule.bonds.reduce((n, b) => n + (b.a === selectedAtom || b.b === selectedAtom ? b.order : 0), 0)
  }, [molecule, selectedAtom])
  if (atom) return <ElementCard symbol={atom.el} bondsHere={bondsHere} onClose={() => setAtom(null)} />
  return (
    <div className="mt-4 rounded-lg bg-surface-2 p-4">
      <p className="flex items-center gap-2 font-semibold text-ink">
        <Hand aria-hidden className="size-4 text-primary" /> Tap any atom in the model
      </p>
      <p className="mt-1 text-sm text-ink-muted">This piece has {molecule.atoms.length} atoms of these kinds:</p>
      <AtomLegend molecule={molecule} showCounts className="mt-3" />
    </div>
  )
}

function SimsCard({ material }: { material: Material }) {
  const list = simsForMaterial(material.id)
  if (!list.length) return null
  return (
    <Card title="Try it" icon={Play} accent={material.accent}>
      <ul className="flex flex-col gap-2">
        {list.map((s) => (
          <li key={s.id}>
            <Link
              to={`/m/${material.id}/sim/${s.id}`}
              className="group flex items-center gap-3 rounded-lg border border-line/70 bg-surface-2/50 p-3 transition-colors duration-200 hover:border-line hover:bg-surface-2"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                <Play aria-hidden className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{s.title}</span>
                <span className="block text-sm leading-snug text-ink-muted">{s.question.simple}</span>
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-muted transition-colors group-hover:text-ink" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function BuildingBlocks({ material }: { material: Material }) {
  const blocks = moleculesFor(material).filter((m) => material.monomers.includes(m.id))
  if (!blocks.length) return null
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-semibold text-ink">Building blocks</p>
      <ul className="flex flex-wrap gap-2">
        {blocks.map((b) => (
          <li key={b.id} className="rounded-lg border border-line/70 bg-surface-2/60 px-3 py-2">
            <span className="block text-sm font-semibold text-ink">{b.name}</span>
            <span className="block text-xs text-ink-muted tabular-nums"><Formula formula={b.formula} /></span>
          </li>
        ))}
      </ul>
    </div>
  )
}

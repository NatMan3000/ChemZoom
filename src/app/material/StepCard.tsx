import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, Link2, MousePointerClick } from 'lucide-react'
import clsx from 'clsx'
import { elements, materialList } from '../../content'
import { ElementCard } from '../../components/ElementCard'
import { Formula } from '../../components/Formula'
import { SpoolBadge } from '../../components/SpoolBadge'
import { TextBlock } from '../../components/TextBlock'
import { joinStory } from '../../lib/atoms'
import { materialPath } from '../../lib/routes'
import { formatMetres, metresPerSpool } from '../../lib/spool'
import { MORPHOLOGY_LABELS } from '../../lib/text'
import { levelIndex, ZOOM_STEPS } from '../../lib/zoom'
import type { Material, Molecule, ZoomLevel } from '../../types/chem'

export interface StepCardProps {
  material: Material
  level: ZoomLevel
  molecule: Molecule | null
  go: (l: ZoomLevel) => void
  highlight: string | null
  setHighlight: (g: string | null) => void
  /** The atom on show at the atom step (picked, or the default backbone carbon). */
  atomIndex: number | null
  setAtom: (a: number | null) => void
}

/** The panel's card for the current zoom step: the only card that changes as you zoom. */
export function StepCard({ material, level, molecule, go, highlight, setHighlight, atomIndex, setAtom }: StepCardProps) {
  const idx = levelIndex(level)
  const info = ZOOM_STEPS[idx]
  const prev = ZOOM_STEPS[idx - 1]
  const next = ZOOM_STEPS[idx + 1]
  const Icon = info.icon
  return (
    <section aria-live="polite" aria-label={`Step ${idx + 1} of 6: ${info.label}`} className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto flex items-center gap-2 text-sm font-semibold text-primary">
          <Icon aria-hidden className="size-4" />
          Step {idx + 1} of 6: {info.label}
        </p>
        {prev && (
          <button
            type="button"
            onClick={() => go(prev.level)}
            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-line pr-3.5 pl-2.5 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-surface-2"
          >
            <ChevronLeft aria-hidden className="size-4" />
            <span>
              Out<span className="sr-only xl:not-sr-only">: {prev.label}</span>
            </span>
          </button>
        )}
        {next && (
          <button
            type="button"
            onClick={() => go(next.level)}
            className="inline-flex min-h-10 items-center gap-1 rounded-full bg-primary pr-2.5 pl-3.5 text-sm font-semibold text-stage transition-colors duration-200 hover:bg-ink"
          >
            <span>
              Zoom in<span className="sr-only xl:not-sr-only">: {next.label}</span>
            </span>
            <ChevronRight aria-hidden className="size-4" />
          </button>
        )}
      </div>
      <TextBlock text={material.zoom[level]} size={level === 'atom' ? 'sm' : 'lg'} className="mt-2" />

      {level === 'spool' && <SpoolMaths material={material} />}
      {level === 'tangle' && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-sm text-ink">
          <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: material.accent }} />
          {MORPHOLOGY_LABELS[material.morphology]}
        </p>
      )}
      {level === 'molecule' && molecule && <GroupPicker molecule={molecule} highlight={highlight} setHighlight={setHighlight} accent={material.accent} short={material.short} />}
      {level === 'atom' && molecule && atomIndex !== null && <AtomStep molecule={molecule} atomIndex={atomIndex} setAtom={setAtom} />}
      {level === 'atom' && <NextMaterial material={material} />}
      {(level === 'molecule' || level === 'atom') && !molecule && <p className="mt-3 text-sm text-ink-muted">The 3D model for {material.short} is still being built.</p>}
    </section>
  )
}

function SpoolMaths({ material }: { material: Material }) {
  const metres = metresPerSpool(material.densityGcm3)
  return (
    <div className="mt-3 flex items-center gap-4 rounded-lg bg-surface-2 px-4 py-3">
      <p className="shrink-0 font-display text-4xl font-bold tabular-nums" style={{ color: material.accent }}>
        {formatMetres(metres)}
      </p>
      <p className="text-sm text-ink-muted">
        of 1.75 mm strand on one 1 kg spool, worked out from how heavy {material.short} is for its size: {material.densityGcm3} g per cubic centimetre.
      </p>
    </div>
  )
}

function GroupPicker({ molecule, highlight, setHighlight, accent, short }: { molecule: Molecule; highlight: string | null; setHighlight: (g: string | null) => void; accent: string; short: string }) {
  const active = molecule.groups.find((g) => g.id === highlight)
  const chip = 'min-h-10 rounded-full border px-3.5 text-sm font-semibold transition-colors duration-200'
  return (
    <div className="mt-3">
      <p className="mb-2 text-sm text-ink-muted">
        Light up a part of {molecule.name} <span className="tabular-nums">(<Formula formula={molecule.formula} />)</span>:
      </p>
      <div className="flex flex-wrap gap-2">
        {/* The whole piece is lit when you arrive; the chips light single parts (D19, 17 Oct). */}
        <button
          type="button"
          onClick={() => setHighlight(null)}
          aria-pressed={highlight === null}
          className={clsx(chip, highlight === null ? 'border-primary bg-primary/15 text-primary' : 'border-line text-ink-muted hover:bg-surface-2')}
        >
          The whole piece
        </button>
        {molecule.groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setHighlight(highlight === g.id ? null : g.id)}
            aria-pressed={highlight === g.id}
            className={clsx(chip, highlight === g.id ? 'border-transparent text-stage' : 'border-line text-ink hover:bg-surface-2')}
            style={highlight === g.id ? { backgroundColor: accent } : undefined}
          >
            {g.label}
          </button>
        ))}
      </div>
      {active?.note ? (
        <TextBlock text={active.note} className="mt-3 rounded-lg bg-surface-2 p-3" />
      ) : (
        <p className="mt-3 rounded-lg bg-surface-2 p-3 text-ink">
          A short piece cut from one {short} chain. A real chain is thousands of these units long.
        </p>
      )}
      {/* Tappable looks tappable (finding 10): say so here as well as on the model. */}
      <p className="mt-3 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-ink">
        <MousePointerClick aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>Every ball is one atom. Tap one, or scroll in over it, and the zoom dives right into it.</span>
      </p>
    </div>
  )
}

function AtomStep({ molecule, atomIndex, setAtom }: { molecule: Molecule; atomIndex: number; setAtom: (a: number | null) => void }) {
  const atom = molecule.atoms[atomIndex]
  const story = atom ? joinStory(molecule, atomIndex) : null
  if (!atom) return null
  return (
    <div className="mt-3">
      <ElementCard symbol={atom.el} showBlurb={false}>
        {story && (
          <div className="mt-3 rounded-lg bg-surface px-3 py-2">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                <Link2 aria-hidden className="size-4" /> How it joins in
              </span>
              {/* The scene shows this sum beside the atom on a desktop but drops it on a phone; the panel always carries it. */}
              <span className="font-display text-lg font-semibold text-ink tabular-nums">{story.sum}</span>
            </p>
            <TextBlock text={{ simple: `${story.line} Each bond is one shared pair, an electron from each side.`, deeper: story.deeper }} size="sm" className="mt-1" />
            {story.neighbours.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 text-sm text-ink-muted">Joined to (tap one to hop over)</span>
                {story.neighbours.map((n) => {
                  const e = elements[n.el]
                  return (
                    <button
                      key={n.index}
                      type="button"
                      onClick={() => setAtom(n.index)}
                      title={`Hop to this ${e?.name.toLowerCase() ?? n.el}`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 text-sm font-semibold text-ink transition-colors duration-200 hover:border-primary hover:text-primary"
                    >
                      <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: e?.colour }} />
                      {e?.name ?? n.el}
                      {(n.order > 1 || n.aromatic) && (
                        <span className="font-normal text-ink-muted">{n.aromatic ? 'ring bond' : n.order === 2 ? 'double bond' : 'triple bond'}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </ElementCard>
    </div>
  )
}

/** The end of the zoom points on to the next filament (spec/design-intent.md P13). */
function NextMaterial({ material }: { material: Material }) {
  const i = materialList.findIndex((m) => m.id === material.id)
  const next = materialList[(i + 1) % materialList.length]
  if (!next || next.id === material.id) return null
  const nick = next.nickname.charAt(0).toLowerCase() + next.nickname.slice(1)
  return (
    <Link
      to={materialPath(next.id, 'spool')}
      className="group mt-3 flex items-center gap-3 rounded-lg border border-line/70 bg-surface-2/50 px-3 py-2 transition-colors duration-200 hover:border-line hover:bg-surface-2"
    >
      <SpoolBadge accent={next.accent} size={32} className="shrink-0" />
      <span className="min-w-0 flex-1 text-sm text-ink-muted">
        That is as far down as {material.short} goes. Next up:{' '}
        <span className="font-semibold text-ink">
          <span style={{ color: next.accent }}>{next.short}</span>, {nick}
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary group-hover:text-ink">
        Zoom into {next.short} <ArrowRight aria-hidden className="size-4" />
      </span>
    </Link>
  )
}

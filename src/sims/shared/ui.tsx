import { useId, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import { useDeeper } from '../../lib/depth'
import type { Material, Text } from '../../types/chem'
import { useElementSize } from './layout'
import { useSimSlots } from './slots'
import './sims.css'

// The frame and controls every sim shares, so the five read as one family: the 3D stage, the control,
// a one-line live readout, and a "What you're seeing" caption (its deeper layer follows the app's depth switch).
// Inside a material page the stage and the controls render into the page's own stage and panel (slots.ts);
// on their own they stack: stage on top, the panel below.

export interface SimFrameProps {
  stageRef?: RefObject<HTMLDivElement | null>
  stage: ReactNode
  /** DOM labels over the stage (pointer-events off). */
  overlay?: ReactNode
  controls: ReactNode
  readout: string
  caption: Text
}

export function SimFrame({ stageRef, stage, overlay, controls, readout, caption }: SimFrameProps) {
  const slots = useSimSlots()
  if (slots)
    return (
      <>
        {createPortal(
          <div ref={stageRef} className="absolute inset-0 bg-stage text-ink">
            <div className="absolute inset-0">{stage}</div>
            {overlay && <div className="pointer-events-none absolute inset-0">{overlay}</div>}
          </div>,
          slots.stage,
        )}
        {createPortal(
          <div className="space-y-3 text-ink">
            {controls}
            <p aria-live="polite" className="font-display text-lg leading-snug font-medium tabular-nums">
              {readout}
            </p>
            <Caption text={caption} />
          </div>,
          slots.panel,
        )}
      </>
    )
  return (
    // Phone: a tall fixed stage and the panel at its natural height, so the host's panel scrolls.
    // From md up: the stage fills what the panel leaves, and a long panel scrolls on its own.
    <div className="flex min-h-full w-full flex-col bg-stage text-ink md:h-full md:min-h-0">
      <div ref={stageRef} className="relative h-[44svh] min-h-[240px] shrink-0 md:h-auto md:min-h-[200px] md:flex-1 md:shrink">
        <div className="absolute inset-0">{stage}</div>
        {overlay && <div className="pointer-events-none absolute inset-0">{overlay}</div>}
      </div>
      <div className="flex-1 space-y-3 border-t border-line bg-surface px-4 py-3 md:max-h-[55%] md:flex-none md:shrink-0 md:overflow-y-auto md:px-6 md:py-4">
        {controls}
        <p aria-live="polite" className="font-display text-base leading-snug font-medium tabular-nums md:text-lg">
          {readout}
        </p>
        <Caption text={caption} />
      </div>
    </div>
  )
}

export function Caption({ text }: { text: Text }) {
  const deeper = useDeeper()
  return (
    <div className="text-base leading-relaxed">
      <p className="mb-1 text-sm font-semibold text-ink-muted">What you're seeing</p>
      <p>{text.simple}</p>
      {deeper && text.deeper && <p className="mt-2 border-l-2 border-primary/50 pl-3 text-ink-muted">{text.deeper}</p>}
    </div>
  )
}

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('flex flex-wrap items-center gap-2 md:gap-3', className)}>{children}</div>
}

export interface ActionButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  accent?: string
  /** data-sim-action value, so a test can find the button. */
  action?: string
  /**
   * Every label this button can show (Play, Stop, Again). The button takes the width of the longest, so
   * swapping the label when a run starts or ends never shifts the controls beside it.
   */
  labels?: string[]
}

export function ActionButton({ icon: Icon, label, onClick, disabled, primary, accent, action, labels }: ActionButtonProps) {
  const all = labels ? (labels.includes(label) ? labels : [...labels, label]) : [label]
  const style: CSSProperties | undefined = primary && accent ? { backgroundColor: accent, color: '#0B1020' } : undefined
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-sim-action={action}
      style={style}
      className={clsx(
        'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-[background-color,opacity,transform] duration-200 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none md:text-base',
        // Primary and plain buttons carry the same 1 px border, so swapping which one is primary keeps their size.
        'border',
        primary ? (accent ? 'border-transparent' : 'border-transparent bg-primary text-stage') : 'border-line bg-surface-2 text-ink hover:border-primary',
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="inline-grid">
        {all.map((l) => (
          <span key={l} className={clsx('[grid-area:1/1]', l !== label && 'invisible')}>
            {l}
          </span>
        ))}
      </span>
    </button>
  )
}

export function Toggle({ icon: Icon, label, checked, onChange, disabled }: { icon: LucideIcon; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      data-sim-action="toggle"
      className={clsx(
        'inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors duration-200 ease-out disabled:opacity-45 motion-reduce:transition-none md:text-base',
        checked ? 'border-primary bg-surface-2 text-ink' : 'border-line bg-surface text-ink-muted hover:border-primary',
      )}
    >
      <Icon aria-hidden className="size-4" />
      {label}
      <span aria-hidden className={clsx('relative ml-1 inline-block h-5 w-9 rounded-full transition-colors duration-200', checked ? 'bg-primary' : 'bg-line')}>
        <span className={clsx('absolute top-0.5 size-4 rounded-full bg-ink transition-[left] duration-200 ease-out motion-reduce:transition-none', checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

export interface Marker {
  value: number
  label: string
}

export interface RangeSliderProps {
  label: string
  min: number
  max: number
  value: number
  onChange: (v: number) => void
  accent: string
  unit?: string
  markers?: Marker[]
  band?: { from: number; to: number; label: string }
  /** Fills the track from the left up to the thumb in this colour (a thermometer). */
  fill?: string
  disabled?: boolean
}

const THUMB = 24 // px, matches sims.css

/** Left offset (CSS) of a value on the track, matching where the native thumb centre sits. */
function at(p: number): string {
  return `calc(${p * 100}% + ${THUMB / 2 - p * THUMB}px)`
}

export function RangeSlider({ label, min, max, value, onChange, accent, unit = '°C', markers = [], band, fill, disabled }: RangeSliderProps) {
  const id = useId()
  const frac = (v: number) => (v - min) / (max - min)
  const inRange = (v: number) => v >= min && v <= max
  const shown = markers.filter((m) => inRange(m.value))
  // Marker labels hang under the track; one that would collide with the label before it on the
  // first row drops to a second row. Widths are estimated (14 px text), positions use the real track width.
  const [trackRef, track] = useElementSize<HTMLDivElement>()
  const rows: number[] = []
  let rowEnd = -Infinity
  for (const m of shown) {
    const w = m.label.length * 8
    const f = frac(m.value)
    const left = f * (track.width - w)
    if (left < rowEnd + 8) rows.push(1)
    else {
      rows.push(0)
      rowEnd = left + w
    }
  }

  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label className="text-sm font-semibold text-ink-muted" htmlFor={id}>
          {label}
        </label>
        <span className="font-display text-lg font-semibold tabular-nums" style={{ color: accent }}>
          {Math.round(value)}
          {unit}
        </span>
      </div>
      {band && inRange(band.from) && (
        <div className="relative h-5 text-sm text-ink-muted">
          <span
            className="absolute whitespace-nowrap"
            style={{ left: at(frac((band.from + Math.min(band.to, max)) / 2)), transform: `translateX(-${frac((band.from + Math.min(band.to, max)) / 2) * 100}%)` }}
          >
            {band.label}
          </span>
        </div>
      )}
      <div className="relative">
        {/* track */}
        <div className="pointer-events-none absolute top-1/2 right-0 left-0 h-2 -translate-y-1/2 rounded-full bg-line">
          {fill && <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: at(frac(value)), background: fill }} />}
          {band && inRange(band.from) && (
            <div
              className="absolute -inset-y-1 rounded-full border-2"
              style={{ left: at(frac(band.from)), right: `calc(100% - ${at(frac(Math.min(band.to, max)))})`, borderColor: accent, background: `${accent}33` }}
            />
          )}
          {shown.map((m) => (
            <div key={m.label} className="absolute -top-2 -bottom-2 w-0.5 -translate-x-1/2 rounded bg-ink" style={{ left: at(frac(m.value)) }} />
          ))}
        </div>
        <input
          id={id}
          className="sim-range"
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ '--sim-accent': accent } as CSSProperties}
        />
      </div>
      {shown.length > 0 && (
        <div ref={trackRef} className="relative text-sm text-ink-muted" style={{ height: `${(Math.max(...rows) + 1) * 1.4}rem` }}>
          {shown.map((m, i) => (
            <span
              key={m.label}
              className="absolute whitespace-nowrap"
              style={{ left: at(frac(m.value)), top: `${rows[i] * 1.4}rem`, transform: `translateX(-${frac(m.value) * 100}%)` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function Meter({ label, value, accent, word }: { label: string; value: number; accent: string; word: string }) {
  const segments = 10
  const lit = Math.round(Math.max(0, Math.min(1, value)) * segments)
  return (
    <div className="w-full" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-valuetext={word}>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm font-semibold text-ink-muted">
        <span>{label}</span>
        <span className="font-display text-base text-ink">{word}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: segments }, (_, i) => (
          <div key={i} className="h-3 flex-1 rounded-sm" style={{ background: i < lit ? accent : '#2A3558' }} />
        ))}
      </div>
    </div>
  )
}

/** Accent dot + short name, positioned over the stage. */
export function MaterialTag({ material, style, note }: { material: Material; style?: CSSProperties; note?: string }) {
  return (
    <div className="absolute inline-flex items-center gap-2 rounded-full border border-line bg-surface/85 px-3 py-1 text-sm font-semibold" style={style}>
      <span aria-hidden className="size-2.5 rounded-full" style={{ background: material.accent }} />
      {material.short}
      {note && <span className="font-normal text-ink-muted">{note}</span>}
    </div>
  )
}

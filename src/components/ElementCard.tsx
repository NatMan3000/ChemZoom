import { X } from 'lucide-react'
import { elements } from '../content'
import type { ElementSymbol } from '../types/chem'
import { TextBlock } from './TextBlock'

/** The card for a tapped atom: what element it is, its protons, how many bonds it usually makes. */
export function ElementCard({ symbol, bondsHere, countInMolecule, onClose }: { symbol: ElementSymbol; bondsHere?: number; countInMolecule?: number; onClose?: () => void }) {
  const e = elements[symbol]
  if (!e) return null
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex items-start gap-4">
        <div
          aria-hidden
          className="grid size-16 shrink-0 place-items-center rounded-full font-display text-2xl font-bold text-stage shadow-[inset_-6px_-8px_14px_rgba(0,0,0,0.35),inset_4px_4px_10px_rgba(255,255,255,0.35)]"
          style={{ backgroundColor: e.colour }}
        >
          {e.symbol}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-2xl font-semibold text-ink">{e.name}</h4>
          <p className="text-sm text-ink-muted">Element number {e.number}</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close element card" className="rounded-full p-2 text-ink-muted transition-colors hover:bg-surface hover:text-ink">
            <X aria-hidden className="size-5" />
          </button>
        )}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Protons" value={e.number} />
        <Stat label="Usually bonds" value={e.bondsUsually} />
        {bondsHere !== undefined ? <Stat label="Bonds here" value={bondsHere} /> : <Stat label="In this piece" value={countInMolecule ?? 0} />}
      </dl>
      <TextBlock text={e.blurb} className="mt-4" />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface px-2 py-2">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="font-display text-2xl font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  )
}

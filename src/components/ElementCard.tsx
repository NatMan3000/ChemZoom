import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { elements } from '../content'
import type { ElementSymbol } from '../types/chem'
import { TextBlock } from './TextBlock'

/**
 * The card for one atom: what element it is and what the atom scene draws (protons and neutrons in the
 * nucleus, electrons in shells). `children` sits under the numbers (the atom step's "how it joins in").
 */
export function ElementCard({ symbol, onClose, children, showBlurb = true }: { symbol: ElementSymbol; onClose?: () => void; children?: ReactNode; showBlurb?: boolean }) {
  const e = elements[symbol]
  if (!e) return null
  const shells = e.shells.join(' + ')
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 grow basis-52 items-center gap-3">
          <div
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-full font-display text-xl font-bold text-stage shadow-[inset_-6px_-8px_14px_rgba(0,0,0,0.35),inset_4px_4px_10px_rgba(255,255,255,0.35)]"
            style={{ backgroundColor: e.colour }}
          >
            {e.symbol}
          </div>
          <div className="min-w-0">
            <h4 className="font-display text-2xl leading-tight font-semibold text-ink">{e.name}</h4>
            <p className="text-sm text-ink-muted">Element number {e.number}</p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Protons" value={String(e.number)} />
          <Stat label="Neutrons" value={String(e.neutrons)} />
          <Stat label="Electrons" value={shells} hint={e.shells.length > 1 ? 'Inner shell + outer shell' : undefined} />
        </dl>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close element card" className="rounded-full p-2 text-ink-muted transition-colors hover:bg-surface hover:text-ink">
            <X aria-hidden className="size-5" />
          </button>
        )}
      </div>
      {children}
      {showBlurb && <TextBlock text={e.blurb} className="mt-3" />}
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-[5.5rem] rounded-lg bg-surface px-2 py-1" title={hint}>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="font-display text-lg leading-snug font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  )
}

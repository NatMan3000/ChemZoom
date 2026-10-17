import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { TRAIT_LABELS } from '../lib/text'
import type { Material, TraitId } from '../types/chem'

/** Five-segment bars in the material's accent. Tap a row for why. */
export function TraitBars({ material, compact }: { material: Material; compact?: boolean }) {
  const [open, setOpen] = useState<TraitId | null>(null)
  return (
    <ul className="flex flex-col gap-1">
      {material.traits.map((t) => {
        const isOpen = open === t.id
        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : t.id)}
              aria-expanded={isOpen}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-200 hover:bg-surface-2"
            >
              <span className={clsx('truncate text-ink', compact ? 'text-sm' : 'text-[15px]')}>{TRAIT_LABELS[t.id]}</span>
              <span className="flex gap-1" aria-label={`${t.score} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={clsx('h-2.5 rounded-full', compact ? 'w-4' : 'w-5 sm:w-6')}
                    style={{ backgroundColor: n <= t.score ? material.accent : 'var(--color-surface-2)' }}
                  />
                ))}
              </span>
              <span className="flex items-center gap-1 text-sm text-ink-muted tabular-nums">
                {t.score}
                <ChevronDown aria-hidden className={clsx('size-4 transition-transform duration-200', isOpen && 'rotate-180')} />
              </span>
            </button>
            {isOpen && (
              <div className="px-2 pt-1 pb-2">
                <p className="text-sm leading-relaxed text-ink">{t.why.simple}</p>
                {t.why.deeper && <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t.why.deeper}</p>}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

import clsx from 'clsx'
import { elements } from '../content'
import { elementsIn } from '../lib/molecules'
import type { Molecule } from '../types/chem'

/** Which colour is which atom. Always on screen whenever atoms are. */
export function AtomLegend({ molecule, className, showCounts }: { molecule: Molecule; className?: string; showCounts?: boolean }) {
  return (
    <ul aria-label="Atom colours" className={clsx('flex flex-wrap gap-x-3 gap-y-1.5', className)}>
      {elementsIn(molecule).map(({ el, count }) => {
        const e = elements[el]
        return (
          <li key={el} className="flex items-center gap-1.5 text-sm text-ink">
            <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: e?.colour }} />
            <span>{e?.name ?? el}</span>
            {showCounts && <span className="text-ink-muted tabular-nums">{count}</span>}
          </li>
        )
      })}
    </ul>
  )
}

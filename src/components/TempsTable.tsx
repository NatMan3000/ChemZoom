import clsx from 'clsx'
import { tempRows } from '../lib/temps'
import type { Material } from '../types/chem'

/** The printing numbers as label / value rows. `compact`: one column of tight rows, for the at-a-glance block. */
export function TempsTable({ material, compact }: { material: Material; compact?: boolean }) {
  return (
    <dl className={clsx('grid grid-cols-1', !compact && 'gap-x-6 sm:grid-cols-2')}>
      {tempRows(material).map((r) => (
        <div key={r.label} className={clsx('flex items-baseline justify-between gap-3 border-b border-line/70 last:border-b-0', compact ? 'py-[3px]' : 'py-2')} title={r.hint}>
          <dt className="text-sm text-ink-muted">{r.label}</dt>
          <dd className={clsx('text-right font-display font-semibold text-ink tabular-nums', compact ? 'text-sm' : 'text-base')}>{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

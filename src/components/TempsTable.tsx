import { tempRows } from '../lib/temps'
import type { Material } from '../types/chem'

export function TempsTable({ material }: { material: Material }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
      {tempRows(material).map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-3 border-b border-line/70 py-2" title={r.hint}>
          <dt className="text-sm text-ink-muted">{r.label}</dt>
          <dd className="text-right font-display text-base font-semibold text-ink tabular-nums">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

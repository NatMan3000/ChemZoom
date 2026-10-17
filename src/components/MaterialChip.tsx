import { Link } from 'react-router-dom'
import clsx from 'clsx'
import type { Material } from '../types/chem'

const base =
  'inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border px-2 text-sm sm:gap-2 sm:px-3.5 font-semibold transition-colors duration-200 ease-out focus-visible:outline-2'

/** Accent dot + short name. A link when `to` is set, otherwise a button. */
export function MaterialChip({ material, active, to, onClick, replace }: { material: Material; active?: boolean; to?: string; onClick?: () => void; replace?: boolean }) {
  const cls = clsx(base, active ? 'border-transparent text-stage' : 'border-line bg-surface text-ink hover:border-ink-muted hover:bg-surface-2')
  const style = active ? { backgroundColor: material.accent } : undefined
  const dot = <span aria-hidden className={clsx('size-2.5 shrink-0 rounded-full', active && 'ring-2 ring-stage/40')} style={{ backgroundColor: active ? '#0b1020' : material.accent }} />
  if (to)
    return (
      <Link to={to} replace={replace} className={cls} style={style} aria-current={active ? 'page' : undefined}>
        {dot}
        {material.short}
      </Link>
    )
  return (
    <button type="button" onClick={onClick} className={cls} style={style} aria-pressed={active}>
      {dot}
      {material.short}
    </button>
  )
}

import clsx from 'clsx'
import { ZOOM_STEPS } from '../lib/zoom'
import type { ZoomLevel } from '../types/chem'

/**
 * The six zoom steps. Vertical down the stage's left edge on desktop; a horizontal step bar
 * under the stage on a phone. The current step is in primary.
 */
export function ZoomRail({ level, onChange, orientation }: { level: ZoomLevel; onChange: (l: ZoomLevel) => void; orientation: 'vertical' | 'horizontal' }) {
  const current = ZOOM_STEPS.findIndex((s) => s.level === level)
  const vertical = orientation === 'vertical'
  return (
    <nav aria-label="Zoom level" className={clsx(vertical ? 'flex flex-col gap-1' : 'grid grid-cols-6 gap-1')}>
      {ZOOM_STEPS.map((s, i) => {
        const active = i === current
        const passed = i < current
        const Icon = s.icon
        return (
          <button
            key={s.level}
            type="button"
            onClick={() => onChange(s.level)}
            aria-current={active ? 'step' : undefined}
            className={clsx(
              'group relative flex items-center rounded-xl transition-colors duration-200 ease-out',
              vertical ? 'gap-3 py-2 pr-4 pl-2 text-left' : 'min-h-14 flex-col justify-center gap-1 px-1 py-1.5',
              active ? 'bg-primary/15 text-primary' : passed ? 'text-ink hover:bg-surface-2/80' : 'text-ink-muted hover:bg-surface-2/80 hover:text-ink',
            )}
          >
            <span
              className={clsx(
                'grid shrink-0 place-items-center rounded-full border transition-colors duration-200',
                vertical ? 'size-9' : 'size-8',
                active ? 'border-primary bg-primary text-stage' : 'border-line bg-surface/90',
              )}
            >
              <Icon aria-hidden className={vertical ? 'size-[18px]' : 'size-4'} />
            </span>
            <span className={clsx('font-semibold', vertical ? 'text-sm' : 'text-[11px] leading-none tracking-tight')}>{s.label}</span>
            {vertical && <span className="ml-auto pl-2 text-xs text-ink-muted tabular-nums">{i + 1}</span>}
          </button>
        )
      })}
    </nav>
  )
}

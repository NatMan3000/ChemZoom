import clsx from 'clsx'
import { setDepth, useDepth, type Depth } from '../lib/depth'

const OPTIONS: { value: Depth; label: string; hint: string }[] = [
  { value: 'simple', label: 'Simple', hint: 'Short and plain' },
  { value: 'deeper', label: 'Deeper', hint: 'Add the real chemistry to every card' },
]

/** The app's one simple/deeper switch (spec/design-intent.md P10). Lives in the top bar, remembered per device. */
export function DepthSwitch() {
  const depth = useDepth()
  return (
    <div role="radiogroup" aria-label="How much detail" className="flex shrink-0 items-center rounded-full border border-line bg-surface p-0.5">
      {OPTIONS.map((o) => {
        const on = depth === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.hint}
            onClick={() => setDepth(o.value)}
            className={clsx(
              'min-h-9 rounded-full px-2.5 text-sm font-semibold transition-colors duration-200 ease-out sm:px-3.5',
              on ? 'bg-primary text-stage' : 'text-ink-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

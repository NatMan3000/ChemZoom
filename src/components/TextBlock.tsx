import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import type { Text } from '../types/chem'

/** A `Text` at its simple depth, with a "Go deeper" disclosure when there is a deeper layer. */
export function TextBlock({ text, className, size = 'base' }: { text: Text | undefined; className?: string; size?: 'sm' | 'base' | 'lg' }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  if (!text) return null
  return (
    <div className={className}>
      <p className={clsx('text-ink', size === 'lg' ? 'text-lg leading-relaxed' : size === 'sm' ? 'text-sm leading-relaxed' : 'text-base leading-relaxed')}>{text.simple}</p>
      {text.deeper && (
        <>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((o) => !o)}
            className="mt-2 inline-flex items-center gap-1 rounded-full py-1 pr-2 text-sm font-medium text-primary transition-colors duration-200 ease-out hover:text-ink"
          >
            <ChevronDown aria-hidden className={clsx('size-4 transition-transform duration-200 ease-out', open && 'rotate-180')} />
            {open ? 'Less' : 'Go deeper'}
          </button>
          <div id={id} hidden={!open} className="mt-1 border-l-2 border-primary/50 pl-3">
            <p className="text-sm leading-relaxed text-ink-muted">{text.deeper}</p>
          </div>
        </>
      )}
    </div>
  )
}

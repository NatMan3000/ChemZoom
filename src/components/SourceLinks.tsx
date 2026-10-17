import { ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { hostOf } from '../lib/sources'
import type { SourceRef } from '../types/chem'

/** Small source links at the foot of a card. */
export function SourceLinks({ sources, className, label = 'Sources' }: { sources: SourceRef[]; className?: string; label?: string }) {
  if (!sources.length) return null
  return (
    <div className={clsx('flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted', className)}>
      <span className="font-medium">{label}:</span>
      {sources.map((s) => (
        <a
          key={s.url}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          title={s.url}
          className="inline-flex items-center gap-1 underline decoration-line underline-offset-2 transition-colors duration-200 hover:text-ink hover:decoration-primary"
        >
          {s.label || hostOf(s.url)}
          <ExternalLink aria-hidden className="size-3" />
        </a>
      ))}
    </div>
  )
}

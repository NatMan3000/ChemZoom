import type { ReactNode } from 'react'
import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

/** A calm panel card with an optional icon + heading. */
export function Card({ title, icon: Icon, children, className, accent }: { title?: ReactNode; icon?: LucideIcon; children: ReactNode; className?: string; accent?: string }) {
  return (
    <section className={clsx('rounded-xl border border-line bg-surface p-4 sm:p-5', className)}>
      {title && (
        <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink">
          {Icon && <Icon aria-hidden className="size-5 shrink-0" style={{ color: accent ?? 'var(--color-primary)' }} />}
          {title}
        </h3>
      )}
      {children}
    </section>
  )
}

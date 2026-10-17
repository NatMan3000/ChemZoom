import type { ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Atom, GitCompareArrows, Library, Spool } from 'lucide-react'
import clsx from 'clsx'
import { DepthSwitch } from '../components/DepthSwitch'
import { Logo } from '../components/Logo'

const NAV = [
  { to: '/', label: 'Filaments', icon: Spool, end: true },
  { to: '/basics', label: 'Basics', icon: Atom },
  { to: '/compare', label: 'Compare', icon: GitCompareArrows },
  { to: '/sources', label: 'Sources', icon: Library },
]

/**
 * App shell: locked to the viewport (h-dvh), safe-area padded, never scrolls itself.
 * Each page owns exactly one scroll container inside `main`.
 */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-stage pt-[max(0px,calc(env(safe-area-inset-top)-0.5rem))] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line/70 px-3 sm:gap-4 sm:px-5">
        <Link to="/" className="flex items-center gap-2 rounded-lg pr-2 font-display text-lg font-bold tracking-tight text-ink">
          <Logo className="size-8" />
          <span className="hidden min-[440px]:inline">ChemZoom</span>
        </Link>
        <nav aria-label="Main" className="ml-auto flex items-center gap-0.5 sm:gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-full px-2.5 text-sm font-semibold transition-colors duration-200 ease-out sm:px-3.5',
                  isActive ? 'bg-surface-2 text-ink' : 'text-ink-muted hover:bg-surface hover:text-ink',
                )
              }
            >
              <Icon aria-hidden className="size-[18px]" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
        <DepthSwitch />
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  )
}

/** A page whose whole body scrolls: the one scroll container for that page. */
export function ScrollPage({ children, className, innerRef }: { children: ReactNode; className?: string; innerRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={innerRef} className={clsx('min-h-0 flex-1 overflow-y-auto overscroll-contain', className)}>
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pt-10">{children}</div>
    </div>
  )
}

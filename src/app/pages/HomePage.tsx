import { Link } from 'react-router-dom'
import { ArrowRight, Atom, GitCompareArrows } from 'lucide-react'
import { collections, materials } from '../../content'
import { SpoolBadge } from '../../components/SpoolBadge'
import { ScrollPage } from '../Shell'

export function HomePage() {
  return (
    <ScrollPage className="bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(139,156,255,0.16),transparent_70%)]">
      <section className="pt-2 pb-8 lg:pt-6 lg:pb-12">
        <p className="font-display text-sm font-semibold tracking-[0.2em] text-primary uppercase">ChemZoom</p>
        <h1 className="mt-3 font-display text-4xl leading-tight font-bold tracking-tight text-ink sm:text-5xl">What&rsquo;s actually inside your filament?</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          Pick a plastic and zoom in: from the spool, into the strand, through the tangle of chains, down to the atoms. Then see why each one prints and behaves the way it does.
        </p>
      </section>

      {collections.map((c) => (
        <section key={c.id} aria-labelledby={`c-${c.id}`} className="mb-10">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={`c-${c.id}`} className="font-display text-2xl font-semibold text-ink">
              {c.title}
            </h2>
            <p className="text-sm text-ink-muted">{c.blurb.simple}</p>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {c.materials.map((id) => {
              const m = materials[id]
              if (!m) return null
              return (
                <li key={id}>
                  <Link
                    to={`/m/${id}`}
                    className="group flex h-full gap-4 rounded-xl border border-line bg-surface p-4 transition-colors duration-200 ease-out hover:bg-surface-2 xl:flex-col"
                    style={{ ['--accent' as string]: m.accent }}
                  >
                    <SpoolBadge accent={m.accent} size={64} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <h3 className="font-display text-2xl font-bold" style={{ color: m.accent }}>
                          {m.short}
                        </h3>
                        <ArrowRight aria-hidden className="ml-auto size-5 text-ink-muted transition-colors duration-200 group-hover:text-[var(--accent)]" />
                      </div>
                      <p className="text-sm font-semibold text-ink">{m.nickname}</p>
                      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{m.keyIdea.simple}</p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <section aria-label="More to explore" className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <EntryCard
          to="/basics"
          icon={<Atom aria-hidden className="size-7" />}
          title="The basics: atoms and bonds"
          text="What an atom is, how atoms hold hands, and why carbon can build chains thousands of atoms long."
        />
        <EntryCard
          to="/compare?a=pla&b=abs"
          icon={<GitCompareArrows aria-hidden className="size-7" />}
          title="Compare two filaments"
          text="Put any two side by side: strength, heat, sunlight, printing temperatures and their molecules."
        />
      </section>
    </ScrollPage>
  )
}

function EntryCard({ to, icon, title, text }: { to: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link to={to} className="group flex items-start gap-4 rounded-xl border border-line bg-surface p-5 transition-colors duration-200 ease-out hover:bg-surface-2">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
          {title}
          <ArrowRight aria-hidden className="ml-auto size-5 text-ink-muted transition-colors duration-200 group-hover:text-primary" />
        </span>
        <span className="mt-1 block text-[15px] leading-relaxed text-ink-muted">{text}</span>
      </span>
    </Link>
  )
}

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { SpoolBadge } from '../../components/SpoolBadge'
import { molecules } from '../../content'
import { allMaterialSources, hostOf, uniqueSources } from '../../lib/sources'
import type { SourceRef } from '../../types/chem'
import { BASICS } from '../basics'
import { ScrollPage } from '../Shell'

export function SourcesPage() {
  useEffect(() => {
    document.title = 'Sources | ChemZoom'
    return () => void (document.title = 'ChemZoom')
  }, [])
  const groups = allMaterialSources()
  const basics = uniqueSources([
    ...BASICS.flatMap((s) => s.sources),
    ...BASICS.flatMap((s) => (s.molecules ?? []).flatMap((m) => molecules[m.id]?.sources ?? [])),
  ])
  return (
    <ScrollPage>
      <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Where the facts come from</h1>
      <p className="mt-3 text-lg leading-relaxed text-ink-muted">
        Every number and claim in ChemZoom has a source: makers&rsquo; data sheets for the printing numbers, PubChem for the molecules, and encyclopedias for the chemistry.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {groups.map(({ material: m, sources }) => (
          <section key={m.id} aria-labelledby={`src-${m.id}`} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
            <h2 id={`src-${m.id}`} className="flex items-center gap-3 font-display text-xl font-semibold">
              <SpoolBadge accent={m.accent} size={32} />
              <Link to={`/m/${m.id}`} className="hover:underline" style={{ color: m.accent }}>
                {m.short}
              </Link>
              <span className="text-base font-normal text-ink-muted">{m.fullName}</span>
            </h2>
            <SourceList sources={sources} empty={`Sources for ${m.short} are being checked.`} />
          </section>
        ))}
        <section aria-labelledby="src-basics" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
          <h2 id="src-basics" className="font-display text-xl font-semibold">
            <Link to="/basics" className="text-primary hover:underline">
              The basics
            </Link>
          </h2>
          <SourceList sources={basics} empty="No sources yet." />
        </section>
      </div>
    </ScrollPage>
  )
}

function SourceList({ sources, empty }: { sources: SourceRef[]; empty: string }) {
  if (!sources.length) return <p className="mt-3 text-sm text-ink-muted">{empty}</p>
  return (
    <ul className="mt-3 flex flex-col">
      {sources.map((s) => (
        <li key={s.url} className="border-b border-line/60 last:border-b-0">
          <a href={s.url} target="_blank" rel="noreferrer" className="group flex items-start gap-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] text-ink group-hover:underline">{s.label}</span>
              <span className="block truncate text-xs text-ink-muted">{hostOf(s.url)}</span>
            </span>
            <ExternalLink aria-hidden className="mt-1 size-4 shrink-0 text-ink-muted group-hover:text-ink" />
          </a>
        </li>
      ))}
    </ul>
  )
}

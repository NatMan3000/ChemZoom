import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, ChevronDown, GitCompareArrows, Library, Lightbulb, ListChecks, Printer, Sprout } from 'lucide-react'
import clsx from 'clsx'
import { Formula } from '../../components/Formula'
import { SourceLinks } from '../../components/SourceLinks'
import { TempsTable } from '../../components/TempsTable'
import { TextBlock } from '../../components/TextBlock'
import { TraitBars } from '../../components/TraitBars'
import { useDeeper } from '../../lib/depth'
import { useReducedMotion } from '../../lib/motion'
import { moleculesFor, sourcesFor } from '../../lib/sources'
import type { Material } from '../../types/chem'

/** The printing numbers and the trait bars, side by side when the panel is wide enough. */
export function AtAGlance({ material }: { material: Material }) {
  const other = material.id === 'pla' ? 'petg' : 'pla'
  return (
    <section aria-label={`${material.short} at a glance`} className="@container rounded-xl border border-line bg-surface p-4">
      <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @lg:gap-6">
        <div className="min-w-0">
          <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-ink">
            <Printer aria-hidden className="size-4" style={{ color: material.accent }} />
            Printing it
          </h2>
          <TempsTable material={material} compact />
        </div>
        <div className="min-w-0">
          <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-ink">
            <ListChecks aria-hidden className="size-4" style={{ color: material.accent }} />
            How it stacks up
            <span className="ml-auto text-sm font-normal text-ink-muted">tap a row for why</span>
          </h2>
          <TraitBars material={material} compact />
          <Link to={`/compare?a=${material.id}&b=${other}`} className="mt-1 inline-flex items-center gap-1.5 px-2 text-sm font-semibold text-primary transition-colors hover:text-ink">
            <GitCompareArrows aria-hidden className="size-4" />
            Compare with another filament
          </Link>
        </div>
      </div>
    </section>
  )
}

/**
 * Everything material-wide that is not needed at every step sits behind one control that opens in place
 * (spec/design-intent.md P5): where it comes from, printing tips, facts, and sources.
 */
export function MaterialMore({ material }: { material: Material }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const deeper = useDeeper()
  const sources = sourcesFor(material)
  const toggle = () => {
    const opening = !open
    setOpen(opening)
    // Bring what just opened into view; the panel is the page's one scroll container.
    if (opening) requestAnimationFrame(() => ref.current?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }))
  }
  return (
    <section ref={ref} className="scroll-mt-3 rounded-xl border border-line bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="material-more"
        onClick={toggle}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors duration-200 hover:bg-surface-2"
      >
        <BookOpen aria-hidden className="size-5 shrink-0" style={{ color: material.accent }} />
        <span className="font-display text-lg font-semibold text-ink">More about {material.short}</span>
        <span className="hidden min-w-0 truncate text-sm text-ink-muted sm:inline">Made from, printing tips, facts and sources</span>
        <ChevronDown aria-hidden className={clsx('ml-auto size-5 shrink-0 text-ink-muted transition-transform duration-200 ease-out', open && 'rotate-180')} />
      </button>
      <div id="material-more" hidden={!open} className="flex flex-col gap-5 border-t border-line/70 px-4 pt-4 pb-5">
        {deeper && material.keyIdea.deeper && (
          <MoreSection icon={Lightbulb} title="The big idea, deeper" accent={material.accent}>
            <p className="text-base leading-relaxed text-ink-muted">{material.keyIdea.deeper}</p>
          </MoreSection>
        )}
        <MoreSection icon={Sprout} title="What it is made from" accent={material.accent}>
          <TextBlock text={material.madeFrom} />
          <BuildingBlocks material={material} />
        </MoreSection>

        {material.print.tips.length > 0 && (
          <MoreSection icon={Printer} title="Printing tips" accent={material.accent}>
            <ul className="flex flex-col gap-3">
              {material.print.tips.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: material.accent }} />
                  <TextBlock text={t} className="min-w-0 flex-1" />
                </li>
              ))}
            </ul>
          </MoreSection>
        )}

        {material.facts.length > 0 && (
          <MoreSection icon={Lightbulb} title="Did you know?" accent={material.accent}>
            <ul className="flex flex-col gap-4">
              {material.facts.map((f, i) => (
                <li key={i} className="border-b border-line/60 pb-4 last:border-b-0 last:pb-0">
                  <TextBlock text={f.text} />
                  <SourceLinks sources={f.sources} className="mt-2" />
                </li>
              ))}
            </ul>
          </MoreSection>
        )}

        <MoreSection icon={Library} title="Where this comes from" accent={material.accent}>
          {sources.length ? <SourceLinks sources={sources} label="Sources" /> : <p className="text-sm text-ink-muted">Sources for {material.short} are being checked.</p>}
          <Link to="/sources" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-ink">
            Every source in ChemZoom <ArrowRight aria-hidden className="size-4" />
          </Link>
        </MoreSection>
      </div>
    </section>
  )
}

function MoreSection({ icon: Icon, title, accent, children }: { icon: typeof Sprout; title: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 font-display text-base font-semibold text-ink">
        <Icon aria-hidden className="size-4" style={{ color: accent }} />
        {title}
      </h3>
      {children}
    </div>
  )
}

function BuildingBlocks({ material }: { material: Material }) {
  const blocks = moleculesFor(material).filter((m) => material.monomers.includes(m.id))
  if (!blocks.length) return null
  return (
    <div className="mt-3">
      <p className="mb-2 text-sm font-semibold text-ink">Building blocks</p>
      <ul className="flex flex-wrap gap-2">
        {blocks.map((b) => (
          <li key={b.id} className="rounded-lg border border-line/70 bg-surface-2/60 px-3 py-2">
            <span className="block text-sm font-semibold text-ink">{b.name}</span>
            <span className="block text-sm text-ink-muted tabular-nums">
              <Formula formula={b.formula} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

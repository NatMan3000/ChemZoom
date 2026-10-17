import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { elements } from '../../content'
import { AtomLegend } from '../../components/AtomLegend'
import { Formula } from '../../components/Formula'
import { MoleculeTile } from '../../components/MoleculeTile'
import { SourceLinks } from '../../components/SourceLinks'
import { TextBlock } from '../../components/TextBlock'
import { getMoleculeSafe } from '../../lib/molecules'
import { uniqueSources } from '../../lib/sources'
import { ViewCanvas } from '../../three/ViewCanvas'
import type { ElementSymbol, Molecule } from '../../types/chem'
import { BASICS } from '../basics'
import { ScrollPage } from '../Shell'

export default function BasicsPage() {
  const wrap = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    document.title = 'The basics | ChemZoom'
    return () => void (document.title = 'ChemZoom')
  }, [])

  return (
    <div ref={wrap} className="relative flex min-h-0 flex-1 flex-col">
      <ScrollPage innerRef={scroller}>
        <p className="font-display text-sm font-semibold tracking-[0.2em] text-primary uppercase">The basics</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">Atoms, bonds and chains</h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-muted">Four ideas, and you can read every molecule in ChemZoom. Drag any model sideways to turn it.</p>

        <ol className="mt-8 flex flex-col gap-6">
          {BASICS.map((s, i) => {
            const mols = (s.molecules ?? []).map((m) => ({ ...m, mol: getMoleculeSafe(m.id) })).filter((m): m is typeof m & { mol: Molecule } => !!m.mol)
            return (
              <li key={s.id} id={s.id} className="rounded-xl border border-line bg-surface p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                  <div className="min-w-0">
                    <h2 className="flex items-baseline gap-3 font-display text-2xl font-semibold text-ink">
                      <span className="font-display text-lg text-primary tabular-nums">{i + 1}</span>
                      {s.title}
                    </h2>
                    <TextBlock text={s.body} size="lg" className="mt-3" />
                    {s.points && (
                      <ul className="mt-4 flex flex-col gap-2">
                        {s.points.map((p) => (
                          <li key={p} className="flex gap-3 text-[15px] text-ink">
                            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    )}
                    <SourceLinks sources={uniqueSources([...s.sources, ...mols.flatMap((m) => m.mol.sources)])} className="mt-4" />
                  </div>
                  <div className="min-w-0">
                    {s.elements && <ElementGrid symbols={s.elements} />}
                    {mols.length > 0 && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {mols.map((m) => (
                          <figure key={m.id} className={mols.length === 3 ? 'sm:last:col-span-2' : mols.length === 1 ? 'sm:col-span-2' : undefined}>
                            <div className="h-56 overflow-hidden rounded-lg border border-line/60 bg-stage sm:h-60">
                              <MoleculeTile molecule={m.mol} className="size-full" label={`3D model of ${m.mol.name}`} />
                            </div>
                            <figcaption className="mt-2">
                              <span className="block text-sm font-semibold text-ink">{m.caption}</span>
                              <span className="block text-xs text-ink-muted tabular-nums"><Formula formula={m.mol.formula} /></span>
                              <AtomLegend molecule={m.mol} className="mt-1.5" />
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                    {!s.elements && !mols.length && <p className="text-sm text-ink-muted">3D models for this part are on their way.</p>}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-stage transition-colors duration-200 hover:bg-ink">
          Now zoom into a filament <ArrowRight aria-hidden className="size-4" />
        </Link>
      </ScrollPage>
      <ViewCanvas eventSource={wrap} scroller={scroller} />
    </div>
  )
}

function ElementGrid({ symbols }: { symbols: ElementSymbol[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {symbols.map((sym) => {
        const e = elements[sym]
        if (!e) return null
        return (
          <li key={sym} className="flex flex-col gap-3 rounded-lg border border-line/60 bg-surface-2/60 p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="grid size-12 shrink-0 place-items-center rounded-full font-display text-xl font-bold text-stage shadow-[inset_-5px_-6px_12px_rgba(0,0,0,0.35),inset_3px_3px_8px_rgba(255,255,255,0.35)]"
                style={{ backgroundColor: e.colour }}
              >
                {e.symbol}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-lg font-semibold text-ink">{e.name}</span>
                <span className="block text-xs text-ink-muted">
                  <span className="tabular-nums">{e.number}</span> protons, usually <span className="tabular-nums">{e.bondsUsually}</span> {e.bondsUsually === 1 ? 'bond' : 'bonds'}
                </span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">{e.blurb.simple}</p>
          </li>
        )
      })}
    </ul>
  )
}

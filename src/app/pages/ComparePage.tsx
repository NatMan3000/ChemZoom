import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, ChevronDown, Hexagon, ListChecks, Thermometer } from 'lucide-react'
import clsx from 'clsx'
import { materialList, materials } from '../../content'
import { MaterialChip } from '../../components/MaterialChip'
import { Formula } from '../../components/Formula'
import { MoleculeTile } from '../../components/MoleculeTile'
import { SourceLinks } from '../../components/SourceLinks'
import { SpoolBadge } from '../../components/SpoolBadge'
import { TextBlock } from '../../components/TextBlock'
import { getMoleculeSafe } from '../../lib/molecules'
import { sourcesFor } from '../../lib/sources'
import { tempRows } from '../../lib/temps'
import { TRAIT_LABELS } from '../../lib/text'
import { ViewCanvas } from '../../three/ViewCanvas'
import type { Material, MaterialId, TraitId } from '../../types/chem'
import { ScrollPage } from '../Shell'

const isId = (s: string | null): s is MaterialId => !!s && s in materials

export default function ComparePage() {
  const [params] = useSearchParams()
  const a = materials[isId(params.get('a')) ? (params.get('a') as MaterialId) : 'pla']
  const b = materials[isId(params.get('b')) ? (params.get('b') as MaterialId) : 'abs']
  const wrap = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = `${a.short} vs ${b.short} | ChemZoom`
    return () => void (document.title = 'ChemZoom')
  }, [a.short, b.short])

  return (
    <div ref={wrap} className="relative flex min-h-0 flex-1 flex-col">
      <ScrollPage innerRef={scroller}>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Compare two filaments</h1>
        <p className="mt-2 text-base text-ink-muted">Pick one for each side. Tap a row to see why.</p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Picker side="Left" value={a.id} other={b.id} param="a" />
          <Picker side="Right" value={b.id} other={a.id} param="b" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
          <Hero m={a} />
          <Hero m={b} />
        </div>

        <section aria-labelledby="cmp-traits" className="mt-6 rounded-xl border border-line bg-surface p-3 sm:p-5">
          <h2 id="cmp-traits" className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <ListChecks aria-hidden className="size-5 text-primary" /> How they stack up
          </h2>
          <TraitCompare a={a} b={b} />
        </section>

        <section aria-labelledby="cmp-temps" className="mt-4 rounded-xl border border-line bg-surface p-3 sm:p-5">
          <h2 id="cmp-temps" className="mb-2 flex items-center gap-2 font-display text-lg font-semibold">
            <Thermometer aria-hidden className="size-5 text-primary" /> Printing numbers
          </h2>
          <TempsCompare a={a} b={b} />
        </section>

        <section aria-labelledby="cmp-mol" className="mt-4 rounded-xl border border-line bg-surface p-3 sm:p-5">
          <h2 id="cmp-mol" className="mb-1 flex items-center gap-2 font-display text-lg font-semibold">
            <Hexagon aria-hidden className="size-5 text-primary" /> Their molecules
          </h2>
          <p className="mb-3 text-sm text-ink-muted">A short piece of each chain. The lit part is one repeat unit. Drag sideways to turn them.</p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <MoleculeSide m={a} />
            <MoleculeSide m={b} />
          </div>
        </section>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[a, b].map((m) => (
            <div key={m.id} className="rounded-xl border border-line bg-surface p-4">
              <SourceLinks sources={sourcesFor(m)} label={`${m.short} sources`} />
              {!sourcesFor(m).length && <p className="text-sm text-ink-muted">Sources for {m.short} are being checked.</p>}
            </div>
          ))}
        </div>
      </ScrollPage>
      <ViewCanvas eventSource={wrap} scroller={scroller} />
    </div>
  )
}

function Picker({ side, value, other, param }: { side: string; value: MaterialId; other: MaterialId; param: 'a' | 'b' }) {
  const href = (id: MaterialId) => (param === 'a' ? `/compare?a=${id}&b=${other}` : `/compare?a=${other}&b=${id}`)
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="mb-2 text-sm font-semibold text-ink-muted">{side}</p>
      <div className="grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
        {materialList.map((m) => (
          <MaterialChip key={m.id} material={m} active={m.id === value} to={href(m.id)} replace />
        ))}
      </div>
    </div>
  )
}

function Hero({ m }: { m: Material }) {
  return (
    <div className="flex flex-col rounded-xl border border-line bg-surface p-3 sm:p-5" style={{ borderTopColor: m.accent, borderTopWidth: 3 }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SpoolBadge accent={m.accent} size={56} className="shrink-0" />
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold sm:text-3xl" style={{ color: m.accent }}>
            {m.short}
          </p>
          <p className="text-sm font-semibold text-ink">{m.nickname}</p>
        </div>
      </div>
      <TextBlock text={m.keyIdea} className="mt-3" size="sm" />
      <Link to={`/m/${m.id}`} className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-primary hover:text-ink">
        Zoom into {m.short} <ArrowRight aria-hidden className="size-4" />
      </Link>
    </div>
  )
}

function Bar({ score, accent, mirror }: { score: number; accent: string; mirror?: boolean }) {
  return (
    <span className={clsx('flex gap-1', mirror && 'flex-row-reverse')} aria-label={`${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="h-2.5 min-w-0 flex-1 rounded-full" style={{ backgroundColor: n <= score ? accent : 'var(--color-surface-2)' }} />
      ))}
    </span>
  )
}

function TraitCompare({ a, b }: { a: Material; b: Material }) {
  const [open, setOpen] = useState<TraitId | null>(null)
  const ids = a.traits.map((t) => t.id)
  return (
    <ul className="flex flex-col">
      {ids.map((id) => {
        const ta = a.traits.find((t) => t.id === id)
        const tb = b.traits.find((t) => t.id === id)
        if (!ta || !tb) return null
        const isOpen = open === id
        return (
          <li key={id} className="border-b border-line/60 last:border-b-0">
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : id)} className="w-full rounded-lg px-1 py-2.5 text-left transition-colors duration-200 hover:bg-surface-2 sm:px-2">
              <span className="mb-2 flex items-center justify-center gap-1 text-center text-sm font-semibold text-ink">
                {TRAIT_LABELS[id]}
                <ChevronDown aria-hidden className={clsx('size-4 text-ink-muted transition-transform duration-200', isOpen && 'rotate-180')} />
              </span>
              <span className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_1.5rem] items-center gap-2 sm:gap-3">
                <span className="text-right text-sm text-ink-muted tabular-nums">{ta.score}</span>
                <Bar score={ta.score} accent={a.accent} mirror />
                <Bar score={tb.score} accent={b.accent} />
                <span className="text-sm text-ink-muted tabular-nums">{tb.score}</span>
              </span>
            </button>
            {isOpen && (
              <div className="grid grid-cols-2 gap-3 px-1 pb-3 sm:px-2">
                <TextBlock text={ta.why} size="sm" />
                <TextBlock text={tb.why} size="sm" />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function TempsCompare({ a, b }: { a: Material; b: Material }) {
  const ra = tempRows(a)
  const rb = tempRows(b)
  const labels = [...new Set([...ra, ...rb].map((r) => r.label))]
  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="border-b border-line">
          <th className="w-[34%] py-2 text-left font-medium text-ink-muted" scope="col">
            <span className="sr-only">Measure</span>
          </th>
          <th className="py-2 text-left font-display text-base font-semibold" style={{ color: a.accent }} scope="col">
            {a.short}
          </th>
          <th className="py-2 text-left font-display text-base font-semibold" style={{ color: b.accent }} scope="col">
            {b.short}
          </th>
        </tr>
      </thead>
      <tbody>
        {labels.map((l) => (
          <tr key={l} className="border-b border-line/60 last:border-b-0">
            <th scope="row" className="py-2 pr-2 text-left font-normal text-ink-muted">
              {l}
            </th>
            <td className="py-2 pr-2 font-semibold text-ink tabular-nums">{ra.find((r) => r.label === l)?.value ?? 'None'}</td>
            <td className="py-2 font-semibold text-ink tabular-nums">{rb.find((r) => r.label === l)?.value ?? 'None'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MoleculeSide({ m }: { m: Material }) {
  const mol = getMoleculeSafe(m.oligomer)
  return (
    <div className="min-w-0">
      <div className="aspect-square w-full sm:aspect-[4/3] overflow-hidden rounded-lg border border-line/60 bg-stage">
        {mol ? (
          <MoleculeTile molecule={mol} highlight={mol.groups.some((g) => g.id === m.repeatUnitGroup) ? m.repeatUnitGroup : null} className="size-full" />
        ) : (
          <p className="grid size-full place-items-center p-4 text-center text-sm text-ink-muted">Model coming soon</p>
        )}
      </div>
      <p className="mt-2 text-sm font-semibold" style={{ color: m.accent }}>
        {m.short}
      </p>
      {mol && (
        <p className="text-sm text-ink-muted">
          {mol.name} <span className="tabular-nums">(<Formula formula={mol.formula} />)</span>
        </p>
      )}
    </div>
  )
}

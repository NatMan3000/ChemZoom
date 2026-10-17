import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Html } from '@react-three/drei'
import type { AtomBond, AtomModel, Vec3 } from './atomModel'
import { bondWords } from './atomModel'
import { ATOM_COLOURS } from './atomLook'
import { elements } from '../../content/elements'

// DOM labels for the atom level (drei <Html>, never <Text>: <Text> fetches a font from a CDN and breaks offline).
// Few and plain: the atom's name and what is in it, and at each neighbour its symbol and what the bond is.

// Keep labels under the app's own UI and the stage chips (drei's default z-index range reaches 16 million).
const Z_RANGE = [0, 0]

const pill: CSSProperties = {
  background: 'rgba(11, 16, 32, 0.78)',
  border: '1px solid #2A3558',
  borderRadius: 12,
  color: '#E8ECF7',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  userSelect: 'none',
  fontVariantNumeric: 'tabular-nums',
}

function Dot({ colour }: { colour: string }) {
  return (
    <span
      aria-hidden
      style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: colour, marginRight: 6, verticalAlign: '0.05em' }}
    />
  )
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Html labels mount one frame late. drei's <Html> makes its own React root and rebuilds it when the canvas
 * connects its events; a label mounted in the canvas's first commit (a deep link straight to the atom level)
 * can have its new root wiped by the old one's deferred unmount and stay blank until something re-renders it.
 */
function useAfterFirstFrame() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return ready
}

function Faded({ opacity, children }: { opacity: number; children: ReactNode }) {
  return <div style={{ opacity, transition: 'none' }}>{children}</div>
}

export type TitleSlot = 'below' | 'above' | 'right' | 'left'

// The card hangs off its anchor point on the side away from the atom.
const SLOT_TRANSFORM: Record<TitleSlot, string> = {
  below: 'translate(-50%, 0)',
  above: 'translate(-50%, -100%)',
  right: 'translate(0, -50%)',
  left: 'translate(-100%, -50%)',
}

/** The atom's own card, just outside its outer shell on the side its bonds leave clear (see useTitleSlot). */
export function AtomTitle({
  model,
  slot,
  position,
  accent,
  opacity,
  compact,
  maxWidth,
}: {
  model: AtomModel
  slot: TitleSlot
  position: Vec3
  accent: string
  opacity: number
  compact: boolean
  /** On a phone the card wraps inside the stage rather than running off it. */
  maxWidth?: number
}) {
  const ready = useAfterFirstFrame()
  const { info } = model
  const neutrons = model.neutrons === 0 ? 'no neutrons' : plural(model.neutrons, 'neutron', 'neutrons')
  const innerSum = model.innerShells.reduce((s, x) => s + x, 0)
  const shells =
    model.innerShells.length === 0
      ? `${plural(model.outer, 'electron', 'electrons')}, in its one shell`
      : `${model.innerShells.join(' + ')} electron${innerSum === 1 ? '' : 's'} inside, ${model.outer} in the outer shell`
  const from = model.bonds.length === 1 ? (elements[model.bonds[0].el]?.name.toLowerCase() ?? 'its neighbour') : 'its neighbours'
  const full = info.symbol === 'H' ? 2 : 8
  const nucleus = (
    <>
      <Dot colour={ATOM_COLOURS.proton} />
      {plural(model.protons, 'proton', 'protons')}
      <span style={{ display: 'inline-block', width: 12 }} />
      <Dot colour={ATOM_COLOURS.neutron} />
      {neutrons}
    </>
  )
  if (!ready) return null
  return (
    <Html position={position} zIndexRange={Z_RANGE} pointerEvents="none">
      <Faded opacity={opacity}>
        <div
          style={{
            ...pill,
            transform: SLOT_TRANSFORM[slot],
            ...(maxWidth ? { whiteSpace: 'normal', width: 'max-content', maxWidth } : {}),
            padding: compact ? '6px 10px' : '10px 14px',
            borderLeft: `3px solid ${accent}`,
            fontSize: 14,
            lineHeight: 1.45,
            textAlign: 'left',
          }}
        >
          {compact ? (
            // Phone: one line, so it hides as little of the atom as it can; the panel carries the rest.
            <div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginRight: 10 }}>{info.name}</span>
              {nucleus}
            </div>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, lineHeight: 1.2 }}>{info.name}</div>
              <div>{nucleus}</div>
            </>
          )}
          {!compact && <div style={{ color: '#A3AECB' }}>{shells}</div>}
          {!compact && model.bonds.length > 0 && (
            <div>
              <Dot colour={ATOM_COLOURS.own} />
              {model.outer} of its own
              <span style={{ color: '#A3AECB' }}> + </span>
              <Dot colour={ATOM_COLOURS.theirs} />
              {model.sharedPairs} from {from}
              <span style={{ color: '#A3AECB' }}>{model.around === full ? ` = ${full}, a full shell` : ` = ${model.around}`}</span>
            </div>
          )}
        </div>
      </Faded>
    </Html>
  )
}

/** A neighbour's symbol on its faded ball, with what the bond is just under it. */
export function NeighbourLabel({ bond, position, opacity, compact }: { bond: AtomBond; position: Vec3; opacity: number; compact: boolean }) {
  const ready = useAfterFirstFrame()
  const words = bondWords(bond)
  if (!ready) return null
  return (
    <Html position={position} center zIndexRange={Z_RANGE} pointerEvents="none">
      <Faded opacity={opacity}>
        <div style={{ position: 'relative', pointerEvents: 'none', userSelect: 'none' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: compact ? 16 : 20,
              color: '#E8ECF7',
              textShadow: '0 0 6px #0B1020, 0 0 2px #0B1020',
              textAlign: 'center',
            }}
          >
            {bond.el}
          </div>
          {!compact && (
            <div style={{ ...pill, position: 'absolute', top: '100%', left: '50%', transform: 'translate(-50%, 4px)', padding: '2px 10px', fontSize: 14 }}>
              {words.name}
              <span style={{ color: '#A3AECB' }}>: {words.pairs}</span>
            </div>
          )}
        </div>
      </Faded>
    </Html>
  )
}

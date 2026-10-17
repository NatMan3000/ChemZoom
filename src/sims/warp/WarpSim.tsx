import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Box, Layers, RotateCcw, Square } from 'lucide-react'
import { rng } from '../../three/chains'
import type { Material, Text } from '../../types/chem'
import type { SimProps } from '../types'
import { SimCanvas } from '../shared/SimCanvas'
import { HOT, enclosureWords, fmtC, mix, rangeC, seedOf } from '../shared/material'
import { clamp01, smoothstep, useReducedMotion, useTimeline } from '../shared/motion'
import { shake } from '../shared/tangle'
import { ActionButton, MaterialTag, Row, SimFrame, Toggle } from '../shared/ui'
import { useElementSize } from '../shared/layout'
import {
  Bead,
  Bed,
  ChainLens,
  LAYER_H,
  LINE_W,
  LensChain,
  LensLabelOverlay,
  Nozzle,
  bandChain,
  clipChain,
  labelTransform,
  useLensLabels,
  type LensLabel,
  type LensLabels,
} from '../shared/printing'

// Cool and warp, as a printing close-up (D18, 17 Oct: "build all four as printing close-ups"). Side on, the
// corner of a part being printed on the bed: the nozzle lays six more layers on the two already there, each
// one glowing (a heat picture) and then shrinking as it cools. Once the print is done and the part cools, a
// plastic that shrinks a lot pulls its corner up off the bed; one that hardly shrinks stays flat. The
// enclosure keeps the air warm, so the layers cool slowly and together and the corner stays down. The lens is
// a sketch of the seam under the newest layer: its hot chains jiggle loose, then pack tighter as they cool.
// Driven by sim.shrink. The scene is a pure function of the run's progress p, so p = 1 is the frame left on
// screen. Sizes are real (0.45 mm lines, 0.2 mm layers); the shrink and the gap are a teaching scale.

const RUN_MS = 9000
const BASE = 2 // layers already printed and cool when the run starts
const NEW = 6 // layers the run prints
const LAYERS = BASE + NEW
const PRINT_END = 0.62 // share of the run spent printing; the rest is the part cooling down
const SPAN = PRINT_END / NEW
const XC = 2.5 // the corner, where every layer ends
const XA = -8.5 // where the nozzle turns, off the left of the view
const XL = -18 // the part runs off the left of the view
const XS = XC - 7 // where the corner's curl starts
const XT = -1.6 // the spot the lens looks at
const HOP = 3.2 // the nozzle lifts clear when the print is done
const LENS_R = 2.3
const LENS_Y = -4.2
const LENS_Z = 4

/** The new layer the nozzle is on at p (0..NEW-1), or -1 before it starts. */
const layerAt = (p: number) => (p <= 0 ? -1 : Math.min(NEW - 1, Math.floor(p / SPAN)))
/** Even layers run from the corner to the left, odd ones back to the corner. */
const leftward = (j: number) => j % 2 === 0
/** Share of layer j laid at p (0..1). */
const laidShare = (j: number, p: number) => clamp01((p - j * SPAN) / SPAN)
/** Where the nozzle is along layer j at share u. */
const pathX = (j: number, u: number) => (leftward(j) ? XC + (XA - XC) * u : XA + (XC - XA) * u)
/** When layer j was laid at x (p units). The stretch off the left of the view counts as laid at the turn. */
function laidAt(j: number, x: number): number {
  const u = leftward(j) ? (XC - x) / (XC - XA) : (x - XA) / (XC - XA)
  return j * SPAN + SPAN * clamp01(u)
}

/** How far the cooled part's corner lifts off the bed (scene units), from the shrink score. None up to 2. */
function maxLift(m: Material, enclosure: boolean): number {
  if (enclosure) return 0
  return [0, 0, 0.6, 1.25, 1.9][m.sim.shrink - 1]
}
/** How far a layer's end pulls back as it cools (scene units): every plastic shrinks a little, some a lot. */
const pullOf = (m: Material) => 0.09 * m.sim.shrink

function verdict(m: Material, enclosure: boolean): string {
  const lift = maxLift(m, enclosure)
  if (lift >= 1.5) return 'the corner peeled up off the bed'
  if (lift >= 1) return 'the corner lifted off the bed'
  if (lift > 0) return 'the corner lifted a little'
  return enclosure && m.sim.shrink >= 3 ? 'the corner stayed down' : 'stayed flat on the bed'
}

/** Everything the scene reads at progress p. */
function stateAt(m: Material, p: number, enclosure: boolean) {
  const tau = enclosure ? 0.3 : 0.035
  const settle = 1 - smoothstep(0.86, 1, p)
  const glow = 0.95
  const cur = layerAt(p)
  /** Heat of layer k at x: 0 for the cool base layers, null where it is not laid yet. */
  const heatAt = (k: number, x: number): number | null => {
    const j = k - BASE
    if (j < 0) return 0
    if (j > cur) return null
    const t = laidAt(j, x)
    if (p < t) return null
    return glow * Math.exp(-(p - t) / tau) * settle
  }
  const lift = maxLift(m, enclosure) * smoothstep(PRINT_END + 0.02, 0.93, p)
  const curl = (x: number) => lift * Math.pow(clamp01((x - XS) / (XC - XS)), 2.2)
  // The nozzle: along the current layer, or lifting clear once the print is done.
  const j = Math.max(0, cur)
  const printing = p > 0 && p < PRINT_END
  const nozzle = {
    x: p <= 0 ? XC : pathX(j, laidShare(j, p)),
    y: LAYER_H * (BASE + j + 1) + 0.02 + HOP * smoothstep(PRINT_END, PRINT_END + 0.06, p),
    melt: printing ? glow : undefined,
  }
  return { heatAt, curl, lift, cur, nozzle, pull: pullOf(m) }
}
type State = ReturnType<typeof stateAt>

function caption(m: Material, c?: Material): Text {
  const pair = c ? ` ${m.short} scores ${m.sim.shrink} of 5 for shrinking; ${c.short} beside it scores ${c.sim.shrink}.` : ` ${m.short} scores ${m.sim.shrink} of 5 for shrinking.`
  return {
    simple: `The nozzle lays new layers on the corner of a part; orange shows heat, like a thermal camera. Hot plastic takes up more room, so each fresh layer shrinks as it cools, and it shrinks on top of a layer that has already set. The circle is a sketch of the seam under the newest layer: the hot chains jiggle loose, then pack tighter as they cool.${pair} A lot of shrinking pulls the corner up off the bed. An enclosure keeps the air warm, so the part cools slowly and evenly and the corner stays down.`,
    deeper: `This is thermal contraction plus uneven cooling. Each layer contracts as it drops toward room temperature, but it is welded to a layer below that has already contracted, so stress builds up between them and adds up layer by layer. Once it beats the grip of the bed (${rangeC(m.temps.bedC)} for ${m.short}) the corner lifts, where the stress has least holding it down. ${m.temps.tgC > 25 ? `The plastic sets at its glass transition (${fmtC(m.temps.tgC)} for ${m.short}), and the further it then has to cool to room temperature, the more it shrinks after it has set. ` : ''}${m.short} ${enclosureWords[m.print.enclosure]}${c ? `; ${c.short} ${enclosureWords[c.print.enclosure]}` : ''}. The lines and layers are to scale (0.45 mm by 0.2 mm); the shrink and the gap are drawn bigger so you can see them.`,
  }
}

function WarpSim({ material: m, compareWith: c }: SimProps) {
  const reduced = useReducedMotion()
  const [p, setP] = useState(0)
  const [enclosure, setEnclosure] = useState(false)
  const timeline = useTimeline(reduced)
  const [stageRef, size] = useElementSize<HTMLDivElement>()
  const list = c ? [m, c] : [m]
  const narrow = size.width > 0 && size.width / list.length < 300

  const play = () => {
    if (timeline.running) return timeline.cancel()
    timeline.run(RUN_MS, setP)
  }

  const cur = layerAt(p)
  let readout: string
  if (p === 0) readout = c ? `Ready to print the corner of a part in ${m.short} and in ${c.short}` : `Ready to print the corner of a part in ${m.short}`
  else if (p < PRINT_END) readout = `Layer ${BASE + cur + 1} of ${LAYERS}: each fresh layer shrinks as it cools${enclosure ? ', slowly in the warm enclosure' : ''}`
  else if (p < 1) readout = enclosure ? 'Print done: cooling slowly and evenly in the warm enclosure' : 'Print done: the part cools in the open air and pulls on its corner'
  else readout = list.map((x) => `${x.short}: ${verdict(x, enclosure)}`).join(' · ')

  return (
    <SimFrame
      stageRef={stageRef}
      stage={
        <div className="flex h-full w-full">
          {list.map((x) => (
            <Panel key={x.id} m={x} p={p} enclosure={enclosure} tagged={!!c} narrow={narrow} />
          ))}
        </div>
      }
      controls={
        <Row>
          <ActionButton
            action="play"
            icon={timeline.running ? Square : p >= 1 ? RotateCcw : Layers}
            label={timeline.running ? 'Stop' : p >= 1 ? 'Print it again' : 'Print the corner'}
            labels={['Stop', 'Print it again', 'Print the corner']}
            onClick={play}
            primary
            accent={m.accent}
          />
          <Toggle icon={Box} label="Enclosure" checked={enclosure} disabled={timeline.running} onChange={setEnclosure} />
        </Row>
      }
      readout={readout}
      caption={caption(m, c)}
    />
  )
}

/** One material's close-up: its own canvas, its tag and its lens labels. */
function Panel({ m, p, enclosure, tagged, narrow }: { m: Material; p: number; enclosure: boolean; tagged: boolean; narrow: boolean }) {
  const lensLabels = useLensLabels()
  const state = stateAt(m, p, enclosure)
  const labels = narrow ? NARROW_LABELS : LENS_LABELS
  return (
    <div className="relative h-full min-w-0 flex-1">
      {/* On a phone the experiments row covers the bottom of the stage, so the close-up stops above it. */}
      <div className={narrow ? 'absolute inset-x-0 top-0 bottom-16' : 'absolute inset-0'}>
      <SimCanvas
        fitBox={narrow ? [4.6, 9.8, 1.4] : [5.6, 7.4, 1.4]}
        viewFrom={[0.12, 0.2, 1]}
        target={[narrow ? XT + 0.5 : -1.1, narrow ? -1.6 : 0.7, 0]}
        orbit={false}
        label={`Close-up of the corner of a ${m.short} part being printed on the bed, with a sketch of the chains at the seam under the newest layer`}
      >
        <CornerScene m={m} p={p} state={state} labels={labels} lensLabels={lensLabels} />
      </SimCanvas>
      </div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {tagged && <MaterialTag material={m} note={`shrink ${m.sim.shrink} of 5`} style={narrow ? { left: 8, bottom: 72 } : { left: 12, top: 12 }} />}
        <LensLabelOverlay labels={[...labels, GAP_LABEL]} handle={lensLabels} />
      </div>
    </div>
  )
}

function CornerScene({ m, p, state, labels, lensLabels }: { m: Material; p: number; state: State; labels: readonly LensLabel[]; lensLabels: LensLabels }) {
  const layerColour = (k: number) => mix(m.accent, '#0B1020', 0.14 + 0.05 * ((LAYERS - 1 - k) % 2))
  const form = (x: number) => ({ dy: state.curl(x) })
  // The lens looks at the seam under the newest layer (before the run, under the top base layer).
  const top = Math.max(BASE - 1, BASE + state.cur)
  const seamY = LAYER_H * top + state.curl(XT)
  return (
    <group>
      <Bed x={[-24, 24]} z={[-4, 1]} />
      {Array.from({ length: LAYERS }, (_, k) => (
        <LayerBead key={k} k={k} p={p} state={state} colour={layerColour(k)} form={form} />
      ))}
      <Nozzle position={[state.nozzle.x, state.nozzle.y, 0]} melt={state.nozzle.melt} />
      <ChainLens
        centre={[XT, LENS_Y, LENS_Z]}
        radius={LENS_R}
        target={[XT, seamY, LINE_W / 2 + 0.02]}
        split={{ top: { colour: mix(m.accent, HOT, lensHeat(state, top)), opacity: 0.16 * lensArrived(p, top) }, bottom: { colour: m.accent, opacity: 0.1 } }}
        labels={labels}
        handle={lensLabels}
      >
        <SeamChains m={m} p={p} state={state} top={top} />
      </ChainLens>
      <GapMarker lift={state.lift} show={state.lift > 0.3 && p >= 0.93} place={lensLabels.place} />
    </group>
  )
}

/** Layer k: a printed line ending at the corner, laid by the nozzle, glowing while fresh, shorter once cool. */
function LayerBead({ k, p, state, colour, form }: { k: number; p: number; state: State; colour: string; form: (x: number) => { dy: number } }) {
  const j = k - BASE
  if (j > state.cur) return null
  let from = XL
  let to = XC
  if (j >= 0 && j === state.cur && p < PRINT_END) {
    const xn = state.nozzle.x
    if (leftward(j)) from = Math.min(XC - 0.3, xn - 0.3)
    else to = Math.max(XA, xn + 0.3)
  }
  // The corner end pulls back as the layer cools: the heat at the corner says how far it has got.
  const hc = state.heatAt(k, XC)
  if (hc != null && to >= XC) to = XC - state.pull * (1 - hc / 0.95)
  if (to - from < 0.5) return null
  const heatAt = (x: number) => state.heatAt(k, x) ?? 0
  return <Bead from={from} to={to} body={j >= 0 ? 120 : 40} colour={colour} roughness={0.4} heatAt={heatAt} form={form} position={[0, LAYER_H * (k + 0.5), 0]} />
}

/** Heat (0..1) of layer k under the lens, for tinting. */
const lensHeat = (s: State, k: number) => clamp01((s.heatAt(k, XT) ?? 0) / 0.75)
/** 0..1: how much of the newest layer has arrived over the lens spot. */
function lensArrived(p: number, top: number): number {
  const j = top - BASE
  if (j < 0) return 1
  return clamp01((p - laidAt(j, XT) + 0.004) / 0.008)
}

interface Chains {
  upper: THREE.Vector3[][]
  lower: THREE.Vector3[][]
}

/** The chains either side of the seam: loose and jiggling while hot, packed tighter as they cool. */
function SeamChains({ m, p, state, top }: { m: Material; p: number; state: State; top: number }) {
  // A fresh set of chains for each new layer, so every layer arrives in the lens on its own.
  const chains = useMemo<Chains>(() => {
    const r = rng(seedOf(m.id, 11 + top))
    const opts = { count: 5, radius: 2.0 }
    return {
      upper: Array.from({ length: 5 }, (_, i) => bandChain(r, i, { ...opts, side: 1 })),
      lower: Array.from({ length: 5 }, (_, i) => bandChain(r, i, { ...opts, side: -1 })),
    }
  }, [m.id, top])
  // How much room hot chains take: the more a plastic shrinks, the bigger the gap between hot and cool.
  const spread = 0.07 * m.sim.shrink
  const hTop = clamp01((state.heatAt(top, XT) ?? 0) / 0.95)
  const hBelow = clamp01((state.heatAt(top - 1, XT) ?? 0) / 0.95)
  const time = p * (RUN_MS / 1000)
  const j = top - BASE
  // The newest layer's chains arrive the way the nozzle is going.
  const sweep = j < 0 ? 1 : lensArrived(p, top)
  const front = -LENS_R + 2 * LENS_R * sweep
  const loosen = (pts: THREE.Vector3[], h: number, seed: number) =>
    shake(
      pts.map((v) => new THREE.Vector3(v.x * (1 + 0.5 * spread * h), v.y * (1 + spread * h), v.z)),
      0.05 * h,
      time,
      seed,
    )
  const colourOf = (h: number, light: number) => mix(mix(m.accent, light > 0 ? '#FFFFFF' : '#0B1020', Math.abs(light)), '#FFB27A', h * 0.85)
  return (
    <>
      {chains.lower.map((c, i) => (
        <LensChain key={`l${top}-${i}`} points={loosen(c, hBelow, 20 + i)} color={colourOf(hBelow, -0.3)} emissive={HOT} emissiveIntensity={hBelow * 0.3} />
      ))}
      {chains.upper.map((c, i) => {
        const pts = loosen(c, hTop, i)
        const shown = leftward(Math.max(0, j)) && j >= 0 ? mirror(clipChain(mirror(pts), front)) : clipChain(pts, front)
        return shown && <LensChain key={`u${top}-${i}`} points={shown} color={colourOf(hTop, 0.3)} emissive={HOT} emissiveIntensity={hTop * 0.45} />
      })}
    </>
  )
}

function mirror(pts: THREE.Vector3[]): THREE.Vector3[]
function mirror(pts: THREE.Vector3[] | null): THREE.Vector3[] | null
function mirror(pts: THREE.Vector3[] | null): THREE.Vector3[] | null {
  return pts && pts.map((v) => new THREE.Vector3(-v.x, v.y, v.z)).reverse()
}

const _g = new THREE.Vector3()

/** Labels the gap under the lifted corner once the part has cooled. No loop of its own. */
function GapMarker({ lift, show, place }: { lift: number; show: boolean; place: LensLabels['place'] }) {
  useFrame(({ camera, size }) => {
    if (!show) return place(GAP_LABEL.id, null)
    // Inside the gap, just in from the corner.
    _g.set(XC - 0.4, lift * 0.42, LINE_W / 2).project(camera)
    place(GAP_LABEL.id, labelTransform(((_g.x + 1) / 2) * size.width, ((1 - _g.y) / 2) * size.height, 'right'))
  })
  return null
}

const LENS_LABELS: LensLabel[] = [
  { id: 'new', text: 'newest layer', colour: '#E8ECF7', at: [LENS_R + 0.3, 0.6], align: 'left' },
  { id: 'seam', text: 'seam', colour: '#8B9CFF', at: [LENS_R + 0.3, 0], align: 'left' },
  { id: 'below', text: 'layer below', colour: '#A3AECB', at: [LENS_R + 0.3, -0.6], align: 'left' },
  { id: 'sketch', text: 'Sketch: the chains at the seam, not to scale', colour: '#A3AECB', at: [0, -LENS_R - 0.2], align: 'below' },
]
const NARROW_LABELS: LensLabel[] = [{ id: 'sketch', text: 'Sketch, not to scale', colour: '#A3AECB', at: [0, -LENS_R - 0.2], align: 'below' }]
const GAP_LABEL: LensLabel = { id: 'gap', text: 'gap', colour: '#E8ECF7', at: [0, 0], align: 'left' }

export default WarpSim

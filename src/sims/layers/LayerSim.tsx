import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Layers, RotateCcw, Square } from 'lucide-react'
import { rng } from '../../three/chains'
import type { Material, Text } from '../../types/chem'
import type { SimProps } from '../types'
import { SimCanvas } from '../shared/SimCanvas'
import { HOT, fmtC, mix, patchesOf, rangeC, seedOf } from '../shared/material'
import { clamp01, smoothstep, useReducedMotion, useTimeline } from '../shared/motion'
import { shake } from '../shared/tangle'
import { ActionButton, Meter, RangeSlider, Row, SimFrame } from '../shared/ui'
import { Bead, ChainLens, LAYER_H, LINE_W, LayerStack, LensChain, LensLabelOverlay, Nozzle, bandChain, clipChain, useLensLabels, type LensLabel } from '../shared/printing'

// Layer bonding, as a printing close-up (Nathan, 17 Oct: "a line being printed, but really close up on
// the line"). The nozzle runs across the view laying a hot new line on the layer below. A lens under it
// is a sketch of the seam between the two: once the hot line arrives, chains from it reach down across
// the seam, more the hotter the line, until the seam cools past the point where the chains lock and
// they freeze where they are. Everything on screen is a function of the run's progress p, so the frame
// at p = 1 is the frame left on screen. Sizes in the close-up are real proportions (a 0.4 mm nozzle,
// 0.45 mm line, 0.2 mm layers); the lens and the weld timing are a teaching scale, not a measurement.

const CHAINS = 5
const RUN_MS = 7000
const RUN_S = RUN_MS / 1000

// Close-up scale: 1 unit = 1/3 mm.
const H = LAYER_H // 0.2 mm
const W = LINE_W // 0.45 mm
const BELOW = 6 // cooled layers drawn under the new one
const X0 = -3.6 // nozzle at rest (left), where the new line has got to
const X1 = 3.6 // where the line ends and the nozzle lifts
const FAR = 16 // the layers run off both sides of the view
const TRAVEL = 0.5 // share of the run the nozzle spends crossing the view
const HOP = 0.9 // lift at the end of the line

// The lens: a magnified sketch of the seam right under x = 0.
const LENS_R = 2.3
const LENS_Y = -4.9
const LENS_Z = W / 2 + 1.3
/** The weld strength (0..1) each chain needs to get right across the seam: the hotter the line, the more make it. */
const NEEDS = [0.4, 0.55, 0.68, 0.8, 0.94]

const nozzleX = (p: number) => X0 + (X1 - X0) * clamp01(p / TRAVEL)
/** When the nozzle laid the line at x (negative: before this run, the bit already laid at rest). */
const laidAt = (x: number) => (TRAVEL * (x - X0)) / (X1 - X0)
const ARRIVE = laidAt(0)

function sliderRange(m: Material): [number, number] {
  return [m.temps.nozzleC[0] - 40, m.temps.nozzleC[1]]
}

/**
 * 0..1: how well the layers can weld at this nozzle temperature. Below the maker's range it climbs
 * from poor to fair; across the range it climbs from fair to strong. A teaching curve, not a measurement.
 */
function strengthAt(m: Material, t: number): number {
  const [lo, hi] = sliderRange(m)
  const n0 = m.temps.nozzleC[0]
  if (t < n0) return 0.1 + 0.45 * clamp01((t - lo) / (n0 - lo))
  return 0.55 + 0.45 * clamp01((t - n0) / Math.max(1, hi - n0))
}

/**
 * Below this the chains at the seam stop moving. For most plastics it is the glass transition; for one
 * held together by hard islands (TPU, whose glass transition is far below room temperature) it is where
 * the islands form again and pin the chains.
 */
function lockC(m: Material): number {
  return patchesOf(m) === 'islands' && m.temps.meltC != null ? m.temps.meltC : m.temps.tgC
}
const lockWords = (m: Material) => (patchesOf(m) === 'islands' ? 'the hard islands re-form and pin the chains' : 'the chains freeze where they are')

/** Share of the run the seam stays hot enough for chains to move: longer the hotter the new line. */
function weldWindow(m: Material, t: number): number {
  if (t <= lockC(m) + 10) return 0
  return 0.12 + 0.38 * strengthAt(m, t)
}

interface ChainPlan {
  base: THREE.Vector3[]
  anchor: number // the point nearest the seam; it leads the reach
  need: number // weld strength this chain needs to get right across
}

/**
 * Chains for one side of the seam, in lens units: y above 0 is the new line, below 0 the layer below.
 * Calm, mostly level chains in bands, so the one thing that moves (reaching across the seam) reads clearly.
 */
function planSide(seed: number, upper: boolean): ChainPlan[] {
  const r = rng(seed)
  const needs = [...NEEDS].sort(() => r() - 0.5)
  // Each chain reaches across at its own spot along the seam, so the reaches sit side by side, not in a pile.
  const spots = [2, 3, 4, 5, 6].sort(() => r() - 0.5)
  return Array.from({ length: CHAINS }, (_, i) => ({
    base: bandChain(r, i, { count: CHAINS, side: upper ? 1 : -1, radius: LENS_R }),
    anchor: spots[i],
    need: needs[i],
  }))
}

/** How far chain c's middle moves toward the other side: right across (by 0.3) once the weld is strong enough for it. */
function reachOf(c: ChainPlan, strength: number, weld: number): number {
  const f = clamp01((strength - (c.need - 0.3)) / 0.3)
  return weld * f * (Math.abs(c.base[c.anchor].y) + 0.3)
}

/** A chain with the stretch around its anchor pushed `by` toward (and past) the seam. */
function reached(c: ChainPlan, by: number): THREE.Vector3[] {
  const dir = c.base[c.anchor].y > 0 ? -1 : 1
  return c.base.map((pt, k) => {
    const d = k - c.anchor
    const w = Math.exp(-(d * d) / 1.3)
    return new THREE.Vector3(pt.x, pt.y + dir * by * w, pt.z)
  })
}

function crossings(upper: ChainPlan[], strength: number, weld: number): number {
  return upper.filter((c) => reachOf(c, strength, weld) - Math.abs(c.base[c.anchor].y) > 0.08).length
}

function bondWord(v: number): string {
  if (v < 0.35) return 'weak, it could split along this line'
  if (v < 0.62) return 'fair'
  return 'strong'
}

/** Everything the scene and the panel read at progress p and temperature t. */
function stateAt(m: Material, t: number, p: number) {
  const [lo, hi] = sliderRange(m)
  const strength = strengthAt(m, t)
  const win = weldWindow(m, t)
  const weld = win > 0 ? 1 - Math.pow(1 - clamp01((p - ARRIVE) / win), 3) : 0
  // Glow of the fresh line as it leaves the nozzle (hotter is brighter), and how fast it fades.
  const glow = 0.45 + 0.55 * clamp01((t - lo) / (hi - lo))
  const tau = 0.07 + 0.5 * win
  const settle = 1 - smoothstep(0.8, 1, p)
  // Only plastic already out of the nozzle is hot; the rounded tip under the nozzle counts as just laid.
  const tip = nozzleX(p) + 0.35
  const heatAt = (x: number) => (x > tip ? 0 : glow * Math.exp(-Math.max(0, p - laidAt(x)) / tau) * settle)
  // 1 while the seam is hot enough for chains to move, falling to 0 as it cools past the lock point.
  const seamHot = p < ARRIVE || win === 0 ? 0 : clamp01(1 - (p - ARRIVE) / win)
  return { strength, win, weld, glow, heatAt, seamHot, bond: strength * weld }
}

function caption(m: Material): Text {
  const lock = lockC(m)
  const islands = patchesOf(m) === 'islands'
  return {
    simple: `The nozzle lays a new line of hot ${m.short} on the layer below; orange shows heat, like a thermal camera. The circle is a sketch of the seam between them, zoomed in on the chains. While the seam is hot, chains from the new line reach down across it and tangle with the chains underneath. Once it cools below ${fmtC(lock)}, ${lockWords(m)}. A hotter line keeps the seam hot for longer, so more chains get across and the layers grip better. Too cool and the seam stays weak, which is where prints split.`,
    deeper: `Layer adhesion comes from interdiffusion: the hot line reheats the top of the layer below, and chain ends reptate across the interface and entangle, but only while the seam is above ${islands ? `the point where the hard segments order again (about ${fmtC(lock)} for ${m.short}; its glass transition, ${fmtC(m.temps.tgC)}, is far below room temperature)` : `the glass transition (${fmtC(lock)} for ${m.short})`}. Nozzle temperature (${rangeC(m.temps.nozzleC)}), cooling fan speed and print speed all set how long the seam stays hot, so they set how strongly the layers stick. The close-up is to scale: a 0.4 mm nozzle, a 0.45 mm line, 0.2 mm layers.`,
  }
}

function LayerSim({ material: m }: SimProps) {
  const reduced = useReducedMotion()
  const [lo, hi] = sliderRange(m)
  const [temp, setTemp] = useState(() => Math.round((m.temps.nozzleC[0] + m.temps.nozzleC[1]) / 2))
  const [p, setP] = useState(0)
  const timeline = useTimeline(reduced)

  const seed = seedOf(m.id, 3)
  const lensLabels = useLensLabels()
  const upper = useMemo(() => planSide(seed, true), [seed])
  const lower = useMemo(() => planSide(seed + 1, false), [seed])
  const s = stateAt(m, temp, p)
  const lock = lockC(m)

  const play = () => {
    if (timeline.running) return timeline.cancel()
    timeline.run(RUN_MS, setP)
  }

  let readout: string
  if (p === 0) readout = `Ready to print a new line at ${fmtC(temp)}`
  else if (p < ARRIVE) readout = `Printing at ${fmtC(temp)}: the nozzle lays a hot new line`
  else if (p < 1 && s.win === 0) readout = `At ${fmtC(temp)} the seam never gets above ${fmtC(lock)}, so the chains cannot cross`
  else if (p < ARRIVE + s.win) readout = `Seam above ${fmtC(lock)}: chains reaching across`
  else if (p < 1) readout = `Seam below ${fmtC(lock)}: ${lockWords(m)}`
  else readout = `${fmtC(temp)}: ${crossings(upper, s.strength, s.weld)} of ${CHAINS} chains reached across the seam, bond ${bondWord(s.bond)}`

  return (
    <SimFrame
      stage={
        <SimCanvas fitBox={[5.7, 5.5, 1.4]} viewFrom={[0.12, 0.2, 1]} target={[0, -2.55, 0]} label={`Close-up of a nozzle printing a new line of ${m.short} at ${fmtC(temp)} onto the layer below, with a sketch of the chains at the seam`}>
          <PrintScene m={m} p={p} upper={upper} lower={lower} state={s} lensLabels={lensLabels} />
        </SimCanvas>
      }
      overlay={<LensLabelOverlay labels={LENS_LABELS} handle={lensLabels} />}
      controls={
        <div className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row-reverse md:items-center md:gap-6">
            <RangeSlider
              label="New layer temperature"
              min={lo}
              max={hi}
              value={temp}
              accent={m.accent}
              fill={`linear-gradient(90deg, #8B9CFF, ${HOT})`}
              band={{ from: m.temps.nozzleC[0], to: m.temps.nozzleC[1], label: `Print ${rangeC(m.temps.nozzleC)}` }}
              onChange={(v) => {
                // Dragging after a run shows the finished seam at the new temperature straight away.
                if (timeline.running) timeline.cancel()
                setTemp(v)
                if (p > 0) setP(1)
              }}
            />
            <Row className="shrink-0">
              <ActionButton
                action="play"
                icon={timeline.running ? Square : p >= 1 ? RotateCcw : Layers}
                label={timeline.running ? 'Stop' : p >= 1 ? 'Print it again' : 'Print a line'}
                labels={['Stop', 'Print it again', 'Print a line']}
                onClick={play}
                primary
                accent={m.accent}
              />
            </Row>
          </div>
          <Meter label="Bond between layers" value={s.bond} accent={m.accent} word={p < ARRIVE ? 'not joined yet' : bondWord(s.bond).split(',')[0]} />
        </div>
      }
      readout={readout}
      caption={caption(m)}
    />
  )
}

// ---------------------------------------------------------------- the close-up

type State = ReturnType<typeof stateAt>
const NEW_BODY = 150

function PrintScene({ m, p, upper, lower, state, lensLabels }: { m: Material; p: number; upper: ChainPlan[]; lower: ChainPlan[]; state: State; lensLabels: ReturnType<typeof useLensLabels> }) {
  const xn = nozzleX(p)
  const hop = HOP * smoothstep(TRAVEL, TRAVEL + 0.06, p)
  const layerColour = (k: number) => mix(m.accent, '#0B1020', 0.2 + 0.09 * k)
  return (
    <group>
      <LayerStack layers={BELOW} from={-FAR} to={FAR} colour={layerColour} />
      {/* The line being printed, from off the left of the view to just under the nozzle, glowing where it is fresh. */}
      <Bead from={-FAR} to={xn + 0.3} body={NEW_BODY} colour={layerColour(0)} roughness={0.4} heatAt={state.heatAt} position={[0, H / 2, 0]} />
      <Nozzle position={[xn, H + 0.02 + hop, 0]} melt={state.glow} />
      {/* The lens looks at the seam under x = 0, on the side of the print facing us. */}
      <ChainLens
        centre={[0, LENS_Y, LENS_Z]}
        radius={LENS_R}
        target={[0, 0, W / 2 + 0.02]}
        split={{ top: { colour: mix(m.accent, HOT, clamp01(state.heatAt(0) / 0.75)), opacity: 0.16 * lensArrived(p) }, bottom: { colour: m.accent, opacity: 0.1 } }}
        labels={LENS_LABELS}
        handle={lensLabels}
      >
        <LensChains m={m} p={p} upper={upper} lower={lower} state={state} />
      </ChainLens>
    </group>
  )
}

/** Where the new line's chains have got to across the lens, as the nozzle passes over the seam. */
const lensFront = (p: number) => -LENS_R + 2 * LENS_R * clamp01((p - ARRIVE + 0.03) / 0.06)
const lensArrived = (p: number) => clamp01((lensFront(p) + LENS_R) / (2 * LENS_R))

/** The chains either side of the seam under x = 0. */
function LensChains({ m, p, upper, lower, state }: { m: Material; p: number; upper: ChainPlan[]; lower: ChainPlan[]; state: State }) {
  // The new line's chains appear left to right as the nozzle passes over the seam.
  const front = lensFront(p)
  const warm = clamp01(state.heatAt(0) / 0.75)
  // Chains wriggle only while the seam is hot, and the wriggle dies away to nothing as it locks.
  const amp = 0.035 * state.seamHot
  const time = p * RUN_S
  const newColour = mix(mix(m.accent, '#FFFFFF', 0.3), '#FFB27A', warm * 0.85)
  const oldColour = mix(mix(m.accent, '#0B1020', 0.3), '#FFB27A', warm * 0.35)
  return (
    <>
      {lower.map((c, i) => (
        <LensChain key={`l${i}`} points={shake(reached(c, 0.5 * reachOf(c, state.strength, state.weld)), amp * 0.7, time, 20 + i)} color={oldColour} emissive={HOT} emissiveIntensity={warm * 0.15} />
      ))}
      {upper.map((c, i) => {
        const pts = clipChain(shake(reached(c, reachOf(c, state.strength, state.weld)), amp, time, i), front)
        return pts && <LensChain key={`u${i}`} points={pts} color={newColour} emissive={HOT} emissiveIntensity={warm * 0.45} />
      })}
    </>
  )
}

const LENS_LABELS: LensLabel[] = [
  { id: 'new', text: 'new line', colour: '#E8ECF7', at: [LENS_R + 0.3, 0.6], align: 'left' },
  { id: 'seam', text: 'seam', colour: '#8B9CFF', at: [LENS_R + 0.3, 0], align: 'left' },
  { id: 'below', text: 'layer below', colour: '#A3AECB', at: [LENS_R + 0.3, -0.6], align: 'left' },
  { id: 'sketch', text: 'Sketch: the chains at the seam, not to scale', colour: '#A3AECB', at: [0, -LENS_R - 0.2], align: 'below' },
]

export default LayerSim

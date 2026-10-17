import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Line } from '@react-three/drei'
import { Layers, RotateCcw, Square } from 'lucide-react'
import { rng } from '../../three/chains'
import type { Material, Text } from '../../types/chem'
import type { SimProps } from '../types'
import { SimCanvas } from '../shared/SimCanvas'
import { Tube } from '../shared/Tube'
import { HOT, fmtC, mix, patchesOf, rangeC, seedOf } from '../shared/material'
import { clamp01, smoothstep, useReducedMotion, useTimeline } from '../shared/motion'
import { shake } from '../shared/tangle'
import { ActionButton, Meter, RangeSlider, Row, SimFrame } from '../shared/ui'

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
const H = 0.6 // layer height, 0.2 mm
const W = 1.35 // line width, 0.45 mm
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
  const sign = upper ? 1 : -1
  const needs = [...NEEDS].sort(() => r() - 0.5)
  // Each chain reaches across at its own spot along the seam, so the reaches sit side by side, not in a pile.
  const spots = [2, 3, 4, 5, 6].sort(() => r() - 0.5)
  return Array.from({ length: CHAINS }, (_, i) => {
    const n = 9
    const band = 0.3 + (1.15 * (i + 0.5)) / CHAINS
    const half = Math.min(1.75, Math.sqrt((LENS_R - 0.35) ** 2 - (band + 0.12) ** 2))
    const shift = (r() - 0.5) * 0.4
    const phase = r() * Math.PI * 2
    const waves = 1 + r() * 1.5
    const size = 0.025 + r() * 0.03
    const z = (r() - 0.5) * 0.5
    const base: THREE.Vector3[] = []
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1)
      base.push(new THREE.Vector3(-half + 2 * half * u + shift * Math.sin(Math.PI * u), sign * (band + size * Math.sin(phase + waves * Math.PI * u)), z))
    }
    return { base, anchor: spots[i], need: needs[i] }
  })
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
  const labels = useRef<Record<string, HTMLElement | null>>({})
  const placeLabel = useCallback((id: string, transform: string) => {
    const el = labels.current[id]
    if (!el) return
    el.style.transform = transform
    el.style.visibility = 'visible'
  }, [])
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
          <PrintScene m={m} p={p} upper={upper} lower={lower} state={s} placeLabel={placeLabel} />
        </SimCanvas>
      }
      overlay={LENS_LABELS.map((l) => (
        <span
          key={l.id}
          ref={(el) => {
            labels.current[l.id] = el
          }}
          className="absolute top-0 left-0 text-sm font-semibold whitespace-nowrap"
          style={{ color: l.colour, visibility: 'hidden' }}
        >
          {l.text}
        </span>
      ))}
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

/** A printed line's cross-section: a rounded rectangle (a superellipse), slightly taller than a layer so neighbours squash into each other. */
const RING = 20
const SECTION = (() => {
  const n = 2.6
  const a = W / 2
  const b = (H / 2) * 1.08
  return Array.from({ length: RING }, (_, j) => {
    const t = (j / RING) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    const z = a * Math.sign(c) * Math.abs(c) ** (2 / n)
    const y = b * Math.sign(s) * Math.abs(s) ** (2 / n)
    const nz = (Math.sign(c) * Math.abs(c) ** (2 - 2 / n)) / a
    const ny = (Math.sign(s) * Math.abs(s) ** (2 - 2 / n)) / b
    const l = Math.hypot(nz, ny) || 1
    return { z, y, nz: nz / l, ny: ny / l }
  })
})()

const CAP = 6
interface RingAt {
  x: number
  s: number // cross-section scale (0 at a rounded tip)
  ax: number // axial part of the normal
}

/** Rings for a line from x0 to x1 with rounded ends and `body` rings between the caps. */
function lineRings(x0: number, x1: number, body: number): RingAt[] {
  const cap = Math.min(W * 0.42, (x1 - x0) / 2)
  const out: RingAt[] = []
  for (let i = 0; i <= CAP; i++) {
    const th = (i / CAP) * (Math.PI / 2)
    out.push({ x: x0 + cap * (1 - Math.cos(th)), s: Math.sin(th), ax: -Math.cos(th) })
  }
  for (let j = 1; j <= body; j++) out.push({ x: x0 + cap + ((x1 - x0 - 2 * cap) * j) / (body + 1), s: 1, ax: 0 })
  for (let i = CAP; i >= 0; i--) {
    const th = (i / CAP) * (Math.PI / 2)
    out.push({ x: x1 - cap * (1 - Math.cos(th)), s: Math.sin(th), ax: Math.cos(th) })
  }
  return out
}

function lineGeometry(rings: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  const n = rings * RING
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage))
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage))
  g.setAttribute('heat', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage))
  const idx: number[] = []
  for (let r = 0; r < rings - 1; r++) {
    for (let j = 0; j < RING; j++) {
      const a = r * RING + j
      const b = (r + 1) * RING + j
      const c = (r + 1) * RING + ((j + 1) % RING)
      const d = r * RING + ((j + 1) % RING)
      idx.push(a, b, d, b, c, d)
    }
  }
  g.setIndex(idx)
  return g
}

function writeLine(g: THREE.BufferGeometry, rings: RingAt[], heatAt?: (x: number) => number) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute
  const nor = g.getAttribute('normal') as THREE.BufferAttribute
  const heat = g.getAttribute('heat') as THREE.BufferAttribute
  rings.forEach((r, i) => {
    const h = heatAt ? heatAt(r.x) : 0
    for (let j = 0; j < RING; j++) {
      const sec = SECTION[j]
      const k = i * RING + j
      pos.setXYZ(k, r.x, sec.y * r.s, sec.z * r.s)
      const nx = r.ax
      const ny = sec.ny * r.s
      const nz = sec.nz * r.s
      const l = Math.hypot(nx, ny, nz) || 1
      nor.setXYZ(k, nx / l, ny / l, nz / l)
      heat.setX(k, h)
    }
  })
  pos.needsUpdate = true
  nor.needsUpdate = true
  heat.needsUpdate = true
  g.computeBoundingSphere()
}

/** Plastic that glows where it is hot: a `heat` attribute (0..1) warms the colour and adds an orange glow. */
function hotPlastic(colour: string): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.4, metalness: 0.02 })
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float heat;\nvarying float vHeat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHeat = heat;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vHeat;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.5, 0.2), clamp(vHeat, 0.0, 1.0) * 0.8);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.32, 0.08) * vHeat * vHeat * 1.4;')
  }
  return mat
}

type State = ReturnType<typeof stateAt>

function PrintScene({ m, p, upper, lower, state, placeLabel }: { m: Material; p: number; upper: ChainPlan[]; lower: ChainPlan[]; state: State; placeLabel: PlaceLabel }) {
  const xn = nozzleX(p)
  const hop = HOP * smoothstep(TRAVEL, TRAVEL + 0.06, p)
  const layerColour = (k: number) => mix(m.accent, '#0B1020', 0.2 + 0.09 * k)
  return (
    <group>
      {Array.from({ length: BELOW }, (_, i) => (
        <CooledLine key={i} y={-H * (i + 0.5)} colour={layerColour(i)} />
      ))}
      <NewLine end={xn} colour={layerColour(0)} heatAt={state.heatAt} />
      <Nozzle x={xn} lift={hop} glow={state.glow} />
      {/* Where the lens looks: the seam under x = 0, on the side of the print facing us. */}
      <mesh position={[0, 0, W / 2 + 0.02]}>
        <ringGeometry args={[0.2, 0.27, 40]} />
        <meshBasicMaterial color="#8B9CFF" />
      </mesh>
      <Line points={[[0, -0.27, W / 2 + 0.02], [0, LENS_Y + LENS_R, LENS_Z]]} color="#8B9CFF" lineWidth={1.5} />
      <Lens m={m} p={p} upper={upper} lower={lower} state={state} />
      <PlaceLabels place={placeLabel} />
    </group>
  )
}

/** A layer that has already cooled: a straight printed line running off both sides of the view. */
function CooledLine({ y, colour }: { y: number; colour: string }) {
  const geom = useMemo(() => {
    const rings = lineRings(-FAR, FAR, 2)
    const g = lineGeometry(rings.length)
    writeLine(g, rings)
    return g
  }, [])
  useEffect(() => () => geom.dispose(), [geom])
  return (
    <mesh geometry={geom} position={[0, y, 0]}>
      <meshStandardMaterial color={colour} roughness={0.45} metalness={0.02} />
    </mesh>
  )
}

const NEW_BODY = 150

/** The line being printed, from off the left of the view to just under the nozzle, glowing where it is fresh. */
function NewLine({ end, colour, heatAt }: { end: number; colour: string; heatAt: (x: number) => number }) {
  const invalidate = useThree((s) => s.invalidate)
  const geom = useMemo(() => lineGeometry(2 * (CAP + 1) + NEW_BODY), [])
  const mat = useMemo(() => hotPlastic(colour), [colour])
  useEffect(() => () => geom.dispose(), [geom])
  useEffect(() => () => mat.dispose(), [mat])
  useLayoutEffect(() => {
    writeLine(geom, lineRings(-FAR, end + 0.3, NEW_BODY), heatAt)
    invalidate()
  }, [geom, end, heatAt, invalidate])
  return <mesh geometry={geom} material={mat} position={[0, H / 2, 0]} frustumCulled={false} />
}

/** The nozzle tip, to scale: a 0.4 mm hole in a flat tip, a cone, the hex, and the heater block's silicone sock. */
function Nozzle({ x, lift, glow }: { x: number; lift: number; glow: number }) {
  const steel = { color: '#C2C9D6', metalness: 0.55, roughness: 0.32 }
  return (
    <group position={[x, H + 0.02 + lift, 0]}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[1.05, 1.0, 0.4, 40]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[2.6, 1.05, 2.0, 40]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[0, 3.1, 0]} rotation={[0, Math.PI / 6, 0]}>
        <cylinderGeometry args={[3.3, 3.3, 1.4, 6]} />
        <meshStandardMaterial {...steel} roughness={0.4} />
      </mesh>
      <mesh position={[0, 6.2, 0]}>
        <boxGeometry args={[11, 4.8, 6]} />
        <meshStandardMaterial color="#3A4466" roughness={0.8} />
      </mesh>
      {/* The melt at the hole, seen glowing just under the tip. */}
      <mesh position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 32]} />
        <meshBasicMaterial color={mix('#FFB070', HOT, 1 - glow)} />
      </mesh>
    </group>
  )
}

/** The lens: a magnified sketch of the chains either side of the seam under x = 0. */
function Lens({ m, p, upper, lower, state }: { m: Material; p: number; upper: ChainPlan[]; lower: ChainPlan[]; state: State }) {
  // The new line's chains appear left to right as the nozzle passes over the seam.
  const front = -LENS_R + 2 * LENS_R * clamp01((p - ARRIVE + 0.03) / 0.06)
  const warm = clamp01(state.heatAt(0) / 0.75)
  // Chains wriggle only while the seam is hot, and the wriggle dies away to nothing as it locks.
  const amp = 0.035 * state.seamHot
  const time = p * RUN_S
  const newColour = mix(mix(m.accent, '#FFFFFF', 0.3), '#FFB27A', warm * 0.85)
  const oldColour = mix(mix(m.accent, '#0B1020', 0.3), '#FFB27A', warm * 0.35)
  const arrived = clamp01((front + LENS_R) / (2 * LENS_R))

  return (
    <Billboard position={[0, LENS_Y, LENS_Z]}>
      <mesh>
        <circleGeometry args={[LENS_R, 64]} />
        <meshBasicMaterial color="#0B1020" />
      </mesh>
      {/* the two sides: the new line above the seam, the layer below under it */}
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[LENS_R, 64, 0, Math.PI]} />
        <meshBasicMaterial color={mix(m.accent, HOT, warm)} transparent opacity={0.16 * arrived} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[LENS_R, 64, Math.PI, Math.PI]} />
        <meshBasicMaterial color={m.accent} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[2 * LENS_R - 0.1, 0.035]} />
        <meshBasicMaterial color="#8B9CFF" transparent opacity={0.75} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <ringGeometry args={[LENS_R, LENS_R + 0.08, 96]} />
        <meshBasicMaterial color="#8B9CFF" />
      </mesh>
      <group position={[0, 0, 0.4]}>
        {lower.map((c, i) => (
          <Tube key={`l${i}`} points={shake(reached(c, 0.5 * reachOf(c, state.strength, state.weld)), amp * 0.7, time, 20 + i)} color={oldColour} emissive={HOT} emissiveIntensity={warm * 0.15} radius={0.07} samples={48} radial={8} />
        ))}
        {upper.map((c, i) => {
          const pts = upTo(shake(reached(c, reachOf(c, state.strength, state.weld)), amp, time, i), front)
          return pts && <Tube key={`u${i}`} points={pts} color={newColour} emissive={HOT} emissiveIntensity={warm * 0.45} radius={0.07} samples={48} radial={8} />
        })}
      </group>
    </Billboard>
  )
}

// Labels for the lens are DOM text over the stage (crisp at any size), placed each frame the canvas draws.
type PlaceLabel = (id: string, transform: string) => void
const LENS_LABELS = [
  { id: 'new', text: 'new line', colour: '#E8ECF7', at: [LENS_R + 0.3, 0.6], align: 'left' },
  { id: 'seam', text: 'seam', colour: '#8B9CFF', at: [LENS_R + 0.3, 0], align: 'left' },
  { id: 'below', text: 'layer below', colour: '#A3AECB', at: [LENS_R + 0.3, -0.6], align: 'left' },
  { id: 'sketch', text: 'Sketch: the chains at the seam, not to scale', colour: '#A3AECB', at: [0, -LENS_R - 0.2], align: 'below' },
] as const

const _c = new THREE.Vector3()
const _r = new THREE.Vector3()
const _u = new THREE.Vector3()

/** Moves each lens label to its spot beside the lens (which always faces the camera). No loop of its own. */
function PlaceLabels({ place }: { place: PlaceLabel }) {
  useFrame(({ camera, size }) => {
    _r.set(1, 0, 0).applyQuaternion(camera.quaternion)
    _u.set(0, 1, 0).applyQuaternion(camera.quaternion)
    for (const l of LENS_LABELS) {
      _c.set(0, LENS_Y, LENS_Z).addScaledVector(_r, l.at[0]).addScaledVector(_u, l.at[1]).project(camera)
      const x = ((_c.x + 1) / 2) * size.width
      const y = ((1 - _c.y) / 2) * size.height
      place(l.id, l.align === 'below' ? `translate(${x}px, ${y}px) translate(-50%, 0)` : `translate(${x}px, ${y}px) translate(0, -50%)`)
    }
  })
  return null
}

/** The part of a chain left of `front`, ending exactly at the front; null if none of it is there yet. */
function upTo(points: THREE.Vector3[], front: number): THREE.Vector3[] | null {
  if (front >= points[points.length - 1].x) return points
  const out: THREE.Vector3[] = []
  for (let i = 0; i < points.length; i++) {
    if (points[i].x <= front) out.push(points[i])
    else {
      if (i > 0) out.push(points[i - 1].clone().lerp(points[i], (front - points[i - 1].x) / (points[i].x - points[i - 1].x)))
      break
    }
  }
  return out.length >= 2 && out[out.length - 1].distanceTo(out[0]) > 0.15 ? out : null
}

export default LayerSim

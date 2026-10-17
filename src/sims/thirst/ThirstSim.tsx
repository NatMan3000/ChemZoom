import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { Droplets, Flame, Wind } from 'lucide-react'
import { rng } from '../../three/chains'
import type { Material, Text } from '../../types/chem'
import type { SimProps } from '../types'
import { SpoolScene } from '../../scenes/SpoolScene'
import { SPOOL_WIND_R } from '../../scenes/sceneLayout'
import { SimCanvas } from '../shared/SimCanvas'
import { Tube } from '../shared/Tube'
import { HOT, WATER_H, WATER_O, fmtC, mix, rangeC, seedOf } from '../shared/material'
import { clamp01, easeInOut, smoothstep, useReducedMotion, useTimeline } from '../shared/motion'
import { shake } from '../shared/tangle'
import { ActionButton, Row, SimFrame } from '../shared/ui'
import { useElementSize } from '../shared/layout'
import {
  Bead,
  ChainLens,
  LAYER_H,
  LINE_W,
  LayerStack,
  LensChain,
  LensLabelOverlay,
  NOZZLE_PARTS,
  Nozzle,
  SECTION_POINTS,
  bandChain,
  useLensLabels,
  type LensLabel,
  type LensLabels,
} from '../shared/printing'

// Thirsty plastic, as a printing close-up (D18, 17 Oct: "build all four as printing close-ups").
// "Leave it out" shows the spool sitting in the air, and a lens on its filament where water molecules drift in
// between the chains (how many follows sim.thirst). "Print it" cuts to the nozzle laying a line: wet filament
// throws small steam bubbles out of the fresh line, leaves its surface rough and strings off the nozzle as it
// moves away, while dry filament lays a smooth line; the lens there sits on the filament inside the nozzle,
// where the water flashes to steam as it reaches the hot zone. "Dry it" puts the spool in a dryer at
// print.dryC and the water drifts back out. Everything on screen is a function of the action and its
// progress p, so the frame at p = 1 is the frame left on screen. The line and nozzle tip are to scale; the
// number of water molecules is a teaching scale for the 1..5 thirst score.

type Action = 'soak' | 'print' | 'dry'
type Last = 'fresh' | 'soaked' | 'popped' | 'smooth' | 'dried'
type View = 'spool' | 'nozzle'

const MS: Record<Action, number> = { soak: 4500, print: 7000, dry: 4000 }
const LENS_R = 2.3

// The nozzle close-up (1 unit = 1/3 mm), as in Layer bonding.
const H = LAYER_H
const X0 = -3.6 // where the nozzle starts, and the line has got to
const X1 = 3.6 // where the line ends
const FAR = 16
const TRAVEL = 0.55 // share of the run spent laying the line
const LIFT_END = 0.62
const MOVE_END = 0.74
const HOP = 1.5
const AWAY = 1.0 // how far the nozzle moves off once it lifts
const NOZ_LENS: [number, number, number] = [0.6, -4.9, LINE_W / 2 + 1.3]

// The spool view (the zoom's own spool, 1 unit = 20 mm).
const SPOOL_LENS: [number, number, number] = [2.4, -4.9, 9]

const nozzleX = (p: number) => X0 + (X1 - X0) * clamp01(p / TRAVEL) + AWAY * smoothstep(LIFT_END, MOVE_END, p)
const nozzleLift = (p: number) => HOP * smoothstep(TRAVEL, LIFT_END, p)
const laidAt = (x: number) => (TRAVEL * (x - X0)) / (X1 - X0)
/** The radius of the nozzle's cone at height y above the hole. */
const coneR = (y: number) => NOZZLE_PARTS.tipRadius + ((NOZZLE_PARTS.coneTopRadius - NOZZLE_PARTS.tipRadius) * (y - NOZZLE_PARTS.tipTop)) / (NOZZLE_PARTS.coneTop - NOZZLE_PARTS.tipTop)

const waterCount = (m: Material) => 4 + 5 * m.sim.thirst
/** When a bubble on the line swells (once the nozzle has moved clear of it) and when it pops, as shares of the run after its spot was laid. */
const BUBBLE_START = 0.09
const BUBBLE_POP = 0.18
const bubbleCount = (m: Material) => 2 + 2 * m.sim.thirst

interface Drop {
  air: THREE.Vector3 // in the spool lens: out in the air
  inside: THREE.Vector3 // in the spool lens: between the chains
  noz: THREE.Vector3 // in the nozzle lens: where it starts, in the filament above the hot zone
  delay: number // 0..1, when this one moves within an action
  flashAt: number // p when it reaches the hot zone in the nozzle
  spin: THREE.Euler
  bubble: number // steam bubble radius
}

function inLens(r: () => number, yMin: number, yMax: number, edge = 0.45): THREE.Vector3 {
  for (;;) {
    const v = new THREE.Vector3((r() * 2 - 1) * LENS_R, yMin + r() * (yMax - yMin), 0.1 + r() * 0.3)
    if (Math.hypot(v.x, v.y) < LENS_R - edge) return v
  }
}

function planWater(m: Material): Drop[] {
  const r = rng(seedOf(m.id, 5))
  return Array.from({ length: waterCount(m) }, () => {
    const delay = r()
    return {
      air: inLens(r, 0.35, 2.0),
      inside: inLens(r, -1.95, -0.2),
      noz: inLens(r, 0.25, 2.0),
      delay,
      flashAt: 0.08 + 0.62 * delay,
      spin: new THREE.Euler(r() * 6.3, r() * 6.3, r() * 6.3),
      bubble: 0.16 + r() * 0.12,
    }
  })
}

interface LineBubble {
  x: number
  z: number // across the top of the line
  j: number // the section point it sits nearest
  r: number
}

function planBubbles(m: Material): LineBubble[] {
  const r = rng(seedOf(m.id, 9))
  const n = bubbleCount(m)
  return Array.from({ length: n }, (_, i) => {
    const x = X0 + 0.6 + ((X1 - X0 - 1.0) * (i + 0.2 + 0.6 * r())) / n
    const across = r() * 0.8 - 0.15 // mostly on the top, some toward the front
    return { x, z: (LINE_W / 2) * across, j: Math.round(SECTION_POINTS / 4 - across * 3), r: 0.18 + r() * 0.16 }
  })
}

function thirstWords(t: number): string {
  return ['barely any', 'a little', 'some', 'a lot of', 'loads of'][Math.max(0, Math.min(4, t - 1))]
}

function caption(m: Material): Text {
  const dry = m.print.dryC != null ? ` Drying ${m.short} at ${fmtC(m.print.dryC)} drives the water back out.` : ' Drying it drives the water back out.'
  return {
    simple: `Plastic soaks up water from the air, a bit like a sponge: ${m.short} scores ${m.sim.thirst} of 5 for thirst. The circles are sketches zoomed in on the chains: first in the filament on the spool, then in the filament inside the nozzle. There the water boils into steam all at once, so tiny bubbles pop out of the fresh line, the surface goes rough and the plastic strings as the nozzle moves away. Dry filament lays a smooth line. Orange shows heat, like a thermal camera.${dry}`,
    deeper: `Polar groups along the chain (oxygen and nitrogen atoms, as in esters and urethanes) attract water molecules, which slip into the gaps between chains. At ${rangeC(m.temps.nozzleC)} in the nozzle the water flashes to steam, giving pops, bubbles and stringing, and in some plastics it also cuts chains apart (hydrolysis), which leaves the print weaker. Printing does not dry the spool: only the filament that went through the nozzle lost its water.${m.print.dryC != null ? ` A filament dryer set to ${fmtC(m.print.dryC)} drives it back out.` : ''} The line and the nozzle's tip are to scale (0.45 mm by 0.2 mm, a 0.4 mm hole); the number of water molecules is drawn to show the thirst score, not counted.`,
  }
}

function ThirstSim({ material: m }: SimProps) {
  const reduced = useReducedMotion()
  const timeline = useTimeline(reduced)
  const [wet, setWet] = useState(false)
  const [action, setAction] = useState<Action | null>(null)
  const [p, setP] = useState(0)
  const [last, setLast] = useState<Last>('fresh')
  // Whether the line on screen was printed from wet filament (it stays on screen after the print).
  const [printedWet, setPrintedWet] = useState(false)
  const lensLabels = useLensLabels()
  const [stageRef, size] = useElementSize<HTMLDivElement>()
  // A phone: the experiments row covers the bottom of the stage, and the lens labels get short.
  const narrow = size.width > 0 && size.width < 600

  const start = (a: Action) => {
    if (timeline.running) return
    const wasWet = wet
    setAction(a)
    setP(0)
    if (a === 'print') setPrintedWet(wasWet)
    timeline.run(MS[a], setP, () => {
      // The last frame of a run and what it leaves behind land in the same render, so nothing moves when it ends.
      setAction(null)
      if (a === 'soak') {
        setWet(true)
        setLast('soaked')
      } else if (a === 'print') {
        setLast(wasWet ? 'popped' : 'smooth')
      } else {
        setWet(false)
        setLast('dried')
      }
    })
  }

  // The scene on screen: the spool unless a print is running or was the last thing done.
  const view: View = action === 'print' || (!action && (last === 'popped' || last === 'smooth')) ? 'nozzle' : 'spool'
  // A finished action stays at its end frame.
  const shown: Action | null = action ?? ({ soaked: 'soak', popped: 'print', smooth: 'print', dried: 'dry', fresh: null } as const)[last]
  const q = action ? p : shown ? 1 : 0

  let readout: string
  if (action === 'soak') readout = 'Left out: water molecules drifting in from the air'
  else if (action === 'print') {
    if (p < TRAVEL) readout = wet ? `Printing wet ${m.short}: the water flashes to steam in the nozzle` : `Printing dry ${m.short}: it melts smoothly`
    else readout = wet ? 'Moving off: the wet plastic oozes and strings' : 'Moving off: a clean break, no strings'
  } else if (action === 'dry') readout = `Drying${m.print.dryC != null ? ` at ${fmtC(m.print.dryC)}` : ''}: the water drifts back out`
  else
    readout = {
      fresh: `Fresh from a sealed bag: no water in it yet (${m.short} thirst ${m.sim.thirst} of 5)`,
      soaked: `Left out: ${thirstWords(m.sim.thirst)} water soaked in between the chains`,
      popped: 'Pop. Steam bubbles left a rough line and strings, and the spool is still wet',
      smooth: 'Smooth: no water to boil, so it prints clean',
      dried: 'Dry again: ready to print',
    }[last]

  const labels = view === 'nozzle' ? (narrow ? NOZZLE_LABELS_SHORT : NOZZLE_LABELS) : narrow ? SPOOL_LABELS_SHORT : SPOOL_LABELS

  const where =
    view === 'nozzle'
      ? null
      : action === 'dry' || last === 'dried'
        ? `In a filament dryer${m.print.dryC != null ? ` at ${fmtC(m.print.dryC)}` : ''}`
        : wet || action === 'soak'
          ? 'Left out in the air'
          : 'Just out of its sealed bag'

  return (
    <SimFrame
      stageRef={stageRef}
      stage={
        <div className={narrow ? 'absolute inset-x-0 top-0 bottom-16' : 'absolute inset-0'}>
        <SimCanvas
          fitBox={view === 'nozzle' ? [6.4, 5.9, 1.4] : [6.4, 11.2, 3]}
          viewFrom={view === 'nozzle' ? [0.12, 0.2, 1] : [0.35, 0.3, 1]}
          target={view === 'nozzle' ? [0.6, -2.3, 0] : [0, -3.1, 0]}
          orbit={false}
          label={view === 'nozzle' ? `Close-up of a nozzle printing a line of ${m.short}, with a sketch of the filament inside the nozzle` : `A spool of ${m.short}, with a sketch of the chains in its filament`}
        >
          {view === 'spool' ? <SpoolView m={m} action={shown} q={q} wet={wet} labels={labels} lensLabels={lensLabels} /> : <NozzleView m={m} q={q} wet={printedWet} labels={labels} lensLabels={lensLabels} />}
        </SimCanvas>
        </div>
      }
      overlay={
        <>
          {/* Only the lens on screen has labels; the other view's lens is not mounted to place (or hide) its own. */}
          <LensLabelOverlay key={`${view}${narrow}`} labels={labels} handle={lensLabels} />
          {where && <div className="absolute top-3 left-3 rounded-full border border-line bg-surface/85 px-3 py-1 text-sm font-semibold">{where}</div>}
        </>
      }
      controls={
        <Row>
          <ActionButton action="soak" icon={Droplets} label="Leave it out" onClick={() => start('soak')} disabled={timeline.running || wet} primary={!wet} accent={m.accent} />
          <ActionButton action="print" icon={Flame} label="Print it" onClick={() => start('print')} disabled={timeline.running} primary={wet} accent={m.accent} />
          <ActionButton
            action="dry"
            icon={Wind}
            label={m.print.dryC != null ? `Dry it at ${fmtC(m.print.dryC)}` : 'Dry it'}
            onClick={() => start('dry')}
            disabled={timeline.running || !wet}
          />
        </Row>
      }
      readout={readout}
      caption={caption(m)}
    />
  )
}

// ---------------------------------------------------------------- the spool

function SpoolView({ m, action, q, wet, labels, lensLabels }: { m: Material; action: Action | null; q: number; wet: boolean; labels: LensLabel[]; lensLabels: LensLabels }) {
  const drops = useMemo(() => planWater(m), [m])
  const chains = useMemo(() => filamentChains(m, 21), [m])
  return (
    <group>
      <SpoolScene material={m} />
      <ChainLens
        centre={SPOOL_LENS}
        radius={LENS_R}
        target={[0, 0, SPOOL_WIND_R + 0.05]}
        ringRadius={0.32}
        split={{ top: { colour: '#8BB8FF', opacity: 0.1 }, bottom: { colour: m.accent, opacity: 0.12 }, line: true }}
        labels={labels}
        handle={lensLabels}
      >
        {chains.map((pts, i) => (
          <LensChain key={i} points={pts} color={mix(m.accent, '#0B1020', 0.15)} />
        ))}
        <Water drops={drops} place={(d) => spoolDrop(d, action, q, wet)} />
      </ChainLens>
    </group>
  )
}

/** Where water molecule d is in the spool lens (scale 0 hides it), and its turn. */
function spoolDrop(d: Drop, action: Action | null, q: number, wet: boolean): { pos: THREE.Vector3; scale: number; turn: number } {
  const move = easeInOut(clamp01((q - d.delay * 0.45) / 0.55))
  if (action === 'soak') return { pos: d.air.clone().lerp(d.inside, move), scale: clamp01(q * 4 - d.delay), turn: 2 * q }
  if (action === 'dry') return { pos: d.inside.clone().lerp(d.air, move), scale: 1 - clamp01((move - 0.6) / 0.4), turn: 2 + 2 * q }
  return { pos: d.inside, scale: wet ? 1 : 0, turn: 2 }
}

/** Calm chains in the bottom half of a lens (the filament), the top half left for air or the hot zone. */
function filamentChains(m: Material, salt: number): THREE.Vector3[][] {
  const r = rng(seedOf(m.id, salt))
  return Array.from({ length: 5 }, (_, i) => bandChain(r, i, { count: 5, side: -1, radius: LENS_R, inner: 0.25, depth: 1.8 }))
}

// ---------------------------------------------------------------- the nozzle

function NozzleView({ m, q, wet, labels, lensLabels }: { m: Material; q: number; wet: boolean; labels: LensLabel[]; lensLabels: LensLabels }) {
  const drops = useMemo(() => planWater(m), [m])
  const bubbles = useMemo(() => planBubbles(m), [m])
  const chains = useMemo(() => {
    const r = rng(seedOf(m.id, 23))
    return [
      ...Array.from({ length: 4 }, (_, i) => bandChain(r, i, { count: 4, side: 1, radius: LENS_R, inner: 0.3, depth: 1.5 })),
      ...Array.from({ length: 4 }, (_, i) => bandChain(r, i, { count: 4, side: -1, radius: LENS_R, inner: 0.3, depth: 1.5 })),
    ]
  }, [m])
  const xn = nozzleX(q)
  const lift = nozzleLift(q)
  const printing = q > 0 && q < TRAVEL
  const tip = Math.min(X1, nozzleX(q)) + 0.35
  const settle = 1 - smoothstep(0.8, 1, q)
  const heatAt = (x: number) => (x > tip ? 0 : 0.9 * Math.exp(-Math.max(0, q - laidAt(x)) / 0.08) * settle)
  const end = Math.min(X1, xn) + 0.3
  const popped = (b: LineBubble) => wet && q >= laidAt(b.x) + BUBBLE_POP
  const bump = wet
    ? (x: number, j: number) => {
        if (x > tip) return 0
        let out = 0.035 * (Math.sin(x * 13.1 + j * 1.7) + 0.6 * Math.sin(x * 31.7 + j * 2.9))
        for (const b of bubbles) {
          if (!popped(b)) continue
          const dj = Math.min(Math.abs(j - b.j), SECTION_POINTS - Math.abs(j - b.j))
          out -= 0.14 * Math.exp(-(((x - b.x) / 0.16) ** 2) - (dj / 1.4) ** 2)
        }
        return out
      }
    : undefined
  // The hot zone stays hot: the nozzle holds its temperature whether or not it is laying plastic.
  const hot = 1
  const coneY = 1.3
  return (
    <group>
      <LayerStack layers={4} from={-FAR} to={FAR} colour={(k) => mix(m.accent, '#0B1020', 0.2 + 0.09 * k)} />
      <Bead from={-FAR} to={end} body={160} colour={mix(m.accent, '#0B1020', 0.12)} roughness={wet ? 0.7 : 0.35} heatAt={heatAt} bump={bump} position={[0, H / 2, 0]} />
      {wet && <LineBubbles bubbles={bubbles} q={q} />}
      {wet && q > TRAVEL && <Strings m={m} q={q} />}
      <Nozzle position={[xn, H + 0.02 + lift, 0]} melt={printing ? 0.9 : undefined} />
      <ChainLens
        centre={NOZ_LENS}
        radius={LENS_R}
        target={[xn, H + 0.02 + lift + coneY, coneR(coneY) + 0.35]}
        ringRadius={0.32}
        split={{ top: { colour: m.accent, opacity: 0.12 }, bottom: { colour: HOT, opacity: 0.22 * hot }, line: true }}
        labels={labels}
        handle={lensLabels}
      >
        {chains.map((pts, i) => {
          const low = i >= 4
          return <LensChain key={i} points={shake(pts, low ? 0.04 * hot : 0.01, q * 7, i)} color={low ? mix(m.accent, '#FFB27A', 0.35 * hot) : m.accent} emissive={HOT} emissiveIntensity={low ? 0.55 * hot : 0} />
        })}
        {wet && <Water drops={drops} place={(d) => nozzleDrop(d, q)} />}
        {wet && <Steam drops={drops} q={q} />}
      </ChainLens>
    </group>
  )
}

/** In the nozzle lens: each water molecule rides the filament down to the hot zone, then becomes steam. */
function nozzleDrop(d: Drop, q: number): { pos: THREE.Vector3; scale: number; turn: number } {
  const t = clamp01(q / d.flashAt)
  const pos = new THREE.Vector3(d.noz.x, d.noz.y + (-0.2 - d.noz.y) * t, d.noz.z)
  return { pos, scale: q < d.flashAt ? 1 : 0, turn: 3 * q }
}

/** Steam bubbles in the lens: each swells where its water molecule reached the hot zone, then pops. */
function Steam({ drops, q }: { drops: Drop[]; q: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const mtx = new THREE.Matrix4()
    drops.forEach((d, i) => {
      const age = (q - d.flashAt) / 0.09
      const r = age >= 0 && age < 1 ? d.bubble * (0.4 + 0.6 * easeInOut(age)) : 0
      mtx.makeScale(r, r, r).setPosition(d.noz.x, -0.2 - 0.5 * clamp01(age), d.noz.z + 0.2)
      mesh.setMatrixAt(i, mtx)
    })
    mesh.instanceMatrix.needsUpdate = true
    invalidate()
  }, [drops, q, invalidate])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, drops.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 20, 14]} />
      <meshStandardMaterial color="#F4F8FF" emissive="#FFFFFF" emissiveIntensity={0.25} roughness={0.1} transparent opacity={0.82} depthWrite={false} />
    </instancedMesh>
  )
}

/** Steam bubbles bursting out of the fresh line just behind the nozzle; each swells, then pops and leaves a pit. */
function LineBubbles({ bubbles, q }: { bubbles: LineBubble[]; q: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const mtx = new THREE.Matrix4()
    bubbles.forEach((b, i) => {
      const age = (q - laidAt(b.x) - BUBBLE_START) / (BUBBLE_POP - BUBBLE_START)
      const r = age >= 0 && age < 1 ? b.r * (0.3 + 0.7 * easeInOut(age)) : 0
      mtx.makeScale(r, r, r).setPosition(b.x, H * 1.05 + r * 0.55, b.z)
      mesh.setMatrixAt(i, mtx)
    })
    mesh.instanceMatrix.needsUpdate = true
    invalidate()
  }, [bubbles, q, invalidate])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, bubbles.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 20, 14]} />
      <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.2} roughness={0.1} transparent opacity={0.78} depthWrite={false} />
    </instancedMesh>
  )
}

/** Wet plastic oozing as the nozzle lifts and moves away: thin strings from the line to the tip. */
function Strings({ m, q }: { m: Material; q: number }) {
  const tipX = nozzleX(q)
  const tipY = H + 0.02 + nozzleLift(q)
  const colour = mix(m.accent, '#FFFFFF', 0.25)
  const string = (fromX: number, sag: number) => {
    const a = new THREE.Vector3(fromX, H * 1.1, 0.1)
    const b = new THREE.Vector3(tipX, tipY, 0)
    const mid = a.clone().lerp(b, 0.5)
    mid.y -= sag
    return [a, a.clone().lerp(mid, 0.5), mid, mid.clone().lerp(b, 0.5), b]
  }
  return (
    <>
      <Tube points={string(X1 - 0.1, 0.25)} radius={0.04} color={colour} samples={24} radial={6} />
      <Tube points={string(X1 - 0.9, 0.5)} radius={0.022} color={colour} samples={24} radial={6} />
    </>
  )
}

// ---------------------------------------------------------------- water molecules

type Place = (d: Drop) => { pos: THREE.Vector3; scale: number; turn: number }

/** Water molecules in a lens: an oxygen and two hydrogens about 104.5 degrees apart. */
function Water({ drops, place }: { drops: Drop[]; place: Place }) {
  const oRef = useRef<THREE.InstancedMesh>(null)
  const hRef = useRef<THREE.InstancedMesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  const n = drops.length
  // Recomputed on every render the lens draws (the place function is new each time); no loop of its own.
  useLayoutEffect(() => {
    const o = oRef.current
    const h = hRef.current
    if (!o || !h) return
    const mtx = new THREE.Matrix4()
    const quat = new THREE.Quaternion()
    const e = new THREE.Euler()
    const one = new THREE.Vector3()
    const half = THREE.MathUtils.degToRad(104.5 / 2)
    const offsets = [new THREE.Vector3(Math.sin(half), Math.cos(half), 0), new THREE.Vector3(-Math.sin(half), Math.cos(half), 0)].map((v) => v.multiplyScalar(0.15))
    drops.forEach((d, i) => {
      const { pos, scale, turn } = place(d)
      e.set(d.spin.x + turn * 1.3, d.spin.y + turn * 0.9, d.spin.z)
      quat.setFromEuler(e)
      one.setScalar(scale)
      mtx.compose(pos, quat, one)
      o.setMatrixAt(i, mtx)
      offsets.forEach((off, k) => {
        const at = off.clone().multiplyScalar(scale).applyQuaternion(quat).add(pos)
        mtx.compose(at, quat, one)
        h.setMatrixAt(i * 2 + k, mtx)
      })
    })
    o.instanceMatrix.needsUpdate = true
    h.instanceMatrix.needsUpdate = true
    invalidate()
  })
  return (
    <group>
      <instancedMesh ref={oRef} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[0.11, 16, 12]} />
        <meshStandardMaterial color={WATER_O} roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={hRef} args={[undefined, undefined, n * 2]} frustumCulled={false}>
        <sphereGeometry args={[0.065, 12, 10]} />
        <meshStandardMaterial color={WATER_H} roughness={0.35} />
      </instancedMesh>
    </group>
  )
}

const SPOOL_LABELS: LensLabel[] = [
  { id: 's-air', text: 'air', colour: '#A3AECB', at: [LENS_R + 0.3, 0.8], align: 'left' },
  { id: 's-fil', text: 'filament', colour: '#E8ECF7', at: [LENS_R + 0.3, -0.8], align: 'left' },
  { id: 's-sketch', text: 'Sketch: water between the chains, not to scale', colour: '#A3AECB', at: [0, -LENS_R - 0.2], align: 'below' },
]
const NOZZLE_LABELS: LensLabel[] = [
  { id: 'n-fil', text: 'filament in the nozzle', colour: '#E8ECF7', at: [LENS_R + 0.3, 0.8], align: 'left' },
  { id: 'n-hot', text: 'hot zone', colour: '#FFB27A', at: [LENS_R + 0.3, -0.8], align: 'left' },
  { id: 'n-sketch', text: 'Sketch: inside the nozzle, not to scale', colour: '#A3AECB', at: [0, -LENS_R - 0.2], align: 'below' },
]
const SPOOL_LABELS_SHORT: LensLabel[] = [...SPOOL_LABELS.slice(0, 2), { ...SPOOL_LABELS[2], text: 'Sketch, not to scale' }]
const NOZZLE_LABELS_SHORT: LensLabel[] = [{ ...NOZZLE_LABELS[0], text: 'filament' }, NOZZLE_LABELS[1], { ...NOZZLE_LABELS[2], text: 'Sketch, not to scale' }]

export default ThirstSim

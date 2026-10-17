import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Layers, RotateCcw, Square } from 'lucide-react'
import { rng } from '../../three/chains'
import type { Material, Text } from '../../types/chem'
import type { SimProps } from '../types'
import { SimCanvas } from '../shared/SimCanvas'
import { Tube } from '../shared/Tube'
import { HOT, fmtC, mix, rangeC, seedOf } from '../shared/material'
import { clamp01, easeInOut, smoothstep, useMotionClock, useReducedMotion, useTimeline } from '../shared/motion'
import { shake } from '../shared/tangle'
import { ActionButton, Meter, RangeSlider, Row, SimFrame } from '../shared/ui'

// Layer bonding: a hot new layer lands on the one below. While it is hot, chains wriggle across the
// join; the hotter the new layer (slider, scaled across the material's nozzle range), the deeper they
// reach before it freezes, and the fuller the bond meter. Depths are a visual scale, not a measurement.

const CHAINS = 7
const THICK = 0.8 // each layer's thickness (scene units)
const HALF_W = 2.7
const RUN_MS = 5000

interface ChainPlan {
  base: THREE.Vector3[]
  anchor: number // the control point nearest the join; it leads the wriggle
  reach: number // 0.5..1.2: some chains reach further than others
}

function planLayer(seed: number, centreY: number, upper: boolean): ChainPlan[] {
  const r = rng(seed)
  return Array.from({ length: CHAINS }, () => {
    const n = 12
    const base: THREE.Vector3[] = []
    let y = (r() - 0.5) * 0.4
    let z = (r() - 0.5) * 1.4
    for (let k = 0; k < n; k++) {
      const x = -HALF_W - 0.1 + ((2 * HALF_W + 0.2) * k) / (n - 1) + (r() - 0.5) * 0.25
      y = Math.max(-0.3, Math.min(0.3, y + (r() - 0.5) * 0.3))
      z = Math.max(-0.8, Math.min(0.8, z + (r() - 0.5) * 0.45))
      base.push(new THREE.Vector3(x, centreY + y, z))
    }
    // The point closest to the join (upper layer: lowest; lower layer: highest), away from the ends.
    let anchor = 2
    for (let k = 2; k < n - 2; k++) {
      if (upper ? base[k].y < base[anchor].y : base[k].y > base[anchor].y) anchor = k
    }
    return { base, anchor, reach: 0.5 + r() * 0.7 }
  })
}

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

const wriggleAt = (p: number) => smoothstep(0.18, 0.85, p)

/** Vertical push on control point k of a chain, toward the other layer. */
function pushed(c: ChainPlan, depth: number, dir: 1 | -1): THREE.Vector3[] {
  return c.base.map((pt, k) => {
    const d = k - c.anchor
    const w = Math.exp(-(d * d) / 2.2)
    return new THREE.Vector3(pt.x, pt.y + dir * depth * c.reach * w, pt.z)
  })
}

function crossings(upper: ChainPlan[], depth: number): number {
  return upper.filter((c) => c.base[c.anchor].y - depth * c.reach < -0.05).length
}

function bondWord(v: number): string {
  if (v < 0.35) return 'weak, it could split along this line'
  if (v < 0.62) return 'fair'
  return 'strong'
}

function caption(m: Material): Text {
  return {
    simple: `A fresh layer of hot ${m.short} lands on the one below. While it is still hot, its chains wriggle across the join and tangle with the chains underneath. Hotter means more wriggling before it freezes, so the layers grip better. Too cool and the join stays weak, which is where prints split.`,
    deeper: `Layer adhesion comes from interdiffusion: chain ends reptate across the interface and entangle, but only while the join is above the glass transition (${fmtC(m.temps.tgC)} for ${m.short}). Nozzle temperature (${rangeC(m.temps.nozzleC)}), cooling fan speed and print speed all set how long the weld stays hot, so they set how strong the layers stick.`,
  }
}

function LayerSim({ material: m }: SimProps) {
  const reduced = useReducedMotion()
  const [lo, hi] = sliderRange(m)
  const [temp, setTemp] = useState(() => Math.round((m.temps.nozzleC[0] + m.temps.nozzleC[1]) / 2))
  const [p, setP] = useState(0)
  const timeline = useTimeline(reduced)
  const clock = useMotionClock(reduced, timeline.running)

  const seed = seedOf(m.id, 3)
  const upper = useMemo(() => planLayer(seed, THICK / 2 + 0.02, true), [seed])
  const lower = useMemo(() => planLayer(seed + 1, -THICK / 2 - 0.02, false), [seed])

  const strength = strengthAt(m, temp)
  const wriggle = wriggleAt(p)
  const depth = 0.95 * strength * wriggle
  const bond = strength * wriggle

  const play = () => {
    if (timeline.running) return timeline.cancel()
    timeline.run(RUN_MS, setP)
  }

  let readout: string
  if (p === 0) readout = `Ready to lay a new layer at ${fmtC(temp)}`
  else if (p < 1) readout = `New layer at ${fmtC(temp)}: chains wriggling across the join`
  else readout = `${fmtC(temp)}: ${crossings(upper, depth)} of ${CHAINS} chains reached across the join, bond ${bondWord(bond)}`

  return (
    <SimFrame
      stage={
        <SimCanvas fitBox={[3.0, 1.5, 1]} viewFrom={[0.2, 0.18, 1]} target={[0, 0.3, 0]} label={`Two layers of ${m.short} bonding at ${fmtC(temp)}`}>
          <LayerScene m={m} p={p} time={clock.time + p * 10} upper={upper} lower={lower} depth={depth} strength={strength} />
        </SimCanvas>
      }
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
                if (timeline.running) timeline.cancel()
                setTemp(v)
                if (p > 0) setP(1)
                clock.kick()
              }}
            />
            <Row className="shrink-0">
              <ActionButton
                action="play"
                icon={timeline.running ? Square : p >= 1 ? RotateCcw : Layers}
                label={timeline.running ? 'Stop' : p >= 1 ? 'Lay it again' : 'Lay a layer'}
                onClick={play}
                primary
                accent={m.accent}
              />
            </Row>
          </div>
          <Meter label="Bond between layers" value={bond} accent={m.accent} word={p === 0 ? 'not joined yet' : bondWord(bond).split(',')[0]} />
        </div>
      }
      readout={readout}
      caption={caption(m)}
    />
  )
}

function LayerScene(props: { m: Material; p: number; time: number; upper: ChainPlan[]; lower: ChainPlan[]; depth: number; strength: number }) {
  const { m, p, time, upper, lower, depth, strength } = props
  const drop = (1 - easeInOut(clamp01(p / 0.18))) * 1.5
  const hot = p === 0 ? 1 : 1 - 0.9 * smoothstep(0.2, 1, p)
  const amp = (0.025 + 0.06 * strength) * hot * (p === 0 ? 0 : 1)
  const lowerColour = mix(m.accent, '#0B1020', 0.5)
  return (
    <group>
      <group position={[0, drop, 0]}>
        {upper.map((c, i) => (
          <Tube key={`u${i}`} points={shake(pushed(c, depth, -1), amp, time, i)} color={mix(mix(m.accent, '#FFFFFF', 0.2), HOT, hot * 0.75)} emissive={HOT} emissiveIntensity={hot * 0.45} radius={0.075} samples={56} />
        ))}
        <Slab y={THICK / 2 + 0.02} colour={m.accent} />
      </group>
      {lower.map((c, i) => (
        <Tube key={`l${i}`} points={shake(pushed(c, depth * 0.55, 1), amp * 0.6, time, 20 + i)} color={lowerColour} radius={0.075} samples={56} />
      ))}
      <Slab y={-THICK / 2 - 0.02} colour={lowerColour} />
      {/* the join */}
      <mesh position={[0, 0, 1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 2 * HALF_W + 0.4, 6]} />
        <meshBasicMaterial color="#8B9CFF" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2 * HALF_W + 0.4, 2]} />
        <meshBasicMaterial color="#8B9CFF" transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** A faint box around a layer so it reads as one printed line of plastic. */
function Slab({ y, colour }: { y: number; colour: string }) {
  return (
    <mesh position={[0, y, 0]}>
      <boxGeometry args={[2 * HALF_W + 0.4, THICK, 2]} />
      <meshStandardMaterial color={colour} transparent opacity={0.08} depthWrite={false} />
    </mesh>
  )
}

export default LayerSim

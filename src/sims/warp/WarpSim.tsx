import { useLayoutEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { Box, Play, RotateCcw, Square } from 'lucide-react'
import { rng } from '../../three/chains'
import type { Material, Text } from '../../types/chem'
import type { SimProps } from '../types'
import { SimCanvas } from '../shared/SimCanvas'
import { Tube } from '../shared/Tube'
import { HOT, enclosureWords, mix, rangeC, seedOf } from '../shared/material'
import { clamp01, useReducedMotion, useTimeline } from '../shared/motion'
import { shake } from '../shared/tangle'
import { ActionButton, MaterialTag, Row, SimFrame, Toggle } from '../shared/ui'
import { isStacked, useElementSize } from '../shared/layout'

// Cool and warp: a small part prints layer by layer on the bed and cools. Cooling chains pack
// tighter, so each layer shrinks; the upper layers shrink after the lower ones have set, which pulls
// the corners up. How much is driven by sim.shrink; the enclosure slows the cooling and evens it out.
// Every size here is a visual scale for the 1..5 shrink score, not a measurement.

const LAYERS = 6
const W = 3.0 // part width (scene units)
const D = 1.8
const H = 0.16 // layer height
const BED: [number, number] = [4.4, 2.9]

interface Run {
  p: number // 0 = nothing printed, 1 = printed and cooled
  enclosure: boolean
}

const layerStart = (k: number) => 0.06 + (0.5 * k) / LAYERS
const tau = (enclosure: boolean) => (enclosure ? 0.2 : 0.07)

/** 0 = cold, 1 = just extruded; null = not printed yet. */
function layerHeat(k: number, run: Run): number | null {
  const s = layerStart(k)
  if (run.p < s) return null
  return Math.exp(-(run.p - s) / tau(run.enclosure))
}

/** How far the corners lift (scene units) once fully cooled. */
function maxLift(m: Material, enclosure: boolean): number {
  const k = clamp01((m.sim.shrink - 1) / 4)
  return 0.36 * Math.pow(k, 1.3) * (enclosure ? 0.28 : 1)
}

function liftAt(m: Material, run: Run): number {
  let cooled = 0
  for (let k = 0; k < LAYERS; k++) {
    const h = layerHeat(k, run)
    if (h != null) cooled += 1 - h
  }
  return maxLift(m, run.enclosure) * (cooled / LAYERS)
}

function verdict(m: Material, enclosure: boolean): string {
  const lift = maxLift(m, enclosure)
  if (lift >= 0.15) return 'corners curled up off the bed'
  if (lift >= 0.045) return 'corners lifted a little'
  return 'stayed flat on the bed'
}

function caption(m: Material, c?: Material): Text {
  const pair = c ? ` Watch ${m.short} beside ${c.short} (shrink ${c.sim.shrink} of 5).` : ''
  return {
    simple: `Hot plastic takes up more room. As each layer cools, its chains stop jiggling and pack closer together, so the layer shrinks. The top layers shrink after the bottom ones have already set, so they pull the corners up. ${m.short} scores ${m.sim.shrink} of 5 for shrinking.${pair} An enclosure keeps the air warm, so the part cools slowly and evenly and the corners stay down.`,
    deeper: `This is thermal contraction plus uneven cooling: each new layer shrinks on top of a layer that has already set, which builds stress between them. Once that stress beats the grip of the bed (${rangeC(m.temps.bedC)} for ${m.short}), the corners lift. ${m.short} ${enclosureWords[m.print.enclosure]}${c ? `; ${c.short} ${enclosureWords[c.print.enclosure]}` : ''}.`,
  }
}

function WarpSim({ material: m, compareWith: c }: SimProps) {
  const reduced = useReducedMotion()
  const [run, setRun] = useState<Run>({ p: 0, enclosure: false })
  const timeline = useTimeline(reduced)
  const [stageRef, size] = useElementSize<HTMLDivElement>()
  const stacked = isStacked(size)
  const list = c ? [m, c] : [m]

  const play = () => {
    if (timeline.running) return timeline.cancel()
    const enclosure = run.enclosure
    timeline.run(enclosure ? 9500 : 7000, (p) => setRun({ p, enclosure }))
  }

  let readout: string
  if (run.p === 0) readout = c ? `Ready to print two small parts: one in ${m.short}, one in ${c.short}` : `Ready to print a small part in ${m.short}`
  else if (run.p < 1) {
    const printing = Array.from({ length: LAYERS }, (_, k) => k).filter((k) => run.p >= layerStart(k)).length
    readout = `Layer ${printing} of ${LAYERS}, cooling ${run.enclosure ? 'slowly in the warm enclosure' : 'fast in the open air'}`
  } else readout = list.map((x) => `${x.short}: ${verdict(x, run.enclosure)}`).join(' · ')

  const spots = !c ? [[0, 0, 0]] : stacked ? [[0, 0, -1.9], [0, 0, 1.9]] : [[-2.45, 0, 0], [2.45, 0, 0]]

  return (
    <SimFrame
      stageRef={stageRef}
      stage={
        <SimCanvas fitBox={!c ? [2.7, 1.9, 2.5] : stacked ? [3.2, 3.4, 2.5] : [5.1, 1.9, 2.5]} viewFrom={stacked && c ? [0.12, 1.1, 1] : [0.18, 0.62, 1]} target={[0, 0.45, 0]} label={`Printed parts in ${list.map((x) => x.short).join(' and ')} cooling on the print bed`}>
          {list.map((x, i) => (
            <group key={x.id} position={spots[i] as [number, number, number]}>
              <Rig m={x} run={run} bubbleBeside={stacked && !!c} />
            </group>
          ))}
        </SimCanvas>
      }
      overlay={
        c &&
        list.map((x, i) => (
          <MaterialTag
            key={x.id}
            material={x}
            note={`shrink ${x.sim.shrink} of 5`}
            style={stacked ? (i === 0 ? { left: 12, top: 12 } : { left: 12, bottom: 12 }) : { top: 12, left: i === 0 ? '12px' : 'calc(50% + 12px)' }}
          />
        ))
      }
      controls={
        <Row>
          <ActionButton
            action="play"
            icon={timeline.running ? Square : run.p >= 1 ? RotateCcw : Play}
            label={timeline.running ? 'Stop' : run.p >= 1 ? 'Print again' : 'Print and cool'}
            labels={['Stop', 'Print again', 'Print and cool']}
            onClick={play}
            primary
            accent={m.accent}
          />
          <Toggle icon={Box} label="Enclosure" checked={run.enclosure} disabled={timeline.running} onChange={(enclosure) => setRun((r) => ({ ...r, enclosure }))} />
        </Row>
      }
      readout={readout}
      caption={caption(m, c)}
    />
  )
}

function Rig({ m, run, bubbleBeside }: { m: Material; run: Run; bubbleBeside: boolean }) {
  const lift = liftAt(m, run)
  const heats = Array.from({ length: LAYERS }, (_, k) => layerHeat(k, run))
  const warm = heats.filter((h): h is number => h != null)
  const meanHeat = warm.length ? warm.reduce((a, b) => a + b, 0) / warm.length : 1
  const shrinkScale = 0.014 * m.sim.shrink // visual: up to 7% across at shrink 5
  return (
    <group>
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[BED[0], 0.12, BED[1]]} />
        <meshStandardMaterial color="#3A4670" roughness={0.55} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BED[0] - 0.2, BED[1] - 0.2]} />
        <meshStandardMaterial color="#4A5784" roughness={0.35} metalness={0.25} />
      </mesh>
      {heats.map((h, k) =>
        h == null ? null : <Layer key={k} k={k} heat={h} accent={m.accent} shrink={shrinkScale * (1 - h)} lift={lift} />,
      )}
      {run.p > 0 && <PackingBubble m={m} heat={meanHeat} shrink={shrinkScale * (1 - meanHeat)} beside={bubbleBeside} />}
      {run.enclosure && <Enclosure />}
    </group>
  )
}

/** One printed layer: a box whose vertices shrink toward the centre and lift at the corners. */
function Layer({ k, heat, accent, shrink, lift }: { k: number; heat: number; accent: string; shrink: number; lift: number }) {
  const invalidate = useThree((s) => s.invalidate)
  const { geom, base } = useMemo(() => {
    const g = new THREE.BoxGeometry(W, H, D, 18, 1, 10)
    return { geom: g, base: Float32Array.from(g.getAttribute('position').array) }
  }, [])
  useLayoutEffect(() => () => geom.dispose(), [geom])

  useLayoutEffect(() => {
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    const s = 1 - shrink
    const y0 = H / 2 + k * H
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]
      const y = base[i * 3 + 1]
      const z = base[i * 3 + 2]
      const u = x / (W / 2)
      const v = z / (D / 2)
      // A smooth bowl: corners lift most, the short ends a little, the middle stays down.
      const u2 = u * u
      pos.setXYZ(i, x * s, y + y0 + lift * (0.6 * u2 * v * v + 0.4 * u2 * u2), z * s)
    }
    pos.needsUpdate = true
    geom.computeVertexNormals()
    invalidate()
  }, [geom, base, k, shrink, lift, invalidate])

  return (
    <mesh geometry={geom}>
      <meshStandardMaterial color={mix(k % 2 ? mix(accent, '#0B1020', 0.14) : accent, HOT, heat)} emissive={HOT} emissiveIntensity={heat * 0.7} roughness={0.5} />
    </mesh>
  )
}

/** A zoomed-in circle above the part: a few chains, jiggling while hot, packing tighter as they cool. */
function PackingBubble({ m, heat, shrink, beside }: { m: Material; heat: number; shrink: number; beside: boolean }) {
  const chains = useMemo(() => {
    const r = rng(seedOf(m.id, 7))
    return Array.from({ length: 5 }, (_, i) => {
      const pts: THREE.Vector3[] = []
      let x = -0.62
      let y = (i - 2) * 0.24 + (r() - 0.5) * 0.1
      for (let k = 0; k < 9; k++) {
        pts.push(new THREE.Vector3(x, y, (r() - 0.5) * 0.08))
        x += 0.155
        y += (r() - 0.5) * 0.22
        y = Math.max(-0.6, Math.min(0.6, y))
      }
      return pts
    })
  }, [m.id])
  // Packing: the chains draw together as they cool. Exaggerated (x5) so the 1..5 shrink score reads.
  const pack = 1 - shrink * 5
  const time = heat * 6 // a frozen snapshot of the jiggle, bigger while hot
  return (
    <Billboard position={beside ? [W / 2 + 0.75, 0.9, 0] : [W / 2 - 0.1, 1.55, -D / 2]} scale={beside ? 0.75 : 1}>
      <mesh>
        <circleGeometry args={[0.85, 48]} />
        <meshBasicMaterial color="#0B1020" transparent opacity={0.92} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.85, 0.9, 64]} />
        <meshBasicMaterial color="#8B9CFF" />
      </mesh>
      <group scale={[pack, pack, 1]} position={[0, 0, 0.05]}>
        {chains.map((pts, i) => (
          <Tube key={i} points={shake(pts, 0.07 * heat, time, i + 3)} color={m.accent} emissive={HOT} emissiveIntensity={heat * 0.6} radius={0.035} samples={32} radial={6} />
        ))}
      </group>
    </Billboard>
  )
}

function Enclosure() {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(BED[0] + 0.3, 2.0, BED[1] + 0.3)), [])
  return (
    <group position={[0, 0.95, 0]}>
      <mesh>
        <boxGeometry args={[BED[0] + 0.3, 2.0, BED[1] + 0.3]} />
        <meshStandardMaterial color="#8B9CFF" transparent opacity={0.07} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#8B9CFF" transparent opacity={0.6} />
      </lineSegments>
    </group>
  )
}

export default WarpSim

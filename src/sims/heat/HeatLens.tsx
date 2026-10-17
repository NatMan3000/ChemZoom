import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { rng } from '../../three/chains'
import type { Material } from '../../types/chem'
import { HOT, mix, patchesOf, seedOf, type Patches } from '../shared/material'
import { lerp } from '../shared/motion'
import { shake } from '../shared/tangle'
import { LensChain } from '../shared/printing'
import { LENS_R } from './lensLabels'
import type { WallState } from './wall'

// What the lens on one line of the wall shows: a sketch of the chains inside it. Calm chains in bands
// that only shiver while frozen, then slither along themselves (reptation) once past Tg, faster as it
// heats. Crystals (PLA) are neat folded stacks and hard islands (TPU) tight clumps; both hold still until
// their melt, then loosen into chains like the rest. Rubber (ABS, ASA) shows as pale blobs.

const CHAINS = 6
const POINTS = 11

interface ChainPlan {
  band: number
  half: number
  phase: number
  waves: number
  size: number
  z: number
  dir: 1 | -1
}

interface PatchPlan {
  folded: THREE.Vector3[]
  loose: THREE.Vector3[]
}

function planChains(seed: number): ChainPlan[] {
  const r = rng(seed)
  return Array.from({ length: CHAINS }, (_, i) => {
    const band = -1.45 + (2.9 * (i + 0.5)) / CHAINS
    return {
      band,
      half: Math.min(1.9, Math.sqrt(Math.max(0, (LENS_R - 0.3) ** 2 - (Math.abs(band) + 0.15) ** 2))),
      phase: r() * Math.PI * 2,
      waves: 2 + r() * 1.5,
      size: 0.1 + r() * 0.06,
      z: (r() - 0.5) * 0.4,
      dir: i % 2 === 0 ? 1 : -1,
    }
  })
}

/** Where the patches sit (lens units) and how they are folded: crystals are long neat folds, islands short tight ones. */
function planPatches(kind: Patches, seed: number): PatchPlan[] {
  if (!kind) return []
  const r = rng(seed)
  const spots = kind === 'crystals' ? [new THREE.Vector3(-0.75, 0.55, 0.15), new THREE.Vector3(0.85, -0.6, 0.15)] : [new THREE.Vector3(-1.0, 0.35, 0.15), new THREE.Vector3(0.95, 0.75, 0.15), new THREE.Vector3(0.1, -0.85, 0.15)]
  const folds = kind === 'crystals' ? 6 : 4
  const length = kind === 'crystals' ? 0.85 : 0.45
  const spacing = kind === 'crystals' ? 0.14 : 0.12
  return spots.map((c) => {
    const folded: THREE.Vector3[] = []
    for (let f = 0; f < folds; f++) {
      const x = c.x + (f - (folds - 1) / 2) * spacing
      const up = f % 2 === 0 ? 1 : -1
      folded.push(new THREE.Vector3(x, c.y - (up * length) / 2, c.z), new THREE.Vector3(x, c.y + (up * length) / 2, c.z))
    }
    // Let go: the same chain loosened into a gentle wave lying along the bands, centred where it was.
    const wave = r() * Math.PI * 2
    const loose = folded.map((_, k) => {
      const u = k / (folded.length - 1)
      return new THREE.Vector3(c.x - 0.8 + 1.6 * u, c.y + 0.12 * Math.sin(wave + u * Math.PI * 3), c.z)
    })
    return { folded, loose }
  })
}

const RUBBER = [
  { x: -0.95, y: -0.55, r: 0.55 },
  { x: 0.9, y: 0.6, r: 0.45 },
]

/** How fast the chains slither (lens units per second of motion) at this state. */
function speedOf(s: WallState): number {
  return s.soft * (0.25 + 1.6 * s.heat * s.heat) + 2.2 * s.puddle
}

export function HeatLensChains({ m, state, time }: { m: Material; state: WallState; time: number }) {
  const seed = seedOf(m.id, 5)
  const kind = patchesOf(m)
  const chains = useMemo(() => planChains(seed), [seed])
  const patches = useMemo(() => planPatches(kind, seed + 1), [kind, seed])
  // How far the chains have slithered: the speed integrated over the motion clock, so a change of
  // temperature changes how fast they go, never where they are. Only advances when the clock does.
  // (State adjusted during render when the clock has moved: React's pattern for state derived from a prop.)
  const [flow, setFlow] = useState({ at: time, d: 0 })
  let d = flow.d
  if (time !== flow.at) {
    d = flow.d + speedOf(state) * Math.max(0, time - flow.at)
    setFlow({ at: time, d })
  }
  const shiver = 0.012 + 0.03 * state.soft + 0.03 * state.heat
  const colour = mix(mix(m.accent, '#FFFFFF', 0.25), '#FFB27A', 0.8 * state.heat ** 1.6)
  const patchColour = mix(mix(m.accent, '#FFFFFF', 0.65), colour, state.letGo)

  return (
    <group>
      {m.morphology === 'rubber-toughened' &&
        RUBBER.map((b, i) => (
          <mesh key={`r${i}`} position={[b.x, b.y, -0.3]}>
            <circleGeometry args={[b.r, 40]} />
            <meshBasicMaterial color="#E8ECF7" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        ))}
      {chains.map((c, i) => {
        const pts: THREE.Vector3[] = []
        for (let k = 0; k < POINTS; k++) {
          const u = k / (POINTS - 1)
          // The wave travels along the chain: the chain slithering along its own length.
          const a = c.phase + c.waves * Math.PI * u - c.dir * d * 2.2
          pts.push(new THREE.Vector3(-c.half + 2 * c.half * u, c.band + c.size * Math.sin(a), c.z))
        }
        return <LensChain key={i} points={shake(pts, shiver, time, i)} color={colour} emissive={HOT} emissiveIntensity={0.4 * state.heat ** 2} />
      })}
      {patches.map((p, i) => {
        const g = state.letGo
        const pts = p.folded.map((f, k) => f.clone().lerp(p.loose[k], g))
        return <LensChain key={`p${i}`} points={shake(pts, lerp(shiver * 0.3, shiver, g), time, 40 + i)} color={patchColour} emissive={HOT} emissiveIntensity={0.4 * state.heat ** 2} radius={lerp(0.085, 0.07, g)} />
      })}
    </group>
  )
}


import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Line, RoundedBox } from '@react-three/drei'
import { rng } from '../../three/chains'
import { MoleculeView } from '../../three/MoleculeView'
import type { Material, Molecule } from '../../types/chem'
import { mix, seedOf, uvWeakSpot } from '../shared/material'
import { clamp01, smoothstep } from '../shared/motion'
import { ChainLens, LAYER_H, LINE_W, type LensLabel, type LensLabels } from '../shared/printing'

// The Sunlight close-up: a windowsill, the sun, its UV rays, and the top corner of each printed part
// (real proportions: 0.45 mm lines, 0.2 mm layers), with a lens on the rubber just under each surface.
// Pure functions of the run's progress p.

export const SNAP_AT = 0.45

export interface PartPlan {
  m: Material
  molecule: Molecule
  spot: ReturnType<typeof uvWeakSpot>
  centre: THREE.Vector3
  radius: number
}

export type TagPlace = (id: string, transform: string) => void

const UV = '#B69CFF'
const NATURAL = '#ECE7DA' // both parts printed in natural (unpigmented) filament, so a colour change shows
const YELLOWED = '#CFA544'
const CRACK = '#4A3510'

// The part: LINES top lines side by side, LAYERS layers, PX long. Its top front corner sits at the origin of its group.
const LINES = 6
const LAYERS = 8
const PX = 14
const DEPTH = LINES * LINE_W
const TOP = LAYERS * LAYER_H
const GAP = 4.5 // between the two parts
const LENS_DROP = 8.6 // lens centre below the part's top
const SILL_FRONT = DEPTH / 2 + 1.5
const LENS_Z = SILL_FRONT + 3.5
const SUN: [number, number, number] = [-22, 16, -14]
const NONE: number[] = []

/** Damage (yellowing and cracks) at progress p, for a part whose rubber has a weak spot. */
const damageAt = (p: number) => smoothstep(SNAP_AT, 0.95, p)

export function SunScene({ parts, p, lensR, labels, handle, placeTag }: { parts: PartPlan[]; p: number; lensR: number; labels: readonly LensLabel[]; handle: LensLabels; placeTag: TagPlace }) {
  const xs = parts.length > 1 ? [-(PX + GAP) / 2, (PX + GAP) / 2] : [0]
  return (
    <group>
      <Sill />
      <SunDisc />
      {parts.map((x, i) => (
        <group key={x.m.id}>
          <group position={[xs[i], 0, 0]}>
            <Part plan={x} p={p} />
            <Rays seed={seedOf(x.m.id, 11)} p={p} at={xs[i]} />
          </group>
          {/* World coordinates: the lens places its labels from its own centre. */}
          <ChainLens
            centre={[xs[i], TOP - LENS_DROP - (lensR - 3.6), LENS_Z]}
            radius={lensR}
            target={[xs[i] - PX / 2 + 3.2, TOP - LAYER_H * 1.6, DEPTH / 2 + 0.05]}
            labels={labels.filter((l) => l.id.startsWith(`${x.m.id}-`))}
            handle={handle}
          >
            <RubberLens plan={x} p={p} r={lensR} />
          </ChainLens>
        </group>
      ))}
      <PlaceTags parts={parts} xs={xs} place={placeTag} />
    </group>
  )
}

/** A painted windowsill under the parts, running off both sides. */
function Sill() {
  return (
    <mesh position={[0, -3, SILL_FRONT - 20]}>
      <boxGeometry args={[120, 6, 40]} />
      <meshStandardMaterial color="#59606F" roughness={0.8} />
    </mesh>
  )
}

/** The sun, up and to the left, through the window. */
function SunDisc() {
  return (
    <Billboard position={SUN}>
      <mesh>
        <circleGeometry args={[3.4, 48]} />
        <meshBasicMaterial color="#FFB547" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[2, 48]} />
        <meshBasicMaterial color="#FFE7A3" />
      </mesh>
    </Billboard>
  )
}

/** The top corner of a printed part: its layers of printed lines, the surface yellowing and cracking with the damage. */
function Part({ plan, p }: { plan: PartPlan; p: number }) {
  const dmg = plan.spot ? damageAt(p) : 0
  const tint = mix(NATURAL, plan.m.accent, 0.08)
  // The top gets the full dose; the side less.
  const top = mix(tint, YELLOWED, dmg)
  const side = mix(tint, YELLOWED, dmg * 0.6)
  const lines = []
  for (let l = 0; l < LAYERS; l++) {
    const y = TOP - LAYER_H * (l + 0.5)
    for (let k = 0; k < LINES; k++) {
      const z = DEPTH / 2 - LINE_W * (k + 0.5)
      lines.push(
        <RoundedBox key={`${l}-${k}`} args={[PX, LAYER_H * 1.08, LINE_W]} radius={0.27} smoothness={3} position={[0, y, z]}>
          <meshStandardMaterial color={l === 0 ? top : side} roughness={0.55} />
        </RoundedBox>,
      )
    }
  }
  return (
    <group>
      {lines}
      {plan.spot && <Cracks seed={seedOf(plan.m.id, 21)} amount={dmg} />}
    </group>
  )
}

interface Crack {
  pts: THREE.Vector3[]
  start: number // the damage at which it starts to grow
}

/** Fine cracks (crazing) across the top: short wandering lines, mostly across the printed lines. */
function planCracks(seed: number): Crack[] {
  const r = rng(seed)
  const out: Crack[] = []
  for (let i = 0; i < 11; i++) {
    let x = -PX / 2 + 1 + r() * (PX - 2)
    let z = DEPTH / 2 - 0.3 - r() * (DEPTH - 0.6)
    let a = Math.PI / 2 + (r() - 0.5) * 1.2
    const pts = [new THREE.Vector3(x, TOP + 0.03, z)]
    for (let k = 0; k < 7; k++) {
      a += (r() - 0.5) * 0.9
      x += Math.cos(a) * 0.55
      z += Math.sin(a) * 0.55 * (r() < 0.5 ? 1 : -1)
      if (Math.abs(x) > PX / 2 - 0.3 || Math.abs(z) > DEPTH / 2 - 0.15) break
      pts.push(new THREE.Vector3(x, TOP + 0.03, z))
    }
    if (pts.length > 2) out.push({ pts, start: 0.1 + 0.55 * (i / 11) })
  }
  return out
}

function Cracks({ seed, amount }: { seed: number; amount: number }) {
  const cracks = useMemo(() => planCracks(seed), [seed])
  return (
    <group>
      {cracks.map((c, i) => {
        const grow = clamp01((amount - c.start) / 0.3)
        if (grow <= 0) return null
        const n = 1 + grow * (c.pts.length - 1)
        const pts = c.pts.slice(0, Math.floor(n) + 1)
        const f = n - Math.floor(n)
        if (f > 0 && Math.floor(n) + 1 < c.pts.length) pts.push(c.pts[Math.floor(n)].clone().lerp(c.pts[Math.floor(n) + 1], f))
        return pts.length >= 2 ? <Line key={i} points={pts} color={CRACK} lineWidth={1.4} /> : null
      })}
    </group>
  )
}

const RAYS = 26
const RAY_LIFE = 0.13
const RAY_LEN = 6

/** UV rays from the sun to the part's top, each a short streak on its own schedule; all gone by p = 0.85. */
function Rays({ seed, p, at }: { seed: number; p: number; at: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  const plan = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: RAYS }, (_, i) => {
      const hit = new THREE.Vector3(-PX / 2 + 0.8 + r() * (PX - 1.6), TOP + 0.05, DEPTH / 2 - 0.3 - r() * (DEPTH - 0.6))
      const from = new THREE.Vector3(SUN[0] - at, SUN[1], SUN[2])
      return { hit, dir: hit.clone().sub(from).normalize(), start: 0.03 + ((0.85 - RAY_LIFE - 0.03) * i) / (RAYS - 1) + (r() - 0.5) * 0.02 }
    })
  }, [seed, at])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const scale = new THREE.Vector3(1, 1, 1)
    const up = new THREE.Vector3(0, 1, 0)
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0)
    plan.forEach((ray, i) => {
      const t = (p - ray.start) / RAY_LIFE
      if (p <= 0 || t < 0 || t > 1) {
        mesh.setMatrixAt(i, hidden)
        return
      }
      // The streak's head travels to the hit point and stops there as its tail catches up.
      const head = Math.min(1, t * 1.6)
      const tail = Math.max(0, t * 1.6 - 0.6)
      const len = RAY_LEN * (head - tail) + 0.001
      const headDist = 14 * (1 - head)
      pos.copy(ray.hit).addScaledVector(ray.dir, -headDist - len / 2)
      q.setFromUnitVectors(up, ray.dir)
      scale.set(1, len, 1)
      m.compose(pos, q, scale)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    invalidate()
  }, [plan, p, invalidate])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, RAYS]} frustumCulled={false}>
      <cylinderGeometry args={[0.16, 0.16, 1, 8]} />
      <meshBasicMaterial color={UV} />
    </instancedMesh>
  )
}

const LENS_RAYS = 4

/**
 * Inside the lens: the rubber molecule, real geometry from RDKit, magnified. UV streaks come in from the
 * sun's side. With a weak spot, the C=C glows as the rays hit, snaps at SNAP_AT (MoleculeView's `broken`),
 * and the two pieces drift apart; without one, nothing changes.
 */
function RubberLens({ plan, p, r }: { plan: PartPlan; p: number; r: number }) {
  const { molecule, spot, centre, radius } = plan
  const k = (r * 0.88) / radius
  const snapped = !!spot && p >= SNAP_AT
  const piece = useMemo(() => (spot ? fragment(molecule, spot.atoms[0], spot.atoms[1]) : null), [spot, molecule])
  const apart = piece ? 1.2 * smoothstep(SNAP_AT, SNAP_AT + 0.25, p) : 0
  const shown = useMemo(() => (piece && apart > 0 ? separate(molecule, piece, spot!.atoms, apart) : molecule), [molecule, piece, spot, apart])
  const mid = useMemo(() => {
    if (!spot) return null
    const [a, b] = spot.atoms.map((i) => molecule.atoms[i])
    return new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
  }, [spot, molecule])
  // The weak spot warms up under the rays, then flashes as it snaps.
  const warm = spot ? smoothstep(0.12, SNAP_AT, p) * (p < SNAP_AT ? 1 : 0) : 0
  const flash = spot ? clamp01((p - SNAP_AT) / 0.16) : 0
  return (
    <group>
      <group scale={[k, k, k * 0.35]}>
        <group position={[-centre.x, -centre.y, -centre.z]}>
          <MoleculeView molecule={shown} broken={snapped ? spot!.atoms : NONE} />
          {mid && warm > 0 && (
            <mesh position={mid}>
              <sphereGeometry args={[1.3, 24, 16]} />
              <meshBasicMaterial color={UV} transparent opacity={0.45 * warm} depthWrite={false} />
            </mesh>
          )}
          {mid && flash > 0 && flash < 1 && (
            <mesh position={mid}>
              <sphereGeometry args={[0.5 + flash * 1.6, 24, 16]} />
              <meshBasicMaterial color="#FFFFFF" transparent opacity={(1 - flash) * 0.6} depthWrite={false} />
            </mesh>
          )}
        </group>
      </group>
      <LensRays p={p} r={r} seed={seedOf(plan.m.id, 31)} aim={mid ? mid.clone().sub(centre).multiplyScalar(k) : new THREE.Vector3()} />
    </group>
  )
}

/** Short violet streaks crossing the lens from the upper left toward the molecule, while the rays fall. */
function LensRays({ p, r, seed, aim }: { p: number; r: number; seed: number; aim: THREE.Vector3 }) {
  const plan = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: LENS_RAYS }, (_, i) => ({ start: 0.05 + i * 0.09 + r() * 0.02, off: (r() - 0.5) * 1.6 }))
  }, [seed])
  const dir = new THREE.Vector3(0.62, -0.78, 0)
  return (
    <group>
      {plan.map((ray, i) => {
        const t = (p - ray.start) / 0.12
        if (p <= 0 || t <= 0 || t >= 1) return null
        const end = aim.clone().add(new THREE.Vector3(ray.off * 0.4, ray.off * 0.3, 0.6))
        const head = end.clone().addScaledVector(dir, -(1 - Math.min(1, t * 1.4)) * r * 1.4)
        const tail = head.clone().addScaledVector(dir, -1.2 * (1 - Math.max(0, t * 1.4 - 0.4)))
        return <Line key={i} points={[tail, head]} color={UV} lineWidth={2.5} transparent opacity={0.9} />
      })}
    </group>
  )
}

/** Atoms on b's side of the a-b bond, or null if the bond is in a ring (snapping it frees nothing). */
function fragment(mol: Molecule, a: number, b: number): Set<number> | null {
  const seen = new Set<number>([b])
  const stack = [b]
  while (stack.length) {
    const i = stack.pop()!
    for (const bond of mol.bonds) {
      if ((bond.a === a && bond.b === b) || (bond.a === b && bond.b === a)) continue
      const j = bond.a === i ? bond.b : bond.b === i ? bond.a : -1
      if (j >= 0 && !seen.has(j)) {
        seen.add(j)
        stack.push(j)
      }
    }
  }
  return seen.has(a) ? null : seen
}

/** A copy of the molecule with one fragment moved `by` angstroms away along the broken bond. */
function separate(mol: Molecule, piece: Set<number>, [a, b]: number[], by: number): Molecule {
  const A = mol.atoms[a]
  const B = mol.atoms[b]
  const dir = new THREE.Vector3(B.x - A.x, B.y - A.y, B.z - A.z).normalize().multiplyScalar(by)
  return { ...mol, atoms: mol.atoms.map((at, i) => (piece.has(i) ? { ...at, x: at.x + dir.x, y: at.y + dir.y, z: at.z + dir.z } : at)) }
}

const _v = new THREE.Vector3()

/** Moves each part's name tag above its top left corner, every frame the canvas draws. */
function PlaceTags({ parts, xs, place }: { parts: PartPlan[]; xs: number[]; place: TagPlace }) {
  useFrame(({ camera, size }) => {
    parts.forEach((x, i) => {
      _v.set(xs[i] - PX / 2, TOP + 0.4, -DEPTH / 2).project(camera)
      place(x.m.id, `translate(${((_v.x + 1) / 2) * size.width}px, ${((1 - _v.y) / 2) * size.height}px) translate(0, -100%)`)
    })
  })
  return null
}

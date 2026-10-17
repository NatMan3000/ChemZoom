import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { RotateCcw, Square, Sun } from 'lucide-react'
import { rng } from '../../three/chains'
import { MoleculeView } from '../../three/MoleculeView'
import type { Material, Molecule, Text } from '../../types/chem'
import type { SimProps } from '../types'
import { SimCanvas } from '../shared/SimCanvas'
import { mix, rubberMolecule, seedOf, uvWeakSpot } from '../shared/material'
import { clamp01, smoothstep, useReducedMotion, useTimeline } from '../shared/motion'
import { ActionButton, MaterialTag, Row, SimFrame } from '../shared/ui'
import { isStacked, useElementSize } from '../shared/layout'

// Sunlight: UV rays rain onto each material's rubber. Where the material names a uvWeakSpot
// (ABS: the C=C left in its butadiene rubber), that bond snaps (MoleculeView's `broken` prop) and a
// printed tile under it yellows and cracks. A material with no weak spot (ASA) takes the same rays
// and nothing snaps. Driven by sim.uvWeakSpot / sim.rubberBlobs only.

const RUN_MS = 6000
const SNAP_AT = 0.55
const RAYS = 12
const UV = '#C9B0FF'
const TILE = '#ECE8DF'
const YELLOWED = '#C9A23F'
const NONE: number[] = []

interface Panel {
  m: Material
  molecule: Molecule
  spot: ReturnType<typeof uvWeakSpot>
  centre: THREE.Vector3
  radius: number
}

function panelFor(m: Material): Panel {
  const spot = uvWeakSpot(m)
  const molecule = spot?.molecule ?? rubberMolecule(m)
  const box = new THREE.Box3()
  for (const a of molecule.atoms) box.expandByPoint(new THREE.Vector3(a.x, a.y, a.z))
  const centre = box.getCenter(new THREE.Vector3())
  const radius = Math.max(...molecule.atoms.map((a) => centre.distanceTo(new THREE.Vector3(a.x, a.y, a.z)))) + 0.5
  return { m, molecule, spot, centre, radius }
}

const uvScore = (m: Material) => m.traits.find((t) => t.id === 'uv')?.score

function caption(panels: Panel[]): Text {
  const weak = panels.find((p) => p.spot)
  const parts = panels.map((p) => {
    if (p.spot) return `${p.m.short}'s rubber has a weak spot, lit up here: the ${p.spot.group.label}. UV snaps it, the chain breaks in two, and the plastic goes yellow and brittle.`
    return weak
      ? `${p.m.short}'s rubber has no weak spot like that, so the same sunlight does far less damage.`
      : `${p.m.short}'s rubber has no weak spot like that for UV to snap.`
  })
  const scores = panels
    .map((p) => (uvScore(p.m) != null ? `${p.m.short} ${uvScore(p.m)} of 5` : null))
    .filter(Boolean)
    .join(', ')
  const note = weak?.spot?.group.note?.deeper ?? weak?.spot?.group.note?.simple
  return {
    simple: `Sunlight carries ultraviolet (UV) light, which has enough energy to break some bonds. ${parts.join(' ')}`,
    deeper: `${note ? `${note} ` : ''}A UV photon can break a bond and leave reactive fragments that grab oxygen from the air (photo-oxidation). Shorter, oxidised chains lose their stretch, so the rubber stops soaking up knocks and the part turns brittle; the new oxygen-containing groups absorb blue light, so it looks yellow.${scores ? ` Sun resistance in this app: ${scores}.` : ''}`,
  }
}

function SunSim({ material: m, compareWith: c }: SimProps) {
  const reduced = useReducedMotion()
  const [p, setP] = useState(0)
  const timeline = useTimeline(reduced)
  const [stageRef, size] = useElementSize<HTMLDivElement>()
  const stacked = isStacked(size)
  const panels = useMemo(() => (c ? [panelFor(m), panelFor(c)] : [panelFor(m)]), [m, c])
  const R = Math.max(...panels.map((x) => x.radius))
  const gap = R + 0.6
  const offsets: [number, number, number][] =
    panels.length === 1 ? [[0, 0, 0]] : stacked ? [[0, gap + 1, 0], [0, -gap - 1, 0]] : [[-gap, 0, 0], [gap, 0, 0]]
  // Each panel is the molecule plus its tile below (about 2 units) and the rays above.
  const fitBox: [number, number, number] =
    panels.length === 1 ? [R, R + 1.6, R * 0.6] : stacked ? [R + 0.4, 2 * R + 4.5, R * 0.6] : [2 * R + 0.6, R + 1.6, R * 0.6]

  const play = () => {
    if (timeline.running) return timeline.cancel()
    timeline.run(RUN_MS, setP)
  }

  let readout: string
  if (p === 0) readout = `Ready to leave ${panels.map((x) => x.m.short).join(' and ')} out in the sun`
  else if (p < SNAP_AT) readout = 'UV rays hitting the rubber...'
  else
    readout = panels
      .map((x) => (x.spot ? `${x.m.short}: ${x.spot.group.label} snapped, going yellow and brittle` : `${x.m.short}: nothing to snap, still fine`))
      .join(' · ')

  return (
    <SimFrame
      stageRef={stageRef}
      stage={
        <SimCanvas fitBox={fitBox} viewFrom={[0, 0.12, 1]} target={[0, -0.6, 0]} label={`Sunlight hitting the rubber in ${panels.map((x) => x.m.short).join(' and ')}`}>
          {panels.map((x, i) => (
            <group key={x.m.id} position={offsets[i]}>
              <SunPanel panel={x} p={p} />
            </group>
          ))}
        </SimCanvas>
      }
      overlay={panels.map((x, i) => (
        <MaterialTag
          key={x.m.id}
          material={x.m}
          note={x.spot ? 'has a weak spot' : 'no weak spot'}
          style={panels.length === 1 || !stacked ? { top: 12, left: i === 0 ? '12px' : 'calc(50% + 12px)' } : i === 0 ? { left: 12, top: 12 } : { left: 12, top: '50%' }}
        />
      ))}
      controls={
        <Row>
          <ActionButton
            action="play"
            icon={timeline.running ? Square : p >= 1 ? RotateCcw : Sun}
            label={timeline.running ? 'Stop' : p >= 1 ? 'Again' : 'Out in the sun'}
            onClick={() => {
              if (!timeline.running && p >= 1) setP(0)
              play()
            }}
            primary
            accent={m.accent}
          />
        </Row>
      }
      readout={readout}
      caption={caption(panels)}
    />
  )
}

function SunPanel({ panel, p }: { panel: Panel; p: number }) {
  const { molecule, spot, centre, radius } = panel
  const snapped = !!spot && p >= SNAP_AT
  const damage = spot ? smoothstep(SNAP_AT, 1, p) : 0
  const mid = useMemo(() => {
    if (!spot) return null
    const [a, b] = spot.atoms.map((i) => molecule.atoms[i])
    return new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2).sub(centre)
  }, [spot, molecule, centre])
  const flash = spot ? clamp01((p - SNAP_AT) / 0.18) : 0

  // Once the bond snaps, the two pieces of chain drift a little apart (along the old bond).
  const piece = useMemo(() => (spot ? fragment(molecule, spot.atoms[0], spot.atoms[1]) : null), [spot, molecule])
  const apart = piece ? 1.1 * smoothstep(SNAP_AT, SNAP_AT + 0.25, p) : 0
  const shown = useMemo(() => (piece && apart > 0 ? separate(molecule, piece, spot!.atoms, apart) : molecule), [molecule, piece, spot, apart])
  // The weak spot is lit while the rays hit (everything else ghosted); once it has snapped the whole
  // molecule comes back at full strength, so the end state reads as a molecule with a break in it.
  const highlight = spot && p >= 0.25 && p < SNAP_AT + 0.2 ? spot.group.id : null

  return (
    <group>
      <group position={[-centre.x, -centre.y, -centre.z]}>
        {/* Keyed on the highlight: MoleculeView's dim materials only switch to transparent on a fresh mount. */}
        <MoleculeView key={highlight ?? 'all'} molecule={shown} highlight={highlight} broken={snapped ? spot!.atoms : NONE} />
      </group>
      {mid && flash > 0 && flash < 1 && (
        <mesh position={mid}>
          <sphereGeometry args={[0.4 + flash * 1.4, 24, 16]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={(1 - flash) * 0.5} depthWrite={false} />
        </mesh>
      )}
      <Rays seed={seedOf(panel.m.id, 11)} p={p} radius={radius} />
      <Tile y={-radius - 0.6} width={radius * 1.7} damage={damage} />
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

/** UV rays falling from above: instanced, each one a short streak on its own schedule. */
function Rays({ seed, p, radius }: { seed: number; p: number; radius: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  const plan = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: RAYS }, (_, i) => ({
      x: (r() - 0.5) * radius * 1.4,
      z: (r() - 0.5) * radius * 0.6,
      start: 0.02 + (0.6 * i) / RAYS + r() * 0.04,
    }))
  }, [seed, radius])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const mtx = new THREE.Matrix4()
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0)
    plan.forEach((ray, i) => {
      const q = (p - ray.start) / 0.16
      if (p <= 0 || p >= 1 || q < 0 || q > 1) {
        mesh.setMatrixAt(i, hidden)
        return
      }
      const y = radius + 4 - q * (radius + 3.5)
      mtx.makeTranslation(ray.x, y, ray.z)
      mesh.setMatrixAt(i, mtx)
    })
    mesh.instanceMatrix.needsUpdate = true
    invalidate()
  }, [plan, p, radius, invalidate])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, RAYS]} frustumCulled={false}>
      <cylinderGeometry args={[0.1, 0.1, 2.4, 8]} />
      <meshBasicMaterial color={UV} transparent opacity={0.85} />
    </instancedMesh>
  )
}

/** A small printed tile that yellows and cracks as the damage builds. */
function Tile({ y, width, damage }: { y: number; width: number; damage: number }) {
  return (
    <group position={[0, y, 0]}>
      <mesh>
        <boxGeometry args={[width, 0.5, width * 0.45]} />
        <meshStandardMaterial color={mix(TILE, YELLOWED, damage)} roughness={0.6} />
      </mesh>
      {damage > 0.3 && (
        <mesh position={[0, 0.255, 0]} rotation={[-Math.PI / 2, 0, 0.35]}>
          <planeGeometry args={[width * 0.8 * smoothstep(0.3, 1, damage), 0.07]} />
          <meshBasicMaterial color="#3A2A10" />
        </mesh>
      )}
    </group>
  )
}

export default SunSim

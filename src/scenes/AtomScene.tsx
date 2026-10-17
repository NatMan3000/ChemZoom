import { useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { elements } from '../content/elements'
import type { Molecule } from '../types/chem'
import { AtomTitle, NeighbourLabel, type TitleSlot } from './atom/AtomLabels'
import { SIZES, shellRadii, useAtomGeometry, useAtomMaterials, type AtomMaterials } from './atom/atomLook'
import { atomModel, lonePairDirections, normalise, packNucleus, perpendicular, type AtomModel, type Vec3 } from './atom/atomModel'

// The bottom of the zoom: ONE atom of the molecule (spec/design-intent.md P7), and how it joins its neighbours.
//
// - Nucleus: its protons and neutrons, packed (deterministic, same atom always looks the same).
// - Electrons: a sketch (P8). Inner shells are full rings that always face you. The outer shell, the one that
//   bonds, is a faint ball whose outline is the brighter ring; its spare electrons sit on it as lone pairs,
//   pointing where lone pairs really point (VSEPR).
// - Bonds: each neighbour, faded, along the real bond direction from the molecule's coordinates. On each bond
//   the shared pair(s): one electron from this atom (yellow, nearer it) and one from the neighbour (blue).
//
// Scene units: the atom sits at the origin; nucleus and shells inside about 2.6, neighbours at 5.5, everything
// inside a radius of 7. Static: nothing moves unless the camera does. `opacity` cross-fades everything.

export interface AtomSceneProps {
  molecule: Molecule
  /** Index into molecule.atoms of the atom to show. */
  atomIndex: number
  /** The material's accent colour, for anything that should read as "this filament". */
  accent: string
  /** 0..1, for the zoom's cross-fade. */
  opacity?: number
}

// The atom's own card in the 3D view is off: the panel's atom card says the same (protons, neutrons, the
// "4 of its own + 4 from its neighbours" line), and in the 3D view the card clipped at the stage top under the
// chips after a wheel zoom (lead, 17 Oct). Kept, switchable, for the reference session with Nathan.
const SHOW_TITLE_CARD = false

const UP = new THREE.Vector3(0, 1, 0)
const Z = new THREE.Vector3(0, 0, 1)
const v3 = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2])

interface Placed {
  key: string
  pos: THREE.Vector3
  mat: THREE.Material
  r: number
}

interface Stick {
  key: string
  pos: THREE.Vector3
  quat: THREE.Quaternion
  len: number
}

interface Layout {
  model: AtomModel
  radii: number[]
  outerR: number
  nucleus: Placed[]
  innerElectrons: Placed[] // in the billboarded frame
  outerElectrons: Placed[] // in the world frame: lone pairs and shared pairs
  neighbours: { key: string; pos: THREE.Vector3; r: number; bond: AtomModel['bonds'][number] }[]
  sticks: Stick[]
}

function layoutAtom(molecule: Molecule, model: AtomModel, mats: AtomMaterials): Layout {
  const radii = shellRadii(model.innerShells.length + 1)
  const outerR = radii[radii.length - 1]

  const nucleus = packNucleus(model.protons, model.neutrons, SIZES.nucleon).map((n, i) => ({
    key: `n${i}`,
    pos: v3(n.pos),
    mat: n.proton ? mats.proton : mats.neutron,
    r: SIZES.nucleon,
  }))

  // Inner shells: full, evenly round their ring, each shell turned a little so they do not line up.
  const innerElectrons: Placed[] = []
  model.innerShells.forEach((count, s) => {
    for (let k = 0; k < count; k++) {
      const a = Math.PI / 2 + s * 0.45 + (k * 2 * Math.PI) / count
      innerElectrons.push({ key: `i${s}-${k}`, pos: new THREE.Vector3(Math.cos(a) * radii[s], Math.sin(a) * radii[s], 0), mat: mats.own, r: SIZES.electron })
    }
  })

  const outerElectrons: Placed[] = []
  // Lone pairs on the outer shell, two electrons side by side.
  lonePairDirections(molecule, model).forEach((d, i) => {
    const dir = v3(d)
    const centre = dir.clone().multiplyScalar(outerR)
    const single = i >= model.lonePairs // an unpaired electron, if the data ever has one
    if (single) {
      outerElectrons.push({ key: `u${i}`, pos: centre, mat: mats.own, r: SIZES.electron })
      return
    }
    const side = v3(perpendicular(d)).multiplyScalar(SIZES.pairGap)
    outerElectrons.push({ key: `l${i}a`, pos: centre.clone().add(side), mat: mats.own, r: SIZES.electron })
    outerElectrons.push({ key: `l${i}b`, pos: centre.clone().sub(side), mat: mats.own, r: SIZES.electron })
  })

  const neighbours: Layout['neighbours'] = []
  const sticks: Stick[] = []
  model.bonds.forEach((b, bi) => {
    const dir = v3(normalise(b.dir))
    const r = (elements[b.el]?.radius ?? 0.35) * SIZES.neighbourScale
    neighbours.push({ key: `nb${bi}`, pos: dir.clone().multiplyScalar(SIZES.neighbourAt), r, bond: b })
    // Sideways offset for double and triple bonds: the same rule MoleculeView uses, so the sticks line up
    // with the molecule the reader just zoomed out of.
    const side = new THREE.Vector3().crossVectors(dir, Z)
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0)
    side.normalize()
    const from = outerR
    const to = SIZES.neighbourAt - r * 0.6
    const mid = (outerR + SIZES.neighbourAt - r) / 2
    const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir)
    for (let k = 0; k < b.order; k++) {
      const t = b.order === 1 ? 0 : k - (b.order - 1) / 2
      const off = side.clone().multiplyScalar(t * SIZES.multiBondGap)
      sticks.push({ key: `s${bi}-${k}`, pos: dir.clone().multiplyScalar((from + to) / 2).add(off), quat, len: to - from })
      // The shared pair: this atom's electron on its side, the neighbour's on the neighbour's side.
      outerElectrons.push({ key: `p${bi}-${k}a`, pos: dir.clone().multiplyScalar(mid - SIZES.pairGap).add(off), mat: mats.own, r: SIZES.electron })
      outerElectrons.push({ key: `p${bi}-${k}b`, pos: dir.clone().multiplyScalar(mid + SIZES.pairGap).add(off), mat: mats.theirs, r: SIZES.electron })
    }
  })

  return { model, radii, outerR, nucleus, innerElectrons, outerElectrons, neighbours, sticks }
}

// Where the atom's own card sits round its outer shell: the side the bonds leave clearest from where the
// camera is now. Each slot's half-width is how much of the circle the card covers.
const SLOTS: { slot: TitleSlot; angle: number; half: number; bonus: number }[] = [
  { slot: 'below', angle: -Math.PI / 2, half: 0.95, bonus: 0.12 },
  { slot: 'above', angle: Math.PI / 2, half: 0.95, bonus: 0.08 },
  // No left or right slot: the card is wide and clipped at the stage edge there (lead, 17 Oct).
]

// On a phone the card sits outside the neighbours (they reach 6.5), at the scene's top or bottom edge.
const CARD_OUTSIDE = 6.75

function slotPosition(slot: TitleSlot, r: number): Vec3 {
  const a = SLOTS.find((s) => s.slot === slot)?.angle ?? -Math.PI / 2
  return [Math.cos(a) * r, Math.sin(a) * r, 0]
}

function angleBetween(a: number, b: number) {
  const d = Math.abs(a - b) % (2 * Math.PI)
  return d > Math.PI ? 2 * Math.PI - d : d
}

/** Picks the title slot on frames that are drawn anyway (the camera moved); never asks for a frame itself. */
function useTitleSlot(root: RefObject<THREE.Group | null>, dirs: Vec3[], compact: boolean): TitleSlot {
  const [slot, setSlot] = useState<TitleSlot>('below')
  const current = useRef<TitleSlot>('below')
  const tmp = useMemo(() => ({ q: new THREE.Quaternion(), cam: new THREE.Quaternion(), v: new THREE.Vector3() }), [])
  useFrame(({ camera }) => {
    const g = root.current
    if (!g) return
    g.getWorldQuaternion(tmp.q)
    tmp.cam.copy(camera.quaternion).invert()
    const seen: number[] = []
    for (const d of dirs) {
      tmp.v.set(d[0], d[1], d[2]).applyQuaternion(tmp.q).applyQuaternion(tmp.cam)
      // A bond pointing at the camera ends near the middle of the picture and cannot hit the card.
      if (Math.hypot(tmp.v.x, tmp.v.y) > 0.35) seen.push(Math.atan2(tmp.v.y, tmp.v.x))
    }
    const score = (s: (typeof SLOTS)[number]) => (seen.length ? Math.min(...seen.map((a) => angleBetween(a, s.angle) - s.half * (compact ? 1.25 : 1))) : 0) + s.bonus
    // On a phone the card is nearly as wide as the stage, so it only fits above or below.
    const slots = compact ? SLOTS.filter((s) => s.slot === 'below' || s.slot === 'above') : SLOTS
    let best = slots[0]
    for (const s of slots) if (score(s) > score(best)) best = s
    const now = SLOTS.find((s) => s.slot === current.current) ?? SLOTS[0]
    // A little stickiness so the card does not flick between two sides while the view turns.
    const nowAllowed = slots.includes(now)
    if (best.slot !== now.slot && (!nowAllowed || score(best) > score(now) + 0.12)) {
      current.current = best.slot
      setSlot(best.slot)
    }
  })
  return slot
}

export function AtomScene({ molecule, atomIndex, accent, opacity = 1 }: AtomSceneProps) {
  const model = useMemo(() => atomModel(molecule, atomIndex), [molecule, atomIndex])
  const neighbourEls = useMemo(() => model?.bonds.map((b) => b.el) ?? [], [model])
  const mats = useAtomMaterials(neighbourEls, opacity)
  const geo = useAtomGeometry()
  const layout = useMemo(() => (model ? layoutAtom(molecule, model, mats) : null), [molecule, model, mats])
  // Phone-sized stages keep the names and drop the longer lines.
  const compact = useThree((s) => s.size.width < 640)
  const root = useRef<THREE.Group>(null)
  const bondDirs = useMemo(() => model?.bonds.map((b) => b.dir) ?? [], [model])
  const slot = useTitleSlot(root, bondDirs, compact)
  const stageWidth = useThree((s) => s.size.width)

  if (!layout) return null
  const { radii, outerR } = layout
  const shown = opacity > 0.002
  const labelOpacity = Math.max(0, Math.min(1, (opacity - 0.25) / 0.75))

  return (
    <group ref={root} visible={shown}>
      {layout.nucleus.map((n) => (
        <mesh key={n.key} geometry={geo.sphere} material={n.mat} position={n.pos} scale={n.r} />
      ))}

      {/* Shells as rings that face the camera; the outer one is also a faint ball so lone pairs read as on it. */}
      <Billboard>
        {radii.map((r, s) => (
          <mesh key={`ring${s}`} material={s === radii.length - 1 ? mats.outerShell : mats.innerShell}>
            <torusGeometry args={[r, SIZES.ringTube * (s === radii.length - 1 ? 1.4 : 1), 8, 160]} />
          </mesh>
        ))}
        {layout.innerElectrons.map((e) => (
          <mesh key={e.key} geometry={geo.sphere} material={e.mat} position={e.pos} scale={e.r} />
        ))}
        {shown && SHOW_TITLE_CARD && (
          <AtomTitle
            model={layout.model}
            slot={slot}
            position={slotPosition(slot, compact ? CARD_OUTSIDE : outerR + 0.45)}
            accent={accent}
            opacity={labelOpacity}
            compact={compact}
            maxWidth={compact ? stageWidth - 24 : undefined}
          />
        )}
      </Billboard>
      <mesh geometry={geo.sphere} material={mats.shellFill} scale={outerR} renderOrder={-1} />

      {layout.outerElectrons.map((e) => (
        <mesh key={e.key} geometry={geo.sphere} material={e.mat} position={e.pos} scale={e.r} />
      ))}

      {layout.sticks.map((s) => (
        <mesh key={s.key} geometry={geo.stick} material={mats.bond} position={s.pos} quaternion={s.quat} scale={[0.035, s.len, 0.035]} />
      ))}

      {layout.neighbours.map((n) => {
        const mat = mats.neighbour[n.bond.el]
        return (
          <group key={n.key}>
            {mat && <mesh geometry={geo.sphere} material={mat} position={n.pos} scale={n.r} />}
            {shown && <NeighbourLabel bond={n.bond} position={[n.pos.x, n.pos.y, n.pos.z]} opacity={labelOpacity} compact={compact} />}
          </group>
        )
      })}
    </group>
  )
}

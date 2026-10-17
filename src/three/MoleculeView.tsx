import { useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { elements } from '../content/elements'
import type { Molecule } from '../types/chem'

// Shared ball-and-stick renderer. Sits inside a <Canvas>; the caller owns camera, lights and controls.
// Lane B owns this file and may improve it; keep the props stable, lane C imports it.

export interface MoleculeViewProps {
  molecule: Molecule
  /** AtomGroup id to highlight; other atoms dim. */
  highlight?: string | null
  /** Atom indices drawn as broken/flashing (the UV sim snaps a bond). Bonds between two of these are hidden. */
  broken?: number[]
  /** Called with the atom index when an atom is tapped. */
  onAtomClick?: (index: number) => void
  selectedAtom?: number | null
  /** Multiplies ball radii; 1 = ball-and-stick, ~2.6 = space-filling. */
  atomScale?: number
}

const UP = new THREE.Vector3(0, 1, 0)
const BOND_RADIUS = 0.09

export function MoleculeView({ molecule, highlight = null, broken = [], onAtomClick, selectedAtom = null, atomScale = 1 }: MoleculeViewProps) {
  const lit = useMemo(() => {
    if (!highlight) return null
    const g = molecule.groups.find((x) => x.id === highlight)
    return g ? new Set(g.atoms) : null
  }, [molecule, highlight])
  const brokenSet = useMemo(() => new Set(broken), [broken])

  const sticks = useMemo(() => {
    const out: { pos: THREE.Vector3; quat: THREE.Quaternion; len: number; offset: number; key: string; dim: boolean }[] = []
    for (const [i, b] of molecule.bonds.entries()) {
      if (brokenSet.has(b.a) && brokenSet.has(b.b)) continue
      const a = molecule.atoms[b.a]
      const c = molecule.atoms[b.b]
      const va = new THREE.Vector3(a.x, a.y, a.z)
      const vc = new THREE.Vector3(c.x, c.y, c.z)
      const dir = vc.clone().sub(va)
      const len = dir.length()
      const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize())
      const mid = va.clone().add(vc).multiplyScalar(0.5)
      // Perpendicular offset so double and triple bonds draw as parallel sticks.
      const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 0, 1))
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0)
      side.normalize().multiplyScalar(0.13)
      const n = b.order
      const dim = !!lit && !(lit.has(b.a) && lit.has(b.b))
      for (let k = 0; k < n; k++) {
        const t = n === 1 ? 0 : k - (n - 1) / 2
        out.push({ pos: mid.clone().addScaledVector(side, t * 1.6), quat, len, offset: t, key: `${i}-${k}`, dim })
      }
    }
    return out
  }, [molecule, lit, brokenSet])

  return (
    <group>
      {molecule.atoms.map((a, i) => {
        const info = elements[a.el]
        const dim = !!lit && !lit.has(i)
        const selected = selectedAtom === i
        return (
          <mesh
            key={i}
            position={[a.x, a.y, a.z]}
            onClick={onAtomClick ? (e: ThreeEvent<MouseEvent>) => (e.stopPropagation(), onAtomClick(i)) : undefined}
          >
            <sphereGeometry args={[info.radius * atomScale * (selected ? 1.25 : 1), 24, 16]} />
            <meshStandardMaterial
              color={info.colour}
              roughness={0.35}
              metalness={0.05}
              transparent={dim}
              opacity={dim ? 0.18 : 1}
              emissive={selected || brokenSet.has(i) ? '#ffffff' : '#000000'}
              emissiveIntensity={selected ? 0.35 : brokenSet.has(i) ? 0.6 : 0}
            />
          </mesh>
        )
      })}
      {atomScale < 1.8 &&
        sticks.map((s) => (
          <mesh key={s.key} position={s.pos} quaternion={s.quat}>
            <cylinderGeometry args={[BOND_RADIUS, BOND_RADIUS, s.len, 10]} />
            <meshStandardMaterial color="#C9CED6" roughness={0.5} transparent={s.dim} opacity={s.dim ? 0.15 : 1} />
          </mesh>
        ))}
    </group>
  )
}

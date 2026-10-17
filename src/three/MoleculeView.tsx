import { useEffect, useMemo } from 'react'
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
const Z = new THREE.Vector3(0, 0, 1)
const BOND_RADIUS = 0.09
const DIM_ATOM = 0.16
const DIM_BOND = 0.12

export function MoleculeView({ molecule, highlight = null, broken = [], onAtomClick, selectedAtom = null, atomScale = 1 }: MoleculeViewProps) {
  // One unit sphere and one unit cylinder shared by every ball and stick in this view.
  const sphere = useMemo(() => new THREE.SphereGeometry(1, 28, 18), [])
  const stick = useMemo(() => new THREE.CylinderGeometry(BOND_RADIUS, BOND_RADIUS, 1, 12), [])
  useEffect(
    () => () => {
      sphere.dispose()
      stick.dispose()
    },
    [sphere, stick],
  )

  const lit = useMemo(() => {
    if (!highlight) return null
    const g = molecule.groups.find((x) => x.id === highlight)
    return g ? new Set(g.atoms) : null
  }, [molecule, highlight])
  const brokenKey = broken.join(',')
  const brokenSet = useMemo(() => new Set(brokenKey ? brokenKey.split(',').map(Number) : []), [brokenKey])

  const sticks = useMemo(() => {
    const out: { pos: THREE.Vector3; quat: THREE.Quaternion; len: number; key: string; dim: boolean }[] = []
    for (const [i, b] of molecule.bonds.entries()) {
      if (brokenSet.has(b.a) && brokenSet.has(b.b)) continue
      const a = molecule.atoms[b.a]
      const c = molecule.atoms[b.b]
      if (!a || !c) continue
      const va = new THREE.Vector3(a.x, a.y, a.z)
      const vc = new THREE.Vector3(c.x, c.y, c.z)
      const dir = vc.clone().sub(va)
      const len = dir.length()
      const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize())
      const mid = va.clone().add(vc).multiplyScalar(0.5)
      // Perpendicular offset so double and triple bonds draw as parallel sticks.
      const side = new THREE.Vector3().crossVectors(dir, Z)
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0)
      side.normalize().multiplyScalar(0.13)
      const n = b.order
      const dim = !!lit && !(lit.has(b.a) && lit.has(b.b))
      for (let k = 0; k < n; k++) {
        const t = n === 1 ? 0 : k - (n - 1) / 2
        out.push({ pos: mid.clone().addScaledVector(side, t * 1.6), quat, len, key: `${i}-${k}`, dim })
      }
    }
    return out
  }, [molecule, lit, brokenSet])

  const clickable = !!onAtomClick
  const setCursor = (c: string) => {
    if (clickable) document.body.style.cursor = c
  }
  useEffect(() => () => void (document.body.style.cursor = ''), [])

  return (
    <group>
      {molecule.atoms.map((a, i) => {
        const info = elements[a.el]
        const dim = !!lit && !lit.has(i)
        const selected = selectedAtom === i
        const isBroken = brokenSet.has(i)
        const r = (info?.radius ?? 0.4) * atomScale * (selected ? 1.25 : 1)
        return (
          <mesh
            key={i}
            geometry={sphere}
            position={[a.x, a.y, a.z]}
            scale={r}
            onClick={
              clickable
                ? (e: ThreeEvent<MouseEvent>) => {
                    e.stopPropagation()
                    // A drag to turn the model is not a tap.
                    if (e.delta <= 8) onAtomClick(i)
                  }
                : undefined
            }
            onPointerOver={clickable ? (e: ThreeEvent<PointerEvent>) => (e.stopPropagation(), setCursor('pointer')) : undefined}
            onPointerOut={clickable ? () => setCursor('') : undefined}
          >
            {/* Keyed on dim: three.js compiles `transparent` into the shader, so flipping it needs a fresh material. */}
            <meshStandardMaterial
              key={dim ? 'dim' : 'lit'}
              color={info?.colour ?? '#cccccc'}
              roughness={0.32}
              metalness={0.05}
              transparent={dim}
              depthWrite={!dim}
              opacity={dim ? DIM_ATOM : 1}
              emissive={selected || isBroken ? '#ffffff' : (info?.colour ?? '#000000')}
              emissiveIntensity={selected ? 0.45 : isBroken ? 0.6 : dim ? 0 : 0.06}
            />
          </mesh>
        )
      })}
      {atomScale < 1.8 &&
        sticks.map((s) => (
          <mesh key={s.key} geometry={stick} position={s.pos} quaternion={s.quat} scale={[1, s.len, 1]}>
            <meshStandardMaterial key={s.dim ? 'dim' : 'lit'} color="#C9CED6" roughness={0.5} transparent={s.dim} depthWrite={!s.dim} opacity={s.dim ? DIM_BOND : 1} />
          </mesh>
        ))}
    </group>
  )
}

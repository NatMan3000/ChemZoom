import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { elements } from '../content/elements'
import type { Molecule } from '../types/chem'

// Shared ball-and-stick renderer. Sits inside a <Canvas>; the caller owns camera, lights and controls.
// Keep the props stable: the sims and the compare and basics tiles import it too.

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
  /** Called with the atom under the pointer (null when it leaves). Tappable atoms also glow on hover. */
  onAtomHover?: (index: number | null) => void
  /**
   * With a lit group: how far (angstroms) from it the ghosted rest of the molecule reaches before it fades
   * away, so a lit unit can be framed large without the rest of a long chain running under the stage's
   * controls. Unset: the whole molecule is ghosted.
   */
  ghostReach?: number
  /**
   * AtomGroup id drawn with a soft outline round each of its atoms: which part is one repeat unit when the whole
   * piece is lit (D19). Calm on purpose, so a hovered or tapped atom still stands out over it.
   */
  outline?: string | null
}

const UP = new THREE.Vector3(0, 1, 0)
const Z = new THREE.Vector3(0, 0, 1)
const BOND_RADIUS = 0.09
// The rest of the molecule, when a group is lit: a pale, calm ghost of each atom's colour (finding 4: dark red
// and grey smudges at 16% read as dirt on the dark stage).
const DIM_ATOM = 0.34
const DIM_BOND = 0.24
const GHOST_FADE = 2.5 // angstroms over which a ghost fades out past ghostReach
const GHOST_BALL = 0.8 // ghosts are drawn a little smaller, so they read as background
const GHOST = new THREE.Color('#C3CCE6')
const ghostOf = (hex: string) => `#${new THREE.Color(hex).lerp(GHOST, 0.75).getHexString()}`
// The repeat-unit outline: a thin pale rim round each ball (a back-face shell a little bigger than the ball).
const OUTLINE_COLOUR = '#E4EAFF'
const OUTLINE_OPACITY = 0.5
const OUTLINE_WIDTH = 0.09 // angstroms, plus a share of the ball's own radius
const OUTLINE_SHARE = 0.07
const noRaycast = () => null

export function MoleculeView({ molecule, highlight = null, broken = [], onAtomClick, selectedAtom = null, atomScale = 1, onAtomHover, ghostReach, outline = null }: MoleculeViewProps) {
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
  // 0..1 per atom: how much of the ghost to draw (1 everywhere unless ghostReach is set).
  const ghost = useMemo(() => {
    const out = molecule.atoms.map(() => 1)
    if (!lit || ghostReach === undefined) return out
    const litPts = [...lit].map((i) => molecule.atoms[i]).filter(Boolean)
    molecule.atoms.forEach((a, i) => {
      if (lit.has(i)) return
      const d = Math.min(...litPts.map((b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)))
      out[i] = 1 - THREE.MathUtils.smoothstep(d, ghostReach, ghostReach + GHOST_FADE)
    })
    return out
  }, [molecule, lit, ghostReach])
  const outlined = useMemo(() => {
    if (!outline) return [] as number[]
    return molecule.groups.find((x) => x.id === outline)?.atoms.filter((i) => molecule.atoms[i]) ?? []
  }, [molecule, outline])
  const brokenKey = broken.join(',')
  const brokenSet = useMemo(() => new Set(brokenKey ? brokenKey.split(',').map(Number) : []), [brokenKey])

  const sticks = useMemo(() => {
    const out: { pos: THREE.Vector3; quat: THREE.Quaternion; len: number; key: string; dim: boolean; fade: number }[] = []
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
      const fade = Math.min(ghost[b.a] ?? 1, ghost[b.b] ?? 1)
      if (fade < 0.02) continue
      for (let k = 0; k < n; k++) {
        const t = n === 1 ? 0 : k - (n - 1) / 2
        out.push({ pos: mid.clone().addScaledVector(side, t * 1.6), quat, len, key: `${i}-${k}`, dim, fade })
      }
    }
    return out
  }, [molecule, lit, brokenSet, ghost])

  const clickable = !!onAtomClick
  const [hovered, setHovered] = useState<number | null>(null)
  const hover = (i: number | null) => {
    if (!clickable) return
    setHovered(i)
    onAtomHover?.(i)
  }
  // Only a tappable view glows; when the view stops being tappable the glow and the pointer go with it.
  const hot = clickable ? hovered : null
  useEffect(() => {
    document.body.style.cursor = hot !== null ? 'pointer' : ''
  }, [hot])
  useEffect(() => () => void (document.body.style.cursor = ''), [])

  return (
    <group>
      {molecule.atoms.map((a, i) => {
        const info = elements[a.el]
        const dim = !!lit && !lit.has(i)
        const fade = ghost[i] ?? 1
        if (fade < 0.02) return null
        const selected = selectedAtom === i
        const isHot = hot === i
        const isBroken = brokenSet.has(i)
        const r = (info?.radius ?? 0.4) * atomScale * (selected ? 1.25 : isHot ? 1.18 : dim ? GHOST_BALL : 1)
        const colour = info?.colour ?? '#cccccc'
        return (
          <mesh
            key={i}
            geometry={sphere}
            position={[a.x, a.y, a.z]}
            scale={r}
            userData={{ atomIndex: i }}
            onClick={
              clickable
                ? (e: ThreeEvent<MouseEvent>) => {
                    e.stopPropagation()
                    // A drag to turn the model is not a tap.
                    if (e.delta <= 8) onAtomClick(i)
                  }
                : undefined
            }
            onPointerOver={clickable ? (e: ThreeEvent<PointerEvent>) => (e.stopPropagation(), hover(i)) : undefined}
            onPointerOut={clickable ? () => hover(null) : undefined}
          >
            {/* Keyed on dim: three.js compiles `transparent` into the shader, so flipping it needs a fresh material. */}
            <meshStandardMaterial
              key={dim && !isHot ? 'dim' : 'lit'}
              color={dim && !isHot ? ghostOf(colour) : colour}
              roughness={0.32}
              metalness={0.05}
              transparent={dim && !isHot}
              depthWrite={!dim || isHot}
              opacity={dim && !isHot ? DIM_ATOM * fade : 1}
              emissive={selected || isBroken || isHot ? '#ffffff' : dim ? ghostOf(colour) : colour}
              emissiveIntensity={isHot ? 0.55 : selected ? 0.45 : isBroken ? 0.6 : dim ? 0.4 : 0.06}
            />
          </mesh>
        )
      })}
      {outlined.map((i) => {
        const a = molecule.atoms[i]
        const r = (elements[a.el]?.radius ?? 0.4) * atomScale
        return (
          <mesh key={`o${i}`} geometry={sphere} position={[a.x, a.y, a.z]} scale={r * (1 + OUTLINE_SHARE) + OUTLINE_WIDTH} raycast={noRaycast} renderOrder={-1}>
            <meshBasicMaterial color={OUTLINE_COLOUR} side={THREE.BackSide} transparent opacity={OUTLINE_OPACITY} depthWrite={false} />
          </mesh>
        )
      })}
      {atomScale < 1.8 &&
        sticks.map((s) => (
          <mesh key={s.key} geometry={stick} position={s.pos} quaternion={s.quat} scale={[1, s.len, 1]}>
            <meshStandardMaterial key={s.dim ? 'dim' : 'lit'} color={s.dim ? '#DCE2F2' : '#C9CED6'} roughness={0.5} transparent={s.dim} depthWrite={!s.dim} opacity={s.dim ? DIM_BOND * s.fade : 1} />
          </mesh>
        ))}
    </group>
  )
}

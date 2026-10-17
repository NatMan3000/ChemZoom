import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { elements } from '../../content/elements'
import type { ElementSymbol } from '../../types/chem'

// Colours, sizes and materials for the atom level. One material per kind of thing, shared by every mesh of
// that kind, so the cross-fade touches a handful of materials rather than every sphere.

export const ATOM_COLOURS = {
  proton: '#FF8A65', // warm coral: not an element colour, so it never reads as an oxygen
  neutron: '#9AA5C4', // calm slate
  own: '#FDE047', // this atom's electrons
  theirs: '#7DD3FC', // electrons a neighbour brought
  innerShell: '#A3AECB',
  outerShell: '#8B9CFF', // primary: the shell that bonds
  bond: '#C9CED6',
} as const

export const SIZES = {
  nucleon: 0.2,
  electron: 0.13,
  /** Electrons in a pair sit this far either side of the pair's middle. */
  pairGap: 0.2,
  /** Neighbour atoms sit this far from the centre, along the real bond direction. */
  neighbourAt: 5.5,
  /** Neighbour balls: element ball radius times this. */
  neighbourScale: 2.5,
  /** Sideways spacing of the parallel sticks of a double or triple bond. */
  multiBondGap: 0.44,
  ringTube: 0.022,
} as const

/** Shell radii, inner first: inside about 2.6 whatever the shell count, so nucleus and shells fit in 3. */
export function shellRadii(count: number): number[] {
  if (count <= 1) return [1.7]
  const inner = 1.15
  const outer = 2.55
  return Array.from({ length: count }, (_, k) => inner + ((outer - inner) * k) / (count - 1))
}

export interface AtomMaterials {
  proton: THREE.MeshStandardMaterial
  neutron: THREE.MeshStandardMaterial
  own: THREE.MeshBasicMaterial
  theirs: THREE.MeshBasicMaterial
  innerShell: THREE.MeshBasicMaterial
  outerShell: THREE.MeshBasicMaterial
  shellFill: THREE.MeshBasicMaterial
  bond: THREE.MeshBasicMaterial
  neighbour: Partial<Record<ElementSymbol, THREE.MeshStandardMaterial>>
}

interface Base {
  opacity: number
  transparent: boolean
  depthWrite: boolean
}
const BASE = '__atomBase'

function base(m: THREE.Material): Base {
  let b = m.userData[BASE] as Base | undefined
  if (!b) {
    b = { opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite }
    m.userData[BASE] = b
  }
  return b
}

const translucent = (colour: string, opacity: number) =>
  new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false })

/**
 * The scene's materials, made once per set of neighbour elements and disposed on unmount, with `opacity`
 * (0..1, the zoom's cross-fade) applied to every one of them.
 */
export function useAtomMaterials(neighbourEls: ElementSymbol[], opacity: number): AtomMaterials {
  const invalidate = useThree((s) => s.invalidate)
  const elKey = [...new Set(neighbourEls)].sort().join(',')
  const mats = useMemo<AtomMaterials>(() => {
    const neighbour: AtomMaterials['neighbour'] = {}
    for (const el of elKey ? (elKey.split(',') as ElementSymbol[]) : []) {
      const c = elements[el]?.colour ?? '#cccccc'
      neighbour[el] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, transparent: true, opacity: 0.34, depthWrite: false, emissive: c, emissiveIntensity: 0.05 })
    }
    return {
      proton: new THREE.MeshStandardMaterial({ color: ATOM_COLOURS.proton, roughness: 0.38, emissive: ATOM_COLOURS.proton, emissiveIntensity: 0.12 }),
      neutron: new THREE.MeshStandardMaterial({ color: ATOM_COLOURS.neutron, roughness: 0.45, emissive: ATOM_COLOURS.neutron, emissiveIntensity: 0.05 }),
      own: new THREE.MeshBasicMaterial({ color: ATOM_COLOURS.own }),
      theirs: new THREE.MeshBasicMaterial({ color: ATOM_COLOURS.theirs }),
      innerShell: translucent(ATOM_COLOURS.innerShell, 0.5),
      outerShell: translucent(ATOM_COLOURS.outerShell, 0.75),
      shellFill: translucent(ATOM_COLOURS.outerShell, 0.045),
      bond: translucent(ATOM_COLOURS.bond, 0.28),
      neighbour,
    }
  }, [elKey])

  useEffect(
    () => () => {
      for (const m of allMaterials(mats)) m.dispose()
    },
    [mats],
  )

  // Cross-fade: scale every material's own opacity. A material that was opaque turns transparent while faded;
  // three.js compiles that into the shader, so the flip needs a recompile.
  useEffect(() => {
    const f = Math.max(0, Math.min(1, opacity))
    const full = f >= 0.999
    for (const m of allMaterials(mats)) {
      const b = base(m)
      const transparent = b.transparent || !full
      if (m.transparent !== transparent) m.needsUpdate = true
      m.transparent = transparent
      m.opacity = b.opacity * f
      m.depthWrite = b.depthWrite && (full || f > 0.6)
    }
    invalidate()
  }, [mats, opacity, invalidate])

  return mats
}

function allMaterials(m: AtomMaterials): THREE.Material[] {
  const list: (THREE.Material | undefined)[] = [m.proton, m.neutron, m.own, m.theirs, m.innerShell, m.outerShell, m.shellFill, m.bond, ...Object.values(m.neighbour)]
  return list.filter((x): x is THREE.Material => !!x)
}

/** Geometries shared by the whole scene: unit sphere and unit stick, scaled per mesh. */
export function useAtomGeometry() {
  const geo = useMemo(
    () => ({
      sphere: new THREE.SphereGeometry(1, 24, 16),
      stick: new THREE.CylinderGeometry(1, 1, 1, 10),
    }),
    [],
  )
  useEffect(
    () => () => {
      geo.sphere.dispose()
      geo.stick.dispose()
    },
    [geo],
  )
  return geo
}

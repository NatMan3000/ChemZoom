import * as THREE from 'three'
import type { Molecule } from '../types/chem'
import { moleculeCentre } from '../three/molecule-geometry'

// Which atom the zoom dives into, and where it sits on the stage.

/**
 * The AtomScene is drawn in its own units, in the molecule's own frame (nucleus and shells within about 3,
 * neighbours at 5.5 along the real bond directions). On the stage it sits on the picked atom, scaled so its
 * faded neighbours land about where the real ones were (5.5 x 0.22 = 1.2 angstrom; real C-H 1.1, C-C 1.5), so
 * the dive from the molecule is one camera move. Small enough that the camera keeps moving in across the
 * hand-over (IN_FACTOR.molecule in zoomModel and OUT_FACTOR.atom are set against it).
 */
export const ATOM_SCENE_SCALE = 0.22

/** Radius of the whole AtomScene in its own units (the lane contract: everything inside 7). */
export const ATOM_SCENE_RADIUS = 7

/**
 * The atom shown when nothing was picked: the same rule as the panel's `defaultAtomIndex` (src/lib/atoms.ts,
 * panel lane): the first carbon in the lit group with 2+ carbon neighbours, else the first carbon in the group,
 * else the first carbon, else 0. Used only until the page passes its resolved `selectedAtom`.
 * At merge, replace this body with a call to that function so there is one rule.
 */
export function defaultAtomIndex(molecule: Molecule, groupId: string | null): number {
  const group = groupId ? molecule.groups.find((g) => g.id === groupId) : undefined
  const isC = (i: number) => molecule.atoms[i]?.el === 'C'
  const carbonNeighbours = (i: number) =>
    molecule.bonds.reduce((n, b) => n + ((b.a === i && isC(b.b)) || (b.b === i && isC(b.a)) ? 1 : 0), 0)
  if (group) {
    const backbone = group.atoms.find((i) => isC(i) && carbonNeighbours(i) >= 2)
    if (backbone !== undefined) return backbone
    const anyC = group.atoms.find(isC)
    if (anyC !== undefined) return anyC
  }
  const first = molecule.atoms.findIndex((a) => a.el === 'C')
  return first >= 0 ? first : 0
}

/** Where atom i sits on the stage (the molecule scene is drawn centred on the molecule's box). */
export function atomStagePosition(molecule: Molecule, i: number, out = new THREE.Vector3()): THREE.Vector3 {
  const a = molecule.atoms[i]
  if (!a) return out.set(0, 0, 0)
  return out.set(a.x, a.y, a.z).sub(moleculeCentre(molecule))
}

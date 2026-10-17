import * as THREE from 'three'
import type { Molecule } from '../types/chem'
import { moleculeCentre } from '../three/molecule-geometry'
import { defaultAtomIndex as pickDefaultAtom } from '../lib/atoms'

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

/** The atom shown when nothing was picked: one rule, the panel's (src/lib/atoms.ts). */
export function defaultAtomIndex(molecule: Molecule, groupId: string | null): number {
  return pickDefaultAtom(molecule, groupId) ?? 0
}

/** Where atom i sits on the stage (the molecule scene is drawn centred on the molecule's box). */
export function atomStagePosition(molecule: Molecule, i: number, out = new THREE.Vector3()): THREE.Vector3 {
  const a = molecule.atoms[i]
  if (!a) return out.set(0, 0, 0)
  return out.set(a.x, a.y, a.z).sub(moleculeCentre(molecule))
}

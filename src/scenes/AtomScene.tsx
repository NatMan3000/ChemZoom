import { elements } from '../content/elements'
import type { Molecule } from '../types/chem'

// The bottom of the zoom: ONE atom (spec/design-intent.md P7). STUB from the lead so the zoom lane can
// integrate it; the atom lane replaces this file. Keep the props stable.
//
// Scene units: the atom sits at the origin. Its nucleus and electron shells stay inside a radius of about 3;
// faded neighbour atoms sit along the real bond directions at about 5.5, so the whole scene fits a radius of 7.

export interface AtomSceneProps {
  molecule: Molecule
  /** Index into molecule.atoms of the atom to show. */
  atomIndex: number
  /** The material's accent colour, for anything that should read as "this filament". */
  accent: string
  /** 0..1, for the zoom's cross-fade. */
  opacity?: number
}

export function AtomScene({ molecule, atomIndex, opacity = 1 }: AtomSceneProps) {
  const atom = molecule.atoms[atomIndex]
  const info = atom ? elements[atom.el] : undefined
  return (
    <mesh>
      <sphereGeometry args={[2.5, 32, 24]} />
      <meshStandardMaterial color={info?.colour ?? '#cccccc'} transparent opacity={0.5 * opacity} />
    </mesh>
  )
}

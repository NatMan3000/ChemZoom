import * as THREE from 'three'
import { getMolecule, molecules } from '../../content'
import type { AtomGroup, Material, Molecule } from '../../types/chem'

// Reading Material fields for the sims. Everything a sim shows comes through here or straight off
// the Material, so a new material gets every sim without code changes.

/** A stable number per material id, so each material gets its own tangle on every device. */
export function seedOf(id: string, salt = 0): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return (h >>> 0) || 1
}

export const HOT = '#FF7A3D'
export const WATER_O = '#FF4D4D'
export const WATER_H = '#F4F4F4'

const _a = new THREE.Color()
const _b = new THREE.Color()
export function mix(a: string, b: string, t: number): string {
  _a.set(a)
  _b.set(b)
  return `#${_a.lerp(_b, Math.min(1, Math.max(0, t))).getHexString()}`
}

/** The ordered patches the heat sim draws and melts: crystals (semicrystalline) or hard islands (segmented). */
export type Patches = 'crystals' | 'islands' | null
export function patchesOf(m: Material): Patches {
  if (m.temps.meltC == null) return null
  if (m.morphology === 'semicrystalline') return 'crystals'
  if (m.morphology === 'segmented') return 'islands'
  return null
}

export const fmtC = (c: number) => `${Math.round(c)}°C`
export const rangeC = ([a, b]: [number, number]) => `${Math.round(a)} to ${Math.round(b)}°C`

export function moleculeOrNull(id: string | undefined): Molecule | null {
  if (!id) return null
  return molecules[id] ?? null
}

/** The bond sunlight snaps, as the two atoms MoleculeView's `broken` prop needs, or null. */
export function uvWeakSpot(m: Material): { molecule: Molecule; group: AtomGroup; atoms: number[] } | null {
  const spot = m.sim.uvWeakSpot
  if (!spot) return null
  const molecule = moleculeOrNull(spot.molecule)
  const group = molecule?.groups.find((g) => g.id === spot.group)
  if (!molecule || !group) return null
  const inGroup = new Set(group.atoms)
  // The highest-order bond inside the group is the one that snaps (C=C). Passing only its two atoms
  // hides just that bond; passing the whole group would also hide its C-H bonds.
  let best: { a: number; b: number; order: number } | null = null
  for (const b of molecule.bonds) {
    if (inGroup.has(b.a) && inGroup.has(b.b) && (!best || b.order > best.order)) best = b
  }
  return { molecule, group, atoms: best ? [best.a, best.b] : group.atoms }
}

/** The molecule that stands for a material's rubber (or, failing that, its oligomer). */
export function rubberMolecule(m: Material): Molecule {
  return moleculeOrNull(m.sim.uvWeakSpot?.molecule) ?? moleculeOrNull(m.sim.rubberBlobs?.molecule) ?? getMolecule(m.oligomer)
}

export const enclosureWords: Record<Material['print']['enclosure'], string> = {
  no: 'does not need an enclosure',
  helps: 'prints better in an enclosure',
  yes: 'needs an enclosure',
}

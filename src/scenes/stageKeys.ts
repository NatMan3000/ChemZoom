import type { StrandRole } from '../three/chains'
import type { Material, Morphology } from '../types/chem'

const TANGLE_ROLES: Record<Morphology, StrandRole[]> = {
  semicrystalline: ['chain', 'crystal', 'focus'],
  amorphous: ['chain', 'focus'],
  segmented: ['hard', 'soft', 'focus'],
  'rubber-toughened': ['chain', 'rubber', 'focus'],
}

/** Roles shown at the tangle step, for the on-stage colour key (matches tangleLayout in three/chains). */
export function tangleRoles(m: Material): StrandRole[] {
  return TANGLE_ROLES[m.morphology]
}

/** Roles shown at the chain step. */
export function chainRoles(m: Material): StrandRole[] {
  return m.morphology === 'segmented' ? ['hard', 'soft', 'focus'] : ['hard', 'focus']
}

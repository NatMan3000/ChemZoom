import type { MaterialId } from '../types/chem'
import type { SimDef } from './types'

// Lane C registers its sims here, in the order the app should list them.
export const sims: SimDef[] = []

export function simsFor(id: MaterialId): SimDef[] {
  return sims.filter((s) => s.appliesTo === 'all' || s.appliesTo.includes(id))
}

export type { SimDef, SimProps } from './types'

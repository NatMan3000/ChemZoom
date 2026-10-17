import { sims } from '../sims'
import type { SimDef } from '../sims/types'
import type { MaterialId } from '../types/chem'

// The app's view of the sims registry (src/sims/index.ts, owned by the sims lane).

export const allSims: SimDef[] = sims

export function simsForMaterial(id: MaterialId): SimDef[] {
  return allSims.filter((s) => s.appliesTo === 'all' || s.appliesTo.includes(id))
}

export function findSim(id: string | undefined): SimDef | undefined {
  return allSims.find((s) => s.id === id)
}

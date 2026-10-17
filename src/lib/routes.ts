import { materials } from '../content'
import type { SimDef } from '../sims/types'
import type { Material, MaterialId, ZoomLevel } from '../types/chem'
import { findSim } from './sims'

// Material page URLs. An experiment plays inside the material page, so it is a search param on the
// zoom step it was opened from: #/m/pla/molecule?experiment=heat. "Back to the zoom" drops the param.

export const EXPERIMENT_PARAM = 'experiment'

export function materialPath(id: MaterialId, level: ZoomLevel, experiment?: string | null): string {
  return experiment ? `/m/${id}/${level}?${EXPERIMENT_PARAM}=${encodeURIComponent(experiment)}` : `/m/${id}/${level}`
}

export function simApplies(sim: SimDef, id: MaterialId): boolean {
  return sim.appliesTo === 'all' || sim.appliesTo.includes(id)
}

/** The experiment named in the URL, if it exists and applies to this material. */
export function experimentFor(material: Material, simId: string | null | undefined): SimDef | null {
  const sim = findSim(simId ?? undefined)
  return sim && simApplies(sim, material.id) ? sim : null
}

/** The partner a paired experiment shows beside this material (warp: ABS beside PLA), if any. */
export function partnerFor(sim: SimDef, material: Material): Material | undefined {
  const pairId = sim.pairWith?.[material.id]
  return pairId ? materials[pairId] : undefined
}

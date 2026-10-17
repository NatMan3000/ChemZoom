import { materialList, molecules } from '../content'
import type { Material, Molecule, SourceRef } from '../types/chem'

/** Dedupe sources by URL, keeping the first label seen. */
export function uniqueSources(list: SourceRef[]): SourceRef[] {
  const seen = new Map<string, SourceRef>()
  for (const s of list) if (s?.url && !seen.has(s.url)) seen.set(s.url, s)
  return [...seen.values()]
}

/** Every molecule a material shows or names (oligomer, monomers, sim pieces) that exists in the data. */
export function moleculesFor(m: Material): Molecule[] {
  const ids = [m.oligomer, ...m.monomers, m.sim.hardSegments?.molecule, m.sim.rubberBlobs?.molecule, m.sim.uvWeakSpot?.molecule]
  return uniqueIds(ids).map((id) => molecules[id]).filter((x): x is Molecule => !!x)
}

function uniqueIds(ids: (string | undefined)[]): string[] {
  return [...new Set(ids.filter((x): x is string => !!x))]
}

/** All sources cited anywhere for a material: its own list, its facts, and its molecules. */
export function sourcesFor(m: Material): SourceRef[] {
  return uniqueSources([...m.sources, ...m.facts.flatMap((f) => f.sources), ...moleculesFor(m).flatMap((x) => x.sources)])
}

export function allMaterialSources() {
  return materialList.map((m) => ({ material: m, sources: sourcesFor(m) }))
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

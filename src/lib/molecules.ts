import { molecules } from '../content'
import type { Molecule } from '../types/chem'

/** Look a molecule up without throwing: the data grows over time, and a missing one should hide, not crash. */
export function getMoleculeSafe(id: string | undefined | null): Molecule | null {
  return (id && molecules[id]) || null
}

/** Element symbols in a molecule, most common first, for the atom legend. */
export function elementsIn(m: Molecule): { el: Molecule['atoms'][number]['el']; count: number }[] {
  const counts = new Map<Molecule['atoms'][number]['el'], number>()
  for (const a of m.atoms) counts.set(a.el, (counts.get(a.el) ?? 0) + 1)
  const order = ['C', 'H', 'O', 'N']
  return [...counts.entries()]
    .map(([el, count]) => ({ el, count }))
    .sort((a, b) => {
      const ia = order.indexOf(a.el)
      const ib = order.indexOf(b.el)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || b.count - a.count
    })
}

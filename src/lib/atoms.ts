import { elements } from '../content/elements'
import { atomModel } from '../scenes/atom/atomModel'
import type { Bond, ElementSymbol, Molecule } from '../types/chem'

// One atom in a molecule: which atom the zoom lands on by default, and how it joins in.
// Everything here is worked out from the molecule's own atoms and bonds, so a new material gets it free.

export interface Neighbour {
  index: number
  el: ElementSymbol
  order: Bond['order']
}

/** The atoms bonded to atom `i`, in bond order (strongest first), then by element. */
export function neighboursOf(molecule: Molecule, i: number): Neighbour[] {
  const out: Neighbour[] = []
  for (const b of molecule.bonds) {
    if (b.a === i) out.push({ index: b.b, el: molecule.atoms[b.b]?.el, order: b.order })
    else if (b.b === i) out.push({ index: b.a, el: molecule.atoms[b.a]?.el, order: b.order })
  }
  const rank: Record<string, number> = { C: 0, O: 1, N: 2, H: 9 }
  return out.filter((n) => !!n.el).sort((a, b) => b.order - a.order || (rank[a.el] ?? 5) - (rank[b.el] ?? 5) || a.index - b.index)
}

/**
 * The atom the zoom lands on when nothing was picked (spec/design-intent.md P7, plan T2): a backbone carbon
 * in the lit repeat unit (a carbon bonded to two or more carbons), else any carbon in that unit, else any
 * carbon, else the first atom. Null only for an empty molecule.
 */
export function defaultAtomIndex(molecule: Molecule, groupId: string | null): number | null {
  if (!molecule.atoms.length) return null
  const group = groupId ? molecule.groups.find((g) => g.id === groupId) : undefined
  const pool = group?.atoms.length ? group.atoms : molecule.atoms.map((_, i) => i)
  const carbons = pool.filter((i) => molecule.atoms[i]?.el === 'C')
  const backbone = carbons.find((i) => neighboursOf(molecule, i).filter((n) => n.el === 'C').length >= 2)
  if (backbone !== undefined) return backbone
  if (carbons.length) return carbons[0]
  const anyCarbon = molecule.atoms.findIndex((a) => a.el === 'C')
  return anyCarbon >= 0 ? anyCarbon : 0
}

export interface JoinStory {
  /** "4 of its own + 4 from its neighbours = 8": the sum the 3D scene shows on desktop, carried by the panel everywhere. */
  sum: string
  /** The plain-words story: "Carbon brings 4, its neighbours bring 4: a full set of 8." */
  line: string
  /** Deeper layer: bond orders, lone pairs and the sketch caveat. */
  deeper: string
  /** The neighbours, strongest bond first, for the hop buttons. */
  neighbours: (Neighbour & { aromatic: boolean })[]
}

/**
 * How atom `i` joins the molecule, told from the atom lane's model (src/scenes/atom/atomModel.ts) so the panel
 * and the 3D scene count the same electrons: its outer electrons, the shared pairs, and what is left as lone pairs.
 */
export function joinStory(molecule: Molecule, i: number): JoinStory | null {
  const a = atomModel(molecule, i)
  if (!a) return null
  const name = a.info.name
  const full = a.info.shells.length === 1 ? 2 : 8
  const fromNeighbours = a.sharedPairs // one electron from the far side of every shared pair
  const neighbours = neighboursOf(molecule, i).map((n) => ({ ...n, aromatic: a.bonds.some((b) => b.neighbour === n.index && b.aromatic) }))
  const who = a.bonds.length === 1 ? 'its neighbour brings' : 'its neighbours bring'
  const sum = `${a.outer} of its own + ${fromNeighbours} from ${a.bonds.length === 1 ? 'its neighbour' : 'its neighbours'} = ${a.around}`

  let line: string
  if (a.around !== full || a.unpaired) {
    // Unusual (charged, or a radical): say only what the counts say.
    line = `${name} shares ${a.sharedPairs} of its ${a.outer} outer electrons with ${a.bonds.length} ${a.bonds.length === 1 ? 'neighbour' : 'neighbours'}.`
  } else if (a.info.shells.length === 1) {
    const nb = neighbours[0] ? (elements[neighbours[0].el]?.name ?? neighbours[0].el).toLowerCase() : 'its neighbour'
    line = `One proton, one electron, and that electron goes straight into the bond. Shared with ${nb}, it gets a full set of 2.`
  } else if (a.lonePairs === 0) {
    line = `${name} brings ${a.outer}, ${who} ${fromNeighbours}: a full set of ${full}.`
  } else {
    const pairs = a.lonePairs === 1 ? 'one lone pair' : `${a.lonePairs === 2 ? 'two' : a.lonePairs === 3 ? 'three' : a.lonePairs} lone pairs`
    line = `${name} has ${a.outer} in its outer shell. It shares ${a.sharedPairs} in bonds and keeps the other ${a.lone} as ${pairs}.`
  }

  const parts = ['A double bond is two shared pairs, a triple bond three.']
  if (a.bonds.some((b) => b.aromatic)) parts.push('In a ring like this one the shared electrons spread round the whole ring, so each ring bond is really about one and a half pairs; the picture draws them as singles and doubles.')
  if (a.lonePairs > 0) parts.push(`Lone pairs are the part of ${name.toLowerCase()} that water molecules cling to.`)
  parts.push('This picture is a sketch: electrons are really spread-out clouds, not dots on rings.')
  return { sum, line, deeper: parts.join(' '), neighbours }
}

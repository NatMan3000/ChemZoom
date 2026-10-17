import { elements } from '../../content/elements'
import type { ElementInfo, ElementSymbol, Molecule } from '../../types/chem'

// The chemistry behind the atom level, kept free of three.js and React so a script can check the counts
// for every atom in every molecule (checkAtomCounts below).
//
// The picture is the Lewis / Bohr sketch: inner shells full, the outer shell is the one that bonds, every
// covalent bond is one shared pair per bond order (one electron from each atom), and whatever is left in the
// outer shell sits as lone pairs. Atoms in the data carry no charges today; a charged atom is still counted
// (outer electrons minus charge), and anything that does not add up is reported, never hidden.

export type Vec3 = [number, number, number]

export interface AtomBond {
  /** Index of the neighbouring atom in molecule.atoms. */
  neighbour: number
  el: ElementSymbol
  order: 1 | 2 | 3
  aromatic: boolean
  /** Unit vector from this atom to the neighbour, in the molecule's own frame. */
  dir: Vec3
}

export interface AtomModel {
  index: number
  info: ElementInfo
  protons: number
  neutrons: number
  /** Electrons per inner shell (all full). */
  innerShells: number[]
  /** Electrons the atom brings to its outer shell (after any charge). */
  outer: number
  bonds: AtomBond[]
  /** Shared pairs on this atom: one per bond order, so the sum of its bond orders. */
  sharedPairs: number
  /** Outer electrons not used in bonds. */
  lone: number
  lonePairs: number
  /** An odd one left over (a radical). None of the data has one; drawn on its own if it ever does. */
  unpaired: number
  /** Outer electrons around the atom counting both electrons of every shared pair: 8 for C, N, O; 2 for H. */
  around: number
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
export const normalise = (a: Vec3): Vec3 => {
  const l = len(a)
  return l < 1e-9 ? [0, 0, 1] : scale(a, 1 / l)
}

/** Any unit vector at right angles to v. */
export function perpendicular(v: Vec3): Vec3 {
  const pick: Vec3 = Math.abs(v[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]
  return normalise(cross(v, pick))
}

export function atomModel(molecule: Molecule, index: number): AtomModel | null {
  const atom = molecule.atoms[index]
  const info = atom ? elements[atom.el] : undefined
  if (!atom || !info) return null
  const here: Vec3 = [atom.x, atom.y, atom.z]
  const bonds: AtomBond[] = []
  for (const b of molecule.bonds) {
    const other = b.a === index ? b.b : b.b === index ? b.a : -1
    const o = molecule.atoms[other]
    if (other < 0 || !o) continue
    bonds.push({ neighbour: other, el: o.el, order: b.order, aromatic: !!b.aromatic, dir: normalise(sub([o.x, o.y, o.z], here)) })
  }
  const charge = atom.charge ?? 0
  const outer = (info.shells[info.shells.length - 1] ?? 0) - charge
  const sharedPairs = bonds.reduce((s, b) => s + b.order, 0)
  const lone = outer - sharedPairs
  const free = Math.max(0, lone)
  return {
    index,
    info,
    protons: info.number,
    neutrons: info.neutrons,
    innerShells: info.shells.slice(0, -1),
    outer,
    bonds,
    sharedPairs,
    lone,
    lonePairs: Math.floor(free / 2),
    unpaired: free % 2,
    around: free + 2 * sharedPairs,
  }
}

/**
 * Directions for the lone pairs, spread away from the bonds and from each other the way electron pairs push
 * apart (VSEPR). A one-bond atom (carbonyl O, nitrile N) keeps its lone pairs in the plane of its neighbour's
 * other bonds, which is where they really sit. Deterministic: no randomness, the same atom always draws the same.
 */
export function lonePairDirections(molecule: Molecule, model: AtomModel): Vec3[] {
  const n = model.lonePairs + model.unpaired
  if (n === 0) return []
  const bondDirs = model.bonds.map((b) => b.dir)

  // A starting guess that already lies in the right plane, then let the pairs push apart.
  const away = normalise(scale(bondDirs.reduce<Vec3>((s, d) => add(s, d), [0, 0, 0]), -1))
  let side: Vec3
  if (bondDirs.length === 1) {
    const b = model.bonds[0]
    const nb = molecule.atoms[b.neighbour]
    const next = molecule.bonds.map((x) => (x.a === b.neighbour ? x.b : x.b === b.neighbour ? x.a : -1)).find((i) => i >= 0 && i !== model.index)
    const far = next !== undefined ? molecule.atoms[next] : undefined
    const inPlane = nb && far ? sub([far.x, far.y, far.z], [nb.x, nb.y, nb.z]) : perpendicular(b.dir)
    // The part of that direction at right angles to the bond.
    side = normalise(sub(inPlane, scale(b.dir, dot(inPlane, b.dir))))
    if (len(side) < 1e-6) side = perpendicular(b.dir)
  } else if (bondDirs.length >= 2) {
    side = normalise(cross(bondDirs[0], bondDirs[1]))
    if (len(cross(bondDirs[0], bondDirs[1])) < 1e-6) side = perpendicular(bondDirs[0])
  } else side = [1, 0, 0]
  const base = len(away) > 1e-6 && bondDirs.length ? away : side
  const dirs: Vec3[] = []
  for (let k = 0; k < n; k++) {
    const t = n === 1 ? 0 : k / (n - 1) - 0.5
    dirs.push(normalise(add(base, scale(side, t * 2.4))))
  }
  if (bondDirs.length === 0 && n === 1) return dirs

  // Relax: each pair is pushed by the bonds and the other pairs, kept on the unit sphere.
  for (let it = 0; it < 120; it++) {
    for (let i = 0; i < dirs.length; i++) {
      let f: Vec3 = [0, 0, 0]
      const others = [...bondDirs, ...dirs.filter((_, j) => j !== i)]
      for (const o of others) {
        const d = sub(dirs[i], o)
        const l = Math.max(0.05, len(d))
        f = add(f, scale(d, 1 / (l * l * l)))
      }
      const tangent = sub(f, scale(dirs[i], dot(f, dirs[i])))
      dirs[i] = normalise(add(dirs[i], scale(tangent, 0.05)))
    }
  }
  return dirs
}

export interface Nucleon {
  pos: Vec3
  proton: boolean
}

/**
 * Protons and neutrons packed as a tight ball: points of a close-packed (FCC) lattice nearest the centre,
 * protons spread evenly through it. `r` is a nucleon's radius.
 */
export function packNucleus(protons: number, neutrons: number, r: number): Nucleon[] {
  const total = protons + neutrons
  if (total <= 0) return []
  if (total === 1) return [{ pos: [0, 0, 0], proton: protons === 1 }]
  const d = (2 * r * 0.92) / Math.SQRT2 // slight overlap so it reads as one packed lump
  const pts: Vec3[] = []
  const R = 4
  for (let i = -R; i <= R; i++)
    for (let j = -R; j <= R; j++)
      for (let k = -R; k <= R; k++) if ((((i + j + k) % 2) + 2) % 2 === 0) pts.push([i * d, j * d, k * d])
  // A centre a little off the lattice breaks ties, so small nuclei are lumps rather than flat plates.
  const c: Vec3 = [0.13 * d, 0.07 * d, 0.21 * d]
  pts.sort((a, b) => len(sub(a, c)) - len(sub(b, c)) || a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
  const chosen = pts.slice(0, total)
  const centroid = scale(chosen.reduce<Vec3>((s, p) => add(s, p), [0, 0, 0]), 1 / total)
  return chosen.map((p, i) => ({
    pos: sub(p, centroid),
    proton: Math.floor(((i + 1) * protons) / total) > Math.floor((i * protons) / total),
  }))
}

export const BOND_NAMES = { 1: 'Single bond', 2: 'Double bond', 3: 'Triple bond' } as const

/** What a bond is, in words for the label. */
export function bondWords(b: Pick<AtomBond, 'order' | 'aromatic'>): { name: string; pairs: string } {
  const pairs = b.order === 1 ? '1 shared pair' : `${b.order} shared pairs`
  // In a benzene ring the shared electrons spread round the whole ring: each bond is really about one and a
  // half pairs. The data draws one fixed pattern of singles and doubles (Kekule), so the label says so.
  if (b.aromatic) return { name: 'Ring bond', pairs: `about 1.5 shared pairs, drawn as ${b.order}` }
  return { name: BOND_NAMES[b.order], pairs }
}

/**
 * Every atom in every molecule adds up: shared pairs equal the sum of its bond orders, the electrons on the
 * picture equal the proton count (a neutral atom), lone electrons are never negative, and C, N, O end with 8
 * outer electrons around them counting shared ones, H with 2. Returns the problems found (empty when fine).
 */
export function checkAtomCounts(molecules: Molecule[]): { atoms: number; problems: string[] } {
  const problems: string[] = []
  let atoms = 0
  for (const m of molecules) {
    for (let i = 0; i < m.atoms.length; i++) {
      atoms++
      const at = `${m.id} atom ${i} (${m.atoms[i].el})`
      const a = atomModel(m, i)
      if (!a) {
        problems.push(`${at}: no element data`)
        continue
      }
      const orderSum = m.bonds.filter((b) => b.a === i || b.b === i).reduce((s, b) => s + b.order, 0)
      if (a.sharedPairs !== orderSum) problems.push(`${at}: ${a.sharedPairs} shared pairs, bond orders sum to ${orderSum}`)
      const shellSum = a.info.shells.reduce((s, x) => s + x, 0)
      if (shellSum !== a.protons) problems.push(`${at}: shells hold ${shellSum} electrons, ${a.protons} protons`)
      const drawn = a.innerShells.reduce((s, x) => s + x, 0) + 2 * a.lonePairs + a.unpaired + a.sharedPairs
      if (drawn !== a.protons - (m.atoms[i].charge ?? 0)) problems.push(`${at}: ${drawn} own electrons drawn, expected ${a.protons}`)
      if (a.lone < 0) problems.push(`${at}: more bonds (${a.sharedPairs}) than outer electrons (${a.outer})`)
      if (a.unpaired) problems.push(`${at}: an unpaired electron`)
      const full = a.info.symbol === 'H' ? 2 : 8
      if (['H', 'C', 'N', 'O', 'F', 'Cl'].includes(a.info.symbol) && a.around !== full)
        problems.push(`${at}: ${a.around} outer electrons around it, a full shell is ${full}`)
      if (m.atoms[i].el === 'C' && a.bonds.length && a.lonePairs !== 0) problems.push(`${at}: carbon with a lone pair`)
      const lp = lonePairDirections(m, a)
      if (lp.length !== a.lonePairs + a.unpaired) problems.push(`${at}: ${lp.length} lone pair directions for ${a.lonePairs} pairs`)
      for (const d of lp) if (!d.every(Number.isFinite)) problems.push(`${at}: lone pair direction is not a number`)
    }
  }
  return { atoms, problems }
}

/**
 * The direction to look at this atom from (a unit vector from the atom towards the camera) so its bonds and
 * lone pairs spread out across the view rather than pointing at you: the view where the shortest-looking of
 * them looks as long as possible. Flat atoms (a carbonyl carbon) are seen face on; a four-bond carbon is seen
 * along the axis that shows its four bonds as a cross. `prefer` (for example the direction the camera already
 * looks from) breaks ties, so the zoom does not swing round more than it needs to.
 */
export function bestViewDirection(molecule: Molecule, index: number, prefer: Vec3 = [0, 0.12, 1]): Vec3 {
  const model = atomModel(molecule, index)
  if (!model) return normalise(prefer)
  const dirs = [...model.bonds.map((b) => b.dir), ...lonePairDirections(molecule, model)]
  const p = normalise(prefer)
  if (dirs.length === 0) return p
  let best = p
  let bestScore = -Infinity
  const n = 600
  for (let k = 0; k < n; k++) {
    // Fibonacci sphere: an even, deterministic spread of candidate directions.
    const y = 1 - (2 * (k + 0.5)) / n
    const r = Math.sqrt(1 - y * y)
    const phi = k * Math.PI * (3 - Math.sqrt(5))
    const v: Vec3 = [Math.cos(phi) * r, y, Math.sin(phi) * r]
    const shortest = Math.min(...dirs.map((d) => Math.sqrt(Math.max(0, 1 - dot(d, v) ** 2))))
    const score = shortest + 0.08 * dot(v, p) - 0.05 * Math.abs(v[1])
    if (score > bestScore) {
      bestScore = score
      best = v
    }
  }
  return best
}

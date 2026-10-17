import * as THREE from 'three'
import { moleculeCentre, moleculeHalfExtents } from '../three/molecule-geometry'
import type { Material, Molecule, ZoomLevel } from '../types/chem'
import { bestViewDirection } from './atom/atomModel'
import { ATOM_SCENE_RADIUS, ATOM_SCENE_SCALE, atomStagePosition } from './atomPick'
import { chainLayout, SPOOL_TAIL_TIP, STRAND_CUT_FACE, tangleFrame } from './sceneLayout'

// Where the camera sits at each level's home view, and what each level's zoom heads for.

export const FOV = 38

/** Ball radii x4 is close to real van der Waals sizes. */
export const SPACE_FILL_SCALE = 4

/**
 * The part of the stage a subject is framed in. On a desktop the zoom rail covers the stage's left edge
 * (about 190 px wide at 1920x1080), so the subject is fitted to the width right of it and centred there
 * (finding 4: nothing important under the zoom rail). On a phone the rail sits under the stage.
 */
export interface StageFrame {
  /** Aspect of the free area, used to fit subjects. */
  aspect: number
  /** How far right of the canvas centre the free area's centre sits, in CSS pixels. */
  shiftPx: number
}

export function stageFrame(width: number, height: number): StageFrame {
  const reserve = width >= 768 ? Math.min(210, width * 0.18) : 0
  return { aspect: Math.max(0.2, (width - reserve) / Math.max(1, height)), shiftPx: reserve / 2 }
}

export interface Home {
  /** Where the camera looks at the level's home view. */
  target: THREE.Vector3
  /** Camera distance at home. */
  dist: number
  /** Unit vector from the target to the camera at home. */
  dir: THREE.Vector3
  /** What zooming in heads for, and the point the scene grows about as it hands over to the next level. */
  exit: THREE.Vector3
}

/** Distance at which a sphere of radius r fills the view, whichever of width and height is tighter. */
export function fitDistance(r: number, aspect: number) {
  const v = THREE.MathUtils.degToRad(FOV)
  const h = 2 * Math.atan(Math.tan(v / 2) * aspect)
  return r / Math.sin(Math.min(v, h) / 2)
}

/** Distance at which a box (half-extents, seen face on along z) fills the view with a margin. */
function fitBoxDistance(half: THREE.Vector3, aspect: number, margin: number) {
  const v = THREE.MathUtils.degToRad(FOV)
  const tv = Math.tan(v / 2)
  const th = tv * aspect
  return Math.max((half.x * margin) / th, (half.y * margin) / tv) + half.z
}

/**
 * Where the camera looks at the molecule step when a group is lit: the group's centre, seen from
 * the side that shows it widest (rings face on), framed with a little of its neighbours.
 */
function groupFocus(molecule: Molecule, groupId: string | null): { centre: THREE.Vector3; dir: THREE.Vector3; half: THREE.Vector3 } | null {
  const g = groupId ? molecule.groups.find((x) => x.id === groupId) : undefined
  if (!g || !g.atoms.length) return null
  const offset = moleculeCentre(molecule)
  const pts = g.atoms.map((i) => molecule.atoms[i]).filter(Boolean).map((a) => new THREE.Vector3(a.x, a.y, a.z).sub(offset))
  if (!pts.length) return null
  const centre = pts.reduce((c, p) => c.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length)
  const rel = pts.map((p) => p.clone().sub(centre))

  // Pick the view direction along which the group is thinnest (so it looks widest), leaning to the front.
  let best = new THREE.Vector3(0, 0.12, 1).normalize()
  let bestScore = Infinity
  const n = 160
  for (let k = 0; k < n; k++) {
    const y = 1 - (2 * (k + 0.5)) / n
    if (Math.abs(y) > 0.8) continue // keep away from the poles, where orbiting flips
    const r = Math.sqrt(1 - y * y)
    const phi = k * Math.PI * (3 - Math.sqrt(5))
    const d = new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r)
    if (d.z < 0) d.negate()
    const depth = rel.reduce((sum, p) => sum + p.dot(d) ** 2, 0) / rel.length
    const score = depth + (1 - d.z) * 0.15
    if (score < bestScore) {
      bestScore = score
      best = d
    }
  }
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), best).normalize()
  const up = new THREE.Vector3().crossVectors(best, right).normalize()
  const half = new THREE.Vector3()
  for (const p of rel) {
    half.x = Math.max(half.x, Math.abs(p.dot(right)))
    half.y = Math.max(half.y, Math.abs(p.dot(up)))
    half.z = Math.max(half.z, Math.abs(p.dot(best)))
  }
  // The lit unit framed large (finding 4): a ball's width of margin, not several angstroms of neighbours.
  half.addScalar(1.3)
  half.x = Math.max(half.x, 3.6)
  half.y = Math.max(half.y, 2.6)
  return { centre, dir: best, half }
}

const v3 = (a: [number, number, number]) => new THREE.Vector3(...a)

function simple(dir: [number, number, number], r: number, aspect: number, target: THREE.Vector3, exit: THREE.Vector3): Home {
  return { target: target.clone(), dist: fitDistance(r, aspect), dir: v3(dir).normalize(), exit: exit.clone() }
}

export interface PoseInputs {
  material: Material
  molecule: Molecule | null
  frame: StageFrame
  /** Lit group at the molecule step. */
  highlight: string | null
  /** Ball scale at the molecule step (space-filling). */
  atomScale: number
  /** The atom the zoom heads for at the molecule step, and shows at the atom step. */
  atom: number
}

export function homeFor(level: ZoomLevel, o: PoseInputs): Home {
  const aspect = o.frame.aspect
  switch (level) {
    case 'spool':
      return simple([0.62, 0.34, 0.72], 6.6, aspect, new THREE.Vector3(), SPOOL_TAIL_TIP)
    case 'strand':
      return simple([0.5, 0.3, 0.81], 3.4, aspect, v3([-2.2, 0, 0.6]), STRAND_CUT_FACE)
    case 'tangle':
      return simple([0.1, 0.18, 1], 5.7, aspect, new THREE.Vector3(), tangleFrame(o.material.morphology).pivot)
    case 'chain': {
      const c = chainLayout()
      return simple([0, 0.22, 1], aspect < 1 ? 4.2 : 4.8, aspect, new THREE.Vector3(), c.points[c.focus])
    }
    case 'molecule': {
      const exit = o.molecule ? atomStagePosition(o.molecule, o.atom) : new THREE.Vector3()
      const focus = o.molecule ? groupFocus(o.molecule, o.highlight) : null
      if (focus) {
        if (o.atomScale > 1) focus.half.addScalar(0.4 * o.atomScale)
        return { target: focus.centre, dist: fitBoxDistance(focus.half, aspect, 1.08), dir: focus.dir, exit }
      }
      // Fit the molecule's box, not a sphere round it: long chain pieces fill a wide stage properly.
      const half = o.molecule ? moleculeHalfExtents(o.molecule, o.atomScale) : new THREE.Vector3(5, 3, 3)
      return { target: new THREE.Vector3(), dist: fitBoxDistance(half, aspect, 1.12), dir: v3([0, 0.12, 1]).normalize(), exit }
    }
    case 'atom': {
      const p = o.molecule ? atomStagePosition(o.molecule, o.atom) : new THREE.Vector3()
      const near = o.molecule ? (groupFocus(o.molecule, o.highlight)?.dir ?? v3([0, 0.12, 1]).normalize()) : v3([0, 0.12, 1]).normalize()
      const dir = o.molecule ? atomViewDirection(o.molecule, o.atom, near) : near
      // A little room past radius 7 for the atom's own card, which sits beside its outer shell.
      return { target: p, dist: fitDistance(ATOM_SCENE_RADIUS * ATOM_SCENE_SCALE, Math.min(aspect, 1.6)) * 1.04, dir, exit: p.clone() }
    }
  }
}

const viewCache = new Map<string, THREE.Vector3>()

/**
 * The direction to see one atom from so its bonds and lone pairs spread across the view (the atom lane's
 * bestViewDirection), leaning toward `prefer` (the way the camera already looks) so the dive swings no more
 * than it must. Cached: the search tries 600 directions and the zoom asks every frame.
 */
export function atomViewDirection(molecule: Molecule, index: number, prefer: THREE.Vector3): THREE.Vector3 {
  const key = `${molecule.id}:${index}:${prefer.x.toFixed(1)},${prefer.y.toFixed(1)},${prefer.z.toFixed(1)}`
  let d = viewCache.get(key)
  if (!d) {
    d = new THREE.Vector3(...bestViewDirection(molecule, index, [prefer.x, prefer.y, prefer.z])).normalize()
    if (viewCache.size > 200) viewCache.clear()
    viewCache.set(key, d)
  }
  return d.clone()
}

import * as THREE from 'three'
import { moleculeCentre, moleculeHalfExtents } from '../three/molecule-geometry'
import type { Material, Molecule, ZoomLevel } from '../types/chem'
import { bestViewDirection } from './atom/atomModel'
import { ATOM_SCENE_RADIUS, ATOM_SCENE_SCALE, atomStagePosition } from './atomPick'
import { cameraQuat, CHAIN_UNIT_HALF, CHAIN_UNIT_R, CHAIN_VIEW, chainLayout, SPOOL_TAIL_DIR, SPOOL_TAIL_TIP, SPOOL_TUBE, STRAND_AXIS, STRAND_CUT_FACE, STRAND_R, TANGLE_R95, TANGLE_VIEW, tangleFrame } from './sceneLayout'

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
  /** Which way the piece at `exit` runs (unit), when it has a direction: the next level lies along it. */
  exitAxis?: THREE.Vector3
  /** True when exitAxis has a sense (the tail points out of the spool), not just a line (a chain). */
  exitDirected?: boolean
  /** When the next level is built to fit this one exactly: its frame turned into this one's (the strand lies along the tail; the tangle's bright chain is the chain level's chain). */
  exitFrame?: THREE.Quaternion
  /** How big the piece at `exit` is (a radius or half-length), in this level's units. */
  exitSize: number
  /** Where the piece the previous level zoomed into sits in this level: it is laid over the previous level's exit. */
  entry: THREE.Vector3
  /** Which way that piece runs here (unit), when it has a direction. */
  entryAxis?: THREE.Vector3
  /** Its size here, in the same sense as the previous level's exitSize. */
  entrySize: number
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
function groupFocus(
  molecule: Molecule,
  groupId: string | null,
): { centre: THREE.Vector3; dir: THREE.Vector3; half: THREE.Vector3; unitHalfAlong: (axis: THREE.Vector3) => number } | null {
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
  const unitHalfAlong = (axis: THREE.Vector3) => rel.reduce((m, p) => Math.max(m, Math.abs(p.dot(axis))), 0)
  return { centre, dir: best, half, unitHalfAlong }
}

const v3 = (a: [number, number, number]) => new THREE.Vector3(...a)

function simple(dir: THREE.Vector3 | [number, number, number], r: number, aspect: number, target: THREE.Vector3, exit: THREE.Vector3): Home {
  const d = Array.isArray(dir) ? v3(dir) : dir.clone()
  return { target: target.clone(), dist: fitDistance(r, aspect), dir: d.normalize(), exit: exit.clone(), exitSize: 1, entry: target.clone(), entrySize: 1 }
}

/** `dir` turned about the axis's line until it sits `angle` radians from `axis`, keeping which side it is on. */
export function tiltToward(dir: THREE.Vector3, axis: THREE.Vector3, angle: number): THREE.Vector3 {
  const perp = dir.clone().addScaledVector(axis, -dir.dot(axis))
  if (perp.lengthSq() < 1e-8) perp.set(0, 1, 0).addScaledVector(axis, -axis.y)
  perp.normalize()
  return axis.clone().multiplyScalar(Math.cos(angle)).addScaledVector(perp, Math.sin(angle)).normalize()
}

const SPOOL_DIR = v3([0.62, 0.34, 0.72]).normalize()
/** The strand's home view: the spool's view swung round toward the tail's tip until its cut face shows, the strand still running the same way across the stage. */
const STRAND_DIR = tiltToward(SPOOL_DIR, STRAND_AXIS, THREE.MathUtils.degToRad(52))

/** The molecule's long axis (unit): the main axis of its atoms, the way a chain piece runs. Cached per molecule. */
const axisCache = new Map<string, THREE.Vector3>()
export function moleculeAxis(molecule: Molecule): THREE.Vector3 {
  const hit = axisCache.get(molecule.id)
  if (hit) return hit.clone()
  const c = moleculeCentre(molecule)
  const m = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (const a of molecule.atoms) {
    const p = [a.x - c.x, a.y - c.y, a.z - c.z]
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i * 3 + j] += p[i] * p[j]
  }
  // Power iteration for the largest eigenvector of the spread.
  let v = new THREE.Vector3(1, 0.1, 0.05).normalize()
  for (let k = 0; k < 40; k++) {
    v = new THREE.Vector3(m[0] * v.x + m[1] * v.y + m[2] * v.z, m[3] * v.x + m[4] * v.y + m[5] * v.z, m[6] * v.x + m[7] * v.y + m[8] * v.z)
    if (v.lengthSq() < 1e-12) {
      v.set(1, 0, 0)
      break
    }
    v.normalize()
  }
  axisCache.set(molecule.id, v.clone())
  return v
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
    case 'spool': {
      const h = simple(SPOOL_DIR, 6.6, aspect, new THREE.Vector3(), SPOOL_TAIL_TIP)
      return { ...h, exitAxis: SPOOL_TAIL_DIR.clone(), exitDirected: true, exitSize: SPOOL_TUBE, exitFrame: new THREE.Quaternion() }
    }
    case 'strand': {
      // The cut face a little low and to the tail's side, the strand running back across the stage behind it.
      const h = simple(STRAND_DIR, 3.4, aspect, STRAND_CUT_FACE.clone().addScaledVector(STRAND_AXIS, -1.7), STRAND_CUT_FACE)
      // Leaves as a patch of the cut face a third of its radius across: the tangle is a tiny piece of the cross-section.
      return { ...h, entry: STRAND_CUT_FACE.clone(), entryAxis: STRAND_AXIS.clone(), entrySize: STRAND_R, exitSize: STRAND_R * 0.35 }
    }
    case 'tangle': {
      const t = tangleFrame(o.material.morphology)
      const focusR = t.layout.tubes.find((x) => x.role === 'focus')?.radius ?? 0.08
      const h = simple(TANGLE_VIEW, 5.7, aspect, new THREE.Vector3(), t.pivot)
      // Enters as the whole cut face (the tangle is what the face is made of); leaves as its focus chain.
      return { ...h, entrySize: TANGLE_R95, exitAxis: t.pivotAxis.clone(), exitSize: focusR, exitFrame: t.chainFrame.clone() }
    }
    case 'chain': {
      const c = chainLayout()
      const h = simple(CHAIN_VIEW, aspect < 1 ? 4.2 : 4.8, aspect, new THREE.Vector3(), c.points[c.focus])
      const axis = c.tangents[c.focus].clone()
      // Enters as the chain itself (the bright unit's capsule radius); leaves as that one unit, end to end.
      return { ...h, entry: c.points[c.focus].clone(), entryAxis: axis, entrySize: CHAIN_UNIT_R, exitAxis: axis.clone(), exitSize: CHAIN_UNIT_HALF }
    }
    case 'molecule': {
      const exit = o.molecule ? atomStagePosition(o.molecule, o.atom) : new THREE.Vector3()
      const focus = o.molecule ? groupFocus(o.molecule, o.highlight) : null
      const axis = o.molecule ? moleculeAxis(o.molecule) : new THREE.Vector3(1, 0, 0)
      const base = { exit, exitSize: 1, entryAxis: axis }
      if (focus) {
        // Enters as the chain's bright unit: the lit unit, its length along the chain matched to the capsule's.
        const unitHalf = Math.max(1.2, focus.unitHalfAlong(axis) + 0.5)
        if (o.atomScale > 1) focus.half.addScalar(0.4 * o.atomScale)
        return { ...base, target: focus.centre, dist: fitBoxDistance(focus.half, aspect, 1.08), dir: focus.dir, entry: focus.centre.clone(), entrySize: unitHalf }
      }
      // Fit the molecule's box, not a sphere round it: long chain pieces fill a wide stage properly.
      const half = o.molecule ? moleculeHalfExtents(o.molecule, o.atomScale) : new THREE.Vector3(5, 3, 3)
      return { ...base, target: new THREE.Vector3(), dist: fitBoxDistance(half, aspect, 1.12), dir: v3([0, 0.12, 1]).normalize(), entry: new THREE.Vector3(), entrySize: 1.6 }
    }
    case 'atom': {
      const p = o.molecule ? atomStagePosition(o.molecule, o.atom) : new THREE.Vector3()
      const near = o.molecule ? (groupFocus(o.molecule, o.highlight)?.dir ?? v3([0, 0.12, 1]).normalize()) : v3([0, 0.12, 1]).normalize()
      const dir = o.molecule ? atomViewDirection(o.molecule, o.atom, near) : near
      // A little room past radius 7 for the atom's own card, which sits beside its outer shell.
      return { target: p, dist: fitDistance(ATOM_SCENE_RADIUS * ATOM_SCENE_SCALE, Math.min(aspect, 1.6)) * 1.04, dir, exit: p.clone(), exitSize: 1, entry: p.clone(), entrySize: 1 }
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


/**
 * How the incoming level is laid over the outgoing one across a hand-over: B's entry piece sits on A's exit
 * piece, `k` times smaller (B units to A units) and turned by `rotation` (B's frame into A's), so the piece you
 * zoomed into carries on as the next level, the same way round (desktop standard, Nathan 17 Oct).
 *
 * Where the next level was built to fit (exitFrame) that fit is used as it stands. Where both pieces have a direction (the tail and the strand, a chain and its capsules, the bright unit and the
 * molecule's backbone) they are lined up, and the free turn about that line is the one that leaves the camera
 * least to turn, swing and roll together (`dirLo`: the camera's direction at the outgoing side, A's frame;
 * `dirHi`: where it ends, B's frame). Where the incoming level has no direction (the tangle a cut face is made of), B is turned so the
 * camera's view of it at the end is its view at the start: a straight dolly in, nothing turning on screen.
 */
export function linkBetween(A: Home, B: Home, dirLo: THREE.Vector3, dirHi: THREE.Vector3): { k: number; rotation: THREE.Quaternion } {
  const k = A.exitSize / B.entrySize
  if (A.exitFrame) return { k, rotation: A.exitFrame.clone() }
  const ax = A.exitAxis
  if (!ax || !B.entryAxis) return { k, rotation: cameraQuat(dirLo).multiply(cameraQuat(dirHi).invert()) }
  // Search the free turn about the line (and, for an undirected piece, which way along it) for the one that
  // changes the camera's view least, swing and roll together: the start view, seen in B's frame, against B's end view.
  const qLo = cameraQuat(dirLo)
  const qHi = cameraQuat(dirHi)
  let best = new THREE.Quaternion()
  let bestScore = Infinity
  const turn = new THREE.Quaternion()
  for (const sign of A.exitDirected ? [1] : [1, -1]) {
    const r0 = new THREE.Quaternion().setFromUnitVectors(B.entryAxis.clone().multiplyScalar(sign), ax)
    for (let i = 0; i < 144; i++) {
      const r = turn.setFromAxisAngle(ax, (i / 144) * Math.PI * 2).clone().multiply(r0)
      const startInB = r.clone().invert().multiply(qLo)
      const score = startInB.angleTo(qHi)
      if (score < bestScore) {
        bestScore = score
        best = r
      }
    }
  }
  return { k, rotation: best }
}

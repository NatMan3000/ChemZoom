import * as THREE from 'three'
import { pulledChain, rng, tangleLayout, type TangleLayout } from '../three/chains'
import type { Morphology } from '../types/chem'

// Layout shared by a scene and the zoom director: where each scene's "next thing" sits, so the zoom can head
// for it (the loose end of the spool, the cut face of the strand, the chain we pull out, the unit we zoom into).
// Deterministic and cached: the scene and the director see the same numbers.

// ---------------------------------------------------------------- spool

/** Spool dimensions SpoolScene builds with (scene units, about 20 mm each). */
export const SPOOL_WIDTH = 3.3
export const SPOOL_WIND_R = 4.25
/** Filament radius on the spool, a touch fat so the winding reads at the spool's distance. */
export const SPOOL_TUBE = 0.068

/**
 * The loose end, in stage units (the spool lies on its side, its axis along x). It is the last turn of the top
 * layer peeling off: it lies in the winding over the back of the top, then springs up and forward off the top in
 * a widening curl and ends, cut, standing clear of the winding's outline, midway between the flanges. So it
 * reads against the dark from the spool's home view, the zoom reaches it without passing through a flange, and
 * its cut face looks back toward the viewer. Measured round the axis from straight up
 * toward the viewer (+z).
 */
const TAIL_FROM = THREE.MathUtils.degToRad(-45)
const TAIL_TO = THREE.MathUtils.degToRad(15)
/** Where along the tail it starts to lift off the winding, and how far off it has sprung at the tip. */
const TAIL_LIFT_FROM = 0.5
const TAIL_LIFT = 1.3
function tailPoint(s: number): THREE.Vector3 {
  const a = THREE.MathUtils.lerp(TAIL_FROM, TAIL_TO, s)
  const lift = s < TAIL_LIFT_FROM ? 0 : TAIL_LIFT * ((s - TAIL_LIFT_FROM) / (1 - TAIL_LIFT_FROM)) ** 2
  const r = SPOOL_WIND_R - SPOOL_TUBE + lift
  return new THREE.Vector3(-1.1 + 0.5 * s * s, r * Math.cos(a), r * Math.sin(a))
}
const TAIL_POINTS = Array.from({ length: 41 }, (_, i) => tailPoint(i / 40))
/** The loose end's centre line, stage units, from inside the winding (0) to the cut tip (1). */
export const spoolTailCurve = () => new THREE.CatmullRomCurve3(TAIL_POINTS, false, 'centripetal')

/** The tip of the spool's loose end, in stage units: what the spool's zoom heads for. */
export const SPOOL_TAIL_TIP = TAIL_POINTS[TAIL_POINTS.length - 1].clone()

/** Points along the free part of the loose end (where it has lifted off the winding), tip last: what must stay in clear sight as you zoom in. */
export const SPOOL_TAIL_SIGHT = [0.62, 0.75, 0.88, 1].map((s) => tailPoint(s))

/** Which way the loose end points at its tip (unit, stage units): the strand level continues it. */
export const SPOOL_TAIL_DIR = spoolTailCurve().getTangentAt(1).normalize()

/**
 * How much of the loose end, from its far end, fades into nothing (as a fraction of its length): the part lying
 * in the winding. When the rest of the spool fades out at the hand-over, the end you zoomed into fades away into
 * the distance instead of stopping at an open tube end.
 */
export const TAIL_FADE_FROM = 0.06
export const TAIL_FADE_TO = 0.3

/** Flange size and place (SpoolScene builds them round its own y axis, at y = side * SPOOL_FLANGE_Y). */
export const SPOOL_FLANGE_R = 5
export const SPOOL_FLANGE_T = 0.16
export const SPOOL_FLANGE_Y = SPOOL_WIDTH / 2 + SPOOL_FLANGE_T / 2
export const SPOOL_FLANGE_SIDES = [-1, 1] as const

/** The spool's parts the zoom fades apart (ZoomStage): the loose end, the wound body, and each flange. */
export const spoolPart = {
  end: 'spool-end',
  body: 'spool-body',
  flange: (side: number) => `spool-flange${side}`,
}

/**
 * How much the flange on `side` stands between `eye` and `point` (both in the spool's stage frame, the axis along
 * x), 0 to 1: 1 when the line of sight crosses the flange well inside its rim, easing to 0 just past the rim.
 * The spool lies on its side with a quarter turn about z, so the flange at local y = side * Y sits at x = -side * Y.
 */
export function flangeInTheWay(eye: THREE.Vector3, point: THREE.Vector3, side: number): number {
  const x = -side * SPOOL_FLANGE_Y
  const dx = eye.x - point.x
  if (Math.abs(dx) < 1e-9) return 0
  const t = (x - point.x) / dx
  if (t <= 0 || t >= 1) return 0
  const y = point.y + t * (eye.y - point.y)
  const z = point.z + t * (eye.z - point.z)
  return 1 - THREE.MathUtils.smoothstep(Math.hypot(y, z), SPOOL_FLANGE_R - 0.1, SPOOL_FLANGE_R + 0.5)
}

// ---------------------------------------------------------------- strand

/** The strand's cut face sits at the origin; the zoom heads into it. */
export const STRAND_CUT_FACE = new THREE.Vector3(0, 0, 0)

/**
 * The strand is the spool's loose end magnified: it lies the same way round, its cut face pointing where the
 * tail's tip points (desktop standard, "each zoom level is the piece you were zooming into").
 */
export const STRAND_AXIS = SPOOL_TAIL_DIR.clone()

/** Strand radius in its own scene units. */
export const STRAND_R = 1

/**
 * The strand's centre line in its own units: the spool's loose end itself, its tip moved to the cut face and
 * scaled up to the strand's thickness. Both levels draw the one filament end from this (FilamentEnd), so across
 * the hand-over the strand fades in exactly over the tail and only one filament is ever on screen.
 */
export const strandCurve = () => {
  const k = STRAND_R / SPOOL_TUBE
  return new THREE.CatmullRomCurve3(
    TAIL_POINTS.map((p) => p.clone().sub(SPOOL_TAIL_TIP).multiplyScalar(k)),
    false,
    'centripetal',
  )
}

// ---------------------------------------------------------------- tangle

/** Every tangle is drawn so 95% of its chain length sits inside this radius, so one material's tangle is not half another's (finding 6). */
export const TANGLE_R95 = 4.5

export interface TangleFrame {
  layout: TangleLayout
  /** Applied to the whole layout: move its box centre to the origin, then scale. */
  centre: THREE.Vector3
  scale: number
  /** The point on the focus chain we pull out next, in stage units: what the tangle's zoom heads for. */
  pivot: THREE.Vector3
  /** Which way the focus chain runs at the pivot (unit): the chain level continues it. */
  pivotAxis: THREE.Vector3
  /** The chain level's frame laid into the tangle's: the focus chain's middle stretch IS the chain level's chain. */
  chainFrame: THREE.Quaternion
}

/** The tangle's and the chain's home view directions (stagePoses reads them). */
export const TANGLE_VIEW = new THREE.Vector3(0.1, 0.18, 1).normalize()
export const CHAIN_VIEW = new THREE.Vector3(0, 0.22, 1).normalize()

/** Orientation of a camera looking back along `dir` at its target, world up. */
export function cameraQuat(dir: THREE.Vector3): THREE.Quaternion {
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(dir, new THREE.Vector3(), new THREE.Vector3(0, 1, 0)))
}

/** How many chain units either side of the bright one the tangle's focus chain copies exactly. */
const COPY_REACH = 8

/** A loose random walk on from `start`, setting off along `dir` and wandering more as it goes, kept inside `bounds`. */
function walkOn(seed: number, start: THREE.Vector3, dir: THREE.Vector3, points: number, step: number, bounds: number): THREE.Vector3[] {
  const r = rng(seed)
  const p = start.clone()
  const d = dir.clone().normalize()
  const out: THREE.Vector3[] = []
  for (let i = 0; i < points; i++) {
    const wander = Math.min(1, i / 6) * 0.65 + 0.12
    d.add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(2 * wander)).normalize()
    if (p.length() > bounds) d.addScaledVector(p.clone().normalize(), -0.8).normalize()
    p.addScaledVector(d, step)
    out.push(p.clone())
  }
  return out
}

const tangleCache = new Map<Morphology, TangleFrame>()
const seed = (m: Morphology, salt: number) => [...m].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 17) + salt * 7919

export function tangleFrame(morphology: Morphology): TangleFrame {
  const hit = tangleCache.get(morphology)
  if (hit) return hit
  const layout = tangleLayout(morphology, 7)
  const pts: THREE.Vector3[] = []
  for (const t of layout.tubes) pts.push(...t.curve.getPoints(48))
  const box = new THREE.Box3().setFromPoints(pts)
  const centre = box.getCenter(new THREE.Vector3())
  // Most of the tangle (95% of its length) inside one radius: a stray loop does not shrink the rest.
  const d = pts.map((p) => p.distanceTo(centre)).sort((x, y) => x - y)
  const scale = TANGLE_R95 / d[Math.floor(d.length * 0.95)]
  // The focus chain we pull out: its middle stretch is the chain level's own chain, copied in at the tangle's
  // scale and turned so the tangle's home view sees it the way the chain level's home view does, then it
  // wanders off into the tangle at both ends. Zooming in on it lands on the chain level with nothing moving.
  const i = layout.tubes.findIndex((t) => t.role === 'focus')
  const focusR = i >= 0 ? layout.tubes[i].radius : 0.08
  const chain = chainLayout()
  const chainFrame = cameraQuat(TANGLE_VIEW).multiply(cameraQuat(CHAIN_VIEW).invert())
  const k = focusR / CHAIN_UNIT_R
  const pivot = TANGLE_VIEW.clone().multiplyScalar(0.9)
  const toStage = (q: THREE.Vector3) => q.clone().sub(chain.points[chain.focus]).multiplyScalar(k).applyQuaternion(chainFrame).add(pivot)
  const toLocal = (v: THREE.Vector3) => v.clone().divideScalar(scale).add(centre)
  const n = chain.points.length - 1
  const uF = chain.focus / n
  const du = COPY_REACH / n
  const copy: THREE.Vector3[] = []
  for (let k2 = -12; k2 <= 12; k2++) copy.push(toLocal(toStage(chain.curve.getPointAt(THREE.MathUtils.clamp(uF + (du * k2) / 12, 0, 1)))))
  const endDir = (a: THREE.Vector3, b: THREE.Vector3) => b.clone().sub(a)
  const head = walkOn(seed(morphology, 1), copy[0], endDir(copy[1], copy[0]), 16, 0.55, 4.2).reverse()
  const tail = walkOn(seed(morphology, 2), copy[copy.length - 1], endDir(copy[copy.length - 2], copy[copy.length - 1]), 16, 0.55, 4.2)
  if (i >= 0) layout.tubes[i] = { ...layout.tubes[i], curve: new THREE.CatmullRomCurve3([...head, ...copy, ...tail], false, 'centripetal') }
  const pivotAxis = chain.tangents[chain.focus].clone().applyQuaternion(chainFrame).normalize()
  const frame = { layout, centre, scale, pivot, pivotAxis, chainFrame }
  tangleCache.set(morphology, frame)
  return frame
}

// ---------------------------------------------------------------- chain

export const CHAIN_UNIT_SPACING = 1.05
/** One repeat unit's capsule: radius, and the straight part (the whole capsule is CHAIN_UNIT_LEN + 2 * CHAIN_UNIT_R long). */
export const CHAIN_UNIT_R = 0.23
export const CHAIN_UNIT_LEN = 0.44
/** The bright unit is drawn this much bigger than the rest. */
export const CHAIN_FOCUS_SCALE = 1.12
/** Half the bright unit's length, end to end: the molecule level's lit unit is laid over it. */
export const CHAIN_UNIT_HALF = (CHAIN_UNIT_LEN / 2 + CHAIN_UNIT_R) * CHAIN_FOCUS_SCALE

export interface ChainLayout {
  curve: THREE.CatmullRomCurve3
  /** Centre of each repeat unit along the chain. */
  points: THREE.Vector3[]
  /** Unit direction of the chain at each repeat unit. */
  tangents: THREE.Vector3[]
  /** Index of the unit nearest the middle: the one the next step zooms into. */
  focus: number
}

let chainCache: ChainLayout | null = null

export function chainLayout(): ChainLayout {
  if (chainCache) return chainCache
  const curve = pulledChain(3)
  const n = Math.floor(curve.getLength() / CHAIN_UNIT_SPACING)
  const points: THREE.Vector3[] = []
  const tangents: THREE.Vector3[] = []
  for (let i = 0; i <= n; i++) {
    points.push(curve.getPointAt(i / n))
    tangents.push(curve.getTangentAt(i / n).normalize())
  }
  let focus = 0
  points.forEach((p, i) => {
    if (p.lengthSq() < points[focus].lengthSq()) focus = i
  })
  chainCache = { curve, points, tangents, focus }
  return chainCache
}

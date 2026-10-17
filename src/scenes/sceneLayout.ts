import * as THREE from 'three'
import { pulledChain, tangleLayout, type TangleLayout } from '../three/chains'
import type { Morphology } from '../types/chem'

// Layout shared by a scene and the zoom director: where each scene's "next thing" sits, so the zoom can head
// for it (the loose end of the spool, the cut face of the strand, the chain we pull out, the unit we zoom into).
// Deterministic and cached: the scene and the director see the same numbers.

// ---------------------------------------------------------------- spool

/** The tip of the spool's loose end, in stage units (SpoolScene lays the spool on its side: x, y -> -y, x). */
export const SPOOL_TAIL_TIP = new THREE.Vector3(-(3.3 / 2 + 0.6), 4.25 - 0.2, 2.1)

// ---------------------------------------------------------------- strand

/** The strand's cut face sits at the origin; the zoom heads into it. */
export const STRAND_CUT_FACE = new THREE.Vector3(0, 0, 0)

// ---------------------------------------------------------------- tangle

/** Every tangle is drawn so 95% of its chain length sits inside this radius, so one material's tangle is not half another's (finding 6). */
const TANGLE_R95 = 4.5

export interface TangleFrame {
  layout: TangleLayout
  /** Applied to the whole layout: move its box centre to the origin, then scale. */
  centre: THREE.Vector3
  scale: number
  /** The middle of the chain we pull out next, in stage units. */
  pivot: THREE.Vector3
}

const tangleCache = new Map<Morphology, TangleFrame>()

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
  const focus = layout.tubes.find((t) => t.role === 'focus')
  const mid = focus ? focus.curve.getPoint(0.5) : centre.clone()
  const pivot = mid.sub(centre).multiplyScalar(scale)
  const frame = { layout, centre, scale, pivot }
  tangleCache.set(morphology, frame)
  return frame
}

// ---------------------------------------------------------------- chain

export const CHAIN_UNIT_SPACING = 1.05

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

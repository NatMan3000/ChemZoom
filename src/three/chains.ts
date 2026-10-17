import * as THREE from 'three'

// Procedural polymer chains for the `tangle` and `chain` zoom levels and the sims.
// Deterministic: the same seed gives the same tangle on every device.
// Lane B owns this file and may extend it; keep these exports stable, lane C imports them.

export function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

export interface ChainOptions {
  seed: number
  points: number // control points along the chain
  step: number // distance between control points
  stiffness: number // 0 = drunk walk, 1 = nearly straight
  bounds: number // chains bounce back inside a sphere of this radius
  start?: THREE.Vector3
}

/** A random-walk chain as a smooth curve. */
export function randomChain(o: ChainOptions): THREE.CatmullRomCurve3 {
  const r = rng(o.seed)
  const pts: THREE.Vector3[] = []
  const p = o.start?.clone() ?? new THREE.Vector3((r() - 0.5) * o.bounds, (r() - 0.5) * o.bounds, (r() - 0.5) * o.bounds)
  const dir = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize()
  for (let i = 0; i < o.points; i++) {
    pts.push(p.clone())
    const turn = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(2 * (1 - o.stiffness))
    dir.add(turn).normalize()
    if (p.length() > o.bounds) dir.addScaledVector(p.clone().normalize(), -0.8).normalize()
    p.addScaledVector(dir, o.step)
  }
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal')
}

/** A folded, aligned patch: chain segments running back and forth in parallel (a crystal). */
export function foldedChain(seed: number, centre: THREE.Vector3, folds: number, length: number, spacing: number): THREE.CatmullRomCurve3 {
  const r = rng(seed)
  const axis = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize()
  const across = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0)).normalize()
  if (across.lengthSq() < 1e-6) across.set(1, 0, 0)
  const pts: THREE.Vector3[] = []
  for (let f = 0; f < folds; f++) {
    const off = across.clone().multiplyScalar((f - (folds - 1) / 2) * spacing)
    const sign = f % 2 === 0 ? 1 : -1
    pts.push(centre.clone().add(off).addScaledVector(axis, (-length / 2) * sign))
    pts.push(centre.clone().add(off).addScaledVector(axis, (length / 2) * sign))
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2)
}

/**
 * Jiggle a curve's control points by `amount` (thermal motion for the heat sim).
 * `t` is time in seconds; the same t gives the same frame.
 */
export function jiggle(base: THREE.Vector3[], amount: number, t: number, seed = 1): THREE.Vector3[] {
  return base.map((p, i) => {
    const k = i * 1.7 + seed * 13.1
    return new THREE.Vector3(
      p.x + Math.sin(t * 3.1 + k) * amount,
      p.y + Math.sin(t * 2.7 + k * 1.3) * amount,
      p.z + Math.sin(t * 3.7 + k * 0.7) * amount,
    )
  })
}

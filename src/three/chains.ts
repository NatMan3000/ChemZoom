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

// ---------------------------------------------------------------- tangle layouts (zoom level `tangle`)

/** What a tube in a tangle stands for; the stage key and colours follow this. */
export type StrandRole = 'chain' | 'focus' | 'crystal' | 'hard' | 'soft' | 'rubber'

export interface TangleTube {
  curve: THREE.Curve<THREE.Vector3>
  role: StrandRole
  radius: number
  /** 0..1, used to vary the shade so neighbouring chains read apart. */
  shade: number
}

export interface TangleBlob {
  centre: THREE.Vector3
  radius: number
}

export interface TangleLayout {
  tubes: TangleTube[]
  blobs: TangleBlob[]
  /** Which roles appear, for the on-stage key. */
  roles: StrandRole[]
}

export type TangleStyle = 'semicrystalline' | 'amorphous' | 'segmented' | 'rubber-toughened'

const TANGLE_R = 4.2

function randomInBall(r: () => number, radius: number): THREE.Vector3 {
  for (;;) {
    const v = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1)
    if (v.lengthSq() <= 1) return v.multiplyScalar(radius)
  }
}

/** A loose loop of chain wandering from `a` to `b`: a soft segment, or a chain threading between blobs. */
export function wanderBetween(seed: number, a: THREE.Vector3, b: THREE.Vector3, loopiness: number): THREE.CatmullRomCurve3 {
  const r = rng(seed)
  const pts = [a.clone()]
  const n = 5
  for (let i = 1; i < n; i++) {
    const p = a.clone().lerp(b, i / n)
    p.add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(loopiness * 2))
    pts.push(p)
  }
  pts.push(b.clone())
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal')
}

/**
 * The inside of a strand, by morphology. Deterministic for a given seed.
 * Sizes are scene units: everything fits in a ball of radius about 4.5.
 */
export function tangleLayout(style: TangleStyle, seed = 7): TangleLayout {
  const r = rng(seed)
  const tubes: TangleTube[] = []
  const blobs: TangleBlob[] = []
  const chain = (i: number, stiffness = 0.35, points = 46) =>
    randomChain({ seed: seed * 101 + i * 7919, points, step: 0.55, stiffness, bounds: TANGLE_R })

  if (style === 'segmented') {
    // Hard segments clump into a few dense islands; soft springy loops run between them.
    const islands = [
      new THREE.Vector3(-2.2, 1.4, 0.4),
      new THREE.Vector3(2.0, 1.7, -0.8),
      new THREE.Vector3(0.3, -2.0, 1.2),
      new THREE.Vector3(-1.4, -1.2, -2.2),
      new THREE.Vector3(2.5, -0.9, 1.8),
    ]
    islands.forEach((c, i) => {
      for (let k = 0; k < 3; k++) {
        tubes.push({ curve: foldedChain(seed + i * 31 + k, c.clone().add(randomInBall(r, 0.3)), 5, 1.4, 0.22), role: 'hard', radius: 0.08, shade: r() })
      }
    })
    for (let i = 0; i < 34; i++) {
      const a = islands[i % islands.length]
      const b = islands[(i * 3 + 1 + Math.floor(r() * 3)) % islands.length]
      if (a === b) continue
      tubes.push({ curve: wanderBetween(seed * 13 + i, a.clone().add(randomInBall(r, 0.5)), b.clone().add(randomInBall(r, 0.5)), 1.3), role: 'soft', radius: 0.05, shade: r() })
    }
    tubes.push({ curve: wanderBetween(seed + 999, islands[0], islands[2], 1.2), role: 'focus', radius: 0.08, shade: 0.5 })
    return { tubes, blobs, roles: ['hard', 'soft', 'focus'] }
  }

  if (style === 'rubber-toughened') {
    const centres = [
      new THREE.Vector3(-2.3, 1.2, 0.8),
      new THREE.Vector3(1.9, 1.9, -0.6),
      new THREE.Vector3(0.6, -1.9, 1.5),
      new THREE.Vector3(-1.2, -1.6, -2.0),
      new THREE.Vector3(2.7, -0.6, 1.9),
      new THREE.Vector3(-0.2, 0.4, -3.0),
    ]
    centres.forEach((c, i) => {
      const radius = 0.7 + r() * 0.45
      blobs.push({ centre: c, radius })
      for (let k = 0; k < 3; k++) {
        // randomChain keeps a chain inside a ball about the origin: build it there, then move it onto its blob.
        const curve = randomChain({ seed: seed * 7 + i * 17 + k, points: 22, step: 0.22, stiffness: 0.1, bounds: radius * 0.6, start: new THREE.Vector3() })
        const pts = curve.points.map((p) => p.clone().add(c))
        tubes.push({ curve: new THREE.CatmullRomCurve3(pts, false, 'centripetal'), role: 'rubber', radius: 0.05, shade: r() })
      }
    })
    for (let i = 0; i < 15; i++) tubes.push({ curve: chain(i, 0.45), role: 'chain', radius: 0.055, shade: r() })
    tubes.push({ curve: chain(97, 0.45), role: 'focus', radius: 0.08, shade: 0.5 })
    return { tubes, blobs, roles: ['chain', 'rubber', 'focus'] }
  }

  const count = style === 'amorphous' ? 28 : 20
  for (let i = 0; i < count; i++) tubes.push({ curve: chain(i), role: 'chain', radius: 0.055, shade: r() })
  if (style === 'semicrystalline') {
    const patches = [new THREE.Vector3(-1.8, 1.2, 0.6), new THREE.Vector3(1.9, -0.6, -0.8), new THREE.Vector3(0.2, -2.0, 1.9)]
    patches.forEach((c, i) => tubes.push({ curve: foldedChain(seed * 3 + i * 5, c, 7, 2.0, 0.27), role: 'crystal', radius: 0.07, shade: r() }))
  }
  tubes.push({ curve: chain(97), role: 'focus', radius: 0.08, shade: 0.5 })
  return { tubes, blobs, roles: style === 'semicrystalline' ? ['chain', 'crystal', 'focus'] : ['chain', 'focus'] }
}

/** One chain pulled out straight-ish along x, for the `chain` zoom level. Deterministic. */
export function pulledChain(seed: number, length = 34): THREE.CatmullRomCurve3 {
  const r = rng(seed)
  const ph = Array.from({ length: 6 }, () => r() * Math.PI * 2)
  const pts: THREE.Vector3[] = []
  for (let x = -length / 2; x <= length / 2 + 1e-6; x += 0.8) {
    pts.push(
      new THREE.Vector3(
        x,
        Math.sin(x * 0.31 + ph[0]) * 0.9 + Math.sin(x * 0.83 + ph[1]) * 0.35,
        Math.sin(x * 0.27 + ph[2]) * 0.9 + Math.sin(x * 0.71 + ph[3]) * 0.35,
      ),
    )
  }
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal')
}

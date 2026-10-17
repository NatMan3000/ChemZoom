import * as THREE from 'three'

// The chain drawing inside a lens: calm, mostly level chains in bands, so the one thing that moves
// (reaching across a seam, packing tighter, water flashing to steam) reads clearly. A sketch, not to scale.

export interface BandOptions {
  /** How many chains share the bands. */
  count: number
  /** 1 for bands above the lens centre, -1 for below. */
  side: 1 | -1
  /** The lens radius the chains must stay inside. */
  radius: number
  /** Distance of the first band from the centre line. */
  inner?: number
  /** Height the bands span. */
  depth?: number
  /** Control points per chain. */
  points?: number
}

/**
 * Chain i of `count`, in lens units. Draws its randomness from `r` in a fixed order, so a lens that plans its
 * chains from one seed gets the same chains on every device.
 */
export function bandChain(r: () => number, i: number, { count, side, radius, inner = 0.3, depth = 1.15, points = 9 }: BandOptions): THREE.Vector3[] {
  const band = inner + (depth * (i + 0.5)) / count
  const half = Math.min((1.75 / 2.3) * radius, Math.sqrt(Math.max(0, (radius - 0.35) ** 2 - (band + 0.12) ** 2)))
  const shift = (r() - 0.5) * 0.4
  const phase = r() * Math.PI * 2
  const waves = 1 + r() * 1.5
  const size = 0.025 + r() * 0.03
  const z = (r() - 0.5) * 0.5
  const out: THREE.Vector3[] = []
  for (let k = 0; k < points; k++) {
    const u = k / (points - 1)
    out.push(new THREE.Vector3(-half + 2 * half * u + shift * Math.sin(Math.PI * u), side * (band + size * Math.sin(phase + waves * Math.PI * u)), z))
  }
  return out
}

/** The part of a chain left of `front`, ending exactly at the front; null if too little of it is there yet. */
export function clipChain(points: THREE.Vector3[], front: number): THREE.Vector3[] | null {
  if (front >= points[points.length - 1].x) return points
  const out: THREE.Vector3[] = []
  for (let i = 0; i < points.length; i++) {
    if (points[i].x <= front) out.push(points[i])
    else {
      if (i > 0) out.push(points[i - 1].clone().lerp(points[i], (front - points[i - 1].x) / (points[i].x - points[i - 1].x)))
      break
    }
  }
  return out.length >= 2 && out[out.length - 1].distanceTo(out[0]) > 0.15 ? out : null
}

import * as THREE from 'three'
import { foldedChain, jiggle, randomChain, rng } from '../../three/chains'
import type { Material } from '../../types/chem'
import { patchesOf, seedOf } from './material'

// The inside of a strand for the sims, planned once per material from its morphology.
// Chains are long paths; a sim shows a window of each path that can slide along it (reptation:
// a chain escaping its tube of neighbours), with thermal jiggle on top.

export interface Patch {
  folded: THREE.Vector3[] // neat folds (crystal) or a tight clump (hard island)
  loose: THREE.Vector3[] // the same chain after it lets go
}

export interface TanglePlan {
  paths: THREE.CatmullRomCurve3[]
  patches: Patch[]
  blobs: { centre: THREE.Vector3; radius: number }[]
}

export function planTangle(m: Material, { chains = 9, bounds = 2.4 } = {}): TanglePlan {
  const seed = seedOf(m.id)
  const r = rng(seed)
  const paths = Array.from({ length: chains }, (_, i) =>
    randomChain({ seed: seed + i * 7919, points: 26, step: 0.55, stiffness: 0.42, bounds }),
  )

  const kind = patchesOf(m)
  const patches: Patch[] = []
  if (kind) {
    const n = kind === 'crystals' ? 2 : 3
    for (let i = 0; i < n; i++) {
      const centre = new THREE.Vector3((r() - 0.5) * bounds, (r() - 0.5) * bounds, (r() - 0.5) * bounds * 0.6)
      const folds = kind === 'crystals' ? 6 : 4
      const length = kind === 'crystals' ? 1.7 : 0.9
      const spacing = kind === 'crystals' ? 0.2 : 0.17
      const folded = foldedChain(seed + 31 * (i + 1), centre, folds, length, spacing).points
      const loose = randomChain({ seed: seed + 97 * (i + 1), points: folded.length, step: length / 2.2, stiffness: 0.3, bounds, start: centre }).points
      patches.push({ folded, loose })
    }
  }

  const blobs: TanglePlan['blobs'] = []
  if (m.morphology === 'rubber-toughened') {
    for (let i = 0; i < 4; i++) {
      const centre = new THREE.Vector3((r() - 0.5) * bounds * 1.2, (r() - 0.5) * bounds * 1.2, (r() - 0.5) * bounds * 0.8)
      blobs.push({ centre, radius: 0.45 + r() * 0.25 })
    }
  }
  return { paths, patches, blobs }
}

const WINDOW = 0.68 // share of each path on screen

/**
 * The control points shown for one chain at this moment.
 * `slide` 0..1 is how far chains can slither along their own path; `amp` is the jiggle size.
 */
export function chainPoints(path: THREE.CatmullRomCurve3, i: number, time: number, slide: number, amp: number, count = 16): THREE.Vector3[] {
  const room = 1 - WINDOW
  const u0 = room / 2 + (room / 2) * slide * Math.sin(time * 0.9 + i * 1.7)
  const out: THREE.Vector3[] = []
  for (let k = 0; k < count; k++) {
    const p = path.getPoint(u0 + (WINDOW * k) / (count - 1))
    const s = k * 1.7 + i * 13.1
    out.push(
      new THREE.Vector3(
        p.x + Math.sin(time * 9.1 + s) * amp,
        p.y + Math.sin(time * 8.3 + s * 1.3) * amp,
        p.z + Math.sin(time * 10.7 + s * 0.7) * amp,
      ),
    )
  }
  return out
}

export function lerpPoints(a: THREE.Vector3[], b: THREE.Vector3[], t: number): THREE.Vector3[] {
  return a.map((p, i) => p.clone().lerp(b[i] ?? p, t))
}

/** Thermal jiggle on a fixed set of points (the shared chains.ts jiggle, sped up to read as heat). */
export function shake(points: THREE.Vector3[], amp: number, time: number, seed: number): THREE.Vector3[] {
  return amp === 0 ? points : jiggle(points, amp, time * 3, seed)
}

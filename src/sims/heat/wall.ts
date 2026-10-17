import * as THREE from 'three'
import type { Material } from '../../types/chem'
import { patchesOf } from '../shared/material'
import { clamp01, lerp, smoothstep } from '../shared/motion'
import { LAYER_H, LINE_W } from '../shared/printing'

// The printed wall Heat it up warms: a stack of printed lines standing on the bed, at real proportions
// (the printing kit's scale: 1 unit = 1/3 mm, 0.2 mm layers, 0.45 mm lines). How far it has sagged and
// melted is a pure function of the temperature and the material's own temperatures, so dragging the
// slider back cools it again. Its own geometry rather than the kit's Bead: each line here also leans with
// the wall and rounds off into the puddle, which a Bead's form (shift and scale) cannot do.

export const H = LAYER_H
export const W = LINE_W
export const LAYERS = 10 // a 2 mm tall wall
export const WALL_H = LAYERS * H
export const FAR = 18 // the wall runs off the left of the view
export const X_END = 3 // and ends here, so its end shows the stack of lines
export const RING = 20 // points round each line's cross-section

/** The slider's scale: from room temperature (or below a Tg under it, TPU) to the top of the nozzle range. */
export function heatRange(m: Material): [number, number] {
  const lo = Math.min(20, Math.floor((m.temps.tgC - 10) / 10) * 10)
  return [lo, Math.max(lo + 10, m.temps.nozzleC[1])]
}

/**
 * What the wall is doing at temperature t, all 0..1:
 * - `soft`: chains free to slide (above Tg)
 * - `letGo`: the crystals or hard islands have melted (1 straight away for a material with none)
 * - `sag`: how far the wall has slumped over under its own weight
 * - `puddle`: how far it has melted back into a puddle
 * - `heat`: how hot it looks (the thermal-camera tint), 0 at room temperature
 * A teaching scale read off Tg, the melt and the nozzle range, not a creep measurement.
 */
export function wallAt(m: Material, t: number) {
  const { tgC, meltC, nozzleC } = m.temps
  const [lo, hi] = heatRange(m)
  const patches = patchesOf(m)
  const soft = smoothstep(tgC, tgC + 20, t)
  const letGo = patches && meltC != null ? smoothstep(meltC - 6, meltC + 6, t) : 1
  // While crystals hold, PLA still sags (most of a printed part is the tangle between them); hard islands
  // tie TPU's chains into a rubber, so it stands up. With nothing to hold it, the sag grows as it warms.
  let sag: number
  if (patches === 'islands') sag = lerp(0.06 * soft, 1, letGo)
  else if (patches === 'crystals') sag = lerp(0.55 * soft, 1, letGo)
  else sag = smoothstep(tgC, tgC + 0.55 * (nozzleC[0] - tgC), t)
  const from = Math.max(nozzleC[0] - 40, meltC != null && patches ? meltC + 8 : -Infinity)
  const puddle = smoothstep(from, nozzleC[0] + 5, t)
  // The heat picture starts at room temperature: a part sitting at 20°C shows no warmth, even on TPU's scale.
  const heat = clamp01((t - Math.max(lo, 20)) / (hi - Math.max(lo, 20)))
  return { soft, letGo, sag, puddle, heat }
}

export type WallState = ReturnType<typeof wallAt>
/** The two fields that set the wall's shape. */
export type Shape = Pick<WallState, 'sag' | 'puddle'>

/** One line's pose at a point along the wall: centre, cross-section half sizes, roundness and tilt. */
export interface Pose {
  y: number
  z: number
  a: number // half width (z)
  b: number // half height (y)
  n: number // superellipse exponent: 2.6 a printed line, 2 a rounded puddle
  tilt: number // radians, leaning over with the wall
}

const _poses: Pose[] = Array.from({ length: LAYERS }, () => ({ y: 0, z: 0, a: 0, b: 0, n: 2, tilt: 0 }))

/**
 * Every line's pose for this state. The wall bends over like a cantilever (the angle grows with height),
 * the bottom lines squash wider under the weight, and the puddle lays all the lines side by side, flat.
 */
export function posesAt(s: Shape, x = 0): Pose[] {
  const bend = 1.35 * s.sag
  let y = 0
  let z = 0
  const P = s.puddle * s.puddle * (3 - 2 * s.puddle)
  // A slow wave along the wall: the puddle spreads unevenly, as a real one does.
  const wave = Math.sin(0.33 * x + 0.6) * 0.5 + Math.sin(0.71 * x + 2.1) * 0.3
  for (let i = 0; i < LAYERS; i++) {
    const h = (i + 0.5) / LAYERS
    const phi = bend * h * h
    // Walk up the wall's centre line, half a layer at a time.
    y += (H / 2) * Math.cos(phi)
    z += (H / 2) * Math.sin(phi)
    const squash = s.sag * 0.14 * (1 - h)
    const standing: Pose = { y, z, a: (W / 2) * (1 + squash), b: (H / 2) * 1.08 * (1 - squash * 0.6), n: 2.6, tilt: -phi }
    const flat: Pose = { y: 0.55, z: (i - (LAYERS - 1) / 2) * 0.5 + 1.6 * s.sag + wave * 0.5, a: 1.75, b: 0.55, n: 2, tilt: 0 }
    const o = _poses[i]
    o.y = lerp(standing.y, flat.y, P)
    o.z = lerp(standing.z, flat.z, P)
    o.a = lerp(standing.a, flat.a, P)
    o.b = lerp(standing.b, flat.b, P)
    o.n = lerp(standing.n, flat.n, P)
    o.tilt = lerp(standing.tilt, flat.tilt, P)
    y += (H / 2) * Math.cos(phi)
    z += (H / 2) * Math.sin(phi)
  }
  return _poses
}

/** Where a line ends on the right: the puddle runs out further, lower lines furthest. */
export function endOf(s: Shape, i: number): number {
  const P = s.puddle * s.puddle * (3 - 2 * s.puddle)
  return X_END + P * (1.6 - 0.1 * i)
}

// ---------------------------------------------------------------- geometry

const CAP = 6
export const BODY = 46

export interface RingAt {
  x: number
  s: number // cross-section scale (0 at a rounded tip)
  ax: number // axial part of the normal
}

/** Rings for a line from x0 to x1 with rounded ends; body rings bunch toward the visible right end. */
export function lineRings(x0: number, x1: number, capLen: number): RingAt[] {
  const cap = Math.min(capLen, (x1 - x0) / 2)
  const out: RingAt[] = []
  for (let i = 0; i <= CAP; i++) {
    const th = (i / CAP) * (Math.PI / 2)
    out.push({ x: x0 + cap * (1 - Math.cos(th)), s: Math.sin(th), ax: -Math.cos(th) })
  }
  const a = x0 + cap
  const b = x1 - cap
  for (let j = 1; j <= BODY; j++) {
    // Four rings for the stretch off screen, the rest in the last 16 units, where the camera looks.
    const near = Math.max(a, b - 16)
    const x = j <= 4 ? a + ((near - a) * j) / 5 : near + ((b - near) * (j - 4)) / (BODY - 3)
    out.push({ x, s: 1, ax: 0 })
  }
  for (let i = CAP; i >= 0; i--) {
    const th = (i / CAP) * (Math.PI / 2)
    out.push({ x: x1 - cap * (1 - Math.cos(th)), s: Math.sin(th), ax: Math.cos(th) })
  }
  return out
}

export const RINGS = 2 * (CAP + 1) + BODY

export function lineGeometry(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  const n = RINGS * RING
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage))
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage))
  const idx: number[] = []
  for (let r = 0; r < RINGS - 1; r++) {
    for (let j = 0; j < RING; j++) {
      const a = r * RING + j
      const b = (r + 1) * RING + j
      const c = (r + 1) * RING + ((j + 1) % RING)
      const d = r * RING + ((j + 1) % RING)
      idx.push(a, b, d, b, c, d)
    }
  }
  g.setIndex(idx)
  return g
}

const COS = Array.from({ length: RING }, (_, j) => Math.cos((j / RING) * Math.PI * 2))
const SIN = Array.from({ length: RING }, (_, j) => Math.sin((j / RING) * Math.PI * 2))

/** Writes line i of the wall in state s into its geometry. */
export function writeWallLine(g: THREE.BufferGeometry, s: Shape, i: number) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute
  const nor = g.getAttribute('normal') as THREE.BufferAttribute
  const rings = lineRings(-FAR, endOf(s, i), Math.min(W * 0.42 + s.puddle * 0.9, 1.4))
  rings.forEach((r, k) => {
    const p = posesAt(s, r.x)[i]
    const ct = Math.cos(p.tilt)
    const st = Math.sin(p.tilt)
    for (let j = 0; j < RING; j++) {
      const c = COS[j]
      const sn = SIN[j]
      // Superellipse point and its normal in the section's own frame (z across, y up).
      const lz = p.a * Math.sign(c) * Math.abs(c) ** (2 / p.n)
      const ly = p.b * Math.sign(sn) * Math.abs(sn) ** (2 / p.n)
      let nz = (Math.sign(c) * Math.abs(c) ** (2 - 2 / p.n)) / p.a
      let ny = (Math.sign(sn) * Math.abs(sn) ** (2 - 2 / p.n)) / p.b
      const l = Math.hypot(nz, ny) || 1
      nz /= l
      ny /= l
      // Lean the section with the wall (rotating about x; a negative tilt leans it toward +z).
      const z = (lz * ct - ly * st) * r.s
      const y = (lz * st + ly * ct) * r.s
      const wz = (nz * ct - ny * st) * r.s
      const wy = (nz * st + ny * ct) * r.s
      const v = k * RING + j
      pos.setXYZ(v, r.x, p.y + y, p.z + z)
      const ln = Math.hypot(r.ax, wy, wz) || 1
      nor.setXYZ(v, r.ax / ln, wy / ln, wz / ln)
    }
  })
  pos.needsUpdate = true
  nor.needsUpdate = true
  g.computeBoundingSphere()
}

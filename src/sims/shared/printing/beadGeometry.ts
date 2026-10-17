import * as THREE from 'three'
import { LAYER_H, LINE_W } from './scale'

// A printed line (a bead) as a mesh: a rounded-rectangle cross-section swept along x, with rounded ends.
// The buffers are sized once for a ring count and rewritten in place, so a line that grows, cools, curls or
// roughens every frame never allocates a new geometry. A `heat` attribute (0..1 per vertex) feeds hotPlastic().

/** Points around one cross-section. Point j sits at angle 2*pi*j/SECTION_POINTS: 0 faces the camera (+z), a quarter round is the top (+y). */
export const SECTION_POINTS = 20
/** Rings in each rounded end. */
export const CAP_RINGS = 6

interface SectionPoint {
  z: number
  y: number
  nz: number
  ny: number
}

const sections = new Map<string, SectionPoint[]>()

/** A rounded rectangle (a superellipse), slightly taller than a layer so stacked lines squash into each other. */
function section(width: number, height: number): SectionPoint[] {
  const key = `${width}:${height}`
  const hit = sections.get(key)
  if (hit) return hit
  const n = 2.6
  const a = width / 2
  const b = (height / 2) * 1.08
  const out = Array.from({ length: SECTION_POINTS }, (_, j) => {
    const t = (j / SECTION_POINTS) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    const z = a * Math.sign(c) * Math.abs(c) ** (2 / n)
    const y = b * Math.sign(s) * Math.abs(s) ** (2 / n)
    const nz = (Math.sign(c) * Math.abs(c) ** (2 - 2 / n)) / a
    const ny = (Math.sign(s) * Math.abs(s) ** (2 - 2 / n)) / b
    const l = Math.hypot(nz, ny) || 1
    return { z, y, nz: nz / l, ny: ny / l }
  })
  sections.set(key, out)
  return out
}

export interface BeadRing {
  x: number
  s: number // cross-section scale (0 at a rounded tip)
  ax: number // axial part of the normal
}

/** Rings for a line from x0 to x1: rounded ends of CAP_RINGS + 1 rings each and `body` rings between. */
export function beadRings(x0: number, x1: number, body: number, width = LINE_W): BeadRing[] {
  const cap = Math.min(width * 0.42, (x1 - x0) / 2)
  const out: BeadRing[] = []
  for (let i = 0; i <= CAP_RINGS; i++) {
    const th = (i / CAP_RINGS) * (Math.PI / 2)
    out.push({ x: x0 + cap * (1 - Math.cos(th)), s: Math.sin(th), ax: -Math.cos(th) })
  }
  for (let j = 1; j <= body; j++) out.push({ x: x0 + cap + ((x1 - x0 - 2 * cap) * j) / (body + 1), s: 1, ax: 0 })
  for (let i = CAP_RINGS; i >= 0; i--) {
    const th = (i / CAP_RINGS) * (Math.PI / 2)
    out.push({ x: x1 - cap * (1 - Math.cos(th)), s: Math.sin(th), ax: Math.cos(th) })
  }
  return out
}

/** Ring count of a bead with `body` rings between its two ends. */
export const beadRingCount = (body: number) => 2 * (CAP_RINGS + 1) + body

/** Empty buffers for a bead of `rings` rings (fill them with writeBead). */
export function beadGeometry(rings: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  const n = rings * SECTION_POINTS
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage))
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage))
  g.setAttribute('heat', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage))
  const idx: number[] = []
  for (let r = 0; r < rings - 1; r++) {
    for (let j = 0; j < SECTION_POINTS; j++) {
      const a = r * SECTION_POINTS + j
      const b = (r + 1) * SECTION_POINTS + j
      const c = (r + 1) * SECTION_POINTS + ((j + 1) % SECTION_POINTS)
      const d = r * SECTION_POINTS + ((j + 1) % SECTION_POINTS)
      idx.push(a, b, d, b, c, d)
    }
  }
  g.setIndex(idx)
  return g
}

/** How a bead departs from a straight line at x: moved (dy, dz) and its cross-section scaled (sy, sz). */
export interface BeadForm {
  dy?: number
  dz?: number
  sy?: number
  sz?: number
}

export interface BeadShaping {
  width?: number
  height?: number
  /** 0..1 heat along the line (the glow in hotPlastic). */
  heatAt?: (x: number) => number
  /** Moves and reshapes the line along its length: a curl, a sag, a squash. */
  form?: (x: number) => BeadForm
  /** Pushes the surface out (or in) at section point j of the ring at x, in scene units: a rough skin, a bubble. */
  bump?: (x: number, j: number) => number
}

/** Writes a bead's rings into its buffers. The rings must number what the geometry was built for. */
export function writeBead(g: THREE.BufferGeometry, rings: BeadRing[], { width = LINE_W, height = LAYER_H, heatAt, form, bump }: BeadShaping = {}) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute
  const nor = g.getAttribute('normal') as THREE.BufferAttribute
  const heat = g.getAttribute('heat') as THREE.BufferAttribute
  const sec = section(width, height)
  rings.forEach((r, i) => {
    const h = heatAt ? heatAt(r.x) : 0
    const f = form ? form(r.x) : undefined
    const dy = f?.dy ?? 0
    const dz = f?.dz ?? 0
    const sy = r.s * (f?.sy ?? 1)
    const sz = r.s * (f?.sz ?? 1)
    for (let j = 0; j < SECTION_POINTS; j++) {
      const p = sec[j]
      const k = i * SECTION_POINTS + j
      const out = bump ? bump(r.x, j) * r.s : 0
      pos.setXYZ(k, r.x, p.y * sy + p.ny * out + dy, p.z * sz + p.nz * out + dz)
      const nx = r.ax
      const ny = p.ny * r.s
      const nz = p.nz * r.s
      const l = Math.hypot(nx, ny, nz) || 1
      nor.setXYZ(k, nx / l, ny / l, nz / l)
      heat.setX(k, h)
    }
  })
  pos.needsUpdate = true
  nor.needsUpdate = true
  heat.needsUpdate = true
  g.computeBoundingSphere()
}

/**
 * Plastic that glows where it is hot: the `heat` attribute (0..1) warms the colour toward orange and adds
 * an orange glow. A heat picture, like a thermal camera: plastic at printing temperatures does not glow.
 */
export function hotPlastic(colour: string, roughness = 0.4): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: colour, roughness, metalness: 0.02 })
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float heat;\nvarying float vHeat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHeat = heat;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vHeat;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.5, 0.2), clamp(vHeat, 0.0, 1.0) * 0.8);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.32, 0.08) * vHeat * vHeat * 1.4;')
  }
  return mat
}

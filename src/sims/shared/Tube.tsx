import { useEffect, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

// A polymer chain drawn as a tube whose shape changes every frame without allocating a new geometry:
// the index buffer is built once, and each update rewrites positions and normals in place.
// THREE.TubeGeometry would rebuild everything per frame, which stutters on a phone.

function buildIndex(samples: number, radial: number): number[] {
  const idx: number[] = []
  for (let i = 0; i < samples - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j
      const b = (i + 1) * radial + j
      const c = (i + 1) * radial + ((j + 1) % radial)
      const d = i * radial + ((j + 1) % radial)
      idx.push(a, d, b, b, d, c)
    }
  }
  // Rounded caps: a fan from a tip vertex at each end (the two vertices after the rings).
  const tip0 = samples * radial
  const tip1 = tip0 + 1
  const last = (samples - 1) * radial
  for (let j = 0; j < radial; j++) {
    const k = (j + 1) % radial
    idx.push(tip0, k, j)
    idx.push(tip1, last + j, last + k)
  }
  return idx
}

const _t = new THREE.Vector3()
const _n = new THREE.Vector3()
const _b = new THREE.Vector3()
const _d = new THREE.Vector3()

function writeTube(geom: THREE.BufferGeometry, control: THREE.Vector3[], radius: number, samples: number, radial: number) {
  const pos = geom.getAttribute('position') as THREE.BufferAttribute
  const nor = geom.getAttribute('normal') as THREE.BufferAttribute
  if (control.length < 2) return
  const curve = new THREE.CatmullRomCurve3(control, false, 'centripetal')
  const pts = curve.getSpacedPoints(samples - 1)
  for (let i = 0; i < samples; i++) {
    const prev = pts[Math.max(0, i - 1)]
    const next = pts[Math.min(samples - 1, i + 1)]
    _t.subVectors(next, prev)
    if (_t.lengthSq() < 1e-10) _t.set(1, 0, 0)
    _t.normalize()
    if (i === 0) {
      // Start the frame from the axis least aligned with the tangent.
      const ax = Math.abs(_t.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
      _n.crossVectors(_t, ax).normalize()
    } else {
      // Parallel transport: project the previous normal off the new tangent.
      _n.addScaledVector(_t, -_n.dot(_t))
      if (_n.lengthSq() < 1e-10) _n.set(0, 1, 0)
      _n.normalize()
    }
    _b.crossVectors(_t, _n)
    const end = Math.min(i, samples - 1 - i)
    const r = radius * (end === 0 ? 0.8 : 1)
    const p = pts[i]
    for (let j = 0; j < radial; j++) {
      const ang = (j / radial) * Math.PI * 2
      _d.copy(_n).multiplyScalar(Math.cos(ang)).addScaledVector(_b, Math.sin(ang))
      const k = i * radial + j
      pos.setXYZ(k, p.x + _d.x * r, p.y + _d.y * r, p.z + _d.z * r)
      nor.setXYZ(k, _d.x, _d.y, _d.z)
    }
  }
  // Cap tips sit a little beyond each end, so the chain ends read rounded.
  const capAt = (i: number, sign: number, k: number) => {
    const a = pts[i]
    const b = pts[i - sign]
    _t.subVectors(a, b).normalize()
    pos.setXYZ(k, a.x + _t.x * radius * 0.55, a.y + _t.y * radius * 0.55, a.z + _t.z * radius * 0.55)
    nor.setXYZ(k, _t.x, _t.y, _t.z)
  }
  capAt(0, -1, samples * radial)
  capAt(samples - 1, 1, samples * radial + 1)
  pos.needsUpdate = true
  nor.needsUpdate = true
}

export interface TubeProps {
  points: THREE.Vector3[]
  radius?: number
  color: string
  emissive?: string
  emissiveIntensity?: number
  opacity?: number
  samples?: number
  radial?: number
}

export function Tube({ points, radius = 0.09, color, emissive = '#000000', emissiveIntensity = 0, opacity = 1, samples = 48, radial = 7 }: TubeProps) {
  const invalidate = useThree((s) => s.invalidate)
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((samples * radial + 2) * 3), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array((samples * radial + 2) * 3), 3).setUsage(THREE.DynamicDrawUsage))
    g.setIndex(buildIndex(samples, radial))
    return g
  }, [samples, radial])
  useEffect(() => () => geom.dispose(), [geom])

  useLayoutEffect(() => {
    writeTube(geom, points, radius, samples, radial)
    invalidate()
  }, [geom, points, radius, samples, radial, invalidate])

  return (
    <mesh geometry={geom} frustumCulled={false}>
      <meshStandardMaterial
        color={color}
        roughness={0.45}
        metalness={0.05}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  )
}

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { rng } from '../three/chains'
import { STRAND_AXIS, STRAND_R, strandCurve, TAIL_FADE_FROM, TAIL_FADE_TO } from './sceneLayout'

// The one cut filament end both the spool and the strand draw: the spool's loose end, built in the strand's
// units (cut face at the origin, facing STRAND_AXIS). The spool shows it scaled down on its tail; the strand
// level shows it as it is. Same geometry, same material, same light, so across the hand-over the strand fades
// in exactly over the tail and you only ever see one filament (desktop standard, Nathan 17 Oct).

const R = STRAND_R
/** Turns a face built facing +z onto the tail's direction at its tip. */
const FACE = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), STRAND_AXIS)

/** The tube along the loose end, its far end (the part lying in the winding) fading to nothing (vertex alpha). */
function endTube(): THREE.TubeGeometry {
  const g = new THREE.TubeGeometry(strandCurve(), 420, R, 96, false)
  const n = g.attributes.position.count
  const rings = 421
  const perRing = n / rings
  const colour = new Float32Array(n * 4)
  for (let v = 0; v < n; v++) {
    const u = Math.floor(v / perRing) / (rings - 1)
    colour.set([1, 1, 1, THREE.MathUtils.smoothstep(u, TAIL_FADE_FROM, TAIL_FADE_TO)], v * 4)
  }
  g.setAttribute('color', new THREE.BufferAttribute(colour, 4))
  return g
}

function cutFaceTexture(accent: string): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const base = new THREE.Color(accent)
  const dark = base.clone().multiplyScalar(0.55)
  ctx.fillStyle = `#${dark.getHexString()}`
  ctx.fillRect(0, 0, size, size)
  const r = rng(11)
  ctx.lineCap = 'round'
  for (let i = 0; i < 90; i++) {
    const light = base.clone().lerp(new THREE.Color('#ffffff'), r() * 0.35)
    ctx.strokeStyle = `#${light.getHexString()}`
    ctx.globalAlpha = 0.25 + r() * 0.4
    ctx.lineWidth = 1.5 + r() * 2.5
    ctx.beginPath()
    let x = r() * size
    let y = r() * size
    ctx.moveTo(x, y)
    for (let k = 0; k < 4; k++) {
      const nx = x + (r() - 0.5) * 220
      const ny = y + (r() - 0.5) * 220
      ctx.quadraticCurveTo(x + (r() - 0.5) * 200, y + (r() - 0.5) * 200, nx, ny)
      x = nx
      y = ny
    }
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function FilamentEnd({ accent }: { accent: string }) {
  const tube = useMemo(() => endTube(), [])
  useEffect(() => () => tube.dispose(), [tube])
  const tex = useMemo(() => cutFaceTexture(accent), [accent])
  useEffect(() => () => tex.dispose(), [tex])
  const rim = useMemo(() => new THREE.Color(accent).lerp(new THREE.Color('#ffffff'), 0.35), [accent])
  return (
    <>
      {/* The same finish as the spool's winding, so the loose end reads as the filament wound on it. */}
      <mesh geometry={tube}>
        <meshPhysicalMaterial color={accent} roughness={0.3} clearcoat={0.5} clearcoatRoughness={0.4} vertexColors transparent />
      </mesh>
      <group quaternion={FACE}>
        {/* The cut face, hinting at the tangle inside. A little glow of its own: it looks back toward the viewer, away from the key light. */}
        <mesh position={[0, 0, 0.001]}>
          <circleGeometry args={[R, 96]} />
          <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.45} roughness={0.75} />
        </mesh>
        {/* A thin bright rim where the blade went through. */}
        <mesh position={[0, 0, 0.002]}>
          <ringGeometry args={[R * 0.97, R, 96]} />
          <meshBasicMaterial color={rim} />
        </mesh>
      </group>
    </>
  )
}

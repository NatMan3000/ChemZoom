import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { rng } from '../three/chains'
import type { Material } from '../types/chem'

// Close-up of the cut end of one 1.75 mm strand. The cut face hints at the tangle inside.

const R = 1
const LENGTH = 40

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

export function StrandScene({ material }: { material: Material }) {
  const tex = useMemo(() => cutFaceTexture(material.accent), [material.accent])
  useEffect(() => () => tex.dispose(), [tex])
  const rim = useMemo(() => new THREE.Color(material.accent).lerp(new THREE.Color('#ffffff'), 0.35), [material.accent])
  return (
    <group rotation={[0, -0.5, 0.18]}>
      <mesh position={[-LENGTH / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[R, R, LENGTH, 96, 1, true]} />
        <meshPhysicalMaterial color={material.accent} roughness={0.28} clearcoat={0.7} clearcoatRoughness={0.25} />
      </mesh>
      {/* The cut face. */}
      <mesh position={[0.001, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[R, 96]} />
        <meshStandardMaterial map={tex} roughness={0.75} />
      </mesh>
      {/* A thin bright rim where the blade went through. */}
      <mesh position={[0.002, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[R * 0.97, R, 96]} />
        <meshBasicMaterial color={rim} />
      </mesh>
    </group>
  )
}

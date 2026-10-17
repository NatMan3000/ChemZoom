import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Material } from '../types/chem'
import { roleColour } from './palette'
import { tangleFrame } from './sceneLayout'

// Inside the strand: chains as tubes, arranged by the material's morphology. Every morphology is drawn
// to one size (sceneLayout's tangleFrame), so the tangles compare at a glance.

export function TangleScene({ material }: { material: Material }) {
  const frame = tangleFrame(material.morphology)
  const { layout } = frame
  const tubes = useMemo(
    () =>
      layout.tubes.map((t, i) => ({
        key: i,
        role: t.role,
        geom: new THREE.TubeGeometry(t.curve, t.role === 'rubber' ? 60 : 180, t.radius / frame.scale, 6, false),
        colour: roleColour(material.accent, t.role, t.shade),
      })),
    [layout, frame.scale, material.accent],
  )
  useEffect(() => () => tubes.forEach((t) => t.geom.dispose()), [tubes])
  const rubber = useMemo(() => roleColour(material.accent, 'rubber', 0.3), [material.accent])

  return (
    <group scale={frame.scale}>
      <group position={[-frame.centre.x, -frame.centre.y, -frame.centre.z]}>
      {tubes.map((t) => (
        <mesh key={t.key} geometry={t.geom}>
          <meshStandardMaterial
            color={t.colour}
            roughness={0.45}
            emissive={t.colour}
            emissiveIntensity={t.role === 'focus' ? 0.5 : t.role === 'crystal' || t.role === 'hard' ? 0.22 : 0.05}
          />
        </mesh>
      ))}
      {layout.blobs.map((b, i) => (
        <mesh key={`b${i}`} position={b.centre} scale={b.radius}>
          <sphereGeometry args={[1, 32, 20]} />
          <meshStandardMaterial color={rubber} roughness={0.9} transparent opacity={0.42} depthWrite={false} />
        </mesh>
      ))}
      </group>
    </group>
  )
}

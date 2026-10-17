import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { tangleLayout } from '../three/chains'
import type { Material } from '../types/chem'
import { roleColour } from './palette'

// Inside the strand: chains as tubes, arranged by the material's morphology.

export function TangleScene({ material }: { material: Material }) {
  const layout = useMemo(() => tangleLayout(material.morphology, 7), [material.morphology])
  const tubes = useMemo(
    () =>
      layout.tubes.map((t, i) => ({
        key: i,
        role: t.role,
        geom: new THREE.TubeGeometry(t.curve, t.role === 'rubber' ? 60 : 180, t.radius, 6, false),
        colour: roleColour(material.accent, t.role, t.shade),
      })),
    [layout, material.accent],
  )
  useEffect(() => () => tubes.forEach((t) => t.geom.dispose()), [tubes])
  const rubber = useMemo(() => roleColour(material.accent, 'rubber', 0.3), [material.accent])

  return (
    <group>
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
  )
}

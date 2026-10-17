import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { pulledChain, type StrandRole } from '../three/chains'
import type { Material } from '../types/chem'
import { roleColour } from './palette'

// One chain pulled out of the tangle. Each bead is one repeat unit; the bright one is the unit
// the next step zooms into. The chain runs off both edges: a real one has thousands of beads.

const BEAD_SPACING = 1.05
const BEAD_R = 0.34

export function ChainScene({ material }: { material: Material }) {
  const curve = useMemo(() => pulledChain(3), [])
  const backbone = useMemo(() => new THREE.TubeGeometry(curve, 400, 0.07, 8, false), [curve])
  useEffect(() => () => backbone.dispose(), [backbone])

  const beads = useMemo(() => {
    const total = curve.getLength()
    const n = Math.floor(total / BEAD_SPACING)
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= n; i++) pts.push(curve.getPointAt(i / n))
    // The bead nearest the middle is "this one".
    let focus = 0
    pts.forEach((p, i) => {
      if (p.lengthSq() < pts[focus].lengthSq()) focus = i
    })
    return { pts, focus }
  }, [curve])

  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const segmented = material.morphology === 'segmented'
    beads.pts.forEach((p, i) => {
      const s = i === beads.focus ? 1.3 : 1
      m.makeScale(s, s, s).setPosition(p)
      mesh.setMatrixAt(i, m)
      // TPU: short runs of hard beads, then longer runs of soft ones.
      const hard = !segmented || (i + 40) % 8 < 3
      const role: StrandRole = i === beads.focus ? 'focus' : hard ? 'hard' : 'soft'
      mesh.setColorAt(i, roleColour(material.accent, role, 0.6))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [beads, material.accent, material.morphology])

  return (
    <group>
      <mesh geometry={backbone}>
        <meshStandardMaterial color="#C9CED6" roughness={0.5} />
      </mesh>
      <instancedMesh key={beads.pts.length} ref={ref} args={[undefined, undefined, beads.pts.length]}>
        <sphereGeometry args={[BEAD_R, 24, 16]} />
        <meshStandardMaterial roughness={0.35} />
      </instancedMesh>
      {/* A soft halo around the focus bead. */}
      <mesh position={beads.pts[beads.focus]}>
        <sphereGeometry args={[BEAD_R * 2.1, 32, 20]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.08} depthWrite={false} />
      </mesh>
    </group>
  )
}

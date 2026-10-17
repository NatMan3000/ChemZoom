import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { StrandRole } from '../three/chains'
import type { Material } from '../types/chem'
import { roleColour } from './palette'
import { chainLayout } from './sceneLayout'
import { StageLabel } from './StageLabel'

// One chain pulled out of the tangle. Each capsule is one repeat unit, lying along the chain (finding 5: the
// old balls on a stick read as atoms and bonds, which only the molecule and atom steps use). The bright unit
// is the one the next step zooms into. The chain runs off both edges: a real one has thousands of units.

const UNIT_R = 0.23
const UNIT_LEN = 0.44 // the straight part; the whole capsule is UNIT_LEN + 2 * UNIT_R long
const Y = new THREE.Vector3(0, 1, 0)

export function ChainScene({ material, labels = false }: { material: Material; labels?: boolean }) {
  const chain = chainLayout()
  const backbone = useMemo(() => new THREE.TubeGeometry(chain.curve, 400, 0.05, 8, false), [chain])
  const capsule = useMemo(() => new THREE.CapsuleGeometry(UNIT_R, UNIT_LEN, 6, 20), [])
  useEffect(
    () => () => {
      backbone.dispose()
      capsule.dispose()
    },
    [backbone, capsule],
  )
  const thread = useMemo(() => new THREE.Color(material.accent).multiplyScalar(0.45), [material.accent])

  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3()
    const segmented = material.morphology === 'segmented'
    chain.points.forEach((p, i) => {
      const focus = i === chain.focus
      q.setFromUnitVectors(Y, chain.tangents[i])
      s.setScalar(focus ? 1.12 : 1)
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
      // TPU: short runs of hard units, then longer runs of soft ones.
      const hard = !segmented || (i + 40) % 8 < 3
      const role: StrandRole = focus ? 'focus' : hard ? 'hard' : 'soft'
      // Neighbouring units alternate a touch lighter and darker so each one reads as its own piece.
      const c = roleColour(material.accent, role, 0.6)
      if (!focus) c.offsetHSL(0, 0, i % 2 ? -0.05 : 0.03)
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [chain, material.accent, material.morphology])

  const focusPos = chain.points[chain.focus]
  const focusQuat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(Y, chain.tangents[chain.focus]), [chain])

  return (
    <group>
      <mesh geometry={backbone}>
        <meshStandardMaterial color={thread} roughness={0.6} />
      </mesh>
      <instancedMesh key={chain.points.length} ref={ref} args={[capsule, undefined, chain.points.length]}>
        <meshStandardMaterial roughness={0.35} />
      </instancedMesh>
      {/* A soft halo round the unit we zoom into next. */}
      <mesh position={focusPos} quaternion={focusQuat} scale={1.75}>
        <capsuleGeometry args={[UNIT_R, UNIT_LEN, 6, 20]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      {labels && <StageLabel position={[focusPos.x, focusPos.y + 0.95, focusPos.z]}>One repeat unit</StageLabel>}
    </group>
  )
}

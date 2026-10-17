import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Material } from '../types/chem'

// A 1 kg spool, about 200 mm across, wound with filament in the material's accent.
// Built around the y axis, then laid on its side. 1 scene unit is about 20 mm.

const FLANGE_R = 5
const HOLE_R = 1.45
const CORE_R = 2.6
const WIDTH = 3.3
const FLANGE_T = 0.16
const WIND_R = 4.25 // outer radius of the wound filament
const TUBE = 0.068 // filament radius, a touch fat so the winding reads at this distance

function flangeGeometry() {
  const shape = new THREE.Shape()
  shape.absarc(0, 0, FLANGE_R, 0, Math.PI * 2, false)
  const hole = new THREE.Path()
  hole.absarc(0, 0, HOLE_R, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  // Four windows so you can see the winding through the side, like a real spool.
  for (let i = 0; i < 4; i++) {
    const a0 = (i / 4) * Math.PI * 2 + 0.22
    const a1 = a0 + Math.PI / 2 - 0.44
    const w = new THREE.Path()
    w.absarc(0, 0, 4.55, a0, a1, false)
    w.absarc(0, 0, 3.0, a1, a0, true)
    w.closePath()
    shape.holes.push(w)
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: FLANGE_T, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 72 })
  g.translate(0, 0, -FLANGE_T / 2)
  g.rotateX(Math.PI / 2) // into the XZ plane, facing along y
  return g
}

function Winding({ colour, layerR, offset }: { colour: string; layerR: number; offset: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const turns = Math.floor(WIDTH / (TUBE * 2)) - 1
  const geom = useMemo(() => new THREE.TorusGeometry(layerR, TUBE, 8, 96).rotateX(Math.PI / 2), [layerR])
  useEffect(() => () => geom.dispose(), [geom])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    for (let k = 0; k < turns; k++) {
      m.makeTranslation(0, -WIDTH / 2 + TUBE * 2 + k * TUBE * 2 + offset, 0)
      ref.current!.setMatrixAt(k, m)
    }
    ref.current!.instanceMatrix.needsUpdate = true
  }, [turns, offset])
  return (
    <instancedMesh ref={ref} args={[geom, undefined, turns]}>
      <meshPhysicalMaterial color={colour} roughness={0.3} clearcoat={0.5} clearcoatRoughness={0.4} />
    </instancedMesh>
  )
}

export function SpoolScene({ material }: { material: Material }) {
  const flange = useMemo(() => flangeGeometry(), [])
  useEffect(() => () => flange.dispose(), [flange])

  // The wound body under the top two layers: a solid ring in the accent.
  const body = useMemo(() => {
    const inner = WIND_R - TUBE * 3.6
    const pts = [new THREE.Vector2(CORE_R, -WIDTH / 2 + 0.02), new THREE.Vector2(inner, -WIDTH / 2 + 0.02), new THREE.Vector2(inner, WIDTH / 2 - 0.02), new THREE.Vector2(CORE_R, WIDTH / 2 - 0.02)]
    return new THREE.LatheGeometry(pts, 96)
  }, [])
  useEffect(() => () => body.dispose(), [body])

  // The loose end, tucked through a hole in the flange the way spools ship.
  const tail = useMemo(() => {
    const start = new THREE.Vector3(WIND_R, WIDTH / 2 - 0.3, 0)
    const curve = new THREE.CatmullRomCurve3([
      start,
      new THREE.Vector3(WIND_R + 0.15, WIDTH / 2 - 0.1, 0.9),
      new THREE.Vector3(WIND_R + 0.1, WIDTH / 2 + 0.25, 1.6),
      new THREE.Vector3(WIND_R - 0.2, WIDTH / 2 + 0.6, 2.1),
    ])
    return new THREE.TubeGeometry(curve, 48, TUBE, 8, false)
  }, [])
  useEffect(() => () => tail.dispose(), [tail])

  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <Winding colour={material.accent} layerR={WIND_R - TUBE} offset={0} />
      <Winding colour={material.accent} layerR={WIND_R - TUBE * 2.7} offset={TUBE} />
      <mesh geometry={body}>
        <meshStandardMaterial color={material.accent} roughness={0.45} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={tail}>
        <meshPhysicalMaterial color={material.accent} roughness={0.3} clearcoat={0.5} />
      </mesh>
      {/* Core barrel and its hole. */}
      <mesh>
        <cylinderGeometry args={[CORE_R, CORE_R, WIDTH, 72, 1, true]} />
        <meshStandardMaterial color="#2a3047" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[HOLE_R, HOLE_R, WIDTH + FLANGE_T * 2, 48, 1, true]} />
        <meshStandardMaterial color="#1a1f30" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={flange} position={[0, s * (WIDTH / 2 + FLANGE_T / 2), 0]}>
          <meshPhysicalMaterial color="#4a5578" roughness={0.3} metalness={0.05} clearcoat={0.6} transparent opacity={0.78} />
        </mesh>
      ))}
    </group>
  )
}

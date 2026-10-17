import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Material } from '../types/chem'
import { FilamentEnd } from './FilamentEnd'
import { SPOOL_FLANGE_R, SPOOL_FLANGE_SIDES, SPOOL_FLANGE_T, SPOOL_FLANGE_Y, SPOOL_TAIL_TIP, SPOOL_TUBE, SPOOL_WIDTH, SPOOL_WIND_R, spoolPart, STRAND_R } from './sceneLayout'

// A 1 kg spool, about 200 mm across, wound with filament in the material's accent.
// Built around the y axis, then laid on its side. 1 scene unit is about 20 mm.

const FLANGE_R = SPOOL_FLANGE_R
const HOLE_R = 1.45
const CORE_R = 2.6
const WIDTH = SPOOL_WIDTH
const FLANGE_T = SPOOL_FLANGE_T
const WIND_R = SPOOL_WIND_R // outer radius of the wound filament
const TUBE = SPOOL_TUBE // filament radius, a touch fat so the winding reads at this distance

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

  return (
    <>
      {/* The loose end: the last turn peeling off the top layer, cut. It is the strand level's own filament end
          scaled down onto the tail (FilamentEnd), so the zoom hands over to the strand with nothing doubling.
          The parts are named so the director can fade them apart (sceneLayout spoolPart). */}
      <group name={spoolPart.end} position={SPOOL_TAIL_TIP} scale={SPOOL_TUBE / STRAND_R}>
        <FilamentEnd accent={material.accent} />
      </group>
      <group rotation={[0, 0, Math.PI / 2]}>
        <group name={spoolPart.body}>
          <Winding colour={material.accent} layerR={WIND_R - TUBE} offset={0} />
          <Winding colour={material.accent} layerR={WIND_R - TUBE * 2.7} offset={TUBE} />
          <mesh geometry={body}>
            <meshStandardMaterial color={material.accent} roughness={0.45} side={THREE.DoubleSide} />
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
        </group>
        {SPOOL_FLANGE_SIDES.map((side) => (
          <mesh key={side} name={spoolPart.flange(side)} geometry={flange} position={[0, side * SPOOL_FLANGE_Y, 0]}>
            <meshPhysicalMaterial color="#4a5578" roughness={0.3} metalness={0.05} clearcoat={0.6} transparent opacity={0.78} />
          </mesh>
        ))}
      </group>
    </>
  )
}

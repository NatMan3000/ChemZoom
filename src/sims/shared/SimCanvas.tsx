import { useLayoutEffect, type ReactNode } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

// The stage every sim draws on: its own Canvas, rendered on demand only, DPR capped at 2,
// the stage colour behind it, and drag-to-turn (no zoom or pan, so a scrolling page never gets stuck).

const STAGE = '#0B1020'

export interface SimCanvasProps {
  children: ReactNode
  /** Radius of the sphere that must stay in view; the camera backs off to fit any aspect ratio. */
  fitRadius?: number
  /** Or: half width and half height of a box (facing the camera) that must stay in view, plus its half depth. */
  fitBox?: [number, number, number]
  /** Where the camera looks from, as a direction from the target. */
  viewFrom?: [number, number, number]
  target?: [number, number, number]
  /** Drag-to-turn. Off for scenes that only read well from one side. */
  orbit?: boolean
  label: string
}

export function SimCanvas({ children, fitRadius = 3, fitBox, viewFrom = [0, 0.35, 1], target = [0, 0, 0], orbit = true, label }: SimCanvasProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 38, position: [0, 0, 12] }}
      gl={{ antialias: true }}
      aria-label={label}
      role="img"
      style={{ touchAction: orbit ? 'none' : 'auto' }}
    >
      <color attach="background" args={[STAGE]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 6]} intensity={1.35} />
      <directionalLight position={[-6, -2, -4]} intensity={0.35} color="#8B9CFF" />
      <FitCamera radius={fitRadius} box={fitBox} viewFrom={viewFrom} target={target} />
      {children}
      {orbit && <OrbitControls makeDefault enablePan={false} enableZoom={false} enableDamping={false} target={target} />}
    </Canvas>
  )
}

function FitCamera({ radius, box, viewFrom, target }: { radius: number; box?: [number, number, number]; viewFrom: [number, number, number]; target: [number, number, number] }) {
  const get = useThree((s) => s.get)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const [vx, vy, vz] = viewFrom
  const [tx, ty, tz] = target
  const hasBox = box != null
  const [bx, by, bz] = box ?? [0, 0, 0]

  useLayoutEffect(() => {
    if (!size.width || !size.height) return
    const camera = get().camera as THREE.PerspectiveCamera
    const v = THREE.MathUtils.degToRad(camera.fov)
    const h = 2 * Math.atan(Math.tan(v / 2) * (size.width / size.height))
    const dist = hasBox
      ? Math.max(by / Math.tan(v / 2), bx / Math.tan(h / 2)) + bz
      : radius / Math.sin(Math.min(v, h) / 2)
    const dir = new THREE.Vector3(vx, vy, vz).normalize()
    camera.position.set(tx + dir.x * dist, ty + dir.y * dist, tz + dir.z * dist)
    camera.near = Math.max(0.05, dist / 60)
    camera.far = dist * 6
    camera.lookAt(tx, ty, tz)
    camera.updateProjectionMatrix()
    invalidate()
  }, [get, size.width, size.height, radius, hasBox, bx, by, bz, vx, vy, vz, tx, ty, tz, invalidate])

  return null
}

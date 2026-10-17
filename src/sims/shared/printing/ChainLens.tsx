import { useRef, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Billboard, Line } from '@react-three/drei'
import { Tube, type TubeProps } from '../Tube'
import { labelTransform, type LensLabel, type LensLabels } from './lensLabels'
import { LENS_COLOUR } from './scale'

type V3 = [number, number, number]

export interface LensHalf {
  colour: string
  opacity: number
}

export interface ChainLensProps {
  /** Centre of the lens, in the coordinates of the lens's parent (a moved parent group moves the lens and its labels with it). The lens always faces the camera. */
  centre: V3
  radius: number
  /** The spot on the subject the lens looks at, in the same coordinates as `centre`: a small ring is drawn there, joined to the lens by a leader line. */
  target: V3
  /** Outer radius of the ring on the subject. */
  ringRadius?: number
  /** Turns the ring on the subject (it faces +z unless turned). */
  ringRotation?: V3
  /** Tints the lens's top and bottom halves and draws the line between them (a seam). */
  split?: { top: LensHalf; bottom: LensHalf; line?: boolean }
  /** Labels beside the lens, placed every frame the canvas draws. Render the same list in <LensLabelOverlay>. */
  labels?: readonly LensLabel[]
  handle?: LensLabels
  /** Hide the whole lens (and its labels) without unmounting it. */
  visible?: boolean
  /** The chain drawing, in lens units: centre at 0, inside `radius`. Drawn in front of the lens face. */
  children?: ReactNode
}

const _c = new THREE.Vector3()
const _r = new THREE.Vector3()
const _u = new THREE.Vector3()

/**
 * The chain lens: a magnified sketch of the chains at one spot on the printing scene. A ring marks the spot,
 * a leader line joins it to the lens, and the lens shows whatever chains it is given. Every lens must carry a
 * label saying it is a sketch (spec/design-intent.md P8).
 */
export function ChainLens({ centre, radius, target, ringRadius = 0.27, ringRotation, split, labels, handle, visible = true, children }: ChainLensProps) {
  // The leader runs from the ring's edge nearest the lens to the lens's edge nearest the ring (measured side on).
  const dx = centre[0] - target[0]
  const dy = centre[1] - target[1]
  const d = Math.hypot(dx, dy) || 1
  const ux = dx / d
  const uy = dy / d
  const from: V3 = [target[0] + ux * ringRadius, target[1] + uy * ringRadius, target[2]]
  const to: V3 = [centre[0] - ux * radius, centre[1] - uy * radius, centre[2]]
  const root = useRef<THREE.Group>(null)

  return (
    <group ref={root} visible={visible}>
      <mesh position={target} rotation={ringRotation}>
        <ringGeometry args={[ringRadius * (0.2 / 0.27), ringRadius, 40]} />
        <meshBasicMaterial color={LENS_COLOUR} />
      </mesh>
      <Line points={[from, to]} color={LENS_COLOUR} lineWidth={1.5} />
      <Billboard position={centre}>
        <mesh>
          <circleGeometry args={[radius, 64]} />
          <meshBasicMaterial color="#0B1020" />
        </mesh>
        {split && (
          <>
            <mesh position={[0, 0, 0.01]}>
              <circleGeometry args={[radius, 64, 0, Math.PI]} />
              <meshBasicMaterial color={split.top.colour} transparent opacity={split.top.opacity} depthWrite={false} />
            </mesh>
            <mesh position={[0, 0, 0.01]}>
              <circleGeometry args={[radius, 64, Math.PI, Math.PI]} />
              <meshBasicMaterial color={split.bottom.colour} transparent opacity={split.bottom.opacity} depthWrite={false} />
            </mesh>
            {split.line !== false && (
              <mesh position={[0, 0, 0.02]}>
                <planeGeometry args={[2 * radius - 0.1, 0.035]} />
                <meshBasicMaterial color={LENS_COLOUR} transparent opacity={0.75} depthWrite={false} />
              </mesh>
            )}
          </>
        )}
        <mesh position={[0, 0, 0.03]}>
          <ringGeometry args={[radius, radius + 0.08, 96]} />
          <meshBasicMaterial color={LENS_COLOUR} />
        </mesh>
        <group position={[0, 0, 0.4]}>{children}</group>
      </Billboard>
      {labels && handle && <PlaceLabels root={root} centre={centre} labels={labels} handle={handle} visible={visible} />}
    </group>
  )
}

const _w = new THREE.Vector3()

/**
 * Moves each label to its spot beside the lens (which always faces the camera). No loop of its own.
 * The centre goes through the lens group's world matrix, so a lens inside a moved group labels in the right place;
 * the label offsets are in world units, so a scaled parent group puts them nearer or further than its lens edge.
 */
function PlaceLabels({ root, centre, labels, handle, visible }: { root: RefObject<THREE.Group | null>; centre: V3; labels: readonly LensLabel[]; handle: LensLabels; visible: boolean }) {
  useFrame(({ camera, size }) => {
    _r.set(1, 0, 0).applyQuaternion(camera.quaternion)
    _u.set(0, 1, 0).applyQuaternion(camera.quaternion)
    _w.set(...centre)
    if (root.current) {
      root.current.updateWorldMatrix(true, false)
      _w.applyMatrix4(root.current.matrixWorld)
    }
    for (const l of labels) {
      if (!visible) {
        handle.place(l.id, null)
        continue
      }
      _c.copy(_w).addScaledVector(_r, l.at[0]).addScaledVector(_u, l.at[1]).project(camera)
      handle.place(l.id, labelTransform(((_c.x + 1) / 2) * size.width, ((1 - _c.y) / 2) * size.height, l.align))
    }
  })
  return null
}

/** A chain inside a lens: a tube at the lens drawing's standard thickness. */
export function LensChain(props: TubeProps) {
  return <Tube radius={0.07} samples={48} radial={8} {...props} />
}

/** The labels' DOM text; put it in SimFrame's `overlay`. Each starts hidden until its lens places it. */
export function LensLabelOverlay({ labels, handle }: { labels: readonly LensLabel[]; handle: LensLabels }) {
  return labels.map((l) => (
    <span
      key={l.id}
      ref={(el) => {
        handle.refs.current[l.id] = el
      }}
      className="absolute top-0 left-0 text-sm font-semibold whitespace-nowrap"
      style={{ color: l.colour, visibility: 'hidden' }}
    >
      {l.text}
    </span>
  ))
}

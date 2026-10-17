import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { getMoleculeSafe } from '../lib/molecules'
import { easeInOut, useReducedMotion } from '../lib/motion'
import { levelIndex } from '../lib/zoom'
import { clearFade, setFade } from '../three/fade'
import { moleculeCentre, moleculeHalfExtents } from '../three/molecule-geometry'
import { MoleculeView } from '../three/MoleculeView'
import type { Material, Molecule, ZoomLevel } from '../types/chem'
import { ChainScene } from './ChainScene'
import { StageLights } from './StageLights'
import { SpoolScene } from './SpoolScene'
import { StrandScene } from './StrandScene'
import { TangleScene } from './TangleScene'

// The material page's 3D stage: one Canvas, six zoom steps. Moving between steps flies the camera
// and cross-fades the scenes (DESIGN.md § Motion); reduced motion cuts. Renders only on demand.

export const SPACE_FILL_SCALE = 4 // ball radii x4 is close to real van der Waals sizes

const DURATION_MS = 850
const FOV = 38

type SceneKind = Exclude<ZoomLevel, 'atom'>

interface Slot {
  key: string
  kind: SceneKind
  material: Material
}

interface Pose {
  pos: THREE.Vector3
  target: THREE.Vector3
  dist: number
}

interface Flight {
  start: number
  fromPos: THREE.Vector3
  fromTarget: THREE.Vector3
  to: Pose
  outKey: string | null
  inKey: string | null
  dir: number
}

export interface ZoomStageProps {
  material: Material
  level: ZoomLevel
  /** AtomGroup id lit at the molecule step. */
  highlight: string | null
  selectedAtom: number | null
  onAtomClick: (i: number | null) => void
  spaceFill: boolean
  /** Bump to fly the camera back to the step's home view. */
  resetSignal: number
}

const sceneKind = (l: ZoomLevel): SceneKind => (l === 'atom' ? 'molecule' : l)

/** Distance at which a sphere of radius r fills the view, whichever of width and height is tighter. */
function fitDistance(r: number, aspect: number) {
  const v = THREE.MathUtils.degToRad(FOV)
  const h = 2 * Math.atan(Math.tan(v / 2) * aspect)
  return r / Math.sin(Math.min(v, h) / 2)
}

/** Distance at which a box (half-extents, seen face on along z) fills the view with a margin. */
function fitBoxDistance(half: THREE.Vector3, aspect: number, margin: number) {
  const v = THREE.MathUtils.degToRad(FOV)
  const tv = Math.tan(v / 2)
  const th = tv * aspect
  return Math.max((half.x * margin) / th, (half.y * margin) / tv) + half.z
}

/**
 * Where the camera looks at the molecule step when a group is lit: the group's centre, seen from
 * the side that shows it widest (rings face on), framed with a few angstroms of its neighbours.
 */
function groupFocus(molecule: Molecule, groupId: string | null): { centre: THREE.Vector3; dir: THREE.Vector3; half: THREE.Vector3 } | null {
  const g = groupId ? molecule.groups.find((x) => x.id === groupId) : undefined
  if (!g || !g.atoms.length) return null
  const offset = moleculeCentre(molecule)
  const pts = g.atoms.map((i) => molecule.atoms[i]).filter(Boolean).map((a) => new THREE.Vector3(a.x, a.y, a.z).sub(offset))
  if (!pts.length) return null
  const centre = pts.reduce((c, p) => c.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length)
  const rel = pts.map((p) => p.clone().sub(centre))

  // Pick the view direction along which the group is thinnest (so it looks widest), leaning to the front.
  let best = new THREE.Vector3(0, 0.12, 1).normalize()
  let bestScore = Infinity
  const n = 160
  for (let k = 0; k < n; k++) {
    const y = 1 - (2 * (k + 0.5)) / n
    if (Math.abs(y) > 0.8) continue // keep away from the poles, where orbiting flips
    const r = Math.sqrt(1 - y * y)
    const phi = k * Math.PI * (3 - Math.sqrt(5))
    const d = new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r)
    if (d.z < 0) d.negate()
    const depth = rel.reduce((sum, p) => sum + p.dot(d) ** 2, 0) / rel.length
    const score = depth + (1 - d.z) * 0.15
    if (score < bestScore) {
      bestScore = score
      best = d
    }
  }
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), best).normalize()
  const up = new THREE.Vector3().crossVectors(best, right).normalize()
  const half = new THREE.Vector3()
  for (const p of rel) {
    half.x = Math.max(half.x, Math.abs(p.dot(right)))
    half.y = Math.max(half.y, Math.abs(p.dot(up)))
    half.z = Math.max(half.z, Math.abs(p.dot(best)))
  }
  half.addScalar(2.6)
  half.x = Math.max(half.x, 5)
  half.y = Math.max(half.y, 3.5)
  return { centre, dir: best, half }
}

function poseFor(level: ZoomLevel, molecule: Molecule | null, aspect: number, atomScale = 1, focusGroup: string | null = null): Pose {
  const make = (dir: [number, number, number], r: number, target: [number, number, number] = [0, 0, 0]) => {
    const dist = fitDistance(r, aspect)
    const t = new THREE.Vector3(...target)
    return { pos: new THREE.Vector3(...dir).normalize().multiplyScalar(dist).add(t), target: t, dist }
  }
  switch (level) {
    case 'spool':
      return make([0.62, 0.34, 0.72], 6.6)
    case 'strand':
      return make([0.5, 0.3, 0.81], 3.4, [-2.2, 0, 0.6])
    case 'tangle':
      return make([0.1, 0.18, 1], 5.6)
    case 'chain':
      return make([0, 0.22, 1], aspect < 1 ? 4.2 : 5.2)
    case 'molecule':
    case 'atom': {
      const focus = level === 'molecule' && molecule ? groupFocus(molecule, focusGroup) : null
      if (focus) {
        const dist = fitBoxDistance(focus.half, aspect, 1.1)
        const pos = focus.dir.clone().multiplyScalar(dist).add(focus.centre)
        return { pos, target: focus.centre, dist }
      }
      // Fit the molecule's box, not a sphere round it: long chain pieces fill a wide stage properly.
      const half = molecule ? moleculeHalfExtents(molecule, atomScale) : new THREE.Vector3(5, 3, 3)
      const dist = fitBoxDistance(half, aspect, level === 'atom' ? 0.95 : 1.18)
      const dir = new THREE.Vector3(0, 0.12, 1).normalize()
      return { pos: dir.multiplyScalar(dist), target: new THREE.Vector3(), dist }
    }
  }
}

export function ZoomStage(props: ZoomStageProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: FOV, near: 0.05, far: 400, position: [0, 0, 20] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping
        gl.setClearColor(0x000000, 0)
      }}
      onPointerMissed={() => props.onAtomClick(null)}
    >
      <StageLights />
      <Director {...props} />
    </Canvas>
  )
}

function Director({ material, level, highlight, selectedAtom, onAtomClick, spaceFill, resetSignal }: ZoomStageProps) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const controls = useRef<OrbitControlsImpl>(null)
  const reduced = useReducedMotion()

  const kind = sceneKind(level)
  const key = `${material.id}:${kind}`
  const molecule = useMemo(() => getMoleculeSafe(material.oligomer), [material.oligomer])
  const aspect = size.width / Math.max(1, size.height)

  const [slots, setSlots] = useState<Slot[]>(() => [{ key, kind, material }])
  const groups = useRef(new Map<string, THREE.Group>())
  const flight = useRef<Flight | null>(null)
  const last = useRef<{ key: string; level: ZoomLevel; slot: Slot } | null>(null)
  const [limits, setLimits] = useState({ min: 1, max: 60 })

  const place = useCallback(
    (pose: Pose) => {
      camera.position.copy(pose.pos)
      controls.current?.target.copy(pose.target)
      camera.lookAt(pose.target)
      controls.current?.update()
      setLimits({ min: pose.dist * 0.3, max: pose.dist * 2.4 })
    },
    [camera],
  )

  // Start a flight whenever the step, the material or the reset signal changes.
  useEffect(() => {
    const pose = poseFor(level, molecule, aspect, level === 'atom' && spaceFill ? SPACE_FILL_SCALE : 1, highlight)
    const slot: Slot = { key, kind, material }
    const prev = last.current
    last.current = { key, level, slot }

    if (!prev || reduced) {
      flight.current = null
      groups.current.forEach((g) => clearFade(g))
      setSlots([slot])
      place(pose)
      invalidate()
      return
    }
    const sceneChanged = prev.key !== key
    const dir = Math.sign(levelIndex(level) - levelIndex(prev.level))
    if (sceneChanged) {
      setSlots((cur) => {
        const out = cur.find((s) => s.key === prev.key) ?? prev.slot
        return [out, slot]
      })
    }
    flight.current = {
      start: performance.now(),
      fromPos: camera.position.clone(),
      fromTarget: controls.current?.target.clone() ?? new THREE.Vector3(),
      to: pose,
      outKey: sceneChanged ? prev.key : null,
      inKey: sceneChanged ? key : null,
      dir,
    }
    setLimits({ min: Math.min(pose.dist * 0.3, camera.position.distanceTo(pose.target)), max: Math.max(pose.dist * 2.4, camera.position.distanceTo(pose.target)) })
    invalidate()
    // The flight is keyed on what the user changed; aspect alone does not start one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, level, resetSignal, reduced, spaceFill, level === 'molecule' ? highlight : null])

  useFrame(() => {
    const f = flight.current
    if (!f) return
    const p = Math.min(1, (performance.now() - f.start) / DURATION_MS)
    const e = easeInOut(p)
    camera.position.lerpVectors(f.fromPos, f.to.pos, e)
    const c = controls.current
    if (c) {
      c.target.lerpVectors(f.fromTarget, f.to.target, e)
      c.update()
    } else camera.lookAt(f.to.target)

    const big = 3.2
    const small = 0.3
    const outG = f.outKey ? groups.current.get(f.outKey) : undefined
    const inG = f.inKey ? groups.current.get(f.inKey) : undefined
    if (outG) {
      outG.scale.setScalar(THREE.MathUtils.lerp(1, f.dir > 0 ? big : f.dir < 0 ? small : 1, e))
      setFade(outG, 1 - THREE.MathUtils.smoothstep(p, 0, 0.6))
    }
    if (inG) {
      inG.scale.setScalar(THREE.MathUtils.lerp(f.dir > 0 ? small : f.dir < 0 ? big : 1, 1, e))
      setFade(inG, THREE.MathUtils.smoothstep(p, 0.3, 1))
    }

    if (p >= 1) {
      flight.current = null
      if (inG) {
        inG.scale.setScalar(1)
        clearFade(inG)
      }
      setLimits({ min: f.to.dist * 0.3, max: f.to.dist * 2.4 })
      setSlots((cur) => cur.filter((s) => s.key === last.current?.key))
    }
    invalidate()
  })

  return (
    <>
      {slots.map((s) => (
        <group
          key={s.key}
          ref={(g) => {
            if (g) groups.current.set(s.key, g)
            else groups.current.delete(s.key)
          }}
        >
          <SceneFor
            slot={s}
            live={s.key === key}
            level={level}
            highlight={highlight}
            selectedAtom={selectedAtom}
            onAtomClick={onAtomClick}
            spaceFill={spaceFill}
          />
        </group>
      ))}
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={0.7}
        minDistance={limits.min}
        maxDistance={limits.max}
      />
    </>
  )
}

function SceneFor({
  slot,
  live,
  level,
  highlight,
  selectedAtom,
  onAtomClick,
  spaceFill,
}: {
  slot: Slot
  live: boolean
  level: ZoomLevel
  highlight: string | null
  selectedAtom: number | null
  onAtomClick: (i: number | null) => void
  spaceFill: boolean
}) {
  switch (slot.kind) {
    case 'spool':
      return <SpoolScene material={slot.material} />
    case 'strand':
      return <StrandScene material={slot.material} />
    case 'tangle':
      return <TangleScene material={slot.material} />
    case 'chain':
      return <ChainScene material={slot.material} />
    case 'molecule': {
      const atomStep = live && level === 'atom'
      return (
        <MoleculeScene
          id={slot.material.oligomer}
          highlight={live && level === 'molecule' ? highlight : null}
          selectedAtom={atomStep ? selectedAtom : null}
          onAtomClick={atomStep ? onAtomClick : undefined}
          atomScale={atomStep && spaceFill ? SPACE_FILL_SCALE : 1}
        />
      )
    }
  }
}

function MoleculeScene({
  id,
  highlight,
  selectedAtom,
  onAtomClick,
  atomScale,
}: {
  id: string
  highlight: string | null
  selectedAtom: number | null
  onAtomClick?: (i: number) => void
  atomScale: number
}) {
  const molecule = getMoleculeSafe(id)
  const centre = useMemo(() => (molecule ? moleculeCentre(molecule).negate() : new THREE.Vector3()), [molecule])
  if (!molecule) return null
  return (
    <group position={centre}>
      <MoleculeView molecule={molecule} highlight={highlight} selectedAtom={selectedAtom} onAtomClick={onAtomClick} atomScale={atomScale} />
    </group>
  )
}

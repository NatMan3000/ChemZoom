import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { elements } from '../content/elements'
import { getMoleculeSafe } from '../lib/molecules'
import { easeInOut, useReducedMotion } from '../lib/motion'
import { levelIndex } from '../lib/zoom'
import { clearFade, setFade } from '../three/fade'
import { moleculeCentre } from '../three/molecule-geometry'
import { MoleculeView } from '../three/MoleculeView'
import type { Material, MaterialId, Molecule, ZoomLevel } from '../types/chem'
import { AtomScene } from './AtomScene'
import { ATOM_SCENE_SCALE, atomStagePosition, defaultAtomIndex } from './atomPick'
import { ChainScene } from './ChainScene'
import { flangeInTheWay, SPOOL_FLANGE_SIDES, SPOOL_TAIL_SIGHT, spoolPart } from './sceneLayout'
import { SpoolScene } from './SpoolScene'
import { StageLabel } from './StageLabel'
import { StageLights } from './StageLights'
import { atomViewDirection, FOV, homeFor, linkBetween, SPACE_FILL_SCALE, stageFrame, type Home, type PoseInputs, type StageFrame } from './stagePoses'
import { StrandScene } from './StrandScene'
import { TangleScene } from './TangleScene'
import {
  clampZ,
  dominantLevel,
  flightDuration,
  flightPath,
  distFactor,
  HOLD_IN,
  IN_FACTOR,
  LAST,
  levelName,
  OUT_FACTOR,
  phaseOf,
  settleTarget,
  snapPastCross,
  wheelToZ,
  type Phase,
} from './zoomModel'

// The material page's 3D stage: one Canvas and one continuous zoom from the spool to a single atom
// (spec/design-intent.md P6, P7). The wheel, a trackpad pinch or a touch pinch moves one number, z
// (zoomModel.ts); each level holds for a stretch and then hands over to the next as you get close. Across a
// hand-over the next level is the piece you were zooming into, the same way round (desktop standard, Nathan
// 17 Oct): its entry piece is laid over the outgoing level's exit piece at the same size and angle (the strand
// on the spool's loose end, the tangle on a patch of the cut face, the chain on the tangle's bright chain, the
// molecule's lit unit on the chain's bright capsule), the pair moves as one while the camera carries on in,
// and the outgoing level fades as the next fades in. The dive from the molecule into one atom is a real camera
// move: the atom scene sits on the picked atom.
// Renders only on demand: frames run while z, a flight or a swap is moving, and stop by themselves.

export { SPACE_FILL_SCALE }

/** z per second of easing toward the wheel's target: quick, but a mouse notch still glides. */
const DAMP = 11
/** A pause this long inside a hand-over finishes it (or backs out of it). */
const SETTLE_MS = 200
/** The lit unit's neighbours stay as context; the rest of a long chain fades out (angstroms, MoleculeView). */
const GHOST_REACH = 3.4
/** Our own level reports, waiting for the page to echo them back as the `level` prop. */
const ECHO_MS = 4000

export interface ZoomStageProps {
  material: Material
  /** The level to show. When it changes from outside (a rail tap, a material switch) the stage flies there. */
  level: ZoomLevel
  /**
   * Fired when the user's own zooming (wheel, trackpad, pinch, tapping an atom) crosses into another level,
   * so the page can follow: rail, panel and URL. Contract for the continuous zoom (spec/design-intent.md P6).
   */
  onLevelChange?: (level: ZoomLevel) => void
  /** AtomGroup id lit at the molecule step. */
  highlight: string | null
  selectedAtom: number | null
  /** An atom tapped at the molecule step, or (null) a tap on empty space there; also fired with the atom the zoom dives into. */
  onAtomClick: (i: number | null) => void
  /** Space-filling balls at the molecule step. */
  spaceFill: boolean
  /** Bump to fly the camera back to the step's home view. */
  resetSignal: number
}

export function ZoomStage(props: ZoomStageProps) {
  const levelRef = useRef(props.level)
  const onAtomClickRef = useRef(props.onAtomClick)
  useLayoutEffect(() => {
    levelRef.current = props.level
    onAtomClickRef.current = props.onAtomClick
  })
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
      // A tap on empty space clears a picked atom at the molecule step; at the atom step the atom stays.
      onPointerMissed={() => {
        if (levelRef.current === 'molecule') onAtomClickRef.current(null)
      }}
    >
      <StageLights />
      <Director {...props} />
    </Canvas>
  )
}

interface Flight {
  start: number
  duration: number
  from: number
  to: number
  /** A flight the user started (tapping an atom) reports the levels it crosses; one the page asked for does not. */
  report: boolean
  /** Camera direction at the start, eased to the destination's home when the flight starts in its own hold zone. */
  dirFrom: THREE.Vector3
  sameLevel: boolean
  /** z for eased time: hand-overs get more of the time than hold zones (zoomModel.flightPath). */
  path: (u: number) => number
}

/** A cross-fade between two whole views that are not neighbours on the zoom: a material switch, or a hop to another atom. */
interface Swap {
  start: number
  outKey: string
  inKey: string
  fromTarget: THREE.Vector3
  fromDist: number
  fromDir: THREE.Vector3
  to: Home
  done: () => void
}

interface CrossState {
  lo: number
  /** Camera direction at the outgoing side (A's frame) and the incoming side (B's frame). */
  dirLo: THREE.Vector3
  dirHi: THREE.Vector3
  /** How B is laid over A (stagePoses linkBetween): B units to A units, and B's frame turned into A's. */
  k: number
  rot: THREE.Quaternion
  rotInv: THREE.Quaternion
}

const IDENTITY = new THREE.Quaternion()

const keyOf = (mid: string, level: ZoomLevel, atom?: number) => (level === 'atom' ? `${mid}:atom:${atom}` : `${mid}:${level}`)

const slerpDir = (a: THREE.Vector3, b: THREE.Vector3, t: number, out = new THREE.Vector3()) => {
  const q = new THREE.Quaternion().setFromUnitVectors(a, b)
  return out.copy(a).applyQuaternion(new THREE.Quaternion().slerp(q, t)).normalize()
}

const smooth = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b)

/**
 * The spool's parts as you zoom into its loose end. `eye` is the camera in the spool's own frame; `clear` (0 to 1)
 * is how far a flange standing between the eye and the free part of the end has faded out of the way (so you never approach the
 * end through a see-through wall, whichever way the spool was turned); `rest` fades the wound body and flanges
 * at the hand-over; `end` is the loose end itself.
 */
function spoolParts(eye: THREE.Vector3, clear: number, rest: number, end: number): Pick<Shown, 'fade' | 'parts'> {
  const parts: Record<string, number> = { [spoolPart.end]: end, [spoolPart.body]: rest }
  for (const side of SPOOL_FLANGE_SIDES) {
    const inTheWay = Math.max(...SPOOL_TAIL_SIGHT.map((p) => flangeInTheWay(eye, p, side)))
    parts[spoolPart.flange(side)] = Math.min(rest, 1 - clear * inTheWay)
  }
  return { fade: Math.max(rest, end), parts }
}

interface Shown {
  fade: number
  pos?: THREE.Vector3
  scale?: number
  quat?: THREE.Quaternion
  /** Fades for named parts of the scene, in place of one fade for the whole group (the spool's loose end and the rest of it). */
  parts?: Record<string, number>
}

/** Marks a group whose fade is held per part (Shown.parts), so going back to a whole-group fade resets every part. */
const PARTS = -1

function Director({ material, level, onLevelChange, highlight, selectedAtom, onAtomClick, spaceFill, resetSignal }: ZoomStageProps) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const connected = useThree((s) => s.events.connected) as unknown
  const invalidate = useThree((s) => s.invalidate)
  const controls = useRef<OrbitControlsImpl>(null)
  const reduced = useReducedMotion()

  const molecule = useMemo(() => getMoleculeSafe(material.oligomer), [material.oligomer])
  const frame = useMemo<StageFrame>(() => stageFrame(size.width, size.height), [size.width, size.height])

  // What is mounted. Every level of the current material stays mounted (hidden ones cost nothing to draw), so
  // a zoom never waits on building a scene. A second material is mounted only while switching to it.
  const [sets, setSets] = useState<Material[]>([material])
  const [atoms, setAtoms] = useState<{ mid: MaterialId; index: number }[]>([])
  const [atomOpacity, setAtomOpacity] = useState<Record<string, number>>({})
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const [moleculeLive, setMoleculeLive] = useState(false)
  const groups = useRef(new Map<string, THREE.Group>())
  const faded = useRef(new Map<string, number>())

  // Zoom state.
  const z = useRef(levelIndex(level))
  const zTarget = useRef(levelIndex(level))
  const flight = useRef<Flight | null>(null)
  const swap = useRef<Swap | null>(null)
  const cross = useRef<CrossState | null>(null)
  const remembered = useRef<(THREE.Vector3 | null)[]>([null, null, null, null, null, null])
  const dirty = useRef(true)
  const firstApply = useRef(true)
  const lastDir = useRef(0)
  const settleTimer = useRef<number | null>(null)

  // Level bookkeeping with the page.
  const reported = useRef(levelIndex(level))
  const echoes = useRef<{ level: ZoomLevel; at: number }[]>([])
  const prevProps = useRef({ mid: material.id, level, selectedAtom, highlight, spaceFill, resetSignal })

  // The atom: the one under the cursor or fingers as you zoom in, else the tapped one, else the default.
  const cursorAtom = useRef<number | null>(null)
  const diveAtom = useRef<number | null>(null)
  const exitSmooth = useRef<THREE.Vector3 | null>(null)

  // Latest props for the frame loop and DOM handlers.
  const live = useRef({ material, molecule, highlight, selectedAtom, spaceFill, frame, reduced, onLevelChange, onAtomClick })
  useLayoutEffect(() => {
    live.current = { material, molecule, highlight, selectedAtom, spaceFill, frame, reduced, onLevelChange, onAtomClick }
  })

  const candidateAtom = useCallback((): number => {
    const L = live.current
    if (diveAtom.current !== null) return diveAtom.current
    if (cursorAtom.current !== null) return cursorAtom.current
    if (L.selectedAtom !== null) return L.selectedAtom
    return L.molecule ? defaultAtomIndex(L.molecule, L.highlight ?? L.material.repeatUnitGroup) : 0
  }, [])

  const inputs = useCallback(
    (mat: Material, atom: number): PoseInputs => {
      const L = live.current
      const mol = mat.id === L.material.id ? L.molecule : getMoleculeSafe(mat.oligomer)
      return { material: mat, molecule: mol, frame: L.frame, highlight: mat.id === L.material.id ? L.highlight : null, atomScale: L.spaceFill ? SPACE_FILL_SCALE : 1, atom }
    },
    [],
  )
  const home = useCallback((i: number, atom = candidateAtom()) => homeFor(levelName(i), inputs(live.current.material, atom)), [candidateAtom, inputs])

  const ensureAtom = useCallback((mid: MaterialId, index: number) => {
    // Keep the last one too (the atom being left during a hop or a change of mind), and other materials' (a switch).
    setAtoms((cur) =>
      cur.some((a) => a.mid === mid && a.index === index) ? cur : [...cur.filter((a) => a.mid !== mid), ...cur.filter((a) => a.mid === mid).slice(-1), { mid, index }],
    )
  }, [])

  const currentDir = useCallback(() => {
    const t = controls.current?.target ?? new THREE.Vector3()
    const d = camera.position.clone().sub(t)
    return d.lengthSq() > 1e-9 ? d.normalize() : new THREE.Vector3(0, 0, 1)
  }, [camera])

  // ---------------------------------------------------------------- user zoom input

  const kick = useCallback(() => {
    dirty.current = true
    invalidate()
  }, [invalidate])

  const pickAtomAt = useCallback(
    (clientX: number, clientY: number): number | null => {
      const g = groups.current.get(keyOf(live.current.material.id, 'molecule'))
      if (!g || !g.visible) return null
      const rect = gl.domElement.getBoundingClientRect()
      const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      const ray = new THREE.Raycaster()
      ray.setFromCamera(ndc, camera)
      for (const hit of ray.intersectObject(g, true)) {
        const i = hit.object.userData?.atomIndex
        if (typeof i === 'number') return i
      }
      return null
    },
    [camera, gl],
  )

  const scheduleSettle = useCallback(() => {
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(() => {
      settleTimer.current = null
      if (flight.current || swap.current) return
      const t = settleTarget(zTarget.current, lastDir.current)
      if (t !== zTarget.current) {
        zTarget.current = t
        kick()
      }
    }, SETTLE_MS)
  }, [kick])

  const userZoom = useCallback(
    (dz: number, at?: { x: number; y: number }) => {
      if (swap.current || !dz) return
      if (flight.current) {
        // The user took over: carry on from where the flight had got to.
        zTarget.current = z.current
        flight.current = null
      }
      lastDir.current = Math.sign(dz)
      const ph = phaseOf(z.current)
      if (dz > 0 && at && ph.kind === 'hold' && ph.level === 4) {
        const hit = pickAtomAt(at.x, at.y)
        if (hit !== null) cursorAtom.current = hit
      }
      let t = clampZ(zTarget.current + dz)
      if (live.current.reduced) {
        const snapped = snapPastCross(t, dz)
        // A cut to another level lands on its home view, the way a rail tap does, not the last level's angle.
        if (snapped !== t) firstApply.current = true
        t = snapped
        z.current = t
      }
      zTarget.current = t
      scheduleSettle()
      kick()
    },
    [kick, pickAtomAt, scheduleSettle],
  )

  // Wheel and trackpad (a trackpad pinch arrives as a wheel event with ctrlKey), and touch pinch.
  useEffect(() => {
    // The element R3F takes its events from (the canvas's outer wrapper), not the canvas: drei <Html> labels
    // are mounted in it, over the canvas, and a wheel or a pinch over a label must still zoom.
    const el = (connected as HTMLElement | undefined) ?? gl.domElement
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      userZoom(wheelToZ(e.deltaY, e.deltaMode, e.ctrlKey), { x: e.clientX, y: e.clientY })
    }
    const touches = new Map<number, { x: number; y: number }>()
    let lastSpread = 0
    const spread = () => {
      const [a, b] = [...touches.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const mid = () => {
      const [a, b] = [...touches.values()]
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size === 2) lastSpread = spread()
    }
    const onMove = (e: PointerEvent) => {
      if (!touches.has(e.pointerId)) return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size !== 2) return
      const s = spread()
      if (lastSpread > 10 && s > 10) userZoom(Math.log(s / lastSpread) * 1.1, mid())
      lastSpread = s
    }
    const onUp = (e: PointerEvent) => {
      touches.delete(e.pointerId)
      lastSpread = touches.size === 2 ? spread() : 0
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
    }
  }, [gl, connected, userZoom])

  // ---------------------------------------------------------------- flights the page or a tap asks for

  const flyTo = useCallback(
    (j: number, report: boolean) => {
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
      remembered.current = remembered.current.map(() => null)
      if (!report) reported.current = j
      if (live.current.reduced) {
        flight.current = null
        z.current = zTarget.current = j
        firstApply.current = true // cut straight to the home view
        kick()
        return
      }
      const from = z.current
      const ph = phaseOf(from)
      const n = Math.abs(j - from)
      flight.current = {
        start: performance.now(),
        duration: flightDuration(n),
        from,
        to: j,
        report,
        dirFrom: currentDir(),
        sameLevel: ph.kind === 'hold' && ph.level === j,
        path: flightPath(from, j),
      }
      kick()
    },
    [currentDir, kick],
  )

  /** An atom the pointer rests on at the molecule step: build its atom scene now, so a tap or a zoom dives without a wait. */
  const hoverTimer = useRef<number | null>(null)
  const prepareAtom = useCallback(
    (i: number | null) => {
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current)
      hoverTimer.current = null
      if (i === null) return
      const mid = live.current.material.id
      hoverTimer.current = window.setTimeout(() => ensureAtom(mid, i), 150)
    },
    [ensureAtom],
  )
  useEffect(() => () => void (hoverTimer.current !== null && window.clearTimeout(hoverTimer.current)), [])

  /** A tapped atom at the molecule step: pick it and dive in. */
  const diveInto = useCallback(
    (i: number) => {
      onAtomClick(i)
      cursorAtom.current = i
      flyTo(LAST, true)
    },
    [flyTo, onAtomClick],
  )

  // Props from the page: a new material, a level the user did not zoom to, a reset, a new lit group.
  useEffect(() => {
    const prev = prevProps.current
    prevProps.current = { mid: material.id, level, selectedAtom, highlight, spaceFill, resetSignal }
    const j = levelIndex(level)
    const now = performance.now()
    echoes.current = echoes.current.filter((e) => now - e.at < ECHO_MS)

    if (prev.mid !== material.id) {
      startSwap(j, prev.mid)
      return
    }
    if (prev.level !== level) {
      const k = echoes.current.findIndex((e) => e.level === level)
      if (k >= 0) {
        echoes.current = echoes.current.slice(k + 1) // our own report coming back
        return
      }
      // Already on the way (a tapped atom: the page follows the tap to the atom step at once).
      if (flight.current?.to === j) return
      flyTo(j, false)
      return
    }
    if (prev.resetSignal !== resetSignal) {
      flyTo(dominantLevel(z.current), false)
      return
    }
    const atMolecule = dominantLevel(z.current) === 4 && !flight.current
    if (atMolecule && (prev.highlight !== highlight || prev.spaceFill !== spaceFill)) {
      flyTo(4, false)
      return
    }
    // A different atom chosen while the atom step is on stage (the panel, or the atom scene): hop to it.
    const atAtom = phaseOf(z.current).kind === 'hold' && dominantLevel(z.current) === LAST && !flight.current && !swap.current
    if (atAtom && selectedAtom !== null && prev.selectedAtom !== selectedAtom && selectedAtom !== diveAtom.current) hopToAtom(selectedAtom)
    // startSwap and hopToAtom read only refs and stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material.id, level, resetSignal, highlight, spaceFill, selectedAtom, flyTo])

  // ---------------------------------------------------------------- swaps (material switch, atom hop)

  function startSwap(j: number, prevMid: MaterialId) {
    const L = live.current
    const prevMat = sets.find((m) => m.id === prevMid) ?? sets[0]
    const outLevel = levelName(dominantLevel(z.current))
    const inLevel = levelName(j)
    const outKey = keyOf(prevMat.id, outLevel, diveAtom.current ?? undefined)
    const newAtom = L.selectedAtom ?? (L.molecule ? defaultAtomIndex(L.molecule, L.highlight ?? L.material.repeatUnitGroup) : 0)
    diveAtom.current = inLevel === 'atom' ? newAtom : null
    cursorAtom.current = null
    exitSmooth.current = null
    if (inLevel === 'atom') ensureAtom(L.material.id, newAtom)
    const to = homeFor(inLevel, inputs(L.material, newAtom))
    flight.current = null
    remembered.current = remembered.current.map(() => null)
    reported.current = j
    const finish = () => {
      swap.current = null
      z.current = zTarget.current = j
      setSets([live.current.material])
      setAtoms((cur) => cur.filter((a) => a.mid === live.current.material.id))
      firstApply.current = true
      kick()
    }
    setSets((cur) => (cur.some((m) => m.id === L.material.id) ? cur : [...cur.filter((m) => m.id === prevMat.id), L.material]))
    if (L.reduced) {
      finish()
      return
    }
    swap.current = {
      start: performance.now(),
      outKey,
      inKey: keyOf(L.material.id, inLevel, newAtom),
      fromTarget: controls.current?.target.clone() ?? new THREE.Vector3(),
      fromDist: camera.position.distanceTo(controls.current?.target ?? new THREE.Vector3()),
      fromDir: currentDir(),
      to,
      done: finish,
    }
    kick()
  }

  function hopToAtom(index: number) {
    const L = live.current
    const from = diveAtom.current ?? candidateAtom()
    diveAtom.current = index
    ensureAtom(L.material.id, index)
    const to = home(LAST, index)
    // Turn as little as it can while still showing the new atom's bonds spread out.
    if (L.molecule) to.dir = atomViewDirection(L.molecule, index, currentDir())
    const finish = () => {
      swap.current = null
      z.current = zTarget.current = LAST
      kick()
    }
    if (L.reduced) {
      firstApply.current = true
      finish()
      return
    }
    swap.current = {
      start: performance.now(),
      outKey: keyOf(L.material.id, 'atom', from),
      inKey: keyOf(L.material.id, 'atom', index),
      fromTarget: controls.current?.target.clone() ?? new THREE.Vector3(),
      fromDist: camera.position.distanceTo(controls.current?.target ?? new THREE.Vector3()),
      fromDir: currentDir(),
      to,
      done: finish,
    }
    kick()
  }

  // ---------------------------------------------------------------- the framing (rail-free area) and resizes

  useEffect(() => {
    if (frame.shiftPx > 0) camera.setViewOffset(size.width, size.height, -frame.shiftPx, 0, size.width, size.height)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
    kick()
  }, [camera, frame, size.width, size.height, kick])

  // ---------------------------------------------------------------- per frame

  const placeCamera = (target: THREE.Vector3, dir: THREE.Vector3, dist: number) => {
    const c = controls.current
    camera.position.copy(target).addScaledVector(dir, dist)
    if (c) c.target.copy(target)
    camera.lookAt(target)
  }

  /** Fade one object (a whole scene group, or a named part of one), touching its materials only when the fade changes. */
  const fadeObject = (obj: THREE.Object3D, fkey: string, fade: number) => {
    const last = faded.current.get(fkey)
    if (fade >= 0.999) {
      if (last !== 1) clearFade(obj)
      faded.current.set(fkey, 1)
    } else if (last !== fade) {
      setFade(obj, fade)
      faded.current.set(fkey, fade)
    }
  }

  /** Put a group's per-part fades back to whole: every part visible, every material as built. */
  const resetParts = (key: string, g: THREE.Group) => {
    if (faded.current.get(key) !== PARTS) return
    for (const fkey of [...faded.current.keys()]) {
      if (!fkey.startsWith(`${key}/`)) continue
      const part = g.getObjectByName(fkey.slice(key.length + 1))
      if (part) part.visible = true
      faded.current.delete(fkey)
    }
    clearFade(g)
    faded.current.delete(key)
  }

  const showGroup = (key: string, fade: number, pos?: THREE.Vector3, scale = 1, quat?: THREE.Quaternion, parts?: Record<string, number>) => {
    const g = groups.current.get(key)
    if (!g) return
    if (pos) g.position.copy(pos)
    else g.position.set(0, 0, 0)
    g.scale.setScalar(scale)
    if (quat) g.quaternion.copy(quat)
    else g.quaternion.identity()
    if (key.includes(':atom:')) {
      g.visible = fade > 0.002
      return
    }
    if (parts) {
      if (faded.current.get(key) !== PARTS) {
        // From a whole-group fade to per-part fades: start from the materials as built.
        clearFade(g)
        faded.current.set(key, PARTS)
      }
      for (const [name, f] of Object.entries(parts)) {
        const part = g.getObjectByName(name)
        if (part) fadeObject(part, `${key}/${name}`, f)
      }
      return
    }
    resetParts(key, g)
    fadeObject(g, key, fade)
  }

  const atomFade = useRef<Record<string, number>>({})

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const now = performance.now()
    const L = live.current
    let moving = false
    const shown: Record<string, Shown> = {}

    // 1. A swap owns the stage while it runs.
    const s = swap.current
    if (s) {
      const t = Math.min(1, (now - s.start) / 850)
      const e = easeInOut(t)
      const target = s.fromTarget.clone().lerp(s.to.target, e)
      const dist = Math.exp(THREE.MathUtils.lerp(Math.log(s.fromDist), Math.log(s.to.dist), e))
      placeCamera(target, slerpDir(s.fromDir, s.to.dir, e), dist)
      shown[s.outKey] = { fade: 1 - smooth(0, 0.6, t) }
      shown[s.inKey] = { fade: smooth(0.3, 1, t) }
      applyGroups(shown)
      setLabels(null)
      if (t >= 1) s.done()
      invalidate()
      return
    }

    // 2. Advance z: a flight, or easing toward the wheel's target.
    const f = flight.current
    let fe = 0
    if (f) {
      const t = Math.min(1, (now - f.start) / f.duration)
      fe = easeInOut(t)
      z.current = f.path(fe)
      if (t >= 1) {
        flight.current = null
        z.current = zTarget.current = f.to
      }
      moving = true
    } else if (Math.abs(zTarget.current - z.current) > 1e-4) {
      z.current += (zTarget.current - z.current) * (1 - Math.exp(-dt * DAMP))
      if (Math.abs(zTarget.current - z.current) < 1e-4) z.current = zTarget.current
      moving = true
    }

    const ph = phaseOf(z.current)

    // 3. The atom the molecule step heads for: locked once the dive starts, eased when it changes before that.
    if (ph.kind === 'cross' && ph.lo === 4) {
      if (diveAtom.current === null) diveAtom.current = candidateAtom()
    } else if (ph.kind === 'hold' && ph.level === LAST) {
      if (diveAtom.current === null) diveAtom.current = candidateAtom()
    } else {
      diveAtom.current = null
      // Back above the molecule step: the next dive starts from the tapped or default atom again.
      if ((ph.kind === 'hold' ? ph.level : ph.lo) < 4) cursorAtom.current = null
    }
    const atomNow = candidateAtom()
    if (L.molecule) ensureAtomIfNeeded(atomNow, ph)
    const exitWant = L.molecule ? atomStagePosition(L.molecule, atomNow) : new THREE.Vector3()
    if (!exitSmooth.current) exitSmooth.current = exitWant.clone()
    else if (exitSmooth.current.distanceToSquared(exitWant) > 1e-6) {
      exitSmooth.current.lerp(exitWant, 1 - Math.exp(-dt * 8))
      moving = true
    }

    if (!moving && !dirty.current) return
    dirty.current = false

    // 4. Place the camera and the scenes for this z.
    const mid = L.material.id
    if (ph.kind === 'hold') {
      const name = levelName(ph.level)
      const H = home(ph.level, atomNow)
      if (ph.level === 4) H.exit.copy(exitSmooth.current)
      const reach = ph.q > 0 ? smooth(0, 1, ph.q / HOLD_IN) : 0
      const target = H.target.clone().lerp(H.exit, reach)
      let dir: THREE.Vector3
      if (firstApply.current) dir = H.dir
      else if (f && f.sameLevel && f.to === ph.level) dir = slerpDir(f.dirFrom, H.dir, fe)
      else dir = currentDir()
      placeCamera(target, dir, H.dist * distFactor(name, ph.q))
      // Zooming in on the spool's loose end, a flange in the line of sight fades out of the way.
      const clear = ph.level === 0 ? smooth(0.05, 0.3, ph.q) : 0
      shown[keyOf(mid, name, atomNow)] = clear > 0 ? spoolParts(camera.position, clear, 1, 1) : { fade: 1 }
      cross.current = null
      firstApply.current = false
    } else {
      const lo = ph.lo
      const A = home(lo, atomNow)
      const B = home(lo + 1, atomNow)
      if (lo === 4) A.exit.copy(exitSmooth.current)
      const e = easeInOut(ph.p)
      if (!cross.current || cross.current.lo !== lo) enterCross(lo, A, B)
      const cs = cross.current!
      const d0 = A.dist / IN_FACTOR[levelName(lo)]
      const d1 = B.dist * OUT_FACTOR[levelName(lo + 1)]
      const fadeA = 1 - smooth(0.15, 0.75, ph.p)
      const fadeB = smooth(0.3, 0.85, ph.p)
      if (lo === 4) {
        // The molecule and the atom share one space: no laying over, just the camera moving in.
        const target = A.exit.clone().lerp(B.target, e)
        placeCamera(target, slerpDir(cs.dirLo, cs.dirHi, e), Math.exp(THREE.MathUtils.lerp(Math.log(d0), Math.log(d1), e)))
        shown[keyOf(mid, levelName(lo), atomNow)] = { fade: fadeA }
        shown[keyOf(mid, levelName(lo + 1), atomNow)] = { fade: fadeB }
      } else {
        // B's entry piece rides on A's exit piece (B = k x smaller, turned by rot). The pair starts in A's own
        // frame and ends in B's: the anchor slides from A.exit to B.entry, the pair scales from A's size to B's,
        // and it turns from rot to none, so each hold zone sees its scene exactly where it left it.
        const sB = Math.pow(cs.k, 1 - e)
        const sA = sB / cs.k
        const rotB = new THREE.Quaternion().slerpQuaternions(cs.rot, IDENTITY, e)
        const rotA = rotB.clone().multiply(cs.rotInv)
        const anchor = A.exit.clone().lerp(B.entry, e)
        // The camera, worked out in B's own frame: from looking at the entry piece the way it looked at A's exit,
        // to B's home framing just pulled back.
        const tB = B.entry.clone().lerp(B.target, e).sub(B.entry).multiplyScalar(sB).applyQuaternion(rotB).add(anchor)
        const dirB = slerpDir(cs.dirLo.clone().applyQuaternion(cs.rotInv), cs.dirHi, e).applyQuaternion(rotB)
        const distB = Math.exp(THREE.MathUtils.lerp(Math.log(d0 / cs.k), Math.log(d1), e))
        placeCamera(tB, dirB, sB * distB)
        const posA = anchor.clone().sub(A.exit.clone().multiplyScalar(sA).applyQuaternion(rotA))
        const posB = anchor.clone().sub(B.entry.clone().multiplyScalar(sB).applyQuaternion(rotB))
        if (lo === 0) {
          // Spool to strand: one filament end. The rest of the spool (flanges, winding, the far part of the tail)
          // fades first, leaving only the loose end; the strand, which is that same end drawn at its own scale,
          // fades in exactly over it; then the spool's copy steps aside under it. Zooming out runs it backwards.
          const eye = camera.position.clone().sub(posA).applyQuaternion(rotA.clone().invert()).divideScalar(sA)
          shown[keyOf(mid, 'spool')] = { ...spoolParts(eye, 1, 1 - smooth(0, 0.3, ph.p), ph.p < 0.8 ? 1 : 0), pos: posA, scale: sA, quat: rotA }
          shown[keyOf(mid, 'strand')] = { fade: smooth(0.35, 0.75, ph.p), pos: posB, scale: sB, quat: rotB }
        } else {
          shown[keyOf(mid, levelName(lo), atomNow)] = { fade: fadeA, pos: posA, scale: sA, quat: rotA }
          shown[keyOf(mid, levelName(lo + 1), atomNow)] = { fade: fadeB, pos: posB, scale: sB, quat: rotB }
        }
      }
      firstApply.current = false
    }
    applyGroups(shown)

    // 5. Tell the page when the user's zoom crosses into another level.
    const d = dominantLevel(z.current)
    if ((!f || f.report) && d !== reported.current) {
      reported.current = d
      const name = levelName(d)
      if (name === 'atom') L.onAtomClick(atomNow)
      echoes.current.push({ level: name, at: now })
      L.onLevelChange?.(name)
    }

    const settled = ph.kind === 'hold' && !flight.current && Math.abs(zTarget.current - z.current) < 0.03
    setLabels(settled ? keyOf(mid, levelName(ph.level), atomNow) : null)
    setMoleculeLive(ph.kind === 'hold' && ph.level === 4 && !flight.current)

    if (moving) invalidate()
  })

  function ensureAtomIfNeeded(atom: number, ph: Phase) {
    const near = ph.kind === 'hold' ? ph.level >= 4 : ph.lo >= 4
    if (!near) return
    const mid = live.current.material.id
    if (!atoms.some((a) => a.mid === mid && a.index === atom)) ensureAtom(mid, atom)
  }

  function enterCross(lo: number, A: Home, B: Home) {
    // Which side the zoom came from: the way it is travelling (a flight's own direction, else the wheel's).
    const f = flight.current
    const travel = f ? Math.sign(f.to - f.from) : Math.sign(zTarget.current - z.current) || lastDir.current
    const fromHi = travel < 0
    const cur = currentDir()
    const set = (dirLo: THREE.Vector3, dirHi: THREE.Vector3) => {
      const link = lo === 4 ? { k: 1, rotation: new THREE.Quaternion() } : linkBetween(A, B, dirLo, dirHi)
      cross.current = { lo, dirLo, dirHi, k: link.k, rot: link.rotation, rotInv: link.rotation.clone().invert() }
    }
    if (lo === 4) {
      // The dive turns, on the way in, to the side of the atom that shows its bonds spread out (a bond pointing
      // at the lens hides the shared pair); zooming back out keeps its line of sight.
      const mol = live.current.molecule
      const atom = diveAtom.current ?? candidateAtom()
      set(cur, !fromHi && mol ? atomViewDirection(mol, atom, cur) : cur.clone())
      return
    }
    if (fromHi) {
      remembered.current[lo + 1] = cur.clone()
      set(remembered.current[lo]?.clone() ?? A.dir.clone(), cur)
    } else {
      remembered.current[lo] = cur.clone()
      set(cur, remembered.current[lo + 1]?.clone() ?? B.dir.clone())
    }
  }

  function applyGroups(shown: Record<string, Shown>) {
    const nextAtomFade: Record<string, number> = {}
    for (const [key, g] of groups.current) {
      const want = shown[key]
      if (!want || want.fade <= 0.002) {
        g.visible = false
        resetParts(key, g)
        faded.current.delete(key)
        if (key.includes(':atom:')) nextAtomFade[key] = 0
        continue
      }
      g.visible = true
      showGroup(key, want.fade, want.pos, want.scale, want.quat, want.parts)
      if (key.includes(':atom:')) nextAtomFade[key] = Math.round(want.fade * 40) / 40
    }
    const prev = atomFade.current
    const changed = Object.keys(nextAtomFade).some((k) => prev[k] !== nextAtomFade[k]) || Object.keys(prev).length !== Object.keys(nextAtomFade).length
    if (changed) {
      atomFade.current = nextAtomFade
      setAtomOpacity(nextAtomFade)
    }
  }

  const labelsRef = useRef<string | null>(null)
  function setLabels(key: string | null) {
    if (labelsRef.current === key) return
    labelsRef.current = key
    setSettledKey(key)
  }

  // One stable callback ref per scene group, so re-renders do not detach and re-attach them.
  const refCache = useRef(new Map<string, (g: THREE.Group | null) => void>())
  const register = useCallback(
    (key: string) => {
      let cb = refCache.current.get(key)
      if (!cb) {
        cb = (g: THREE.Group | null) => {
          if (g) {
            groups.current.set(key, g)
            g.visible = false
            dirty.current = true
            invalidate()
          } else {
            // The callback stays cached: dropping it would hand React a new ref each render (detach, attach, hide).
            groups.current.delete(key)
            faded.current.delete(key)
          }
        }
        refCache.current.set(key, cb)
      }
      return cb
    },
    [invalidate],
  )

  return (
    <>
      {sets.map((m) => (
        <MaterialSet
          key={m.id}
          material={m}
          register={register}
          settledKey={settledKey}
          highlight={m.id === material.id ? highlight : null}
          spaceFill={m.id === material.id && spaceFill}
          moleculeLive={m.id === material.id && moleculeLive}
          selectedAtom={m.id === material.id ? selectedAtom : null}
          onAtomTap={diveInto}
          onAtomRest={prepareAtom}
        />
      ))}
      {atoms.map((a) => {
        const mat = sets.find((m) => m.id === a.mid)
        const mol = mat ? getMoleculeSafe(mat.oligomer) : null
        if (!mat || !mol) return null
        const key = keyOf(a.mid, 'atom', a.index)
        return (
          <group key={key} ref={register(key)}>
            <AtomOnStage molecule={mol} index={a.index} accent={mat.accent} opacity={atomOpacity[key] ?? 0} />
          </group>
        )
      })}
      {/* Zoom is ours (the continuous zoom); the controls only turn the view. drei attaches them to the same
          wrapper as the wheel, so a drag that starts on a label still turns it. */}
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.12}
        // A turn re-runs the placement, so what depends on the line of sight (a flange in front of the spool's
        // loose end) follows it. Change events only fire while the view is turning: no idle frames.
        onChange={() => {
          dirty.current = true
        }}
        rotateSpeed={0.7}
      />
    </>
  )
}

/** The AtomScene, placed on its atom and scaled into the molecule's space (atomPick.ts). */
function AtomOnStage({ molecule, index, accent, opacity }: { molecule: Molecule; index: number; accent: string; opacity: number }) {
  // Stays mounted at opacity 0 (the scene hides itself and its labels), so the dive never waits on building it.
  const pos = useMemo(() => atomStagePosition(molecule, index), [molecule, index])
  return (
    <group position={pos} scale={ATOM_SCENE_SCALE}>
      <AtomScene molecule={molecule} atomIndex={index} accent={accent} opacity={opacity} />
    </group>
  )
}

/** Every scene of one material, each in its own group the director shows, fades and moves. */
function MaterialSet({
  material,
  register,
  settledKey,
  highlight,
  spaceFill,
  moleculeLive,
  selectedAtom,
  onAtomTap,
  onAtomRest,
}: {
  material: Material
  register: (key: string) => (g: THREE.Group | null) => void
  settledKey: string | null
  highlight: string | null
  spaceFill: boolean
  moleculeLive: boolean
  selectedAtom: number | null
  onAtomTap: (i: number) => void
  onAtomRest: (i: number | null) => void
}) {
  const m = material
  return (
    <>
      <group ref={register(keyOf(m.id, 'spool'))}>
        <SpoolScene material={m} />
      </group>
      <group ref={register(keyOf(m.id, 'strand'))}>
        <StrandScene material={m} />
      </group>
      <group ref={register(keyOf(m.id, 'tangle'))}>
        <TangleScene material={m} />
      </group>
      <group ref={register(keyOf(m.id, 'chain'))}>
        <ChainScene material={m} labels={settledKey === keyOf(m.id, 'chain')} />
      </group>
      <group ref={register(keyOf(m.id, 'molecule'))}>
        <MoleculeScene
          id={m.oligomer}
          highlight={highlight}
          // The whole piece lit (D19): its repeat unit, the one you zoomed into, is outlined instead of lit.
          outline={highlight === null ? m.repeatUnitGroup : null}
          selectedAtom={moleculeLive ? selectedAtom : null}
          onAtomClick={moleculeLive ? onAtomTap : undefined}
          atomScale={spaceFill ? SPACE_FILL_SCALE : 1}
          labels={moleculeLive && settledKey === keyOf(m.id, 'molecule')}
          onAtomHover={onAtomRest}
        />
      </group>
    </>
  )
}

function MoleculeScene({
  id,
  highlight,
  outline,
  selectedAtom,
  onAtomClick,
  atomScale,
  labels,
  onAtomHover,
}: {
  id: string
  highlight: string | null
  outline: string | null
  selectedAtom: number | null
  onAtomClick?: (i: number) => void
  atomScale: number
  labels: boolean
  onAtomHover: (i: number | null) => void
}) {
  const molecule = getMoleculeSafe(id)
  const centre = useMemo(() => (molecule ? moleculeCentre(molecule).negate() : new THREE.Vector3()), [molecule])
  const [hovered, setHovered] = useState<number | null>(null)
  if (!molecule) return null
  const hotAtom = labels && hovered !== null ? molecule.atoms[hovered] : undefined
  return (
    <group position={centre}>
      <MoleculeView
        molecule={molecule}
        highlight={highlight}
        outline={outline}
        selectedAtom={selectedAtom}
        onAtomClick={onAtomClick}
        onAtomHover={(i) => {
          setHovered(i)
          onAtomHover(i)
        }}
        atomScale={atomScale}
        ghostReach={GHOST_REACH}
      />
      {hotAtom && (
        <StageLabel position={[hotAtom.x, hotAtom.y + (elements[hotAtom.el]?.radius ?? 0.4) * atomScale + 0.55, hotAtom.z]}>
          {elements[hotAtom.el]?.name ?? hotAtom.el}: tap or scroll to zoom in
        </StageLabel>
      )}
    </group>
  )
}

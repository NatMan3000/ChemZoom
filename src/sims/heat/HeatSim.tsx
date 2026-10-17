import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { Flame, Square } from 'lucide-react'
import type { Material, Text } from '../../types/chem'
import type { SimProps } from '../types'
import { SimCanvas } from '../shared/SimCanvas'
import { HOT, fmtC, mix, patchesOf, rangeC } from '../shared/material'
import { lerp, smoothstep, useMotionClock, useReducedMotion, useTimeline } from '../shared/motion'
import { ActionButton, RangeSlider, Row, SimFrame, type Marker } from '../shared/ui'
import { isStacked, useElementSize } from '../shared/layout'
import { Bed, ChainLens, LensLabelOverlay, useLensLabels, type LensLabels } from '../shared/printing'
import { HeatLensChains } from './HeatLens'
import { LENS_R, heatLensLabels } from './lensLabels'
import { LAYERS, heatRange, lineGeometry, posesAt, wallAt, writeWallLine, type WallState } from './wall'

// Heat it up, as a printing close-up (D18, 17 Oct): a printed wall standing on the bed, a stack of
// printed lines at real proportions, warmed as the temperature slider climbs. Below Tg it stands stiff;
// past Tg it slumps over under its own weight; crystals (PLA) or hard islands (TPU) hold it until their
// melt; near the print range the lines melt back into a puddle like what comes out of the nozzle.
// A lens on one line shows the chains: frozen, then sliding, then the crystals or islands letting go.
// The wall is a pure function of the temperature; only the chains' wriggle reads the motion clock, which
// runs while the sweep plays or the slider is dragged and stops on the sweep's last frame.

const SWEEP_MS = 8000

type Phase = 'frozen' | 'held' | 'soft' | 'runny'

function heatPhase(m: Material, t: number): Phase {
  const { tgC, meltC, nozzleC } = m.temps
  if (t < tgC) return 'frozen'
  if (t >= nozzleC[0]) return 'runny'
  if (patchesOf(m) && meltC != null && t < meltC) return 'held'
  return 'soft'
}

function readout(m: Material, t: number): string {
  const patches = patchesOf(m)
  const lead = `${fmtC(t)} · `
  switch (heatPhase(m, t)) {
    case 'frozen':
      return `${lead}Frozen: the chains only shiver in place, so the wall stands stiff`
    case 'held':
      return patches === 'islands'
        ? `${lead}Rubbery: the soft chains move, the hard islands hold the wall up`
        : `${lead}Soft: the tangle slides and the wall sags, the crystals still hold`
    case 'soft':
      return patches === 'crystals'
        ? `${lead}Crystals melted: the wall slumps, gooey, not runny enough to print yet`
        : patches === 'islands'
          ? `${lead}Islands let go: the wall slumps, gooey, not runny enough to print yet`
          : `${lead}Soft: the chains slide past each other, so the wall sags`
    case 'runny':
      return `${lead}Runny: print range, the wall melts into a puddle`
  }
}

function caption(m: Material): Text {
  const { tgC, meltC, nozzleC, hdtC } = m.temps
  const patches = patchesOf(m)
  const morph =
    patches === 'crystals'
      ? ` The neat folds in the circle are crystals: they hold on until ${fmtC(meltC!)}, so the wall sags but does not slump flat.`
      : patches === 'islands'
        ? ` The tight clumps in the circle are hard islands: they tie the soft chains together until ${fmtC(meltC!)}, so the wall stays up, bendy but standing.`
        : m.morphology === 'rubber-toughened'
          ? ' The pale blobs in the circle are rubber, mixed in to make it tough.'
          : ' There are no crystals, just a tangle, so it softens gradually.'
  return {
    simple: `A printed wall of ${m.short}, ten lines high, standing on the bed, and a heater warming it; orange shows heat, like a thermal camera. The circle is a sketch of the chains inside one line. Below ${fmtC(tgC)} they are frozen and the wall stands stiff; above it they start to slide past each other, so the wall sags under its own weight.${morph} At ${rangeC(nozzleC)} the chains flow and the wall melts back into a puddle, which is why that is the nozzle range.`,
    deeper: `${fmtC(tgC)} is the glass transition (Tg): below it the chains are locked in a glassy solid and only vibrate; above it whole sections can wriggle and slide (reptation), so the part creeps under any load, even its own weight.${meltC != null && patches ? ` Ordered regions melt at ${fmtC(meltC)}.` : ''}${hdtC != null ? ` The heat deflection temperature, where a loaded test bar starts to bend, is ${fmtC(hdtC)}.` : ''} Printing at ${rangeC(nozzleC)} makes the melt runny enough to push through the nozzle and fuse to the layer below. The close-up is to scale (0.45 mm lines, 0.2 mm layers); how far it sags at each temperature is a teaching picture, since real sagging also depends on time and load.`,
  }
}

function HeatSim({ material: m }: SimProps) {
  const reduced = useReducedMotion()
  const [lo, hi] = heatRange(m)
  const [temp, setTemp] = useState(() => Math.min(hi, Math.max(lo, 20)))
  const timeline = useTimeline(reduced)
  const clock = useMotionClock(reduced, timeline)
  const { tgC, meltC, nozzleC } = m.temps
  const patches = patchesOf(m)
  const state = wallAt(m, temp)
  const [stageRef, size] = useElementSize<HTMLDivElement>()
  const tall = isStacked(size)
  const handle = useLensLabels()
  const labels = useMemo(() => heatLensLabels(m), [m])

  const markers: Marker[] = [{ value: tgC, label: `Chains slide ${fmtC(tgC)}` }]
  if (patches && meltC != null) markers.push({ value: meltC, label: `${patches === 'crystals' ? 'Crystals melt' : 'Islands let go'} ${fmtC(meltC)}` })
  markers.sort((a, b) => a.value - b.value)

  const play = () => {
    if (timeline.running) return timeline.cancel()
    timeline.run(SWEEP_MS, (p) => setTemp(Math.round(lerp(lo, hi, p))))
  }

  return (
    <SimFrame
      stageRef={stageRef}
      stage={
        <SimCanvas {...(tall ? TALL : WIDE).camera} label={`Close-up of a printed wall of ${m.short} on the bed at ${fmtC(temp)}, with a sketch of the chains inside one line`}>
          <HeatScene m={m} state={state} time={clock.time} lens={(tall ? TALL : WIDE).lens} labels={labels} handle={handle} />
        </SimCanvas>
      }
      overlay={<LensLabelOverlay labels={labels} handle={handle} />}
      controls={
        <div className="flex flex-col gap-2 md:flex-row-reverse md:items-center md:gap-6">
          <RangeSlider
            label="Temperature"
            min={lo}
            max={hi}
            value={temp}
            accent={m.accent}
            fill={`linear-gradient(90deg, #8B9CFF, ${HOT})`}
            markers={markers}
            band={{ from: nozzleC[0], to: nozzleC[1], label: `Print ${rangeC(nozzleC)}` }}
            onChange={(v) => {
              timeline.cancel()
              setTemp(v)
              clock.kick()
            }}
          />
          <Row className="shrink-0">
            <ActionButton
              action="play"
              icon={timeline.running ? Square : Flame}
              label={timeline.running ? 'Stop' : 'Heat it up'}
              labels={['Stop', 'Heat it up']}
              onClick={play}
              primary
              accent={m.accent}
            />
          </Row>
        </div>
      }
      readout={readout(m, temp)}
      caption={caption(m)}
    />
  )
}

// ---------------------------------------------------------------- the close-up

// Two framings: the lens beside the wall on a wide stage, above it on a tall one (a phone).
type V3 = [number, number, number]
const WIDE = { camera: { fitBox: [10.5, 6, 3] as V3, viewFrom: [0.75, 0.38, 1] as V3, target: [2, 4.3, 0] as V3 }, lens: [9.5, 6.8, 2] as V3 }
const TALL = { camera: { fitBox: [6.2, 9.6, 3] as V3, viewFrom: [0.75, 0.38, 1] as V3, target: [-0.5, 7, 0] as V3 }, lens: [1.2, 12.2, 3] as V3 }

/** The line the lens looks at, and how far along the wall. */
const LENS_LINE = 6
const LENS_X = -1.5

function HeatScene({ m, state, time, lens, labels, handle }: { m: Material; state: WallState; time: number; lens: V3; labels: ReturnType<typeof heatLensLabels>; handle: LensLabels }) {
  // The ring sits on the face of one line, following it as the wall leans and melts.
  // Standing, it sits on the line's front face; as the wall melts flat it moves onto the puddle's top.
  const p = posesAt(state, LENS_X)[LENS_LINE]
  const P = smoothstep(0.3, 0.8, state.puddle)
  const face: V3 = [LENS_X, p.y + p.a * Math.sin(p.tilt), p.z + p.a * Math.cos(p.tilt) + 0.03]
  const top: V3 = [LENS_X, p.y + p.b + 0.03, p.z]
  const target: V3 = [face[0], lerp(face[1], top[1], P), lerp(face[2], top[2], P)]
  const ringTurn = lerp(-p.tilt, -Math.PI / 2, P)
  return (
    <group>
      <Bed x={[-40, 40]} z={[-14, 30]} />
      {Array.from({ length: LAYERS }, (_, i) => (
        <WallLine key={i} i={i} m={m} state={state} />
      ))}
      <Heater heat={state.heat} />
      <ChainLens centre={lens} radius={LENS_R} target={target} ringRotation={[ringTurn, 0, 0]} labels={labels} handle={handle}>
        <HeatLensChains m={m} state={state} time={time} />
      </ChainLens>
    </group>
  )
}

/** Plastic colour at this heat: its own colour, warming to orange like a thermal camera. */
function plasticColour(m: Material, i: number, s: WallState): string {
  // Neighbouring lines alternate a little in shade so the stack reads; the puddle evens them out.
  const shade = mix(m.accent, '#0B1020', (0.18 + 0.1 * (i % 2)) * (1 - s.puddle) + 0.18 * s.puddle)
  return mix(shade, '#FF9A55', 0.85 * s.heat ** 1.6)
}

function WallLine({ i, m, state }: { i: number; m: Material; state: WallState }) {
  const invalidate = useThree((s) => s.invalidate)
  const geom = useMemo(() => lineGeometry(), [])
  useEffect(() => () => geom.dispose(), [geom])
  const { sag, puddle } = state
  useLayoutEffect(() => {
    writeWallLine(geom, { sag, puddle }, i)
    invalidate()
  }, [geom, sag, puddle, i, invalidate])
  return (
    <mesh geometry={geom} frustumCulled={false}>
      <meshStandardMaterial color={plasticColour(m, i, state)} roughness={0.38 - 0.2 * puddle} metalness={0.02} emissive={HOT} emissiveIntensity={0.5 * state.heat ** 3} />
    </mesh>
  )
}

/** A heater coil behind the wall, like the element in an oven: dull at room temperature, glowing as it climbs. */
function Heater({ heat }: { heat: number }) {
  const glow = heat ** 1.4
  const geom = useMemo(() => {
    const turns = 26
    const len = 26
    const pts = Array.from({ length: turns * 16 + 1 }, (_, k) => {
      const a = (k / 16) * Math.PI * 2
      return new THREE.Vector3(-len / 2 + (k / (turns * 16)) * len, 0.6 * Math.sin(a), 0.6 * Math.cos(a))
    })
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 24, 0.16, 8, false)
  }, [])
  useEffect(() => () => geom.dispose(), [geom])
  return (
    <group position={[-3, 2.6, -9]}>
      <mesh geometry={geom}>
        <meshStandardMaterial color={mix('#5A606E', '#FF8A3D', glow)} emissive={HOT} emissiveIntensity={2 * glow} roughness={0.5} metalness={0.4} />
      </mesh>
      <pointLight position={[6, -3, 4]} color={HOT} intensity={glow * 60} distance={24} />
    </group>
  )
}

export default HeatSim

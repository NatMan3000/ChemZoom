import { useMemo, useState } from 'react'
import { Flame, Square } from 'lucide-react'
import type { Material, Text } from '../../types/chem'
import type { SimProps } from '../types'
import { SimCanvas } from '../shared/SimCanvas'
import { Tube } from '../shared/Tube'
import { HOT, fmtC, mix, patchesOf, rangeC } from '../shared/material'
import { clamp01, lerp, smoothstep, useMotionClock, useReducedMotion, useTimeline } from '../shared/motion'
import { chainPoints, lerpPoints, planTangle, shake } from '../shared/tangle'
import { ActionButton, RangeSlider, Row, SimFrame, type Marker } from '../shared/ui'

// Heat it up: a temperature slider from room temperature to the top of the nozzle range.
// Below Tg the chains only shiver; above it they start to slither past each other; crystals or hard
// islands hold until their melt; in the print range everything flows. All thresholds come from temps.

const SWEEP_MS = 8000

function heatRange(m: Material): [number, number] {
  const lo = Math.min(20, Math.floor((m.temps.tgC - 10) / 10) * 10)
  return [lo, Math.max(lo + 10, m.temps.nozzleC[1])]
}

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
  const phase = heatPhase(m, t)
  const lead = `${fmtC(t)} · `
  switch (phase) {
    case 'frozen':
      return `${lead}Frozen: the chains only shiver in place, so it is stiff`
    case 'held':
      return patches === 'islands'
        ? `${lead}Rubbery: the soft chains move, the hard islands hold them together`
        : `${lead}Soft: the tangled chains slide, the crystals still hold`
    case 'soft':
      return patches === 'crystals'
        ? `${lead}Crystals melted: soft and gooey, not runny enough to print yet`
        : patches === 'islands'
          ? `${lead}Islands let go: gooey, not runny enough to print yet`
          : `${lead}Soft: the chains slide past each other, so it bends and sags`
    case 'runny':
      return `${lead}Runny: print range, the chains flow like honey`
  }
}

function caption(m: Material): Text {
  const { tgC, meltC, nozzleC, hdtC } = m.temps
  const patches = patchesOf(m)
  const morph =
    patches === 'crystals'
      ? ` The neat, light folds are crystals: they hold on until ${fmtC(meltC!)}.`
      : patches === 'islands'
        ? ` The tight clumps are hard islands: they tie the soft chains together until ${fmtC(meltC!)}, which is why ${m.short} springs back.`
        : m.morphology === 'rubber-toughened'
          ? ' The soft blobs are rubber, mixed in to make it tough.'
          : ' There are no crystals, just a tangle, so it softens gradually.'
  return {
    simple: `These are ${m.short} chains. Heat makes them jiggle. Below ${fmtC(tgC)} they are frozen stiff; above it they start to slide past each other, so a part can soften and sag.${morph} At ${rangeC(nozzleC)} they flow, which is why that is the nozzle range.`,
    deeper: `${fmtC(tgC)} is the glass transition (Tg): below it the chains are locked in a glassy solid and only vibrate; above it whole sections can wriggle and slide (reptation).${meltC != null && patches ? ` Ordered regions melt at ${fmtC(meltC)}.` : ''}${hdtC != null ? ` The heat deflection temperature, where a loaded test bar starts to bend, is ${fmtC(hdtC)}.` : ''} Printing at ${rangeC(nozzleC)} makes the melt runny enough to push through the nozzle and fuse to the layer below.`,
  }
}

function HeatSim({ material: m }: SimProps) {
  const reduced = useReducedMotion()
  const [lo, hi] = heatRange(m)
  const [temp, setTemp] = useState(() => Math.min(hi, Math.max(lo, 20)))
  const timeline = useTimeline(reduced)
  const clock = useMotionClock(reduced, timeline.running)
  const { tgC, meltC, nozzleC } = m.temps
  const patches = patchesOf(m)

  const markers: Marker[] = [{ value: tgC, label: `Chains slide ${fmtC(tgC)}` }]
  if (patches && meltC != null) markers.push({ value: meltC, label: `${patches === 'crystals' ? 'Crystals melt' : 'Islands let go'} ${fmtC(meltC)}` })
  markers.sort((a, b) => a.value - b.value)

  const play = () => {
    if (timeline.running) return timeline.cancel()
    timeline.run(SWEEP_MS, (p) => setTemp(Math.round(lerp(lo, hi, p))))
  }

  return (
    <SimFrame
      stage={
        <SimCanvas fitRadius={3.4} label={`${m.short} chains at ${fmtC(temp)}`}>
          <HeatScene m={m} temp={temp} time={clock.time} />
        </SimCanvas>
      }
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

/** How hard the chains jiggle (scene units) and how far they slither along their path (0..1). */
function motionAt(m: Material, t: number) {
  const { tgC, nozzleC } = m.temps
  const [lo] = heatRange(m)
  if (t < tgC) return { amp: 0.015 + 0.03 * clamp01((t - lo) / Math.max(1, tgC - lo)), slide: 0 }
  if (t < nozzleC[0]) {
    const k = clamp01((t - tgC) / Math.max(1, nozzleC[0] - tgC))
    return { amp: 0.06 + 0.1 * k, slide: 0.25 + 0.45 * k }
  }
  const k = clamp01((t - nozzleC[0]) / Math.max(1, nozzleC[1] - nozzleC[0]))
  return { amp: 0.16 + 0.08 * k, slide: 0.75 + 0.25 * k }
}

function HeatScene({ m, temp, time }: { m: Material; temp: number; time: number }) {
  const plan = useMemo(() => planTangle(m), [m])
  const [lo, hi] = heatRange(m)
  const heat = clamp01((temp - lo) / (hi - lo))
  const { amp, slide } = motionAt(m, temp)
  const melt = m.temps.meltC != null ? smoothstep(m.temps.meltC - 6, m.temps.meltC + 6, temp) : 1
  const patchColour = mix(mix(m.accent, '#FFFFFF', 0.55), m.accent, melt)
  const glow = 0.04 + 0.3 * heat * heat

  return (
    <group>
      {plan.paths.map((path, i) => (
        <Tube key={i} points={chainPoints(path, i, time, slide, amp)} color={m.accent} emissive={HOT} emissiveIntensity={glow * 0.5} radius={0.085} />
      ))}
      {plan.patches.map((p, i) => (
        <Tube
          key={`p${i}`}
          points={shake(lerpPoints(p.folded, p.loose, melt), lerp(amp * 0.25, amp, melt), time, 50 + i)}
          color={patchColour}
          emissive={HOT}
          emissiveIntensity={glow * 0.4}
          radius={0.1}
          samples={64}
        />
      ))}
      {plan.blobs.map((b, i) => {
        const wobble = 1 + amp * 0.8 * Math.sin(time * 6 + i * 2.1)
        return (
          <mesh key={`b${i}`} position={b.centre} scale={[b.radius * wobble, (b.radius / wobble) * 0.95, b.radius]}>
            <sphereGeometry args={[1, 28, 20]} />
            <meshStandardMaterial color="#E8ECF7" roughness={0.6} transparent opacity={0.26} depthWrite={false} />
          </mesh>
        )
      })}
      <pointLight position={[0, 2.5, 3.5]} color={HOT} intensity={heat * heat * 10} distance={12} />
    </group>
  )
}

export default HeatSim

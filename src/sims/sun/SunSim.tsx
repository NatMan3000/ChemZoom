import { useCallback, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RotateCcw, Square, Sun } from 'lucide-react'
import type { Material, Text } from '../../types/chem'
import type { SimProps } from '../types'
import { SimCanvas } from '../shared/SimCanvas'
import { rubberMolecule, uvWeakSpot } from '../shared/material'
import { useReducedMotion, useTimeline } from '../shared/motion'
import { ActionButton, Row, SimFrame } from '../shared/ui'
import { LensLabelOverlay, useLensLabels, type LensLabel } from '../shared/printing'
import { SNAP_AT, SunScene, type PartPlan, type TagPlace } from './scene'
import { useElementSize } from '../shared/layout'

// Sunlight, as a printing close-up (D18, 17 Oct): the top of a printed part on a sunny windowsill, ABS
// beside ASA, at real proportions (0.45 mm lines, 0.2 mm layers). UV rays land on both. Over the run the
// ABS surface yellows and grows fine cracks while the ASA surface stays clean. A lens on each part looks
// at a rubber blob just under its surface: ABS's rubber has a weak spot (sim.uvWeakSpot, the C=C), which
// snaps (MoleculeView's `broken`); ASA's rubber (sim.rubberBlobs) takes the same rays and nothing snaps.
// Everything on screen is a function of the run's progress p, so p = 1 is the frame left on screen.

const RUN_MS = 6000

function planFor(m: Material): PartPlan {
  const spot = uvWeakSpot(m)
  const molecule = spot?.molecule ?? rubberMolecule(m)
  const box = new THREE.Box3()
  for (const a of molecule.atoms) box.expandByPoint(new THREE.Vector3(a.x, a.y, a.z))
  const centre = box.getCenter(new THREE.Vector3())
  // Seen face on in the lens: the half size that has to fit, across or up, whichever is tighter in a circle.
  const radius = Math.max(...molecule.atoms.map((a) => Math.hypot(a.x - centre.x, a.y - centre.y))) + 0.5
  return { m, molecule, spot, centre, radius }
}

const uvScore = (m: Material) => m.traits.find((t) => t.id === 'uv')?.score

function caption(parts: PartPlan[]): Text {
  const weak = parts.find((p) => p.spot)
  const each = parts.map((p) => {
    if (p.spot) return `${p.m.short}'s rubber has a weak spot, the ${p.spot.group.label}: UV snaps it, the chain breaks in two, and the surface goes yellow and cracks.`
    return weak ? `${p.m.short}'s rubber has no bond like that, so the same sunlight leaves its surface clean.` : `${p.m.short}'s rubber has no weak spot like that for UV to snap.`
  })
  const scores = parts
    .map((p) => (uvScore(p.m) != null ? `${p.m.short} ${uvScore(p.m)} of 5` : null))
    .filter(Boolean)
    .join(', ')
  const note = weak?.spot?.group.note?.deeper ?? weak?.spot?.group.note?.simple
  return {
    simple: `The tops of two printed parts on a sunny windowsill, close up. Sunlight carries ultraviolet (UV) light, which you cannot see, drawn here as violet streaks; it has enough energy to break some bonds. Each circle zooms in on the rubber just under the surface. ${each.join(' ')}`,
    deeper: `${note ? `${note} ` : ''}A UV photon can break a bond and leave reactive fragments that grab oxygen from the air (photo-oxidation). Shorter, oxidised chains lose their stretch, so the skin of the part turns brittle and crazes; the new oxygen-containing groups absorb blue light, so it looks yellow. Months on a sill are squeezed into a few seconds here.${scores ? ` Sun resistance in this app: ${scores}.` : ''}`,
  }
}

function SunSim({ material: m, compareWith: c }: SimProps) {
  const reduced = useReducedMotion()
  const [p, setP] = useState(0)
  const timeline = useTimeline(reduced)
  const parts = useMemo(() => (c ? [planFor(m), planFor(c)] : [planFor(m)]), [m, c])
  const handle = useLensLabels()
  // A narrow stage (a phone) gets bigger lenses and shorter labels, so the two side by side still read.
  const [stageRef, size] = useElementSize<HTMLDivElement>()
  const narrow = size.width > 0 && size.width < 640
  const lensR = narrow ? 4.3 : 3.6
  const labels = useMemo(() => lensLabels(parts, lensR, narrow), [parts, lensR, narrow])

  // Name tags over each part, placed by the scene every frame the canvas draws (no loop of their own).
  const tags = useRef<Record<string, HTMLElement | null>>({})
  const placeTag = useCallback<TagPlace>((id, transform) => {
    const el = tags.current[id]
    if (!el) return
    el.style.transform = transform
    el.style.visibility = 'visible'
  }, [])

  const play = () => {
    if (timeline.running) return timeline.cancel()
    timeline.run(RUN_MS, setP)
  }

  let readout: string
  if (p === 0) readout = `Ready to leave ${parts.map((x) => x.m.short).join(' and ')} on the windowsill`
  else if (p < SNAP_AT) readout = `UV landing on ${parts.length > 1 ? 'both surfaces' : 'the surface'}...`
  else
    readout = parts
      .map((x) => (x.spot ? `${x.m.short}: ${x.spot.group.label} snapped, yellow and cracking` : `${x.m.short}: nothing to snap, still clean`))
      .join(' · ')

  return (
    <SimFrame
      stageRef={stageRef}
      stage={
        <SimCanvas {...framing(parts.length)} label={`Close-up of the tops of printed ${parts.map((x) => x.m.short).join(' and ')} parts on a sunny windowsill, with a lens on the rubber under each surface`}>
          <SunScene parts={parts} p={p} lensR={lensR} labels={labels} handle={handle} placeTag={placeTag} />
        </SimCanvas>
      }
      overlay={
        <>
          <LensLabelOverlay labels={labels} handle={handle} />
          {parts.map((x) => (
            <div
              key={x.m.id}
              ref={(el) => {
                tags.current[x.m.id] = el
              }}
              className="absolute top-0 left-0 inline-flex items-center gap-2 rounded-full border border-line bg-surface/85 px-3 py-1 text-sm font-semibold whitespace-nowrap"
              style={{ visibility: 'hidden' }}
            >
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: x.m.accent }} />
              {x.m.short}
              <span className="font-normal text-ink-muted">{x.spot ? 'has a weak spot' : 'no weak spot'}</span>
            </div>
          ))}
        </>
      }
      controls={
        <Row>
          <ActionButton
            action="play"
            icon={timeline.running ? Square : p >= 1 ? RotateCcw : Sun}
            label={timeline.running ? 'Stop' : p >= 1 ? 'Again' : 'Out in the sun'}
            labels={['Stop', 'Again', 'Out in the sun']}
            onClick={() => {
              if (!timeline.running && p >= 1) setP(0)
              play()
            }}
            primary
            accent={m.accent}
          />
        </Row>
      }
      readout={readout}
      caption={caption(parts)}
    />
  )
}

type V3 = [number, number, number]
/** One part, or two side by side; the lenses hang under the parts. */
function framing(n: number): { fitBox: V3; viewFrom: V3; target: V3 } {
  return n > 1 ? { fitBox: [17.5, 9, 4], viewFrom: [0, 0.32, 1], target: [0, -2.4, 2] } : { fitBox: [10, 9, 4], viewFrom: [0, 0.32, 1], target: [0, -2.4, 2] }
}

function lensLabels(parts: PartPlan[], r: number, short: boolean): LensLabel[] {
  return parts.flatMap((x) => [
    {
      id: `${x.m.id}-what`,
      text: short ? (x.spot ? x.spot.group.label : 'no weak spot') : x.spot ? `${x.m.short} rubber: the ${x.spot.group.label}` : `${x.m.short} rubber: no weak spot`,
      colour: '#E8ECF7',
      at: [0, -r - 0.25] as [number, number],
      align: 'below' as const,
    },
    { id: `${x.m.id}-sketch`, text: short ? 'sketch, magnified' : 'sketch: one rubber molecule, magnified', colour: '#A3AECB', at: [0, -r - (short ? 1.5 : 1.25)] as [number, number], align: 'below' as const },
  ])
}

export default SunSim

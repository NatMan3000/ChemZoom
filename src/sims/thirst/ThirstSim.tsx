import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { Droplets, Flame, Wind } from 'lucide-react'
import { rng } from '../../three/chains'
import type { Material, Text } from '../../types/chem'
import type { SimProps } from '../types'
import { SimCanvas } from '../shared/SimCanvas'
import { Tube } from '../shared/Tube'
import { HOT, WATER_H, WATER_O, fmtC, rangeC, seedOf } from '../shared/material'
import { clamp01, easeInOut, useReducedMotion, useTimeline } from '../shared/motion'
import { chainPoints, planTangle } from '../shared/tangle'
import { ActionButton, Row, SimFrame } from '../shared/ui'

// Thirsty plastic: leave the filament out and water molecules drift in between the chains (how many
// follows sim.thirst); print it and the water flashes to steam bubbles that pop; dry it and the water
// drifts back out. The number of drawn water molecules is a visual scale for the 1..5 thirst score.

type Action = 'soak' | 'print' | 'dry'
type Last = 'fresh' | 'soaked' | 'popped' | 'smooth' | 'dried'

const MS: Record<Action, number> = { soak: 4500, print: 3500, dry: 4000 }
const TANGLE = 2.2

interface Drop {
  inside: THREE.Vector3
  outside: THREE.Vector3
  delay: number // 0..1, when this one moves within an action
  spin: THREE.Euler
  bubble: number // max steam bubble radius
}

const waterCount = (m: Material) => 4 + 5 * m.sim.thirst

function planWater(m: Material): Drop[] {
  const r = rng(seedOf(m.id, 5))
  return Array.from({ length: waterCount(m) }, () => {
    const dir = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize()
    const inside = dir.clone().multiplyScalar(TANGLE * Math.cbrt(r()) * 0.9)
    const outside = dir.clone().multiplyScalar(TANGLE + 1.4 + r() * 0.8)
    return { inside, outside, delay: r(), spin: new THREE.Euler(r() * 6.3, r() * 6.3, r() * 6.3), bubble: 0.3 + r() * 0.25 }
  })
}

function thirstWords(t: number): string {
  return ['barely any', 'a little', 'some', 'a lot of', 'loads of'][Math.max(0, Math.min(4, t - 1))]
}

function caption(m: Material): Text {
  const dry = m.print.dryC != null ? ` Drying ${m.short} at ${fmtC(m.print.dryC)} pushes the water back out.` : ' Drying it pushes the water back out.'
  return {
    simple: `Plastic soaks up water from the air, a bit like a sponge. ${m.short} scores ${m.sim.thirst} of 5 for thirst. In the hot nozzle that water boils into steam all at once: tiny bubbles pop, the surface goes rough and the plastic strings.${dry}`,
    deeper: `Polar groups along the chain (oxygen and nitrogen atoms, as in esters and urethanes) attract water molecules, which slip into the gaps between chains. At ${rangeC(m.temps.nozzleC)} in the nozzle the water flashes to steam, giving pops, bubbles and stringing, and in some plastics it also cuts chains apart (hydrolysis), which leaves the print weaker.${m.print.dryC != null ? ` A filament dryer set to ${fmtC(m.print.dryC)} drives it back out.` : ''}`,
  }
}

function ThirstSim({ material: m }: SimProps) {
  const reduced = useReducedMotion()
  const timeline = useTimeline(reduced)
  const [wet, setWet] = useState(false)
  const [action, setAction] = useState<Action | null>(null)
  const [p, setP] = useState(0)
  const [last, setLast] = useState<Last>('fresh')

  const start = (a: Action) => {
    if (timeline.running) return
    const wasWet = wet
    setAction(a)
    setP(0)
    timeline.run(MS[a], setP, () => {
      setAction(null)
      if (a === 'soak') {
        setWet(true)
        setLast('soaked')
      } else if (a === 'print') {
        setWet(false)
        setLast(wasWet ? 'popped' : 'smooth')
      } else {
        setWet(false)
        setLast('dried')
      }
    })
  }

  let readout: string
  if (action === 'soak') readout = 'Left out: water molecules drifting in from the air...'
  else if (action === 'print') readout = wet ? 'In the nozzle: the water flashes to steam...' : 'In the nozzle: melting smoothly...'
  else if (action === 'dry') readout = `Drying${m.print.dryC != null ? ` at ${fmtC(m.print.dryC)}` : ''}: the water drifts back out...`
  else
    readout = {
      fresh: `Fresh from a sealed bag: no water inside yet (${m.short} thirst ${m.sim.thirst} of 5)`,
      soaked: `Left out: ${thirstWords(m.sim.thirst)} water soaked in between the chains`,
      popped: 'Pop! The water boiled into steam bubbles: rough surface and strings',
      smooth: 'Smooth: no water to boil, so it prints clean',
      dried: 'Dry again: ready to print',
    }[last]

  return (
    <SimFrame
      stage={
        <SimCanvas fitRadius={3.0} label={`${m.short} chains with water molecules`}>
          <ThirstScene m={m} wet={wet} action={action} p={p} />
        </SimCanvas>
      }
      controls={
        <Row>
          <ActionButton action="soak" icon={Droplets} label="Leave it out" onClick={() => start('soak')} disabled={timeline.running || wet} primary={!wet} accent={m.accent} />
          <ActionButton action="print" icon={Flame} label="Print it" onClick={() => start('print')} disabled={timeline.running} primary={wet} accent={m.accent} />
          <ActionButton
            action="dry"
            icon={Wind}
            label={m.print.dryC != null ? `Dry it at ${fmtC(m.print.dryC)}` : 'Dry it'}
            onClick={() => start('dry')}
            disabled={timeline.running || !wet}
          />
        </Row>
      }
      readout={readout}
      caption={caption(m)}
    />
  )
}

function ThirstScene({ m, wet, action, p }: { m: Material; wet: boolean; action: Action | null; p: number }) {
  const plan = useMemo(() => planTangle(m, { chains: 8, bounds: TANGLE }), [m])
  const drops = useMemo(() => planWater(m), [m])
  const time = action ? p * (MS[action] / 1000) : 0
  const printing = action === 'print'
  const heat = printing ? Math.sin(Math.PI * clamp01(p * 1.1)) : 0
  const amp = 0.02 + 0.12 * heat

  return (
    <group>
      {plan.paths.map((path, i) => (
        <Tube key={i} points={chainPoints(path, i, time, printing ? 0.6 : 0, amp)} color={m.accent} emissive={HOT} emissiveIntensity={heat * 0.18} radius={0.08} />
      ))}
      <Water drops={drops} wet={wet} action={action} p={p} time={time} />
      <Steam drops={drops} active={printing && wet} p={p} />
    </group>
  )
}

/** Where water molecule i is (and how big) for this state; scale 0 hides it. */
function dropState(d: Drop, wet: boolean, action: Action | null, p: number): { pos: THREE.Vector3; scale: number } {
  const move = easeInOut(clamp01((p - d.delay * 0.45) / 0.55))
  if (action === 'soak') return { pos: d.outside.clone().lerp(d.inside, move), scale: clamp01(p * 4 - d.delay) }
  if (action === 'dry') return { pos: d.inside.clone().lerp(d.outside, move), scale: 1 - clamp01((move - 0.6) / 0.4) }
  if (action === 'print') {
    if (!wet) return { pos: d.inside, scale: 0 }
    return { pos: d.inside, scale: p < d.delay * 0.6 ? 1 : 0 } // turns into a bubble
  }
  return { pos: d.inside, scale: wet ? 1 : 0 }
}

function Water({ drops, wet, action, p, time }: { drops: Drop[]; wet: boolean; action: Action | null; p: number; time: number }) {
  const oRef = useRef<THREE.InstancedMesh>(null)
  const hRef = useRef<THREE.InstancedMesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  const n = drops.length

  useLayoutEffect(() => {
    const o = oRef.current
    const h = hRef.current
    if (!o || !h) return
    const mtx = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const one = new THREE.Vector3()
    // The two hydrogens sit about 104.5 degrees apart on the oxygen.
    const half = THREE.MathUtils.degToRad(104.5 / 2)
    const hOffsets = [new THREE.Vector3(Math.sin(half), Math.cos(half), 0), new THREE.Vector3(-Math.sin(half), Math.cos(half), 0)].map((v) => v.multiplyScalar(0.24))
    drops.forEach((d, i) => {
      const { pos, scale } = dropState(d, wet, action, p)
      e.set(d.spin.x + time * 1.3, d.spin.y + time * 0.9, d.spin.z)
      q.setFromEuler(e)
      one.setScalar(scale)
      mtx.compose(pos, q, one)
      o.setMatrixAt(i, mtx)
      hOffsets.forEach((off, k) => {
        const at = off.clone().multiplyScalar(scale).applyQuaternion(q).add(pos)
        mtx.compose(at, q, one)
        h.setMatrixAt(i * 2 + k, mtx)
      })
    })
    o.instanceMatrix.needsUpdate = true
    h.instanceMatrix.needsUpdate = true
    invalidate()
  }, [drops, wet, action, p, time, invalidate])

  return (
    <group>
      <instancedMesh ref={oRef} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[0.17, 16, 12]} />
        <meshStandardMaterial color={WATER_O} roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={hRef} args={[undefined, undefined, n * 2]} frustumCulled={false}>
        <sphereGeometry args={[0.1, 12, 10]} />
        <meshStandardMaterial color={WATER_H} roughness={0.35} />
      </instancedMesh>
    </group>
  )
}

/** Steam: each water molecule swells into a bubble, then pops. */
function Steam({ drops, active, p }: { drops: Drop[]; active: boolean; p: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const mtx = new THREE.Matrix4()
    drops.forEach((d, i) => {
      const t0 = d.delay * 0.6
      const grow = clamp01((p - t0) / 0.25)
      const alive = active && p >= t0 && p < t0 + 0.3
      const r = alive ? d.bubble * (0.3 + 0.7 * easeInOut(grow)) : 0
      mtx.makeScale(r, r, r).setPosition(d.inside)
      mesh.setMatrixAt(i, mtx)
    })
    mesh.instanceMatrix.needsUpdate = true
    invalidate()
  }, [drops, active, p, invalidate])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, drops.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 20, 14]} />
      <meshStandardMaterial color="#FFFFFF" roughness={0.1} transparent opacity={0.4} depthWrite={false} />
    </instancedMesh>
  )
}

export default ThirstSim

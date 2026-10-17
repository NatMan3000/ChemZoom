import { useEffect, useLayoutEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { beadGeometry, beadRingCount, beadRings, hotPlastic, writeBead, type BeadShaping } from './beadGeometry'
import { LAYER_H, LINE_W } from './scale'

export interface BeadProps extends BeadShaping {
  /** Where the line starts and ends along x (each end is rounded). */
  from: number
  to: number
  colour: string
  /** Where the line's centre sits; it runs along x. */
  position?: [number, number, number]
  /** Rings between the two ends: more for a line that glows, curls or roughens along its length. */
  body?: number
  roughness?: number
}

/**
 * One printed line, side on along x: a rounded-rectangle cross-section at real size (0.45 mm by 0.2 mm by
 * default), glowing where `heatAt` says it is hot, curled or squashed by `form`, roughened by `bump`.
 * Rewritten only when React renders it, so it costs nothing at rest.
 */
export function Bead({ from, to, colour, position = [0, 0, 0], body = 2, roughness = 0.45, width = LINE_W, height = LAYER_H, heatAt, form, bump }: BeadProps) {
  const invalidate = useThree((s) => s.invalidate)
  const geom = useMemo(() => beadGeometry(beadRingCount(body)), [body])
  const mat = useMemo(() => hotPlastic(colour, roughness), [colour, roughness])
  useEffect(() => () => geom.dispose(), [geom])
  useEffect(() => () => mat.dispose(), [mat])
  useLayoutEffect(() => {
    writeBead(geom, beadRings(from, to, body, width), { width, height, heatAt, form, bump })
    invalidate()
  }, [geom, from, to, body, width, height, heatAt, form, bump, invalidate])
  return <mesh geometry={geom} material={mat} position={position} frustumCulled={false} />
}

export interface LayerStackProps {
  /** How many cooled layers, counted down from the top one (k = 0). */
  layers: number
  /** Where the top of the stack is. */
  top?: number
  from: number
  to: number
  colour: (k: number) => string
  height?: number
  width?: number
  z?: number
}

/** Cooled layers stacked under `top`, each a straight printed line from `from` to `to`. */
export function LayerStack({ layers, top = 0, from, to, colour, height = LAYER_H, width = LINE_W, z = 0 }: LayerStackProps) {
  return (
    <group>
      {Array.from({ length: layers }, (_, k) => (
        <Bead key={k} from={from} to={to} colour={colour(k)} position={[0, top - height * (k + 0.5), z]} width={width} height={height} />
      ))}
    </group>
  )
}

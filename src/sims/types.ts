import type { ComponentType } from 'react'
import type { Material, MaterialId, Text } from '../types/chem'

/**
 * A concept sim: one question about how a filament behaves, answered with a small 3D scene
 * and a control (usually a slider). Lane C builds these; the app lists whichever apply to a material.
 *
 * Rules every sim keeps:
 * - Renders its own <Canvas> with frameloop="demand"; animates only while the user is dragging or
 *   has pressed play, and stops by itself (no always-on motion on screen).
 * - Honours prefers-reduced-motion (jump to the end state instead of animating).
 * - Fills its container; the app decides the size.
 */
export interface SimProps {
  material: Material
  /** Second material for a side-by-side (UV: ABS vs ASA). Optional. */
  compareWith?: Material
}

export interface SimDef {
  id: string
  title: string // 'Heat it up'
  question: Text // 'Why does PLA sag in a hot car?'
  appliesTo: MaterialId[] | 'all'
  /** Suggested partner for compareWith, if the sim is best as a pair. */
  pairWith?: Partial<Record<MaterialId, MaterialId>>
  Component: ComponentType<SimProps>
}

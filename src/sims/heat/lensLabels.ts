import type { Material } from '../../types/chem'
import { patchesOf } from '../shared/material'
import type { LensLabel } from '../shared/printing'

/** Radius of the chain lens on the wall, in scene units. */
export const LENS_R = 2.4

/** The labels beside the lens: what the chains are, what holds them (if anything), and that it is a sketch. */
export function heatLensLabels(m: Material): LensLabel[] {
  const kind = patchesOf(m)
  const extra = kind === 'crystals' ? 'crystals' : kind === 'islands' ? 'hard islands' : m.morphology === 'rubber-toughened' ? 'rubber' : null
  const out: LensLabel[] = [{ id: 'chains', text: 'chains', colour: '#E8ECF7', at: [LENS_R + 0.3, 0.75], align: 'left' }]
  if (extra) out.push({ id: 'extra', text: extra, colour: '#E8ECF7', at: [LENS_R + 0.3, 0.05], align: 'left' })
  // Beside the lens, not under it, so the leader line down to the wall never runs through it.
  out.push({ id: 'sketch', text: 'sketch, not to scale', colour: '#A3AECB', at: [LENS_R + 0.3, extra ? -0.65 : 0.05], align: 'left' })
  return out
}


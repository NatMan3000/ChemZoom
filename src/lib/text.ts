import type { TraitId } from '../types/chem'

/** Every trait reads higher = better (lead ruling, 17 Oct 2026). */
export const TRAIT_LABELS: Record<TraitId, string> = {
  strength: 'Toughness',
  flexibility: 'Flexibility',
  heat: 'Heat resistance',
  uv: 'Sun resistance',
  easy: 'Easy to print',
  moisture: 'Stays dry',
}

export const ENCLOSURE_LABELS = { no: 'Not needed', helps: 'Helps', yes: 'Needed' } as const

export const MORPHOLOGY_LABELS = {
  semicrystalline: 'Tangle with crystals',
  amorphous: 'Pure tangle',
  segmented: 'Hard islands, soft springs',
  'rubber-toughened': 'Glassy tangle with rubber blobs',
} as const

export function range([a, b]: [number, number], unit = '°C'): string {
  return a === b ? `${a}${unit}` : `${a} to ${b}${unit}`
}

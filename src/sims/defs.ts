import { materialList } from '../content'
import type { Material, MaterialId } from '../types/chem'
import type { SimDef } from './types'
import { keyed } from './shared/keyed'

// The five sims as SimDefs, in the order the app lists them. Which materials each applies to and
// which partner it pairs with are worked out from Material fields, so a new material slots in
// without code changes. Each component is lazy-loaded (the sims' code downloads only when one is
// opened) and keyed by material so switching material starts the sim fresh.

function pairs(pick: (m: Material) => Material | undefined): Partial<Record<MaterialId, MaterialId>> {
  const out: Partial<Record<MaterialId, MaterialId>> = {}
  for (const m of materialList) {
    const partner = pick(m)
    if (partner && partner.id !== m.id) out[m.id] = partner.id
  }
  return out
}

// Cool and warp: a material that shrinks a lot pairs with the one that shrinks least (ABS with PLA).
const leastShrink = [...materialList].sort((a, b) => a.sim.shrink - b.sim.shrink)[0]
const warpPairs = pairs((m) => (m.sim.shrink >= 3 ? leastShrink : undefined))

// Sunlight: materials with a rubber, or a UV weak spot. One with a weak spot pairs with a
// rubber-toughened one without (ABS with ASA), and the other way round.
const rubbery = materialList.filter((m) => m.sim.uvWeakSpot || m.sim.rubberBlobs || m.morphology === 'rubber-toughened')
const sunPairs = pairs((m) => rubbery.find((x) => x.id !== m.id && !!x.sim.uvWeakSpot !== !!m.sim.uvWeakSpot))

export const heat: SimDef = {
  id: 'heat',
  title: 'Heat it up',
  question: {
    simple: 'Why does a print sag in a hot car, and why does each filament need a different nozzle temperature?',
    deeper: 'Glass transition, crystal melting and melt flow, read off each material’s own temperatures.',
  },
  appliesTo: 'all',
  Component: keyed(() => import('./heat/HeatSim')),
}

export const warp: SimDef = {
  id: 'warp',
  title: 'Cool and warp',
  question: {
    simple: 'Why do some prints lift off the bed at the corners?',
    deeper: 'Thermal contraction and uneven cooling between layers, and why an enclosure helps.',
  },
  appliesTo: 'all',
  pairWith: warpPairs,
  Component: keyed(() => import('./warp/WarpSim')),
}

export const layers: SimDef = {
  id: 'layers',
  title: 'Layer bonding',
  question: {
    simple: 'Why are prints weaker between layers, and why does hotter help?',
    deeper: 'Chains diffusing across the weld line while it is above the glass transition.',
  },
  appliesTo: 'all',
  Component: keyed(() => import('./layers/LayerSim')),
}

export const sun: SimDef = {
  id: 'sun',
  title: 'Sunlight',
  question: {
    simple: 'Why do some plastics go yellow and brittle outside while others do not?',
    deeper: 'UV light snapping a weak bond in the rubber, and a rubber that has none to snap.',
  },
  appliesTo: rubbery.map((m) => m.id),
  pairWith: sunPairs,
  Component: keyed(() => import('./sun/SunSim')),
}

export const thirst: SimDef = {
  id: 'thirst',
  title: 'Thirsty plastic',
  question: {
    simple: 'Why does wet filament pop and string?',
    deeper: 'Water absorbed between the chains flashing to steam in the hot nozzle.',
  },
  appliesTo: 'all',
  Component: keyed(() => import('./thirst/ThirstSim')),
}

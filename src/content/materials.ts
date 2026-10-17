import type { Material, Text, ZoomLevel } from '../types/chem'

// STUB: rough values so the app and sims lanes can build. The content lane replaces every
// field with checked text and sourced numbers (plans/build-chemzoom.md, Lane A).

const stubZoom = (short: string): Record<ZoomLevel, Text> => ({
  spool: { simple: `A spool of ${short}.` },
  strand: { simple: `One strand of ${short}, 1.75 mm across.` },
  tangle: { simple: 'Inside the strand: long chains tangled like cooked spaghetti.' },
  chain: { simple: 'One chain: the same small piece repeated thousands of times.' },
  molecule: { simple: 'The repeat unit, atom by atom.' },
  atom: { simple: 'Tap an atom to see what it is.' },
})

export const materials: Record<Material['id'], Material> = {
  pla: {
    id: 'pla', short: 'PLA', fullName: 'Polylactic acid', nickname: 'The plant-based one', accent: '#4ADE80', densityGcm3: 1.24,
    madeFrom: { simple: 'Sugar from plants like corn, fermented into lactic acid.' },
    keyIdea: { simple: 'Stiff and easy to print, but softens in a hot car.' },
    monomers: [], oligomer: 'pla-oligomer', repeatUnitGroup: 'repeat', morphology: 'semicrystalline', zoom: stubZoom('PLA'),
    traits: [
      { id: 'strength', score: 3, why: { simple: 'Stiff but snaps rather than bends.' } },
      { id: 'flexibility', score: 1, why: { simple: 'Brittle.' } },
      { id: 'heat', score: 1, why: { simple: 'Softens around 60°C.' } },
      { id: 'uv', score: 2, why: { simple: 'Fades and weakens outside.' } },
      { id: 'easy', score: 5, why: { simple: 'The easiest to print.' } },
      { id: 'moisture', score: 2, why: { simple: 'Soaks up a little water.' } },
    ],
    temps: { tgC: 60, meltC: 165, nozzleC: [190, 230], bedC: [35, 60] },
    print: { enclosure: 'no', tips: [{ simple: 'Keep the door open so it cools fast.' }] },
    sim: { shrink: 1, thirst: 2 }, facts: [], sources: [],
  },
  petg: {
    id: 'petg', short: 'PETG', fullName: 'Polyethylene terephthalate glycol', nickname: 'The drink-bottle cousin', accent: '#22D3EE', densityGcm3: 1.27,
    madeFrom: { simple: 'The same stuff as drink bottles, with an extra ingredient.' },
    keyIdea: { simple: 'Tougher than PLA and handles more heat.' },
    monomers: [], oligomer: 'petg-oligomer', repeatUnitGroup: 'repeat', morphology: 'amorphous', zoom: stubZoom('PETG'),
    traits: [
      { id: 'strength', score: 4, why: { simple: 'Tough.' } },
      { id: 'flexibility', score: 2, why: { simple: 'Bends a little before breaking.' } },
      { id: 'heat', score: 2, why: { simple: 'Softens around 80°C.' } },
      { id: 'uv', score: 3, why: { simple: 'OK outside.' } },
      { id: 'easy', score: 4, why: { simple: 'Easy, but strings.' } },
      { id: 'moisture', score: 3, why: { simple: 'Needs drying if left out.' } },
    ],
    temps: { tgC: 80, nozzleC: [230, 260], bedC: [70, 80] },
    print: { enclosure: 'no', tips: [{ simple: 'Dry it if it pops or strings.' }] },
    sim: { shrink: 2, thirst: 3 }, facts: [], sources: [],
  },
  tpu: {
    id: 'tpu', short: 'TPU', fullName: 'Thermoplastic polyurethane', nickname: 'The rubbery one', accent: '#F472B6', densityGcm3: 1.21,
    madeFrom: { simple: 'Two kinds of building block: hard ones and soft, springy ones.' },
    keyIdea: { simple: 'Hard bits clump together and hold soft springy bits in place, so it stretches and snaps back.' },
    monomers: [], oligomer: 'tpu-hard', repeatUnitGroup: 'urethane', morphology: 'segmented', zoom: stubZoom('TPU'),
    traits: [
      { id: 'strength', score: 3, why: { simple: 'Hard to tear.' } },
      { id: 'flexibility', score: 5, why: { simple: 'Bends and stretches.' } },
      { id: 'heat', score: 2, why: { simple: 'Gets softer when warm.' } },
      { id: 'uv', score: 3, why: { simple: 'OK outside.' } },
      { id: 'easy', score: 2, why: { simple: 'Print slowly.' } },
      { id: 'moisture', score: 4, why: { simple: 'Thirsty: dry it first.' } },
    ],
    temps: { tgC: -30, meltC: 200, nozzleC: [220, 240], bedC: [30, 35] },
    print: { enclosure: 'no', tips: [{ simple: 'Print slowly.' }] },
    sim: { shrink: 1, thirst: 4, hardSegments: { molecule: 'tpu-hard' } }, facts: [], sources: [],
  },
  abs: {
    id: 'abs', short: 'ABS', fullName: 'Acrylonitrile butadiene styrene', nickname: 'The Lego one', accent: '#FBBF24', densityGcm3: 1.05,
    madeFrom: { simple: 'Three building blocks from oil: acrylonitrile, butadiene and styrene.' },
    keyIdea: { simple: 'Tough and heat-proof, but sunlight breaks its rubber.' },
    monomers: [], oligomer: 'abs-oligomer', repeatUnitGroup: 'double-bond', morphology: 'rubber-toughened', zoom: stubZoom('ABS'),
    traits: [
      { id: 'strength', score: 4, why: { simple: 'Tough.' } },
      { id: 'flexibility', score: 2, why: { simple: 'A little give.' } },
      { id: 'heat', score: 4, why: { simple: 'Handles about 100°C.' } },
      { id: 'uv', score: 1, why: { simple: 'Sunlight makes it brittle and yellow.' } },
      { id: 'easy', score: 2, why: { simple: 'Warps without an enclosure.' } },
      { id: 'moisture', score: 2, why: { simple: 'Soaks up a little water.' } },
    ],
    temps: { tgC: 105, nozzleC: [240, 280], bedC: [90, 100] },
    print: { enclosure: 'yes', tips: [{ simple: 'Close the door: it warps if it cools too fast.' }] },
    sim: { shrink: 4, thirst: 2, uvWeakSpot: { molecule: 'abs-oligomer', group: 'double-bond' }, rubberBlobs: { molecule: 'abs-oligomer' } }, facts: [], sources: [],
  },
  asa: {
    id: 'asa', short: 'ASA', fullName: 'Acrylonitrile styrene acrylate', nickname: 'The outdoor one', accent: '#FB923C', densityGcm3: 1.07,
    madeFrom: { simple: 'Like ABS, but with a different rubber.' },
    keyIdea: { simple: 'ABS with a rubber that sunlight cannot break, so it lasts outdoors.' },
    monomers: [], oligomer: 'asa-oligomer', repeatUnitGroup: 'acrylate', morphology: 'rubber-toughened', zoom: stubZoom('ASA'),
    traits: [
      { id: 'strength', score: 4, why: { simple: 'Tough.' } },
      { id: 'flexibility', score: 2, why: { simple: 'A little give.' } },
      { id: 'heat', score: 4, why: { simple: 'Handles about 100°C.' } },
      { id: 'uv', score: 5, why: { simple: 'Made for outdoors.' } },
      { id: 'easy', score: 2, why: { simple: 'Warps without an enclosure.' } },
      { id: 'moisture', score: 2, why: { simple: 'Soaks up a little water.' } },
    ],
    temps: { tgC: 100, nozzleC: [240, 280], bedC: [90, 100] },
    print: { enclosure: 'yes', tips: [{ simple: 'Close the door.' }] },
    sim: { shrink: 3, thirst: 2, rubberBlobs: { molecule: 'asa-oligomer' } }, facts: [], sources: [],
  },
}

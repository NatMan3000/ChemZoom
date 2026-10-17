import type { Material } from '../types/chem'
import { FilamentEnd } from './FilamentEnd'

// Close-up of the cut end of one 1.75 mm strand. The cut face hints at the tangle inside. It IS the spool's
// loose end, magnified (FilamentEnd, sceneLayout strandCurve): the same curl, the same way round, so zooming
// into the tail lands on this strand with nothing moving or doubling.

export function StrandScene({ material }: { material: Material }) {
  return <FilamentEnd accent={material.accent} />
}

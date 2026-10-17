import { AtomLegend } from '../../components/AtomLegend'
import { StageKey, type StageKeyItem } from '../../components/StageKey'
import { RUBBER_COLOUR, ROLE_LABELS, roleColour } from '../../scenes/palette'
import { chainRoles, tangleRoles } from '../../scenes/stageKeys'
import type { Material, Molecule, ZoomLevel } from '../../types/chem'

/** The bottom-left of the stage: what the colours mean at this step. */
export function StageFoot({ material, level, molecule }: { material: Material; level: ZoomLevel; molecule: Molecule | null }) {
  let items: StageKeyItem[] | null = null
  if (level === 'tangle')
    items = tangleRoles(material).map((r) => ({ colour: r === 'rubber' ? RUBBER_COLOUR : `#${roleColour(material.accent, r, 0.7).getHexString()}`, label: ROLE_LABELS[r] }))
  if (level === 'chain')
    items = chainRoles(material).map((r) => ({
      colour: `#${roleColour(material.accent, r, 0.6).getHexString()}`,
      label: r === 'focus' ? 'The unit we zoom into next' : r === 'soft' ? 'Soft segment' : material.morphology === 'segmented' ? 'Hard segment' : 'One repeat unit',
    }))
  if (items) return <StageKey items={items} />
  if ((level === 'molecule' || level === 'atom') && molecule)
    return (
      <div className="pointer-events-auto rounded-2xl border border-line/60 bg-stage/75 px-3 py-2 backdrop-blur-md">
        <AtomLegend molecule={molecule} />
      </div>
    )
  return null
}

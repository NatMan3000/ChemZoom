import { materialList } from '../content'
import type { MaterialId } from '../types/chem'
import { MaterialChip } from './MaterialChip'

/** Five chips to hop between materials. `hrefFor` keeps whatever the page wants kept (the zoom step, the sim). */
export function MaterialSwitcher({ current, hrefFor, only }: { current: MaterialId; hrefFor: (id: MaterialId) => string; only?: MaterialId[] }) {
  const list = only ? materialList.filter((m) => only.includes(m.id)) : materialList
  return (
    <nav aria-label="Switch material" className="grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
      {list.map((m) => (
        <MaterialChip key={m.id} material={m} active={m.id === current} to={hrefFor(m.id)} replace />
      ))}
    </nav>
  )
}

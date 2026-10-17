import { ENCLOSURE_LABELS, range } from './text'
import type { Material } from '../types/chem'

/** The printing numbers for a material, as label / value rows. */
export function tempRows(m: Material): { label: string; value: string; hint?: string }[] {
  const rows: { label: string; value: string; hint?: string }[] = [
    { label: 'Nozzle', value: range(m.temps.nozzleC) },
    { label: 'Bed', value: range(m.temps.bedC) },
    { label: 'Softens (Tg)', value: `${m.temps.tgC}°C`, hint: 'Glass transition: above this the chains can start to slide' },
  ]
  if (m.temps.meltC !== undefined) rows.push({ label: 'Crystals melt', value: `${m.temps.meltC}°C` })
  if (m.temps.hdtC !== undefined) rows.push({ label: 'Bends under load', value: `${m.temps.hdtC}°C`, hint: 'Heat deflection temperature' })
  rows.push({ label: 'Enclosure', value: ENCLOSURE_LABELS[m.print.enclosure] })
  rows.push({ label: 'Dry it at', value: m.print.dryC !== undefined ? `${m.print.dryC}°C` : 'Not usually needed' })
  return rows
}

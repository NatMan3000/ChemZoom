import type { Collection, Material, MaterialId, Molecule } from '../types/chem'
import { elements } from './elements'
import { materials } from './materials'

export { elements, materials }

const moleculeFiles = import.meta.glob<Molecule>('../data/molecules/*.json', { eager: true, import: 'default' })

export const molecules: Record<string, Molecule> = Object.fromEntries(
  Object.values(moleculeFiles).map((m) => [m.id, m]),
)

export function getMolecule(id: string): Molecule {
  const m = molecules[id]
  if (!m) throw new Error(`Unknown molecule "${id}" (is it in scripts/molecules.json and rebuilt?)`)
  return m
}

export const materialList: Material[] = (['pla', 'petg', 'tpu', 'abs', 'asa'] as MaterialId[]).map((id) => materials[id])

export const collections: Collection[] = [
  {
    id: 'filaments',
    title: '3D printing filaments',
    blurb: { simple: 'What is actually inside the plastic you print with, and why each one behaves differently.' },
    materials: ['pla', 'petg', 'tpu', 'abs', 'asa'],
  },
]

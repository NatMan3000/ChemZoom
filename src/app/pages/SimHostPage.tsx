import { Navigate, useParams } from 'react-router-dom'
import { materials } from '../../content'
import { experimentFor, materialPath } from '../../lib/routes'
import type { MaterialId } from '../../types/chem'
import { NotFound } from './NotFound'

/**
 * Old experiment links (#/m/:id/sim/:simId) from before experiments played inside the material page
 * (spec/design-intent.md P9): send them to the material page with that experiment open.
 */
export default function SimHostPage() {
  const { id, simId } = useParams()
  const material = id ? materials[id as MaterialId] : undefined
  if (!material) return <NotFound />
  const sim = experimentFor(material, simId)
  return <Navigate to={materialPath(material.id, 'spool', sim?.id)} replace />
}

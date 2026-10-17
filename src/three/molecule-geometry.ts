import * as THREE from 'three'
import { elements } from '../content/elements'
import type { Molecule } from '../types/chem'

/** Radius of the smallest sphere around the origin that holds every atom (ball radii included). */
export function moleculeRadius(molecule: Molecule, atomScale = 1): number {
  let r = 0
  for (const a of molecule.atoms) {
    const ball = (elements[a.el]?.radius ?? 0.4) * atomScale
    r = Math.max(r, Math.hypot(a.x, a.y, a.z) + ball)
  }
  return r || 1
}

/** Centre of the atoms' bounding box (RDKit output is centred already; this guards hand-made data). */
export function moleculeCentre(molecule: Molecule): THREE.Vector3 {
  const box = new THREE.Box3()
  for (const a of molecule.atoms) box.expandByPoint(new THREE.Vector3(a.x, a.y, a.z))
  return box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3())
}

/** Half-extents of the molecule's bounding box about its centre, ball radii included. */
export function moleculeHalfExtents(molecule: Molecule, atomScale = 1): THREE.Vector3 {
  const box = new THREE.Box3()
  const v = new THREE.Vector3()
  for (const a of molecule.atoms) {
    const r = (elements[a.el]?.radius ?? 0.4) * atomScale
    box.expandByPoint(v.set(a.x - r, a.y - r, a.z - r))
    box.expandByPoint(v.set(a.x + r, a.y + r, a.z + r))
  }
  return box.isEmpty() ? new THREE.Vector3(1, 1, 1) : box.getSize(new THREE.Vector3()).multiplyScalar(0.5)
}

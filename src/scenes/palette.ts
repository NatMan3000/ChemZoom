import * as THREE from 'three'
import type { StrandRole } from '../three/chains'

/** The rubber blobs in ABS and ASA: a colour no material owns, so they read as "something else". */
export const RUBBER_COLOUR = '#A78BFA'

/** A shade of the material's accent for one tube in a tangle or one bead in a chain. */
export function roleColour(accent: string, role: StrandRole, shade = 0.5): THREE.Color {
  const c = new THREE.Color(accent)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  switch (role) {
    case 'focus':
      return new THREE.Color('#ffffff').lerp(c, 0.18)
    case 'crystal':
    case 'hard':
      return new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.05), Math.min(0.72, hsl.l + 0.08))
    case 'soft':
      return new THREE.Color().setHSL(hsl.h, hsl.s * 0.45, 0.36 + shade * 0.14)
    case 'rubber':
      return new THREE.Color(RUBBER_COLOUR).offsetHSL(0, 0, (shade - 0.5) * 0.12)
    default:
      return new THREE.Color().setHSL(hsl.h, hsl.s * 0.7, 0.3 + shade * 0.18)
  }
}

export const ROLE_LABELS: Record<StrandRole, string> = {
  chain: 'Polymer chains',
  focus: 'The chain we pull out next',
  crystal: 'Crystals: chains folded neatly',
  hard: 'Hard islands',
  soft: 'Soft, springy chain bits',
  rubber: 'Rubber blobs',
}

import type { LucideIcon } from 'lucide-react'
import { Atom, Cylinder, GitCommitHorizontal, Hexagon, Spline, Spool } from 'lucide-react'
import { ZOOM_LEVELS, type ZoomLevel } from '../types/chem'

export interface ZoomStepInfo {
  level: ZoomLevel
  label: string
  icon: LucideIcon
  /** The on-stage scale readout: how big the thing on screen is, and "A sketch" wherever the picture simplifies (P8). */
  scale: string
}

export const ZOOM_STEPS: ZoomStepInfo[] = [
  { level: 'spool', label: 'Spool', icon: Spool, scale: 'About 20 cm across' },
  { level: 'strand', label: 'Strand', icon: Cylinder, scale: '1.75 mm across' },
  { level: 'tangle', label: 'Tangle', icon: Spline, scale: 'A sketch: far too small to see' },
  { level: 'chain', label: 'Chain', icon: GitCommitHorizontal, scale: 'A sketch: one chain, thousands of units long' },
  { level: 'molecule', label: 'Molecule', icon: Hexagon, scale: 'About 1 to 3 nm long' },
  { level: 'atom', label: 'Atom', icon: Atom, scale: 'A sketch of one atom, about 0.3 nm across' },
]

export function isZoomLevel(s: string | undefined): s is ZoomLevel {
  return !!s && (ZOOM_LEVELS as string[]).includes(s)
}

export const levelIndex = (l: ZoomLevel) => ZOOM_LEVELS.indexOf(l)

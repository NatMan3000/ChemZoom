import { useCallback, useRef, type RefObject } from 'react'

// Labels beside a chain lens are DOM text over the stage (crisp at any size). The sim renders them with
// <LensLabelOverlay> in SimFrame's overlay; the lens moves them into place on every frame the canvas draws.

export interface LensLabel {
  id: string
  text: string
  colour: string
  /** Where the label is anchored, in lens units from the lens centre (x right, y up, as seen on screen). */
  at: [number, number]
  /** Which way the text runs from its anchor. */
  align: 'left' | 'right' | 'below' | 'above'
}

/** Moves label `id` to a CSS transform, or hides it (null). */
export type PlaceLabel = (id: string, transform: string | null) => void

export interface LensLabels {
  refs: RefObject<Record<string, HTMLElement | null>>
  place: PlaceLabel
}

/** One per sim: holds the label elements and moves them. No loop of its own. */
export function useLensLabels(): LensLabels {
  const refs = useRef<Record<string, HTMLElement | null>>({})
  const place = useCallback<PlaceLabel>((id, transform) => {
    const el = refs.current[id]
    if (!el) return
    if (transform == null) {
      el.style.visibility = 'hidden'
      return
    }
    el.style.transform = transform
    el.style.visibility = 'visible'
  }, [])
  return { refs, place }
}

/** The CSS transform that puts a label's anchor at (x, y) px with its text running the `align` way. */
export function labelTransform(x: number, y: number, align: LensLabel['align']): string {
  const at = `translate(${x}px, ${y}px)`
  if (align === 'below') return `${at} translate(-50%, 0)`
  if (align === 'above') return `${at} translate(-50%, -100%)`
  if (align === 'right') return `${at} translate(-100%, -50%)`
  return `${at} translate(0, -50%)`
}

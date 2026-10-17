import { createContext, useContext } from 'react'

/**
 * Where a sim draws when it plays inside a material page (spec/design-intent.md P9): its 3D stage goes
 * into the page's stage, its controls, readout and caption into the side panel. The page provides both
 * elements; with no provider, SimFrame falls back to its own stacked layout.
 */
export interface SimSlots {
  stage: HTMLElement
  panel: HTMLElement
}

export const SimSlotsContext = createContext<SimSlots | null>(null)

export const useSimSlots = () => useContext(SimSlotsContext)

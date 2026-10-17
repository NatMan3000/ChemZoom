import type { ReactNode } from 'react'
import { Html } from '@react-three/drei'

// A small label pinned to a point in a 3D scene (drei <Html>, not <Text>: Text fetches a font from a CDN).
// Mount it only when the scene is settled on stage: Html ignores the cross-fade, so the director decides.
// zIndexRange 0 keeps it under the stage's rail and badges, which come later in the page.

export function StageLabel({ position, children }: { position: [number, number, number]; children: ReactNode }) {
  return (
    <Html position={position} center zIndexRange={[0, 0]} pointerEvents="none">
      <span className="block whitespace-nowrap rounded-full border border-line/70 bg-stage/80 px-3 py-1 text-sm font-semibold text-ink shadow-lg backdrop-blur-md transition-opacity duration-200 starting:opacity-0">
        {children}
      </span>
    </Html>
  )
}

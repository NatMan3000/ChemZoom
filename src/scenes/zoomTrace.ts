import * as THREE from 'three'

// A test hook for the continuous zoom, off unless a harness asks for it: set `window.__czZoomTrace = []` before
// the app loads and the stage pushes one record per frame it actually draws (after the draw), saying where the
// zoom is and how much of each scene group was on screen. The frame-by-frame capture
// (/tmp/chemzoom-shot/zoom4-frames.ts) reads it to catch a zoom that moves by itself and a frame that shows a
// level which had already faded out. Costs nothing when the array is absent.

export interface ZoomTraceRecord {
  /** performance.now() of the frame. */
  t: number
  z: number
  zTarget: number
  /** A flight (rail tap, tapped atom, an outside level change) was running. */
  flight: boolean
  /** Camera distance to the orbit target, in stage units. */
  dist: number
  /** Per scene group (and per named part of the spool), the highest opacity drawn this frame; 0 when not drawn. */
  drawn: Record<string, number>
}

export function zoomTrace(): ZoomTraceRecord[] | null {
  const w = globalThis as unknown as { __czZoomTrace?: ZoomTraceRecord[] }
  return Array.isArray(w.__czZoomTrace) ? w.__czZoomTrace : null
}

/** The highest opacity of any mesh under `root` that the renderer draws (every ancestor up to the scene visible). */
export function drawnOpacity(root: THREE.Object3D): number {
  for (let o: THREE.Object3D | null = root; o; o = o.parent) if (!o.visible) return 0
  let best = 0
  root.traverseVisible((o) => {
    const mat = (o as THREE.Mesh).material
    if (!mat) return
    for (const m of Array.isArray(mat) ? mat : [mat]) if (m.visible && m.opacity > best) best = m.opacity
  })
  return best
}

import { useEffect, type RefObject } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { View } from '@react-three/drei'
import * as THREE from 'three'

// One WebGL canvas for a whole scrolling page of small 3D views (compare, basics).
// Each <View> on the page is a tracked div; this canvas sits over the scroll area and draws them all.
// It renders on demand, so scrolling and resizing ask for a frame.

function InvalidateOn({ scroller }: { scroller: RefObject<HTMLElement | null> }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    const el = scroller.current
    const kick = () => invalidate()
    el?.addEventListener('scroll', kick, { passive: true })
    window.addEventListener('resize', kick)
    const ro = el ? new ResizeObserver(kick) : null
    if (el && ro) {
      ro.observe(el)
      for (const child of Array.from(el.children)) ro.observe(child)
    }
    return () => {
      el?.removeEventListener('scroll', kick)
      window.removeEventListener('resize', kick)
      ro?.disconnect()
    }
  }, [scroller, invalidate])
  return null
}

export function ViewCanvas({ eventSource, scroller }: { eventSource: RefObject<HTMLElement | null>; scroller: RefObject<HTMLElement | null> }) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      eventSource={eventSource as RefObject<HTMLElement>}
      eventPrefix="client"
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping
        gl.setClearColor(0x000000, 0)
      }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <View.Port />
      <InvalidateOn scroller={scroller} />
    </Canvas>
  )
}

import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

export function useElementSize<T extends HTMLElement>(): [RefObject<T | null>, { width: number; height: number }] {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size]
}

/** Two materials side by side, or one above the other when the stage is taller than it is wide. */
export const isStacked = (s: { width: number; height: number }) => s.width > 0 && s.width / s.height < 1.1

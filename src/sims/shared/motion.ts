import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

// Motion helpers every sim shares. The rule (PRODUCT.md, DESIGN.md § Motion): nothing moves unless the
// user dragged or pressed play, and it stops by itself. Each loop here runs on requestAnimationFrame only
// while there is a reason to, then cancels itself; the canvases use frameloop="demand".

const REDUCED = '(prefers-reduced-motion: reduce)'

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  )
}

/**
 * A one-shot timeline. `run(ms, onFrame)` calls onFrame with progress 0..1 on every animation frame,
 * finishes at exactly 1 and stops. With reduced motion it calls onFrame(1) at once (jump to the end state).
 */
export function useTimeline(reduced: boolean) {
  const [running, setRunning] = useState(false)
  const raf = useRef(0)

  const cancel = useCallback(() => {
    cancelAnimationFrame(raf.current)
    raf.current = 0
    setRunning(false)
  }, [])

  const run = useCallback(
    (ms: number, onFrame: (p: number) => void, onDone?: () => void) => {
      cancelAnimationFrame(raf.current)
      raf.current = 0
      if (reduced || ms <= 0) {
        onFrame(1)
        setRunning(false)
        onDone?.()
        return
      }
      const start = performance.now()
      setRunning(true)
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / ms)
        onFrame(p)
        if (p < 1) {
          raf.current = requestAnimationFrame(tick)
        } else {
          raf.current = 0
          setRunning(false)
          onDone?.()
        }
      }
      raf.current = requestAnimationFrame(tick)
    },
    [reduced],
  )

  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return { running, run, cancel }
}

/**
 * Wall-clock seconds for jiggling chains. Time advances only while `holding` is true (a timeline is
 * running) or for a short while after `kick()` (the user is dragging a slider), then the loop stops.
 * Reduced motion: time never advances, so the scene shows a still frame for each slider value.
 */
export function useMotionClock(reduced: boolean, holding = false) {
  const [time, setTime] = useState(0)
  const raf = useRef(0)
  const until = useRef(0)
  const last = useRef(0)
  const hold = useRef(holding)

  const ensure = useCallback(() => {
    if (raf.current) return
    last.current = performance.now()
    function tick(now: number) {
      const dt = Math.min(0.05, (now - last.current) / 1000)
      last.current = now
      setTime((t) => t + dt)
      if (hold.current || now < until.current) raf.current = requestAnimationFrame(tick)
      else raf.current = 0
    }
    raf.current = requestAnimationFrame(tick)
  }, [])

  const kick = useCallback(
    (ms = 900) => {
      if (reduced) return
      until.current = performance.now() + ms
      ensure()
    },
    [reduced, ensure],
  )

  useEffect(() => {
    hold.current = holding && !reduced
    if (hold.current) ensure()
  }, [holding, reduced, ensure])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return { time, kick }
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

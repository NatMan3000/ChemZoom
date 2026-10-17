import { useSyncExternalStore } from 'react'

// One simple/deeper switch for the whole app, remembered on this device (spec/design-intent.md P10).
// Every `Text` reads it: simple shows `simple`; deeper shows `simple` followed by `deeper`.

export type Depth = 'simple' | 'deeper'

const KEY = 'chemzoom.depth'
const listeners = new Set<() => void>()

function read(): Depth {
  try {
    return localStorage.getItem(KEY) === 'deeper' ? 'deeper' : 'simple'
  } catch {
    return 'simple' // storage blocked (private mode): fall back to simple, the switch still works for this visit
  }
}

let current: Depth = typeof window === 'undefined' ? 'simple' : read()

export function setDepth(d: Depth) {
  current = d
  try {
    localStorage.setItem(KEY, d)
  } catch {
    // Not remembered when storage is blocked; the choice still holds until reload.
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  // Another tab changing the switch updates this one too.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      current = read()
      cb()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', onStorage)
  }
}

export function useDepth(): Depth {
  return useSyncExternalStore(subscribe, () => current, () => 'simple')
}

export const useDeeper = () => useDepth() === 'deeper'

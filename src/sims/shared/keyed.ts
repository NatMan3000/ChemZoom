import { createElement, lazy, Suspense, type ComponentType } from 'react'
import type { SimProps } from '../types'

/**
 * Wraps a lazily loaded sim so its code downloads only when it is opened, and keys it by material
 * so switching material (or partner) starts the sim fresh instead of carrying over its state.
 * (createElement rather than JSX keeps this a plain module for fast refresh.)
 */
export function keyed(load: () => Promise<{ default: ComponentType<SimProps> }>): ComponentType<SimProps> {
  const lazySim = lazy(load)
  const fallback = createElement('div', { className: 'h-full w-full bg-stage' })
  return function keyedSim(props: SimProps) {
    return createElement(Suspense, { fallback }, createElement(lazySim, { key: `${props.material.id}:${props.compareWith?.id ?? ''}`, ...props }))
  }
}

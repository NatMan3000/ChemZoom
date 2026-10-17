import clsx from 'clsx'
import { useDeeper } from '../lib/depth'
import type { Text } from '../types/chem'

const SIZES = {
  sm: 'text-sm leading-relaxed',
  base: 'text-base leading-relaxed',
  lg: 'text-lg leading-relaxed',
} as const

/**
 * A `Text` at the app's depth (the switch in the top bar, spec/design-intent.md P10): the simple layer,
 * and with "Deeper" on, the deeper layer straight after it. No per-card disclosure.
 */
export function TextBlock({ text, className, size = 'base' }: { text: Text | undefined; className?: string; size?: keyof typeof SIZES }) {
  const deeper = useDeeper()
  if (!text) return null
  return (
    <div className={className}>
      <p className={clsx('text-ink', SIZES[size])}>{text.simple}</p>
      {deeper && text.deeper && <p className={clsx('mt-2 border-l-2 border-primary/50 pl-3 text-ink-muted', size === 'lg' ? SIZES.base : SIZES[size])}>{text.deeper}</p>}
    </div>
  )
}

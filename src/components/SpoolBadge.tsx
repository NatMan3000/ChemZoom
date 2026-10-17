import { useId } from 'react'

/** A flat spool drawing in a material's accent, for cards and the compare page. */
export function SpoolBadge({ accent, size = 56, className }: { accent: string; size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <radialGradient id={`g${id}`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="#26304d" stroke="#3a4670" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="25" fill={accent} />
      {[22, 19, 16].map((r) => (
        <circle key={r} cx="32" cy="32" r={r} fill="none" stroke="#0b1020" strokeOpacity="0.18" strokeWidth="1" />
      ))}
      <circle cx="32" cy="32" r="25" fill={`url(#g${id})`} />
      <circle cx="32" cy="32" r="12" fill="#2a3047" stroke="#3a4670" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="6" fill="#0b1020" />
    </svg>
  )
}

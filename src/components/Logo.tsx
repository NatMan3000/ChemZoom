/** The ChemZoom mark: a carbon with an oxygen and a hydrogen, same drawing as favicon.svg. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="14" fill="#1B2440" />
      <line x1="20" y1="40" x2="32" y2="24" stroke="#C9CED6" strokeWidth="4" strokeLinecap="round" />
      <line x1="32" y1="24" x2="46" y2="38" stroke="#C9CED6" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="24" r="9" fill="#8E959E" />
      <circle cx="19" cy="41" r="7" fill="#FF4D4D" />
      <circle cx="46" cy="39" r="5.5" fill="#F4F4F4" />
    </svg>
  )
}

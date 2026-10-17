/** A molecular formula with its counts as subscripts: C9H14O7 reads as C₉H₁₄O₇. */
export function Formula({ formula, className }: { formula: string; className?: string }) {
  const parts = formula.match(/[A-Z][a-z]?|\d+|[^A-Za-z\d]+/g) ?? [formula]
  return (
    <span className={className} aria-label={formula}>
      {parts.map((p, i) => (/^\d+$/.test(p) ? <sub key={i}>{p}</sub> : <span key={i}>{p}</span>))}
    </span>
  )
}

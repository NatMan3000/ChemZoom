export interface StageKeyItem {
  colour: string
  label: string
}

/** A small colour key that sits on the 3D stage. */
export function StageKey({ items }: { items: StageKeyItem[] }) {
  return (
    <ul aria-label="Colour key" className="pointer-events-auto flex flex-col gap-1 rounded-2xl border border-line/60 bg-stage/75 px-3 py-2 backdrop-blur-md">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2 text-xs text-ink sm:text-sm">
          <span aria-hidden className="h-1.5 w-5 shrink-0 rounded-full" style={{ backgroundColor: i.colour }} />
          {i.label}
        </li>
      ))}
    </ul>
  )
}

// Spool maths: how many metres of 1.75 mm strand are on a 1 kg spool of a material.
// length = mass / (density x cross-section area).

export const STRAND_DIAMETER_MM = 1.75

/** Metres of 1.75 mm filament in `grams` of a material with this density (g/cm3). */
export function metresPerSpool(densityGcm3: number, grams = 1000): number {
  const radiusCm = STRAND_DIAMETER_MM / 20 // mm diameter -> cm radius
  const areaCm2 = Math.PI * radiusCm * radiusCm
  const volumeCm3 = grams / densityGcm3
  return volumeCm3 / areaCm2 / 100
}

/** Rounded to the nearest 5 m: it is an "about" figure, and matches the captions' rounding. */
export function formatMetres(m: number): string {
  return `${(Math.round(m / 5) * 5).toLocaleString('en-AU')} m`
}

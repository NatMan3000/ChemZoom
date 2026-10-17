import { ZOOM_LEVELS, type ZoomLevel } from '../types/chem'

// The continuous zoom (spec/design-intent.md P6) as one number, z.
//
// z = 0 is the spool's home view, 1 the strand's, ... 5 the atom's. Around each whole number is a HOLD zone
// where only that level is on stage and the wheel moves the camera in and out (q is how far past home).
// Between two hold zones is a CROSS zone where the outgoing scene grows and fades and the next fades in
// (p runs 0 to 1 across it). Pure functions only, so the maths can be checked without a browser.

export const LAST = ZOOM_LEVELS.length - 1

/** How far past home (zooming in) a level holds before the hand-over starts. */
export const HOLD_IN = 0.42
/** How far before home (zooming out) a level holds once the hand-over is done. */
export const HOLD_OUT = 0.22
export const CROSS = 1 - HOLD_IN - HOLD_OUT

/** The spool can be pulled back a little past its home view; the atom can be looked at closely. */
export const Z_MIN = -0.3
export const Z_MAX = LAST + HOLD_IN

/**
 * Camera distance at the inner edge of a hold zone, as a fraction of home. Each level's next piece is laid over
 * the one you zoomed into at its true size (stagePoses linkBetween), so the zoom from one home view to the next
 * is fixed: about 28x from the spool to the strand (a 1.75 mm strand in a 20 cm spool), about 3x to 7x below it.
 * These factors share it between the two hold zones and the hand-over so the camera keeps moving in all the way
 * across (the hand-over itself zooms in about 1.5x to 4x), and closer for the molecule, so the dive into the atom keeps going in.
 */
export const IN_FACTOR: Record<ZoomLevel, number> = { spool: 4.8, strand: 2.4, tangle: 1.6, chain: 1.6, molecule: 2.25, atom: 2.6 }
/** Camera distance at the outer edge of a hold zone, as a multiple of home. Small for the atom: the dive from the molecule must keep moving in. */
export const OUT_FACTOR: Record<ZoomLevel, number> = { spool: 1.5, strand: 1.5, tangle: 1.5, chain: 1.15, molecule: 1.2, atom: 1.05 }

export type Phase = { kind: 'hold'; level: number; q: number } | { kind: 'cross'; lo: number; p: number }

export function phaseOf(z: number): Phase {
  const zc = Math.min(Z_MAX, Math.max(Z_MIN, z))
  const i = Math.max(0, Math.min(LAST, Math.floor(zc + HOLD_OUT)))
  const f = zc - i
  if (f <= HOLD_IN || i === LAST) return { kind: 'hold', level: i, q: f }
  return { kind: 'cross', lo: i, p: Math.min(1, Math.max(0, (f - HOLD_IN) / CROSS)) }
}

/** The level the page should show for z: the hold zone's level, or whichever side of a hand-over is past halfway. */
export function dominantLevel(z: number): number {
  const ph = phaseOf(z)
  return ph.kind === 'hold' ? ph.level : ph.p < 0.5 ? ph.lo : ph.lo + 1
}

/** Camera distance as a multiple of the level's home distance, for q in its hold zone. */
export function distFactor(level: ZoomLevel, q: number): number {
  if (q >= 0) return Math.pow(IN_FACTOR[level], -q / HOLD_IN)
  return Math.pow(OUT_FACTOR[level], -q / HOLD_OUT)
}

/** z at the inner edge of level i's hold zone (where its hand-over to i + 1 starts). */
export const innerEdge = (i: number) => i + HOLD_IN
/** z at the outer edge of level i's hold zone (where the hand-over from i - 1 ends). */
export const outerEdge = (i: number) => i - HOLD_OUT

/**
 * Where to settle when the user stops part way through a hand-over: carry on in the direction they were
 * going once they are a fifth of the way across, otherwise fall back. Either way the zoom glides to that
 * level's home view, so a level you arrive at is framed the way the rail would show it.
 */
export function settleTarget(z: number, lastDir: number): number {
  const ph = phaseOf(z)
  if (ph.kind === 'hold') return z
  const up = lastDir > 0 ? ph.p > 0.2 : lastDir < 0 ? ph.p > 0.8 : ph.p >= 0.5
  return up ? ph.lo + 1 : ph.lo
}

/**
 * Reduced motion: the zoom still works but never rests or animates inside a hand-over. A step that lands in a
 * cross zone cuts straight to the home view of the level on the far side of it.
 */
export function snapPastCross(z: number, dir: number): number {
  const ph = phaseOf(z)
  if (ph.kind === 'hold') return z
  return dir >= 0 ? ph.lo + 1 : ph.lo
}

export const clampZ = (z: number) => Math.min(Z_MAX, Math.max(Z_MIN, z))

/** Wheel delta (pixels) to a change in z. A mouse notch (about 100 px) moves about a fifth of a level. */
export function wheelToZ(deltaY: number, deltaMode: number, pinch: boolean): number {
  const px = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY
  const dz = -px * (pinch ? 0.011 : 0.0019)
  return Math.max(-0.35, Math.min(0.35, dz))
}

export const levelName = (i: number): ZoomLevel => ZOOM_LEVELS[Math.max(0, Math.min(LAST, i))]

/**
 * How slowly a flight across levels (a rail tap, a tapped atom) plays: one number to tune. 1 was the first cut
 * (spool to atom in 2.4 s); Nathan asked for it "slowed down a bit" (17 Oct), so 1.5: spool to atom in 3.6 s,
 * one level in about 1.6 s. A flight back to the home view inside one level (a reset) keeps its quick 0.7 s.
 */
export const FLIGHT_PACE = 1.5

/** How long a flight across `levels` of z takes, in ms. */
export function flightDuration(levels: number): number {
  if (levels < 0.6) return 700
  return Math.min(2400, 700 + 340 * levels) * FLIGHT_PACE
}

/** How much more of a flight's time a hand-over gets than a hold zone, per unit of z: the hand-over is the show. */
const CROSS_WEIGHT = 2.6

/**
 * A flight's path from z0 to z1 as a function of eased time u (0..1), spending more of the time in the
 * hand-overs than in the hold zones, so a rail tap or a tapped atom shows the change instead of flashing past it.
 */
export function flightPath(z0: number, z1: number): (u: number) => number {
  if (Math.abs(z1 - z0) < 1e-6) return () => z1
  const dir = Math.sign(z1 - z0)
  // Zone boundaries between the two ends.
  const cuts: number[] = []
  for (let i = 0; i <= LAST; i++) for (const b of [innerEdge(i), outerEdge(i + 1)]) if ((b - z0) * dir > 0 && (z1 - b) * dir > 0) cuts.push(b)
  cuts.sort((a, b) => (a - b) * dir)
  const pts = [z0, ...cuts, z1]
  const lens: number[] = []
  for (let k = 0; k < pts.length - 1; k++) {
    const mid = (pts[k] + pts[k + 1]) / 2
    lens.push(Math.abs(pts[k + 1] - pts[k]) * (phaseOf(mid).kind === 'cross' ? CROSS_WEIGHT : 1))
  }
  const total = lens.reduce((a, b) => a + b, 0)
  return (u: number) => {
    let at = Math.min(1, Math.max(0, u)) * total
    for (let k = 0; k < lens.length; k++) {
      if (at <= lens[k] || k === lens.length - 1) return pts[k] + (pts[k + 1] - pts[k]) * (lens[k] ? Math.min(1, at / lens[k]) : 1)
      at -= lens[k]
    }
    return z1
  }
}

---
type: plan
title: ChemZoom DesignPass - first cut of the PLA reference page
description: "The brief every worker reads first for the first cut of the reference page (Nathan's D17 go, 17 Oct 2026): the targets from spec/design-intent.md, the three lanes with file ownership, the interfaces between them, and how to verify."
created: 2026-10-17
status: active
---

# First cut of the PLA reference page

Nathan's go (D17, 17 Oct 2026): "Build the PLA first cut, then work it with me". This is DesignPass step 4's starting point: a first cut good enough to react to, worked to finished with Nathan screenshot by screenshot afterwards. It is judged on PLA at 1920x1080, but everything is data-driven, so the other four materials get it too. The phone layout must keep working (not polished yet).

## Read first, in this order

1. `spec/design-intent.md`: every P line. These are Nathan's own answers; they are the standard. Quote them in your report where you made a call against one.
2. `research/2026-10-17-designpass-baseline.md`: the 11 findings this cut fixes.
3. `spec/desktop-standard.md`: the measurable rules.
4. `DESIGN.md` (look, motion), `src/types/chem.ts` (data contract), `src/sims/types.ts` (sim contract).

## What the first cut must do (targets)

| # | Target | From |
|---|---|---|
| T1 | **One continuous zoom.** Wheel, trackpad or pinch carries the view from spool through strand, tangle, chain and molecule to one atom, and back out, with no clicks. Each level hands over to the next as you get close (the outgoing scene grows and fades as the next fades in). The rail and panel follow the zoom; tapping a rail step still flies there. | P6, finding 1 |
| T2 | **The zoom ends at one atom**: the atom under the cursor or fingers as you zoom in from the molecule (else the tapped atom, else a backbone carbon in the lit repeat unit). Nucleus (protons and neutrons), electrons in shells, and each bond drawn as a shared pair of electrons running out to a faded neighbour. Never the whole molecule. | P7, findings 1, 10 |
| T3 | **The panel fits one screen at 1920x1080** with nothing important below the fold: material header, the step's own card, the experiments, an at-a-glance block (printing numbers and trait bars side by side). Made-from, facts and sources sit behind one "More about <material>" control that opens in place. | P5, finding 2 |
| T4 | **One simple/deeper switch** for the whole app, in the top bar, remembered per device (localStorage). Deeper shows the simple text followed by the deeper text. No per-card "Go deeper" links anywhere. | P10 |
| T5 | **Experiments are found from the stage and play in it.** A visible "Experiments" row on the stage (flask icon, each experiment's name) and an "Experiments" card in the panel. Starting one keeps you on the material page: the sim's 3D view takes the stage, its controls and caption take the panel's step area, with a clear "Back to the zoom". The old `#/m/:id/sim/:simId` links still work (redirect). | P9, findings 3, 11 |
| T6 | **Tappable looks tappable.** At the molecule level, atoms glow on hover and the panel says you can zoom into any atom. | finding 10 |
| T7 | **Sketches are labelled.** Tangle, chain and the atom's electron shells carry a visible sketch label (the stage scale chip is fine for this). | P8 |
| T8 | **The chain step's repeat units do not look like atoms**: no balls on sticks; a shape that reads as "one unit of the chain" (a capsule or short segment), labelled. | finding 5 |
| T9 | **The molecule step reads clearly**: the faded rest of the molecule is lighter and calmer (not dark red and grey smudges), the lit unit is framed large, and nothing sits under the zoom rail. Tangles are drawn to one scale (TPU's is not half the size). | findings 4, 6 |
| T10 | **No text under 14 px** (the stage scale chip is 12 px today). | finding 8 |
| T11 | **A way on.** The end of the zoom (the atom level's panel) offers the next material to explore. | P13 |
| T12 | **Fun stays.** Keep the voice dry (P11); look for one moment of play per level where it is cheap (the atom level's "carbon brings 4, its neighbours bring 4: a full set of 8" is the kind of line meant). | P11, P12 |

Not in this cut (the reference session decides them with Nathan): the bed-adhesion experiment (P3 gap), the other pages (compare, basics, sources, home), and the phone polish.

## Lanes and file ownership

Each lane has its own worktree off the base commit and touches only its files. Anything needed in another lane's file goes in your report under "For another lane" with the exact change; the lead routes it.

| Lane | Worktree | Owns | Targets |
|---|---|---|---|
| zoom | `~/Dev/ChemZoom-wt-zoom` | `src/scenes/**` except `AtomScene.tsx`; `src/three/**`; `src/lib/zoom.ts`, `src/lib/motion.ts` | T1, T2 (picking and the hand-over into the atom), T6 (hover glow in MoleculeView), T7 (scale chip wording in `lib/zoom.ts`), T8, T9 |
| atom | `~/Dev/ChemZoom-wt-atom` | `src/scenes/AtomScene.tsx` and any new files under `src/scenes/atom/` | T2 (the atom itself) |
| panel | `~/Dev/ChemZoom-wt-panel` | `src/app/**`, `src/components/**`, `src/lib/` except `zoom.ts` and `motion.ts`, `src/sims/**` (except `types.ts`), `src/index.css`, `src/App.tsx` | T3, T4, T5, T6 (panel text), T10, T11, T12 (panel copy) |

Nobody edits `src/types/chem.ts`, `src/sims/types.ts`, `src/content/**`, `src/data/**` or `scripts/**`; ask the lead.

## Interfaces between lanes (fixed by the lead)

**ZoomStage** (`src/scenes/ZoomStage.tsx`, zoom lane implements, panel lane wires):

```ts
level: ZoomLevel                               // the page's current level; a change from outside flies there
onLevelChange?: (level: ZoomLevel) => void     // the user's own zooming crossed into another level
onAtomClick: (i: number | null) => void        // also fired with the picked atom when the zoom dives into one
// existing: material, highlight, selectedAtom, spaceFill, resetSignal
```

The panel lane updates the URL with `navigate(..., { replace: true })` on `onLevelChange` so the back button is not flooded, and keeps `level` in step. The zoom lane must not assume the page will echo the level back instantly.

**AtomScene** (`src/scenes/AtomScene.tsx`, atom lane implements, zoom lane mounts): props `{ molecule, atomIndex, accent, opacity? }`. The atom sits at the origin; nucleus and shells inside a radius of about 3; faded neighbours along the real bond directions at about 5.5; everything inside a radius of 7. `opacity` drives the cross-fade. A stub is in the base commit so the zoom lane can build against it.

**Sims in the stage** (panel lane): the sims' `SimFrame` (`src/sims/shared/ui.tsx`) learns to render its stage and its controls into two slots the material page provides (React portals via context), falling back to today's stacked layout when there are no slots. Each sim keeps working unchanged otherwise.

## Rules every lane keeps

- Nothing moves unless the user made it move, and it stops by itself: `frameloop="demand"`, `invalidate()` only while a zoom, fly or drag is running. No idle spinning electrons. No `animate-pulse` / `ping` / `bounce`.
- `prefers-reduced-motion`: zoom steps cut instead of flying; the continuous zoom still works but snaps level to level.
- No drei `<Text>` (it fetches a font from a CDN and breaks offline); use drei `<Html>` overlays for 3D labels.
- UI text: no em or en dashes, Australian spelling, "Ai" never "AI", lucide-react icons only, no emoji, no exclamation marks (P11).
- Gates: `bun run build` and `bun run lint` pass; `bun scripts/check-content.ts` passes.
- Look at it: run the dev server on your lane's port (zoom 5181, atom 5182, panel 5183) and shoot with `bun /tmp/chemzoom-shot/shot.ts "<url>" <out.png> <w> <h> <waitMs> ['<js>']`; sweeps with `bun /tmp/chemzoom-shot/sweep.ts`. Headless Google Chrome only; never Nathan's Chrome Canary. For the continuous zoom, script wheel events with puppeteer (`page.mouse.wheel`) and shoot between them.
- Do not commit. Report to `/tmp/chemzoom-<lane>-cut-report.md` with: what changed (files), shots, each target's state (✅ / ⚠️ / ❌), "For another lane", "Not done", and `UNCERTAIN:` lines. Reply to the lead in one line.

---
type: auto
session_id: 9c44e8b5-1de3-4d92-abaa-3a2228aee2a3
project: ChemZoom
date: 2026-10-17
topic: ChemZoom created, v1 shipped, DesignPass on the PLA reference page
duration: "8 hours"
events: 1143
events_unit: turns
---

## Summary

Nathan asked for an app to understand what 3D printing filaments are made of, with 3D molecules, built to expand to other chemistry later, for him and his son Josh (12). Kai proposed a "powers of ten" zoom from spool to atoms; Nathan made it its own project on GitHub Pages like Fruity, starting with PLA, PETG, TPU, ABS and ASA. ChemZoom was built from nothing to a live v1 in three parallel lanes, then taken through DesignPass steps 0 to 4 with the PLA material page as the reference page, over several review rounds with Nathan. The session ran from about 18:00 AEDT 17 Oct to about 02:00 AEDT 18 Oct, after a /clear that ended an unrelated segment (session 623df386, Microsoft sign-in broker), which is not part of this log. It ended with Nathan saying he would look at it tomorrow on http://localhost:5190/ChemZoom/ (a vite preview of dist left running).

## What We Did

- ✅ **v1 build.** New project `~/Dev/ChemZoom` (Vite + React 19 + TS + Tailwind v4 + react-three-fiber/drei, RDKit at build time, PWA). Kai wrote the data contract (`src/types/chem.ts`: elements > molecules > materials > collections), the RDKit pipeline (`scripts/build-molecules.py` over `scripts/molecules.json`), `PRODUCT.md`, `DESIGN.md` (dark "science museum exhibit") and the v1 plan. Three opus engineer lanes in manual worktrees: content (24 RDKit molecules, sourced text at two depths, Bambu TDS numbers spot-checked by Kai at source, `check-content.ts` gate), app (six-step zoom, compare, basics, sources, sim host) and sims (five concept experiments). Live at https://natman3000.github.io/ChemZoom/, verified live and offline.
- ✅ **DesignPass steps 0 to 3.** Nathan's first look: the atom zoom didn't work (it zoomed out to the whole molecule) and the side panel needed a page of scrolling even on 4K. Baseline sweep of 39 routes at 1920x1080 (`research/2026-10-17-designpass-baseline.md`, 11 ranked findings), `spec/desktop-standard.md`, and a 12-question intent questionnaire posted as Nexus cards D5 to D16. The answers became `spec/design-intent.md` P1 to P13, wired into `CLAUDE.md`, `PRODUCT.md` and `.claude/rules/chemzoom-design-intent.md`.
- ✅ **PLA first cut (D17).** Lanes zoom (one continuous wheel/pinch zoom across six levels), atom (AtomScene: nucleus, shells, shared-pair bonds; 796 atoms' electron counts checked, now a standing gate in `check-content`) and panel (fits one screen at 1080, Simple/Deeper switch, experiments in the page via portals). Merged and verified by Kai with a scripted wheel run.
- ✅ **Reference rounds with Nathan** (each ruling in `spec/desktop-standard.md` Decisions with his words): experiments rebuilt from "a whole bunch of wiggly lines" into printing close-ups (nozzle, printed lines, labelled chain lens; shared kit `src/sims/shared/printing`; D18); end-of-animation jump fixed in all five (endjump check); each zoom level continues the same piece at the same angle; experiments row stays on the stage while one plays; rail flights 1.5x slower (`FLIGHT_PACE`); D19 molecule step arrives with the whole piece lit and the repeat unit outlined (chip "The whole piece"); spool-to-strand made one filament end (`FilamentEnd.tsx`).
- ✅ **Zoom never pulls back, no flash.** Nathan reported slow scrolling bouncing back to the spool and a one-frame spool flash. A virtual-clock frame-by-frame capture found three causes: a 200 ms settle-to-home rule, a hide-then-reset order that drew the spool for one frame, and `setFade` flipping `material.transparent` without `needsUpdate`. Kai re-ran the capture on merged main: backward 0, stale 0, one known pop (the camera passes inside molecule balls on the atom dive-out).
- ✅ **Kai side.** DesignPass `SKILL.md` gotcha: judge motion frame by frame under real input timing (commit 039864cc in `~/.claude`). `~/Dev/PROJECTS.md` gained a ChemZoom row.

## Key Decisions

| Decision | Rationale |
|---|---|
| Web app with a powers-of-ten zoom, its own repo on GitHub Pages | Nathan: for him and Josh, hosted like Fruity; works on any device and offline as a PWA |
| RDKit at build time, not in the browser | Real 3D geometry checked once at build, no runtime chemistry engine shipped |
| Dark "science museum exhibit" design, overruling ui-ux-pro-max's claymorphism / Comic Neue pick | Fits a 12-year-old without talking down; true by default, sketches labelled (P-rules) |
| Forgejo private as fetch, GitHub public as push-only second URL on origin | Pages needs a public GitHub repo; Forgejo stays the canonical remote |
| Live Pages held at v1 (5b909ea) while DesignPass runs | Nathan has not approved the reworked zoom for live yet |
| ONE continuous zoom from spool to a single atom | Nathan's intent answers (P-rules); each level continues the exact piece at the same angle |
| Experiments are printing scenes with the chemistry in a labelled lens | Nathan: abstract chain wiggles meant nothing; D18 |
| A stopped zoom stays put; no settle-to-home | Slow scrolling read as the view pulling back |

## Files Created

- `src/types/chem.ts` - the data contract
- `scripts/build-molecules.py`, `scripts/molecules.json`, `src/data/molecules/` - RDKit pipeline, its input list and the 24 generated molecules
- `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md`, `.claude/rules/chemzoom-design-intent.md`
- `spec/design-intent.md` (P1 to P13), `spec/desktop-standard.md` (Decisions log)
- `research/2026-10-17-designpass-baseline.md`
- `plans/build-chemzoom-COMPLETED.md`, `plans/pla-first-cut.md`
- `src/scenes/` zoom levels incl. AtomScene and `FilamentEnd.tsx`; `src/sims/shared/printing` kit

## Lessons

- three.js compiles `material.transparent` into the shader program; flipping it later without `material.needsUpdate` (or a React key on the material) leaves the new opacity ignored. Hit twice.
- drei `<Html>` labels sit in R3F's `events.connected` element over the canvas, so wheel/pinch listeners must attach there; an `<Html>` mounted in the canvas's first commit can stay blank; drei `<Text>` fetches a CDN font and breaks an offline PWA.
- Motion bugs (bounce-back, one-frame flashes) only show in a frame-by-frame capture under real input timing; settled screenshots or captures with timers held off hide them.
- A repo whose origin has two push URLs deploys live on every `git push origin`; push the Forgejo URL directly to back up without deploying.

## Next Steps

- ⬜ Nathan reviews the PLA reference page at http://localhost:5190/ChemZoom/ (round 6 feedback).
- ⬜ Open items: camera passes inside molecule balls on the atom dive-out; ease hitch at hand-over edges; a half-faded rest when stopping short of half way.
- ⬜ Apply the reference page to all pages, then the phone pass.
- ⬜ Push origin main (deploys live) only on Nathan's go.

## Open Questions

- When does the reworked zoom go live? Nathan's call after his review.

## Git Status

- ChemZoom main at aa642fc, pushed to Forgejo; GitHub main (live Pages) deliberately at 5b909ea (v1). Lane worktrees and `cut/*` branches removed. This log and the timeline row are committed and pushed to Forgejo only.
- `~/.claude`: 039864cc (DesignPass gotcha) committed.

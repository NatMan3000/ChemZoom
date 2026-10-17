---
type: report
title: ChemZoom DesignPass baseline - desktop, 17 Oct 2026
description: Baseline sweep of all 39 ChemZoom routes at 1920x1080 after v1 shipped, with a verdict per page, the ranked findings, and what waits on Nathan's intent answers (D5 to D16) before the reference page.
created: 2026-10-17
status: final
---

# ChemZoom DesignPass baseline (desktop)

Steps 0 to 3 of the DesignPass, run on the live v1 code (commit 5657589) the evening it shipped, after Nathan's first look: "atoms as a zoom doesn't work" and the side panel is "a lot of scrolling even on a 4k screen it's not really laid out that well".

- Scope: 39 routes at 1920x1080 (`scratchpad/designpass/scope.md`). Phone and iPad are out until desktop is finished.
- Shots: `scratchpad/designpass/baseline/` (one screen per route, plus a full-length shot where a panel scrolls), contact sheets in `scratchpad/designpass/sheet-*.png`, numbers in `baseline/metrics.json`.
- Standard started: `spec/desktop-standard.md`. Intent questionnaire: `drafts/intent-questionnaire.md`, posted as Nexus cards D5 to D16.

## Ranked findings

1. **The atom step zooms out, not in (all 5 materials).** The code reuses the molecule scene for step 6 and fits the whole molecule in view, while step 5 flies into one lit repeat unit. So the last step of "zoom down to the atoms" shows more atoms, smaller, as a chain. There is no view of a single atom anywhere in the app. Fix waits on D10 (zoom into one atom, or drop the step).

2. **The material panel is 3.4 to 4.0 screens long on every material view (30 of 30).** Only the first card changes with the zoom step. The other seven cards (big idea, try it, printing, how it stacks up, made from, did you know, sources) repeat at every step and push the page to about 4,000 px. One page carries about 20 "Go deeper" links and 6 fact blocks, each with its own source line. Fix waits on D9 (tabs or one scroll) and D13 (one depth switch).

3. **Experiments use a different layout from the material page.** The material page puts the stage left and the panel right; experiments stack the stage on top (about 45% of the height) with controls and caption below. At 1920 wide the caption runs as one line of about 1,900 px, and the Layer bonding stage clips its top layer at the top edge. Fix waits on D12 (experiments inside the material page or on their own).

4. **The molecule step is muddy and small.** The ghosted rest of the molecule (16% opacity) reads as dark red and grey smudges on the dark stage, and the lit unit sits small in a large empty stage. On PLA and ABS the ghosted atoms run under the zoom rail at the top left.

5. **The chain step's beads look like atoms.** Repeat units are drawn as coloured balls on a grey stick, the same picture the app uses for atoms and bonds. With the atom step also showing a chain, the two steps blur together.

6. **Tangles are not to one scale.** TPU's tangle fills about half the stage the others fill.

7. **Compare wastes the width.** Content is held to about 1,216 px with about 350 px empty either side at 1920; the page runs 2.2 screens; the molecules are ghosted like finding 4.

8. **Text under the 14 px floor.** The stage scale chip on every material view ("About 1 to 3 nm long", 12 px) and 65 domain lines on the sources page (12 px).

9. **Home has no 3D.** The one page every visit starts on shows none of what makes the app worth opening. Low priority.

10. **Tapping an atom is hidden.** Nathan, 17 Oct: "I didn't realize that you could click on an atom. That bit wasn't obvious at all But we accidentally found it". The only cue is a line of panel text at the atom step and a pointer cursor on hover; nothing on the model itself invites a tap. With the continuous zoom (P6), zooming in on the atom under the cursor or fingers can be how an atom gets picked, so the choice stops depending on a hidden click.

11. **The experiments are not found.** Nathan, 17 Oct: "I can't even see where the experiments are, so maybe they're not even added or they're hard to find". They are the third card in the side panel, titled "Try it", below the fold on a first look; nothing on the stage points to them and the word "experiment" appears nowhere.

## Verdict per page

| Page | Verdict |
|---|---|
| Home | ⚠️ Clean and readable, five cards in a row; no 3D hook (9). |
| Material, spool | ⚠️ Spool is strong; panel 3.5 to 3.8 screens (2). |
| Material, strand | ⚠️ Strand and its tangled cut face read well; panel (2). |
| Material, tangle | ⚠️ Morphologies read clearly (crystals, hard islands, rubber blobs); TPU smaller (6); panel (2). |
| Material, chain | ❌ Beads read as atoms (5); panel (2). |
| Material, molecule | ⚠️ Group lighting works; ghosting muddy, unit small, rail overlap (4); panel (2). |
| Material, atom | ❌ Zooms out to the whole molecule (1); panel (2). |
| Experiments (5) | ⚠️ Mechanics read well (snapped rubber, curled ABS, steam); layout and caption line length (3); Layer bonding top clip (3). |
| Compare | ⚠️ Mirrored trait bars work; width and length (7). |
| Basics | ✅ Reads well as an article; 2.2 screens is right for it. |
| Sources | ⚠️ Clear grouping; 12 px domain lines (8). |

## What is good and should survive

- The stage visuals: the spool, the strand's cut face, the four tangle morphologies, the lit repeat units, the snapped ABS rubber.
- The dark exhibit look, the material accents, and the type.
- Every fact sourced, and the content at two depths.
- Nothing moving when nobody touches it.

## Next, after the D5 to D16 answers

1. Write `spec/design-intent.md` from the answers (P lines in Nathan's words, each with a test) and wire it into `CLAUDE.md`.
2. Work the reference page with Nathan: the PLA material page, all six steps, including the new atom step and the panel shape he picks.
3. Then mechanisms by shared file (panel shell, atom scene, experiment placement, molecule framing), applied to the other four materials, gates for the measurable rules in `spec/desktop-standard.md`, and the lead's sign-off sweep.

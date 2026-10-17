# ChemZoom desktop standard

Surface: desktop, 1920x1080 CSS pixels (Nathan's 4K screen at 2x). Started 17 Oct 2026 by the first DesignPass. Read `PRODUCT.md`, `DESIGN.md` and `spec/design-intent.md` (once written) first; this file holds the measurable rules for this width and the calls made on the reference page.

## Rules known so far

- **One screen per view.** The material page and every experiment fit 1920x1080 without the page or a panel scrolling for the core content. Material-wide detail (printing, traits, facts, sources) is a tap away, not a scroll away. Baseline: the material panel runs 3.4 to 4.0 screens on all 30 material views.
- **The zoom only goes in.** Each step shows something smaller than the step before it. Baseline: the atom step shows the whole molecule, which is bigger than the molecule step's lit unit.
- **Nothing important under the zoom rail.** The 3D subject is framed inside the area the rail and the stage badges leave free.
- **A picture keeps its visual language.** Balls on sticks mean atoms and bonds, and nothing else uses them (the chain step's repeat-unit beads currently do).
- **Readable lines.** Captions sit in a column of the layout, not across the full 1920 width (the experiments' caption runs to about 1,900 px today). No text under 14 px (DESIGN.md floor); baseline has 12 px on the stage scale chip and the sources page's domain lines.
- **Anything you can tap looks tappable.** A tappable thing in the 3D view shows it on the model itself (a hover glow, a ring, a visible cue), not only in panel text. Nathan, 17 Oct, on tapping atoms: "That bit wasn't obvious at all But we accidentally found it".
- **The stage fills its frame.** A 3D subject fills most of its stage at its default camera; one material's tangle is not half the size of another's.

## Decisions

Calls are recorded here as they are made, with Nathan's words and the reason, before any worker is briefed. Pending: the intent questionnaire D5 to D16 (`drafts/intent-questionnaire.md`), in particular D9 (panel), D10 (atom step), D12 (experiments placement) and D13 (one depth switch).

## Reference page

To be worked with Nathan: the PLA material page, all six steps. Not a template: each material and step keeps its own judgement.

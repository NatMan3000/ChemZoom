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

Recorded with Nathan's words before any worker is briefed. The intent answers (17 Oct, D5 to D16) live in `spec/design-intent.md`; the ones that set rules for this width:

- **Panel fits one screen** (P5, D9): "we have to scroll down nearly a whole page". How (wider panel, collapsing sections, tighter text) is settled on the reference page.
- **One continuous zoom** (P6, D9): wheel, trackpad or pinch carries the view from spool to atom and back; the rail and panel follow the zoom.
- **The zoom ends at one atom** (P7, D10): nucleus, electrons, bonds as shared electrons.
- **Sketches are labelled** (P8, D11).
- **Experiments run in the stage and are easy to find** (P9, D12): "I can't even see where the experiments are".
- **One depth switch** (P10, D13): the per-card "Go deeper" links go.
- **Fun everywhere** (P12, D15), within a dry voice (P11, D14).
- **Desktop and phone** (P2, D6): this standard covers desktop; the phone gets its own pass after.

## Reference page

To be worked with Nathan: the PLA material page, all six steps. Not a template: each material and step keeps its own judgement.

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

- **Experiments show printing, close up, not a tangle of wiggly lines** (reference session, 17 Oct): "The concept is a good idea on all of them... I just think that it's just a whole bunch of wiggly lines and not sure that really is the best way to express what's happening. I don't know if you can do it as something is printed, whether it's a line being printed, but really close up on the line, possibly." Trial first on one experiment (Layer bonding), then the other four on his yes.
- **An animation ends where it stops** (reference session, 17 Oct): "at the end of the animations of each experiment it kind of jumps... it doesn't stop where the animation is, it maybe goes back to the start of where the animation was, something jumps". The last frame of a run is the frame left on screen; nothing snaps back or jumps when it settles.

- **Each zoom level is the piece you were zooming into, the same way round** (reference session, 17 Oct, on spool to strand): "The transition should actually have the strand at the same angle as what's coming out of the roll, so you end up zooming into the strand end that is coming out of the roll and that becomes the strand piece that you're looking at the end of currently it's at the opposite angle and doesn't transition into it." Every hand-over continues the same object at the same angle and place: the spool's free end becomes the strand, the strand's cut face becomes the tangle, the pulled-out chain becomes the chain, its focus unit becomes the molecule, the picked atom becomes the atom.

## Reference page

To be worked with Nathan: the PLA material page, all six steps. Not a template: each material and step keeps its own judgement.

---
type: spec
title: Design intent - what Nathan is always trying to achieve with ChemZoom
description: The reference goal for all future ChemZoom work and the yardstick for auditing existing pages. Nathan's intent for the app, his judgement on real choices and a bit of his personality, in his words, organised by theme, each line with its why and its test. DESIGN.md says what it looks like; this says what it is for.
created: 2026-10-17
updated: 2026-10-17
---

# Design intent

DESIGN.md scales consistency: colours, type, spacing, motion. This page scales intent: what ChemZoom is for, who it is for, and the calls Nathan has made on real choices. Build toward it, sign off against it, and audit any page by walking sections 2 to 7. If a line here would make him say it again, the page is not done.

Each entry carries its id, his words, the why and a test a stranger could apply to a screenshot. The id index at the end maps ids to sections. `PRODUCT.md` holds the earlier product notes; where a line here and PRODUCT.md disagree, this page wins.

## 1. What the app is for and who reads it

**Who the page is for.** Nathan and his son Josh (12), who print a lot on a Bambu Lab P2S and want to understand what the plastics really are and why they behave differently.

- **P1 - The pitch: zoom into your filament and see why it prints the way it does.** "Zoom into your filament and see why it prints the way it does" (D5, 17 Oct, picked the guess on Nexus). Why: every page earns its place by connecting what is inside the plastic to something seen at the printer; a page that does neither is decoration.
  Test: a first-time reader on the home page can say in one breath what the app does, and every material view connects at least one thing on screen to a printing behaviour.

- **P2 - It is read on a desktop and on a phone.** "desktop and phone" (D6, 17 Oct, a correction of the guess that Josh would mostly use an iPad). Why: both are real ways in; a view that only works at one width fails half the visits.
  Means: desktop and phone are the two widths every page is finished at; tablet is in between and follows from them.
  Test: every page is signed off with a shot at 1920x1080 and at 390x844, and neither needs sideways scrolling or hides the 3D view.

- **P3 - Ten minutes in, the printing problems make sense.** "We understand why we have issues with printing, whether things don't stick or bubbles and quality issues. We understand what the difference between the different materials is and why they are different from each other. And we understand why different materials print differently or need different temperatures or drying, etc." (D7, 17 Oct). Why: the chemistry is the means; the payoff is knowing why a print failed and what to change.
  Means: three understandings, each with a clear home in the app: (a) why prints fail (not sticking to the bed, bubbles, poor quality), (b) what makes the materials different and why, (c) why each needs its own temperatures and drying. Today (a) covers bubbles (Thirsty plastic) and warping (Cool and warp) but bed adhesion has only a print tip.
  Test: for each of "won't stick", "bubbles", "poor quality", "different temperatures" and "needs drying", a reader can find, within two taps of a material page, a view that shows the cause at the molecule or chain level.

- **P4 - Every page gets finished, none left rough.** "I think we can make them all perfect, I think" (D8, 17 Oct, a correction of the guess that compare and sources could stay rough). Why: a small app with a handful of pages has no room for a page that looks unfinished next to a polished one.
  Means: the material page is still worked first as the reference page, but compare, basics, sources, home and the experiments are all in scope for the pass and signed off to the same bar.
  Test: no page in the app is listed as "rough for now" in the sign-off; every route has a sign-off shot at both widths (P2).

- **P13 - Success is Josh asking for the next filament.** He asks for the next filament (D16, 17 Oct, picked the guess: "Can we add nylon? And carbon fibre?"). Why: an app he comes back to and wants extended is one that worked; one he finished and forgot did not.
  Means: the end of every material's journey points at what else there is to explore, and adding a filament stays a data change (`src/content`, `scripts/molecules.json`), never a rebuild.
  Test: a new material appears on every page (home, zoom, experiments, compare, sources) by adding its data alone, and each material page ends with a way on to another material.

## 2. The never list

No lines yet.

## 3. Judgement calls

- **P7 - The bottom of the zoom is one atom, and how atoms join.** Zoom into one atom: nucleus, electrons, bonds (D10, 17 Oct, picked option), and "Yes, we want to learn about atoms too and how they join together to form the molecules" (D10 note). Why: the app promises "down to the atoms"; stopping at a molecule leaves the last step of the story untold, and showing the whole molecule again at the atom step (the v1 behaviour) zooms out instead of in.
  Means: the last zoom level is a single atom (the one tapped at the molecule level, a backbone carbon by default): its nucleus with protons and neutrons, its electrons, and its bonds shown as electrons shared with the neighbouring atoms, so the reader sees how atoms join into the molecule above.
  Test: the atom level shows one atom filling the view with its nucleus and electrons visible, its bonds lead out to faded neighbours with the shared electrons drawn on them, and nothing at the atom level is a whole molecule.

- **P8 - True to the chemistry by default; a simplified picture says it is a sketch.** True by default, sketches labelled (D11, 17 Oct, picked the guess). Why: the app is for understanding real plastics; a picture that is quietly wrong teaches the wrong thing, while a labelled sketch is honest about what it leaves out.
  Means: molecules keep every atom and their real shapes; where a view has to simplify (the tangle, the chain beads, an atom's electrons drawn as dots on rings) it carries a visible "sketch" label saying so.
  Test: every 3D view is either real geometry (molecules from RDKit, real proportions) or shows a label marking it as a sketch; no unlabelled simplification.

- **P9 - Experiments play inside the material page, in the 3D view, and are easy to find.** Inside the material page, in the stage (D12, 17 Oct, picked option), and "I can't even see where the experiments are, so maybe they're not even added or they're hard to find" (D12 note). Why: an experiment nobody finds teaches nothing, and leaving the page to run one loses the place in the zoom.
  Means: each experiment runs in the stage of the material page with a clear way back to the zoom; how to start one is visible from the stage itself, under a name that says "experiment", not a third card down the side panel titled "Try it" (the v1 placement he did not notice).
  Test: on any material page at 1920x1080, a first-time reader can point to the experiments without scrolling, and starting one keeps the material page, its switcher and the zoom rail on screen.

- **P10 - One simple/deeper switch for the whole app, remembered.** One switch for the whole app, remembered (D13, 17 Oct, picked the guess). Why: Nathan and Josh want different depths; opening "Go deeper" on every card doubles the clicks and lengthens the panel (P5).
  Means: a single control, visible on every page, sets simple or deeper for all text at once and is remembered on that device; the per-card "Go deeper" links go.
  Test: switching to deeper on one page shows the deeper text on every page without further clicks, the choice survives a reload, and no card carries its own "Go deeper" link.

## 4. Words and numbers

No lines yet.

## 5. Layout and visual

- **P5 - The side panel must not need a page of scrolling.** "I'm not really sure, but we have to scroll down nearly a whole page, so maybe the side needs to be wider, or the sections need to collapse, or text needs to be smaller, or something." (D9, 17 Oct, chose to say what rather than the tabs guess). Why: the panel sits beside the 3D view; scrolling it away from the view breaks the link between what you read and what you see.
  Means: the fix is open (wider panel, collapsing sections, tighter text, or a mix); it is chosen on the reference page with him, not decided here.
  Test: at 1920x1080 the panel content for the current zoom step is readable without scrolling, and anything below the fold is a deliberate "more" the reader opens, not the default.

- **P6 - One continuous zoom from the spool to the atom.** "I think you should be able to zoom in from the spool and keep zooming to the strand tangle chain molecule and atom without having to select each section. It should just continuous zoom in and change to the different area as it zooms" (D9, 17 Oct). Why: the app's whole idea is the zoom; buttons between steps turn a journey into a slideshow.
  Means: zooming the 3D view (mouse wheel, trackpad or pinch) keeps going past each level and hands over to the next one as it gets close, and back out the same way. The step rail and the panel follow the zoom rather than drive it; tapping a step still jumps straight there.
  Test: from the spool, zooming alone (no clicks) reaches the atom through all six levels in order, and zooming out alone returns to the spool; the rail and panel show the current level at every point.

## 6. Forms

Not applicable: ChemZoom has no forms; its controls are the zoom, the material switcher and the experiment controls (section 5).

## 7. Voice, fun and Ai

- **P11 - It talks like a mate who knows chemistry: dry, no hype.** A mate who knows chemistry, dry, no hype (D14, 17 Oct, picked the guess). Why: the readers are a dad and a 12-year-old who print things; a textbook voice loses Josh and a cheerleader voice talks down to both.
  Means: short sentences and plain words, the odd dry line where it earns its place, no "Great job!", no exclamation marks, no emoji.
  Test: no exclamation mark or emoji in any shown string, and every caption reads aloud naturally to a 12-year-old.

- **P12 - Fun everywhere.** "Fun everywhere!" (D15, 17 Oct, a correction of the guess that fun belonged only in the experiments and never in the facts). Why: it is a learning app for a 12-year-old and his dad; a page with no play is a page Josh skips.
  Means: every page earns a moment of play, an interaction, a reveal or a dry line, facts pages included. Fun sits alongside P8 and P11: the chemistry stays true and the voice stays dry, so the fun comes from what you can do and see, not from hype.
  Test: on every page, a reader can point to something playful (something to poke, a reveal, a surprising comparison, a dry line), and nothing playful makes a fact less true.

## 8. Built is not done: the editor pass

Before any sign-off row, open each touched page at 1920x1080, read every title, caption, label, chip, legend and "Go deeper" as Josh would, and ask: would he understand this on first read, and does the page need it? Fix the words in the same lane, then take the sign-off shot.

## 9. How to use this

- **Before building:** section 1 and the never list, then the section for the surface. A real fork is probably answered in section 3; check before asking.
- **Before sign-off:** the editor pass on every page the change touches, then the never list once more.
- **For an audit of an existing page:** open it as the reader, walk sections 2 to 7 in order, one finding per line citing the id. A finding with no id is a new intent to raise with Nathan, or not a finding.
- **When he corrects something twice:** a line here in the same turn, in its section, the next free I number, his words.

## 10. What this page is not

Not the tokens or components (`DESIGN.md`), not the measurable desktop rules (`spec/desktop-standard.md`), not the data contract (`src/types/chem.ts`). Those say how; this says why.

## Where the lines came from

P lines come from the intent questionnaire of 17 Oct 2026 (`drafts/intent-questionnaire.md`), answered on Nexus cards D5 to D16. No I lines yet: the app is a day old, so there are no repeated corrections to lift.

## Id index

- **P1** section 1 · **P2** section 1 · **P3** section 1 · **P4** section 1 · **P13** section 1 · **P5** section 5 · **P6** section 5 · **P7** section 3 · **P8** section 3 · **P9** section 3 · **P10** section 3 · **P11** section 7 · **P12** section 7

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

## 2. The never list

No lines yet.

## 3. Judgement calls

No lines yet.

## 4. Words and numbers

No lines yet.

## 5. Layout and visual

No lines yet.

## 6. Forms

Not applicable: ChemZoom has no forms; its controls are the zoom, the material switcher and the experiment controls (section 5).

## 7. Voice, fun and Ai

No lines yet.

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

- **P1** section 1 · **P2** section 1 · **P3** section 1

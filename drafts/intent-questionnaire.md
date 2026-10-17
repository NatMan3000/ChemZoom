---
type: notes
title: Intent questionnaire - Nathan and Kai, 17 Oct 2026
description: 12 questions to turn Nathan's intent for ChemZoom into spec/design-intent.md before the DesignPass reference page. Kai's guess sits under each question so he confirms or corrects rather than starting cold.
created: 2026-10-17
status: draft
---

# Intent questionnaire

How it runs: one question at a time, answered by voice; each answer becomes a line in `spec/design-intent.md` in your words. Say "yes" to keep a guess, or correct it. The answers are how you think about the app, not work orders: nothing changes until you say go.

## Part 1 - What the app is for (4)

1. Someone opens ChemZoom cold. What is the one sentence that tells them what it is?
   *Guess: "Zoom into your filament and see why it prints the way it does."*

2. When you picture a page, who is looking at it, and on what?
   *Guess: Josh on the iPad with you beside him first; you on the 4K desktop second; a phone is a quick look, not the main way in.*

3. After ten minutes with it, what should Josh be able to say?
   *Guess: "They're all long chains of the same few atoms. What's different is how the links and side bits are built, and that's why ABS warps and TPU bends."*

4. Which page has to be perfect first, and which can stay rough for now?
   *Guess: the material page (the zoom and its panel) first, since everything hangs off it; sources and compare can stay rough.*

## Part 2 - Judgement calls (5)

5. The panel beside the 3D view: everything about the filament on one long scroll (as now), or only what goes with the current zoom step, with printing, traits, facts and sources a tap away?
   *Guess: the step's own story always in view, the rest in tabs; nothing on the material page needs more than one screen at 1080.*

6. The atom step: zoom right into ONE atom (its nucleus, its electrons, its bonds as shared electrons), or drop the step and make atoms a tap on the molecule?
   *Guess: zoom into one atom, the one you tapped (a backbone carbon by default). It is the bottom of the zoom, and the app promises "down to the atoms".*

7. True to the chemistry, or simplified for a 12-year-old where it helps (hide the hydrogens, draw electrons as dots on rings)?
   *Guess: true by default, simplifications allowed when they are labelled as a sketch, the way the tangle step already says "A sketch".*

8. The five experiments: their own full page (as now), or played inside the 3D view on the material page so you never leave it?
   *Guess: inside the material page; the sim takes over the stage and the panel, with a clear way back to the zoom.*

9. "Go deeper": a link on every card (as now), or one switch at the top for the whole app (simple / deeper) that it remembers?
   *Guess: one switch, remembered per device, so you and Josh each get your level without opening every card.*

## Part 3 - Voice and personality (2)

10. How should it talk?
    *Guess: a mate who knows chemistry: short sentences, plain words, the odd dry line, never "Great job!" or exclamation marks.*

11. Where is fun allowed, and where never?
    *Guess: in the experiments (a bond snapping, steam popping) and small reveals (the spool maths); never in the facts or the numbers.*

## Part 4 - The readers (1)

12. In a month, what do you want Josh saying about it?
    *Guess: "Can we add nylon? And carbon fibre?" He comes back and asks for the next one.*

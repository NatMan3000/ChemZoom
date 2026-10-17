---
paths:
  - "src/**/*.tsx"
  - "src/**/*.ts"
  - "src/**/*.css"
  - "DESIGN.md"
  - "index.html"
---
# ChemZoom design intent

Before changing words, layout, a control or a 3D view in ChemZoom, read `spec/design-intent.md`: section 1 and the never list, then the section for the surface (section 5 for layout and the zoom, section 3 for the judgement calls, section 7 for voice and fun). Measurable desktop rules are in `spec/desktop-standard.md`.

- Before any sign-off shot, run the editor pass (`spec/design-intent.md` section 8) on every page the change touches, at 1920x1080 and 390x844 (P2).
- When Nathan corrects the same thing a second time, add an I line to `spec/design-intent.md` in the same turn: the next free I number, his words verbatim, a Test.

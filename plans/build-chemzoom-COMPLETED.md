---
type: plan
title: Build ChemZoom v1 - filament chemistry explorer
description: What v1 contains, the shared data contract, and the three build lanes (content, app, sims) with their file ownership and done-when lists.
created: 2026-10-17
---

# Build ChemZoom v1

Nathan's ask (17 Oct 2026, verbatim): "We do a lot of 3-D printing and we don't understand what the difference filaments are really made of why some are different to other others such as PLA PETG TPU ASA ETC. I would like a ... app or a mini app ... which will explain the differences but visually with 3-D images of the different molecules involved. How they bond together what the atoms are in the molecules ... some really cool way of learning to understand the different things in the filament. It would be good to do it in a way that we could expand it out to not just 3-D filament but possibly other molecular and chemistry later on."

His answers: for him and Josh (12) both; its own project, hosted on GitHub Pages like Fruity; start with PLA, PETG, TPU, ABS, ASA; build the whole thing, no prototype stage.

Read first: `PRODUCT.md` (who, register, must-be-true), `DESIGN.md` (look, layout, motion), `src/types/chem.ts` (the data contract), `src/sims/types.ts` (the sim contract).

## The experience

**Home.** A title, one line ("What's actually inside your filament?"), the Filaments collection as five material cards (accent spool, short name, nickname, key idea), and two more entries: "The basics: atoms and bonds" and "Compare two filaments".

**Material page** (`#/m/:id`). The 3D stage plus the story panel. A material switcher (five chips) lets you hop between materials while staying on the same zoom step, so differences jump out.

The zoom, six steps, same for every material:

1. **Spool**: a 3D spool wound with filament in the accent colour. Caption includes the spool maths: 1 kg of this material is about N metres of 1.75 mm strand (computed from `densityGcm3`; PLA at 1.24 g/cm3 is about 335 m).
2. **Strand**: a close-up of the strand end, a smooth cylinder.
3. **Tangle**: inside the strand, chains as coloured tubes, styled by `morphology`:
   - semicrystalline (PLA): a random tangle with a few neat folded patches (crystals).
   - amorphous (PETG): a pure random tangle.
   - segmented (TPU): chains whose hard sections clump into small dense islands, soft loops between.
   - rubber-toughened (ABS, ASA): a glassy tangle with soft rubber blobs scattered through it.
4. **Chain**: one chain pulled out, beads marking repeat units ("thousands of these in a row").
5. **Molecule**: the oligomer in ball-and-stick (`oligomer`), the repeat unit (`repeatUnitGroup`) lit, the rest dimmed; tap the other groups (ester link, CHDM ring, urethane link, C=C double bond, acrylate side group) to light them with their note.
6. **Atom**: tap any atom for its element card (name, protons, bonds it usually makes, blurb). A "space-filling" toggle shows how the atoms really crowd together.

Every step has a caption (`zoom[level]`) with "Go deeper". The camera flies between steps (DESIGN.md § Motion).

**Concept sims**, listed under the material and runnable full-panel:

| Sim | Question | Applies to | Mechanic |
|---|---|---|---|
| Heat it up | Why does PLA sag in a hot car, and why does each filament need a different nozzle temperature? | all | Temperature slider from 20°C to the top of the nozzle range. Chains jiggle more as it rises; markers at Tg ("chains start to slide"), melt (PLA crystals melt; TPU hard islands let go) and the print range. Readout says frozen / soft / runny. |
| Cool and warp | Why do ABS and ASA lift off the bed? | all, pair ABS with PLA | Hot print cools layer by layer; chains pack tighter and the part shrinks; with high `shrink` the corners curl up. Toggle "enclosure" slows the cooling and reduces the curl. |
| Layer bonding | Why are prints weaker between layers, and why does hotter help? | all | Two layers meet; a slider sets how hot the new layer is; chains from the new layer wriggle across the seam (more crossings when hotter); a bond-strength meter fills. |
| Sunlight | Why does ABS go yellow and brittle outside but ASA doesn't? | abs, asa (pair) | Side by side: UV rays hit the rubber; in ABS the C=C double bond (`uvWeakSpot`) snaps, shown with the shared MoleculeView `broken` prop; in ASA the acrylate rubber has no C=C to snap. |
| Thirsty plastic | Why does wet TPU or PETG pop and string? | all | Water molecules drift into the tangle according to `thirst`; heat it at the nozzle and the water flashes to steam bubbles. A "dry it" button empties them. |

**Compare** (`#/compare?a=pla&b=abs`): two materials side by side: mini spool, trait bars (`traits`), temps table, enclosure and drying, key idea; and their molecules side by side.

**The basics** (`#/basics`): what an atom is (protons, electrons, the four elements in these plastics), what a bond is (shared electrons; single, double, triple), why carbon makes chains (four bonds), and what a polymer is (monomers joining). Uses small molecules from the data (water, methane, ethylene, ethane, benzene, lactic acid) in the shared MoleculeView.

**Sources** (`#/sources`): every source cited anywhere, grouped by material.

Routing is a HashRouter (GitHub Pages serves no fallback for deep links).

## Shared contract (in the base commit; changes go through the lead)

- `src/types/chem.ts`: Text, SourceRef, Fact, ElementInfo, Molecule, Material, Collection.
- `src/sims/types.ts`: SimDef, SimProps.
- `src/content/index.ts`: `materials`, `materialList`, `molecules`, `getMolecule(id)`, `collections`, `elements`.
- `src/three/MoleculeView.tsx`, `src/three/chains.ts`: the shared 3D pieces; lane B owns and may improve them, props and exports stay stable.
- `scripts/build-molecules.py` + `scripts/molecules.json` -> `src/data/molecules/*.json` (`uv run --with rdkit python scripts/build-molecules.py`).

A lane that needs the contract changed says so in its report (`UNCERTAIN:` line) rather than changing it.

## Lanes

Each lane works in its own git worktree off the base commit and touches only its own files, so the merges are clean.

### Lane A - content and molecules (worktree `~/Dev/ChemZoom-wt-content`)

Owns: `src/content/**`, `src/data/**`, `scripts/**`.

- Replace every STUB in `src/content/materials.ts` and `src/content/elements.ts` with checked content: all `Text` fields at both depths, `madeFrom`, `keyIdea`, all six zoom captions per material, traits with reasons, temps, print tips, drying temps, sim params, at least 5 `facts` per material, `sources`.
- Numbers (Tg, melt, nozzle and bed ranges, density, drying) come from the Bambu Lab technical data sheets for their PLA Basic, PETG HF (or PETG Basic), TPU 95A HF, ABS and ASA where they exist, cross-checked against an encyclopedia or a second maker. Where sources disagree, give the range and cite both.
- Chemistry claims (what each polymer is made of, why PETG's CHDM stops crystals, TPU hard and soft segments, ABS's butadiene C=C and UV, ASA's acrylate rubber, PLA from fermented plant sugars) each cite a source.
- Molecules in `scripts/molecules.json`: check every SMILES is chemically right for what it claims to show; monomers for each material (lactic acid, lactide, terephthalic acid, ethylene glycol, CHDM, MDI, 1,4-butanediol, a short PTMEG or polyester polyol piece for TPU's soft segment, acrylonitrile, butadiene, styrene, butyl acrylate); an oligomer per material with a correct repeat-unit group; TPU also a soft-segment piece; ABS's butadiene and ASA's acrylate rubber pieces for the sims; the basics set (water, methane, ethane, ethylene, benzene, lactic acid). Groups by SMARTS with clear labels and notes. Fill `monomers` on each material. PubChem links as sources.
- Rebuild the JSON and check every molecule id a material or sim param names exists.
- Writing: plain words a 12-year-old follows in `simple`; real names and numbers in `deeper`. Australian spelling. No em or en dashes anywhere (use a comma, colon or " - "). No "AI".

### Lane B - the app (worktree `~/Dev/ChemZoom-wt-app`)

Owns: `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/app/**`, `src/components/**`, `src/scenes/**`, `src/three/**`, `src/lib/**`, `index.html`, `public/**`.

- Everything in "The experience" except the sims' insides: home, material page with the six-step zoom, the story panel, material switcher, compare, basics, sources, routing, the sims list and a full-panel sim host that renders whatever `src/sims/index.ts` exports (empty in this worktree; build the host against a throwaway local sim and remove it before reporting).
- The zoom scenes per morphology, the spool, the strand, the chain with repeat-unit beads, the molecule step with group lighting and atom tap, element card, space-filling toggle, atom legend.
- DESIGN.md is the spec for look, layout and motion, including the phone layout and safe areas. One `<Canvas>` per view, `frameloop="demand"`, DPR capped at 2, instancing where counts are high; it must stay smooth on an iPad and a phone.
- Code-split the 3D chunk if the main bundle passes 600 kB gzip.
- PWA icons (192 and 512 PNG from the favicon) and the manifest.

### Lane C - the concept sims (worktree `~/Dev/ChemZoom-wt-sims`)

Owns: `src/sims/**` (except `types.ts`, which is the contract).

- The five sims in the table, each a `SimDef` registered in `src/sims/index.ts`, each driven only by `Material` fields (`temps`, `sim`, `morphology`, `accent`) so new materials work without code changes.
- Uses `src/three/chains.ts` and `src/three/MoleculeView.tsx` from the base; doesn't edit them (ask the lead if one needs a change).
- Each sim: its own `<Canvas frameloop="demand">`, a clear control, a one-line live readout, a short "what you're seeing" caption, play stops by itself, reduced motion respected (SimDef doc comment).
- A dev-only harness page is fine for building but must not ship.

## Done when (lead checks each)

- ✅ `bun run build` and `bun run lint` pass on the merged main.
- ✅ All five materials walk all six zoom steps with checked captions; switching material keeps the step.
- ✅ All five sims run on the right materials; nothing animates when nobody is touching it.
- ✅ Compare, basics and sources pages work; every fact shows a source.
- ✅ Driven in a real browser at 1920x1080 and 390x844: no overflow, no text under the stage, safe areas right.
- ✅ Live at https://natman3000.github.io/ChemZoom/ and loads offline after the first visit.

## Amendment 17 Oct 2026

v1 shipped. All three lanes merged (content 6a80a96, app 56ba0aa, sims 412b1ec); every done-when item checked by the lead: gates green, pages and all five sims shot in headless Chrome at 1920x1080 and 390x844 with 0 idle frames, live at https://natman3000.github.io/ChemZoom/ [live], and the PLA molecule page renders offline after one visit [live]. Decisions made during the build: every trait bar reads higher = better (moisture shows as "Stays dry"); the TPU heat slider starts below room temperature so its -50°C glass transition is on the scale; Sunlight shows the ABS rubber beside the ASA rubber. Not yet checked on a real iPhone or iPad (safe areas tested with an injected inset only).

# ChemZoom

| Field | Value |
|-------|-------|
| **Status** | Active |
| **Priority** | Medium |
| **Owner** | Nathan |
| **Category** | personal/family |

## Quick context

A 3D chemistry explorer for Nathan and Josh. Zoom from a spool of 3D printing filament down to its atoms and see why PLA, PETG, TPU, ABS and ASA behave differently. Built to grow into other chemistry topics. Live on GitHub Pages: https://natman3000.github.io/ChemZoom/

- Who and why: `PRODUCT.md`. Look and motion: `DESIGN.md`. v1 build plan and lanes: `plans/build-chemzoom.md`.
- `TIMELINE.md`: grep on demand. `open-threads.md`: surfaced at session start.

## Stack

React 19 + TypeScript, Vite, Tailwind v4, three.js via @react-three/fiber + drei, react-router (HashRouter), zustand, vite-plugin-pwa, Bun. Molecule geometry from RDKit at build time.

## Commands

```bash
bun install
bun run dev        # http://localhost:5173/ChemZoom/
bun run build      # tsc + vite build
bun run lint       # oxlint
uv run --with rdkit python scripts/build-molecules.py   # scripts/molecules.json -> src/data/molecules/*.json
```

## How the data is layered

`src/types/chem.ts` is the contract: elements -> molecules -> materials -> collections. The 3D viewers (`src/three/`) know nothing about filament; a new topic is new data in `src/content/` and `scripts/molecules.json`, not new viewer code. Concept sims (`src/sims/`) read only `Material` fields, so a new material gets them for free.

## Rules for this repo

- Every fact shown in the app carries a source (`Fact.sources`, `Material.sources`, `Molecule.sources`).
- Nothing animates unless the user made it move, and it stops by itself: `frameloop="demand"`, no `animate-pulse` / `ping` / `bounce`.
- GitHub Pages subpath: asset paths go through `import.meta.env.BASE_URL` (`~/Dev/docs/github-pages-pwa-deploy.md`).
- UI text: no em or en dashes, Australian spelling.

## Remotes

Forgejo `nathan/ChemZoom` is fetch and push; GitHub `NatMan3000/ChemZoom` (public, for Pages) is a push-only mirror. Push to `origin` deploys via `.github/workflows/deploy.yml`.

# ChemZoom

What's actually inside your 3D printing filament? Zoom from a spool down to the atoms and see why PLA, PETG, TPU, ABS and ASA behave so differently.

Live: https://natman3000.github.io/ChemZoom/

```bash
bun install
bun run dev
```

Molecule shapes are generated with RDKit from `scripts/molecules.json`:

```bash
uv run --with rdkit python scripts/build-molecules.py
```

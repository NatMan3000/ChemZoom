"""Build 3D molecule JSON for ChemZoom from scripts/molecules.json.

Run:  uv run --with rdkit python scripts/build-molecules.py
Out:  src/data/molecules/<id>.json  (shape: src/types/chem.ts `Molecule`)

Each entry: { id, name, smiles, groups: [{ id, label, kind, smarts, match?, note? }], sources }
A group's atoms are the heavy atoms of the SMARTS match (match index `match`, default 0)
plus the hydrogens bonded to them. Coordinates come from RDKit ETKDG + MMFF, fixed seed,
centred on the centroid, in angstroms.
"""

import json
import sys
from pathlib import Path

from rdkit import Chem
from rdkit.Chem import AllChem, rdMolDescriptors

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "scripts" / "molecules.json"
OUT = ROOT / "src" / "data" / "molecules"
SEED = 0xC0FFEE


def embed(smiles: str) -> Chem.Mol:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError(f"bad SMILES: {smiles}")
    mol = Chem.AddHs(mol)
    params = AllChem.ETKDGv3()
    params.randomSeed = SEED
    if AllChem.EmbedMolecule(mol, params) != 0:
        # Crowded branched pieces (a quaternary graft point) can defeat the default
        # eigenvalue start; random starting coordinates still converge, same seed.
        params.useRandomCoords = True
        if AllChem.EmbedMolecule(mol, params) != 0:
            raise RuntimeError(f"embed failed: {smiles}")
    AllChem.MMFFOptimizeMolecule(mol, maxIters=2000)
    return mol


def group_atoms(mol: Chem.Mol, smarts: str, match: int) -> list[int]:
    patt = Chem.MolFromSmarts(smarts)
    if patt is None:
        raise ValueError(f"bad SMARTS: {smarts}")
    matches = mol.GetSubstructMatches(patt, uniquify=True, maxMatches=1000)
    if len(matches) <= match:
        raise ValueError(f"SMARTS {smarts} has {len(matches)} matches, wanted index {match}")
    heavy = set(matches[match])
    hs = {n.GetIdx() for i in heavy for n in mol.GetAtomWithIdx(i).GetNeighbors() if n.GetAtomicNum() == 1}
    return sorted(heavy | hs)


def build(entry: dict) -> dict:
    mol = embed(entry["smiles"])
    conf = mol.GetConformer()
    pts = [conf.GetAtomPosition(i) for i in range(mol.GetNumAtoms())]
    cx = sum(p.x for p in pts) / len(pts)
    cy = sum(p.y for p in pts) / len(pts)
    cz = sum(p.z for p in pts) / len(pts)

    atoms = []
    for a, p in zip(mol.GetAtoms(), pts):
        atom = {"el": a.GetSymbol(), "x": round(p.x - cx, 3), "y": round(p.y - cy, 3), "z": round(p.z - cz, 3)}
        if a.GetFormalCharge():
            atom["charge"] = a.GetFormalCharge()
        atoms.append(atom)

    kek = Chem.Mol(mol)
    Chem.Kekulize(kek, clearAromaticFlags=False)
    bonds = []
    for b, kb in zip(mol.GetBonds(), kek.GetBonds()):
        bond = {"a": b.GetBeginAtomIdx(), "b": b.GetEndAtomIdx(), "order": int(kb.GetBondTypeAsDouble())}
        if b.GetIsAromatic():
            bond["aromatic"] = True
        bonds.append(bond)

    groups = []
    for g in entry.get("groups", []):
        out = {"id": g["id"], "label": g["label"], "kind": g["kind"], "atoms": group_atoms(mol, g["smarts"], g.get("match", 0))}
        if "note" in g:
            out["note"] = g["note"]
        groups.append(out)

    return {
        "id": entry["id"],
        "name": entry["name"],
        "formula": rdMolDescriptors.CalcMolFormula(mol),
        "smiles": entry["smiles"],
        "atoms": atoms,
        "bonds": bonds,
        "groups": groups,
        "sources": entry.get("sources", []),
    }


def main() -> int:
    spec = json.loads(SPEC.read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    failed = 0
    for entry in spec:
        try:
            mol = build(entry)
        except Exception as e:  # report every bad entry, then fail the run
            print(f"FAIL {entry.get('id')}: {e}", file=sys.stderr)
            failed += 1
            continue
        (OUT / f"{mol['id']}.json").write_text(json.dumps(mol, separators=(",", ":")) + "\n")
        print(f"ok   {mol['id']:<24} {mol['formula']:<14} atoms={len(mol['atoms'])} groups={len(mol['groups'])}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

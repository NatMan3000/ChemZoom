// Content gate for ChemZoom: every id a material points at exists, every material is complete,
// and every shown string follows the writing rules.
// Run: bun scripts/check-content.ts   (exit 1 on any problem)

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { elements } from '../src/content/elements'
import { materials } from '../src/content/materials'
import { ZOOM_LEVELS, type Molecule, type TraitId } from '../src/types/chem'
import { checkAtomCounts } from '../src/scenes/atom/atomModel'

const ROOT = join(import.meta.dir, '..')
const MOL_DIR = join(ROOT, 'src', 'data', 'molecules')
const problems: string[] = []
const fail = (msg: string) => problems.push(msg)

// ---------------------------------------------------------------- molecules on disk

const molecules = new Map<string, Molecule>()
for (const f of readdirSync(MOL_DIR).filter((n) => n.endsWith('.json'))) {
  const m = JSON.parse(readFileSync(join(MOL_DIR, f), 'utf8')) as Molecule
  if (`${m.id}.json` !== f) fail(`molecule file ${f} holds id "${m.id}"`)
  molecules.set(m.id, m)
}
const spec = JSON.parse(readFileSync(join(ROOT, 'scripts', 'molecules.json'), 'utf8')) as { id: string }[]
for (const e of spec) if (!molecules.has(e.id)) fail(`molecules.json entry "${e.id}" was not built (rerun build-molecules.py)`)
for (const id of molecules.keys()) if (!spec.some((e) => e.id === id)) fail(`stale built molecule "${id}" not in molecules.json`)

function needMolecule(where: string, id: string): Molecule | undefined {
  const m = molecules.get(id)
  if (!m) fail(`${where}: molecule "${id}" does not exist`)
  return m
}
function needGroup(where: string, molId: string, groupId: string, kind?: string) {
  const m = needMolecule(where, molId)
  if (!m) return
  const g = m.groups.find((x) => x.id === groupId)
  if (!g) return fail(`${where}: group "${groupId}" not in molecule "${molId}" (has ${m.groups.map((x) => x.id).join(', ')})`)
  if (kind && g.kind !== kind) fail(`${where}: group "${groupId}" in "${molId}" is kind "${g.kind}", expected "${kind}"`)
  if (g.atoms.length === 0) fail(`${where}: group "${groupId}" in "${molId}" has no atoms`)
}

for (const m of molecules.values()) {
  const n = m.atoms.length
  for (const b of m.bonds) if (b.a >= n || b.b >= n) fail(`molecule ${m.id}: bond to missing atom`)
  for (const g of m.groups) {
    if (g.atoms.some((i) => i >= n)) fail(`molecule ${m.id}: group ${g.id} points past the atom list`)
    if (new Set(m.groups.map((x) => x.id)).size !== m.groups.length) fail(`molecule ${m.id}: duplicate group ids`)
  }
  if (m.sources.length === 0) fail(`molecule ${m.id}: no sources`)
}

// ---------------------------------------------------------------- materials

const TRAITS: TraitId[] = ['strength', 'flexibility', 'heat', 'uv', 'easy', 'moisture']
const STRAND_AREA_CM2 = Math.PI * 0.0875 ** 2

for (const mat of Object.values(materials)) {
  const at = `material ${mat.id}`
  for (const id of mat.monomers) needMolecule(`${at} monomers`, id)
  if (mat.monomers.length === 0) fail(`${at}: no monomers`)
  needGroup(`${at} repeatUnitGroup`, mat.oligomer, mat.repeatUnitGroup, 'repeat-unit')
  if (mat.sim.uvWeakSpot) needGroup(`${at} sim.uvWeakSpot`, mat.sim.uvWeakSpot.molecule, mat.sim.uvWeakSpot.group, 'weak-spot')
  if (mat.sim.rubberBlobs) needMolecule(`${at} sim.rubberBlobs`, mat.sim.rubberBlobs.molecule)
  if (mat.sim.hardSegments) needMolecule(`${at} sim.hardSegments`, mat.sim.hardSegments.molecule)

  for (const z of ZOOM_LEVELS) if (!mat.zoom[z]?.simple || !mat.zoom[z]?.deeper) fail(`${at}: zoom.${z} needs simple and deeper`)
  for (const [k, t] of [['madeFrom', mat.madeFrom], ['keyIdea', mat.keyIdea]] as const) if (!t.deeper) fail(`${at}: ${k} has no deeper`)
  const traitIds = mat.traits.map((t) => t.id)
  for (const t of TRAITS) if (traitIds.filter((x) => x === t).length !== 1) fail(`${at}: trait ${t} missing or repeated`)
  for (const t of mat.traits) if (!t.why.deeper) fail(`${at}: trait ${t.id} has no deeper`)
  // Every trait bar reads higher = better, so `moisture` means "stays dry" and mirrors the sim's
  // thirst (higher = thirstier): moisture = 6 - thirst.
  const moisture = mat.traits.find((t) => t.id === 'moisture')
  if (moisture && moisture.score !== 6 - mat.sim.thirst) fail(`${at}: trait moisture (stays dry) is ${moisture.score}, expected 6 - thirst = ${6 - mat.sim.thirst}`)
  for (const t of mat.print.tips) if (!t.deeper) fail(`${at}: a print tip has no deeper`)
  if (mat.facts.length < 5) fail(`${at}: ${mat.facts.length} facts, need 5+`)
  mat.facts.forEach((f, i) => {
    if (f.sources.length === 0) fail(`${at}: fact ${i} has no source`)
    if (!f.text.deeper) fail(`${at}: fact ${i} has no deeper`)
  })
  if (mat.sources.length === 0) fail(`${at}: no sources`)
  const { nozzleC, bedC, tgC, meltC } = mat.temps
  if (nozzleC[0] > nozzleC[1] || bedC[0] > bedC[1]) fail(`${at}: a temperature range runs backwards`)
  if (meltC !== undefined && meltC <= tgC) fail(`${at}: melt below Tg`)

  // spool caption carries the metres-per-kg figure from density, rounded to the nearest 5 m
  const metres = 1000 / (mat.densityGcm3 * STRAND_AREA_CM2) / 100
  const shown = Math.round(metres / 5) * 5
  if (!mat.zoom.spool.simple.includes(`about ${shown} metres`)) fail(`${at}: spool caption should say "about ${shown} metres" (computed ${metres.toFixed(1)} m)`)
}

// ---------------------------------------------------------------- writing rules

const strings: [string, string][] = []
const walk = (where: string, v: unknown) => {
  if (typeof v === 'string') strings.push([where, v])
  else if (Array.isArray(v)) v.forEach((x, i) => walk(`${where}[${i}]`, x))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (k !== 'url' && k !== 'smiles') walk(`${where}.${k}`, x)
}
walk('materials', materials)
walk('elements', elements)
for (const m of molecules.values()) walk(`molecule ${m.id}`, { name: m.name, groups: m.groups.map((g) => ({ label: g.label, note: g.note })), sources: m.sources })

const DASHES = /[‐-―−﹘﹣－]/
const AMERICAN = /\b(color|colors|colored|behavior|flavor|center|centered|fiber|fibers|aluminum|gray|mold|molded|molding|favorite|analyze|crystallize|crystallizes|crystallized|crystallization|polymerize|polymerized|polymerization|vulcanized|vulcanization|neighbor|neighboring|liter|labeled|modeling|optimize|recognize)\b/i
for (const [where, s] of strings) {
  if (DASHES.test(s)) fail(`${where}: Unicode dash in "${s.slice(0, 60)}"`)
  if (/\bAI\b/.test(s)) fail(`${where}: write "Ai", not "AI"`)
  if (s.includes('!')) fail(`${where}: exclamation mark`)
  const us = s.match(AMERICAN)
  if (us) fail(`${where}: American spelling "${us[0]}"`)
}
const textCount = strings.length

// Every atom's electrons add up (shared pairs = bond orders, full outer shells), so the atom level never lies.
for (const p of checkAtomCounts([...molecules.values()]).problems) fail(`atom counts: ${p}`)

if (problems.length) {
  console.error(problems.map((p) => `FAIL ${p}`).join('\n'))
  console.error(`\n${problems.length} problem(s)`)
  process.exit(1)
}
console.log(`ok: ${molecules.size} molecules, ${Object.keys(materials).length} materials, ${textCount} strings checked`)

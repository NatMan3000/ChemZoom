# ChemZoom - design system

Grounded with `ui-ux-pro-max` (17 Oct 2026). Its pick for "educational 3D" was claymorphism with Baloo 2 / Comic Neue; overruled because the audience is a 12-year-old and an adult, and Comic-style type reads as little-kid (PRODUCT.md anti-references). Kept from it: friendly geometric type, one clear accent per thing, 4.5:1 contrast, soft 200 ms transitions, reduced-motion respected.

## Direction

A dark exhibit hall. The 3D stage is the hero and fills the screen; atoms glow in their standard colours against deep ink. UI sits on calm panels around the stage and never competes with it. Each material owns one accent colour, used for its spool, its tab and its compare bar, nowhere else.

## Colour (tokens live in `src/index.css` `@theme`)

| Token | Hex | Use |
|---|---|---|
| stage | #0B1020 | page and 3D background |
| surface | #131A2E | panels, cards |
| surface-2 | #1B2440 | raised controls, selected rows |
| line | #2A3558 | borders, dividers |
| ink | #E8ECF7 | body text |
| ink-muted | #A3AECB | secondary text (passes 4.5:1 on stage and surface) |
| primary | #8B9CFF | links, focus ring, active zoom step |
| pla / petg / tpu / abs / asa | #4ADE80 / #22D3EE / #F472B6 / #FBBF24 / #FB923C | one per material |

Atom colours are Jmol/CPK, lightened where needed for the dark stage (`src/content/elements.ts`): H #F4F4F4, C #8E959E, N #5B7CFF, O #FF4D4D. A legend is always one tap away whenever atoms are on screen.

## Type

- Display: Space Grotesk Variable (titles, material names, big numbers).
- Body: Plus Jakarta Sans Variable.
- Both self-hosted via @fontsource so the PWA works offline.
- Scale: 14 / 16 / 18 / 24 / 32 / 48. Body 16, never below 14. Numbers use `tabular-nums`.

## Layout

- App shell: `h-dvh` flex column, one scroll container, safe-area insets (`~/Dev/docs/github-pages-pwa-deploy.md` § iOS).
- Desktop (>= 1024): stage left (about two-thirds), story panel right. Zoom rail runs vertically down the stage's left edge.
- Tablet: same split, narrower panel.
- Phone (< 768): stage on top (about 55% of the height), story panel below as a scrollable sheet; zoom rail becomes a horizontal step bar under the stage.
- Text fills its container: no `max-w-prose` or `ch` caps inside panels and cards.
- Spacing scale 4 / 8 / 12 / 16 / 24 / 32 / 48. Radius 12 on cards, 999 on pills.

## Motion

- Camera moves between zoom steps: 700-900 ms, ease-in-out, cross-fading the outgoing scene.
- UI: 150-250 ms ease-out on hover, press and panel changes.
- No always-on animation (no `animate-pulse`, `animate-ping`, `animate-bounce`, no idle spinning models). Canvases use `frameloop="demand"`; anything that moves does so because the user dragged, tapped or pressed play, and stops by itself.
- `prefers-reduced-motion`: camera cuts instead of flying; sims jump to their end state.

## Components

- Zoom rail: six steps (Spool, Strand, Tangle, Chain, Molecule, Atom) with an icon and label; the current step in primary.
- Story card: title, `simple` text, a "Go deeper" disclosure revealing `deeper`, sources as small links at the foot.
- Trait bars: five-segment bars in the material's accent, label left, score right, `why` on tap.
- Material chip: accent dot + short name; used on home, compare and the material switcher.
- Icons: lucide-react only. No emoji as icons.

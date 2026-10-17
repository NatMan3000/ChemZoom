// The printing close-ups' scale (spec/desktop-standard.md, "All five experiments are printing close-ups").
// One scene unit is a third of a millimetre, so a 0.2 mm layer is 0.6 units and the whole close-up is a few
// millimetres across. The sizes that matter to the story are real: the 0.4 mm hole, the 0.45 mm line and the
// 0.2 mm layer. The nozzle's cone and hex above the tip are shortened to fit the view.

/** Scene units per millimetre. */
export const MM = 3
/** Layer height, 0.2 mm. */
export const LAYER_H = 0.2 * MM
/** Line (bead) width, 0.45 mm. */
export const LINE_W = 0.45 * MM
/** The nozzle's hole, 0.4 mm across. */
export const HOLE = 0.4 * MM
/** Filament, 1.75 mm across. */
export const FILAMENT = 1.75 * MM

/** The colour a heat picture paints hot plastic (the shader's own mix uses the same hue). */
export const HEAT_GLOW = '#FFB27A'
/** The ring, leader line and outline of every chain lens. */
export const LENS_COLOUR = '#8B9CFF'

/** Heights of the nozzle's parts above its hole (scene units), for placing things against it: the flat tip, cone, hex and the sock's underside. */
export const NOZZLE_PARTS = { tipTop: 0.4, coneTop: 2.4, hexTop: 3.8, sockBottom: 3.8, tipRadius: 1.05, coneTopRadius: 2.6 } as const

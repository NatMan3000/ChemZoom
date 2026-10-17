import type { ElementInfo, ElementSymbol } from '../types/chem'

// Jmol colours, lightened where the stock colour disappears on the dark stage (N, O).
// Radii are ball sizes for ball-and-stick in angstrom units, not real atomic radii.
// STUB blurbs: the content lane replaces these with checked text.
export const elements: Record<ElementSymbol, ElementInfo> = {
  H: { symbol: 'H', name: 'Hydrogen', number: 1, colour: '#F4F4F4', radius: 0.24, bondsUsually: 1, blurb: { simple: 'The smallest atom. It sticks to one other atom.' } },
  C: { symbol: 'C', name: 'Carbon', number: 6, colour: '#8E959E', radius: 0.38, bondsUsually: 4, blurb: { simple: 'The backbone of every plastic. It makes four bonds, so it can build long chains.' } },
  N: { symbol: 'N', name: 'Nitrogen', number: 7, colour: '#5B7CFF', radius: 0.36, bondsUsually: 3, blurb: { simple: 'Makes three bonds.' } },
  O: { symbol: 'O', name: 'Oxygen', number: 8, colour: '#FF4D4D', radius: 0.35, bondsUsually: 2, blurb: { simple: 'Makes two bonds.' } },
  F: { symbol: 'F', name: 'Fluorine', number: 9, colour: '#90E050', radius: 0.33, bondsUsually: 1, blurb: { simple: 'Makes one bond.' } },
  Na: { symbol: 'Na', name: 'Sodium', number: 11, colour: '#AB5CF2', radius: 0.5, bondsUsually: 1, blurb: { simple: 'A metal that gives away one electron.' } },
  Si: { symbol: 'Si', name: 'Silicon', number: 14, colour: '#F0C8A0', radius: 0.45, bondsUsually: 4, blurb: { simple: 'Carbon’s bigger cousin. Makes four bonds.' } },
  P: { symbol: 'P', name: 'Phosphorus', number: 15, colour: '#FF8000', radius: 0.44, bondsUsually: 3, blurb: { simple: 'Makes three or five bonds.' } },
  S: { symbol: 'S', name: 'Sulfur', number: 16, colour: '#FFE14D', radius: 0.44, bondsUsually: 2, blurb: { simple: 'Makes two bonds.' } },
  Cl: { symbol: 'Cl', name: 'Chlorine', number: 17, colour: '#1FF01F', radius: 0.42, bondsUsually: 1, blurb: { simple: 'Makes one bond.' } },
}

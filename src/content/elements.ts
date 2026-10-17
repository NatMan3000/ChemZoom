import type { ElementInfo, ElementSymbol } from '../types/chem'

// Jmol colours, lightened where the stock colour disappears on the dark stage (N, O).
// Radii are ball sizes for ball-and-stick in angstrom units, not real atomic radii.
// Blurbs: `simple` for a curious 12-year-old, `deeper` for an adult. Proton counts and usual
// bond counts are standard periodic-table facts; where an element turns up in the filaments
// the text says which ones (see src/content/materials.ts and scripts/molecules.json).
export const elements: Record<ElementSymbol, ElementInfo> = {
  H: {
    symbol: 'H', name: 'Hydrogen', number: 1, colour: '#F4F4F4', radius: 0.24, bondsUsually: 1,
    blurb: {
      simple: 'The smallest atom: one proton and one electron. It can only hold on to one other atom, so it always sits on the outside of a molecule, like the bristles on a brush.',
      deeper: 'Hydrogen shares its single electron to make one covalent bond. In every filament here, hydrogens cap the carbon backbone; an H on nitrogen (in TPU’s urethane links) can also reach across to an oxygen on the next chain and form a hydrogen bond.',
    },
  },
  C: {
    symbol: 'C', name: 'Carbon', number: 6, colour: '#8E959E', radius: 0.38, bondsUsually: 4,
    blurb: {
      simple: 'The backbone of every plastic. Carbon makes four bonds, so it can hold hands with two other carbons and still have room for more. That is how it builds long chains and rings.',
      deeper: 'Six protons; four outer electrons to share, so four bonds (single, double or triple). Carbon bonds strongly to itself, which is why it forms the chains and rings of all five filaments and of nearly all of biology.',
    },
  },
  N: {
    symbol: 'N', name: 'Nitrogen', number: 7, colour: '#5B7CFF', radius: 0.36, bondsUsually: 3,
    blurb: {
      simple: 'Makes three bonds. In these plastics it only turns up in TPU (in the urethane links) and in ABS and ASA (in the acrylonitrile).',
      deeper: 'Seven protons; three bonds plus one lone pair of electrons. In acrylonitrile it is joined to carbon by a triple bond (a nitrile group, drawn as three sticks); in TPU it sits in the -NH-C(=O)-O- urethane link. Nitrogen in a plastic is why burning it gives nitrogen oxides.',
    },
  },
  O: {
    symbol: 'O', name: 'Oxygen', number: 8, colour: '#FF4D4D', radius: 0.35, bondsUsually: 2,
    blurb: {
      simple: 'Makes two bonds. It is in the links that join PLA, PETG and TPU together, and in ASA’s rubber. ABS has none at all.',
      deeper: 'Eight protons; two bonds plus two lone pairs. Oxygen strongly pulls on shared electrons, so C=O and O-H groups are polar. In ester links (PLA, PETG) water can attack the carbon next to it and cut the chain: that is hydrolysis.',
    },
  },
  F: {
    symbol: 'F', name: 'Fluorine', number: 9, colour: '#90E050', radius: 0.33, bondsUsually: 1,
    blurb: {
      simple: 'Makes one bond, and holds on to its electrons harder than any other atom.',
      deeper: 'Nine protons. Fluorine is the most electronegative element; carbon-fluorine bonds are very strong, which is why fluoropolymers such as PTFE are so slippery and unreactive.',
    },
  },
  Na: {
    symbol: 'Na', name: 'Sodium', number: 11, colour: '#AB5CF2', radius: 0.5, bondsUsually: 1,
    blurb: {
      simple: 'A soft metal that would rather give away its one outer electron than share it. In table salt it has handed that electron to chlorine.',
      deeper: 'Eleven protons. Sodium forms ions (Na+) rather than sharing electrons, so its "bonds" are usually ionic, as in sodium chloride.',
    },
  },
  Si: {
    symbol: 'Si', name: 'Silicon', number: 14, colour: '#F0C8A0', radius: 0.45, bondsUsually: 4,
    blurb: {
      simple: 'Carbon’s bigger cousin, sitting right below it in the periodic table. It also makes four bonds. Sand and glass are mostly silicon and oxygen.',
      deeper: 'Fourteen protons; four bonds, like carbon. Silicon-oxygen chains form the backbone of silicone rubbers, and silicon dioxide is quartz and sand.',
    },
  },
  P: {
    symbol: 'P', name: 'Phosphorus', number: 15, colour: '#FF8000', radius: 0.44, bondsUsually: 3,
    blurb: {
      simple: 'Usually makes three bonds, sometimes five. Phosphorus links together the backbone of your DNA.',
      deeper: 'Fifteen protons. Phosphorus can use three bonds, or five as in phosphate groups (PO4), which join the sugars along DNA and RNA.',
    },
  },
  S: {
    symbol: 'S', name: 'Sulfur', number: 16, colour: '#FFE14D', radius: 0.44, bondsUsually: 2,
    blurb: {
      simple: 'Makes two bonds, like oxygen just below it in the periodic table. Sulfur bridges are what turn sticky raw rubber into a car tyre.',
      deeper: 'Sixteen protons. In vulcanised rubber, chains of sulfur atoms cross-link neighbouring polymer chains permanently; that is why a tyre cannot be melted and reshaped the way TPU can.',
    },
  },
  Cl: {
    symbol: 'Cl', name: 'Chlorine', number: 17, colour: '#1FF01F', radius: 0.42, bondsUsually: 1,
    blurb: {
      simple: 'Makes one bond. It is the other half of table salt, and it is in PVC pipes. None of the five filaments here contain any.',
      deeper: 'Seventeen protons. Chlorine makes one covalent bond (as in PVC) or takes an electron to become a chloride ion (as in salt). Plastics without it, such as PLA, cannot make hydrochloric acid or dioxins when burnt.',
    },
  },
}

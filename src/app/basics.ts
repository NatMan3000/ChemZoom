import type { ElementSymbol, SourceRef, Text } from '../types/chem'

// Text for the basics page. Short, plain, and each section cites where it comes from.
// Molecules are looked up by id; a section shows whichever of its molecules exist in the data.

export interface BasicsMolecule {
  id: string
  caption: string
}

export interface BasicsSection {
  id: string
  title: string
  body: Text
  points?: string[]
  elements?: ElementSymbol[]
  molecules?: BasicsMolecule[]
  sources: SourceRef[]
}

const BRITANNICA_ATOM = { label: 'Britannica: Atom', url: 'https://www.britannica.com/science/atom' }
const BRITANNICA_COVALENT = { label: 'Britannica: Covalent bond', url: 'https://www.britannica.com/science/covalent-bond' }
const BRITANNICA_CARBON = { label: 'Britannica: Carbon', url: 'https://www.britannica.com/science/carbon-chemical-element' }
const BRITANNICA_POLYMER = { label: 'Britannica: Polymer', url: 'https://www.britannica.com/science/polymer' }

export const BASICS: BasicsSection[] = [
  {
    id: 'atoms',
    title: 'What is an atom?',
    body: {
      simple:
        'Everything is made of atoms: tiny balls far too small to see, about a ten-millionth of a millimetre across. Each one has a centre called the nucleus, with protons in it, and even smaller electrons around the outside. The number of protons decides what kind of atom it is: one proton makes hydrogen, six make carbon, seven make nitrogen and eight make oxygen.',
      deeper:
        'The nucleus holds positively charged protons and neutral neutrons; negatively charged electrons fill the space around it. A neutral atom has as many electrons as protons. The proton count is the atomic number, which is what sets an element apart. Your five filaments are built almost entirely from just four elements: carbon, hydrogen and oxygen in all of them, plus nitrogen in TPU, ABS and ASA.',
    },
    elements: ['C', 'H', 'O', 'N'],
    sources: [BRITANNICA_ATOM],
  },
  {
    id: 'bonds',
    title: 'What is a bond?',
    body: {
      simple:
        'Atoms join up by sharing electrons. One shared pair is a single bond, two pairs is a double bond, three is a triple bond. Each kind of atom likes to make a set number of bonds: hydrogen makes one, oxygen two, nitrogen three and carbon four.',
      deeper:
        'Sharing electron pairs is called covalent bonding. A double bond is shorter and stronger than a single bond, but its second pair is more exposed, which is why a carbon to carbon double bond is a spot where other chemicals, and sunlight, can attack.',
    },
    points: ['Water: oxygen bonds to two hydrogens.', 'Ethane: two carbons joined by a single bond.', 'Ethylene: two carbons joined by a double bond (two sticks).'],
    molecules: [
      { id: 'water', caption: 'Water: one oxygen, two hydrogens' },
      { id: 'ethane', caption: 'Ethane: a single carbon to carbon bond' },
      { id: 'ethylene', caption: 'Ethylene: a double bond' },
    ],
    sources: [BRITANNICA_COVALENT],
  },
  {
    id: 'carbon',
    title: 'Why carbon makes chains',
    body: {
      simple:
        'Carbon makes four bonds. Two of them can hold hands with the carbons on either side, and the other two are free for hydrogens or bigger side groups. So carbon can line up into chains thousands of atoms long, or close into rings. That is why every plastic has carbon at its heart.',
      deeper:
        'Carbon bonds strongly to itself, which no other element does as well, and it can form single, double and triple bonds. Rings like benzene (six carbons) turn up in PETG, ABS and ASA, where they make the chain stiffer.',
    },
    molecules: [
      { id: 'methane', caption: 'Methane: carbon using all four bonds' },
      { id: 'benzene', caption: 'Benzene: six carbons in a ring' },
    ],
    sources: [BRITANNICA_CARBON],
  },
  {
    id: 'polymers',
    title: 'What is a polymer?',
    body: {
      simple:
        'Poly means many and mer means part. A polymer is a huge molecule made by joining lots of small molecules, called monomers, end to end. A PLA chain is lactic acid molecules joined over and over, thousands of times.',
      deeper:
        'Monomers join in two main ways. In addition polymers (ABS, ASA) a carbon to carbon double bond opens up and links to the next monomer. In condensation polymers (PETG) two ends react and give off a small molecule, such as water. PLA factories usually pair lactic acids into a small ring called lactide first, then pop the rings open and link them into a chain. TPU joins two different building blocks with urethane links.',
    },
    molecules: [
      { id: 'lactic-acid', caption: 'Lactic acid: the monomer' },
      { id: 'pla-oligomer', caption: 'Three lactic acids joined: the start of a PLA chain' },
    ],
    sources: [BRITANNICA_POLYMER],
  },
]

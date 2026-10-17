import type { Material, SourceRef } from '../types/chem'

// Checked content for the five filaments. Numbers come from the Bambu Lab technical data
// sheets (Nathan and Josh print on a Bambu Lab P2S), cross-checked against Prusa's material
// guides, Prusament data sheets and encyclopedia entries. Where sources disagree the text gives
// both. Sources for every claim are listed per fact, and in each material's `sources`.
//
// Spool maths used in every `spool` caption: metres per kg = 1000 g / (density x area), with
// area = pi x (0.0875 cm)^2 = 0.02405 cm^2 for 1.75 mm strand, so metres = 415.75 / density.

// ---------------------------------------------------------------- sources

const src = {
  bambuPla: { label: 'Bambu Lab PLA Basic technical data sheet (V3.0)', url: 'https://store.bblcdn.com/s1/default/58b85d0f3db94878854a28fdb8a0006e/Bambu_PLA_Basic_Technical_Data_Sheet.pdf' },
  bambuPetgHf: { label: 'Bambu Lab PETG HF technical data sheet (V1.0)', url: 'https://store.bblcdn.com/3a230e260a3a47c2b0db0156e07eef91.pdf' },
  bambuPetgBasic: { label: 'Bambu Lab PETG Basic technical data sheet (V3.0)', url: 'https://store.bblcdn.com/s1/default/cb94589bf7994fdcbfa833badefae9cd/Bambu_PETG_Basic_Technical_Data_Sheet.pdf' },
  bambuTpu: { label: 'Bambu Lab TPU 95A HF technical data sheet (V1.0)', url: 'https://store.bblcdn.com/58df32731eab4c90a7dac9b12e13ba88.pdf' },
  bambuAbs: { label: 'Bambu Lab ABS technical data sheet (V3.0)', url: 'https://store.bblcdn.com/s7/default/23b4cf2b83d5470bb96d19970b5f3ae8/Bambu_ABS_Technical_Data_Sheet_V3.pdf' },
  bambuAsa: { label: 'Bambu Lab ASA technical data sheet (V3.0)', url: 'https://store.bblcdn.com/ad7b08230c164e72856cffbe06bb7dc9.pdf' },
  prusaPla: { label: 'Prusa Knowledge Base: PLA', url: 'https://help.prusa3d.com/article/pla_2062' },
  prusaPetg: { label: 'Prusa Knowledge Base: PETG', url: 'https://help.prusa3d.com/article/petg_2059' },
  prusaFlex: { label: 'Prusa Knowledge Base: Flexible materials', url: 'https://help.prusa3d.com/article/flexible-materials_2057' },
  prusaAbs: { label: 'Prusa Knowledge Base: ABS', url: 'https://help.prusa3d.com/article/abs_2058' },
  prusaAsa: { label: 'Prusa Knowledge Base: ASA', url: 'https://help.prusa3d.com/article/asa_1809' },
  prusaDrying: { label: 'Prusa Knowledge Base: Drying filament', url: 'https://help.prusa3d.com/article/drying-filament_332086' },
  prusamentPetg: { label: 'Prusament PETG technical data sheet', url: 'https://storage.googleapis.com/prusa3d-content-prod-14e8-wordpress-prusament-prod/2023/10/9f8d2165-tds_prusament-petg_n_en.pdf' },
  prusamentTpu: { label: 'Prusament TPU 95A technical data sheet', url: 'https://storage.googleapis.com/prusa3d-content-prod-14e8-wordpress-prusament-prod/2025/05/80316f6d-tds-prusament_tpu_95a_en-1.pdf' },
  prusamentAsa: { label: 'Prusament ASA technical data sheet (2024)', url: 'https://storage.googleapis.com/prusa3d-content-prod-14e8-wordpress-prusament-prod/2024/05/bc8551ef-tds_prusament-asa_2024_en.pdf' },
  wikiPla: { label: 'Wikipedia: Polylactic acid', url: 'https://en.wikipedia.org/wiki/Polylactic_acid' },
  wikiLactic: { label: 'Wikipedia: Lactic acid', url: 'https://en.wikipedia.org/wiki/Lactic_acid' },
  wikiPet: { label: 'Wikipedia: Polyethylene terephthalate', url: 'https://en.wikipedia.org/wiki/Polyethylene_terephthalate' },
  wikiPhotoOx: { label: 'Wikipedia: Photo-oxidation of polymers', url: 'https://en.wikipedia.org/wiki/Photo-oxidation_of_polymers' },
  wikiTpu: { label: 'Wikipedia: Thermoplastic polyurethane', url: 'https://en.wikipedia.org/wiki/Thermoplastic_polyurethane' },
  wikiPu: { label: 'Wikipedia: Polyurethane', url: 'https://en.wikipedia.org/wiki/Polyurethane' },
  wikiAbs: { label: 'Wikipedia: Acrylonitrile butadiene styrene', url: 'https://en.wikipedia.org/wiki/Acrylonitrile_butadiene_styrene' },
  wikiAsa: { label: 'Wikipedia: Acrylonitrile styrene acrylate', url: 'https://en.wikipedia.org/wiki/Acrylonitrile_styrene_acrylate' },
  wikiPb: { label: 'Wikipedia: Polybutadiene', url: 'https://en.wikipedia.org/wiki/Polybutadiene' },
  wikiDegradation: { label: 'Wikipedia: Polymer degradation', url: 'https://en.wikipedia.org/wiki/Polymer_degradation' },
  wikiToughening: { label: 'Wikipedia: Rubber toughening', url: 'https://en.wikipedia.org/wiki/Rubber_toughening' },
  wikiLego: { label: 'Wikipedia: Lego', url: 'https://en.wikipedia.org/wiki/Lego' },
  vanos2018: { label: 'Vanos et al. 2018, Temperature 5(3):276 (sun-exposed parked cars)', url: 'https://doi.org/10.1080/23328940.2018.1468205' },
  jin2020: { label: 'Jin et al. 2020, Materials 13:4991 (MDI, butanediol and PTMEG elastomers)', url: 'https://doi.org/10.3390/ma13214991' },
  liao2019: { label: 'Liao et al. 2019, Polymers 11:1487 (3D printed PLA from NatureWorks 4043D)', url: 'https://doi.org/10.3390/polym11091487' },
  prusamentPla: { label: 'Prusament PLA material page', url: 'https://prusament.com/materials/pla/' },
  sabatini2023: { label: 'Sabatini et al. 2023, Polymers 15:3267 (light-stability of ABS in LEGO bricks)', url: 'https://doi.org/10.3390/polym15153267' },
  pubchemLactic: { label: 'PubChem: L-Lactic acid (CID 107689)', url: 'https://pubchem.ncbi.nlm.nih.gov/compound/107689' },
  pubchemLactide: { label: 'PubChem: L-Lactide (CID 107983)', url: 'https://pubchem.ncbi.nlm.nih.gov/compound/107983' },
  pubchemTpa: { label: 'PubChem: Terephthalic acid (CID 7489)', url: 'https://pubchem.ncbi.nlm.nih.gov/compound/7489' },
  pubchemEg: { label: 'PubChem: Ethylene glycol (CID 174)', url: 'https://pubchem.ncbi.nlm.nih.gov/compound/174' },
  pubchemChdm: { label: 'PubChem: 1,4-Cyclohexanedimethanol (CID 7735)', url: 'https://pubchem.ncbi.nlm.nih.gov/compound/7735' },
  pubchemMdi: { label: 'PubChem: MDI (CID 7570)', url: 'https://pubchem.ncbi.nlm.nih.gov/compound/7570' },
  pubchemBdo: { label: 'PubChem: 1,4-Butanediol (CID 8064)', url: 'https://pubchem.ncbi.nlm.nih.gov/compound/8064' },
  pubchemAn: { label: 'PubChem: Acrylonitrile (CID 7855)', url: 'https://pubchem.ncbi.nlm.nih.gov/compound/7855' },
  pubchemBd: { label: 'PubChem: 1,3-Butadiene (CID 7845)', url: 'https://pubchem.ncbi.nlm.nih.gov/compound/7845' },
  pubchemStyrene: { label: 'PubChem: Styrene (CID 7501)', url: 'https://pubchem.ncbi.nlm.nih.gov/compound/7501' },
  pubchemBa: { label: 'PubChem: Butyl acrylate (CID 8846)', url: 'https://pubchem.ncbi.nlm.nih.gov/compound/8846' },
} satisfies Record<string, SourceRef>

// ---------------------------------------------------------------- materials

export const materials: Record<Material['id'], Material> = {
  // ============================================================== PLA
  pla: {
    id: 'pla',
    short: 'PLA',
    fullName: 'Polylactic acid',
    nickname: 'The plant-based one',
    accent: '#4ADE80',
    densityGcm3: 1.24,
    madeFrom: {
      simple: 'Sugar from plants such as corn or sugarcane. Bacteria ferment the sugar into lactic acid, then a factory joins lactic acids into very long chains.',
      deeper: 'Plant starch (corn, cassava, sugarcane or sugar beet pulp) is fermented to L-lactic acid. Pairs of lactic acids are closed into a ring called lactide, and a tin catalyst opens the rings and strings them together (ring-opening polymerisation). The result is a polyester, (C3H4O2)n.',
    },
    keyIdea: {
      simple: 'Stiff and easy to print, but its chains start to slide at about 60°C, so it sags in a hot car.',
      deeper: 'The glass transition is 60°C (Bambu, by DSC; 60 to 65°C in the literature). Above it the tangled chains between the small crystals can move, so a loaded part creeps and bends. Bambu measures a heat deflection temperature of 57°C at 0.45 MPa.',
    },
    monomers: ['lactic-acid', 'lactide'],
    oligomer: 'pla-oligomer',
    repeatUnitGroup: 'repeat',
    morphology: 'semicrystalline',
    zoom: {
      spool: {
        simple: 'A 1 kg spool of PLA. Unwound, it is about 335 metres of 1.75 mm strand.',
        deeper: 'Length = mass / (density x cross-section). 1000 g / (1.24 g/cm³ x 0.02405 cm²) is about 33,500 cm, or 335 m. Bambu PLA Basic is 1.24 g/cm³ (ISO 1183); encyclopedia figures for PLA run from 1.21 to 1.43 g/cm³ depending on how crystalline it is.',
      },
      strand: {
        simple: 'One strand, 1.75 mm across. It looks solid and smooth, but it is made of a huge number of long molecules packed together.',
        deeper: 'Bambu PLA Basic soaks up at most 0.43% of its weight in water (25°C, 55% humidity), which is why the spool comes sealed with desiccant and Bambu recommends storing it below 20% humidity.',
      },
      tangle: {
        simple: 'Inside, the chains are tangled like cooked spaghetti. In a few patches they fold neatly side by side: those patches are tiny crystals.',
        deeper: 'PLA is semicrystalline: ordered regions sit in an amorphous tangle. How much can crystallise depends mostly on the ratio of L to D lactic acid units. Annealing raises the crystallinity; Bambu suggests 50 to 60°C for 6 to 12 hours for PLA Basic, and warns some prints may deform.',
      },
      chain: {
        simple: 'Pull out one chain: it is the same small piece, from one lactic acid, repeated over and over.',
        deeper: 'Each repeat unit is -O-CH(CH3)-C(=O)-, C3H4O2, 72 g/mol. The links between units are ester bonds, so PLA is a polyester, like the PET in drink bottles.',
      },
      molecule: {
        simple: 'Four lactic acid units joined in a row. The outlined part is one repeat unit. Tap the ester link to see what holds them together.',
        deeper: 'Every chiral carbon here is (S), the L form, as in poly(L-lactide) (PLLA) made from L-lactide. Polymerising a 50:50 mix of L and D lactide gives an amorphous PLA instead.',
      },
      atom: {
        simple: 'PLA has only three kinds of atom: carbon (grey), oxygen (red) and hydrogen (white). Here is one of its atoms, up close.',
        deeper: 'With no nitrogen or chlorine, burning PLA gives only water and carbon oxides (Bambu data sheet), and it cannot form dioxins or hydrochloric acid when incinerated.',
      },
    },
    traits: [
      {
        id: 'strength',
        score: 2,
        why: {
          simple: 'Strong when you pull it, but brittle: a sharp knock can snap it.',
          deeper: 'Bambu PLA Basic: tensile strength 35 MPa, but unnotched impact strength 26.6 kJ/m² and notched 7.9 kJ/m², the lowest impact figures of these five filaments.',
        },
      },
      {
        id: 'flexibility',
        score: 1,
        why: {
          simple: 'The stiffest of the five: it barely bends before it breaks.',
          deeper: 'Bending modulus 2750 MPa in the print plane (Bambu), against 2050 for PETG HF and 1880 for ABS.',
        },
      },
      {
        id: 'heat',
        score: 1,
        why: {
          simple: 'Starts to go soft at about 60°C. A car dashboard in the sun gets hotter than that.',
          deeper: 'Glass transition 60°C, heat deflection 57°C at 0.45 MPa (Bambu). Prusa says PLA gets soft and deforms above 60°C. In an Arizona study, dashboards in cars parked in the sun averaged 69°C after about an hour.',
        },
      },
      {
        id: 'uv',
        score: 2,
        why: {
          simple: 'Fades and weakens if it sits in the sun for a long time.',
          deeper: 'Prusa lists low UV resistance as a con of PLA and says it degrades under UV light; it recommends other materials for outdoor use.',
        },
      },
      {
        id: 'easy',
        score: 5,
        why: {
          simple: 'The easiest to print: low temperatures, hardly any warping, no enclosure.',
          deeper: 'Bambu: nozzle 190 to 230°C, bed 35 to 45°C, fan on. Prusa calls PLA easy to print and suitable for beginners, with good detail and low warping.',
        },
      },
      {
        id: 'moisture',
        score: 4,
        why: {
          simple: 'Stays fairly dry: it takes in only a little water from the air.',
          deeper: 'Saturated water absorption only 0.43% at 25°C and 55% humidity (Bambu). Bambu still suggests sealed storage below 20% humidity, and drying at 50°C for 8 hours if needed.',
        },
      },
    ],
    temps: { tgC: 60, meltC: 160, nozzleC: [190, 230], bedC: [35, 45], hdtC: 57 },
    print: {
      enclosure: 'no',
      tips: [
        {
          simple: 'Leave the lid or door open and the fan on: PLA likes to cool quickly.',
          deeper: 'Bambu PLA Basic: cooling fan on, chamber 25 to 45°C. Prusament lists PLA as not needing an enclosure.',
        },
        {
          simple: 'A thin layer of glue stick on the plate helps the first layer stick.',
          deeper: 'Bambu: Cool Plate, High Temperature Plate or Textured PEI Plate, bed 35 to 45°C, with glue. Prusa recommends a 60°C bed.',
        },
        {
          simple: 'If it starts to pop or string, dry it: 50°C for 8 hours in a proper filament dryer or drying oven, never the kitchen oven.',
          deeper: 'Bambu: blast drying oven 50°C for 8 hours, or 60 to 70°C for 12 hours on an X1 heatbed, and it warns a kitchen or microwave oven can damage filament. Prusa dries its PLA at 45°C for 6 hours.',
        },
        {
          simple: 'Need a PLA part to cope with more heat? Baking it gently (annealing) helps, but it can warp.',
          deeper: 'Bambu suggests annealing PLA Basic prints at 50 to 60°C for 6 to 12 hours; results depend on size, shape and infill.',
        },
      ],
      dryC: 50,
    },
    sim: { shrink: 1, thirst: 2 },
    facts: [
      {
        text: {
          simple: 'PLA starts life as plants. Its building block, lactic acid, is made by bacteria eating sugar, the same kind of bacteria that make yoghurt.',
          deeper: 'The monomer is typically made from fermented plant starch such as corn, cassava, sugarcane or sugar beet pulp. Industrial lactic acid fermentation uses lactic acid bacteria, the same group used for fermented milk products.',
        },
        sources: [src.wikiPla, src.wikiLactic],
      },
      {
        text: {
          simple: 'Lactic acid comes in a left-handed and a right-handed version, like a pair of gloves. Printing PLA is almost all the left-handed kind, and that sameness is what lets its chains line up into crystals.',
          deeper: 'Lactic acid is chiral. Poly-L-lactide (PLLA) comes from L,L-lactide; a racemic L and D mix gives amorphous PDLLA. The ratio of D to L units largely controls the crystallinity. NatureWorks 4043D, a common filament grade, has a D-isomer content of about 2%.',
        },
        sources: [src.wikiPla, src.liao2019, src.pubchemLactide],
      },
      {
        text: {
          simple: 'A PLA print left on a car dashboard on a sunny day can sag: dashboards get hotter than the 60°C where PLA goes soft.',
          deeper: 'In Arizona tests, sun-exposed dashboards averaged 68.9°C after about an hour and one reached 85°C. Bambu PLA Basic has a glass transition of 60°C and a heat deflection temperature of 57°C at 0.45 MPa.',
        },
        sources: [src.vanos2018, src.bambuPla],
      },
      {
        text: {
          simple: 'PLA is called compostable, but your garden compost is too cool. It needs an industrial composter, and even there only about half breaks down in two months.',
          deeper: 'Under industrial composting (58°C) PLA can partly decompose, about half into water and carbon dioxide in 60 days, after which the rest goes much more slowly. Breakdown starts with hydrolysis of the ester links. Prusa warns not to put PLA waste in a garden compost.',
        },
        sources: [src.wikiPla, src.prusaPla],
      },
      {
        text: {
          simple: 'Doctors use PLA for screws and stitches that dissolve inside the body, because it slowly breaks back down into lactic acid.',
          deeper: 'PLA degrades into lactic acid, so it is used for medical implants such as anchors, screws, plates, pins, rods and mesh, and for surgical sutures.',
        },
        sources: [src.wikiPla],
      },
      {
        text: {
          simple: 'Burning PLA gives only water and carbon dioxide (or carbon monoxide), because it has no nitrogen or chlorine in it.',
          deeper: 'Bambu lists the combustion products of PLA Basic as water and carbon oxides. With no chlorine, PLA incineration produces no dioxins or hydrochloric acid.',
        },
        sources: [src.bambuPla, src.wikiPla],
      },
    ],
    sources: [src.bambuPla, src.prusaPla, src.prusamentPla, src.prusaDrying, src.wikiPla, src.wikiLactic, src.liao2019, src.vanos2018, src.pubchemLactic, src.pubchemLactide],
  },

  // ============================================================== PETG
  petg: {
    id: 'petg',
    short: 'PETG',
    fullName: 'Polyethylene terephthalate glycol-modified',
    nickname: 'The drink-bottle cousin',
    accent: '#22D3EE',
    densityGcm3: 1.28,
    madeFrom: {
      simple: 'The same two building blocks as plastic drink bottles (terephthalic acid and ethylene glycol), plus a bulkier one called CHDM that takes the place of some of the ethylene glycol.',
      deeper: 'PET is a polyester of terephthalic acid and ethylene glycol. In PETG part of the ethylene glycol is replaced by 1,4-cyclohexanedimethanol (CHDM), giving a copolyester.',
    },
    keyIdea: {
      simple: 'The bulky CHDM ring stops the chains lining up into crystals, so PETG stays clear and tough, and it copes with a bit more heat than PLA.',
      deeper: 'CHDM is six carbons bigger than the ethylene glycol it replaces, so it does not fit the PET crystal: crystallisation is disrupted and PETG is a clear amorphous thermoplastic. With no crystals to melt, it softens over a range above its glass transition (66°C for Bambu PETG HF, 69°C for PETG Basic).',
    },
    monomers: ['terephthalic-acid', 'ethylene-glycol', 'chdm'],
    oligomer: 'petg-oligomer',
    repeatUnitGroup: 'repeat',
    morphology: 'amorphous',
    zoom: {
      spool: {
        simple: 'A 1 kg spool of PETG is about 325 metres of 1.75 mm strand, a little shorter than PLA because PETG is a little heavier for its size.',
        deeper: 'Bambu PETG HF is 1.28 g/cm³, which gives about 325 m per kg. PETG Basic (1.25 g/cm³) gives about 333 m and Prusament PETG (1.27 g/cm³) about 327 m.',
      },
      strand: {
        simple: 'One strand, 1.75 mm across. Unlike PLA, nothing inside it is crystal: it is glass-like all the way through.',
        deeper: 'Bambu PETG HF soaks up at most 0.40% water (25°C, 55% humidity). Prusa measured just 0.10% for Prusament PETG after 7 days at 22% humidity: how much it takes in depends on how damp the air is.',
      },
      tangle: {
        simple: 'A pure random tangle, with no neat crystal patches anywhere. The bulky CHDM rings stick out and stop the chains lining up.',
        deeper: 'Amorphous: below the glass transition the chains are frozen in random coils; above it they can slide past each other. Plain PET can crystallise, but the CHDM units interfere with crystallisation.',
      },
      chain: {
        simple: 'One chain: mostly PET units (glycol plus acid) in a row, with a bulky CHDM unit dropped in here and there.',
        deeper: 'The PET repeat unit is -O-CH2-CH2-O-C(=O)-C6H4-C(=O)-, C10H8O4, 192 g/mol. In PETG some units carry CHDM in place of the ethylene glycol.',
      },
      molecule: {
        simple: 'Two PET units and one CHDM unit. The outlined part is one PET unit. Tap the CHDM ring to see the bulky bit that makes PET into PETG.',
        deeper: 'Ester links join every acid to every glycol. The flat benzene ring in each unit makes the chain stiff; the puckered cyclohexane ring of CHDM is what spoils the packing.',
      },
      atom: {
        simple: 'Like PLA, PETG has only carbon, oxygen and hydrogen. Here is one of its atoms, up close.',
        deeper: 'Bambu lists the combustion products of PETG HF as water and carbon oxides, since there is no nitrogen in it.',
      },
    },
    traits: [
      {
        id: 'strength',
        score: 3,
        why: {
          simple: 'Tougher than PLA: it takes a harder knock before it breaks.',
          deeper: 'Unnotched impact strength 31.5 kJ/m² for PETG HF and 34.2 for PETG Basic, against 26.6 for PLA Basic (Bambu). Tensile strength 34 MPa (HF) to 51 MPa (Basic).',
        },
      },
      {
        id: 'flexibility',
        score: 2,
        why: {
          simple: 'Stiff, but with a bit more give than PLA.',
          deeper: 'Bending modulus 2050 MPa (PETG HF) and 1950 MPa (Basic), against 2750 MPa for PLA Basic (Bambu).',
        },
      },
      {
        id: 'heat',
        score: 2,
        why: {
          simple: 'Copes with a bit more heat than PLA: it softens at about 66 to 69°C.',
          deeper: 'Bambu heat deflection at 0.45 MPa: 69°C (HF) and 71°C (Basic); Prusament PETG 68°C. Prusa says PETG parts suit indoor and most outdoor use below 80°C.',
        },
      },
      {
        id: 'uv',
        score: 3,
        why: {
          simple: 'OK outdoors, better than PLA.',
          deeper: 'Bambu says PETG Basic has enhanced resistance to water, UV and temperature for outdoor accessories; Prusa says PETG suits most exterior use. PET does absorb the near-ultraviolet in sunlight (from 360 nm), so it still ages slowly outside.',
        },
      },
      {
        id: 'easy',
        score: 4,
        why: {
          simple: 'Easy to print, but stringy: it can leave fine hairs between parts.',
          deeper: 'Prusa calls PETG one of the most easily printable materials but prone to stringing. Bambu tuned PETG HF to cut oozing and clumping.',
        },
      },
      {
        id: 'moisture',
        score: 4,
        why: {
          simple: 'Stays about as dry as PLA. But the little water it does take in makes it print badly, so keep the spool sealed.',
          deeper: 'Saturated absorption only 0.40% (HF) and 0.45% (Basic) against 0.43% for PLA (Bambu). PET is still hygroscopic: water in the hot melt cuts ester links (hydrolysis), shortening the chains and making the plastic brittle.',
        },
      },
    ],
    temps: { tgC: 66, nozzleC: [230, 260], bedC: [65, 75], hdtC: 69 },
    print: {
      enclosure: 'no',
      tips: [
        {
          simple: 'Strings or pops? Dry the spool: 65°C for 8 hours.',
          deeper: 'Bambu PETG HF and Basic: blast drying oven 65°C for 8 hours. Prusa dries its PETG at 55°C for 6 hours.',
        },
        {
          simple: 'Use glue on the plate. PETG can stick to smooth PEI so hard that it pulls bits of the surface off.',
          deeper: 'Bambu recommends glue with PETG; Prusa warns that printing PETG on a smooth PEI sheet might damage it.',
        },
        {
          simple: 'Go easy on the fan: PETG wants some cooling, not full blast.',
          deeper: 'Bambu: cooling fan 0 to 60%, chamber 35 to 50°C, bed 65 to 75°C, nozzle 230 to 260°C.',
        },
      ],
      dryC: 65,
    },
    sim: { shrink: 1, thirst: 2 },
    facts: [
      {
        text: {
          simple: 'The G in PETG stands for glycol. A bigger glycol called CHDM is swapped in for some of the ordinary one, and it stops the chains forming crystals.',
          deeper: 'Adding 1,4-cyclohexanedimethanol (CHDM) in place of some ethylene glycol interferes with crystallisation and lowers the melting temperature; the result, PET glycol-modified, is a clear amorphous thermoplastic.',
        },
        sources: [src.wikiPet, src.pubchemChdm],
      },
      {
        text: {
          simple: 'PETG is a close cousin of PET, the plastic in soft drink bottles.',
          deeper: 'PET bottles are widely used for still and sparkling soft drinks. For oxygen-sensitive drinks such as beer, an extra barrier layer is sandwiched in.',
        },
        sources: [src.wikiPet],
      },
      {
        text: {
          simple: 'PET was invented in Manchester, England, during the Second World War.',
          deeper: 'PET was patented in 1941 by John Rex Whinfield, James Tennant Dickson and their employer, the Calico Printers’ Association of Manchester.',
        },
        sources: [src.wikiPet],
      },
      {
        text: {
          simple: 'Prusa prints parts of its own 3D printers in PETG.',
          deeper: 'Prusa cites PETG’s toughness, temperature resistance and low warping, and notes its printers’ parts are made of it.',
        },
        sources: [src.prusaPetg],
      },
      {
        text: {
          simple: 'Water is PETG’s enemy at the nozzle. In the hot melt, water molecules snip the chains, which is why wet PETG prints weak and stringy.',
          deeper: 'PET is hygroscopic. If the moisture level is too high during processing, hydrolysis reduces the molecular weight by chain scission, resulting in brittleness.',
        },
        sources: [src.wikiPet, src.bambuPetgHf],
      },
      {
        text: {
          simple: 'PETG barely shrinks or warps as it cools, so it is good for big prints.',
          deeper: 'Prusa: PETG does not shrink or warp (very little thermal expansion), so it suits large models.',
        },
        sources: [src.prusaPetg],
      },
    ],
    sources: [src.bambuPetgHf, src.bambuPetgBasic, src.prusaPetg, src.prusamentPetg, src.prusaDrying, src.wikiPet, src.wikiPhotoOx, src.pubchemTpa, src.pubchemEg, src.pubchemChdm],
  },

  // ============================================================== TPU
  tpu: {
    id: 'tpu',
    short: 'TPU',
    fullName: 'Thermoplastic polyurethane',
    nickname: 'The rubbery one',
    accent: '#F472B6',
    densityGcm3: 1.22,
    madeFrom: {
      simple: 'Three kinds of building block. MDI and a short one called butanediol join into hard bits; a long floppy one (a polyol) makes the soft, springy bits.',
      deeper: 'Diisocyanates such as MDI react with short diols (chain extenders such as 1,4-butanediol) to make the hard segments, and with long-chain diols (polyether polyols such as PTMEG, or polyester polyols) to make the soft segments. Bambu does not say which polyol its TPU 95A HF uses; MDI, butanediol and PTMEG are shown here as a common example.',
    },
    keyIdea: {
      simple: 'The hard bits clump into tiny islands that hold the chains together, and the soft bits between them coil like springs. Stretch it and it snaps back; heat it enough and the islands let go so it can be printed.',
      deeper: 'A segmented block copolymer. Polar hard segments aggregate into crystalline or pseudo-crystalline domains that act as physical cross-links in a soft matrix. Unlike vulcanised rubber those cross-links melt (183°C by DSC for Bambu TPU 95A HF), which is what makes it a thermoplastic.',
    },
    monomers: ['mdi', 'butanediol', 'tpu-soft'],
    oligomer: 'tpu-hard',
    repeatUnitGroup: 'repeat',
    morphology: 'segmented',
    zoom: {
      spool: {
        simple: 'A 1 kg spool of TPU is about 340 metres of 1.75 mm strand. Bend the strand and it flops like a bootlace.',
        deeper: 'Bambu TPU 95A HF is 1.22 g/cm³, giving about 341 m per kg; Prusament TPU 95A is 1.25 g/cm³ (about 333 m). 95A is a Shore A hardness rating; Prusa measured its own TPU 95A at 92A.',
      },
      strand: {
        simple: 'A bendy strand, 1.75 mm across. A printed piece can stretch to more than seven times its length before it breaks.',
        deeper: 'Bambu TPU 95A HF: elongation at break above 650% in the print plane and above 480% across layers; Young’s modulus 9.8 MPa, against 2580 MPa for PLA Basic.',
      },
      tangle: {
        simple: 'Inside, the hard parts of the chains clump together into tiny islands. The soft parts loop between the islands like springs.',
        deeper: 'Microphase separation: the polar urethane hard segments pack into ordered domains, while the soft segments stay amorphous and mobile because their glass transition is far below room temperature (about -55 to -46°C for MDI, butanediol and PTMEG elastomers).',
      },
      chain: {
        simple: 'This chain is not the same all the way along: short hard bits alternate with long soft bits, like beads on a bit of elastic.',
        deeper: 'Hard segment: MDI linked by butanediol. Soft segment: a long polyether or polyester polyol. Changing the ratio, structure and length of these blocks gives a huge range of TPUs, from soft to hard.',
      },
      molecule: {
        simple: 'A piece of hard segment: two MDI molecules held together by butanediol. The outlined part is one repeat unit. Tap a urethane link: these are what grip the next chain.',
        deeper: 'Each urethane N-H can hydrogen-bond to a C=O on a neighbouring hard segment. Those hydrogen bonds hold the hard islands together and, when the material is stretched, add to its strength and tear resistance.',
      },
      atom: {
        simple: 'TPU adds a fourth kind of atom: nitrogen (blue), in every urethane link. Here is one of its atoms, up close.',
        deeper: 'The nitrogen is why Bambu lists nitrogen oxides among TPU’s combustion products, alongside water and carbon oxides.',
      },
    },
    traits: [
      {
        id: 'strength',
        score: 4,
        why: {
          simple: 'Very hard to break: it bends out of the way instead of snapping. But it is too soft to hold a heavy load.',
          deeper: 'Unnotched impact strength 123.2 kJ/m², over four times PLA Basic’s 26.6 (Bambu). Tensile strength 27 MPa.',
        },
      },
      {
        id: 'flexibility',
        score: 5,
        why: {
          simple: 'Bends, squashes and stretches, then springs back.',
          deeper: 'Elongation at break above 650% and Young’s modulus 9.8 MPa (Bambu TPU 95A HF).',
        },
      },
      {
        id: 'heat',
        score: 2,
        why: {
          simple: 'Already soft at room temperature, and when it gets warm it stops springing back fully.',
          deeper: 'Bambu gives no heat deflection figure for TPU 95A HF. Prusament TPU 95A loses springiness as it warms: its compression set rises from 34% at 23°C to 83% at 85°C. The hard domains only melt near 183°C (Bambu DSC).',
        },
      },
      {
        id: 'uv',
        score: 2,
        why: {
          simple: 'Can go yellow in sunlight.',
          deeper: 'Polyurethanes made with aromatic isocyanates such as MDI tend to darken in light. Bambu’s data sheet gives no UV rating for TPU 95A HF.',
        },
      },
      {
        id: 'easy',
        score: 2,
        why: {
          simple: 'Fiddly: print slowly and keep it dry.',
          deeper: 'Prusa rates flexible filaments as hard to print: slow, prone to stringing, poor at bridges and overhangs. Bambu’s HF version is tuned to print faster, up to 200 mm/s.',
        },
      },
      {
        id: 'moisture',
        score: 1,
        why: {
          simple: 'The worst of the five at staying dry: it soaks up about two and a half times as much water as PLA.',
          deeper: 'Saturated water absorption 1.08% against 0.43% for PLA Basic (Bambu, 25°C, 55% humidity), the highest here. Prusa: flexible filaments absorb moisture and are hard to print when wet.',
        },
      },
    ],
    temps: { tgC: -50, meltC: 183, nozzleC: [220, 240], bedC: [30, 35] },
    print: {
      enclosure: 'no',
      tips: [
        {
          simple: 'Dry it before you print: 70°C for 8 hours.',
          deeper: 'Bambu TPU 95A HF: blast drying oven 70°C for 8 hours, or 80 to 90°C for 12 hours on an X1 heatbed. Prusa dries its TPU at 60°C for 4 to 6 hours.',
        },
        {
          simple: 'Keep the bed cool and use glue.',
          deeper: 'Bambu: bed 30 to 35°C with glue, nozzle 220 to 240°C, fan on, under 200 mm/s.',
        },
        {
          simple: 'Do not bake TPU prints to "improve" them: they can bend out of shape.',
          deeper: 'Bambu does not recommend annealing TPU prints; anything but a very simple shape can deform noticeably.',
        },
      ],
      dryC: 70,
    },
    sim: { shrink: 1, thirst: 5, hardSegments: { molecule: 'tpu-hard' } },
    facts: [
      {
        text: {
          simple: 'Polyurethanes were invented in Germany in 1937.',
          deeper: 'Otto Bayer and his co-workers at IG Farben in Leverkusen first made polyurethanes in 1937.',
        },
        sources: [src.wikiPu],
      },
      {
        text: {
          simple: 'TPU holds itself together with "islands" that melt when heated, so it can be printed, then sets again as it cools. Car tyre rubber cannot do that.',
          deeper: 'The crystalline or pseudo-crystalline hard domains act as physical cross-links, which give TPU its elasticity, while the flexible chains give it stretch. Because they are physical rather than chemical cross-links, they let go in the melt and re-form on cooling.',
        },
        sources: [src.wikiTpu, src.bambuTpu],
      },
      {
        text: {
          simple: 'TPU turns up in shoe soles, caster wheels, fire hoses and inflatable rafts.',
          deeper: 'Listed TPU applications include footwear, caster wheels, power tools, sporting goods, medical devices, drive belts, inflatable rafts and fire hoses.',
        },
        sources: [src.wikiTpu],
      },
      {
        text: {
          simple: 'Its soft parts only freeze stiff far below zero, so TPU stays bendy even in the cold.',
          deeper: 'MDI, butanediol and PTMEG elastomers have glass transitions around -55 to -46°C. Prusa notes flexible filaments stay flexible in cold environments.',
        },
        sources: [src.jin2020, src.prusaFlex],
      },
      {
        text: {
          simple: 'There are two main families of TPU. One kind shrugs off water much better than the other.',
          deeper: 'Polyester-based TPUs (from adipic acid esters) rate poor for hydrolysis resistance; polyether-based TPUs (from tetrahydrofuran) rate excellent.',
        },
        sources: [src.wikiTpu],
      },
      {
        text: {
          simple: 'A strip of printed TPU can stretch to over seven times its length before it snaps.',
          deeper: 'Bambu measures elongation at break above 650% in the print plane for TPU 95A HF.',
        },
        sources: [src.bambuTpu],
      },
    ],
    sources: [src.bambuTpu, src.prusaFlex, src.prusamentTpu, src.prusaDrying, src.wikiTpu, src.wikiPu, src.jin2020, src.pubchemMdi, src.pubchemBdo],
  },

  // ============================================================== ABS
  abs: {
    id: 'abs',
    short: 'ABS',
    fullName: 'Acrylonitrile butadiene styrene',
    nickname: 'The Lego one',
    accent: '#FBBF24',
    densityGcm3: 1.05,
    madeFrom: {
      simple: 'Three building blocks: acrylonitrile, butadiene and styrene. Styrene and acrylonitrile make a hard, glassy plastic; butadiene makes tiny rubber blobs inside it.',
      deeper: 'A terpolymer made by polymerising styrene and acrylonitrile in the presence of polybutadiene. Typical proportions: 40 to 60% styrene, 15 to 35% acrylonitrile and 5 to 30% butadiene. Styrene-acrylonitrile (SAN) chains grow on the rubber, and fine rubber particles end up spread through the rigid SAN matrix.',
    },
    keyIdea: {
      simple: 'Rubber blobs soak up knocks, so ABS is tough and copes with heat. But sunlight attacks the double bonds in that rubber and makes it yellow and brittle.',
      deeper: 'Rubber toughening: elastomer particles in a glassy matrix let it absorb energy without fracturing. Every polybutadiene unit keeps a C=C double bond, and that rubber phase is where photo-oxidation starts.',
    },
    monomers: ['acrylonitrile', 'butadiene', 'styrene'],
    oligomer: 'abs-oligomer',
    repeatUnitGroup: 'repeat',
    morphology: 'rubber-toughened',
    zoom: {
      spool: {
        simple: 'A 1 kg spool of ABS is about 395 metres of 1.75 mm strand. ABS and ASA are the lightest of the five, so you get the most strand per kilogram.',
        deeper: 'Bambu ABS is 1.05 g/cm³, about 396 m per kg. General-purpose ABS is quoted at 1.06 to 1.08 g/cm³, which would give about 385 to 392 m.',
      },
      strand: {
        simple: 'One strand, 1.75 mm across. It looks smooth, but tiny rubber blobs are hidden inside.',
        deeper: 'The rubber and the glassy matrix bend light differently (different refractive indices), which is why most ABS is opaque rather than clear.',
      },
      tangle: {
        simple: 'A hard, glassy tangle of chains with soft rubber blobs scattered through it, like choc chips in a biscuit.',
        deeper: 'Polybutadiene particles in a SAN matrix. The particles concentrate stress so the matrix crazes or yields in many small places around them, soaking up energy that would otherwise drive one crack straight through.',
      },
      chain: {
        simple: 'The chains are a mix: mostly styrene units with acrylonitrile here and there, and some of them grow out from a rubber chain.',
        deeper: 'SAN is a copolymer of styrene and acrylonitrile. Wikipedia describes ABS as a long chain of polybutadiene crisscrossed with shorter chains of poly(styrene-co-acrylonitrile).',
      },
      molecule: {
        simple: 'A glassy branch (styrene, acrylonitrile, styrene) growing off a rubber chain. The outlined part is one styrene unit. Tap the C=C double bond: that is the weak spot sunlight attacks.',
        deeper: 'The rubber backbone is -CH2-CH=CH-CH2- (cis-1,4 here). Nitrile groups on neighbouring chains are polar and attract each other, which is why ABS is stronger than plain polystyrene.',
      },
      atom: {
        simple: 'Carbon and hydrogen, plus one nitrogen (blue) in every acrylonitrile. There is no oxygen in the plastic itself. Here is one of its atoms, up close.',
        deeper: 'Formula (C8H8)x(C4H6)y(C3H3N)z. The nitrogen is why Bambu lists nitrogen oxides among ABS’s combustion products.',
      },
    },
    traits: [
      {
        id: 'strength',
        score: 4,
        why: {
          simple: 'Tough: the rubber blobs soak up knocks.',
          deeper: 'Bambu ABS: unnotched impact 39.3 kJ/m² and notched 21.5 kJ/m², nearly three times PLA Basic’s notched 7.9.',
        },
      },
      {
        id: 'flexibility',
        score: 2,
        why: {
          simple: 'Stiff, with a little give.',
          deeper: 'Bending modulus 1880 MPa against 2750 MPa for PLA Basic (Bambu).',
        },
      },
      {
        id: 'heat',
        score: 4,
        why: {
          simple: 'Stays firm up to about 85 to 90°C, much hotter than PLA.',
          deeper: 'Bambu ABS: heat deflection 87°C at 0.45 MPa, Vicat softening 94°C. The glass transition of ABS is about 105°C. Most ABS is used between -20 and 80°C.',
        },
      },
      {
        id: 'uv',
        score: 1,
        why: {
          simple: 'Sunlight turns it yellow and brittle.',
          deeper: 'UV and oxygen attack the polybutadiene first: its C=C content drops and carbonyl groups form there before the SAN is touched (Sabatini et al. 2023). Prusa says ABS used outdoors turns yellowish and more brittle. Bambu’s ABS sheet claims UV resistance; the chemistry and Prusa disagree, so ASA is the outdoor pick.',
        },
      },
      {
        id: 'easy',
        score: 2,
        why: {
          simple: 'Warps and smells: it needs a closed, warm printer.',
          deeper: 'Prusa lists significant warping, the need for an enclosure and potentially dangerous styrene fumes. Bambu recommends a chamber at 45 to 60°C.',
        },
      },
      {
        id: 'moisture',
        score: 3,
        why: {
          simple: 'Stays fairly dry, but takes in a bit more water than PLA.',
          deeper: 'Saturated water absorption 0.65% against 0.43% for PLA Basic (Bambu, 25°C, 55% humidity).',
        },
      },
    ],
    temps: { tgC: 105, nozzleC: [240, 270], bedC: [80, 100], hdtC: 87 },
    print: {
      enclosure: 'yes',
      tips: [
        {
          simple: 'Close the door and let the inside of the printer warm up. If the print cools too fast, the corners curl up off the plate.',
          deeper: 'ABS shrinks as it cools (Prusa: about 1 to 2%) and warps; printing in an enclosure on a heated bed reduces it. Bambu: chamber 45 to 60°C, fan 0 to 80%.',
        },
        {
          simple: 'Print in a room with fresh air: hot ABS gives off fumes.',
          deeper: 'Prusa warns of potentially dangerous styrene fumes, and researchers have measured ultrafine particles from desktop ABS printing.',
        },
        {
          simple: 'Glue on the plate, bed at 80 to 100°C, and a brim around big parts.',
          deeper: 'Bambu: Engineering, High Temperature or Textured PEI plate with glue, bed 80 to 100°C, nozzle 240 to 270°C. A brim or raft helps hold the first layer down.',
        },
        {
          simple: 'Acetone vapour can smooth ABS to a glossy finish (an adult job, with good ventilation).',
          deeper: 'Prusa: ABS can be smoothed with acetone vapours to get a glossy surface, and glued with acetone.',
        },
      ],
      dryC: 80,
    },
    sim: { shrink: 5, thirst: 3, uvWeakSpot: { molecule: 'abs-rubber', group: 'double-bond' }, rubberBlobs: { molecule: 'abs-rubber' } },
    facts: [
      {
        text: {
          simple: 'Lego bricks have been made of ABS since 1963.',
          deeper: 'Since 1963, Lego pieces have been manufactured from ABS.',
        },
        sources: [src.wikiLego],
      },
      {
        text: {
          simple: 'Scientists shone strong light on Lego bricks to see how ABS ages. The rubber part was damaged first.',
          deeper: 'In light-ageing tests on LEGO bricks, oxidation started in the polybutadiene portion (its trans C=C signal disappeared within 36 hours) and only later reached the SAN.',
        },
        sources: [src.sabatini2023],
      },
      {
        text: {
          simple: 'The nitrogen bits on neighbouring chains pull on each other, which makes ABS stronger than plain polystyrene.',
          deeper: 'The nitrile groups from neighbouring chains, being polar, attract each other and bind the chains together. Acrylonitrile also adds chemical resistance, hardness and a higher heat deflection temperature.',
        },
        sources: [src.wikiAbs],
      },
      {
        text: {
          simple: 'Old white ABS that has gone yellow can sometimes be whitened again. Hobbyists call it "Retrobright".',
          deeper: 'UV light or excess heat causes photo-oxidation that breaks ABS chains and makes it yellow and brittle. Retrobright is a process for reversing the yellowing of white ABS casings.',
        },
        sources: [src.wikiAbs],
      },
      {
        text: {
          simple: 'ABS has no single melting point: it just gets softer and softer as it heats up.',
          deeper: 'ABS is amorphous, with no definite melting point and a glass transition around 105°C. (Bambu’s data sheet lists a 200°C "melting temperature", but no crystal melt is expected in an amorphous polymer.)',
        },
        sources: [src.wikiAbs, src.bambuAbs],
      },
      {
        text: {
          simple: 'ABS shrinks a little as it cools. That shrinking is what pulls the corners of a print up off the plate.',
          deeper: 'Prusa puts the shrinkage of ABS at about 1 to 2%. ABS warps because of shrinkage while cooling during printing.',
        },
        sources: [src.prusaAbs, src.wikiAbs],
      },
    ],
    sources: [src.bambuAbs, src.prusaAbs, src.wikiAbs, src.wikiPb, src.wikiToughening, src.wikiDegradation, src.wikiLego, src.sabatini2023, src.pubchemAn, src.pubchemBd, src.pubchemStyrene],
  },

  // ============================================================== ASA
  asa: {
    id: 'asa',
    short: 'ASA',
    fullName: 'Acrylonitrile styrene acrylate',
    nickname: 'The outdoor one',
    accent: '#FB923C',
    densityGcm3: 1.05,
    madeFrom: {
      simple: 'The same hard styrene and acrylonitrile plastic as ABS, but the rubber blobs are made from butyl acrylate instead of butadiene.',
      deeper: 'Lightly cross-linked acrylate rubber particles (usually n-butyl acrylate) are grafted with styrene-acrylonitrile chains and embedded in a styrene-acrylonitrile (SAN) matrix.',
    },
    keyIdea: {
      simple: 'ABS with a different rubber. The acrylate rubber has no C=C double bonds for sunlight to break, so ASA keeps its colour and toughness outdoors.',
      deeper: 'The acrylate rubber differs from butadiene rubber by the absence of double bonds, which gives ASA about ten times the weathering and UV resistance of ABS, plus better long-term heat and chemical resistance.',
    },
    monomers: ['acrylonitrile', 'styrene', 'butyl-acrylate'],
    oligomer: 'asa-oligomer',
    repeatUnitGroup: 'repeat',
    morphology: 'rubber-toughened',
    zoom: {
      spool: {
        simple: 'A 1 kg spool of ASA is about 395 metres of 1.75 mm strand, the same as ABS.',
        deeper: 'Bambu ASA is 1.05 g/cm³, about 396 m per kg; Prusament ASA is 1.07 g/cm³, about 389 m.',
      },
      strand: {
        simple: 'One strand, 1.75 mm across. Like ABS, it hides tiny rubber blobs inside.',
        deeper: 'Bambu ASA soaks up at most 0.45% water (25°C, 55% humidity); Prusament ASA took up 0.17% over 7 days at 22% humidity.',
      },
      tangle: {
        simple: 'A glassy tangle with soft rubber blobs scattered through it, just like ABS. Only the blobs are made of something different.',
        deeper: 'Rubber-toughened SAN. The acrylate rubber particles are grafted with SAN chains so they bond into the glassy matrix.',
      },
      chain: {
        simple: 'The glassy chains are styrene and acrylonitrile, the same as in ABS. The rubber chains are butyl acrylate, with only single bonds along their backbone.',
        deeper: 'Poly(n-butyl acrylate): -CH2-CH(COOC4H9)- repeated. The double bond in each butyl acrylate is used up when it joins the chain, leaving a saturated backbone.',
      },
      molecule: {
        simple: 'A glassy branch (styrene, acrylonitrile, styrene) growing off an acrylate rubber chain. The outlined part is one styrene unit. Now look for a C=C double bond in the rubber: there isn’t one.',
        deeper: 'The SAN branch is grafted onto the rubber backbone. Each rubber unit carries a butyl ester side group; tap it to see where the oxygen atoms sit.',
      },
      atom: {
        simple: 'Carbon and hydrogen, nitrogen (blue) in the acrylonitrile, and oxygen (red) in the acrylate side groups. Here is one of its atoms, up close.',
        deeper: 'Bambu lists ASA’s composition as acrylonitrile, styrene and acrylate; it burns to water, carbon oxides and nitrogen oxides.',
      },
    },
    traits: [
      {
        id: 'strength',
        score: 4,
        why: {
          simple: 'Tough, about the same as ABS.',
          deeper: 'Bambu ASA: unnotched impact 41.0 kJ/m², notched 19.6 kJ/m² (ABS 39.3 and 21.5).',
        },
      },
      {
        id: 'flexibility',
        score: 2,
        why: {
          simple: 'Stiff, with a little give, like ABS.',
          deeper: 'Bending modulus 1920 MPa (Bambu ASA), against 1880 for ABS and 2750 for PLA Basic.',
        },
      },
      {
        id: 'heat',
        score: 4,
        why: {
          simple: 'Stays firm up to about 90 to 100°C. Call it a tie with ABS.',
          deeper: 'Bambu ASA: heat deflection 100°C at 0.45 MPa, Vicat 106°C, both a little above Bambu ABS; Prusament ASA gives 93°C. But the encyclopedia puts ASA’s glass transition at 100°C, slightly below ABS’s 105°C. The sources disagree on which is higher.',
        },
      },
      {
        id: 'uv',
        score: 5,
        why: {
          simple: 'Made for outdoors: it keeps its colour and strength in the sun.',
          deeper: 'About ten times the weathering and UV resistance of ABS; ASA keeps its gloss, colour and mechanical properties outdoors. Prusa and Bambu both recommend it for outdoor parts.',
        },
      },
      {
        id: 'easy',
        score: 2,
        why: {
          simple: 'Needs a closed, warm printer like ABS, though it warps a little less.',
          deeper: 'Prusa: ASA warps less and smells less than ABS, but warping is still its main drawback and an enclosure is needed for large parts. Bambu: chamber 45 to 60°C.',
        },
      },
      {
        id: 'moisture',
        score: 4,
        why: {
          simple: 'Stays about as dry as PLA: it takes in only a little water.',
          deeper: 'Saturated absorption only 0.45% (Bambu ASA) against 0.43% for PLA Basic, though Prusa still calls ASA partially hygroscopic.',
        },
      },
    ],
    temps: { tgC: 100, nozzleC: [240, 270], bedC: [80, 100], hdtC: 100 },
    print: {
      enclosure: 'yes',
      tips: [
        {
          simple: 'Close the door and let the printer warm up inside, just like ABS.',
          deeper: 'Bambu ASA: chamber 45 to 60°C, fan 0 to 80%, bed 80 to 100°C with glue, nozzle 240 to 270°C. Prusa heats its bed to at least 100°C for ASA.',
        },
        {
          simple: 'Print in a room with fresh air: ASA gives off fumes too.',
          deeper: 'Prusa lists potentially dangerous styrene fumes and advises a well-ventilated room.',
        },
        {
          simple: 'Dry it at 80°C if it has been left out.',
          deeper: 'Bambu ASA: blast drying oven 80°C for 8 hours; Prusa dries ASA at 80°C for 4 hours.',
        },
        {
          simple: 'Like ABS, ASA can be smoothed or glued with acetone (an adult job).',
          deeper: 'Prusa: ASA dissolves in acetone, which can be used to smooth and glue it.',
        },
      ],
      dryC: 80,
    },
    sim: { shrink: 4, thirst: 2, rubberBlobs: { molecule: 'asa-rubber' } },
    facts: [
      {
        text: {
          simple: 'Swapping the rubber is the whole trick: ASA lasts about ten times longer than ABS outside.',
          deeper: 'The acrylate rubber has no double bonds, giving about ten times the weathering and UV resistance of ABS.',
        },
        sources: [src.wikiAsa],
      },
      {
        text: {
          simple: 'ASA was first tried in the 1960s and perfected by a German chemical company.',
          deeper: 'James A. Herbig and Ival O. Salyer of Monsanto first attempted what became ASA in the 1960s; Hans-Werner Otto and Hans Peter Siebel of BASF refined it.',
        },
        sources: [src.wikiAsa],
      },
      {
        text: {
          simple: 'You will find ASA on the outside of cars, house cladding and outdoor furniture.',
          deeper: 'ASA is used where weatherability matters: commercial siding, exterior vehicle parts and outdoor furniture.',
        },
        sources: [src.wikiAsa],
      },
      {
        text: {
          simple: 'Bambu suggests ASA for plant labels, letterboxes and wind vanes.',
          deeper: 'Bambu pitches its ASA for outdoor models such as plant signs, mailboxes and wind vanes, and for structural parts with long-term outdoor exposure.',
        },
        sources: [src.bambuAsa],
      },
      {
        text: {
          simple: 'ASA also copes better than ABS with cleaning sprays and alcohol.',
          deeper: 'ASA is significantly more resistant to environmental stress cracking than ABS, especially with alcohols and many cleaning agents.',
        },
        sources: [src.wikiAsa],
      },
      {
        text: {
          simple: 'Prusa says ASA warps less and smells less than ABS.',
          deeper: 'Compared to ABS, Prusa says ASA is more UV resistant, warps less and does not smell as much, with temperature resistance up to 93°C.',
        },
        sources: [src.prusaAsa],
      },
    ],
    sources: [src.bambuAsa, src.prusaAsa, src.prusamentAsa, src.prusaDrying, src.wikiAsa, src.wikiAbs, src.pubchemAn, src.pubchemStyrene, src.pubchemBa],
  },
}

/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard: VdM-Notenschnipsel EMP & Früherziehung
 * vdmEmpScoreSnippets.ts
 * 
 * Kanonischer Katalog für Elementare Musikpädagogik (EMP), Musikalische
 * Früherziehung (MFE) und die VdM-Grundstufe:
 * - 2- bis 5-Ton-Räume (Kuckucksruf, Pentatonik, Volksliedmotive)
 * - Sprachrhythmen & Silbenmetrik ("Scho-ko-la-de, Eis!")
 * - Body-Percussion & Bewegungskanon (Stampfen, Patschen, Klatschen)
 * - Kontrastpaare (Hoch/Tief, Laut/Leise, Staccato/Legato)
 * - Call & Response (Echo-Spiele zur auditiven Wahrnehmung)
 */

import { MicroScoreSnippet } from '../components/student/meisterwerk/microscore/microScore.types';

export const VDM_EMP_SCORE_SNIPPETS: MicroScoreSnippet[] = [
  {
    id: 'vdm-emp-kuckuck',
    title: 'Kuckucksruf (Fallende Moll-Terz G - E)',
    category: 'Früherziehung',
    vdmFolder: 'emp-terz',
    vdmLevel: 'elementar',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Elementarstufe: Das fundamentale Ur-Intervall des Kindesgesangs (G4 - E4). Ideal für Glockenspiel, Xylophon und Gesang.',
    tags: ['EMP', 'Früherziehung', 'Kuckuck', 'Terz', 'Glockenspiel', 'Orff'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'ek1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'ek2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'ek3', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'REST' },
      { id: 'ek4', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'ek5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'ek6', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'G4' },
      { id: 'ek7', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'E4' }
    ]
  },
  {
    id: 'vdm-emp-haenschen-klein',
    title: 'Hänschen Klein (5-Ton-Raum C - G)',
    category: 'Früherziehung',
    vdmFolder: 'emp-fuenfton',
    vdmLevel: 'elementar',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 84,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Elementarstufe: Die ersten beiden Takte des Volkslieds im Fünftonraum (G-E-E, F-D-D).',
    tags: ['EMP', 'Hänschen Klein', 'Fünftonraum', 'Liedanfang', 'Grundstufe'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'eh1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'G4' },
      { id: 'eh2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'eh3', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'E4' },
      { id: 'eh4', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'eh5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'D4' },
      { id: 'eh6', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'D4' }
    ]
  },
  {
    id: 'vdm-emp-pentatonik-playground',
    title: 'Pentatonischer Zaubergarten (C - D - E - G - A)',
    category: 'Früherziehung',
    vdmFolder: 'emp-pentatonik',
    vdmLevel: 'elementar',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 90,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Früherziehung: Halbtontonlose Pentatonik. Klingen immer harmonisch, ideal für Boomwhackers und Klangbausteine.',
    tags: ['EMP', 'Pentatonik', 'Orff', 'Boomwhackers', 'Klangbausteine'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'ep1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'ep2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'D4' },
      { id: 'ep3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'E4' },
      { id: 'ep4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'G4' },
      { id: 'ep5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'A4' },
      { id: 'ep6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'G4' },
      { id: 'ep7', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'E4' },
      { id: 'ep8', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C4' }
    ]
  },
  {
    id: 'vdm-emp-sprachrhythmus-schokolade',
    title: 'Sprachrhythmus: "Scho-ko-la-de, Eis, Eis!"',
    category: 'Früherziehung',
    vdmFolder: 'emp-sprache',
    vdmLevel: 'elementar',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Früherziehung & Grundstufe: Rhythmisches Sprechen und Klatschen. Vier Sechzehntel gefolgt von zwei Vierteln.',
    tags: ['EMP', 'Sprachrhythmus', 'Klatschen', '16tel', 'Rhythmik'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'es1', barIndex: 0, beatFraction: 0, duration: '16', pitch: 'C4' },
      { id: 'es2', barIndex: 0, beatFraction: 1, duration: '16', pitch: 'C4' },
      { id: 'es3', barIndex: 0, beatFraction: 2, duration: '16', pitch: 'C4' },
      { id: 'es4', barIndex: 0, beatFraction: 3, duration: '16', pitch: 'C4' },
      { id: 'es5', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C4' },
      { id: 'es6', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'C4' },
      { id: 'es7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'REST' },
      { id: 'es8', barIndex: 1, beatFraction: 0, duration: '16', pitch: 'C4' },
      { id: 'es9', barIndex: 1, beatFraction: 1, duration: '16', pitch: 'C4' },
      { id: 'es10', barIndex: 1, beatFraction: 2, duration: '16', pitch: 'C4' },
      { id: 'es11', barIndex: 1, beatFraction: 3, duration: '16', pitch: 'C4' },
      { id: 'es12', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'C4' },
      { id: 'es13', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'C4' },
      { id: 'es14', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'C4' }
    ]
  },
  {
    id: 'vdm-emp-bodypercussion-kanon',
    title: 'Body-Percussion: Stampf, Patsch, Klatsch',
    category: 'Früherziehung',
    vdmFolder: 'emp-bodypercussion',
    vdmLevel: 'elementar',
    instrument: 'drums',
    clef: 'percussion',
    timeSignature: '4/4',
    tempoBpm: 85,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM EMP: Fußstampfen (Bassdrum F4), Oberschenkelpatschen (Snare C5) und Händeklatschen (Hi-Hat G5).',
    tags: ['EMP', 'Bodypercussion', 'Stampfen', 'Klatschen', 'Koordination'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      { id: 'ebp1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'ebp2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C5' },
      { id: 'ebp3', barIndex: 0, beatFraction: 8, duration: '4', pitch: 'G5' },
      { id: 'ebp4', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C5' },
      { id: 'ebp5', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'F4' },
      { id: 'ebp6', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'F4' },
      { id: 'ebp7', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'G5' }
    ]
  },
  {
    id: 'vdm-emp-elefant-und-maus',
    title: 'Elefanten-Schritt & Mäuse-Tippeln',
    category: 'Früherziehung',
    vdmFolder: 'emp-register',
    vdmLevel: 'elementar',
    instrument: 'piano',
    timeSignature: '4/4',
    tempoBpm: 75,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Früherziehung: Register- und Hörempfinden. Takt 1 tief und schwer (C2), Takt 2 hoch und leicht (C6).',
    tags: ['EMP', 'Kontraste', 'Hoch Tief', 'Register', 'Klavier'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: Elefant (Bass, schwer)
      { id: 'eem1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C2' },
      { id: 'eem2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'C2' },
      { id: 'eem3', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'C2' },
      // Takt 1: Maus (Diskant, tippeln)
      { id: 'eem4', barIndex: 1, beatFraction: 0, duration: '8', pitch: 'C6' },
      { id: 'eem5', barIndex: 1, beatFraction: 2, duration: '8', pitch: 'D6' },
      { id: 'eem6', barIndex: 1, beatFraction: 4, duration: '8', pitch: 'C6' },
      { id: 'eem7', barIndex: 1, beatFraction: 6, duration: '8', pitch: 'D6' },
      { id: 'eem8', barIndex: 1, beatFraction: 8, duration: '4', pitch: 'C6' },
      { id: 'eem9', barIndex: 1, beatFraction: 12, duration: '4', pitch: 'REST' }
    ]
  },
  {
    id: 'vdm-emp-echo-call-response',
    title: 'Glöckchen-Echo (Call & Response)',
    category: 'Früherziehung',
    vdmFolder: 'emp-echo',
    vdmLevel: 'elementar',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Früherziehung: Echo-Spiel. Takt 1 ruft die Lehrkraft vor, Takt 2 antwortet das Kind exakt gleich.',
    tags: ['EMP', 'Call & Response', 'Echo', 'Hören', 'Gehörbildung'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: Vorspiel (Call)
      { id: 'eec1', barIndex: 0, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'eec2', barIndex: 0, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'eec3', barIndex: 0, beatFraction: 8, duration: '2', pitch: 'G4' },
      // Takt 1: Echo (Response)
      { id: 'eec4', barIndex: 1, beatFraction: 0, duration: '4', pitch: 'C4' },
      { id: 'eec5', barIndex: 1, beatFraction: 4, duration: '4', pitch: 'E4' },
      { id: 'eec6', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'G4' }
    ]
  },
  {
    id: 'vdm-emp-dino-schmetterling',
    title: 'Dino-Stampf & Schmetterling (Staccato vs. Legato)',
    category: 'Früherziehung',
    vdmFolder: 'emp-artikulation',
    vdmLevel: 'elementar',
    instrument: 'universal',
    timeSignature: '4/4',
    tempoBpm: 80,
    barsCount: 2,
    displayMode: 'notes',
    description: 'VdM Grundstufe Artikulation: Takt 1 kurze Staccato-Viertel mit Pausen, Takt 2 weich gebundene Legato-Halbe.',
    tags: ['EMP', 'Artikulation', 'Staccato', 'Legato', 'Klangfarben'],
    isVdmStandard: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorRole: 'teacher',
    notes: [
      // Takt 0: Dino (Staccato mit Pausen)
      { id: 'eds1', barIndex: 0, beatFraction: 0, duration: '8', pitch: 'C4' },
      { id: 'eds2', barIndex: 0, beatFraction: 2, duration: '8', pitch: 'REST' },
      { id: 'eds3', barIndex: 0, beatFraction: 4, duration: '8', pitch: 'C4' },
      { id: 'eds4', barIndex: 0, beatFraction: 6, duration: '8', pitch: 'REST' },
      { id: 'eds5', barIndex: 0, beatFraction: 8, duration: '8', pitch: 'C4' },
      { id: 'eds6', barIndex: 0, beatFraction: 10, duration: '8', pitch: 'REST' },
      { id: 'eds7', barIndex: 0, beatFraction: 12, duration: '4', pitch: 'C4' },
      // Takt 1: Schmetterling (Legato)
      { id: 'eds8', barIndex: 1, beatFraction: 0, duration: '2', pitch: 'E4' },
      { id: 'eds9', barIndex: 1, beatFraction: 8, duration: '2', pitch: 'G4' }
    ]
  }
];

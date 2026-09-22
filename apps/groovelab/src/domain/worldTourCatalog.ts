/**
 * 🌍 Campus-Groovelab World Tour Catalog
 * 
 * Curated public domain national anthems (Historical Urtext Master Scores).
 * Master notes in Concert Pitch C with lyrics, historical facts and pedagogical tips.
 * All melodies composed by classical masters deceased > 70 years.
 */

import { ContinentDefinition, WorldTourCountry } from '../types/worldTour';

export const CONTINENTS: ContinentDefinition[] = [
  { id: 'europe', label: 'Europa', emoji: '🇪🇺', badgeId: 'wt-continent-europe', color: '#3b82f6', countriesCount: 8 },
  { id: 'americas', label: 'Amerika', emoji: '🌎', badgeId: 'wt-continent-americas', color: '#f59e0b', countriesCount: 2 },
  { id: 'asia', label: 'Asien', emoji: '🌏', badgeId: 'wt-continent-asia', color: '#ec4899', countriesCount: 1 },
  { id: 'oceania', label: 'Ozeanien', emoji: '🦘', badgeId: 'wt-continent-oceania', color: '#10b981', countriesCount: 1 },
  { id: 'africa', label: 'Afrika', emoji: '🌍', badgeId: 'wt-continent-africa', color: '#8b5cf6', countriesCount: 0 }
];

export const WORLD_TOUR_COUNTRIES: WorldTourCountry[] = [
  {
    code: 'DE',
    name: 'Deutschland',
    anthemTitle: 'Deutsche Nationalhymne (Einigkeit und Recht und Freiheit)',
    composer: 'Joseph Haydn',
    composerDates: '1732–1809',
    composedYear: '1797',
    era: 'Wiener Klassik',
    continent: 'europe',
    flagEmoji: '🇩🇪',
    funFact: 'Haydn komponierte die Melodie ursprünglich als Kaiserhymne für Franz II. in Wien. Sie gilt als Musterbeispiel klassischer Periodenbildung.',
    didacticTip: 'Achte im zweiten Takt auf die punktierte Viertelnote – zähle bewusst: 1 - und - 2!',
    story15s: 'Joseph Haydn ließ sich für diese Melodie von einem alten kroatischen Volkslied inspirieren. Später verwendete er sie in seinem berühmten Kaiserquartett!',
    mapCoordinates: { x: 50, y: 35 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'G-Dur',
      defaultBpm: 84,
      barsCount: 16,
      notes: [
        // Takt 1 (Phrase 1: Vordersatz)
        { pitch: 'G4', durationBeats: 1.5, lyric: 'Ein-' },
        { pitch: 'A4', durationBeats: 0.5, lyric: '-ig-' },
        { pitch: 'B4', durationBeats: 1, lyric: 'keit' },
        { pitch: 'A4', durationBeats: 1, lyric: 'und' },

        // Takt 2
        { pitch: 'C5', durationBeats: 1, lyric: 'Recht' },
        { pitch: 'B4', durationBeats: 1, lyric: 'und' },
        { pitch: 'A4', durationBeats: 0.5, lyric: 'Frei-' },
        { pitch: 'F#4', durationBeats: 0.5, lyric: '' },
        { pitch: 'G4', durationBeats: 1, lyric: '-heit' },

        // Takt 3
        { pitch: 'E5', durationBeats: 1, lyric: 'für' },
        { pitch: 'D5', durationBeats: 1, lyric: 'das' },
        { pitch: 'C5', durationBeats: 1, lyric: 'deut-' },
        { pitch: 'B4', durationBeats: 1, lyric: '-sche' },

        // Takt 4 (Halbkadenz auf Dominante D5)
        { pitch: 'A4', durationBeats: 1, lyric: 'Va-' },
        { pitch: 'B4', durationBeats: 0.5, lyric: '-ter-' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '' },
        { pitch: 'D5', durationBeats: 2, lyric: '-land!' },

        // Takt 5 (Phrase 2: Wiederholung Vordersatz)
        { pitch: 'G4', durationBeats: 1.5, lyric: 'Da-' },
        { pitch: 'A4', durationBeats: 0.5, lyric: '-nach' },
        { pitch: 'B4', durationBeats: 1, lyric: 'lasst' },
        { pitch: 'A4', durationBeats: 1, lyric: 'uns' },

        // Takt 6
        { pitch: 'C5', durationBeats: 1, lyric: 'al-' },
        { pitch: 'B4', durationBeats: 1, lyric: '-le' },
        { pitch: 'A4', durationBeats: 0.5, lyric: 'stre-' },
        { pitch: 'F#4', durationBeats: 0.5, lyric: '' },
        { pitch: 'G4', durationBeats: 1, lyric: '-ben' },

        // Takt 7
        { pitch: 'E5', durationBeats: 1, lyric: 'brü-' },
        { pitch: 'D5', durationBeats: 1, lyric: '-der-' },
        { pitch: 'C5', durationBeats: 1, lyric: '-lich' },
        { pitch: 'B4', durationBeats: 1, lyric: 'mit' },

        // Takt 8 (Halbkadenz auf Dominante D5)
        { pitch: 'A4', durationBeats: 1, lyric: 'Herz' },
        { pitch: 'B4', durationBeats: 0.5, lyric: 'und' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '' },
        { pitch: 'D5', durationBeats: 2, lyric: 'Hand!' },

        // Takt 9 (Phrase 3: B-Teil / Harmonischer Kontrast)
        { pitch: 'A4', durationBeats: 1, lyric: 'Ein-' },
        { pitch: 'B4', durationBeats: 1, lyric: '-ig-' },
        { pitch: 'A4', durationBeats: 0.5, lyric: '-keit' },
        { pitch: 'F#4', durationBeats: 0.5, lyric: '' },
        { pitch: 'D4', durationBeats: 1, lyric: 'und' },

        // Takt 10
        { pitch: 'C5', durationBeats: 1, lyric: 'Recht' },
        { pitch: 'B4', durationBeats: 1, lyric: 'und' },
        { pitch: 'A4', durationBeats: 0.5, lyric: 'Frei-' },
        { pitch: 'F#4', durationBeats: 0.5, lyric: '' },
        { pitch: 'D4', durationBeats: 1, lyric: '-heit' },

        // Takt 11
        { pitch: 'D5', durationBeats: 1, lyric: 'sind' },
        { pitch: 'C5', durationBeats: 1, lyric: 'des' },
        { pitch: 'B4', durationBeats: 1.5, lyric: 'Glü-' },
        { pitch: 'B4', durationBeats: 0.5, lyric: '-ckes' },

        // Takt 12 (Modulation mit C#5 nach D-Dur)
        { pitch: 'C#5', durationBeats: 1, lyric: 'Un-' },
        { pitch: 'C#5', durationBeats: 0.5, lyric: '-ter-' },
        { pitch: 'D5', durationBeats: 0.5, lyric: '' },
        { pitch: 'D5', durationBeats: 2, lyric: '-pfand.' },

        // Takt 13 (Phrase 4: C-Teil / Apotheose)
        { pitch: 'G5', durationBeats: 1.5, lyric: 'Blüh' },
        { pitch: 'F#5', durationBeats: 0.5, lyric: 'im' },
        { pitch: 'F#5', durationBeats: 0.5, lyric: 'Glan-' },
        { pitch: 'E5', durationBeats: 0.5, lyric: '' },
        { pitch: 'D5', durationBeats: 1, lyric: '-ze' },

        // Takt 14
        { pitch: 'E5', durationBeats: 1.5, lyric: 'die-' },
        { pitch: 'D5', durationBeats: 0.5, lyric: '-ses' },
        { pitch: 'D5', durationBeats: 0.5, lyric: 'Glü-' },
        { pitch: 'C5', durationBeats: 0.5, lyric: '' },
        { pitch: 'B4', durationBeats: 1, lyric: '-ckes,' },

        // Takt 15 (Schlusskadenz)
        { pitch: 'A4', durationBeats: 1.5, lyric: 'blü-' },
        { pitch: 'B4', durationBeats: 0.25, lyric: '-he,' },
        { pitch: 'C5', durationBeats: 0.25, lyric: '' },
        { pitch: 'D5', durationBeats: 0.5, lyric: 'deut-' },
        { pitch: 'E5', durationBeats: 0.5, lyric: '' },
        { pitch: 'C5', durationBeats: 0.5, lyric: '-sches' },
        { pitch: 'A4', durationBeats: 0.5, lyric: '' },

        // Takt 16 (Ganzkadenz auf Tonika G4)
        { pitch: 'G4', durationBeats: 1, lyric: 'Va-' },
        { pitch: 'A4', durationBeats: 0.5, lyric: '-ter-' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '' },
        { pitch: 'G4', durationBeats: 2, lyric: '-land!' }
      ]
    }
  },
  {
    code: 'FR',
    name: 'Frankreich',
    anthemTitle: 'La Marseillaise',
    composer: 'Claude Joseph Rouget de Lisle',
    composerDates: '1760–1836',
    composedYear: '1792',
    era: 'Klassik / Revolution',
    continent: 'europe',
    flagEmoji: '🇫🇷',
    funFact: 'Obwohl sie in Straßburg geschrieben wurde, heißt sie Marseillaise, weil Truppen aus Marseille sie beim Einmarsch in Paris sangen.',
    didacticTip: 'Spiele den Auftakt mit stolzer Energie und halte die punktierten Rhythmen knackig kurz!',
    story15s: 'Rouget de Lisle komponierte dieses mitreißende Lied in einer einzigen Nacht im April 1792 als Kriegslied für die Rheinarmee.',
    mapCoordinates: { x: 47, y: 39 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'G-Dur',
      defaultBpm: 104,
      barsCount: 16,
      notes: [
        // Takt 1
        { pitch: 'D4', durationBeats: 1, lyric: 'Al-' },
        { pitch: 'G4', durationBeats: 1.5, lyric: 'lons' },
        { pitch: 'G4', durationBeats: 0.5, lyric: 'en-' },
        { pitch: 'A4', durationBeats: 1, lyric: 'fants' },
        // Takt 2
        { pitch: 'A4', durationBeats: 1, lyric: 'de' },
        { pitch: 'D5', durationBeats: 2, lyric: 'la' },
        { pitch: 'B4', durationBeats: 1, lyric: 'Pa-' },
        // Takt 3
        { pitch: 'G4', durationBeats: 1, lyric: 'trie,' },
        { pitch: 'B4', durationBeats: 1, lyric: 'le' },
        { pitch: 'C5', durationBeats: 1, lyric: 'jour' },
        { pitch: 'D5', durationBeats: 1, lyric: 'de' },
        // Takt 4
        { pitch: 'E5', durationBeats: 1, lyric: 'gloire' },
        { pitch: 'A4', durationBeats: 2, lyric: 'est' },
        { pitch: 'D5', durationBeats: 1, lyric: 'ar-ri-' },

        // Takt 5
        { pitch: 'D5', durationBeats: 2, lyric: 'vé!' },
        { pitch: 'B4', durationBeats: 1, lyric: 'Con-tre' },
        { pitch: 'G4', durationBeats: 1, lyric: 'nous' },
        // Takt 6
        { pitch: 'B4', durationBeats: 1, lyric: 'de' },
        { pitch: 'A4', durationBeats: 2, lyric: 'la' },
        { pitch: 'D4', durationBeats: 1, lyric: 'ty-ran-' },
        // Takt 7
        { pitch: 'A4', durationBeats: 1.5, lyric: '-nie,' },
        { pitch: 'B4', durationBeats: 0.5, lyric: 'L\'é-' },
        { pitch: 'C5', durationBeats: 1, lyric: '-ten-' },
        { pitch: 'A4', durationBeats: 1, lyric: '-dard' },
        // Takt 8
        { pitch: 'B4', durationBeats: 2, lyric: 'san-' },
        { pitch: 'G4', durationBeats: 2, lyric: '-glant!' },

        // Takt 9 (Refrain)
        { pitch: 'D5', durationBeats: 2, lyric: 'Aux' },
        { pitch: 'B4', durationBeats: 1.5, lyric: 'ar-' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '-mes,' },
        // Takt 10
        { pitch: 'E5', durationBeats: 3, lyric: 'ci-toy-' },
        { pitch: 'C5', durationBeats: 1, lyric: '-ens!' },
        // Takt 11
        { pitch: 'A4', durationBeats: 1.5, lyric: 'For-' },
        { pitch: 'C5', durationBeats: 0.5, lyric: '-mez' },
        { pitch: 'B4', durationBeats: 1, lyric: 'vos' },
        { pitch: 'A4', durationBeats: 1, lyric: 'ba-tail-' },
        // Takt 12
        { pitch: 'G4', durationBeats: 2, lyric: '-lons!' },
        { pitch: 'F#4', durationBeats: 1, lyric: 'Mar-' },
        { pitch: 'D4', durationBeats: 1, lyric: '-chons,' },

        // Takt 13
        { pitch: 'G4', durationBeats: 2, lyric: 'mar-' },
        { pitch: 'B4', durationBeats: 1, lyric: '-chons!' },
        { pitch: 'D5', durationBeats: 1, lyric: 'Qu\'un' },
        // Takt 14
        { pitch: 'E5', durationBeats: 2, lyric: 'sang' },
        { pitch: 'C5', durationBeats: 2, lyric: 'im-pur' },
        // Takt 15
        { pitch: 'B4', durationBeats: 1.5, lyric: 'ab-' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '-breu-ve' },
        { pitch: 'A4', durationBeats: 1, lyric: 'nos' },
        { pitch: 'F#4', durationBeats: 1, lyric: 'sil-' },
        // Takt 16
        { pitch: 'G4', durationBeats: 4, lyric: '-lons!' }
      ]
    }
  },
  {
    code: 'GB',
    name: 'Großbritannien',
    anthemTitle: 'God Save the King',
    composer: 'Traditionell / John Bull',
    composerDates: '† 1628',
    composedYear: '1619',
    era: 'Barock / Renaissance',
    continent: 'europe',
    flagEmoji: '🇬🇧',
    funFact: 'Die Melodie ist so berühmt, dass sie historisch auch für Hymnen in Deutschland (Heil dir im Siegerkranz), der Schweiz und den USA verwendet wurde.',
    didacticTip: 'Das Stück steht im feierlichen 3/4-Takt. Betone immer die Zählzeit 1 etwas stärker als 2 und 3.',
    story15s: 'Die genaue Herkunft ist geheimnisvoll, geht aber wahrscheinlich auf den Renaissance-Komponisten John Bull zurück.',
    mapCoordinates: { x: 45, y: 32 },
    score: {
      timeSignature: '3/4',
      tonalCenter: 'G-Dur',
      defaultBpm: 76,
      barsCount: 14,
      notes: [
        // Takt 1
        { pitch: 'G4', durationBeats: 1, lyric: 'God' },
        { pitch: 'G4', durationBeats: 1, lyric: 'save' },
        { pitch: 'A4', durationBeats: 1, lyric: 'our' },
        // Takt 2
        { pitch: 'F#4', durationBeats: 1.5, lyric: 'gra-' },
        { pitch: 'G4', durationBeats: 0.5, lyric: 'cious' },
        { pitch: 'A4', durationBeats: 1, lyric: 'King!' },
        // Takt 3
        { pitch: 'B4', durationBeats: 1, lyric: 'Long' },
        { pitch: 'B4', durationBeats: 1, lyric: 'live' },
        { pitch: 'C5', durationBeats: 1, lyric: 'our' },
        // Takt 4
        { pitch: 'B4', durationBeats: 1.5, lyric: 'no-' },
        { pitch: 'A4', durationBeats: 0.5, lyric: 'ble' },
        { pitch: 'G4', durationBeats: 1, lyric: 'King!' },
        // Takt 5
        { pitch: 'A4', durationBeats: 1, lyric: 'God' },
        { pitch: 'G4', durationBeats: 1, lyric: 'save' },
        { pitch: 'F#4', durationBeats: 1, lyric: 'the' },
        // Takt 6
        { pitch: 'G4', durationBeats: 3, lyric: 'King!' },

        // Takt 7
        { pitch: 'D5', durationBeats: 1, lyric: 'Send' },
        { pitch: 'D5', durationBeats: 1, lyric: 'him' },
        { pitch: 'D5', durationBeats: 1, lyric: 'vic-' },
        // Takt 8
        { pitch: 'D5', durationBeats: 1.5, lyric: '-to-' },
        { pitch: 'C5', durationBeats: 0.5, lyric: '-ri-' },
        { pitch: 'B4', durationBeats: 1, lyric: '-ous,' },
        // Takt 9
        { pitch: 'C5', durationBeats: 1, lyric: 'Hap-' },
        { pitch: 'C5', durationBeats: 1, lyric: '-py' },
        { pitch: 'C5', durationBeats: 1, lyric: 'and' },
        // Takt 10
        { pitch: 'C5', durationBeats: 1.5, lyric: 'glo-' },
        { pitch: 'B4', durationBeats: 0.5, lyric: '-ri-' },
        { pitch: 'A4', durationBeats: 1, lyric: '-ous,' },
        // Takt 11
        { pitch: 'B4', durationBeats: 1, lyric: 'Long' },
        { pitch: 'C5', durationBeats: 0.5, lyric: 'to' },
        { pitch: 'B4', durationBeats: 0.5, lyric: 'reign' },
        { pitch: 'A4', durationBeats: 0.5, lyric: 'o-' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '-ver' },
        // Takt 12
        { pitch: 'B4', durationBeats: 1.5, lyric: '-us,' },
        { pitch: 'C5', durationBeats: 0.5, lyric: 'God' },
        { pitch: 'D5', durationBeats: 1, lyric: 'save' },
        // Takt 13
        { pitch: 'E5', durationBeats: 1, lyric: 'the' },
        { pitch: 'D5', durationBeats: 0.5, lyric: 'no-' },
        { pitch: 'C5', durationBeats: 0.5, lyric: '-ble' },
        { pitch: 'B4', durationBeats: 1, lyric: 'King!' },
        // Takt 14
        { pitch: 'A4', durationBeats: 1, lyric: 'God' },
        { pitch: 'G4', durationBeats: 2, lyric: 'save!' }
      ]
    }
  },
  {
    code: 'IT',
    name: 'Italien',
    anthemTitle: 'Il Canto degli Italiani (Fratelli d\'Italia)',
    composer: 'Michele Novaro',
    composerDates: '1818–1885',
    composedYear: '1847',
    era: 'Romantik / Risorgimento',
    continent: 'europe',
    flagEmoji: '🇮🇹',
    funFact: 'Sie ist bekannt als "Fratelli d\'Italia" und hat den temperamentvollen Schwung einer italienischen Freiheitsoper.',
    didacticTip: 'Spiele leichtfüßig und spritzig – die punktierten Noten sollen wie kleine Trommelwirbel federn!',
    story15s: 'Novaro war so begeistert vom Gedicht des Studenten Goffredo Mameli, dass er die Musik in Genua spontan am Klavier niederschrieb.',
    mapCoordinates: { x: 51, y: 44 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'C-Dur',
      defaultBpm: 112,
      barsCount: 16,
      notes: [
        // Takt 1
        { pitch: 'C4', durationBeats: 0.75, lyric: 'Fra-' },
        { pitch: 'C4', durationBeats: 0.25, lyric: '-tel-' },
        { pitch: 'C4', durationBeats: 1, lyric: '-li' },
        { pitch: 'C4', durationBeats: 0.75, lyric: 'd\'I-' },
        { pitch: 'C4', durationBeats: 0.25, lyric: '-ta-' },
        { pitch: 'C4', durationBeats: 1, lyric: '-lia,' },
        // Takt 2
        { pitch: 'F4', durationBeats: 1.5, lyric: 'l\'I-' },
        { pitch: 'F4', durationBeats: 0.5, lyric: '-ta-' },
        { pitch: 'F4', durationBeats: 2, lyric: '-lia s\'è des-ta,' },
        // Takt 3
        { pitch: 'D4', durationBeats: 0.75, lyric: 'dell\'' },
        { pitch: 'D4', durationBeats: 0.25, lyric: 'el-' },
        { pitch: 'D4', durationBeats: 1, lyric: '-mo' },
        { pitch: 'D4', durationBeats: 0.75, lyric: 'di' },
        { pitch: 'D4', durationBeats: 0.25, lyric: 'Sci-' },
        { pitch: 'D4', durationBeats: 1, lyric: '-pio' },
        // Takt 4
        { pitch: 'G4', durationBeats: 1.5, lyric: 's\'è' },
        { pitch: 'G4', durationBeats: 0.5, lyric: 'cin-' },
        { pitch: 'G4', durationBeats: 2, lyric: '-ta la tes-ta.' },

        // Takt 5
        { pitch: 'E4', durationBeats: 1, lyric: 'Do-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-v\'è' },
        { pitch: 'F4', durationBeats: 1, lyric: 'la' },
        { pitch: 'G4', durationBeats: 1, lyric: 'Vit-' },
        // Takt 6
        { pitch: 'A4', durationBeats: 1.5, lyric: '-to-' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '-ria?' },
        { pitch: 'F4', durationBeats: 1, lyric: 'Le' },
        { pitch: 'E4', durationBeats: 1, lyric: 'por-ga' },
        // Takt 7
        { pitch: 'D4', durationBeats: 1.5, lyric: 'la' },
        { pitch: 'E4', durationBeats: 0.5, lyric: 'chio-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-ma,' },
        { pitch: 'D4', durationBeats: 1, lyric: 'ché' },
        // Takt 8
        { pitch: 'C4', durationBeats: 1, lyric: 'schia-va' },
        { pitch: 'B3', durationBeats: 1, lyric: 'di' },
        { pitch: 'C4', durationBeats: 2, lyric: 'Ro-ma' },

        // Takt 9 (Refrain)
        { pitch: 'G4', durationBeats: 1.5, lyric: 'I-' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '-d-dio' },
        { pitch: 'G4', durationBeats: 1, lyric: 'la' },
        { pitch: 'E4', durationBeats: 1, lyric: 'cre-ò.' },
        // Takt 10
        { pitch: 'C5', durationBeats: 2, lyric: 'Strin-' },
        { pitch: 'G4', durationBeats: 2, lyric: '-giam-ci' },
        // Takt 11
        { pitch: 'A4', durationBeats: 1.5, lyric: 'a' },
        { pitch: 'F4', durationBeats: 0.5, lyric: 'co-' },
        { pitch: 'D4', durationBeats: 2, lyric: '-or-te,' },
        // Takt 12
        { pitch: 'G4', durationBeats: 1.5, lyric: 'siam' },
        { pitch: 'E4', durationBeats: 0.5, lyric: 'pron-' },
        { pitch: 'C4', durationBeats: 2, lyric: '-ti' },

        // Takt 13
        { pitch: 'D4', durationBeats: 1.5, lyric: 'al-' },
        { pitch: 'D4', durationBeats: 0.5, lyric: '-la' },
        { pitch: 'D4', durationBeats: 1, lyric: 'mor-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-te,' },
        // Takt 14
        { pitch: 'F4', durationBeats: 1.5, lyric: 'siam' },
        { pitch: 'F4', durationBeats: 0.5, lyric: 'pron-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-ti' },
        { pitch: 'D4', durationBeats: 1, lyric: 'al-la' },
        // Takt 15
        { pitch: 'E4', durationBeats: 1.5, lyric: 'mor-' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '-te,' },
        { pitch: 'E4', durationBeats: 1, lyric: 'l\'I-ta-lia' },
        { pitch: 'F4', durationBeats: 1, lyric: 'chia-' },
        // Takt 16
        { pitch: 'G4', durationBeats: 2, lyric: '-mò!' },
        { pitch: 'C5', durationBeats: 2, lyric: 'Sì!' }
      ]
    }
  },
  {
    code: 'AT',
    name: 'Österreich',
    anthemTitle: 'Bundeshymne der Republik Österreich (Land der Berge)',
    composer: 'W. A. Mozart zugeschr. / J. B. Holzer',
    composerDates: '† 1798',
    composedYear: '1791',
    era: 'Wiener Klassik',
    continent: 'europe',
    flagEmoji: '🇦🇹',
    funFact: 'Die Melodie stammt aus der Freimaurerkantate KV 623a und wurde lange Zeit direkt Wolfgang Amadeus Mozart zugeschrieben.',
    didacticTip: 'Ein wunderschöner, liedhafter Bogen im 3/4-Takt. Halte die Töne voll aus und atme nur an den Phrasenenden.',
    story15s: 'Nach dem Zweiten Weltkrieg schrieb die Dichterin Paula von Preradović den Text zu dieser festlichen Wiener Melodie.',
    mapCoordinates: { x: 53, y: 39 },
    score: {
      timeSignature: '3/4',
      tonalCenter: 'F-Dur',
      defaultBpm: 84,
      barsCount: 16,
      notes: [
        // Takt 1
        { pitch: 'F4', durationBeats: 1, lyric: 'Land' },
        { pitch: 'A4', durationBeats: 1, lyric: 'der' },
        { pitch: 'C5', durationBeats: 1, lyric: 'Ber-' },
        // Takt 2
        { pitch: 'C5', durationBeats: 2, lyric: '-ge,' },
        { pitch: 'A4', durationBeats: 1, lyric: 'Land' },
        // Takt 3
        { pitch: 'Bb4', durationBeats: 1, lyric: 'am' },
        { pitch: 'G4', durationBeats: 1, lyric: 'Stro-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-me,' },
        // Takt 4
        { pitch: 'F4', durationBeats: 3, lyric: 'Land!' },

        // Takt 5
        { pitch: 'F4', durationBeats: 1, lyric: 'Land' },
        { pitch: 'A4', durationBeats: 1, lyric: 'der' },
        { pitch: 'C5', durationBeats: 1, lyric: 'Äk-' },
        // Takt 6
        { pitch: 'C5', durationBeats: 2, lyric: '-ker,' },
        { pitch: 'A4', durationBeats: 1, lyric: 'Land' },
        // Takt 7
        { pitch: 'Bb4', durationBeats: 1, lyric: 'der' },
        { pitch: 'G4', durationBeats: 1, lyric: 'Do-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-me,' },
        // Takt 8
        { pitch: 'F4', durationBeats: 3, lyric: 'Land!' },

        // Takt 9
        { pitch: 'G4', durationBeats: 1, lyric: 'Land' },
        { pitch: 'G4', durationBeats: 1, lyric: 'der' },
        { pitch: 'A4', durationBeats: 1, lyric: 'Häm-' },
        // Takt 10
        { pitch: 'Bb4', durationBeats: 2, lyric: '-mer,' },
        { pitch: 'G4', durationBeats: 1, lyric: 'zu-' },
        // Takt 11
        { pitch: 'A4', durationBeats: 1, lyric: '-kunfts-' },
        { pitch: 'A4', durationBeats: 1, lyric: '-reich-' },
        { pitch: 'B4', durationBeats: 1, lyric: '-e,' },
        // Takt 12
        { pitch: 'C5', durationBeats: 3, lyric: 'Land!' },

        // Takt 13
        { pitch: 'D5', durationBeats: 1, lyric: 'Hei-' },
        { pitch: 'C5', durationBeats: 1, lyric: '-mat' },
        { pitch: 'Bb4', durationBeats: 1, lyric: 'bist' },
        // Takt 14
        { pitch: 'A4', durationBeats: 1.5, lyric: 'du' },
        { pitch: 'Bb4', durationBeats: 0.5, lyric: 'gro-' },
        { pitch: 'C5', durationBeats: 1, lyric: '-ßer' },
        // Takt 15
        { pitch: 'G4', durationBeats: 1.5, lyric: 'Töch-' },
        { pitch: 'A4', durationBeats: 0.5, lyric: '-ter' },
        { pitch: 'F4', durationBeats: 1, lyric: 'und' },
        // Takt 16
        { pitch: 'E4', durationBeats: 1, lyric: 'Söh-' },
        { pitch: 'F4', durationBeats: 2, lyric: '-ne!' }
      ]
    }
  },
  {
    code: 'CH',
    name: 'Schweiz',
    anthemTitle: 'Schweizerpsalm',
    composer: 'Alberik Zwyssig',
    composerDates: '1808–1854',
    composedYear: '1841',
    era: 'Romantik',
    continent: 'europe',
    flagEmoji: '🇨🇭',
    funFact: 'Komponiert von einem Zisterziensermönch im Kloster Wettingen – der Stil erinnert an einen feierlichen Kirchenchoral.',
    didacticTip: 'Spiele mit tiefem, warmem Ton und weichem Bogen- bzw. Tastenanschlag.',
    story15s: 'Pater Alberik Zwyssig passte ein geistliches Lied an ein Gedicht von Leonhard Widmer an, als er auf Schloss Sonnenberg weilte.',
    mapCoordinates: { x: 49, y: 41 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'C-Dur',
      defaultBpm: 72,
      barsCount: 16,
      notes: [
        // Takt 1
        { pitch: 'C4', durationBeats: 1.5, lyric: 'Trittst' },
        { pitch: 'D4', durationBeats: 0.5, lyric: 'im' },
        { pitch: 'E4', durationBeats: 1, lyric: 'Mor-' },
        { pitch: 'C4', durationBeats: 1, lyric: '-gen-' },
        // Takt 2
        { pitch: 'G4', durationBeats: 2, lyric: '-rot' },
        { pitch: 'E4', durationBeats: 2, lyric: 'da-' },
        // Takt 3
        { pitch: 'D4', durationBeats: 4, lyric: '-her,' },
        // Takt 4
        { pitch: 'E4', durationBeats: 1.5, lyric: 'seh' },
        { pitch: 'F4', durationBeats: 0.5, lyric: 'ich' },
        { pitch: 'G4', durationBeats: 1, lyric: 'dich' },
        { pitch: 'E4', durationBeats: 1, lyric: 'im' },

        // Takt 5
        { pitch: 'C5', durationBeats: 2, lyric: 'Strah-' },
        { pitch: 'G4', durationBeats: 2, lyric: '-len-' },
        // Takt 6
        { pitch: 'F4', durationBeats: 2, lyric: '-meer,' },
        { pitch: 'E4', durationBeats: 2, lyric: 'dich,' },
        // Takt 7
        { pitch: 'D4', durationBeats: 3, lyric: 'du' },
        { pitch: 'G4', durationBeats: 1, lyric: 'Hoch-' },
        // Takt 8
        { pitch: 'E4', durationBeats: 1.5, lyric: '-er-' },
        { pitch: 'F4', durationBeats: 0.5, lyric: '-ha-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-be-' },
        { pitch: 'A4', durationBeats: 1, lyric: '-ner,' },

        // Takt 9
        { pitch: 'G4', durationBeats: 2, lyric: 'Herr-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-li-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-cher!' },
        // Takt 10
        { pitch: 'D4', durationBeats: 2, lyric: 'Wenn' },
        { pitch: 'G4', durationBeats: 2, lyric: 'der' },
        // Takt 11
        { pitch: 'C5', durationBeats: 1.5, lyric: 'Al-' },
        { pitch: 'B4', durationBeats: 0.5, lyric: '-pen-' },
        { pitch: 'A4', durationBeats: 1, lyric: '-firn' },
        { pitch: 'G4', durationBeats: 1, lyric: 'sich' },
        // Takt 12
        { pitch: 'F4', durationBeats: 2, lyric: 'röt-' },
        { pitch: 'E4', durationBeats: 2, lyric: '-et,' },

        // Takt 13
        { pitch: 'D4', durationBeats: 3, lyric: 'be-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-tet,' },
        // Takt 14
        { pitch: 'E4', durationBeats: 1, lyric: 'frei-' },
        { pitch: 'C4', durationBeats: 1, lyric: '-e' },
        { pitch: 'F4', durationBeats: 1, lyric: 'Schwei-' },
        { pitch: 'D4', durationBeats: 1, lyric: '-zer,' },
        // Takt 15
        { pitch: 'C4', durationBeats: 2, lyric: 'be-' },
        { pitch: 'B3', durationBeats: 2, lyric: '-tet,' },
        // Takt 16
        { pitch: 'C4', durationBeats: 4, lyric: 'Gott!' }
      ]
    }
  },
  {
    code: 'NL',
    name: 'Niederlande',
    anthemTitle: 'Het Wilhelmus',
    composer: 'Adrianus Valerius (Arr.)',
    composerDates: '1575–1625',
    composedYear: '1568',
    era: 'Renaissance',
    continent: 'europe',
    flagEmoji: '🇳🇱',
    funFact: 'Sie gilt als die älteste Nationalhymne der Welt! Das Gedicht ist ein Akrostichon: Die Anfangsbuchstaben ergeben den Namen Willem van Nassov.',
    didacticTip: 'Die Renaissance-Melodie hat einen stolzen, gemessenen Schritt – wie ein historischer Hoftanz.',
    story15s: 'Die Melodie geht auf ein französisches Spottlied aus dem 16. Jahrhundert zurück, das Valerius in sein berühmtes Lautenbuch aufnahm.',
    mapCoordinates: { x: 48, y: 34 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'F-Dur',
      defaultBpm: 88,
      barsCount: 16,
      notes: [
        // Takt 1
        { pitch: 'C4', durationBeats: 1, lyric: 'Wil-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-hel-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-mus' },
        { pitch: 'G4', durationBeats: 1, lyric: 'van' },
        // Takt 2
        { pitch: 'A4', durationBeats: 2, lyric: 'Nas-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-sou-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-we' },
        // Takt 3
        { pitch: 'G4', durationBeats: 1, lyric: 'ben' },
        { pitch: 'A4', durationBeats: 1, lyric: 'ik,' },
        { pitch: 'Bb4', durationBeats: 1, lyric: 'van' },
        { pitch: 'A4', durationBeats: 1, lyric: 'duit-' },
        // Takt 4
        { pitch: 'G4', durationBeats: 2, lyric: '-schen' },
        { pitch: 'F4', durationBeats: 2, lyric: 'bloed,' },

        // Takt 5
        { pitch: 'C4', durationBeats: 1, lyric: 'den' },
        { pitch: 'F4', durationBeats: 1, lyric: 'va-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-der-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-land' },
        // Takt 6
        { pitch: 'A4', durationBeats: 2, lyric: 'ge-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-trou-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-we' },
        // Takt 7
        { pitch: 'G4', durationBeats: 1, lyric: 'blijf' },
        { pitch: 'A4', durationBeats: 1, lyric: 'ik' },
        { pitch: 'Bb4', durationBeats: 1, lyric: 'tot' },
        { pitch: 'A4', durationBeats: 1, lyric: 'in' },
        // Takt 8
        { pitch: 'G4', durationBeats: 2, lyric: 'den' },
        { pitch: 'F4', durationBeats: 2, lyric: 'dood.' },

        // Takt 9
        { pitch: 'A4', durationBeats: 1, lyric: 'Een' },
        { pitch: 'A4', durationBeats: 1, lyric: 'prin-' },
        { pitch: 'Bb4', durationBeats: 1, lyric: '-sen' },
        { pitch: 'C5', durationBeats: 1, lyric: 'van' },
        // Takt 10
        { pitch: 'D5', durationBeats: 2, lyric: 'O-' },
        { pitch: 'C5', durationBeats: 2, lyric: '-ran-' },
        // Takt 11
        { pitch: 'Bb4', durationBeats: 1, lyric: '-je' },
        { pitch: 'A4', durationBeats: 1, lyric: 'ben' },
        { pitch: 'G4', durationBeats: 1, lyric: 'ik,' },
        { pitch: 'F4', durationBeats: 1, lyric: 'vrij,' },
        // Takt 12
        { pitch: 'G4', durationBeats: 2, lyric: 'on-' },
        { pitch: 'A4', durationBeats: 2, lyric: '-ver-' },

        // Takt 13
        { pitch: 'F4', durationBeats: 1, lyric: '-veerd,' },
        { pitch: 'G4', durationBeats: 1, lyric: 'den' },
        { pitch: 'A4', durationBeats: 1, lyric: 'ko-' },
        { pitch: 'Bb4', durationBeats: 1, lyric: '-ning' },
        // Takt 14
        { pitch: 'A4', durationBeats: 2, lyric: 'van' },
        { pitch: 'G4', durationBeats: 2, lyric: 'His-' },
        // Takt 15
        { pitch: 'F4', durationBeats: 1, lyric: '-pan-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-je' },
        { pitch: 'A4', durationBeats: 1, lyric: 'heb' },
        { pitch: 'Bb4', durationBeats: 1, lyric: 'ik' },
        // Takt 16
        { pitch: 'A4', durationBeats: 1, lyric: 'al-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-tijd' },
        { pitch: 'F4', durationBeats: 2, lyric: 'ge-ëerd!' }
      ]
    }
  },
  {
    code: 'ES',
    name: 'Spanien',
    anthemTitle: 'Marcha Real',
    composer: 'Manuel de Espinosa',
    composerDates: '† 1810',
    composedYear: '1770',
    era: 'Klassik / Militärmusik',
    continent: 'europe',
    flagEmoji: '🇪🇸',
    funFact: 'Die spanische Hymne ist eine von ganz wenigen Hymnen auf der Welt, die offiziell keinen Liedtext hat – sie wird rein instrumental gespielt!',
    didacticTip: 'Marschrhythmus pur! Achte auf die punktierten Viertelnoten und das königliche Tempo.',
    story15s: 'Espinosa veröffentlichte das Werk 1761 im Buch der Regiments-Märsche. König Karl III. erhob sie zum Ehremarsch der spanischen Krone.',
    mapCoordinates: { x: 43, y: 47 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'C-Dur',
      defaultBpm: 100,
      barsCount: 16,
      notes: [
        // Takt 1
        { pitch: 'G4', durationBeats: 1.5, lyric: '♪' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'C4', durationBeats: 1, lyric: '♪' },
        { pitch: 'E4', durationBeats: 1, lyric: '♪' },
        // Takt 2
        { pitch: 'G4', durationBeats: 1.5, lyric: '♪' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'C4', durationBeats: 2, lyric: '♪' },
        // Takt 3
        { pitch: 'F4', durationBeats: 1.5, lyric: '♪' },
        { pitch: 'D4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'B3', durationBeats: 1, lyric: '♪' },
        { pitch: 'D4', durationBeats: 1, lyric: '♪' },
        // Takt 4
        { pitch: 'F4', durationBeats: 1.5, lyric: '♪' },
        { pitch: 'D4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'B3', durationBeats: 2, lyric: '♪' },

        // Takt 5
        { pitch: 'G4', durationBeats: 1.5, lyric: '♪' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'C4', durationBeats: 1, lyric: '♪' },
        { pitch: 'E4', durationBeats: 1, lyric: '♪' },
        // Takt 6
        { pitch: 'G4', durationBeats: 1.5, lyric: '♪' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'C4', durationBeats: 2, lyric: '♪' },
        // Takt 7
        { pitch: 'D4', durationBeats: 1, lyric: '♪' },
        { pitch: 'E4', durationBeats: 1, lyric: '♪' },
        { pitch: 'F4', durationBeats: 1, lyric: '♪' },
        { pitch: 'G4', durationBeats: 1, lyric: '♪' },
        // Takt 8
        { pitch: 'E4', durationBeats: 2, lyric: '♪' },
        { pitch: 'C4', durationBeats: 2, lyric: '♪' },

        // Takt 9
        { pitch: 'E4', durationBeats: 1.5, lyric: '♪' },
        { pitch: 'F4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'G4', durationBeats: 1, lyric: '♪' },
        { pitch: 'G4', durationBeats: 1, lyric: '♪' },
        // Takt 10
        { pitch: 'A4', durationBeats: 1.5, lyric: '♪' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'F4', durationBeats: 2, lyric: '♪' },
        // Takt 11
        { pitch: 'D4', durationBeats: 1.5, lyric: '♪' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'F4', durationBeats: 1, lyric: '♪' },
        { pitch: 'F4', durationBeats: 1, lyric: '♪' },
        // Takt 12
        { pitch: 'G4', durationBeats: 1.5, lyric: '♪' },
        { pitch: 'F4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'E4', durationBeats: 2, lyric: '♪' },

        // Takt 13
        { pitch: 'C4', durationBeats: 1.5, lyric: '♪' },
        { pitch: 'D4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'E4', durationBeats: 1, lyric: '♪' },
        { pitch: 'E4', durationBeats: 1, lyric: '♪' },
        // Takt 14
        { pitch: 'F4', durationBeats: 1.5, lyric: '♪' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'D4', durationBeats: 2, lyric: '♪' },
        // Takt 15
        { pitch: 'G4', durationBeats: 1, lyric: '♪' },
        { pitch: 'F4', durationBeats: 1, lyric: '♪' },
        { pitch: 'E4', durationBeats: 1, lyric: '♪' },
        { pitch: 'D4', durationBeats: 1, lyric: '♪' },
        // Takt 16
        { pitch: 'C4', durationBeats: 4, lyric: '♪' }
      ]
    }
  },
  {
    code: 'US',
    name: 'USA',
    anthemTitle: 'The Star-Spangled Banner',
    composer: 'John Stafford Smith',
    composerDates: '1750–1836',
    composedYear: '1775',
    era: 'Klassik',
    continent: 'americas',
    flagEmoji: '🇺🇸',
    funFact: 'Die Melodie war ursprünglich ein britisches Clublied namens "To Anacreon in Heaven". Francis Scott Key schrieb seinen Text während einer Schlacht 1814.',
    didacticTip: 'Großer Tonumfang! Übe den Oktavsprung am Anfang langsam, um die Intonation sicher zu treffen.',
    story15s: 'Im Krieg von 1812 beobachtete Key die Beschießung von Fort McHenry. Als am Morgen die US-Flagge immer noch wehte, dichtete er die Hymne.',
    mapCoordinates: { x: 22, y: 38 },
    score: {
      timeSignature: '3/4',
      tonalCenter: 'C-Dur',
      defaultBpm: 84,
      barsCount: 16,
      notes: [
        // Takt 1
        { pitch: 'G3', durationBeats: 0.75, lyric: 'O' },
        { pitch: 'E4', durationBeats: 0.25, lyric: 'say' },
        { pitch: 'C4', durationBeats: 1, lyric: 'can' },
        { pitch: 'E4', durationBeats: 1, lyric: 'you' },
        // Takt 2
        { pitch: 'G4', durationBeats: 1, lyric: 'see,' },
        { pitch: 'C5', durationBeats: 2, lyric: 'by' },
        // Takt 3
        { pitch: 'E5', durationBeats: 0.75, lyric: 'the' },
        { pitch: 'D5', durationBeats: 0.25, lyric: 'dawn\'s' },
        { pitch: 'C5', durationBeats: 1, lyric: 'ear-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-ly' },
        // Takt 4
        { pitch: 'F#4', durationBeats: 1, lyric: 'light,' },
        { pitch: 'G4', durationBeats: 2, lyric: 'what' },

        // Takt 5
        { pitch: 'G4', durationBeats: 1, lyric: 'so' },
        { pitch: 'E5', durationBeats: 1, lyric: 'proud-' },
        { pitch: 'D5', durationBeats: 1, lyric: '-ly' },
        // Takt 6
        { pitch: 'C5', durationBeats: 1, lyric: 'we' },
        { pitch: 'B4', durationBeats: 2, lyric: 'hailed' },
        // Takt 7
        { pitch: 'A4', durationBeats: 0.5, lyric: 'at' },
        { pitch: 'B4', durationBeats: 0.5, lyric: 'the' },
        { pitch: 'C5', durationBeats: 1, lyric: 'twi-' },
        { pitch: 'C5', durationBeats: 1, lyric: '-light\'s' },
        // Takt 8
        { pitch: 'G4', durationBeats: 1, lyric: 'last' },
        { pitch: 'E4', durationBeats: 1, lyric: 'gleam-' },
        { pitch: 'C4', durationBeats: 1, lyric: '-ing?' },

        // Takt 9
        { pitch: 'E5', durationBeats: 1, lyric: 'And' },
        { pitch: 'E5', durationBeats: 1, lyric: 'the' },
        { pitch: 'E5', durationBeats: 1, lyric: 'rock-' },
        // Takt 10
        { pitch: 'F5', durationBeats: 1, lyric: '-ets\'' },
        { pitch: 'G5', durationBeats: 2, lyric: 'red' },
        // Takt 11
        { pitch: 'G5', durationBeats: 1, lyric: 'glare,' },
        { pitch: 'F5', durationBeats: 0.5, lyric: 'the' },
        { pitch: 'E5', durationBeats: 0.5, lyric: 'bombs' },
        { pitch: 'D5', durationBeats: 1, lyric: 'burst-' },
        // Takt 12
        { pitch: 'E5', durationBeats: 1, lyric: '-ing' },
        { pitch: 'F5', durationBeats: 2, lyric: 'in' },

        // Takt 13
        { pitch: 'F5', durationBeats: 1, lyric: 'air,' },
        { pitch: 'E5', durationBeats: 0.5, lyric: 'gave' },
        { pitch: 'D5', durationBeats: 0.5, lyric: 'proof' },
        { pitch: 'C5', durationBeats: 1, lyric: 'through' },
        // Takt 14
        { pitch: 'B4', durationBeats: 1, lyric: 'the' },
        { pitch: 'A4', durationBeats: 1, lyric: 'night' },
        { pitch: 'B4', durationBeats: 1, lyric: 'that' },
        // Takt 15
        { pitch: 'C5', durationBeats: 1, lyric: 'our' },
        { pitch: 'D5', durationBeats: 1, lyric: 'flag' },
        { pitch: 'E5', durationBeats: 1, lyric: 'was' },
        // Takt 16
        { pitch: 'D5', durationBeats: 1, lyric: 'still' },
        { pitch: 'C5', durationBeats: 2, lyric: 'there!' }
      ]
    }
  },
  {
    code: 'CA',
    name: 'Kanada',
    anthemTitle: 'O Canada',
    composer: 'Calixa Lavallée',
    composerDates: '1842–1891',
    composedYear: '1880',
    era: 'Romantik',
    continent: 'americas',
    flagEmoji: '🇨🇦',
    funFact: 'Lavallée war ein gefeierter Konzertpianist und Kornettist. Er komponierte die Hymne für den Saint-Jean-Baptiste-Feiertag in Québec.',
    didacticTip: 'Breiter, würdevoller Ton. Die Melodie steigt heroisch an – stütze jeden Ton mit gutem Atem.',
    story15s: 'Erst 100 Jahre nach ihrer Entstehung wurde "O Canada" 1980 durch ein Gesetz offiziell zur Nationalhymne Kanadas erklärt!',
    mapCoordinates: { x: 20, y: 28 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'F-Dur',
      defaultBpm: 80,
      barsCount: 16,
      notes: [
        // Takt 1
        { pitch: 'C4', durationBeats: 1.5, lyric: 'O' },
        { pitch: 'F4', durationBeats: 1.5, lyric: 'Ca-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-na-' },
        // Takt 2
        { pitch: 'G4', durationBeats: 1, lyric: '-da!' },
        { pitch: 'A4', durationBeats: 1.5, lyric: 'Our' },
        { pitch: 'Bb4', durationBeats: 0.5, lyric: 'home' },
        { pitch: 'C5', durationBeats: 1, lyric: 'and' },
        // Takt 3
        { pitch: 'A4', durationBeats: 1, lyric: 'na-' },
        { pitch: 'G4', durationBeats: 2, lyric: '-tive' },
        { pitch: 'F4', durationBeats: 1, lyric: 'land!' },
        // Takt 4
        { pitch: 'G4', durationBeats: 1.5, lyric: 'True' },
        { pitch: 'A4', durationBeats: 0.5, lyric: 'pa-' },
        { pitch: 'Bb4', durationBeats: 1, lyric: '-triot' },
        { pitch: 'G4', durationBeats: 1, lyric: 'love' },

        // Takt 5
        { pitch: 'A4', durationBeats: 1, lyric: 'in' },
        { pitch: 'Bb4', durationBeats: 1.5, lyric: 'all' },
        { pitch: 'C5', durationBeats: 0.5, lyric: 'of' },
        { pitch: 'D5', durationBeats: 1, lyric: 'us' },
        // Takt 6
        { pitch: 'C5', durationBeats: 1, lyric: 'com-' },
        { pitch: 'Bb4', durationBeats: 2, lyric: '-mand.' },
        { pitch: 'A4', durationBeats: 1, lyric: 'With' },
        // Takt 7
        { pitch: 'C5', durationBeats: 1.5, lyric: 'glow-' },
        { pitch: 'D5', durationBeats: 0.5, lyric: '-ing' },
        { pitch: 'C5', durationBeats: 1, lyric: 'hearts' },
        { pitch: 'Bb4', durationBeats: 1, lyric: 'we' },
        // Takt 8
        { pitch: 'A4', durationBeats: 1, lyric: 'see' },
        { pitch: 'G4', durationBeats: 1, lyric: 'thee' },
        { pitch: 'A4', durationBeats: 1, lyric: 'rise,' },
        { pitch: 'Bb4', durationBeats: 1, lyric: 'The' },

        // Takt 9
        { pitch: 'C5', durationBeats: 1.5, lyric: 'True' },
        { pitch: 'D5', durationBeats: 0.5, lyric: 'North' },
        { pitch: 'C5', durationBeats: 1, lyric: 'strong' },
        { pitch: 'Bb4', durationBeats: 1, lyric: 'and' },
        // Takt 10
        { pitch: 'A4', durationBeats: 1, lyric: 'free!' },
        { pitch: 'G4', durationBeats: 2, lyric: 'From' },
        { pitch: 'C4', durationBeats: 1, lyric: 'far' },
        // Takt 11
        { pitch: 'C4', durationBeats: 1.5, lyric: 'and' },
        { pitch: 'F4', durationBeats: 1.5, lyric: 'wide,' },
        { pitch: 'F4', durationBeats: 1, lyric: 'O' },
        // Takt 12
        { pitch: 'G4', durationBeats: 1, lyric: 'Ca-' },
        { pitch: 'A4', durationBeats: 2, lyric: '-na-' },
        { pitch: 'Bb4', durationBeats: 1, lyric: '-da,' },

        // Takt 13
        { pitch: 'D5', durationBeats: 1.5, lyric: 'we' },
        { pitch: 'C5', durationBeats: 0.5, lyric: 'stand' },
        { pitch: 'Bb4', durationBeats: 1, lyric: 'on' },
        { pitch: 'A4', durationBeats: 1, lyric: 'guard' },
        // Takt 14
        { pitch: 'G4', durationBeats: 3, lyric: 'for' },
        { pitch: 'C5', durationBeats: 1, lyric: 'thee.' },
        // Takt 15
        { pitch: 'C5', durationBeats: 2, lyric: 'O' },
        { pitch: 'G4', durationBeats: 1.5, lyric: 'Ca-na-' },
        { pitch: 'A4', durationBeats: 0.5, lyric: '-da,' },
        // Takt 16
        { pitch: 'F4', durationBeats: 4, lyric: 'stand on guard!' }
      ]
    }
  },
  {
    code: 'JP',
    name: 'Japan',
    anthemTitle: 'Kimi Ga Yo',
    composer: 'Hiromori Hayashi / Franz Eckert',
    composerDates: '† 1896 / † 1916',
    composedYear: '1880',
    era: 'Traditionell / Meiji-Ära',
    continent: 'asia',
    flagEmoji: '🇯🇵',
    funFact: 'Mit nur 32 Silben ist Kimi Ga Yo eine der kürzesten Nationalhymnen der Welt. Der Text stammt aus einer Gedichtsammlung des 10. Jahrhunderts!',
    didacticTip: 'Basiert auf der traditionellen Gagaku-Hofmusik. Sehr getragenes Tempo und meditative Ruhe beim Spielen.',
    story15s: 'Der preußische Militärmusiker Franz Eckert arrangierte die traditionelle Melodie 1880 für westliche Orchesterinstrumente.',
    mapCoordinates: { x: 84, y: 44 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'D-Dorisch',
      defaultBpm: 60,
      barsCount: 16,
      notes: [
        // Takt 1
        { pitch: 'D4', durationBeats: 2, lyric: 'Ki-' },
        { pitch: 'C4', durationBeats: 2, lyric: '-mi' },
        // Takt 2
        { pitch: 'D4', durationBeats: 2, lyric: 'ga' },
        { pitch: 'E4', durationBeats: 2, lyric: 'yo' },
        // Takt 3
        { pitch: 'G4', durationBeats: 2, lyric: 'wa' },
        { pitch: 'E4', durationBeats: 2, lyric: 'chi-' },
        // Takt 4
        { pitch: 'D4', durationBeats: 4, lyric: '-yo ni' },

        // Takt 5
        { pitch: 'E4', durationBeats: 2, lyric: 'ya-' },
        { pitch: 'G4', durationBeats: 2, lyric: '-chi-' },
        // Takt 6
        { pitch: 'A4', durationBeats: 2, lyric: '-yo' },
        { pitch: 'G4', durationBeats: 1, lyric: 'ni,' },
        { pitch: 'A4', durationBeats: 1, lyric: 'sa-' },
        // Takt 7
        { pitch: 'C5', durationBeats: 2, lyric: '-za-' },
        { pitch: 'B4', durationBeats: 2, lyric: '-re' },
        // Takt 8
        { pitch: 'A4', durationBeats: 2, lyric: 'i-' },
        { pitch: 'G4', durationBeats: 2, lyric: '-shi' },

        // Takt 9
        { pitch: 'E4', durationBeats: 2, lyric: 'no' },
        { pitch: 'G4', durationBeats: 2, lyric: 'i-' },
        // Takt 10
        { pitch: 'A4', durationBeats: 4, lyric: '-wa-o' },
        // Takt 11
        { pitch: 'D5', durationBeats: 2, lyric: 'to' },
        { pitch: 'C5', durationBeats: 2, lyric: 'na-' },
        // Takt 12
        { pitch: 'D5', durationBeats: 4, lyric: '-ri-te' },

        // Takt 13
        { pitch: 'E4', durationBeats: 2, lyric: 'ko-' },
        { pitch: 'G4', durationBeats: 2, lyric: '-ke' },
        // Takt 14
        { pitch: 'A4', durationBeats: 2, lyric: 'no' },
        { pitch: 'G4', durationBeats: 2, lyric: 'mu-' },
        // Takt 15
        { pitch: 'E4', durationBeats: 2, lyric: '-su' },
        { pitch: 'D4', durationBeats: 2, lyric: 'ma-' },
        // Takt 16
        { pitch: 'D4', durationBeats: 4, lyric: '-de.' }
      ]
    }
  },
  {
    code: 'AU',
    name: 'Australien',
    anthemTitle: 'Advance Australia Fair',
    composer: 'Peter Dodds McCormick',
    composerDates: '1834–1916',
    composedYear: '1878',
    era: 'Romantik',
    continent: 'oceania',
    flagEmoji: '🇦🇺',
    funFact: 'McCormick wanderte als schottischer Steinmetz nach Sydney aus und veröffentlichte das Lied unter dem Pseudonym "Amicus" (Freund).',
    didacticTip: 'Froher, aufstrebender Marsch. Halte das Tempo stabil bei 96 BPM.',
    story15s: 'Erst 1984 löste die Melodie "God Save the Queen" nach einer Volksbefragung als offizielle Landeshymne Australiens ab.',
    mapCoordinates: { x: 86, y: 78 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'C-Dur',
      defaultBpm: 96,
      barsCount: 16,
      notes: [
        // Takt 1
        { pitch: 'C4', durationBeats: 1, lyric: 'Aus-' },
        { pitch: 'G4', durationBeats: 1.5, lyric: '-tra-' },
        { pitch: 'F4', durationBeats: 0.5, lyric: '-lians' },
        { pitch: 'E4', durationBeats: 1, lyric: 'all' },
        // Takt 2
        { pitch: 'D4', durationBeats: 1, lyric: 'let' },
        { pitch: 'C4', durationBeats: 2, lyric: 'us' },
        { pitch: 'G4', durationBeats: 1, lyric: 're-' },
        // Takt 3
        { pitch: 'E4', durationBeats: 1, lyric: '-joice,' },
        { pitch: 'G4', durationBeats: 1, lyric: 'for' },
        { pitch: 'C5', durationBeats: 1, lyric: 'we' },
        { pitch: 'B4', durationBeats: 1, lyric: 'are' },
        // Takt 4
        { pitch: 'A4', durationBeats: 1, lyric: 'young' },
        { pitch: 'D5', durationBeats: 2, lyric: 'and' },
        { pitch: 'B4', durationBeats: 1, lyric: 'free;' },

        // Takt 5
        { pitch: 'B4', durationBeats: 1, lyric: 'We\'ve' },
        { pitch: 'C5', durationBeats: 1.5, lyric: 'gold-' },
        { pitch: 'B4', durationBeats: 0.5, lyric: '-en' },
        { pitch: 'A4', durationBeats: 1, lyric: 'soil' },
        // Takt 6
        { pitch: 'G4', durationBeats: 1, lyric: 'and' },
        { pitch: 'E4', durationBeats: 2, lyric: 'wealth' },
        { pitch: 'C4', durationBeats: 1, lyric: 'for' },
        // Takt 7
        { pitch: 'D4', durationBeats: 1, lyric: 'toil,' },
        { pitch: 'E4', durationBeats: 1, lyric: 'our' },
        { pitch: 'F4', durationBeats: 1, lyric: 'home' },
        { pitch: 'D4', durationBeats: 1, lyric: 'is' },
        // Takt 8
        { pitch: 'G4', durationBeats: 3, lyric: 'girt' },
        { pitch: 'G4', durationBeats: 1, lyric: 'by sea;' },

        // Takt 9
        { pitch: 'E5', durationBeats: 1, lyric: 'Our' },
        { pitch: 'D5', durationBeats: 1.5, lyric: 'land' },
        { pitch: 'C5', durationBeats: 0.5, lyric: 'a-' },
        { pitch: 'B4', durationBeats: 1, lyric: '-bounds' },
        // Takt 10
        { pitch: 'A4', durationBeats: 1, lyric: 'in' },
        { pitch: 'G4', durationBeats: 2, lyric: 'na-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-ture\'s' },
        // Takt 11
        { pitch: 'F4', durationBeats: 1, lyric: 'gifts' },
        { pitch: 'G4', durationBeats: 1, lyric: 'of' },
        { pitch: 'A4', durationBeats: 1, lyric: 'beau-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-ty' },
        // Takt 12
        { pitch: 'D4', durationBeats: 3, lyric: 'rich' },
        { pitch: 'G4', durationBeats: 1, lyric: 'and rare;' },

        // Takt 13
        { pitch: 'C5', durationBeats: 1.5, lyric: 'In' },
        { pitch: 'B4', durationBeats: 0.5, lyric: 'his-' },
        { pitch: 'A4', durationBeats: 1, lyric: '-to-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-ry\'s' },
        // Takt 14
        { pitch: 'F4', durationBeats: 1, lyric: 'page,' },
        { pitch: 'E4', durationBeats: 2, lyric: 'let' },
        { pitch: 'A4', durationBeats: 1, lyric: 'ev-ery' },
        // Takt 15
        { pitch: 'G4', durationBeats: 1, lyric: 'stage' },
        { pitch: 'C4', durationBeats: 1, lyric: 'Ad-' },
        { pitch: 'D4', durationBeats: 1.5, lyric: '-vance' },
        { pitch: 'E4', durationBeats: 0.5, lyric: 'Aus-' },
        // Takt 16
        { pitch: 'D4', durationBeats: 1, lyric: '-tra-lia' },
        { pitch: 'C4', durationBeats: 3, lyric: 'Fair!' }
      ]
    }
  },
  {
    code: 'EU',
    name: 'Europa',
    anthemTitle: 'Europahymne (Ode an die Freude)',
    composer: 'Ludwig van Beethoven',
    composerDates: '1770–1827',
    composedYear: '1824',
    era: 'Wiener Klassik / Romantik',
    continent: 'europe',
    flagEmoji: '🇪🇺',
    funFact: 'Die offizielle Hymne der Europäischen Union! Sie steht für Frieden, Freiheit und Solidarität und ist das beliebteste Einstiegsstück an Musikschulen.',
    didacticTip: 'Die perfekte Hymne für Schüler! Schöne Tonleiterstufen ohne weite Sprünge – ideal zum Blattspiel.',
    story15s: 'Beethoven war bereits vollkommen taub, als er das Finale seiner 9. Symphonie mit dieser unsterblichen Melodie vollendete.',
    mapCoordinates: { x: 50, y: 38 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'C-Dur',
      defaultBpm: 104,
      barsCount: 16,
      notes: [
        // Takt 1
        { pitch: 'E4', durationBeats: 1, lyric: 'Freu-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-de,' },
        { pitch: 'F4', durationBeats: 1, lyric: 'schö-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-ner' },
        // Takt 2
        { pitch: 'G4', durationBeats: 1, lyric: 'Göt-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-ter-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-fun-' },
        { pitch: 'D4', durationBeats: 1, lyric: '-ken,' },
        // Takt 3
        { pitch: 'C4', durationBeats: 1, lyric: 'Toch-' },
        { pitch: 'C4', durationBeats: 1, lyric: '-ter' },
        { pitch: 'D4', durationBeats: 1, lyric: 'aus' },
        { pitch: 'E4', durationBeats: 1, lyric: 'E-' },
        // Takt 4
        { pitch: 'E4', durationBeats: 1.5, lyric: '-ly-' },
        { pitch: 'D4', durationBeats: 0.5, lyric: '-si-' },
        { pitch: 'D4', durationBeats: 2, lyric: '-um,' },

        // Takt 5
        { pitch: 'E4', durationBeats: 1, lyric: 'wir' },
        { pitch: 'E4', durationBeats: 1, lyric: 'be-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-tre-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-ten' },
        // Takt 6
        { pitch: 'G4', durationBeats: 1, lyric: 'feu-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-er-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-trun-' },
        { pitch: 'D4', durationBeats: 1, lyric: '-ken,' },
        // Takt 7
        { pitch: 'C4', durationBeats: 1, lyric: 'Himm-' },
        { pitch: 'C4', durationBeats: 1, lyric: '-li-' },
        { pitch: 'D4', durationBeats: 1, lyric: '-sche,' },
        { pitch: 'E4', durationBeats: 1, lyric: 'dein' },
        // Takt 8
        { pitch: 'D4', durationBeats: 1.5, lyric: 'Hei-' },
        { pitch: 'C4', durationBeats: 0.5, lyric: '-lig-' },
        { pitch: 'C4', durationBeats: 2, lyric: '-tum!' },

        // Takt 9
        { pitch: 'D4', durationBeats: 1, lyric: 'Dei-' },
        { pitch: 'D4', durationBeats: 1, lyric: '-ne' },
        { pitch: 'E4', durationBeats: 1, lyric: 'Zau-' },
        { pitch: 'C4', durationBeats: 1, lyric: '-ber' },
        // Takt 10
        { pitch: 'D4', durationBeats: 1, lyric: 'bin-' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '-den' },
        { pitch: 'F4', durationBeats: 0.5, lyric: 'wie-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-der,' },
        { pitch: 'C4', durationBeats: 1, lyric: 'was' },
        // Takt 11
        { pitch: 'D4', durationBeats: 1, lyric: 'die' },
        { pitch: 'E4', durationBeats: 0.5, lyric: 'Mo-' },
        { pitch: 'F4', durationBeats: 0.5, lyric: '-de' },
        { pitch: 'E4', durationBeats: 1, lyric: 'streng' },
        { pitch: 'D4', durationBeats: 1, lyric: 'ge-' },
        // Takt 12
        { pitch: 'C4', durationBeats: 1, lyric: '-teilt;' },
        { pitch: 'D4', durationBeats: 1, lyric: 'al-' },
        { pitch: 'G3', durationBeats: 2, lyric: '-le' },

        // Takt 13
        { pitch: 'E4', durationBeats: 1, lyric: 'Men-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-schen' },
        { pitch: 'F4', durationBeats: 1, lyric: 'wer-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-den' },
        // Takt 14
        { pitch: 'G4', durationBeats: 1, lyric: 'Brü-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-der,' },
        { pitch: 'E4', durationBeats: 1, lyric: 'wo' },
        { pitch: 'D4', durationBeats: 1, lyric: 'dein' },
        // Takt 15
        { pitch: 'C4', durationBeats: 1, lyric: 'sanf-' },
        { pitch: 'C4', durationBeats: 1, lyric: '-ter' },
        { pitch: 'D4', durationBeats: 1, lyric: 'Flü-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-gel' },
        // Takt 16
        { pitch: 'D4', durationBeats: 1.5, lyric: 'weilt,' },
        { pitch: 'C4', durationBeats: 0.5, lyric: 'ja' },
        { pitch: 'C4', durationBeats: 2, lyric: 'weilt!' }
      ]
    }
  }
];

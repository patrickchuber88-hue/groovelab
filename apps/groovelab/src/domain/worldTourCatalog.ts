/**
 * 🌍 Campus-Groovelab World Tour Catalog (2027 Monolith Goldstandard)
 * 
 * Curated living world music traditions, traditional folk songs, polyrhythms,
 * and classical master scores in Concert Pitch C with authentic lyrics,
 * historical facts, pedagogical tips and 3-Tier Didactics (Junior, Teen, Pro).
 * 
 * 100 % Public Domain (Gemeinfrei p.m.a. > 70 Jahre & überliefertes Weltkulturerbe).
 */

import { ContinentDefinition, WorldTourCountry } from '../types/worldTour';

export const CONTINENTS: ContinentDefinition[] = [
  { id: 'africa', label: 'Afrika', emoji: '🌍', badgeId: 'wt-continent-africa', color: '#8b5cf6', countriesCount: 3 },
  { id: 'americas', label: 'Amerika', emoji: '🌎', badgeId: 'wt-continent-americas', color: '#f59e0b', countriesCount: 4 },
  { id: 'asia', label: 'Asien & Orient', emoji: '🌏', badgeId: 'wt-continent-asia', color: '#ec4899', countriesCount: 3 },
  { id: 'oceania', label: 'Ozeanien', emoji: '🦘', badgeId: 'wt-continent-oceania', color: '#10b981', countriesCount: 3 },
  { id: 'europe', label: 'Europa', emoji: '🇪🇺', badgeId: 'wt-continent-europe', color: '#3b82f6', countriesCount: 8 }
];

export const WORLD_TOUR_COUNTRIES: WorldTourCountry[] = [
  // ==========================================
  // 1. AFRIKA (Wiege des Grooves & Polyrhythmik)
  // ==========================================
  {
    code: 'WA_KUKU',
    name: 'Westafrika (Guinea / Mali)',
    pieceTitle: 'Kuku (Traditioneller Festtanz)',
    anthemTitle: 'Kuku (Festtanz)',
    composer: 'Manding-Tradition (Überliefert)',
    composerDates: 'Tradition seit dem 13. Jh.',
    composedYear: 'Tradition',
    era: 'Traditionelles Weltkulturerbe',
    continent: 'africa',
    flagEmoji: '🇬🇳',
    regionTitle: 'Manding-Kultur & Savanne',
    funFact: 'Der Kuku-Rhythmus wurde ursprünglich von Frauen an den Flussufern Guineas nach erfolgreichem Fischfang auf Kalebassen gespielt!',
    didacticTip: 'Spüre das 3:2-Verhältnis: Die linke Hand hält den gleichmäßigen Puls, die rechte setzt die synkopierten Akzente.',
    story15s: 'Im alten Mali-Reich erzählten die Djélis (Griots) mit Musik die Geschichte ihres Volkes. Bis heute verbindet der Kuku Tanz, Gesang und Trommelspiel zu einer untrennbaren Einheit.',
    instruments: [
      { name: 'Djembe', family: 'percussion', material: 'Hartholz & Ziegenfell', description: 'Becherförmige Trommel mit warmem Bass und peitschendem Slap.' },
      { name: 'Balafon', family: 'idiophone', material: 'Palisander & Kalebassen-Resonatoren', description: 'Holz-Xylophon mit surrenden Membranen für perlende Melodien.' }
    ],
    mapCoordinates: { x: 46, y: 55 },
    geoCoordinates: { lat: 10.5, lon: -11.0 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'G-Pentatonik',
      defaultBpm: 104,
      barsCount: 8,
      chords: ['G', 'G', 'C', 'D', 'G', 'G', 'C', 'G'],
      improvisationScale: ['G4', 'A4', 'B4', 'D5', 'E5'],
      notes: [
        // Takt 1: Call (Djembe/Balafon Motiv)
        { pitch: 'G4', durationBeats: 1, lyric: 'Ku-', color: '#34a853' },
        { pitch: 'B4', durationBeats: 1, lyric: '-ku', color: '#fbbc05' },
        { pitch: 'D5', durationBeats: 1, lyric: 'sa-', color: '#4285f4' },
        { pitch: 'B4', durationBeats: 1, lyric: '-ba', color: '#fbbc05' },
        // Takt 2: Response
        { pitch: 'A4', durationBeats: 1, lyric: 'bo-', color: '#ea4335' },
        { pitch: 'G4', durationBeats: 1.5, lyric: '-lo', color: '#34a853' },
        { pitch: 'E4', durationBeats: 0.5, lyric: 'ta', color: '#4285f4' },
        { pitch: 'G4', durationBeats: 1, lyric: '♪', color: '#34a853' },
        // Takt 3: Steigerung
        { pitch: 'B4', durationBeats: 0.5, lyric: 'ta', color: '#fbbc05' },
        { pitch: 'D5', durationBeats: 0.5, lyric: 'ki', color: '#4285f4' },
        { pitch: 'E5', durationBeats: 1, lyric: 'tan', color: '#9333ea' },
        { pitch: 'D5', durationBeats: 1, lyric: 'do', color: '#4285f4' },
        { pitch: 'B4', durationBeats: 1, lyric: 'le', color: '#fbbc05' },
        // Takt 4: Landung
        { pitch: 'A4', durationBeats: 1, lyric: 'ku-', color: '#ea4335' },
        { pitch: 'A4', durationBeats: 1, lyric: '-ku', color: '#ea4335' },
        { pitch: 'G4', durationBeats: 2, lyric: 'he!', color: '#34a853' }
      ]
    }
  },
  {
    code: 'WA_JARABI',
    name: 'Senegal / Gambia',
    pieceTitle: 'Jarabi (Manding Kora-Ballade)',
    anthemTitle: 'Jarabi (Kora-Hymne)',
    composer: 'Traditionell (Griot-Klassiker)',
    composerDates: 'Überliefert',
    composedYear: 'Tradition',
    era: 'Griot-Meisterwerk',
    continent: 'africa',
    flagEmoji: '🇸🇳',
    regionTitle: 'Gambia-Flussdelta & Casamance',
    funFact: 'Die Kora hat 21 Saiten und wird mit nur vier Fingern (Daumen und Zeigefinger beider Hände) in atemberaubender Geschwindigkeit gespielt!',
    didacticTip: 'Lass die Arpeggien wie weiche Wassertropfen fließen. Halte das Tempo absolut ruhig.',
    story15s: '„Jarabi“ bedeutet in der Mandinka-Sprache „Leidenschaft“. Es ist eines der berühmtesten Lieder der Savanne und preist die unbezwingbare Kraft der Liebe.',
    instruments: [
      { name: 'Kora', family: 'strings', material: 'Riesenkürbis, Kuhhaut & Angelschnüre', description: '21-saitige Harfenlaute mit himmlisch schwebendem Klang.' }
    ],
    mapCoordinates: { x: 44, y: 52 },
    geoCoordinates: { lat: 14.5, lon: -14.4 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'F-Dur',
      defaultBpm: 88,
      barsCount: 4,
      chords: ['F', 'Bb', 'C', 'F'],
      notes: [
        // Takt 1 (4 Beats)
        { pitch: 'F4', durationBeats: 1, lyric: 'Ja-' },
        { pitch: 'A4', durationBeats: 1, lyric: '-ra-' },
        { pitch: 'C5', durationBeats: 1.5, lyric: '-bi' },
        { pitch: 'Bb4', durationBeats: 0.5, lyric: 'o' },
        // Takt 2 (4 Beats)
        { pitch: 'A4', durationBeats: 1, lyric: 'ja-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-ra-' },
        { pitch: 'F4', durationBeats: 2, lyric: '-bi' },
        // Takt 3 (4 Beats)
        { pitch: 'G4', durationBeats: 1, lyric: 'ne' },
        { pitch: 'A4', durationBeats: 1, lyric: 'kan' },
        { pitch: 'Bb4', durationBeats: 1.5, lyric: 'fo' },
        { pitch: 'A4', durationBeats: 0.5, lyric: 'la' },
        // Takt 4 (4 Beats)
        { pitch: 'G4', durationBeats: 1, lyric: 'ja-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-ra-' },
        { pitch: 'F4', durationBeats: 2, lyric: '-bi!' }
      ]
    }
  },
  {
    code: 'ZA_SHOSHO',
    name: 'Südafrika (Zulu / Xhosa)',
    pieceTitle: 'Shosholoza (Traditioneller Chorgesang)',
    anthemTitle: 'Shosholoza',
    composer: 'Traditionell (Wanderarbeiter-Hymne)',
    composerDates: 'Tradition des 19. Jh.',
    composedYear: 'ca. 1880',
    era: 'Traditionelles Kulturerbe',
    continent: 'africa',
    flagEmoji: '🇿🇦',
    regionTitle: 'Drakensberge & Highveld',
    funFact: 'Das Wort „Shosholoza“ ahmt den Rhythmus einer dampfenden Dampflokomotive nach: Sch-Sch-Shosholoza!',
    didacticTip: 'Atme rhythmisch ein und aus. Betone die erste und dritte Zählzeit mit kräftigem Stampfen.',
    story15s: 'Gesungen von Minenarbeitern, entwickelte sich Shosholoza zur inoffiziellen zweiten Nationalhymne Südafrikas und zum Symbol von Zusammenhalt und Freiheit.',
    mapCoordinates: { x: 54, y: 76 },
    geoCoordinates: { lat: -29.0, lon: 24.5 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'C-Dur',
      defaultBpm: 92,
      barsCount: 4,
      chords: ['C', 'F', 'G', 'C'],
      notes: [
        // Takt 1: Call (4 Beats)
        { pitch: 'G4', durationBeats: 1, lyric: 'Sho-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-sho-' },
        { pitch: 'E4', durationBeats: 1.5, lyric: '-lo-' },
        { pitch: 'C4', durationBeats: 0.5, lyric: '-za' },
        // Takt 2: Response (4 Beats)
        { pitch: 'D4', durationBeats: 1, lyric: 'kú-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-le' },
        { pitch: 'C4', durationBeats: 2, lyric: 'ntá-ba' },
        // Takt 3: Steigerung (4 Beats)
        { pitch: 'E4', durationBeats: 1, lyric: 'sti-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-me-' },
        { pitch: 'A4', durationBeats: 1.5, lyric: '-la' },
        { pitch: 'G4', durationBeats: 0.5, lyric: 'si-' },
        // Takt 4: Ankunft (4 Beats)
        { pitch: 'E4', durationBeats: 1, lyric: '-phu-' },
        { pitch: 'D4', durationBeats: 1, lyric: '-me' },
        { pitch: 'C4', durationBeats: 2, lyric: 'he!' }
      ]
    }
  },

  // ==========================================
  // 2. LATEINAMERIKA (Synkopen, Clave & Lebensfreude)
  // ==========================================
  {
    code: 'CU_SON',
    name: 'Kuba (Karibik)',
    pieceTitle: 'Guajira Tradicional (Son Cubano)',
    anthemTitle: 'Son Cubano (Guajira)',
    composer: 'Traditionelle Campesino-Musik',
    composerDates: 'Tradition 19. Jh.',
    composedYear: 'Tradition',
    era: 'Afro-Kubanisches Weltkulturerbe',
    continent: 'americas',
    flagEmoji: '🇨🇺',
    regionTitle: 'Havanna & Viñales-Tal',
    funFact: 'Die Son-Clave ist ein 5-Schlag-Rhythmus (3:2), der das Fundament von Salsa, Rumba und Mambo bildet!',
    didacticTip: 'Spiele die Noten nicht stur auf dem Klick, sondern federe die Synkopen auf die Sechzehntel vor der Zählzeit.',
    story15s: 'Im Osten Kubas verschmolzen spanische Gitarrenmelodien mit westafrikanischen Trommelrhythmen zum Son Cubano – der Mutter aller modernen lateinamerikanischen Tänze.',
    instruments: [
      { name: 'Tres Cubano', family: 'strings', material: 'Holz & 3 Doppelsaiten', description: 'Gitarrenähnliches Instrument mit hellem, perkussivem Strumming.' },
      { name: 'Bongos', family: 'percussion', material: 'Holzkessel & Naturfell', description: 'Zwei kleine verbundene Trommeln (Macho & Hembra).' }
    ],
    mapCoordinates: { x: 26, y: 44 },
    geoCoordinates: { lat: 21.5, lon: -79.5 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'G-Dur',
      defaultBpm: 96,
      barsCount: 4,
      chords: ['G', 'C', 'D7', 'G'],
      notes: [
        // Takt 1 (4 Beats)
        { pitch: 'G4', durationBeats: 0.5, lyric: 'Gua-' },
        { pitch: 'B4', durationBeats: 0.5, lyric: '-ji-' },
        { pitch: 'D5', durationBeats: 1, lyric: '-ra' },
        { pitch: 'C5', durationBeats: 0.5, lyric: 'gua-' },
        { pitch: 'B4', durationBeats: 0.5, lyric: '-tan-' },
        { pitch: 'A4', durationBeats: 1, lyric: '-te' },
        // Takt 2 (4 Beats)
        { pitch: 'D4', durationBeats: 1, lyric: 'son' },
        { pitch: 'F#4', durationBeats: 1, lyric: 'cu-' },
        { pitch: 'G4', durationBeats: 2, lyric: '-ba-no' },
        // Takt 3 (4 Beats)
        { pitch: 'B4', durationBeats: 0.5, lyric: 'can-' },
        { pitch: 'D5', durationBeats: 0.5, lyric: '-ta' },
        { pitch: 'E5', durationBeats: 1, lyric: 'la' },
        { pitch: 'D5', durationBeats: 0.5, lyric: 'tie-' },
        { pitch: 'C5', durationBeats: 0.5, lyric: '-rra' },
        { pitch: 'B4', durationBeats: 1, lyric: 'mía' },
        // Takt 4 (4 Beats)
        { pitch: 'A4', durationBeats: 1, lyric: 'con' },
        { pitch: 'D4', durationBeats: 1, lyric: 'a-' },
        { pitch: 'G4', durationBeats: 2, lyric: '-mor!' }
      ]
    }
  },
  {
    code: 'BR_CHORO',
    name: 'Brasilien (Rio de Janeiro)',
    pieceTitle: 'Tico-Tico no Fubá (Choro-Klassiker)',
    anthemTitle: 'Tico-Tico (Choro)',
    composer: 'Zequinha de Abreu (100% Gemeinfrei)',
    composerDates: '1861–1935 (91 Jahre p.m.a.)',
    composedYear: '1917',
    era: 'Brasilianischer Choro (Belle Époque)',
    continent: 'americas',
    flagEmoji: '🇧🇷',
    regionTitle: 'Guanabara-Bucht & Lapa',
    funFact: '„Tico-Tico“ ist eine kleine brasilianische Zaunammer, die im Maismehl (Fubá) nach Futter pickt – die Melodie imitiert das fröhliche Picken!',
    didacticTip: 'Spiele die Achtelkaskaden locker aus dem Handgelenk mit akzentuiertem Samba-Puls.',
    story15s: 'Zequinha de Abreu komponierte diesen Choro 1917 auf einem Ball in Santa Rita. Heute ist es das weltweit bekannteste Instrumentalstück Brasiliens.',
    instruments: [
      { name: 'Cavaquinho', family: 'strings', material: 'Viersaitige Rhythmusgitarre', description: 'Helles Zupfinstrument, unverzichtbar für Samba und Choro.' },
      { name: 'Pandeiro', family: 'percussion', material: 'Rahmentrommel mit Schellen', description: 'Virtuose brasilianische Handtrommel.' }
    ],
    mapCoordinates: { x: 33, y: 68 },
    geoCoordinates: { lat: -22.9, lon: -43.2 },
    score: {
      timeSignature: '2/4',
      tonalCenter: 'A-Moll',
      defaultBpm: 100,
      barsCount: 4,
      chords: ['Am', 'E7', 'E7', 'Am'],
      notes: [
        // Takt 1 (2 Beats): Spritziges Picken
        { pitch: 'A4', durationBeats: 0.5, lyric: 'Ti-' },
        { pitch: 'C5', durationBeats: 0.5, lyric: '-co-' },
        { pitch: 'B4', durationBeats: 0.5, lyric: '-ti-' },
        { pitch: 'A4', durationBeats: 0.5, lyric: '-co' },
        // Takt 2 (2 Beats): Landung auf der Dominante
        { pitch: 'G#4', durationBeats: 0.5, lyric: 'no' },
        { pitch: 'B4', durationBeats: 0.5, lyric: 'fu-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-bá,' },
        // Takt 3 (2 Beats): Antwort
        { pitch: 'B4', durationBeats: 0.5, lyric: 'o' },
        { pitch: 'D5', durationBeats: 0.5, lyric: 'ti-' },
        { pitch: 'C5', durationBeats: 0.5, lyric: '-co-' },
        { pitch: 'B4', durationBeats: 0.5, lyric: '-ti-' },
        // Takt 4 (2 Beats): Zurück zur Tonika
        { pitch: 'A4', durationBeats: 0.5, lyric: '-co' },
        { pitch: 'C5', durationBeats: 0.5, lyric: 'tá' },
        { pitch: 'A4', durationBeats: 1, lyric: 'a-qui!' }
      ]
    }
  },
  {
    code: 'PE_KASHWA',
    name: 'Anden / Peru (Inka-Tradition)',
    pieceTitle: 'Kashwa (Traditioneller Inka-Erntetanz)',
    anthemTitle: 'Kashwa (Anden-Tanz)',
    composer: 'Quechua-Kultur (Überliefert)',
    composerDates: 'Inka-Reich (15. Jh.)',
    composedYear: 'Tradition',
    era: 'Andine Pentatonik',
    continent: 'americas',
    flagEmoji: '🇵🇪',
    regionTitle: 'Heiliges Tal von Cusco & Titicacasee',
    funFact: 'Die andine Musik nutzt eine 5-Ton-Leiter (Moll-Pentatonik). Ohne Halbtonschritte klingt jede Tonfolge harmonisch!',
    didacticTip: 'Blase oder spiele die Töne mit weichem Anstoß an, als würde der Wind über die Hochebene der Kordilleren wehen.',
    story15s: 'Die Kashwa ist ein ritueller Kreistanz zur Tagundnachtgleiche. Die Hirten dankten Pachamama (Mutter Erde) mit Panflötenklängen für die Maisernte.',
    instruments: [
      { name: 'Siku / Zampoña', family: 'wind', material: 'Anden-Schilfrohr', description: 'Mehrreihige Panflöte mit hauchendem, weit tragendem Ton.' },
      { name: 'Charango', family: 'strings', material: 'Holzkorpus mit 10 Saiten', description: 'Winzige Zupflaute mit silbrigem, schimmerndem Klang.' }
    ],
    mapCoordinates: { x: 28, y: 62 },
    geoCoordinates: { lat: -13.5, lon: -71.9 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'A-Moll Pentatonik',
      defaultBpm: 90,
      barsCount: 4,
      chords: ['Am', 'C', 'G', 'Am'],
      improvisationScale: ['A4', 'C5', 'D5', 'E5', 'G5'],
      notes: [
        // Takt 1 (4 Beats)
        { pitch: 'A4', durationBeats: 1, lyric: 'Ya-' },
        { pitch: 'C5', durationBeats: 1, lyric: '-war' },
        { pitch: 'E5', durationBeats: 2, lyric: 'in-' },
        // Takt 2 (4 Beats)
        { pitch: 'D5', durationBeats: 1, lyric: '-ka' },
        { pitch: 'C5', durationBeats: 1, lyric: 'su-' },
        { pitch: 'A4', durationBeats: 2, lyric: '-yu' },
        // Takt 3 (4 Beats)
        { pitch: 'C5', durationBeats: 1, lyric: 'pa-' },
        { pitch: 'D5', durationBeats: 1, lyric: '-cha-' },
        { pitch: 'E5', durationBeats: 2, lyric: '-ma-' },
        // Takt 4 (4 Beats)
        { pitch: 'G5', durationBeats: 1, lyric: '-ma' },
        { pitch: 'E5', durationBeats: 1, lyric: 'kus-' },
        { pitch: 'A4', durationBeats: 2, lyric: '-ka!' }
      ]
    }
  },

  // ==========================================
  // 3. ASIEN & ORIENT (Koto, Raga & Maqam)
  // ==========================================
  {
    code: 'JP',
    name: 'Japan (Edo-Kultur)',
    pieceTitle: 'Sakura Sakura (Traditionelle Koto-Melodie)',
    anthemTitle: 'Sakura Sakura',
    composer: 'Traditionell (Edo-Periode)',
    composerDates: '17. bis 19. Jahrhundert',
    composedYear: 'Tradition',
    era: 'Traditionelles japanisches Kulturerbe',
    continent: 'asia',
    flagEmoji: '🇯🇵',
    regionTitle: 'Kyōto & Fuji-san',
    funFact: 'Die Insen-Skala hat im Gegensatz zur westlichen Dur-Tonleiter charakteristische Halbtonschritte direkt über dem Grundton!',
    didacticTip: 'Halte die Pausen (Ma) bewusst aus. In der japanischen Musik ist die Stille zwischen den Tönen genauso wichtig wie der Klang.',
    story15s: 'Wenn im Frühling die Kirschblüten aufblühen, feiert ganz Japan „Hanami“. Sakura Sakura preist die flüchtige, kostbare Schönheit des Augenblicks.',
    instruments: [
      { name: 'Koto', family: 'strings', material: 'Paulownia-Holz & Seidensaiten', description: '13-saitige Wölbbrettzither mit beweglichen Stegen.' },
      { name: 'Shakuhachi', family: 'wind', material: 'Bambuswurzel', description: 'Meditative Längsflöte der Zen-Mönche.' }
    ],
    mapCoordinates: { x: 84, y: 38 },
    geoCoordinates: { lat: 36.2, lon: 138.2 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'Insen-Skala (Halbton-Pentatonik)',
      defaultBpm: 76,
      barsCount: 8,
      chords: ['Am', 'Dm', 'E7', 'Am'],
      notes: [
        { pitch: 'A4', durationBeats: 1, lyric: 'Sa-' },
        { pitch: 'A4', durationBeats: 1, lyric: '-ku-' },
        { pitch: 'B4', durationBeats: 2, lyric: '-ra' },
        { pitch: 'A4', durationBeats: 1, lyric: 'sa-' },
        { pitch: 'A4', durationBeats: 1, lyric: '-ku-' },
        { pitch: 'B4', durationBeats: 2, lyric: '-ra,' },
        { pitch: 'A4', durationBeats: 1, lyric: 'ya-' },
        { pitch: 'B4', durationBeats: 1, lyric: '-yo-' },
        { pitch: 'C5', durationBeats: 1, lyric: '-i' },
        { pitch: 'B4', durationBeats: 1, lyric: 'no' },
        { pitch: 'A4', durationBeats: 1, lyric: 'so-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-ra' },
        { pitch: 'E4', durationBeats: 2, lyric: 'wa' }
      ]
    }
  },
  {
    code: 'IN_RAGA',
    name: 'Indien (Klassische Raga-Tradition)',
    pieceTitle: 'Raga Bhupali (Abend-Meditation)',
    anthemTitle: 'Raga Bhupali',
    composer: 'Klassische Hindustani-Tradition',
    composerDates: 'Überliefert seit der Antike',
    composedYear: 'Antike',
    era: 'Klassische Hindustani-Musik',
    continent: 'asia',
    flagEmoji: '🇮🇳',
    regionTitle: 'Varanasi & Ganges-Ufer',
    funFact: 'In Indien wird Musik im sogenannten „Tala“ gemessen – einem zyklischen Rhythmus, den man mit den Händen in die Luft klatscht und winkt!',
    didacticTip: 'Spiele immer mit der gedanklichen Bordun-Note (C3 / G3 im Hintergrund). Der Grundton ist dein sicheres Zuhause.',
    story15s: 'Raga Bhupali wird zur Abenddämmerung gespielt. Seine reinen Dur-Pentatonik-Töne strahlen tiefen Frieden, Heiterkeit und spirituelle Ruhe aus.',
    instruments: [
      { name: 'Sitar', family: 'strings', material: 'Kürbiskorpus & Resonanzsaiten', description: 'Saiteninstrument mit biegsamen Bünden für glissierende Noten.' },
      { name: 'Tabla', family: 'percussion', material: 'Kupferkessel & Hartholz mit Stimmpaste', description: 'Zwei Handtrommeln mit unendlichem Obertonreichtum.' }
    ],
    mapCoordinates: { x: 70, y: 46 },
    geoCoordinates: { lat: 20.6, lon: 78.9 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'Dur-Pentatonik (Sa-Re-Ga-Pa-Dha)',
      defaultBpm: 84,
      barsCount: 4,
      chords: ['C', 'C', 'G', 'C'],
      improvisationScale: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'],
      notes: [
        // Takt 1: Arohana Aufstieg (4 Beats)
        { pitch: 'C4', durationBeats: 1, lyric: 'Sa' },
        { pitch: 'D4', durationBeats: 1, lyric: 'Re' },
        { pitch: 'E4', durationBeats: 2, lyric: 'Ga' },
        // Takt 2: Zum Gipfel (4 Beats)
        { pitch: 'G4', durationBeats: 1, lyric: 'Pa' },
        { pitch: 'A4', durationBeats: 1, lyric: 'Dha' },
        { pitch: 'C5', durationBeats: 2, lyric: 'Sá' },
        // Takt 3: Avarohana Abstieg (4 Beats)
        { pitch: 'C5', durationBeats: 1, lyric: 'Sá' },
        { pitch: 'A4', durationBeats: 1, lyric: 'Dha' },
        { pitch: 'G4', durationBeats: 2, lyric: 'Pa' },
        // Takt 4: Ruhe in Sa (4 Beats)
        { pitch: 'E4', durationBeats: 1, lyric: 'Ga' },
        { pitch: 'D4', durationBeats: 1, lyric: 'Re' },
        { pitch: 'C4', durationBeats: 2, lyric: 'Sa' }
      ]
    }
  },
  {
    code: 'EG_MAQAM',
    name: 'Ägypten / Orient (Arabische Klassik)',
    pieceTitle: 'Lamma Bada Yatathanna (Muwashshah)',
    anthemTitle: 'Lamma Bada (Orient)',
    composer: 'Ibn al-Khatib / Lisan al-Din',
    composerDates: '1313–1374 (14. Jh.)',
    composedYear: 'ca. 1360',
    era: 'Andalusisch-Arabisches Welterbe',
    continent: 'asia',
    flagEmoji: '🇪🇬',
    regionTitle: 'Kairo & Nil-Delta',
    funFact: 'Das Stück steht im 10/8-Takt (Samai Thaqil) – gezählt wird: Dum - - Tek - Dum - Tek - - !',
    didacticTip: 'Genieße die sinnliche Melodie im Maqam Nahawand (entspricht unserem harmonischen Moll mit kleiner Terz).',
    story15s: 'Entstanden im andalusischen Granada, reiste diese Melodie durch die Karawanenwege bis nach Kairo und Bagdad. Sie ist die unsterbliche Hymne der arabischen Welt.',
    instruments: [
      { name: 'Oud', family: 'strings', material: 'Birnenförmige Knickhalslaute', description: 'Die Königin der orientalischen Lauteninstrumente.' },
      { name: 'Riqq', family: 'percussion', material: 'Fischtrommel mit Doppel-Messingschellen', description: 'Hochkomplexes orientalisches Schellentamburin.' }
    ],
    mapCoordinates: { x: 56, y: 44 },
    geoCoordinates: { lat: 26.8, lon: 30.8 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'D-Moll (Maqam Nahawand)',
      defaultBpm: 88,
      barsCount: 4,
      chords: ['Dm', 'Gm', 'A7', 'Dm'],
      notes: [
        // Takt 1 (4 Beats: Lam-mā ba-dā)
        { pitch: 'D4', durationBeats: 2, lyric: 'Lam-' },
        { pitch: 'F4', durationBeats: 1.5, lyric: '-mā' },
        { pitch: 'G4', durationBeats: 0.5, lyric: 'ba-' },
        // Takt 2 (4 Beats: ya-ta-than-nā)
        { pitch: 'A4', durationBeats: 1, lyric: '-dā' },
        { pitch: 'Bb4', durationBeats: 0.5, lyric: 'ya-' },
        { pitch: 'A4', durationBeats: 0.5, lyric: '-ta-' },
        { pitch: 'G4', durationBeats: 2, lyric: '-than-nā' },
        // Takt 3 (4 Beats: hub-bī fa-tān)
        { pitch: 'F4', durationBeats: 1, lyric: 'hub-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-bī' },
        { pitch: 'A4', durationBeats: 2, lyric: 'fa-tān' },
        // Takt 4 (4 Beats: al-ghu-ṣun)
        { pitch: 'G4', durationBeats: 1, lyric: 'al-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-ghu-' },
        { pitch: 'D4', durationBeats: 2, lyric: '-ṣun!' }
      ]
    }
  },

  // ==========================================
  // 4. OZEANIEN (Songlines, Maori & Slack-Key)
  // ==========================================
  {
    code: 'AU',
    name: 'Australien (Aborigine Songlines)',
    pieceTitle: 'Yidaki Songline (Traditioneller Bordun-Puls)',
    anthemTitle: 'Yidaki Songline',
    composer: 'Yolngu-Kultur (Überliefert)',
    composerDates: 'Tradition seit 40.000 Jahren',
    composedYear: 'Tradition',
    era: 'Älteste lebende Musikkultur der Erde',
    continent: 'oceania',
    flagEmoji: '🇦🇺',
    regionTitle: 'Arnhem Land & Rotes Zentrum',
    funFact: 'Das Didgeridoo (traditionell Yidaki genannt) wird aus Eukalyptusbäumen gefertigt, die von Termiten von innen hohl gefressen wurden!',
    didacticTip: 'Halte den Atemfluss konstant. Imitiere mit deiner Stimme Känguru-Hüpfer und Dingo-Rufe.',
    story15s: 'Die Songlines durchziehen ganz Australien wie unsichtbare Landkarten. Wer die Lieder singt, findet stets den Weg durch die Wüste zu frischem Wasser.',
    instruments: [
      { name: 'Didgeridoo (Yidaki)', family: 'wind', material: 'Termiten-ausgehöhlter Eukalyptus', description: 'Tiefer Oberton-Bordun mit Zirkularatmung.' },
      { name: 'Bilma (Clapsticks)', family: 'percussion', material: 'Eisenholz', description: 'Klangstäbe, die den Herzschlag der Traumzeit vorgeben.' }
    ],
    mapCoordinates: { x: 86, y: 74 },
    geoCoordinates: { lat: -25.2, lon: 133.7 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'D-Bordun (Erd-Frequenz)',
      defaultBpm: 90,
      barsCount: 8,
      chords: ['D', 'D', 'D', 'D'],
      notes: [
        { pitch: 'D3', durationBeats: 2, lyric: 'Dum' },
        { pitch: 'D3', durationBeats: 1, lyric: 'ta' },
        { pitch: 'F#3', durationBeats: 1, lyric: 'ki' },
        { pitch: 'A3', durationBeats: 2, lyric: 'woong' },
        { pitch: 'D3', durationBeats: 2, lyric: 'dha' }
      ]
    }
  },
  {
    code: 'NZ_MAORI',
    name: 'Neuseeland (Maori Waiata)',
    pieceTitle: 'Pokarekare Ana (Traditionelles Liebeslied)',
    anthemTitle: 'Pokarekare Ana',
    composer: 'Paraire Tomoana (Gemeinfrei)',
    composerDates: '1874–1944 (Gemeinfrei seit 2015)',
    composedYear: '1914',
    era: 'Traditionelles Maori-Kulturerbe',
    continent: 'oceania',
    flagEmoji: '🇳🇿',
    regionTitle: 'Rotorua & Nordinsel',
    funFact: '„Pokarekare ana“ bedeutet „Die Wellen kräuseln sich auf dem Rotorua-See“ – ein Lied über zwei Liebende aus verfeindeten Stämmen.',
    didacticTip: 'Singe oder spiele mit innigem Legato. Betone die weichen Silben des Maori sanft auf dem Atem.',
    story15s: 'Hinemoa schwamm nachts, nur vom Klang der Flöte ihres Geliebten Tutanekai geleitet, durch den kalten See. Ihre Liebe vereinte die Stämme.',
    instruments: [
      { name: 'Koauau', family: 'wind', material: 'Knochen oder Totara-Holz', description: 'Maori-Nasen- und Mundflöte mit sanftem, klagendem Timbre.' }
    ],
    mapCoordinates: { x: 92, y: 84 },
    geoCoordinates: { lat: -40.9, lon: 174.8 },
    score: {
      timeSignature: '3/4',
      tonalCenter: 'F-Dur',
      defaultBpm: 84,
      barsCount: 4,
      chords: ['F', 'Bb', 'C7', 'F'],
      notes: [
        // Takt 1 (3 Beats)
        { pitch: 'C4', durationBeats: 1, lyric: 'Pō-' },
        { pitch: 'F4', durationBeats: 2, lyric: '-ka-' },
        // Takt 2 (3 Beats)
        { pitch: 'A4', durationBeats: 1, lyric: '-re-' },
        { pitch: 'G4', durationBeats: 2, lyric: '-ka-' },
        // Takt 3 (3 Beats)
        { pitch: 'F4', durationBeats: 1, lyric: '-re' },
        { pitch: 'E4', durationBeats: 2, lyric: 'a-' },
        // Takt 4 (3 Beats)
        { pitch: 'G4', durationBeats: 1, lyric: '-na' },
        { pitch: 'F4', durationBeats: 2, lyric: 'wai!' }
      ]
    }
  },
  {
    code: 'US_HAWAII',
    name: 'Hawaii / Pazifik (Kanaka Maoli)',
    pieceTitle: 'Aloha \'Oe (Königliches Lied des Abschieds)',
    anthemTitle: 'Aloha \'Oe',
    composer: 'Königin Liliʻuokalani',
    composerDates: '1838–1917 (Gemeinfrei seit 1988)',
    composedYear: '1878',
    era: 'Königliches hawaiianisches Erbe',
    continent: 'oceania',
    flagEmoji: '🌺',
    regionTitle: 'Oahu & Mauna Kea',
    funFact: 'Die Ukulele entwickelte sich auf Hawaii aus der portugiesischen Braguinha. Ihr Name bedeutet übersetzt „hüpfender Floh“!',
    didacticTip: 'Strumme die Saiten mit der Zeigefingerkuppe weich von oben nach unten. Halte das Handgelenk vollkommen locker.',
    story15s: 'Königin Liliʻuokalani komponierte dieses Lied nach einem Ritt über die Berge von Maunawili. Es wurde zum ewigen Symbol des Friedens und der hawaiianischen Seele.',
    instruments: [
      { name: 'Ukulele', family: 'strings', material: 'Koa-Holz', description: 'Viersaitiges Instrument mit sonnigem, warmem Zupfklang.' }
    ],
    mapCoordinates: { x: 10, y: 46 },
    geoCoordinates: { lat: 21.3, lon: -157.8 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'C-Dur',
      defaultBpm: 80,
      barsCount: 8,
      chords: ['C', 'F', 'G7', 'C'],
      notes: [
        { pitch: 'C4', durationBeats: 1, lyric: 'A-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-lo-' },
        { pitch: 'G4', durationBeats: 1.5, lyric: '-ha' },
        { pitch: 'F4', durationBeats: 0.5, lyric: '\'oe,' },
        { pitch: 'E4', durationBeats: 1, lyric: 'a-' },
        { pitch: 'D4', durationBeats: 1, lyric: '-lo-' },
        { pitch: 'C4', durationBeats: 2, lyric: '-ha' }
      ]
    }
  },

  // ==========================================
  // 5. EUROPA (Balkan, Keltisch, Klassik & Hymnen)
  // ==========================================
  {
    code: 'BG_HORO',
    name: 'Balkan / Bulgarien (Ungerade Taktarten)',
    pieceTitle: 'Eleno Mome (Traditioneller Reigen im 7/8-Takt)',
    anthemTitle: 'Eleno Mome (7/8 Horo)',
    composer: 'Traditionell (Balkan-Folklore)',
    composerDates: 'Überliefert',
    composedYear: 'Tradition',
    era: 'Traditionelles Balkan-Kulturerbe',
    continent: 'europe',
    flagEmoji: '🇧🇬',
    regionTitle: 'Rhodopen & Thrakien',
    funFact: 'Der 7/8-Takt wird im Balkan nicht symmetrisch gezählt, sondern als: kurz-kurz-LANG (2 + 2 + 3)!',
    didacticTip: 'Zähle laut: „Ei-nes, zwei-es, DREI-E-ER“. Der dritte Schritt ist der verlängerte Sprungschritt im Tanz.',
    story15s: 'Im Reigentanz Horo fassen sich alle Dorfbewohner an den Gürteln. Die bulgarischen Frauenstimmen mit ihren scharfen Reibungen und Dissonanzen faszinieren Musikwissenschaftler weltweit.',
    instruments: [
      { name: 'Gaida', family: 'wind', material: 'Ziegenfell & Pflaumenholz', description: 'Traditioneller Balkan-Dudelsack mit durchgehendem Bordunton.' },
      { name: 'Tupan', family: 'percussion', material: 'Große Zylindertrommel', description: 'Gespielt mit dickem Holzknüppel links und dünner Rute rechts.' }
    ],
    mapCoordinates: { x: 55, y: 34 },
    geoCoordinates: { lat: 42.7, lon: 25.4 },
    score: {
      timeSignature: '7/8',
      subdivisions: [2, 2, 3],
      tonalCenter: 'D-Dorisch',
      defaultBpm: 120,
      barsCount: 2,
      chords: ['Dm', 'C', 'Dm'],
      notes: [
        // Takt 1 (3.5 Beats = 7 Achtel: 2 + 2 + 3)
        { pitch: 'D4', durationBeats: 0.5, lyric: 'E-' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '-le-' },
        { pitch: 'F4', durationBeats: 0.5, lyric: 'mo-' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '-me' },
        { pitch: 'A4', durationBeats: 1.5, lyric: 'E-le!' },
        // Takt 2 (3.5 Beats = 7 Achtel: 2 + 2 + 3)
        { pitch: 'G4', durationBeats: 0.5, lyric: 'hu-' },
        { pitch: 'F4', durationBeats: 0.5, lyric: '-ba-' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '-va' },
        { pitch: 'D4', durationBeats: 0.5, lyric: 'mo-' },
        { pitch: 'D4', durationBeats: 1.5, lyric: '-me!' }
      ]
    }
  },
  {
    code: 'IE_JIG',
    name: 'Irland / Keltisch (Slip Jig)',
    pieceTitle: 'The Butterfly (Traditioneller Slip Jig im 9/8-Takt)',
    anthemTitle: 'The Butterfly (Slip Jig)',
    composer: 'Traditionell (Keltisches Erbe)',
    composerDates: 'Tradition des 19. Jh.',
    composedYear: 'Tradition',
    era: 'Keltische Tanztradition',
    continent: 'europe',
    flagEmoji: '🇮🇪',
    regionTitle: 'Cliffs of Moher & Galway',
    funFact: 'Ein Slip Jig im 9/8-Takt besteht aus drei Dreiergruppen (3 + 3 + 3). Er wird von Solotänzern mit unglaublicher Leichtigkeit auf den Zehenspitzen getanzt!',
    didacticTip: 'Spiele mit federndem Schwung. Versuche kleine Triller (Cuts) auf den betonten Noten einzubauen.',
    story15s: 'The Butterfly imitiert das scheinbar schwerelose Flattern eines Schmetterlings über den grünen irischen Wiesen von Clare.',
    instruments: [
      { name: 'Tin Whistle', family: 'wind', material: 'Weißblech & Holzblock', description: 'Irische Schnabelflöte mit fröhlichem, vogelartigem Klang.' },
      { name: 'Bodhrán', family: 'percussion', material: 'Ziegenfell & Eschenholzrahmen', description: 'Irische Rahmentrommel, mit doppelseitigem Holztipper geschlagen.' }
    ],
    mapCoordinates: { x: 44, y: 30 },
    geoCoordinates: { lat: 53.4, lon: -8.2 },
    score: {
      timeSignature: '9/8',
      subdivisions: [3, 3, 3],
      tonalCenter: 'E-Dorisch',
      defaultBpm: 110,
      barsCount: 2,
      chords: ['Em', 'D', 'Em'],
      notes: [
        // Takt 1 (4.5 Beats = 9 Achtel: 3 + 3 + 3)
        { pitch: 'B4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'B4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'F#4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'D4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '♪' },
        // Takt 2 (4.5 Beats = 9 Achtel: 3 + 3 + 3)
        { pitch: 'B4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'B4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'F#4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'D4', durationBeats: 0.5, lyric: '♪' },
        { pitch: 'E4', durationBeats: 0.5, lyric: '♪' }
      ]
    }
  },
  {
    code: 'DE',
    name: 'Deutschland (Wiener Klassik)',
    pieceTitle: 'Lied der Deutschen (3. Strophe: Haydn)',
    anthemTitle: 'Deutsche Nationalhymne (Haydn)',
    composer: 'Joseph Haydn',
    composerDates: '1732–1809',
    composedYear: '1797',
    era: 'Wiener Klassik',
    continent: 'europe',
    flagEmoji: '🇩🇪',
    regionTitle: 'Wien & Eisenstadt',
    funFact: 'Haydn komponierte diese Melodie ursprünglich im berühmten Kaiserquartett op. 76 Nr. 3. Als Nationalhymne gilt verfassungsrechtlich ausschließlich die 3. Strophe.',
    didacticTip: 'Achte im zweiten Takt auf die punktierte Viertelnote – zähle bewusst: 1 - und - 2!',
    story15s: 'Joseph Haydn ließ sich für diese Melodie von einem alten kroatischen Volkslied inspirieren. Sie gilt bis heute als Musterbeispiel klassischer Periodenbildung.',
    mapCoordinates: { x: 50, y: 32 },
    geoCoordinates: { lat: 51.5, lon: 10.5 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'G-Dur',
      defaultBpm: 84,
      barsCount: 4,
      chords: ['G', 'C', 'D', 'G'],
      notes: [
        // Takt 1 (4 Beats: Ein-ig-keit und)
        { pitch: 'G4', durationBeats: 1.5, lyric: 'Ein-' },
        { pitch: 'A4', durationBeats: 0.5, lyric: '-ig-' },
        { pitch: 'B4', durationBeats: 1, lyric: 'keit' },
        { pitch: 'A4', durationBeats: 1, lyric: 'und' },
        // Takt 2 (4 Beats: Recht und Frei-heit)
        { pitch: 'C5', durationBeats: 1, lyric: 'Recht' },
        { pitch: 'B4', durationBeats: 1, lyric: 'und' },
        { pitch: 'A4', durationBeats: 1.5, lyric: 'Frei-' },
        { pitch: 'F#4', durationBeats: 0.5, lyric: '-heit' },
        // Takt 3 (4 Beats: für das deut-sche)
        { pitch: 'G4', durationBeats: 1, lyric: 'für' },
        { pitch: 'D4', durationBeats: 1, lyric: 'das' },
        { pitch: 'E4', durationBeats: 1, lyric: 'deut-' },
        { pitch: 'F#4', durationBeats: 1, lyric: '-sche' },
        // Takt 4 (4 Beats: Va-ter-land!)
        { pitch: 'G4', durationBeats: 1, lyric: 'Va-' },
        { pitch: 'A4', durationBeats: 1, lyric: '-ter-' },
        { pitch: 'B4', durationBeats: 2, lyric: '-land!' }
      ]
    }
  },
  {
    code: 'FR',
    name: 'Frankreich',
    pieceTitle: 'La Marseillaise',
    anthemTitle: 'La Marseillaise',
    composer: 'Claude Joseph Rouget de Lisle',
    composerDates: '1760–1836',
    composedYear: '1792',
    era: 'Klassik / Französische Revolution',
    continent: 'europe',
    flagEmoji: '🇫🇷',
    regionTitle: 'Straßburg & Paris',
    funFact: 'In einer einzigen Nacht in Straßburg komponiert, marschierten die Freiwilligen aus Marseille mit diesem Lied nach Paris.',
    didacticTip: 'Spiele die punktierten Rhythmen feurig und akzentuiert.',
    story15s: 'Rouget de Lisle schrieb das Lied als Kriegslied für die Rheinarmee. Es wurde zur weltberühmten Hymne der Freiheit.',
    mapCoordinates: { x: 47, y: 34 },
    geoCoordinates: { lat: 46.8, lon: 2.3 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'G-Dur',
      defaultBpm: 108,
      barsCount: 4,
      anacrusisBeats: 1,
      chords: ['G', 'C', 'D7', 'G'],
      notes: [
        // Auftakt (1 Beat)
        { pitch: 'D4', durationBeats: 0.5, lyric: 'Al-' },
        { pitch: 'D4', durationBeats: 0.5, lyric: '-lons' },
        // Takt 1 (4 Beats)
        { pitch: 'G4', durationBeats: 1.5, lyric: 'en-' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '-fants' },
        { pitch: 'A4', durationBeats: 1.5, lyric: 'de' },
        { pitch: 'A4', durationBeats: 0.5, lyric: 'la' },
        // Takt 2 (4 Beats)
        { pitch: 'D5', durationBeats: 2, lyric: 'Pa-' },
        { pitch: 'B4', durationBeats: 0.75, lyric: '-tri-' },
        { pitch: 'G4', durationBeats: 0.25, lyric: '-e,' },
        { pitch: 'REST', durationBeats: 1, lyric: '𝄽' },
        // Takt 3 (4 Beats)
        { pitch: 'A4', durationBeats: 1, lyric: 'Le' },
        { pitch: 'B4', durationBeats: 1, lyric: 'jour' },
        { pitch: 'C5', durationBeats: 1, lyric: 'de' },
        { pitch: 'D5', durationBeats: 1, lyric: 'gloire' },
        // Takt 4 (4 Beats: est ar-ri-vé! + Viertelpause)
        { pitch: 'C5', durationBeats: 1.5, lyric: 'est' },
        { pitch: 'B4', durationBeats: 0.5, lyric: 'ar-' },
        { pitch: 'A4', durationBeats: 1, lyric: '-ri-vé!' },
        { pitch: 'REST', durationBeats: 1, lyric: '𝄽' }
      ]
    }
  },
  {
    code: 'US',
    name: 'USA',
    pieceTitle: 'The Star-Spangled Banner',
    anthemTitle: 'The Star-Spangled Banner',
    composer: 'John Stafford Smith',
    composerDates: '1750–1836',
    composedYear: '1775',
    era: 'Klassik',
    continent: 'americas',
    flagEmoji: '🇺🇸',
    regionTitle: 'Baltimore & Maryland',
    funFact: 'Die Melodie war ursprünglich ein Clublied in London namens „To Anacreon in Heaven“.',
    didacticTip: 'Großer Tonumfang! Übe den Dreiklangssprung am Anfang langsam und treffsicher.',
    story15s: 'Francis Scott Key dichtete den Text während der Beschießung von Fort McHenry 1814, als er im Morgengrauen die Flagge noch wehen sah.',
    mapCoordinates: { x: 22, y: 38 },
    geoCoordinates: { lat: 39.5, lon: -98.3 },
    score: {
      timeSignature: '3/4',
      tonalCenter: 'C-Dur',
      defaultBpm: 84,
      barsCount: 8,
      anacrusisBeats: 1,
      chords: ['C', 'G', 'C', 'G', 'C', 'G', 'F', 'C'],
      notes: [
        // Auftakt (Takt 0: 1 Beat auf Schlag 3)
        { pitch: 'G3', durationBeats: 0.75, lyric: 'O' },
        { pitch: 'E4', durationBeats: 0.25, lyric: 'say' },
        // Takt 1 (3 Beats: can you see)
        { pitch: 'C4', durationBeats: 1, lyric: 'can' },
        { pitch: 'E4', durationBeats: 1, lyric: 'you' },
        { pitch: 'G4', durationBeats: 1, lyric: 'see,' },
        // Takt 2 (3 Beats: by the dawn's)
        { pitch: 'C5', durationBeats: 2, lyric: 'by' },
        { pitch: 'E5', durationBeats: 0.75, lyric: 'the' },
        { pitch: 'D5', durationBeats: 0.25, lyric: 'dawn\'s' },
        // Takt 3 (3 Beats: ear-ly light)
        { pitch: 'C5', durationBeats: 1, lyric: 'ear-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-ly' },
        { pitch: 'F#4', durationBeats: 1, lyric: 'light,' },
        // Takt 4 (3 Beats: what so proud-)
        { pitch: 'G4', durationBeats: 2, lyric: 'what' },
        { pitch: 'G4', durationBeats: 1, lyric: 'so' },
        // Takt 5 (3 Beats: proud-ly we)
        { pitch: 'E5', durationBeats: 1.5, lyric: 'proud-' },
        { pitch: 'D5', durationBeats: 0.5, lyric: '-ly' },
        { pitch: 'C5', durationBeats: 1, lyric: 'we' },
        // Takt 6 (3 Beats: hailed at the)
        { pitch: 'B4', durationBeats: 2, lyric: 'hailed' },
        { pitch: 'A4', durationBeats: 1, lyric: 'at' },
        // Takt 7 (3 Beats: the twi-light's)
        { pitch: 'B4', durationBeats: 1, lyric: 'the' },
        { pitch: 'C5', durationBeats: 1, lyric: 'twi-' },
        { pitch: 'C5', durationBeats: 1, lyric: '-light\'s' },
        // Takt 8 (2 Beats Resttakt: last gleam!)
        { pitch: 'G3', durationBeats: 1, lyric: 'last' },
        { pitch: 'C4', durationBeats: 1, lyric: 'gleam!' },
        { pitch: 'REST', durationBeats: 1, lyric: '𝄽' }
      ]
    }
  },
  {
    code: 'EU',
    name: 'Europa-Union',
    pieceTitle: 'Ode an die Freude (Beethoven)',
    anthemTitle: 'Ode an die Freude (Beethoven)',
    composer: 'Ludwig van Beethoven',
    composerDates: '1770–1827',
    composedYear: '1824',
    era: 'Wiener Klassik / Romantik',
    continent: 'europe',
    flagEmoji: '🇪🇺',
    regionTitle: 'Bonn & Wien',
    funFact: 'Beethoven vollendete seine 9. Sinfonie, als er bereits vollkommen taub war. Er hörte die Töne rein mit seinem inneren Ohr!',
    didacticTip: 'Achte auf den sanften Bogenlauf. Die Töne schreiten in Sekunden stufenweise auf und ab.',
    story15s: 'Friedrich Schillers Gedicht inspirierte Beethoven zum monumentalen Chorsatz über universelle Menschenwürde und Brüderlichkeit.',
    mapCoordinates: { x: 50, y: 31 },
    geoCoordinates: { lat: 50.8, lon: 4.3 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'C-Dur',
      defaultBpm: 108,
      barsCount: 4,
      chords: ['C', 'G', 'C', 'G'],
      notes: [
        // Takt 1 (4 Beats)
        { pitch: 'E4', durationBeats: 1, lyric: 'Freu-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-de' },
        { pitch: 'F4', durationBeats: 1, lyric: 'schö-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-ner' },
        // Takt 2 (4 Beats)
        { pitch: 'G4', durationBeats: 1, lyric: 'Göt-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-ter-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-fun-' },
        { pitch: 'D4', durationBeats: 1, lyric: '-ken' },
        // Takt 3 (4 Beats)
        { pitch: 'C4', durationBeats: 1, lyric: 'Toch-' },
        { pitch: 'C4', durationBeats: 1, lyric: '-ter' },
        { pitch: 'D4', durationBeats: 1, lyric: 'aus' },
        { pitch: 'E4', durationBeats: 1, lyric: 'E-' },
        // Takt 4 (4 Beats)
        { pitch: 'E4', durationBeats: 1.5, lyric: '-ly-' },
        { pitch: 'D4', durationBeats: 0.5, lyric: '-si-' },
        { pitch: 'D4', durationBeats: 2, lyric: '-um' }
      ]
    }
  },
  {
    code: 'ES_FLAMENCO',
    name: 'Spanien / Andalusien (Flamenco)',
    pieceTitle: 'Malagueña (Traditionelle Flamenco-Melodie)',
    anthemTitle: 'Malagueña (Flamenco)',
    composer: 'Andalusische Tradition (Überliefert)',
    composerDates: 'Tradition seit dem 15. Jh.',
    composedYear: 'Tradition',
    era: 'Flamenco & Andalusisches Erbe',
    continent: 'europe',
    flagEmoji: '🇪🇸',
    regionTitle: 'Málaga, Sevilla & Granada',
    funFact: 'Der Flamenco nutzt die phrygische Skala – ihr charakteristischer Halbtonschritt F zu E verleiht der Musik ihren feurigen, andalusischen Klang!',
    didacticTip: 'Betone den ersten Schlag im 3/4-Takt kräftig (Golpe) und spiele die Läufe mit perkussivem Anschlag.',
    story15s: 'In den andalusischen Pueblos Blancos verschmolzen maurische, jüdische und gitanische Gesänge zum leidenschaftlichen Flamenco.',
    instruments: [
      { name: 'Flamenco-Gitarre', family: 'strings', material: 'Zypressenholz & Fichtendecke', description: 'Leichte Gitarre mit perkussivem, bissigem Ton.' },
      { name: 'Castañuelas (Kastagnetten)', family: 'percussion', material: 'Granadillholz', description: 'Klappern aus Hartholz für rollende Rhythmen.' }
    ],
    mapCoordinates: { x: 45, y: 38 },
    geoCoordinates: { lat: 37.38, lon: -5.98 },
    score: {
      timeSignature: '3/4',
      tonalCenter: 'E-Phrygisch',
      defaultBpm: 112,
      barsCount: 4,
      chords: ['Am', 'G', 'F', 'E'],
      improvisationScale: ['E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'],
      notes: [
        // Takt 1 (3 Beats)
        { pitch: 'E4', durationBeats: 1, lyric: 'O-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-lé' },
        { pitch: 'G4', durationBeats: 1, lyric: '♪' },
        // Takt 2 (3 Beats)
        { pitch: 'F4', durationBeats: 1, lyric: 'can-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-te' },
        { pitch: 'D4', durationBeats: 1, lyric: '♪' },
        // Takt 3 (3 Beats)
        { pitch: 'F4', durationBeats: 1, lyric: 'gui-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-tar-' },
        { pitch: 'D4', durationBeats: 1, lyric: '-ra' },
        // Takt 4 (3 Beats)
        { pitch: 'E4', durationBeats: 3, lyric: '♪' }
      ]
    }
  },
  {
    code: 'IT',
    name: 'Italien (Rom / Genua)',
    pieceTitle: 'Il Canto degli Italiani (Fratelli d\'Italia)',
    anthemTitle: 'Fratelli d\'Italia (Inno di Mameli)',
    composer: 'Michele Novaro (100% Gemeinfrei)',
    composerDates: '1818–1885 (141 Jahre p.m.a.)',
    composedYear: '1847',
    era: 'Risorgimento (Gemeinfrei)',
    continent: 'europe',
    flagEmoji: '🇮🇹',
    regionTitle: 'Rom, Alpen & Mittelmeer',
    funFact: 'Michele Novaro komponierte die mitreißende Melodie 1847 in Turin – als er den Text von Goffredo Mameli erhielt, setzte er sich sofort begeistert ans Klavier!',
    didacticTip: 'Spiele die punktierten Rhythmen energisch und mit federndem Marschpuls (Allegro marziale).',
    story15s: 'Vom erst 20-jährigen Dichter Goffredo Mameli geschrieben, wurde das Lied zur unsterblichen Freiheits- und Einheitshymne Italiens.',
    instruments: [
      { name: 'Mandoline', family: 'strings', material: 'Birnenförmige Knickhals-Zupflaute', description: 'Italienisches Nationalinstrument für perlende Tremoli.' },
      { name: 'Violine', family: 'strings', material: 'Fichten- & Ahornholz (Cremona-Tradition)', description: 'Königin der klassischen Streichinstrumente.' }
    ],
    mapCoordinates: { x: 49, y: 34 },
    geoCoordinates: { lat: 41.9, lon: 12.5 },
    score: {
      timeSignature: '4/4',
      tonalCenter: 'C-Dur',
      defaultBpm: 108,
      barsCount: 4,
      chords: ['C', 'G7', 'C', 'G7'],
      improvisationScale: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
      notes: [
        // Takt 1 (4 Beats: Fra-tel-li d'I-)
        { pitch: 'G4', durationBeats: 1.5, lyric: 'Fra-' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '-tel-' },
        { pitch: 'E4', durationBeats: 1, lyric: '-li' },
        { pitch: 'G4', durationBeats: 1, lyric: 'd\'I-' },
        // Takt 2 (4 Beats: -ta-lia)
        { pitch: 'C5', durationBeats: 2, lyric: '-ta-' },
        { pitch: 'G4', durationBeats: 1, lyric: '-lia,' },
        { pitch: 'REST', durationBeats: 1, lyric: '𝄽' },
        // Takt 3 (4 Beats: l'I-ta-lia s'è)
        { pitch: 'A4', durationBeats: 1.5, lyric: 'l\'I-' },
        { pitch: 'A4', durationBeats: 0.5, lyric: '-ta-' },
        { pitch: 'F4', durationBeats: 1, lyric: '-lia' },
        { pitch: 'A4', durationBeats: 1, lyric: 's\'è' },
        // Takt 4 (4 Beats: des-ta!)
        { pitch: 'D5', durationBeats: 2, lyric: 'des-' },
        { pitch: 'B4', durationBeats: 1, lyric: '-ta!' },
        { pitch: 'REST', durationBeats: 1, lyric: '𝄽' }
      ]
    }
  },
  {
    code: 'GB',
    name: 'Großbritannien (London)',
    pieceTitle: 'God Save the King (Königliche Hymne)',
    anthemTitle: 'God Save the King',
    composer: 'Traditionell (Überliefert)',
    composerDates: 'Tradition seit dem 17. Jh.',
    composedYear: '1744',
    era: 'Barockes Weltkulturerbe (Gemeinfrei)',
    continent: 'europe',
    flagEmoji: '🇬🇧',
    regionTitle: 'Themse, Highlands & Atlantik',
    funFact: '„God Save the King“ ist die älteste Nationalhymne der Welt und diente als Vorbild für über 140 patriotische Lieder weltweit!',
    didacticTip: 'Spiele im getragenen 3/4-Takt (Maestoso). Halte die Halben Noten auf Beat 1 und 2 voll aus.',
    story15s: 'Im September 1744 erstmals am Theatre Royal Drury Lane in London aufgeführt, erklang die Hymne seither bei jeder britischen Krönung.',
    instruments: [
      { name: 'Trompete / Blechbläser', family: 'brass', material: 'Messing & Schalltrichter', description: 'Strahlender Glanz für royale Fanfaren.' },
      { name: 'Pfeifenorgel', family: 'keyboard', material: 'Zinn-Pfeifen & Holzmanuale', description: 'Majestätisches Instrument der Westminster Abbey.' }
    ],
    mapCoordinates: { x: 47, y: 30 },
    geoCoordinates: { lat: 51.5, lon: -0.12 },
    score: {
      timeSignature: '3/4',
      tonalCenter: 'G-Dur',
      defaultBpm: 84,
      barsCount: 4,
      chords: ['G', 'D', 'G', 'D7'],
      improvisationScale: ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5'],
      notes: [
        // Takt 1 (3 Beats: God save our)
        { pitch: 'G4', durationBeats: 1, lyric: 'God' },
        { pitch: 'G4', durationBeats: 1, lyric: 'save' },
        { pitch: 'A4', durationBeats: 1, lyric: 'our' },
        // Takt 2 (3 Beats: gra-cious King)
        { pitch: 'F#4', durationBeats: 1.5, lyric: 'gra-' },
        { pitch: 'G4', durationBeats: 0.5, lyric: '-cious' },
        { pitch: 'A4', durationBeats: 1, lyric: 'King,' },
        // Takt 3 (3 Beats: long live our)
        { pitch: 'B4', durationBeats: 1, lyric: 'long' },
        { pitch: 'B4', durationBeats: 1, lyric: 'live' },
        { pitch: 'C5', durationBeats: 1, lyric: 'our' },
        // Takt 4 (3 Beats: no-ble King!)
        { pitch: 'B4', durationBeats: 1.5, lyric: 'no-' },
        { pitch: 'A4', durationBeats: 0.5, lyric: '-ble' },
        { pitch: 'G4', durationBeats: 1, lyric: 'King!' }
      ]
    }
  }
];

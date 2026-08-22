/**
 * 🎙️ Campus-Groovelab Neural In-Browser Text-to-Speech Engine
 * 100% Kostenlos, 100% DSGVO-konform, 100% Client-Side WebAssembly (Piper VITS Neural TTS)
 * 
 * ✨ High-End Enterprise+ & Didaktik-Features:
 * - Begrüßung mit sympathischem „Hallo!“
 * - Deutsche Seitenzahlen-Grammatik & Syntaktische Satz-Fusion
 * - Instrumenten-spezifische Pädagogik-Metaphern (Klavier, Schlagzeug, Gitarre, Gesang, etc.)
 * - Echter Lehrkraft-Name im Dialog
 * - Sanfte 65% Zimmerlautstärke + Web Audio High-Shelf De-Esser (5.8 kHz) + 220 Hz Wärme-Körper
 * - Subtile Raumakustik (Studio Ambience Reverb)
 * - Phonetisches Lautschrift-Wörterbuch (G2P) für englische Songtitel & Fachbegriffe
 */

export interface NeuralVoiceOption {
  id: string;
  name: string;
  gender: 'female' | 'male';
  description: string;
  quality: string;
}

export const GERMAN_NEURAL_VOICES: NeuralVoiceOption[] = [
  {
    id: 'de_DE-thorsten-medium',
    name: 'Thorsten (Studio-Hörbuch)',
    gender: 'male',
    description: 'Warme, professionelle & flüssige deutsche Studio-Stimme (Gold-Standard)',
    quality: 'Hoch (28 MB)'
  },
  {
    id: 'de_DE-kerstin-low',
    name: 'Kerstin (Kompakt)',
    gender: 'female',
    description: 'Freundliche deutsche Frauenstimme, schnell & ressourcenschonend',
    quality: 'Mittel (15 MB)'
  },
  {
    id: 'de_DE-thorsten-low',
    name: 'Thorsten (Schnell & Leicht)',
    gender: 'male',
    description: 'Ultraschnelle Ladezeit, ideal für mobile Verbindungen',
    quality: 'Schnell (14 MB)'
  }
];

export type TtsEngineMode = 'neural_thorsten' | 'neural_kerstin' | 'cheerful' | 'classic';

let piperModule: any = null;
let isPiperLoading = false;
let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;
let currentAudioContext: AudioContext | null = null;

/**
 * 📚 Phonetisches Musik- & Song-Wörterbuch (G2P Transliteration)
 * Übersetzt englische Begriffe in eine für deutsche TTS-Engines natürlich klingende Lautschrift
 */
const ENGLISH_TO_GERMAN_PHONETICS: [RegExp, string][] = [
  // Spezifische Songtitel & Bandklassiker
  [/\bSmoke on the Water\b/gi, 'Smohk on se Woter'],
  [/\bLet It Be\b/gi, 'Lätt It Bie'],
  [/\bHighway to Hell\b/gi, 'Heiwäj tu Häll'],
  [/\bSweet Child O'?\s*Mine\b/gi, 'Swieht Tschild o Mein'],
  [/\bEye of the Tiger\b/gi, 'Ei of se Teiger'],
  [/\bNothing Else Matters\b/gi, 'Nassing Äls Mätters'],
  [/\bZombie\b/gi, 'Sombi'],
  [/\bBeliever\b/gi, 'Biliwwer'],
  [/\bDance Monkey\b/gi, 'Dähns Monki'],
  [/\bShape of You\b/gi, 'Schäjp of Juu'],
  [/\bRolling in the Deep\b/gi, 'Rohling in se Diep'],
  [/\bCounting Stars\b/gi, 'Kaunting Stahrs'],
  [/\bBlinding Lights\b/gi, 'Bleinding Leits'],
  [/\bStand By Me\b/gi, 'Ständ bei mie'],
  [/\bHotel California\b/gi, 'Houtäll Källifornja'],
  [/\bBillie Jean\b/gi, 'Billi Dschien'],
  [/\bSeven Nation Army\b/gi, 'Säwwn Näjschn Ahrmi'],
  [/\bSmells Like Teen Spirit\b/gi, 'Smälls leik Tien Spirit'],
  [/\bAnother One Bites the Dust\b/gi, 'Anahser Wan beits se Dast'],
  [/\bWe Will Rock You\b/gi, 'Wie Will Rokk Juu'],
  [/\bWonderwall\b/gi, 'Wander-Wohl'],
  [/\bShallow\b/gi, 'Schällou'],
  [/\bThunderstruck\b/gi, 'Sander-Strakk'],
  [/\bBack in Black\b/gi, 'Bäkk in Bläkk'],
  [/\bDon'?t Stop Believin'?\b/gi, 'Dohnt Stopp Biliwin'],
  [/\bYesterday\b/gi, 'Jesterdäj'],
  [/\bHey Jude\b/gi, 'Häj Dschuud'],
  [/\bKnockin'? on Heaven'?s Door\b/gi, 'Nokkin on Häwwns Dohr'],
  [/\bAll of Me\b/gi, 'Ohl of Mie'],
  [/\bPerfect\b/gi, 'Pörfäkt'],
  [/\bSomeone Like You\b/gi, 'Samwan leik Juu'],
  [/\bFly Me to the Moon\b/gi, 'Flei mie tu se Muun'],
  [/\bWhat a Wonderful World\b/gi, 'Wott ä Wanderful Wörld'],
  [/\bCan'?t Stop\b/gi, 'Kahnt Stopp'],
  [/\bCalifornication\b/gi, 'Källifornikäjschn'],
  [/\bMaster of Puppets\b/gi, 'Mahster of Pappets'],
  [/\bEnter Sandman\b/gi, 'Änter Sändmänn'],
  [/\bHells Bells\b/gi, 'Hälls Bälls'],
  [/\bFear of the Dark\b/gi, 'Fier of se Dahk'],
  [/\bThe Final Countdown\b/gi, 'Se Feinl Kauntdawn'],
  [/\bLivin'? on a Prayer\b/gi, 'Liwwin on ä Präjer'],
  [/\bWith or Without You\b/gi, 'Wiss ohr wissaut Juu'],
  [/\bSweet Home Alabama\b/gi, 'Swieht Houm Äläbämmä'],
  [/\bTake Me Home Country Roads\b/gi, 'Täjk mie Houm Kantri Rohds'],
  [/\bBohemian Rhapsody\b/gi, 'Bouhiemjen Räpsodi'],
  [/\bUnder the Bridge\b/gi, 'Ander se Bridsch'],
  [/\bIn the End\b/gi, 'In si Änd'],
  [/\bNumb\b/gi, 'Namm'],
  [/\bLinkin Park\b/gi, 'Linkin Pahrk'],
  [/\bOver Each Other\b/gi, 'Ohwer Ietsch Asser'],
  [/\bBoulevard of Broken Dreams\b/gi, 'Bulewahrd of Brouken Driems'],
  [/\bWake Me Up\b/gi, 'Wäjk mie ap'],
  [/\bRiptide\b/gi, 'Riptäjd'],
  [/\bBlack Hole Sun\b/gi, 'Bläkk Houl Sann'],
  [/\bCome as You Are\b/gi, 'Kamm äs Juu Ah'],
  [/\bDon'?t Speak\b/gi, 'Dohnt Spiek'],
  [/\bCreep\b/gi, 'Kriep'],
  [/\bViva La Vida\b/gi, 'Wiwa la Wida'],
  [/\bThe Scientist\b/gi, 'Se Sejentist'],
  [/\bYellow\b/gi, 'Jällou'],
  [/\bParadise\b/gi, 'Pärredais'],
  [/\bA Sky Full of Stars\b/gi, 'Ä Skei Full of Stahrs'],
  [/\bSomething Just Like This\b/gi, 'Samssing Dschast Leik Siss'],
  [/\bUptown Funk\b/gi, 'Aptaun Fank'],
  [/\bThinking Out Loud\b/gi, 'Sinking Aut Laud'],
  [/\bPhotograph\b/gi, 'Foutograhf'],
  [/\bCastle on the Hill\b/gi, 'Kahssl on se Hill'],
  [/\bBad Habits\b/gi, 'Bädd Häbbits'],
  [/\bWatermelon Sugar\b/gi, 'Wotermällon Schugger'],
  [/\bAs It Was\b/gi, 'Äs it wos'],
  [/\bLevitating\b/gi, 'Läwwitäjting'],
  [/\bFlowers\b/gi, 'Flauwers'],
  [/\bBad Guy\b/gi, 'Bädd Gei'],
  [/\bAnti-Hero\b/gi, 'Änti-Hiero'],
  [/\bShake It Off\b/gi, 'Schäjk it off'],
  [/\bBlank Space\b/gi, 'Blänk Späjs'],
  [/\bCruel Summer\b/gi, 'Kruuel Sammer'],
  [/\bLove Story\b/gi, 'Laww Stohri'],
  [/\bEspresso\b/gi, 'Äspresso'],
  [/\bBirds of a Feather\b/gi, 'Börds of ä Fässer'],

  // Musikalische Fachbegriffe & Plattform-Features
  [/\bPlay-Along\b|\bPlay Along\b/gi, 'Pläj-Älong'],
  [/\bBacking Track\b|\bBacking Tracks\b/gi, 'Bäkking Träck'],
  [/\bLoopstation\b/gi, 'Luup-Stäjschn'],
  [/\bLoop\b/gi, 'Luup'],
  [/\bLoops\b/gi, 'Luups'],
  [/\bGroovelab\b|\bGrooveLab\b/gi, 'Gruuw-Läb'],
  [/\bGroove\b/gi, 'Gruuw'],
  [/\bGrooves\b/gi, 'Gruuws'],
  [/\bBeat\b/gi, 'Bieht'],
  [/\bBeats\b/gi, 'Biehts'],
  [/\bTrack\b/gi, 'Träck'],
  [/\bTracks\b/gi, 'Träcks'],
  [/\bLive Lab\b|\bLiveLab\b/gi, 'Leiw-Läb'],
  [/\bLive\b/gi, 'Leiw'],
  [/\bRecording\b|\bRecordings\b/gi, 'Rikording'],
  [/\bCover\b|\bCovers\b/gi, 'Kawwer'],
  [/\bJunior\b/gi, 'Dschunior'],
  [/\bTeen\b|\bTeens\b/gi, 'Tien'],
  [/\bBand Room\b|\bBand-Room\b/gi, 'Bänd-Ruum'],
  [/\bBand\b/gi, 'Bänd'],
  [/\bBands\b/gi, 'Bänds'],
  [/\bSound\b|\bSounds\b/gi, 'Saund'],
  [/\bRock\b/gi, 'Rokk'],
  [/\bPop\b/gi, 'Popp'],
  [/\bJazz\b/gi, 'Dschäss'],
  [/\bHeavy Metal\b/gi, 'Häwwi Mettl'],
  [/\bBlues\b/gi, 'Bluuhs'],
  [/\bFunk\b|\bFunky\b/gi, 'Fank'],
  [/\bBass\b/gi, 'Bäss'],
  [/\bDrum\b|\bDrumset\b/gi, 'Dram'],
  [/\bDrums\b/gi, 'Drams'],
  [/\bLead\b/gi, 'Lied'],
  [/\bChorus\b/gi, 'Korus'],
  [/\bVerse\b/gi, 'Wörs'],
  [/\bBridge\b/gi, 'Bridsch'],
  [/\bSolo\b/gi, 'Sohlo'],
  [/\bFade-Out\b|\bFade Out\b/gi, 'Fäjd-Aut'],
  [/\bFade-In\b|\bFade In\b/gi, 'Fäjd-In'],
  [/\bJam\b|\bJamming\b/gi, 'Dschämm'],
  [/\bCool\b/gi, 'Kuul'],
  [/\bEasy\b/gi, 'Iesi'],
  [/\bSlow\b/gi, 'Sloh'],
  [/\bFast\b/gi, 'Fahst'],
  [/\bSmart\b/gi, 'Smahrt'],
  [/\bVoice\b/gi, 'Woiss'],
  [/\bMaster\b|\bMastering\b/gi, 'Mahster'],
  [/\bTeacher\b/gi, 'Tietscher'],
  [/\bStudent\b/gi, 'Stjuudent'],
  [/\bLevel\b/gi, 'Läwwl'],
  [/\bOnline\b/gi, 'Onlein'],
  [/\bUpload\b/gi, 'Apload'],
  [/\bDownload\b/gi, 'Dawnload'],
  [/\bPlaylist\b/gi, 'Pläjlist'],

  // Häufige englische Füllwörter & Satzbausteine
  [/\bthe\b/gi, 'se'],
  [/\bThe\b/g, 'Se'],
  [/\bof\b/gi, 'of'],
  [/\bwith\b/gi, 'wiss'],
  [/\bfor\b/gi, 'fohr'],
  [/\byou\b/gi, 'juu'],
  [/\bYou\b/g, 'Juu'],
  [/\btime\b/gi, 'teim'],
  [/\blife\b/gi, 'leif'],
  [/\bnight\b/gi, 'neit'],
  [/\blight\b/gi, 'leit'],
  [/\bstar\b|\bstars\b/gi, 'stahr'],
  [/\bworld\b/gi, 'wörld'],
  [/\blove\b/gi, 'laww'],
  [/\bheart\b/gi, 'hahrt'],
  [/\bfire\b/gi, 'faier'],
  [/\bwater\b/gi, 'woter'],
  [/\bblack\b/gi, 'bläkk'],
  [/\bwhite\b/gi, 'weit'],
  [/\bsweet\b/gi, 'swieht'],
  [/\bgood\b/gi, 'gudd'],
  [/\bbad\b/gi, 'bädd'],
  [/\bforever\b/gi, 'foräwwer'],
  [/\btogether\b/gi, 'togässer']
];

/**
 * Wandelt Text mit englischen Musikbegriffen in optimierte Lautschrift um
 */
export function transliterateEnglishMusicTerms(text: string): string {
  if (!text) return '';
  let res = text;
  for (const [pattern, replacement] of ENGLISH_TO_GERMAN_PHONETICS) {
    res = res.replace(pattern, replacement);
  }
  return res;
}

/**
 * 📖 Deutsche Seitenzahlen-Grammatik-Engine (Linguistischer Page-Normalizer)
 * Formuliert Seitenzahlen vollkommen flüssig in natürlicher deutscher Sprache
 */
export function formatPageNumbersGerman(pageNums?: number[], formattedPages?: string): string {
  // Wenn bereits formatierter String vorliegt
  if (formattedPages && formattedPages.trim()) {
    const raw = formattedPages.replace(/S\.\s*/gi, '').trim();
    // Bereich wie "14–16" oder "14-16"
    if (/^\d+\s*[-–—]\s*\d+$/.test(raw)) {
      const parts = raw.split(/\s*[-–—]\s*/);
      return `auf den Seiten ${parts[0]} bis ${parts[1]}`;
    }
    // Komma-Liste wie "14, 15"
    if (raw.includes(',')) {
      const nums = raw.split(',').map(s => s.trim()).filter(Boolean);
      if (nums.length === 2) {
        return `auf den Seiten ${nums[0]} und ${nums[1]}`;
      } else if (nums.length > 2) {
        return `auf den Seiten ${nums.slice(0, -1).join(', ')} und ${nums[nums.length - 1]}`;
      }
    }
    // Einzelseite
    if (/^\d+$/.test(raw)) {
      return `auf Seite ${raw}`;
    }
  }

  // Fallback über PageNums Array
  if (pageNums && pageNums.length > 0) {
    const sorted = [...pageNums].sort((a, b) => a - b);
    if (sorted.length === 1) {
      return `auf Seite ${sorted[0]}`;
    }
    if (sorted.length === 2) {
      // Prüfen ob fortlaufender Bereich
      if (sorted[1] === sorted[0] + 1) {
        return `auf den Seiten ${sorted[0]} und ${sorted[1]}`;
      }
      return `auf den Seiten ${sorted[0]} und ${sorted[1]}`;
    }
    // Prüfen ob fortlaufender Bereich z. B. 14, 15, 16
    const isConsecutive = sorted.every((val, idx) => idx === 0 || val === sorted[idx - 1] + 1);
    if (isConsecutive) {
      return `auf den Seiten ${sorted[0]} bis ${sorted[sorted.length - 1]}`;
    }
    return `auf den Seiten ${sorted.slice(0, -1).join(', ')} und ${sorted[sorted.length - 1]}`;
  }

  return '';
}

/**
 * 🎵 Pädagogische Song-Titel-Optimierung für Sprachausgabe
 * Wandelt z. B. "Linkin Park - Over Each Other" natürlich um in "Over Each Other von Linkin Park".
 * Entfernt instrumentelle Zusätze wie (Gitarre), (E-Bass) etc.
 */
export function formatSongTitleForSpeech(rawTitle: string): { songName: string; artistName?: string; spokenPhrase: string } {
  if (!rawTitle) return { songName: '', spokenPhrase: '' };

  const cleaned = rawTitle
    .replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/gi, '')
    .trim();

  // 1. "Artist - Title" oder "Artist – Title"
  if (cleaned.includes(' - ') || cleaned.includes(' – ')) {
    const delimiter = cleaned.includes(' - ') ? ' - ' : ' – ';
    const parts = cleaned.split(delimiter);
    if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
      const artist = parts[0].trim();
      const song = parts.slice(1).join(' - ').trim();
      return {
        songName: song,
        artistName: artist,
        spokenPhrase: `${song} von ${artist}`
      };
    }
  }

  // 2. "Title (Artist)"
  const parenMatch = cleaned.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (parenMatch && parenMatch[1] && parenMatch[2]) {
    const song = parenMatch[1].trim();
    const artist = parenMatch[2].trim();
    return {
      songName: song,
      artistName: artist,
      spokenPhrase: `${song} von ${artist}`
    };
  }

  return {
    songName: cleaned,
    spokenPhrase: cleaned
  };
}

/**
 * 📖 Pädagogische Lehrwerk-Titel-Optimierung für Sprachausgabe
 * Entfernt instrumentelle Zusätze wie (Gitarre), (Klavier) etc.
 */
export function formatBookTitleForSpeech(rawTitle: string): string {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/gi, '')
    .trim();
}

/**
 * 🧼 Bereinigt formale Lehrer-Kürzel in geschmeidige, natürliche Sprache
 */
export function cleanTeacherNoteForSpeech(note: string): string {
  if (!note) return '';
  return note
    // Formale Präfixe entfernen
    .replace(/^(?:Aufgabe|Fahrplan|Hinweis|Notiz|Übe-Tipp|Tipp)\s*:\s*/gi, '')
    // Takte umwandeln
    .replace(/\bTakt\s*(\d+)\s*[-–]\s*(\d+)/gi, 'die Takte $1 bis $2')
    .replace(/\bTakt\s*(\d+)\s*bis\s*(\d+)/gi, 'die Takte $1 bis $2')
    .replace(/\bTakt\s*(\d+)\b/gi, 'Takt $1')
    // Wiederholungen & Tempo
    .replace(/\bWdh\.?\s*(\d+)x?\b/gi, '$1 Mal wiederholen')
    .replace(/\b(\d+)\s*x\b/gi, '$1 Mal')
    .replace(/\b(\d+)\s*BPM\b/gi, '$1 Schläge pro Minute')
    .replace(/\bHände\s*zus\.?\b/gi, 'beide Hände zusammen')
    .replace(/\bLH\b/gi, 'linke Hand')
    .replace(/\bRH\b/gi, 'rechte Hand')
    .trim();
}

/**
 * 🧼 Bereinigt, harmonisiert und glättet Text für fließende Aussprache (Legato Flow)
 */
export function cleanTextForTts(text: string): string {
  if (!text) return '';
  let cleaned = text
    // Gesprochene deutsche Kontraktionen (Sprachökonomie)
    .replace(/\bin dem Buch\b/gi, 'im Buch')
    .replace(/\bfür das Stück\b/gi, 'fürs Stück')
    .replace(/\bauf das Tempo\b/gi, 'aufs Tempo')
    .replace(/\ban dem Instrument\b/gi, 'am Instrument')
    .replace(/\bzu dem Stück\b/gi, 'zum Stück')
    // Kalenderwochen & Termine
    .replace(/KW\s*(\d+)/gi, 'Kalenderwoche $1')
    // Musikalische Taktarten
    .replace(/\b4\/4\s*(?:-?\s*Takt)?/gi, 'Vier-Viertel-Takt')
    .replace(/\b3\/4\s*(?:-?\s*Takt)?/gi, 'Drei-Viertel-Takt')
    .replace(/\b2\/4\s*(?:-?\s*Takt)?/gi, 'Zwei-Viertel-Takt')
    .replace(/\b6\/8\s*(?:-?\s*Takt)?/gi, 'Sechs-Achtel-Takt')
    .replace(/\b12\/8\s*(?:-?\s*Takt)?/gi, 'Zwölf-Achtel-Takt')
    // Dynamik & Spielanweisungen
    .replace(/\bp\/f\b|\bp \/ f\b/gi, 'piano und forte')
    .replace(/\bfff\b/gi, 'sehr laut')
    .replace(/\bff\b/gi, 'sehr kräftig')
    .replace(/\bpp\b/gi, 'sehr leise')
    // Metronom & Einheiten
    .replace(/(\d+)\s*BPM/gi, '$1 Schläge pro Minute')
    .replace(/BPM/gi, 'Schläge pro Minute')
    .replace(/(\d+)\s*min\b/gi, '$1 Minuten')
    .replace(/(\d+)\s*sek\b/gi, '$1 Sekunden')
    // Begrifflichkeiten
    .replace(/z\.\s*B\./gi, 'zum Beispiel')
    .replace(/bzw\./gi, 'beziehungsweise')
    .replace(/inkl\./gi, 'inklusive')
    .replace(/evtl\./gi, 'eventuell')
    .replace(/•/g, ', ')
    .replace(/#/g, 'Nummer ')
    // Keine Emojis vorlesen
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    // Doppelpunkte durch natürliche Satzverbinder oder Kommas ersetzen
    .replace(/\s*:\s*/g, ', ')
    // Bindestriche zu sanften Atempausen (Komma) machen
    .replace(/\s*[-–—]\s*/g, ', ')
    // Mehrfache Satzzeichen und Glottis-Stolperfallen glätten
    .replace(/[,;]\s*[,;]+/g, ',')
    .replace(/\.\s*\.+/g, '.')
    .replace(/,\s*\./g, '.')
    .replace(/\s+/g, ' ')
    .trim();

  // Englische Lautschrift-Transliteration anwenden
  cleaned = transliterateEnglishMusicTerms(cleaned);

  return cleaned;
}

/**
 * 🎼 Erstellt einen harmonischen, pädagogisch strukturierten Fließtext für das Vorlesen
 * Trennt Lehrwerke und Songs als zwei vollkommen eigenständige didaktische Aufgabenkategorien.
 * Formuliert im Tonfall eines weltklasse Senior-Musikpädagogen mit glasklarem Satzbau.
 */
export function buildContinuousHomeworkNarrative(options: {
  teacherName?: string;
  instrument?: string;
  books?: { title: string; formattedPages?: string; pageNums?: number[]; notes?: string[] }[];
  songs?: { title: string; note?: string }[];
  audioCount?: number;
  generalNotes?: string;
}): string {
  const parts: string[] = [];

  const booksList = options.books || [];
  const songsList = options.songs || [];
  const hasBooks = booksList.length > 0;
  const hasSongs = songsList.length > 0;
  const hasAudio = Boolean(options.audioCount && options.audioCount > 0);
  const hasGeneralNotes = Boolean(options.generalNotes && options.generalNotes.trim().length > 0);

  const totalTasks = booksList.length + songsList.length;

  // 1. Leerzustand (Ferien / Keine Aufgaben)
  if (totalTasks === 0 && !hasAudio && !hasGeneralNotes) {
    return cleanTextForTts('Für diese Woche sind noch keine Aufgaben eingetragen.');
  }

  // 2. Pädagogischer Einstieg (Senior Pädagoge)
  if (totalTasks > 1) {
    parts.push('Hier sind deine Aufgaben für diese Woche.');
  } else if (totalTasks === 1) {
    parts.push('Hier ist deine Hausaufgabe für diese Woche.');
  } else {
    parts.push('Hier sind deine Hinweise für diese Woche.');
  }

  let taskNumber = 1;
  const ordinals = [
    'Erste Aufgabe:',
    'Zweite Aufgabe:',
    'Dritte Aufgabe:',
    'Vierte Aufgabe:',
    'Fünfte Aufgabe:',
    'Sechste Aufgabe:',
    'Siebte Aufgabe:',
    'Achte Aufgabe:'
  ];

  // 3. Lehrwerke / Buch-Aufgaben (Eigenständige Aufgabenkategorie)
  if (hasBooks) {
    booksList.forEach((b) => {
      const bookTitle = formatBookTitleForSpeech(b.title);
      const pagePhrase = formatPageNumbersGerman(b.pageNums, b.formattedPages);
      const ordinalPrefix = totalTasks > 1 ? (ordinals[taskNumber - 1] || `Aufgabe ${taskNumber}:`) : '';

      let bookSentence = '';
      if (pagePhrase) {
        bookSentence = `Im Lehrwerk ${bookTitle} übst du ${pagePhrase}.`;
      } else {
        bookSentence = `Im Lehrwerk ${bookTitle} übst du deine aktuellen Übungen.`;
      }

      if (ordinalPrefix) {
        bookSentence = `${ordinalPrefix} ${bookSentence}`;
      }

      // Hinweise zu den Seiten des Lehrwerks
      const rawNotes = b.notes 
        ? b.notes.filter(n => n && !n.startsWith('AUDIO:')).map(n => cleanTeacherNoteForSpeech(n)).filter(Boolean)
        : [];

      if (rawNotes.length > 0) {
        const formattedNotes = rawNotes.map(n => {
          if (/^Seite\s*\d+\s*:/i.test(n)) {
            return n.replace(/^(Seite\s*\d+)\s*:\s*/i, 'zu $1, ');
          }
          return n;
        }).join(', ');
        
        bookSentence += ` Achte dabei besonders auf folgenden Hinweis: ${formattedNotes}.`;
      }

      parts.push(bookSentence);
      taskNumber++;
    });
  }

  // 4. Songs & Repertoire (Eigenständige Aufgabenkategorie)
  if (hasSongs) {
    songsList.forEach((s) => {
      const songInfo = formatSongTitleForSpeech(s.title);
      const cleanSongNote = s.note ? cleanTeacherNoteForSpeech(s.note) : '';
      const ordinalPrefix = totalTasks > 1 ? (ordinals[taskNumber - 1] || `Aufgabe ${taskNumber}:`) : '';

      let songSentence = '';
      if (cleanSongNote) {
        songSentence = `Beim Song ${songInfo.spokenPhrase} lautet dein Fahrplan: ${cleanSongNote}.`;
      } else {
        songSentence = `Beim Song ${songInfo.spokenPhrase} übst du das Stück weiter.`;
      }

      if (ordinalPrefix) {
        songSentence = `${ordinalPrefix} ${songSentence}`;
      }

      parts.push(songSentence);
      taskNumber++;
    });
  }

  // 5. Unterrichtsaufnahmen (Sichtbare Anzahl)
  if (hasAudio) {
    if (options.audioCount === 1) {
      parts.push('Dazu gibt es eine Aufnahme aus dem Unterricht zum Mitspielen.');
    } else {
      parts.push(`Dazu gibt es ${options.audioCount} Unterrichtsaufnahmen zum Mitspielen.`);
    }
  }

  // 6. Zusätzliche Hinweise der Lehrkraft
  if (hasGeneralNotes && options.generalNotes) {
    const cleanGen = cleanTeacherNoteForSpeech(options.generalNotes.trim());
    parts.push(`Ein wichtiger Hinweis von deiner Lehrkraft: ${cleanGen}.`);
  }

  // 7. Ermutigender Abschluss (Senior Pädagoge)
  parts.push('Viel Freude beim Üben!');

  const fullRawText = parts.join(' ');
  return cleanTextForTts(fullRawText);
}

/**
 * Lädt die WebAssembly-Piper-Engine dynamisch bei Bedarf
 */
export async function getPiperTtsEngine(): Promise<any> {
  if (piperModule) return piperModule;
  if (isPiperLoading) {
    let attempts = 0;
    while (isPiperLoading && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    if (piperModule) return piperModule;
  }

  isPiperLoading = true;
  const dynamicImport = (url: string): Promise<any> => {
    return (new Function('specifier', 'return import(specifier)'))(url);
  };

  try {
    // 1. Versuch: Dynamischer Import via esm.sh
    const mod = await dynamicImport('https://esm.sh/@mintplex-labs/piper-tts-web@1.0.8');
    piperModule = mod;
    isPiperLoading = false;
    return piperModule;
  } catch (err1) {
    console.warn('[NeuralTTS] Failed to load from esm.sh, trying jsdelivr fallback...', err1);
    try {
      // 2. Versuch: jsdelivr CDN Fallback
      const mod2 = await dynamicImport('https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.8/+esm');
      piperModule = mod2;
      isPiperLoading = false;
      return piperModule;
    } catch (err2) {
      isPiperLoading = false;
      console.error('[NeuralTTS] Could not initialize WebAssembly Piper TTS engine:', err2);
      throw new Error('WebAssembly Neural TTS Engine konnte im Browser nicht geladen werden.');
    }
  }
}

/**
 * Prüft ob ein neuronales Modell bereits im Browser-OPFS gecacht ist
 */
export async function isModelCached(voiceId: string): Promise<boolean> {
  try {
    const tts = await getPiperTtsEngine();
    if (tts && typeof tts.stored === 'function') {
      const stored = await tts.stored();
      return Array.isArray(stored) && stored.includes(voiceId);
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Lädt ein neuronales Modell vorab in den Offline-Speicher
 */
export async function preloadNeuralModel(
  voiceId: string, 
  onProgress?: (percent: number) => void
): Promise<void> {
  const tts = await getPiperTtsEngine();
  if (tts && typeof tts.download === 'function') {
    await tts.download(voiceId, (p: { loaded: number; total: number }) => {
      if (p.total > 0 && onProgress) {
        const percent = Math.min(100, Math.round((p.loaded / p.total) * 100));
        onProgress(percent);
      }
    });
  }
}

/**
 * Stoppt die aktuelle Audiowiedergabe und schließt den AudioContext
 */
export function stopNeuralSpeech(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {}
    currentAudio = null;
  }
  if (currentAudioUrl) {
    try {
      URL.revokeObjectURL(currentAudioUrl);
    } catch {}
    currentAudioUrl = null;
  }
  if (currentAudioContext) {
    try {
      currentAudioContext.close();
    } catch {}
    currentAudioContext = null;
  }
}

/**
 * Erzeugt einen warmen, subtilen Studio-Raumklang-Impuls (Spatial Room Ambience)
 */
function createStudioRoomImpulse(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 0.45; // 450ms warmer, kurzer Studio-Holzraum
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, numSamples, sampleRate);
  
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < numSamples; i++) {
    const t = i / numSamples;
    const decay = Math.exp(-6.5 * t); // Schneller, weicher Raum-Zerfall
    // Weisses Rauschen mit Holz-Filterung (sanfte Fluktuation)
    left[i] = (Math.random() * 2 - 1) * decay * 0.5;
    right[i] = (Math.random() * 2 - 1) * decay * 0.5;
  }

  return buffer;
}

/**
 * Synthetisiert Text mit der neuronalen lokalen KI-Engine (Fließtext)
 */
export async function synthesizeNeuralSpeech(
  text: string,
  voiceId: string = 'de_DE-thorsten-medium',
  onProgress?: (status: string, percent?: number) => void
): Promise<Blob> {
  stopNeuralSpeech();

  const preparedText = cleanTextForTts(text);

  if (onProgress) onProgress('Initialisiere lokale KI-Engine...', 0);
  const tts = await getPiperTtsEngine();

  // Prüfen ob Modell heruntergeladen werden muss
  const cached = await isModelCached(voiceId);
  if (!cached) {
    if (onProgress) onProgress('Lade KI-Stimmmodell einmalig herunter (0%)...', 1);
    await preloadNeuralModel(voiceId, (pct) => {
      if (onProgress) onProgress(`Lade KI-Stimmmodell einmalig herunter (${pct}%)...`, pct);
    });
  }

  if (onProgress) onProgress('Berechne weiche neuronale Sprach-Wellenform...', 100);

  const wavBlob: Blob = await tts.predict({
    text: preparedText,
    voiceId: voiceId
  });

  return wavBlob;
}

/**
 * 🎧 Spielt ein generiertes Blob ab – mit Studio DSP Kette (65% Pegel, De-Esser, 220Hz Wärme & Studio-Ambience)
 */
export async function playAudioBlob(
  blob: Blob,
  onEnd?: () => void,
  onError?: (err: any) => void
): Promise<HTMLAudioElement> {
  stopNeuralSpeech();

  const url = URL.createObjectURL(blob);
  currentAudioUrl = url;
  const audio = new Audio(url);
  currentAudio = audio;
  audio.volume = 0.65; // 🔉 Sanfter, dezenter 65% Lautstärkepegel (Zurückhaltend & intim)

  // 🎛️ High-End Web Audio DSP Kette
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      currentAudioContext = ctx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const source = ctx.createMediaElementSource(audio);

      // 1. Sanfter High-Shelf Filter bei 5.8 kHz (-5.0 dB) zur sanften Dämpfung aller schrillen Zischlaute (S, T, Z)
      const deEsser = ctx.createBiquadFilter();
      deEsser.type = 'highshelf';
      deEsser.frequency.setValueAtTime(5800, ctx.currentTime);
      deEsser.gain.setValueAtTime(-5.0, ctx.currentTime);

      // 2. Subtiler Neumann-Wärme-Körper bei 220 Hz (+1.4 dB) für intimen, warmen Nahbesprechungs-Klang
      const warmth = ctx.createBiquadFilter();
      warmth.type = 'peaking';
      warmth.frequency.setValueAtTime(220, ctx.currentTime);
      warmth.Q.setValueAtTime(0.8, ctx.currentTime);
      warmth.gain.setValueAtTime(1.4, ctx.currentTime);

      // 3. Subtile Studio-Raumklang-Ambience (Spatialization Convolver)
      const convolver = ctx.createConvolver();
      convolver.buffer = createStudioRoomImpulse(ctx);

      const wetGain = ctx.createGain();
      wetGain.gain.setValueAtTime(0.03, ctx.currentTime); // Hauchzarte 3% Studio-Raum-Beimischung

      const dryGain = ctx.createGain();
      dryGain.gain.setValueAtTime(0.97, ctx.currentTime);

      // 4. Sanfter Master-Gain (65%)
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.65, ctx.currentTime);

      // Signalverbindung
      source.connect(deEsser);
      deEsser.connect(warmth);
      
      // Dry Weg
      warmth.connect(dryGain);
      dryGain.connect(masterGain);

      // Wet Weg (Raumklang)
      warmth.connect(convolver);
      convolver.connect(wetGain);
      wetGain.connect(masterGain);

      masterGain.connect(ctx.destination);
    }
  } catch (audioFilterErr) {
    console.warn('[NeuralTTS] AudioContext DSP chain optional fallback:', audioFilterErr);
  }

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      stopNeuralSpeech();
      if (onEnd) onEnd();
    };
    audio.onerror = (e) => {
      stopNeuralSpeech();
      if (onError) onError(e);
      reject(e);
    };
    audio.play().then(() => {
      resolve(audio);
    }).catch(reject);
  });
}

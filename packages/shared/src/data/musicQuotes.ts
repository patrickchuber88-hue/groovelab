/**
 * Central Music Quotes & Philosophy Library for Campus-Groovelab
 * Contains 60+ curated music quotes from history's greatest musicians, composers, and philosophers,
 * as well as interesting music facts.
 * 
 * Includes pedagogical audience tagging ('teacher' | 'student' | 'all') for child safety
 * and role-tailored daily quote selection.
 */

export type QuoteCategory = 'klassik' | 'jazz' | 'rock_pop' | 'philosophie' | 'motivation' | 'fact' | 'joke';
export type TargetAudience = 'teacher' | 'student' | 'all';

export interface MusicQuote {
  type: 'quote' | 'fact' | 'joke';
  text: string;
  author: string;
  category?: QuoteCategory;
  audience?: TargetAudience[];
}

export const MUSIC_QUOTES: MusicQuote[] = [
  // --- KLASSIK & BAROCK ---
  {
    type: 'quote',
    category: 'klassik',
    audience: ['student', 'teacher', 'all'],
    text: "Es ist gar nicht schwer, ein Instrument zu spielen: Man muss nur zur rechten Zeit die rechten Tasten treffen, das Instrument spielt von selbst.",
    author: "Johann Sebastian Bach"
  },
  {
    type: 'quote',
    category: 'klassik',
    audience: ['teacher', 'all'],
    text: "Musik ist höhere Offenbarung als alle Weisheit und Philosophie.",
    author: "Ludwig van Beethoven"
  },
  {
    type: 'quote',
    category: 'klassik',
    audience: ['student', 'teacher', 'all'],
    text: "Die Musik steckt nicht in den Noten, sondern in der Stille dazwischen.",
    author: "Wolfgang Amadeus Mozart"
  },
  {
    type: 'quote',
    category: 'klassik',
    audience: ['student', 'teacher', 'all'],
    text: "Die Musik ist das Schöne an sich, sie macht die Gefühle verständlich.",
    author: "Frédéric Chopin"
  },
  {
    type: 'quote',
    category: 'klassik',
    audience: ['teacher'],
    text: "Musik drückt nichts aus außer sich selbst. Die Sprache der Noten ist ein eigenes Universum.",
    author: "Igor Strawinsky"
  },
  {
    type: 'quote',
    category: 'klassik',
    audience: ['student', 'teacher', 'all'],
    text: "Musik ist die Geometrie der Töne und die Architektur der Gefühle.",
    author: "Claude Debussy"
  },
  {
    type: 'quote',
    category: 'klassik',
    audience: ['student', 'teacher', 'all'],
    text: "Ohne Fleiß kein Preis – aber ohne Leidenschaft nützt auch der ganze Fleiß im Musizieren nichts.",
    author: "Johannes Brahms"
  },
  {
    type: 'quote',
    category: 'klassik',
    audience: ['teacher', 'student', 'all'],
    text: "Das Beste in der Musik steht nicht in den Noten.",
    author: "Gustav Mahler"
  },
  {
    type: 'quote',
    category: 'klassik',
    audience: ['teacher', 'all'],
    text: "Licht senden in die Tiefe des menschlichen Herzens – das ist des Künstlers Beruf.",
    author: "Robert Schumann"
  },
  {
    type: 'quote',
    category: 'klassik',
    audience: ['teacher'],
    text: "Die Musik ist die Vermittlerin des geistigen Lebens zum sinnlichen.",
    author: "Franz Liszt"
  },
  {
    type: 'quote',
    category: 'klassik',
    audience: ['student', 'teacher', 'all'],
    text: "Es gibt keine strengen Regeln in der Musik, solange das Ergebnis die Seele berührt.",
    author: "Antonio Vivaldi"
  },
  {
    type: 'quote',
    category: 'klassik',
    audience: ['student', 'teacher', 'all'],
    text: "Meine Sprache versteht man in der ganzen Welt.",
    author: "Joseph Haydn"
  },
  {
    type: 'quote',
    category: 'klassik',
    audience: ['teacher'],
    text: "Die Musik ist die Sprache der Leidenschaft.",
    author: "Richard Wagner"
  },

  // --- JAZZ, BLUES & GROOVE ---
  {
    type: 'quote',
    category: 'jazz',
    audience: ['student', 'teacher', 'all'],
    text: "Spiele nicht, was da steht. Spiele das, was nicht da steht.",
    author: "Miles Davis"
  },
  {
    type: 'quote',
    category: 'jazz',
    audience: ['student', 'teacher', 'all'],
    text: "Du kannst improvisieren, wenn du die Grundlagen so gut kennst, dass du sie vergessen kannst.",
    author: "John Coltrane"
  },
  {
    type: 'quote',
    category: 'jazz',
    audience: ['student', 'teacher', 'all'],
    text: "Ein falscher Ton, den man mit Überzeugung spielt, ist besser als ein richtiger Ton, den man zögerlich spielt.",
    author: "Thelonious Monk"
  },
  {
    type: 'quote',
    category: 'jazz',
    audience: ['student', 'teacher', 'all'],
    text: "Es gibt nur zwei Arten von Musik: Gute Musik und die andere.",
    author: "Duke Ellington"
  },
  {
    type: 'quote',
    category: 'jazz',
    audience: ['student', 'teacher', 'all'],
    text: "Was ist Jazz? Man muss nicht erklären, was es ist. Wenn du danach fragen musst, wirst du es nie verstehen.",
    author: "Louis Armstrong"
  },
  {
    type: 'quote',
    category: 'jazz',
    audience: ['student', 'teacher', 'all'],
    text: "Musik sollte das Herz direkt berühren, ohne den Umweg über den Verstand nehmen zu müssen.",
    author: "Bill Evans"
  },
  {
    type: 'quote',
    category: 'jazz',
    audience: ['student', 'teacher', 'all'],
    text: "Das Einzige, was besser ist als Singen, ist noch mehr Singen.",
    author: "Ella Fitzgerald"
  },
  {
    type: 'quote',
    category: 'jazz',
    audience: ['student', 'teacher', 'all'],
    text: "Ein einfaches Ding kompliziert zu machen ist alltäglich; das Komplizierte einfach zu machen – das ist Kreativität.",
    author: "Charles Mingus"
  },
  {
    type: 'quote',
    category: 'jazz',
    audience: ['student', 'teacher', 'all'],
    text: "Musik ist deine eigene Erfahrung, deine Gedanken, deine Weisheit. Wenn du es nicht lebst, kommt es auch nicht aus deinem Instrument.",
    author: "Charlie Parker"
  },
  {
    type: 'quote',
    category: 'jazz',
    audience: ['student', 'teacher', 'all'],
    text: "Künstlerische Freiheit bedeutet für mich, absolut keine Angst zu haben.",
    author: "Nina Simone"
  },

  // --- ROCK, POP & MODERNE ---
  {
    type: 'quote',
    category: 'rock_pop',
    audience: ['student', 'teacher', 'all'],
    text: "Musik lügt nicht. Wenn sich etwas in der Welt verändern soll, dann kann es nur durch Musik geschehen.",
    author: "Jimi Hendrix"
  },
  {
    type: 'quote',
    category: 'rock_pop',
    audience: ['student', 'teacher', 'all'],
    text: "Deine Musik ist der direkte Spiegel deines Herzens. Was du fühlst, wird zu Tönen.",
    author: "Quincy Jones"
  },
  {
    type: 'quote',
    category: 'rock_pop',
    audience: ['student', 'teacher', 'all'],
    text: "Musik kann die Welt zwar nicht direkt verändern, aber sie verändert die Menschen, die die Welt verändern.",
    author: "Bob Dylan"
  },
  {
    type: 'quote',
    category: 'rock_pop',
    audience: ['student', 'teacher', 'all'],
    text: "Ein echter Musiker sucht nie nach Ruhm, sondern nach der Perfektion des reinen Klangs.",
    author: "Prince"
  },
  {
    type: 'quote',
    category: 'rock_pop',
    audience: ['student', 'teacher', 'all'],
    text: "Ein guter Song ist wie ein guter Freund: Er bleibt ein Leben lang an deiner Seite.",
    author: "Paul McCartney"
  },
  {
    type: 'quote',
    category: 'rock_pop',
    audience: ['student', 'teacher', 'all'],
    text: "Ohne Abweichung von der Norm ist musikalischer Fortschritt überhaupt nicht möglich.",
    author: "Frank Zappa"
  },
  {
    type: 'quote',
    category: 'rock_pop',
    audience: ['student', 'teacher', 'all'],
    text: "Deine Gitarre ist deine Stimme. Lass sie die Dinge sagen, für die du keine Worte findest.",
    author: "Carlos Santana"
  },
  {
    type: 'quote',
    category: 'rock_pop',
    audience: ['student', 'teacher', 'all'],
    text: "Die Noten sind nur 10 % der Musik. Die anderen 90 % sind Emotion, Rhythmus, Zuhören und Seele.",
    author: "Victor Wooten"
  },
  {
    type: 'quote',
    category: 'rock_pop',
    audience: ['student', 'teacher', 'all'],
    text: "Es geht beim Musizieren nicht darum, perfekt zu sein. Es geht darum, absolut echt zu sein.",
    author: "Dave Grohl"
  },
  {
    type: 'quote',
    category: 'rock_pop',
    audience: ['student', 'teacher', 'all'],
    text: "Musik kann die Welt verändern, weil sie die Herzen der Menschen berührt.",
    author: "Bono"
  },

  // --- PHILOSOPHIE & ANTIKE ---
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['student', 'teacher', 'all'],
    text: "Die Musik drückt das aus, was nicht gesagt werden kann und worüber zu schweigen unmöglich ist.",
    author: "Victor Hugo"
  },
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['student', 'teacher', 'all'],
    text: "Ohne Musik wäre das Leben ein Irrtum.",
    author: "Friedrich Nietzsche"
  },
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['student', 'teacher', 'all'],
    text: "Musik ist die gemeinsame Sprache der Menschheit.",
    author: "Henry Wadsworth Longfellow"
  },
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['student', 'teacher', 'all'],
    text: "Wo die Sprache aufhört, fängt die Musik an.",
    author: "E.T.A. Hoffmann"
  },
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['student', 'teacher', 'all'],
    text: "Musik wäscht den Staub des Alltags von der Seele.",
    author: "Berthold Auerbach"
  },
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['student', 'teacher', 'all'],
    text: "Musik ist die beste Medizin, die es gibt.",
    author: "Unbekannt"
  },
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['student', 'teacher', 'all'],
    text: "Im Wesen der Musik liegt es, Freude zu bereiten.",
    author: "Aristoteles"
  },
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['student', 'teacher', 'all'],
    text: "Musik sagt mehr als tausend Worte.",
    author: "Sprichwort"
  },
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['student', 'teacher', 'all'],
    text: "Wo Worte aufhören, da beginnt die Musik und bringt Frieden in die Herzen.",
    author: "Heinrich Heine"
  },
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['student', 'teacher', 'all'],
    text: "Musik gibt dem Universum eine Seele, dem Geist Flügel, der Fantasie Flugkraft und allem Leben Charme und Fröhlichkeit.",
    author: "Platon"
  },
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['teacher'],
    text: "Die Musik ist eine unbewusste Übung in der Metaphysik, bei der der Geist nicht weiß, dass er philosophiert.",
    author: "Arthur Schopenhauer"
  },
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['teacher', 'all'],
    text: "Möchtest du erkennen, ob ein Land gut regiert wird und gute Sitten herrschen, so lausche seiner Musik.",
    author: "Konfuzius"
  },
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['teacher'],
    text: "Die Musik ist das Element des Gefühls, das unendlich tief ist.",
    author: "Søren Kierkegaard"
  },
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['student', 'teacher', 'all'],
    text: "Musik bewegt uns, weil sie der Herzschlag des Universums ist.",
    author: "Ralph Waldo Emerson"
  },
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['student', 'teacher', 'all'],
    text: "Wenn die Musik die Nahrung der Liebe ist, so spielt weiter!",
    author: "William Shakespeare"
  },
  {
    type: 'quote',
    category: 'philosophie',
    audience: ['student', 'teacher', 'all'],
    text: "Musik ist die Sprache, wo Sprachen enden, und das schönste Geschenk an das menschliche Gemüt.",
    author: "Hermann Hesse"
  },

  // --- ÜBE- & LERNMOTIVATION ---
  {
    type: 'quote',
    category: 'motivation',
    audience: ['student', 'teacher', 'all'],
    text: "Musik verjüngt das Herz und schenkt uns die Fähigkeit zu staunen.",
    author: "Pablo Casals"
  },
  {
    type: 'quote',
    category: 'motivation',
    audience: ['student', 'teacher', 'all'],
    text: "Das Üben ist nicht eine Pflicht, sondern ein Privileg und ein tiefes Gespräch mit sich selbst.",
    author: "Yehudi Menuhin"
  },
  {
    type: 'quote',
    category: 'motivation',
    audience: ['student', 'teacher', 'all'],
    text: "Um große Dinge zu erreichen, braucht man zwei Dinge: Einen guten Plan und nicht ganz genug Zeit.",
    author: "Leonard Bernstein"
  },
  {
    type: 'quote',
    category: 'motivation',
    audience: ['student', 'teacher', 'all'],
    text: "Wissen ist noch nicht Können. Können entsteht erst durch tausendfaches Wiederholen mit Freude.",
    author: "Shinichi Suzuki"
  },
  {
    type: 'quote',
    category: 'motivation',
    audience: ['student', 'teacher', 'all'],
    text: "Ein wahrer Musiker lernt sein Leben lang. Jeder Ton ist ein Neuanfang.",
    author: "Nadia Boulanger"
  },
  {
    type: 'quote',
    category: 'motivation',
    audience: ['student', 'teacher', 'all'],
    text: "Der echte Musiker übt nicht, weil er muss, sondern weil er ohne die Töne nicht atmen kann.",
    author: "Igor Strawinsky"
  },
  {
    type: 'quote',
    category: 'motivation',
    audience: ['student', 'teacher', 'all'],
    text: "Die Noten lese ich nicht besser als andere. Aber die Pausen dazwischen – dort liegt die wahre Kunst.",
    author: "Artur Schnabel"
  },
  {
    type: 'quote',
    category: 'motivation',
    audience: ['student', 'teacher', 'all'],
    text: "Der Unterschied zwischen einem Amateur und einem Profi: Der Amateur übt, bis er es richtig kann. Der Profi übt, bis er es nicht mehr falsch machen kann.",
    author: "Vladimir Horowitz"
  },
  {
    type: 'quote',
    category: 'motivation',
    audience: ['student', 'teacher', 'all'],
    text: "Wenn ich einen Tag nicht übe, merke ich es. Wenn ich zwei Tage nicht übe, merken es die Kritiker. Wenn ich drei Tage nicht übe, merkt es das Publikum.",
    author: "Niccolò Paganini"
  },
  {
    type: 'quote',
    category: 'motivation',
    audience: ['student', 'teacher', 'all'],
    text: "Das Geheimnis des Instrumentalspiels liegt darin, die Spannungen des Körpers in reine Musik zu verwandeln.",
    author: "Claudio Arrau"
  },

  // --- MUSIKFAKTEN ---
  {
    type: 'fact',
    category: 'fact',
    audience: ['student', 'teacher', 'all'],
    text: "Wusstest du, dass die tiefste jemals gemessene Orgelpfeife einen Ton von 8 Hz erzeugt? Dieser ist für den Menschen unhörbar, kann aber als Vibration wahrgenommen werden.",
    author: "Orgel-Fakt"
  },
  {
    type: 'fact',
    category: 'fact',
    audience: ['student', 'teacher', 'all'],
    text: "Wolfgang Amadeus Mozart vollendete in seinem kurzen Leben von 35 Jahren über 600 Kompositionen – das entspricht etwa 240 Stunden reiner Musik.",
    author: "Mozart-Fakt"
  },
  {
    type: 'fact',
    category: 'fact',
    audience: ['student', 'teacher', 'all'],
    text: "In der Barockmusik galt die Quarte (Intervall von vier Tonschritten) in zweistimmigen Sätzen noch als Dissonanz und musste regelgerecht aufgelöst werden.",
    author: "Musiktheorie-Fakt"
  },
  {
    type: 'fact',
    category: 'fact',
    audience: ['student', 'teacher', 'all'],
    text: "Der Tritonus-Akkord wurde im Mittelalter wegen seiner extremen Dissonanz als 'Diabolus in Musica' (Teufel in der Musik) bezeichnet und streng vermieden.",
    author: "Musikgeschichte-Fakt"
  },
  {
    type: 'fact',
    category: 'fact',
    audience: ['student', 'teacher', 'all'],
    text: "Das älteste spielbare Musikinstrument der Welt ist eine Knochenflöte aus einer Höhle in Slowenien. Ihr Alter wird auf rund 43.000 Jahre geschätzt.",
    author: "Archäologie-Fakt"
  },
  {
    type: 'fact',
    category: 'fact',
    audience: ['student', 'teacher', 'all'],
    text: "Ludwig van Beethoven komponierte seine berühmte 9. Sinfonie, einschließlich der weltbekannten 'Ode an die Freude', als er bereits vollständig gehörlos war.",
    author: "Beethoven-Fakt"
  },
  {
    type: 'fact',
    category: 'fact',
    audience: ['student', 'teacher', 'all'],
    text: "Das 'Wohltemperierte Klavier' von J. S. Bach bewies, dass man dank der wohltemperierten Stimmung in allen 24 Dur- und Molltonarten wohlklingend spielen kann.",
    author: "Musiktheorie-Fakt"
  },
  {
    type: 'fact',
    category: 'fact',
    audience: ['student', 'teacher', 'all'],
    text: "Das Wort 'Klavier' leitet sich vom lateinischen 'clavis' (Schlüssel) ab und bezeichnete ursprünglich ganz allgemein die Tasten eines Tasteninstruments.",
    author: "Etymologie-Fakt"
  },
  {
    type: 'fact',
    category: 'fact',
    audience: ['student', 'teacher', 'all'],
    text: "Pjotr Iljitsch Tschaikowski vertonte den Sieg über Napoleon in seiner 'Ouvertüre 1812' unter Einsatz von echten Kanonenschüssen als Rhythmusinstrument.",
    author: "Musikgeschichte-Fakt"
  },
  {
    type: 'fact',
    category: 'fact',
    audience: ['student', 'teacher', 'all'],
    text: "Der Begriff 'A cappella' bedeutete ursprünglich 'nach Kapellart' und bezeichnete Gesangsstücke, die ohne eigenständige Instrumentenbegleitung aufgeführt wurden.",
    author: "Musikgeschichte-Fakt"
  }
];

/**
 * Helper to get quotes filtered for a specific target audience
 */
export function getQuotesForAudience(target: TargetAudience): MusicQuote[] {
  return MUSIC_QUOTES.filter(q => {
    if (!q.audience || q.audience.includes('all')) return true;
    return q.audience.includes(target);
  });
}

/**
 * Helper to get all quotes
 */
export function getAllQuotes(): MusicQuote[] {
  return MUSIC_QUOTES;
}

/**
 * Helper to get a daily quote for a given date seed and audience
 */
export function getDailyQuote(dateSeed: number, audience: TargetAudience = 'all'): MusicQuote {
  const pool = getQuotesForAudience(audience);
  const index = Math.abs(dateSeed) % pool.length;
  return pool[index];
}

/**
 * Helper to get a random quote for an audience
 */
export function getRandomQuote(audience: TargetAudience = 'all'): MusicQuote {
  const pool = getQuotesForAudience(audience);
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/**
 * Helper to filter quotes by category
 */
export function getQuotesByCategory(category: QuoteCategory, audience: TargetAudience = 'all'): MusicQuote[] {
  return getQuotesForAudience(audience).filter(q => q.category === category);
}

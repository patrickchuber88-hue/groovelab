import { buildContinuousHomeworkNarrative, formatSingleBookForSpeech, formatSingleSongForSpeech } from '../../services/neuralTtsService';

function runTests() {
  console.log('🧪 Starting Neural TTS Narrative Tests...\n');

  // Test 1: Multiple tasks (Book + Song + Audio + Teacher Name)
  const t1 = buildContinuousHomeworkNarrative({
    teacherName: 'Florian Huber',
    books: [
      { title: 'Klavierschule Band 1 (Klavier)', pageNums: [14, 15], notes: ['Takt 8 langsam üben'] }
    ],
    songs: [
      { title: 'Smoke on the Water (Deep Purple)', note: 'Intro mit Metronom 80 BPM' }
    ],
    audioCount: 1,
    generalNotes: 'Bitte Notenheft mitbringen'
  });

  console.log('Test 1 (Multiple Tasks with Teacher):');
  console.log(t1);
  if (!t1.startsWith('Hallo! Hier sind deine Aufgaben für diese Woche von deiner Lehrkraft Florian Huber.')) {
    throw new Error('Test 1 Failed: Expected natural teacher greeting');
  }
  if (!t1.includes('Als Erstes übst du im Lehrwerk Klavierschule Band 1 auf den Seiten 14 und fünfzehn.')) {
    throw new Error('Test 1 Failed: Expected natural first book phrase');
  }
  if (!t1.includes('Und als Zweites übst du beim Song Smohk on se Woter von Deep Purple.')) {
    throw new Error('Test 1 Failed: Expected natural second song connector');
  }
  if (!t1.includes('Dazu gibt es eine Aufnahme aus dem Unterricht zum Mitspielen.')) {
    throw new Error('Test 1 Failed: Expected audio note phrase');
  }
  if (!t1.includes('Viel Freude beim Üben!')) {
    throw new Error('Test 1 Failed: Expected closing phrase');
  }
  console.log('✅ Test 1 Passed!\n');

  // Test 2: Single task (Single Book without teacher)
  const t2 = buildContinuousHomeworkNarrative({
    books: [
      { title: 'Gitarrenstarter', pageNums: [5] }
    ]
  });

  console.log('Test 2 (Single Book, No Teacher):');
  console.log(t2);
  if (!t2.startsWith('Hallo! Hier ist deine Hausaufgabe für diese Woche.')) {
    throw new Error('Test 2 Failed: Expected single homework greeting');
  }
  if (!t2.includes('Im Lehrwerk Gitarrenstarter übst du auf Seite fünf.')) {
    throw new Error('Test 2 Failed: Expected direct single book phrase without ordinal prefix');
  }
  console.log('✅ Test 2 Passed!\n');

  // Test 3: Single task (Single Song with teacher)
  const t3 = buildContinuousHomeworkNarrative({
    teacherName: 'Anna Müller',
    songs: [
      { title: 'Let It Be (The Beatles)', note: 'Refrain üben' }
    ]
  });

  console.log('Test 3 (Single Song with Teacher):');
  console.log(t3);
  if (!t3.startsWith('Hallo! Hier ist deine Hausaufgabe für diese Woche von deiner Lehrkraft Anna Müller.')) {
    throw new Error('Test 3 Failed: Expected single song teacher greeting');
  }
  if (!t3.includes('Beim Song Lätt It Bie von se Beatles lautet dein Fahrplan, Refrain üben.')) {
    throw new Error('Test 3 Failed: Expected smooth single song phrase');
  }
  console.log('✅ Test 3 Passed!\n');

  // Test 4: Three tasks (Book, Book, Song)
  const t4 = buildContinuousHomeworkNarrative({
    books: [
      { title: 'Buch A', pageNums: [1] },
      { title: 'Buch B', pageNums: [2] }
    ],
    songs: [
      { title: 'Song C', note: 'Solo üben' }
    ]
  });

  console.log('Test 4 (Three Tasks):');
  console.log(t4);
  if (!t4.includes('Als Erstes übst du im Lehrwerk Buch A auf Seite eins.')) {
    throw new Error('Test 4 Failed: Expected Als Erstes');
  }
  if (!t4.includes('Als Nächstes übst du im Lehrwerk Buch B auf Seite zwei.')) {
    throw new Error('Test 4 Failed: Expected Als Nächstes');
  }
  if (!t4.includes('Und zum Schluss übst du beim Song Song C.')) {
    throw new Error('Test 4 Failed: Expected Und zum Schluss');
  }
  console.log('✅ Test 4 Passed!\n');

  // Test 5: Empty state (Holidays / No tasks)
  const t5 = buildContinuousHomeworkNarrative({});
  console.log('Test 5 (Empty State):');
  console.log(t5);
  if (!t5.includes('Hallo! Für diese Woche sind noch keine Aufgaben eingetragen. Viel Freude beim Üben!')) {
    throw new Error('Test 5 Failed: Expected empty state message');
  }
  console.log('✅ Test 5 Passed!\n');

  // Test 6: Single name only (e.g. 'Severin') -> MUST be completely omitted in speech!
  const t6 = buildContinuousHomeworkNarrative({
    teacherName: 'Severin',
    songs: [{ title: 'Song X', note: 'Üben' }]
  });
  console.log('Test 6 (Single Name Only - Omission):');
  console.log(t6);
  if (!t6.startsWith('Hallo! Hier ist deine Hausaufgabe für diese Woche.')) {
    throw new Error('Test 6 Failed: Single first name must be completely omitted from speech greeting');
  }
  if (t6.includes('Severin')) {
    throw new Error('Test 6 Failed: Single first name should not be present in spoken greeting');
  }
  console.log('✅ Test 6 Passed!\n');

  // Test 7: Generic placeholder ('deine Lehrkraft') -> MUST be completely omitted in speech!
  const t7 = buildContinuousHomeworkNarrative({
    teacherName: 'deine Lehrkraft',
    songs: [{ title: 'Song Y', note: 'Üben' }]
  });
  console.log('Test 7 (Placeholder - Omission):');
  console.log(t7);
  if (!t7.startsWith('Hallo! Hier ist deine Hausaufgabe für diese Woche.')) {
    throw new Error('Test 7 Failed: Placeholder must be completely omitted from speech greeting');
  }
  if (t7.includes('deine Lehrkraft') || t7.includes('Lehrkraft')) {
    throw new Error('Test 7 Failed: Placeholder should not be present in spoken greeting');
  }
  console.log('✅ Test 7 Passed!\n');

  // Test 8: Single initial ('Florian H.') -> MUST be completely omitted in speech!
  const t8 = buildContinuousHomeworkNarrative({
    teacherName: 'Florian H.',
    songs: [{ title: 'Song Z', note: 'Üben' }]
  });
  console.log('Test 8 (Single Initial - Omission):');
  console.log(t8);
  if (!t8.startsWith('Hallo! Hier ist deine Hausaufgabe für diese Woche.')) {
    throw new Error('Test 8 Failed: Initial must be completely omitted from speech greeting');
  }
  // Test 9: 1% Goldstandard Pages & Audio Recordings & Student Name
  const t9 = buildContinuousHomeworkNarrative({
    studentFirstName: 'Paul',
    teacherName: 'Florian Huber',
    books: [
      { title: 'Modern Drumming 1', pages: [14, 15], notes: ['Seite 14: Übung 3 und 4 mit Metronom'] }
    ],
    songs: [
      { title: 'Billie Jean', artist: 'Michael Jackson', note: 'Vers und Chorus' }
    ],
    audioRecordings: [
      { label: 'Play-Along Halbplayback' }
    ],
    studentQuestion: 'Wie spiele ich Takt 16?'
  });
  console.log('Test 9 (1% Goldstandard Pages, Audio & Student Name):');
  console.log(t9);
  if (!t9.startsWith('Hallo Paul! Hier sind deine Aufgaben für diese Woche von deiner Lehrkraft Florian Huber.')) {
    throw new Error('Test 9 Failed: Expected personalized student and teacher greeting');
  }
  if (!t9.includes('auf den Seiten 14 und fünfzehn.')) {
    throw new Error('Test 9 Failed: Expected pages to be properly read out from pages property');
  }
  if (!t9.includes('Zum Mitspielen gibt es die Aufnahme Play Along Halbplayback.')) {
    throw new Error('Test 9 Failed: Expected natural audio sentence "Zum Mitspielen gibt es die Aufnahme Play Along Halbplayback."');
  }
  if (t9.includes('Zu deiner Frage') || t9.includes('Takt 16')) {
    throw new Error('Test 9 Failed: Student question must NOT be spoken in the audio TTS stream');
  }
  console.log('✅ Test 9 Passed!\n');

  // Test 10: 0.1% Goldstandard Audio Deduping & Natural Grammar ('Aufnahme #1' -> 'Aufnahme 1')
  const t10 = buildContinuousHomeworkNarrative({
    songs: [{ title: 'Song X' }],
    audioRecordings: [
      { label: 'Aufnahme #1' }
    ]
  });
  console.log('Test 10 (0.1% Audio Deduping):');
  console.log(t10);
  if (!t10.includes('Zum Mitspielen gibt es Aufnahme 1.')) {
    throw new Error('Test 10 Failed: Expected deduped audio sentence "Zum Mitspielen gibt es Aufnahme 1."');
  }
  if (t10.includes('Aufnahme Aufnahme') || t10.includes('deine Aufnahme')) {
    throw new Error('Test 10 Failed: Found repetitive phrase in audio section');
  }
  console.log('✅ Test 10 Passed!\n');

  // Test 11: 0.1% Goldstandard Typo-Tolerance, Audio Dates, and Single Item Formats
  const t11 = buildContinuousHomeworkNarrative({
    books: [{ title: 'Guitar Fitness', pages: [1, 2, 3] }],
    songs: [{ title: 'Numb', artist: 'Linken Park' }],
    audioRecordings: [{ label: 'Übung · 21. Sep.' }]
  });
  console.log('Test 11 (0.1% Goldstandard Typo-Tolerance & Audio Dates):');
  console.log(t11);
  if (!t11.includes('Gittahr Fitness')) {
    throw new Error('Test 11 Failed: Expected Guitar Fitness to be pronounced as Gittahr Fitness');
  }
  if (!t11.includes('auf den Seiten 1 bis drei')) {
    throw new Error('Test 11 Failed: Expected auf den Seiten 1 bis drei');
  }
  if (!t11.includes('Namm von Linkin Pahrk')) {
    throw new Error('Test 11 Failed: Expected typo Linken Park to be transliterated to Linkin Pahrk and Numb to Namm');
  }
  if (!t11.includes('Übung, 21. September')) {
    throw new Error('Test 11 Failed: Expected Übung · 21. Sep. to be smoothed to Übung, 21. September');
  }

  const singleBook = formatSingleBookForSpeech({ title: 'Guitar Fitness', pages: [1, 2, 3] });
  if (!singleBook.startsWith('Im Lehrwerk Gittahr Fitness übst du auf den Seiten 1 bis drei.')) {
    throw new Error('Test 11 Failed: Expected warm single book sentence');
  }

  const singleSong = formatSingleSongForSpeech({ title: 'Numb', artist: 'Linken Park' });
  if (!singleSong.startsWith('Beim Song Namm von Linkin Pahrk übst du das Stück weiter.')) {
    throw new Error('Test 11 Failed: Expected warm single song sentence');
  }
  console.log('✅ Test 11 Passed!\n');

  // Test 12: 0.1% Goldstandard Hermetic Exclusion of EarLab and System Tokens
  const t12 = buildContinuousHomeworkNarrative({
    books: [{ title: 'Guitar Fitness', pages: [1, 2, 3] }],
    generalNotes: 'EARLAB_SCORE:D1|Intervalle|100%|+50XP\nWORLDTOUR_MASTERY:FR\nBitte Metronom verwenden'
  });
  console.log('Test 12 (Hermetic Exclusion of EarLab & Metadata Tokens):');
  console.log(t12);
  if (t12.includes('Intervalle') || t12.includes('EARLAB') || t12.includes('WORLDTOUR')) {
    throw new Error('Test 12 Failed: Found leaked metadata token in audio stream');
  }
  if (!t12.includes('Ein wichtiger Hinweis von deiner Lehrkraft: Bitte Metronom verwenden.')) {
    throw new Error('Test 12 Failed: Expected genuine didactic note to be spoken');
  }
  console.log('✅ Test 12 Passed!\n');

  console.log('🎉 ALL NEURAL TTS NARRATIVE TESTS PASSED WITH FLYING COLORS!');
}

runTests();

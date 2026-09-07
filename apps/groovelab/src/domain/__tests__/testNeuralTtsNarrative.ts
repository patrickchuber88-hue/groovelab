import { buildContinuousHomeworkNarrative } from '../../services/neuralTtsService';

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

  console.log('🎉 ALL NEURAL TTS NARRATIVE TESTS PASSED WITH FLYING COLORS!');
}

runTests();

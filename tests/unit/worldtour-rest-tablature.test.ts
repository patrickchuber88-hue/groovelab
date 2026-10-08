// ==============================================================================
// Campus-Groovelab Enterprise+ Domain & Tablature Test Suite
// Datei: tests/unit/worldtour-rest-tablature.test.ts
// Standards: 0,1% Notations-Goldstandard (Dorico, Sibelius, Guitar Pro, Henle)
// Zweck: Verifikation der Tabulatur-Pausen-Invariante (Zero-Fret-on-Rest)
// ==============================================================================

import {
  calculateGuitarFretAndString,
  calculateBassFretAndString,
  calculateUkuleleFretAndString,
  calculateViolinStringAndFinger,
  calculateViolaCelloStringAndFinger,
  calculateDoubleBassStringAndFinger,
  projectScoreForInstrument
} from '../../apps/groovelab/src/domain/worldTourTransposer';
import { WORLD_TOUR_COUNTRIES } from '../../apps/groovelab/src/domain/worldTourCatalog';

let totalTests = 0;
let passedTests = 0;

function assert(name: string, condition: boolean, details: string = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${name}: ${details}`);
  }
}

async function runWorldTourRestTablatureTestSuite() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🎸 TEST-SUITE: 0,1% GOLDSTANDARD TABULATUR-PAUSEN (ZERO-FRET-ON-REST)');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // 1. Direkte Rechner-Funktionen müssen bei 'REST' null liefern
  console.log('▶ Gruppe 1: Fretboard- & Fingersatz-Kalkulatoren für REST');
  assert(
    'Gitarre: calculateGuitarFretAndString("REST") === null',
    calculateGuitarFretAndString('REST') === null,
    'Sollte null zurückgeben, gab aber ein Objekt zurück'
  );
  assert(
    'E-Bass: calculateBassFretAndString("REST") === null',
    calculateBassFretAndString('REST') === null,
    'Sollte null zurückgeben, gab aber ein Objekt zurück'
  );
  assert(
    'Ukulele: calculateUkuleleFretAndString("REST") === null',
    calculateUkuleleFretAndString('REST') === null,
    'Sollte null zurückgeben, gab aber ein Objekt zurück'
  );
  assert(
    'Violine: calculateViolinStringAndFinger("REST") === null',
    calculateViolinStringAndFinger('REST') === null,
    'Sollte null zurückgeben, gab aber ein Objekt zurück'
  );
  assert(
    'Viola/Cello: calculateViolaCelloStringAndFinger("REST") === null',
    calculateViolaCelloStringAndFinger('REST') === null,
    'Sollte null zurückgeben, gab aber ein Objekt zurück'
  );
  assert(
    'Kontrabass: calculateDoubleBassStringAndFinger("REST") === null',
    calculateDoubleBassStringAndFinger('REST') === null,
    'Sollte null zurückgeben, gab aber ein Objekt zurück'
  );

  // 2. Echte Töne mit Bund 0 müssen weiterhin korrekt funktionieren (Leersaiten)
  console.log('\n▶ Gruppe 2: Leersaiten-Integrität (Bund 0 für echte Töne)');
  const guitarHighE = calculateGuitarFretAndString('E4');
  assert(
    'Gitarre E4 ist Bund 0 auf Saite 0 (hohe E-Saite)',
    guitarHighE !== null && guitarHighE.fret === 0 && guitarHighE.stringIndex === 0,
    `Erhalten: ${JSON.stringify(guitarHighE)}`
  );

  const guitarB = calculateGuitarFretAndString('B3');
  assert(
    'Gitarre B3 ist Bund 0 auf Saite 1 (B-Saite)',
    guitarB !== null && guitarB.fret === 0 && guitarB.stringIndex === 1,
    `Erhalten: ${JSON.stringify(guitarB)}`
  );

  const bassE = calculateBassFretAndString('E1');
  assert(
    'E-Bass E1 ist Bund 0 auf tiefer E-Saite (Saite 3)',
    bassE !== null && bassE.fret === 0 && bassE.stringIndex === 3,
    `Erhalten: ${JSON.stringify(bassE)}`
  );

  // 3. Bulgarien ("Mila Rodino") - Die konkrete Problemstelle
  console.log('\n▶ Gruppe 3: Bulgarien ("Mila Rodino") Projektion');
  const bulgaria = WORLD_TOUR_COUNTRIES.find(c => c.code === 'BG_HORO');
  assert('Bulgarien im Katalog vorhanden', Boolean(bulgaria));

  if (bulgaria) {
    const projectedGuitar = projectScoreForInstrument(bulgaria.score, 'Gitarre', true);
    assert('Gitarren-Projektion hat Tabulatur aktiv', projectedGuitar.hasTablature === true);

    const restNotes = projectedGuitar.notes.filter(n => n.pitch === 'REST');
    assert('Bulgarien enthält Pausen (REST)', restNotes.length > 0, `Gefunden: ${restNotes.length}`);

    let anyRestHasFret = false;
    restNotes.forEach(r => {
      if (r.displayFret !== undefined || r.displayString !== undefined) {
        anyRestHasFret = true;
      }
    });

    assert(
      'Keine Pause in "Mila Rodino" besitzt displayFret oder displayString (100% frei)',
      !anyRestHasFret,
      `Pausen mit Fret: ${JSON.stringify(restNotes.filter(n => n.displayFret !== undefined))}`
    );
  }

  // 4. Katalogweite Prüfung aller 21 Stationen über alle Instrumente
  console.log('\n▶ Gruppe 4: Katalogweite Prüfung aller Länder & Instrumente');
  const instruments = ['Gitarre', 'E-Bass', 'Ukulele', 'Violine', 'Cello', 'Kontrabass'];
  let totalRestNotesAudited = 0;
  let illegalRestCount = 0;

  WORLD_TOUR_COUNTRIES.forEach(country => {
    instruments.forEach(inst => {
      const proj = projectScoreForInstrument(country.score, inst, true);
      proj.notes.forEach(note => {
        if (note.pitch === 'REST') {
          totalRestNotesAudited++;
          if (note.displayFret !== undefined || note.displayString !== undefined) {
            illegalRestCount++;
          }
        }
      });
    });
  });

  assert(
    `Alle ${totalRestNotesAudited} projizierten Pausen über alle Instrumente sind frei von Tab-Ziffern`,
    illegalRestCount === 0,
    `Gefundene illegale Pausen mit Ziffer: ${illegalRestCount}`
  );

  // 5. Zusammenfassung
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`📊 ERGEBNIS: ${passedTests} von ${totalTests} Tests bestanden.`);
  if (passedTests === totalTests) {
    console.log('🏆 0,1% GOLDSTANDARD BESTÄTIGT: Pausen besitzen NIEMALS eine Tab-Ziffer!\n');
    process.exit(0);
  } else {
    console.error(`🚨 ${totalTests - passedTests} Test(s) fehlgeschlagen!\n`);
    process.exit(1);
  }
}

runWorldTourRestTablatureTestSuite().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});

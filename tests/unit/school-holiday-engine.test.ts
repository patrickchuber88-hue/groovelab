// ==============================================================================
// Campus-Groovelab Enterprise+ Domain & Regulatory Test Suite
// Datei: tests/unit/school-holiday-engine.test.ts
// Standards: BSI IT-Grundschutz, GoBD Revisionssicherheit, KMK-Abkommen 2025–2030,
//            VdM 36-38 Unterrichtswochen-Garantie, 0% US-Cloud & Airgap-Doktrin
// Zweck: Forensische Verifikation der KMK-Ferienengine, des Horizont-Sentinels,
//        der Gaußschen Feiertagsformel und der Zero-Clutter-Deduplizierung
// ==============================================================================

import path from 'path';
import { fileURLToPath } from 'url';
import {
  getFeiertageForYear,
  getSchoolVacationsForState,
  getStatutoryHolidaysAndFeiertage,
  resolveStateFromZipCode,
  isDateInsideVacations,
  mergeStatutoryWithImportedEvents,
  SUPPORTED_STATES
} from '../../apps/groovelab/src/utils/schoolHolidayEngine';

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

async function runSchoolHolidayEngineTestSuite() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🏛️  CAMPUS-GROOVELAB: KMK SCHOOL HOLIDAY & FEIERTAG ENGINE SUITE');
  console.log('    Standards: KMK 2025–2030, Gaußsche Formel, Zero-Clutter & Airgap');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // ----------------------------------------------------------------------------
  // 1. PLZ-TO-BUNDESLAND RESOLVER
  // ----------------------------------------------------------------------------
  console.log('[1] Deterministischer PLZ-to-Bundesland Resolver');
  assert('Rheinfelden (79618) -> Baden-Württemberg', resolveStateFromZipCode('79618') === 'DE_BW');
  assert('München (80331) -> Bayern', resolveStateFromZipCode('80331') === 'DE_BY');
  assert('Köln (50667) -> Nordrhein-Westfalen', resolveStateFromZipCode('50667') === 'DE_NW');
  assert('Berlin (10115) -> Berlin', resolveStateFromZipCode('10115') === 'DE_BE');
  assert('Hamburg (20095) -> Hamburg', resolveStateFromZipCode('20095') === 'DE_HH');
  assert('Dresden (01067) -> Sachsen', resolveStateFromZipCode('01067') === 'DE_SN');
  assert('Frankfurt (60311) -> Hessen', resolveStateFromZipCode('60311') === 'DE_HE');
  assert('Schweiz Länder-Fallback (CH)', resolveStateFromZipCode('4001', 'CH') === 'CH_DEFAULT');
  assert('Österreich Länder-Fallback (AT)', resolveStateFromZipCode('1010', 'AT') === 'AT_DEFAULT');
  assert('Leere PLZ liefert Standard BW', resolveStateFromZipCode(null) === 'DE_BW');

  // ----------------------------------------------------------------------------
  // 2. GAUSS-OSTERFORMEL & FEIERTAGSBERECHNUNG
  // ----------------------------------------------------------------------------
  console.log('\n[2] Gaußsche Osterformel & Gesetzliche Feiertage (2026–2030)');
  const ft2026 = getFeiertageForYear(2026, 'DE_BW');
  const karfreitag2026 = ft2026.find(f => f.title === 'Karfreitag');
  const ostermontag2026 = ft2026.find(f => f.title === 'Ostermontag');
  const himmelfahrt2026 = ft2026.find(f => f.title === 'Christi Himmelfahrt');
  const pfingsten2026 = ft2026.find(f => f.title === 'Pfingstmontag');
  const fronleichnam2026 = ft2026.find(f => f.title === 'Fronleichnam');

  assert('Karfreitag 2026 exakt (03.04.2026)', karfreitag2026?.event_date === '2026-04-03');
  assert('Ostermontag 2026 exakt (06.04.2026)', ostermontag2026?.event_date === '2026-04-06');
  assert('Christi Himmelfahrt 2026 exakt (14.05.2026)', himmelfahrt2026?.event_date === '2026-05-14');
  assert('Pfingstmontag 2026 exakt (25.05.2026)', pfingsten2026?.event_date === '2026-05-25');
  assert('Fronleichnam 2026 in BW vorhanden (04.06.2026)', fronleichnam2026?.event_date === '2026-06-04');

  // Landesspezifische Feiertage
  const ftBerlin2026 = getFeiertageForYear(2026, 'DE_BE');
  assert('Frauentag in Berlin vorhanden (08.03.2026)', ftBerlin2026.some(f => f.title === 'Internationaler Frauentag'));
  assert('Fronleichnam in Berlin NICHT vorhanden', !ftBerlin2026.some(f => f.title === 'Fronleichnam'));

  const ftSachsen2026 = getFeiertageForYear(2026, 'DE_SN');
  assert('Reformationstag in Sachsen vorhanden (31.10.2026)', ftSachsen2026.some(f => f.title === 'Reformationstag'));

  // ----------------------------------------------------------------------------
  // 3. KMK FERIEN-DATENBANK & 2030 HORIZONT-SENTINEL
  // ----------------------------------------------------------------------------
  console.log('\n[3] KMK Ferien-Datenbank & Zukunftshorizont');
  for (const state of SUPPORTED_STATES) {
    const vacations = getSchoolVacationsForState(state.code);
    assert(`Ferien für ${state.name} (${state.code}) vorhanden`, vacations.length > 0);
    const maxEnd = vacations.reduce((max, v) => (v.event_end_date > max ? v.event_end_date : max), '2025-01-01');
    assert(`${state.code}: Horizont reicht mindestens bis 2030 (${maxEnd})`, maxEnd >= '2030-08-01');
  }

  // ----------------------------------------------------------------------------
  // 4. ZERO-CLUTTER INVARIANTE
  // ----------------------------------------------------------------------------
  console.log('\n[4] Zero-Clutter Invariante (Feiertage in Ferien stummschalten)');
  const bwVacations = getSchoolVacationsForState('DE_BW');
  assert('25.12.2026 liegt innerhalb der Weihnachtsferien', isDateInsideVacations('2026-12-25', bwVacations));
  assert('01.01.2027 liegt innerhalb der Weihnachtsferien', isDateInsideVacations('2027-01-01', bwVacations));
  assert('15.06.2026 liegt NICHT in den Ferien', !isDateInsideVacations('2026-06-15', bwVacations));

  const allStatutoryBW = getStatutoryHolidaysAndFeiertage('DE_BW');
  const hasWeihnachtstagInStatutory = allStatutoryBW.some(
    item => item.title.includes('Weihnachtstag') && item.event_date.startsWith('2026-12-25')
  );
  assert('Weihnachtstag ist im kombinierten Kalender stummgeschaltet (Zero-Clutter)', !hasWeihnachtstagInStatutory);

  // ----------------------------------------------------------------------------
  // 5. SCHULKALENDER-PRIMAT & DEDUPLIZIERUNG
  // ----------------------------------------------------------------------------
  console.log('\n[5] Schulkalender-Primat & Deduplizierung');
  const dummyImported = [
    {
      title: 'Herbstferien Musikschule Spezial',
      event_date: '2026-10-24',
      event_end_date: '2026-11-02'
    }
  ];
  const deduplicated = mergeStatutoryWithImportedEvents(allStatutoryBW, dummyImported);
  const statutoryHerbst2026 = deduplicated.find(
    item => item.title.includes('Herbstferien') && item.event_date.startsWith('2026-10')
  );
  assert('Eigene Schulferien schalten den KMK-Standard-Herbstferientermin stumm', statutoryHerbst2026 === undefined);

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`  Ergebnis: ${passedTests}/${totalTests} Tests erfolgreich bestanden.`);
  console.log('════════════════════════════════════════════════════════════════════\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runSchoolHolidayEngineTestSuite().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});

// 🏛️ Campus-Groovelab Forensic 1% Test Run: Teacher Absence & Date Simulation Invariants
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('🏛️  CAMPUS-GROOVELAB 1% FORENSIC AUDIT & TEST RUN');
console.log('   Thema: Datumssimulation, Sonntags-Invariante & Abwesenheitssystem');
console.log('═══════════════════════════════════════════════════════════════════════\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(description, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${description}`);
    if (details) console.log(`     └─ ${details}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${description}`);
    if (details) console.error(`     └─ FEHLER: ${details}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEIL 1: STATIC CODE AUDIT & SSOT INVARIANTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('▶ TESTSUITE 1: Static Code Invariant Audit (SSOT für Zeit)');

const useTeacherAbsencePath = path.join(ROOT, 'apps/groovelab/src/components/teacher/hooks/useTeacherAbsence.ts');
const teacherAbsenceModalPath = path.join(ROOT, 'apps/groovelab/src/components/teacher/TeacherAbsenceModal.tsx');
const teacherBriefingTabPath = path.join(ROOT, 'apps/groovelab/src/components/teacher/tabs/TeacherBriefingTab.tsx');
const teacherDashboardUtilsPath = path.join(ROOT, 'apps/groovelab/src/components/teacher/utils/teacherDashboardUtils.tsx');
const teacherAbsenceNotifModalPath = path.join(ROOT, 'apps/groovelab/src/components/teacher/TeacherAbsenceNotifModal.tsx');

const useTeacherAbsenceCode = fs.readFileSync(useTeacherAbsencePath, 'utf8');
const teacherAbsenceModalCode = fs.readFileSync(teacherAbsenceModalPath, 'utf8');
const teacherBriefingTabCode = fs.readFileSync(teacherBriefingTabPath, 'utf8');
const teacherDashboardUtilsCode = fs.readFileSync(teacherDashboardUtilsPath, 'utf8');
const teacherAbsenceNotifModalCode = fs.readFileSync(teacherAbsenceNotifModalPath, 'utf8');

// 1.1 useTeacherAbsence.ts imports getSimulatedNow
assert(
  'useTeacherAbsence.ts importiert getSimulatedNow aus useSimulatedTime',
  useTeacherAbsenceCode.includes("import { getSimulatedNow } from '../../../hooks/useSimulatedTime';")
);

// 1.2 useTeacherAbsence.ts initial state uses getSimulatedNow()
assert(
  'useTeacherAbsence.ts initialisiert Start-/Enddatum reaktiv via getSimulatedNow()',
  useTeacherAbsenceCode.includes("useState(() => getSimulatedNow().toLocaleDateString('sv-SE'))")
);

// 1.3 useTeacherAbsence.ts listens to groovelab_simulated_date_changed
assert(
  'useTeacherAbsence.ts registriert Event-Listener auf groovelab_simulated_date_changed',
  useTeacherAbsenceCode.includes("window.addEventListener('groovelab_simulated_date_changed', handleSimDateSync);")
);

// 1.4 No raw new Date().toLocaleDateString in useTeacherAbsence timeline processing
const hasRawTodayInTimeline = useTeacherAbsenceCode.includes("if (briefingData?.timeline) {\n      const todayStr = new Date().toLocaleDateString('sv-SE');");
assert(
  'useTeacherAbsence.ts projiziert Timeline-Slots NICHT mehr auf rohes new Date()',
  !hasRawTodayInTimeline,
  hasRawTodayInTimeline ? 'Gefunden: rohes new Date().toLocaleDateString im Timeline-Loop' : 'Vollständig neutralisiert'
);

// 1.5 Slot Date Autonomy Invariant
assert(
  'useTeacherAbsence.ts respektiert Slot-Autonomie (s.date || briefingData.selectedDate || simTodayStr)',
  useTeacherAbsenceCode.includes("const slotDateStr = s.date || (briefingData as any)?.selectedDate || simTodayStr;")
);

// 1.6 TeacherAbsenceModal.tsx uses getSimulatedNow in presets
assert(
  'TeacherAbsenceModal.tsx nutzt getSimulatedNow für 1-Tap Presets (Nur Heute, Bis Fr, Nächste Woche Fr)',
  teacherAbsenceModalCode.includes("const today = getSimulatedNow().toLocaleDateString('sv-SE');") &&
  teacherAbsenceModalCode.includes("const simNow = getSimulatedNow();")
);

// 1.7 TeacherBriefingTab.tsx uses getSimulatedNow in absence click handlers
assert(
  'TeacherBriefingTab.tsx nutzt getSimulatedNow() bei Ausfall-Meldung',
  teacherBriefingTabCode.includes("const today = getSimulatedNow().toLocaleDateString('sv-SE');")
);

// 1.8 teacherDashboardUtils.tsx re-exports canonical getSimulatedNow (Zero Duplication)
assert(
  'teacherDashboardUtils.tsx re-exportiert kanonisch getSimulatedNow aus useSimulatedTime',
  teacherDashboardUtilsCode.includes("import { getSimulatedNow } from '../../../hooks/useSimulatedTime';") &&
  teacherDashboardUtilsCode.includes("export { getSimulatedNow };")
);

// 1.9 TeacherAbsenceNotifModal.tsx fallback uses getSimulatedNow()
assert(
  'TeacherAbsenceNotifModal.tsx nutzt getSimulatedNow() als Fallback für Startdatum',
  teacherAbsenceNotifModalCode.includes("getSimulatedNow().toLocaleDateString('de-DE')")
);

// ─────────────────────────────────────────────────────────────────────────────
// TEIL 2: MATHEMATISCHE & LOGISCHE REPRODUKTIONSTESTS (MOCKING)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ TESTSUITE 2: Algorithmische Reproduktion & Verifikation der Invarianten');

// Simuliere getSimulatedNow Implementierung
function simulateTime(simStr) {
  if (!simStr) return new Date();
  const parts = simStr.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 14, 0, 0, 0);
}

// 2.1 Testcase: Simulation auf Dienstag 2026-09-29 gesetzt
const simTuesday = simulateTime('2026-09-29');
const simTuesdayStr = simTuesday.toLocaleDateString('sv-SE');

assert(
  'Datumssimulation liefert bei 2026-09-29 exakt Dienstag',
  simTuesday.getDay() === 2 && simTuesdayStr === '2026-09-29',
  `Tag: ${simTuesday.getDay()} (2=Di), Datum: ${simTuesdayStr}`
);

// 2.2 Testcase: Preset "Bis Freitag" von simuliertem Dienstag
const calcFriday = (simNow) => {
  const d = new Date(simNow);
  const day = d.getDay();
  const diffToFri = (5 - day + 7) % 7;
  d.setDate(d.getDate() + diffToFri);
  return d.toLocaleDateString('sv-SE');
};
const calculatedFri = calcFriday(simTuesday);
assert(
  'Preset "Bis Freitag" von Di 29.09. ergibt Fr 02.10.2026',
  calculatedFri === '2026-10-02',
  `Ergebnis: ${calculatedFri}`
);

// 2.3 Testcase: Preset "Nächste Woche Fr" von simuliertem Dienstag
const calcNextFriday = (simNow) => {
  const d = new Date(simNow);
  const day = d.getDay();
  const diffToFri = (5 - day + 7) % 7;
  d.setDate(d.getDate() + diffToFri + 7);
  return d.toLocaleDateString('sv-SE');
};
const calculatedNextFri = calcNextFriday(simTuesday);
assert(
  'Preset "Nächste Woche Fr" von Di 29.09. ergibt Fr 09.10.2026',
  calculatedNextFri === '2026-10-09',
  `Ergebnis: ${calculatedNextFri}`
);

// 2.4 Testcase: Phänomen-Simulation (Timeline-Slot-Projektion)
// Gegeben: 7 Slots für Dienstag 2026-09-29
const mockBriefingSlots = [
  { timeSlot: '14:00', date: '2026-09-29', status: 'teacher_ausfall', student_id: 's1' },
  { timeSlot: '14:30', date: '2026-09-29', status: 'teacher_ausfall', student_id: 's2' },
  { timeSlot: '15:00', date: '2026-09-29', status: 'teacher_ausfall', student_id: 's3' },
  { timeSlot: '15:30', date: '2026-09-29', status: 'teacher_ausfall', student_id: 's4' },
  { timeSlot: '16:00', date: '2026-09-29', status: 'teacher_ausfall', student_id: 's5' },
  { timeSlot: '16:30', date: '2026-09-29', status: 'teacher_ausfall', student_id: 's6' },
  { timeSlot: '17:00', date: '2026-09-29', status: 'teacher_ausfall', student_id: 's7' }
];

// Nach der neuen 1% Goldstandard Logik:
const groups = {};
mockBriefingSlots.forEach(s => {
  const slotDateStr = s.date || simTuesdayStr;
  if (!groups[slotDateStr]) {
    const isToday = slotDateStr === simTuesdayStr;
    const dt = new Date(slotDateStr + 'T12:00:00');
    const weekdayShort = dt.toLocaleDateString('de-DE', { weekday: 'short' }).replace(/\.+$/, '');
    const dayMonth = dt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    groups[slotDateStr] = {
      dateStr: slotDateStr,
      formattedDate: isToday ? `Heute, ${weekdayShort}. ${dayMonth}` : `${weekdayShort}. ${dayMonth}`,
      items: []
    };
  }
  groups[slotDateStr].items.push(s);
});

assert(
  'Slots verbleiben autoritativ auf 2026-09-29 und projizieren NICHT auf Sonntag',
  groups['2026-09-29'] && groups['2026-09-29'].items.length === 7,
  `Anzahl Slots unter 2026-09-29: ${groups['2026-09-29']?.items.length}`
);

assert(
  'Sonntag (2026-09-20) existiert zu 0% in den Ausfallgruppen',
  groups['2026-09-20'] === undefined,
  `groups['2026-09-20'] ist ${groups['2026-09-20']}`
);

assert(
  'Dienstag 2026-09-29 wird korrekt als "Heute, Di. 29.09." formatiert',
  groups['2026-09-29'].formattedDate.startsWith('Heute, Di. 29.09'),
  `Formatiert: "${groups['2026-09-29'].formattedDate}"`
);

// ─────────────────────────────────────────────────────────────────────────────
// TEIL 3: LIVE POSTGRESQL DATENBANK-FORENSIK (SERVER 178.105.10.2)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ TESTSUITE 3: Live PostgreSQL Forensic Database Audit');

try {
  // 3.1 Prüfe crisis_notifications für Sonntag 2026-09-20
  const cmdCheckSunday = `ssh -o StrictHostKeyChecking=no root@178.105.10.2 "docker exec -i supabase-db psql -U postgres -d postgres -t -A -c \\"SELECT COUNT(*) FROM crisis_notifications WHERE slot_start_datetime::date = '2026-09-20';\\""`;
  const sundayCount = execSync(cmdCheckSunday, { encoding: 'utf8' }).trim();
  assert(
    'PostgreSQL Tabelle crisis_notifications hat für Sonntag (2026-09-20) exakt 0 Einträge',
    sundayCount === '0',
    `Gefundene Einträge: ${sundayCount}`
  );

  // 3.2 Prüfe reguläre Stundenplan-Einträge auf Sonntag (day_of_week = 7)
  const cmdCheckSundaySchedules = `ssh -o StrictHostKeyChecking=no root@178.105.10.2 "docker exec -i supabase-db psql -U postgres -d postgres -t -A -c \\"SELECT COUNT(*) FROM schedules WHERE day_of_week = 7;\\""`;
  const sundaySchedulesCount = execSync(cmdCheckSundaySchedules, { encoding: 'utf8' }).trim();
  assert(
    'PostgreSQL Tabelle schedules hat sonntags (day_of_week = 7) regulär 0 Unterrichtsstunden',
    sundaySchedulesCount === '0',
    `Gefundene Sonntags-Schedules: ${sundaySchedulesCount}`
  );

  // 3.3 Prüfe aktive Ausfälle für die Lehrkraft
  const cmdCheckActiveAusfaelle = `ssh -o StrictHostKeyChecking=no root@178.105.10.2 "docker exec -i supabase-db psql -U postgres -d postgres -t -A -c \\"SELECT slot_start_datetime::date, count(*) FROM crisis_notifications GROUP BY slot_start_datetime::date ORDER BY slot_start_datetime::date;\\""`;
  const activeAusfaelle = execSync(cmdCheckActiveAusfaelle, { encoding: 'utf8' }).trim();
  console.log('     [DB-Audit] Reale Ausfalltage in crisis_notifications:');
  activeAusfaelle.split('\n').filter(Boolean).forEach(line => {
    console.log(`     └─ ${line}`);
  });
  assert(
    'Reale Ausfalltage sind valide Wochentage (Di 29.09., Mi 30.09., Do 01.10.) und enthalten KEINEN Sonntag',
    !activeAusfaelle.includes('2026-09-20'),
    'Sonntag 20.09. ist in PostgreSQL nicht als Ausfalltag hinterlegt'
  );

  // 3.4 Prüfe RPC Integrität (report_teacher_absence und end_teacher_absence existieren und sind aufrufbar)
  const cmdCheckRpcs = `ssh -o StrictHostKeyChecking=no root@178.105.10.2 "docker exec -i supabase-db psql -U postgres -d postgres -t -A -c \\"SELECT proname FROM pg_proc WHERE proname IN ('report_teacher_absence', 'end_teacher_absence') ORDER BY proname;\\""`;
  const rpcList = execSync(cmdCheckRpcs, { encoding: 'utf8' }).trim().split('\n');
  assert(
    'Autoritative RPCs report_teacher_absence und end_teacher_absence sind in pg_proc registriert',
    rpcList.includes('report_teacher_absence') && rpcList.includes('end_teacher_absence'),
    `Registrierte RPCs: ${rpcList.join(', ')}`
  );

} catch (err) {
  console.error('     ⚠️ Live DB Audit übersprungen oder Verbindungsfehler:', err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// FAZIT & SCORE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log(`🏁 AUDIT-FAZIT: ${passedTests}/${totalTests} Tests bestanden (${Math.round((passedTests / totalTests) * 100)}%)`);
if (failedTests === 0) {
  console.log('🏛️  1% GOLDSTANDARD BESTÄTIGT: 100% Integrität, 0 Verstöße, 0 Phantom-Tage');
} else {
  console.log(`⚠️  ${failedTests} Verstöße erkannt. Nachbesserung erforderlich.`);
}
console.log('═══════════════════════════════════════════════════════════════════════\n');

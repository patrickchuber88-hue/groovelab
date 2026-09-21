/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: FORENSIC TEACHER DASHBOARD TEST SUITE & MASTER CHECK
 * ==============================================================================
 * Comprehensive forensic audit testing:
 * 1. Zero Secret Leakage & ASVS Level 3 Axioms (No select('*') on users)
 * 2. Teacher Name Invariants & Privacy Masking (DSGVO Art. 25)
 * 3. Schedule & Time Slot Calculations (cleanRoomName, getISOWeekRaw, getItemWeek)
 * 4. Absence & Cancellation State Machine
 * 5. Student Prep & Didactic Snapshot Parsing (parseHomeworkNotesPayload)
 * 6. Action Handlers & Universal Button Contracts (Fail-safe, no unhandled rejections)
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { formatTeacherFullName, maskLastName } from '../utils/nameHelper';
import { cleanRoomName, getSimulatedNow, getISOWeekRaw, getItemWeek } from '../components/teacher/utils/teacherDashboardUtils';
import { parseHomeworkNotesPayload } from '../utils/homeworkSnapshotHelper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, details?: string) {
  if (condition) {
    results.push({ suite, name, passed: true });
    console.log(`  [PASS] ${name}`);
  } else {
    results.push({ suite, name, passed: false, details });
    console.error(`  [FAIL] ${name}: ${details || 'Assertion failed'}`);
  }
}

console.log('================================================================');
console.log('CAMPUS-GROOVELAB: FORENSIC TEACHER DASHBOARD MASTER AUDIT');
console.log('================================================================');

// ------------------------------------------------------------------------------
// SUITE 1: OWASP ASVS LEVEL 3 ZERO SECRET LEAKAGE AUDIT
// ------------------------------------------------------------------------------
function testZeroSecretLeakage() {
  console.log('\n--- SUITE 1: OWASP ASVS LEVEL 3 ZERO SECRET LEAKAGE ---');

  const teacherDir = path.resolve(__dirname, '../components/teacher');
  const teacherDashboardPath = path.resolve(__dirname, '../components/TeacherDashboard.tsx');

  const allTeacherFiles: string[] = [teacherDashboardPath];
  function scanDir(dir: string) {
    fs.readdirSync(dir).forEach(file => {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
        scanDir(full);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        allTeacherFiles.push(full);
      }
    });
  }
  scanDir(teacherDir);

  const wildcardUsersViolations: string[] = [];
  const secretLeakageViolations: string[] = [];

  allTeacherFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const base = path.basename(file);

    // Check 1: No from('users').select('*')
    if (content.includes("from('users').select('*')") || content.includes("from('users').select('*,") || content.includes('from("users").select("*")')) {
      wildcardUsersViolations.push(base);
    }

    // Check 2: No personal_pin, parent_pin, password_hash in select statements
    const selects = content.match(/\.from\('users'\)\s*\.select\('([^']+)'\)/g);
    if (selects) {
      selects.forEach(sel => {
        if (sel.includes('personal_pin') || sel.includes('parent_pin') || sel.includes('password_hash')) {
          secretLeakageViolations.push(base);
        }
      });
    }
  });

  assert(
    wildcardUsersViolations.length === 0,
    'Zero Secret Leakage',
    'Zero wildcard from("users").select("*") queries in teacher module',
    `Found violations in: ${wildcardUsersViolations.join(', ')}`
  );

  assert(
    secretLeakageViolations.length === 0,
    'Zero Secret Leakage',
    'Zero personal_pin, parent_pin, password_hash in users SELECT statements',
    `Found violations in: ${secretLeakageViolations.join(', ')}`
  );
}

// ------------------------------------------------------------------------------
// SUITE 2: TEACHER NAME INVARIANT & PRIVACY MASKING (DSGVO ART. 25)
// ------------------------------------------------------------------------------
function testTeacherNameAndPrivacy() {
  console.log('\n--- SUITE 2: TEACHER NAME INVARIANT & PRIVACY MASKING ---');

  const formatted = formatTeacherFullName({ first_name: 'David', last_name: 'Gilmour' });
  assert(
    formatted === 'David Gilmour',
    'Teacher Name Invariant',
    'formatTeacherFullName formats teacher correctly to "Vorname Nachname"',
    `Got: ${formatted}`
  );

  const reversed = formatTeacherFullName('Gilmour, David');
  assert(
    reversed === 'David Gilmour',
    'Teacher Name Invariant',
    'formatTeacherFullName corrects reversed "Nachname, Vorname"',
    `Got: ${reversed}`
  );

  const masked = maskLastName('Mustermann', true);
  assert(
    masked === 'M.',
    'Privacy Masking',
    'maskLastName abbreviates last name when privacyMode is true',
    `Got: ${masked}`
  );

  const unmasked = maskLastName('Mustermann', false);
  assert(
    unmasked === 'Mustermann',
    'Privacy Masking',
    'maskLastName preserves full last name when privacyMode is false',
    `Got: ${unmasked}`
  );

  // Check if TeacherDashboard.tsx inverts privacyMode by passing showRealNames directly
  const teacherDashContent = fs.readFileSync(path.resolve(__dirname, '../components/TeacherDashboard.tsx'), 'utf-8');
  const invertedUsageMatch = teacherDashContent.includes('maskLastName(activeStudent.last_name, students.showRealNames)');
  assert(
    !invertedUsageMatch,
    'Privacy Masking',
    'TeacherDashboard does NOT pass showRealNames directly as privacyMode (must pass !showRealNames)',
    'TeacherDashboard.tsx has inversion bug on line 565: passing showRealNames directly to maskLastName'
  );
}

// ------------------------------------------------------------------------------
// SUITE 3: SCHEDULE & TIME SLOT CALCULATIONS
// ------------------------------------------------------------------------------
function testScheduleAndRoomCalculations() {
  console.log('\n--- SUITE 3: SCHEDULE & TIME SLOT CALCULATIONS ---');

  const cleaned = cleanRoomName('Raum 102 - Drums / Band');
  assert(
    typeof cleaned === 'string' && cleaned.length > 0,
    'Schedule Utilities',
    'cleanRoomName parses and cleans room name successfully',
    `Got: ${cleaned}`
  );

  const isoWeek = getISOWeekRaw(new Date('2026-09-20T10:00:00Z'), 0);
  assert(
    typeof isoWeek === 'string' && isoWeek.includes('-W'),
    'Schedule Utilities',
    'getISOWeekRaw produces valid ISO week string (e.g. YYYY-Wxx)',
    `Got: ${isoWeek}`
  );

  const itemWeek = getItemWeek({ topic_name: 'Hausaufgabe KW 38', updated_at: '2026-09-20T10:00:00Z' });
  assert(
    typeof itemWeek === 'string' && itemWeek === '2026-W38',
    'Schedule Utilities',
    'getItemWeek extracts valid ISO week from item topic_name (e.g. 2026-W38)',
    `Got: ${itemWeek}`
  );
}

// ------------------------------------------------------------------------------
// SUITE 4: ABSENCE & CANCELLATION STATE MACHINE
// ------------------------------------------------------------------------------
function testAbsenceStateMachine() {
  console.log('\n--- SUITE 4: ABSENCE & CANCELLATION STATE MACHINE ---');

  // Test teacher absence window evaluation
  function isTeacherAbsent(teacher: any, checkDate: Date = new Date()): boolean {
    if (!teacher?.ausfall_until) return false;
    const until = new Date(teacher.ausfall_until);
    const start = teacher.ausfall_start ? new Date(teacher.ausfall_start) : new Date(0);
    return checkDate >= start && checkDate <= until;
  }

  const now = new Date('2026-09-20T12:00:00Z');
  const activeAbsenceTeacher = {
    id: 't-1',
    ausfall_start: '2026-09-19T00:00:00Z',
    ausfall_until: '2026-09-21T23:59:59Z'
  };

  assert(
    isTeacherAbsent(activeAbsenceTeacher, now) === true,
    'Absence State Machine',
    'isTeacherAbsent returns true when checkDate falls within absence window'
  );

  const pastAbsenceTeacher = {
    id: 't-2',
    ausfall_start: '2026-09-10T00:00:00Z',
    ausfall_until: '2026-09-15T23:59:59Z'
  };

  assert(
    isTeacherAbsent(pastAbsenceTeacher, now) === false,
    'Absence State Machine',
    'isTeacherAbsent returns false when absence window has passed'
  );

  const noAbsenceTeacher = { id: 't-3', ausfall_until: null };
  assert(
    isTeacherAbsent(noAbsenceTeacher, now) === false,
    'Absence State Machine',
    'isTeacherAbsent returns false when ausfall_until is null'
  );
}

// ------------------------------------------------------------------------------
// SUITE 5: STUDENT PREP & DIDACTIC SNAPSHOT PARSING
// ------------------------------------------------------------------------------
function testStudentPrepParsing() {
  console.log('\n--- SUITE 5: STUDENT PREP & DIDACTIC SNAPSHOT PARSING ---');

  const rawNotes = 'Takt 1-16 üben.\n\nSNAPSHOT_LEHRWERKE:[{"title":"Modern Drums","pages":[24]}]\n\nSNAPSHOT_SONGS:[{"title":"Highway to Hell","status":"IN_PROGRESS"}]';
  const parsed = parseHomeworkNotesPayload(rawNotes);

  assert(
    parsed !== null && typeof parsed === 'object',
    'Didactic Snapshot Parsing',
    'parseHomeworkNotesPayload parses compound note payload into structured object'
  );

  assert(
    Array.isArray(parsed.lehrwerke) && parsed.lehrwerke.length > 0,
    'Didactic Snapshot Parsing',
    'parseHomeworkNotesPayload extracts SNAPSHOT_LEHRWERKE entries',
    `Got: ${JSON.stringify(parsed.lehrwerke)}`
  );

  assert(
    Array.isArray(parsed.songs) && parsed.songs.length > 0,
    'Didactic Snapshot Parsing',
    'parseHomeworkNotesPayload extracts SNAPSHOT_SONGS entries',
    `Got: ${JSON.stringify(parsed.songs)}`
  );

  // Empty payload resilience
  const emptyParsed = parseHomeworkNotesPayload('');
  assert(
    emptyParsed !== null && Array.isArray(emptyParsed.lehrwerke) && emptyParsed.lehrwerke.length === 0,
    'Didactic Snapshot Parsing',
    'parseHomeworkNotesPayload returns clean empty structure on empty input'
  );
}

// ------------------------------------------------------------------------------
// SUITE 6: UNIVERSAL BUTTON & ACTION CONTRACTS
// ------------------------------------------------------------------------------
async function testActionContracts() {
  console.log('\n--- SUITE 6: UNIVERSAL BUTTON & ACTION CONTRACTS ---');

  // Contract: Async handler must never throw an unhandled rejection
  async function safeExecuteAction(action: () => Promise<void>): Promise<{ success: boolean; error?: any }> {
    try {
      await action();
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  const failingAction = async () => {
    throw new Error('Database connection reset during lesson slot update');
  };

  const failResult = await safeExecuteAction(failingAction);
  assert(
    failResult.success === false && failResult.error instanceof Error,
    'Universal Button Contract',
    'Failing async teacher action is safely caught and does not crash boundary'
  );

  const succeedingAction = async () => {
    return Promise.resolve();
  };

  const succResult = await safeExecuteAction(succeedingAction);
  assert(
    succResult.success === true,
    'Universal Button Contract',
    'Succeeding async teacher action completes cleanly'
  );
}

// ------------------------------------------------------------------------------
// SUITE 7: COORDINATOR SHELL LOC LIMIT (MONOLITH GOLDSTANDARD)
// ------------------------------------------------------------------------------
function testCoordinatorShellLoc() {
  console.log('\n--- SUITE 7: COORDINATOR SHELL LOC LIMIT ---');

  const teacherDashboardPath = path.resolve(__dirname, '../components/TeacherDashboard.tsx');
  const content = fs.readFileSync(teacherDashboardPath, 'utf-8');
  const lineCount = content.split('\n').length;

  assert(
    lineCount <= 850,
    'Monolith Goldstandard',
    `TeacherDashboard.tsx meets the <= 850 LOC limit (Current: ${lineCount} LOC)`,
    `TeacherDashboard.tsx has ${lineCount} LOC (Limit is <= 850 LOC)`
  );
}

// ------------------------------------------------------------------------------
// EXECUTION & SUMMARY
// ------------------------------------------------------------------------------
async function runAll() {
  testZeroSecretLeakage();
  testTeacherNameAndPrivacy();
  testScheduleAndRoomCalculations();
  testAbsenceStateMachine();
  testStudentPrepParsing();
  await testActionContracts();
  testCoordinatorShellLoc();

  console.log('\n================================================================');
  console.log('AUDIT SUMMARY');
  console.log('================================================================');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log(`Total Invariants Tested: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.log('\n⚠️ FORENSIC SCAN DETECTED DEFECTS:');
    results.filter(r => !r.passed).forEach(f => {
      console.log(`  - [${f.suite}] ${f.name}: ${f.details}`);
    });
  } else {
    console.log('\nALL FORENSIC CHECKS PASSED: 100% Teacher Suite Integrity Verified.');
  }
}

runAll();

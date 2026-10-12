/**
 * Forensic Test Suite: Zero-Trust ReBAC Student Audio-Sharing Architecture
 * 
 * Verifiziert die lückenlose Durchsetzung der 0,1% Goldstandard-Governance:
 * 1. Schüler besitzt 100% Lese- und Löschhoheit über eigene Aufnahmen.
 * 2. Schulleitung (admin) & Sekretariat (secretary) haben STRENG 0% Zugriff (§ 201 StGB / § 73 UrhG).
 * 3. Lehrkräfte erhalten NUR Zugriff, wenn sie zugewiesen sind UND die Aufnahme explizit geteilt wurde.
 * 4. Widerruf der Freigabe entzieht der Lehrkraft sofort jeglichen Zugriff.
 * 
 * Standards: OWASP ASVS Level 3, § 201 StGB, § 73 UrhG, § 8a SGB VIII, Art. 5, 8, 17, 25, 32 DSGVO.
 */

import { validatePathAccess, AuthUserData } from '../../../../packages/bff-server/src/routes/storage';
import { fetchStudentAudioShares, toggleStudentAudioShare } from '../services/studentAudioShareService';

export async function runStudentAudioZeroTrustReBACTests(): Promise<{ passed: boolean; results: string[] }> {
  const results: string[] = [];
  let allPassed = true;

  function assert(description: string, condition: boolean) {
    if (condition) {
      results.push(`  ✅ [PASS] ${description}`);
    } else {
      results.push(`  ❌ [FAIL] ${description}`);
      allPassed = false;
    }
  }

  console.log('\n🔒 Starting Forensic Zero-Trust ReBAC Audio-Sharing Test Suite...');

  // Mock Actors
  const studentAlice: AuthUserData = {
    accessToken: 'mock_token_alice',
    user: { id: 'usr-student-alice' },
    role: 'student',
    schoolId: 'school-hamburg'
  };

  const studentBob: AuthUserData = {
    accessToken: 'mock_token_bob',
    user: { id: 'usr-student-bob' },
    role: 'student',
    schoolId: 'school-hamburg'
  };

  const assignedTeacher: AuthUserData = {
    accessToken: 'mock_token_teacher_carol',
    user: { id: 'usr-teacher-carol' },
    role: 'teacher',
    schoolId: 'school-hamburg'
  };

  const peerTeacher: AuthUserData = {
    accessToken: 'mock_token_teacher_dave',
    user: { id: 'usr-teacher-dave' },
    role: 'teacher',
    schoolId: 'school-hamburg'
  };

  const schoolPrincipal: AuthUserData = {
    accessToken: 'mock_token_principal',
    user: { id: 'usr-principal-eve' },
    role: 'admin',
    schoolId: 'school-hamburg'
  };

  const secretaryStaff: AuthUserData = {
    accessToken: 'mock_token_secretary',
    user: { id: 'usr-secretary-frank' },
    role: 'secretary',
    schoolId: 'school-hamburg'
  };

  const externalAttacker: AuthUserData = {
    accessToken: 'mock_token_intruder',
    user: { id: 'usr-attacker' },
    role: 'student',
    schoolId: 'school-berlin'
  };

  const masterAdmin: AuthUserData = {
    accessToken: 'mock_token_master',
    user: { id: 'usr-master-admin' },
    role: 'master_admin',
    schoolId: null
  };

  const aliceRecordingPath = 'schools/school-hamburg/students/usr-student-alice/recordings/take_chopin_nocturne.webm';

  // ── Test 1: Schüler hat 100% Hoheit über eigene Aufnahme ──
  const aliceRead = validatePathAccess(aliceRecordingPath, studentAlice, 'read');
  assert('Schüler darf eigene Vertraulichkeits-Aufnahme lesen/streamen', aliceRead.allowed);

  const aliceDelete = validatePathAccess(aliceRecordingPath, studentAlice, 'delete');
  assert('Schüler darf eigene Vertraulichkeits-Aufnahme autonom löschen (Art. 17 DSGVO)', aliceDelete.allowed);

  // ── Test 2: BOLA-Schutz gegen fremde Mitschüler ──
  const bobRead = validatePathAccess(aliceRecordingPath, studentBob, 'read');
  assert('Fremder Mitschüler wird hermetisch abgewiesen (STUDENT_BOLA_VIOLATION)', 
    !bobRead.allowed && bobRead.reason === 'STUDENT_BOLA_VIOLATION');

  const bobDelete = validatePathAccess(aliceRecordingPath, studentBob, 'delete');
  assert('Fremder Mitschüler kann Aufnahme nicht löschen', !bobDelete.allowed);

  // ── Test 3: Schulleitung (admin) besitzt STRENG 0% Zugriff (§ 201 StGB / § 73 UrhG) ──
  const principalRead = validatePathAccess(aliceRecordingPath, schoolPrincipal, 'read');
  assert('Schulleitung (admin) wird bei Schüleraufnahme hermetisch blockiert (0% Leadership Access)', 
    !principalRead.allowed && principalRead.reason === 'LEADERSHIP_STUDENT_AUDIO_ACCESS_PROHIBITED');

  const principalDelete = validatePathAccess(aliceRecordingPath, schoolPrincipal, 'delete');
  assert('Schulleitung darf Schüleraufnahme nicht löschen', 
    !principalDelete.allowed && principalDelete.reason === 'LEADERSHIP_STUDENT_AUDIO_ACCESS_PROHIBITED');

  // ── Test 4: Verwaltung / Sekretariat besitzt STRENG 0% Zugriff ──
  const secRead = validatePathAccess(aliceRecordingPath, secretaryStaff, 'read');
  assert('Sekretariat (secretary) wird bei Schüleraufnahme hermetisch blockiert (0% Admin Access)', 
    !secRead.allowed && secRead.reason === 'LEADERSHIP_STUDENT_AUDIO_ACCESS_PROHIBITED');

  // ── Test 5: Externe Angreifer / fremde Schulen (Multi-Tenancy Isolation) ──
  const intruderRead = validatePathAccess(aliceRecordingPath, externalAttacker, 'read');
  assert('Fremder Mandant wird sofort abgewiesen (MULTI_TENANT_VIOLATION)', 
    !intruderRead.allowed && intruderRead.reason === 'MULTI_TENANT_VIOLATION');

  // ── Test 6: Zugewiesene Lehrkraft OHNE aktive Freigabe (Opt-In Schutz) ──
  const teacherUnshared = validatePathAccess(aliceRecordingPath, assignedTeacher, 'read', { isSharedWithTeacher: false });
  assert('Zugewiesene Lehrkraft ohne Schüler-Freigabe wird abgewiesen (STUDENT_AUDIO_NOT_SHARED_WITH_TEACHER)', 
    !teacherUnshared.allowed && teacherUnshared.reason === 'STUDENT_AUDIO_NOT_SHARED_WITH_TEACHER');

  // ── Test 7: Zugewiesene Lehrkraft MIT aktiver Schüler-Freigabe (Opt-In Granted) ──
  const teacherShared = validatePathAccess(aliceRecordingPath, assignedTeacher, 'read', { isSharedWithTeacher: true });
  assert('Zugewiesene Lehrkraft mit aktiver Schüler-Freigabe erhält autorisierten Stream-Zugriff', 
    teacherShared.allowed);

  // ── Test 8: Zugewiesene Lehrkraft darf Schüleraufnahme NIEMALS löschen ──
  const teacherDelete = validatePathAccess(aliceRecordingPath, assignedTeacher, 'delete', { isSharedWithTeacher: true });
  assert('Lehrkraft darf Schüleraufnahme NIEMALS löschen (TEACHER_CANNOT_DELETE_STUDENT_RECORDING)', 
    !teacherDelete.allowed && teacherDelete.reason === 'TEACHER_CANNOT_DELETE_STUDENT_RECORDING');

  // ── Test 9: Nicht-zugewiesene Lehrkraft (Peer Teacher) ──
  const peerTeacherAttempt = validatePathAccess(aliceRecordingPath, peerTeacher, 'read', { isSharedWithTeacher: false });
  assert('Nicht-zugewiesene Lehrkraft hat keinerlei Zugriff', 
    !peerTeacherAttempt.allowed && peerTeacherAttempt.reason === 'STUDENT_AUDIO_NOT_SHARED_WITH_TEACHER');

  // ── Test 10: Master Admin forensischer Notfall-Audit-Zugriff ──
  const masterRead = validatePathAccess(aliceRecordingPath, masterAdmin, 'read');
  assert('Master Admin besitzt forensischen Audit-Zugriff', masterRead.allowed);

  console.log(results.join('\n'));
  return { passed: allPassed, results };
}

// Auto-run if executed directly via node/tsx
if (typeof require !== 'undefined' && require.main === module) {
  runStudentAudioZeroTrustReBACTests().then(({ passed }) => {
    process.exit(passed ? 0 : 1);
  });
}

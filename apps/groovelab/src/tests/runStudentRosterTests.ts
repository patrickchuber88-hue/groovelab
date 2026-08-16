import assert from 'node:assert';
import { 
  normalizeStudentKey, 
  isTestOrGenericStudent, 
  deduplicateRoster, 
  getTeacherRoster, 
  getTeacherStudentCount,
  RosterStudent 
} from '../services/studentRosterService';

console.log('=== RUNNING STUDENT ROSTER SERVICE INVARIANT TESTS ===');

// Test 1: normalizeStudentKey
assert.strictEqual(normalizeStudentKey('Dominik ', 'H.'), 'dominik_h', 'normalize extra space & dot failed');
assert.strictEqual(normalizeStudentKey('Dominik', 'H'), 'dominik_h', 'normalize plain failed');
assert.strictEqual(normalizeStudentKey(' Dominik  ', ' H. '), 'dominik_h', 'normalize surrounding spaces failed');
assert.strictEqual(normalizeStudentKey('Clara-Marie', 'M.'), 'claramarie_m', 'normalize hyphen failed');
assert.strictEqual(normalizeStudentKey('Jörn', 'Müller'), 'jörn_müller', 'normalize umlauts failed');
console.log('✔ Test 1: normalizeStudentKey passed');

// Test 2: isTestOrGenericStudent
assert.strictEqual(isTestOrGenericStudent('TestVorname', 'T.'), true, 'TestVorname must be test');
assert.strictEqual(isTestOrGenericStudent('TestVorname2', 'T.'), true, 'TestVorname2 must be test');
assert.strictEqual(isTestOrGenericStudent('Ausstehender', 'Schüler'), true, 'Ausstehender Schüler must be test');
assert.strictEqual(isTestOrGenericStudent('Ausstehendes', 'Onboarding'), true, 'Ausstehendes Onboarding must be test');
assert.strictEqual(isTestOrGenericStudent('Schüler', ''), true, 'Schüler must be test');
assert.strictEqual(isTestOrGenericStudent('Severin', 'L.'), false, 'Severin L. is real student');
assert.strictEqual(isTestOrGenericStudent('Dominik', 'H.'), false, 'Dominik H. is real student');
console.log('✔ Test 2: isTestOrGenericStudent passed');

// Test 3: deduplicateRoster
const mockStudents: RosterStudent[] = [
  {
    id: 'reg-1',
    school_id: 'school-1',
    teacher_id: 'teacher-1',
    role: 'student',
    first_name: 'Dominik ',
    last_name: 'H.',
    is_active: true,
    is_campus_active: true,
    is_groovelab_active: true,
    status: 'active',
    isPendingOnboarding: false,
    created_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'stub-1',
    school_id: 'school-1',
    teacher_id: 'teacher-1',
    role: 'student',
    first_name: 'Dominik',
    last_name: 'H',
    is_active: false,
    is_campus_active: false,
    is_groovelab_active: false,
    status: 'inactive',
    isPendingOnboarding: true,
    created_at: '2026-07-27T00:00:00Z'
  },
  {
    id: 'stub-test',
    school_id: 'school-1',
    teacher_id: null,
    role: 'student',
    first_name: 'TestVorname',
    last_name: 'T.',
    is_active: false,
    is_campus_active: false,
    is_groovelab_active: false,
    status: 'inactive',
    isPendingOnboarding: true,
    created_at: '2026-07-27T00:00:00Z'
  }
];

const deduped = deduplicateRoster(mockStudents);
assert.strictEqual(deduped.length, 1, 'Expected exactly 1 deduped student');
assert.strictEqual(deduped[0].id, 'reg-1', 'Registered student must win over pending stub');
assert.strictEqual(deduped[0].isPendingOnboarding, false, 'Student must not be marked pending');
console.log('✔ Test 3: deduplicateRoster passed');

// Test 4: getTeacherRoster and getTeacherStudentCount
const mockRoster: RosterStudent[] = [
  { id: 's1', school_id: 'sch1', teacher_id: 't1', role: 'student', first_name: 'A', last_name: 'A', is_active: true, is_campus_active: true, is_groovelab_active: true, status: 'active', isPendingOnboarding: false, created_at: '' },
  { id: 's2', school_id: 'sch1', teacher_id: 't1', role: 'student', first_name: 'B', last_name: 'B', is_active: true, is_campus_active: true, is_groovelab_active: true, status: 'active', isPendingOnboarding: false, created_at: '' },
  { id: 's3', school_id: 'sch1', teacher_id: 't2', role: 'student', first_name: 'C', last_name: 'C', is_active: true, is_campus_active: true, is_groovelab_active: true, status: 'active', isPendingOnboarding: false, created_at: '' }
];

assert.strictEqual(getTeacherStudentCount('t1', mockRoster, 'primary_only'), 2, 'Primary count for t1 should be 2');
assert.strictEqual(getTeacherStudentCount('t2', mockRoster, 'primary_only'), 1, 'Primary count for t2 should be 1');
assert.strictEqual(getTeacherStudentCount('t1', mockRoster, 'all_accessible', ['s3']), 3, 'Accessible count for t1 should be 3');

const t1Roster = getTeacherRoster('t1', mockRoster);
assert.strictEqual(t1Roster.length, 2, 't1 roster length should be 2');
console.log('✔ Test 4: getTeacherRoster & getTeacherStudentCount passed');

console.log('🎉 ALL STUDENT ROSTER SERVICE TESTS PASSED PERFECTLY!');

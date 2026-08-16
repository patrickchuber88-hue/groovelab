import assert from 'node:assert';
import { 
  normalizeStudentKey, 
  isTestOrGenericStudent, 
  deduplicateRoster, 
  getTeacherRoster, 
  getTeacherStudentCount,
  RosterStudent 
} from '../services/studentRosterService';

// normalizeStudentKey
assert.strictEqual(normalizeStudentKey('Dominik ', 'H.'), 'dominik_h');
assert.strictEqual(normalizeStudentKey('Dominik', 'H'), 'dominik_h');
assert.strictEqual(normalizeStudentKey(' Dominik  ', ' H. '), 'dominik_h');
assert.strictEqual(normalizeStudentKey('Clara-Marie', 'M.'), 'claramarie_m');
assert.strictEqual(normalizeStudentKey('Jörn', 'Müller'), 'jörn_müller');

// isTestOrGenericStudent
assert.strictEqual(isTestOrGenericStudent('TestVorname', 'T.'), true);
assert.strictEqual(isTestOrGenericStudent('TestVorname2', 'T.'), true);
assert.strictEqual(isTestOrGenericStudent('Ausstehender', 'Schüler'), true);
assert.strictEqual(isTestOrGenericStudent('Ausstehendes', 'Onboarding'), true);
assert.strictEqual(isTestOrGenericStudent('Schüler', ''), true);
assert.strictEqual(isTestOrGenericStudent('Severin', 'L.'), false);
assert.strictEqual(isTestOrGenericStudent('Dominik', 'H.'), false);

// deduplicateRoster
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
assert.strictEqual(deduped.length, 1);
assert.strictEqual(deduped[0].id, 'reg-1');

// getTeacherRoster & getTeacherStudentCount
const mockRoster: RosterStudent[] = [
  { id: 's1', school_id: 'sch1', teacher_id: 't1', role: 'student', first_name: 'A', last_name: 'A', is_active: true, is_campus_active: true, is_groovelab_active: true, status: 'active', isPendingOnboarding: false, created_at: '' },
  { id: 's2', school_id: 'sch1', teacher_id: 't1', role: 'student', first_name: 'B', last_name: 'B', is_active: true, is_campus_active: true, is_groovelab_active: true, status: 'active', isPendingOnboarding: false, created_at: '' },
  { id: 's3', school_id: 'sch1', teacher_id: 't2', role: 'student', first_name: 'C', last_name: 'C', is_active: true, is_campus_active: true, is_groovelab_active: true, status: 'active', isPendingOnboarding: false, created_at: '' }
];

assert.strictEqual(getTeacherStudentCount('t1', mockRoster, 'primary_only'), 2);
assert.strictEqual(getTeacherStudentCount('t2', mockRoster, 'primary_only'), 1);
assert.strictEqual(getTeacherStudentCount('t1', mockRoster, 'all_accessible', ['s3']), 3);

const t1Roster = getTeacherRoster('t1', mockRoster);
assert.strictEqual(t1Roster.length, 2);

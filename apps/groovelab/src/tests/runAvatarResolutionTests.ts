import assert from 'node:assert';
import {
  isGenericInstrument,
  isExplicitNonInstrumentSubject,
  hasDedicated3DAvatar,
  getInstrumentAvatarUrl,
  getEffectiveInstrument,
  resolveCampusStudentAvatar
} from '../utils/avatarResolutionEngine';

console.log('=== RUNNING AVATAR RESOLUTION ENGINE INVARIANT TESTS ===\n');

// Test 1: Generic instrument detection
assert.strictEqual(isGenericInstrument('Nicht festgelegt'), true);
assert.strictEqual(isGenericInstrument('nicht festgelegt'), true);
assert.strictEqual(isGenericInstrument('nicht zugeordnet'), true);
assert.strictEqual(isGenericInstrument('Keine Angabe'), true);
assert.strictEqual(isGenericInstrument('Allgemein'), true);
assert.strictEqual(isGenericInstrument('Musiker'), true);
assert.strictEqual(isGenericInstrument('Schüler'), true);
assert.strictEqual(isGenericInstrument('Gitarre'), false);
assert.strictEqual(isGenericInstrument('Klavier'), false);
console.log('✔ Test 1: isGenericInstrument correctly identifies placeholders and valid instruments');

// Test 2: Non-instrument subject detection
assert.strictEqual(isExplicitNonInstrumentSubject('MFE'), true);
assert.strictEqual(isExplicitNonInstrumentSubject('Musikalische Früherziehung'), true);
assert.strictEqual(isExplicitNonInstrumentSubject('Musikgarten'), true);
assert.strictEqual(isExplicitNonInstrumentSubject('Musiktheorie'), true);
assert.strictEqual(isExplicitNonInstrumentSubject('Gehörbildung'), true);
assert.strictEqual(isExplicitNonInstrumentSubject('Rhythmik'), true);
assert.strictEqual(isExplicitNonInstrumentSubject('Gitarre'), false);
console.log('✔ Test 2: isExplicitNonInstrumentSubject correctly detects theory/early education');

// Test 3: 3D Dedicated Avatar detection
assert.strictEqual(hasDedicated3DAvatar('Gitarre'), true);
assert.strictEqual(hasDedicated3DAvatar('E-Gitarre'), true);
assert.strictEqual(hasDedicated3DAvatar('Klavier'), true);
assert.strictEqual(hasDedicated3DAvatar('Drums'), true);
assert.strictEqual(hasDedicated3DAvatar('Schlagzeug'), true);
assert.strictEqual(hasDedicated3DAvatar('Cello'), true);
assert.strictEqual(hasDedicated3DAvatar('Violine'), true);
assert.strictEqual(hasDedicated3DAvatar('Trompete'), true);
assert.strictEqual(hasDedicated3DAvatar('Gesang'), true);
assert.strictEqual(hasDedicated3DAvatar('Didgeridoo'), false);
assert.strictEqual(hasDedicated3DAvatar('Theremin'), false);
console.log('✔ Test 3: hasDedicated3DAvatar correctly differentiates 3D mapped vs exotic instruments');

// Test 4: Avatar URL resolution
assert.strictEqual(getInstrumentAvatarUrl('Gitarre'), '/avatars/gitarre_avatar_new.png');
assert.strictEqual(getInstrumentAvatarUrl('Klavier'), '/avatars/klavier_avatar_new.png');
assert.strictEqual(getInstrumentAvatarUrl('Schlagzeug'), '/avatars/schlagzeug_avatar.png');
assert.strictEqual(getInstrumentAvatarUrl('Gesang'), '/avatars/gesang_avatar.png');
assert.strictEqual(getInstrumentAvatarUrl('Didgeridoo'), '/avatars/neutral_instrument_avatar.png');
assert.strictEqual(getInstrumentAvatarUrl('MFE'), '/avatars/neutral_instrument_avatar.png');
console.log('✔ Test 4: getInstrumentAvatarUrl returns correct 3D or neutral avatar URL');

// Test 5: Severin Landenberger students (guitar teacher fallback)
const teacherSeverin = {
  id: 'teacher-severin',
  first_name: 'Severin',
  last_name: 'Landenberger',
  instrument: 'Gitarre',
  role: 'teacher'
};

const studentAmelia = {
  id: 'student-amelia',
  first_name: 'Amelia',
  last_name: 'N.',
  role: 'student',
  instrument: 'Nicht festgelegt',
  teacher_id: 'teacher-severin'
};

const studentJustus = {
  id: 'student-justus',
  first_name: 'Justus',
  last_name: 'G.',
  role: 'student',
  instrument: null,
  teacher: teacherSeverin
};

// With teachers list
assert.strictEqual(resolveCampusStudentAvatar(studentAmelia, [teacherSeverin]), '/avatars/gitarre_avatar_new.png');
// With embedded teacher object
assert.strictEqual(resolveCampusStudentAvatar(studentJustus), '/avatars/gitarre_avatar_new.png');
// With fallback teacher parameter
assert.strictEqual(resolveCampusStudentAvatar(studentAmelia, teacherSeverin), '/avatars/gitarre_avatar_new.png');
console.log('✔ Test 5: Severin Landenberger students successfully resolve to guitar avatar (/avatars/gitarre_avatar_new.png)');

// Test 6: Non-instrument subjects get neutral avatar
const studentMFE = {
  id: 'student-mfe',
  first_name: 'Lukas',
  role: 'student',
  subject: 'Musikalische Früherziehung',
  instrument: 'MFE'
};
assert.strictEqual(resolveCampusStudentAvatar(studentMFE), '/avatars/neutral_instrument_avatar.png');
console.log('✔ Test 6: Explicit non-instrument subject correctly receives neutral music room avatar');

// Test 7: Exotic instrument without 3D avatar gets neutral avatar
const studentExotic = {
  id: 'student-exotic',
  first_name: 'Maya',
  role: 'student',
  instrument: 'Didgeridoo'
};
assert.strictEqual(resolveCampusStudentAvatar(studentExotic), '/avatars/neutral_instrument_avatar.png');
console.log('✔ Test 7: Exotic instrument without 3D avatar receives neutral music room avatar');

// Test 8: Fail-closed fallback for music school students is Guitar, NEVER neutral music room
const studentUnknown = {
  id: 'student-unknown',
  first_name: 'Unknown',
  role: 'student',
  instrument: null
};
assert.strictEqual(resolveCampusStudentAvatar(studentUnknown), '/avatars/gitarre_avatar_new.png');
console.log('✔ Test 8: Unknown student fallback is guitar avatar, NEVER neutral room');

// Test 9: Admin and Secretary avatars
const adminUser = { role: 'admin', first_name: 'Admin' };
const secretaryUser = { role: 'secretary', first_name: 'Secretary' };
assert.strictEqual(resolveCampusStudentAvatar(adminUser), '/campus_login_hero.png');
assert.strictEqual(resolveCampusStudentAvatar(secretaryUser), '/campus_login_hero.png');
console.log('✔ Test 9: Admin and Secretary receive briefing board hero avatar (/campus_login_hero.png)');

// Test 10: Dual-role teacher/admin (e.g. Severin Landenberger)
const dualRoleTeacher = {
  id: 'teacher-severin',
  first_name: 'Severin',
  last_name: 'Landenberger',
  role: 'teacher',
  roles: ['admin', 'teacher'],
  instrument: 'Gitarre'
};
assert.strictEqual(resolveCampusStudentAvatar(dualRoleTeacher), '/avatars/gitarre_avatar_new.png');

const dualRoleAdmin = {
  id: 'teacher-severin',
  first_name: 'Severin',
  last_name: 'Landenberger',
  role: 'admin',
  roles: ['admin', 'teacher'],
  instrument: 'Gitarre'
};
assert.strictEqual(resolveCampusStudentAvatar(dualRoleAdmin), '/campus_login_hero.png');
assert.strictEqual(resolveCampusStudentAvatar({ ...dualRoleAdmin, isTeacherContext: true }), '/avatars/gitarre_avatar_new.png');
console.log('✔ Test 10: Dual-role teacher/admin correctly receives guitar avatar in teacher context and hero avatar in admin context');

// Test 11: Musician avatar for teacher in GrooveLab
import { getDefaultMusicianAvatarUrl, resolveGrooveLabTeacherAvatar } from '../utils/avatarResolutionEngine';
assert.strictEqual(getDefaultMusicianAvatarUrl('Gitarre', 'teacher'), '/avatar_ghost.jpg');
assert.strictEqual(getDefaultMusicianAvatarUrl(null, 'teacher'), '/avatar_ghost.jpg');
console.log('✔ Test 11: Teacher in GrooveLab correctly receives ghost musician avatar (/avatar_ghost.jpg)');

// Test 12: Teacher with default administration chalkboard in GrooveLab safely resolves to ghost musician avatar
const teacherWithChalkboard = {
  id: 'teacher-peter',
  first_name: 'Peter',
  last_name: 'P.',
  role: 'teacher',
  photo_url: '/campus_login_hero.png',
  avatar_url: '/campus_login_hero.png'
};
assert.strictEqual(resolveGrooveLabTeacherAvatar(teacherWithChalkboard), '/avatar_ghost.jpg');
assert.strictEqual(resolveGrooveLabTeacherAvatar(teacherWithChalkboard, '/campus_login_hero.png'), '/avatar_ghost.jpg');
console.log('✔ Test 12: Teacher with chalkboard image correctly falls back to ghost musician avatar (/avatar_ghost.jpg)');

// Test 13: Teacher with selected 3D musician avatar or custom photo in GrooveLab preserves their avatar
const teacherWithGuitarAvatar = {
  id: 'teacher-peter',
  first_name: 'Peter',
  last_name: 'P.',
  role: 'teacher',
  photo_url: '/avatars/gitarre_avatar_new.png'
};
assert.strictEqual(resolveGrooveLabTeacherAvatar(teacherWithGuitarAvatar), '/avatars/gitarre_avatar_new.png');
assert.strictEqual(resolveGrooveLabTeacherAvatar({ ...teacherWithGuitarAvatar, photo_url: '/uploads/custom_rocker.jpg' }), '/uploads/custom_rocker.jpg');
console.log('✔ Test 13: Teacher with selected 3D avatar (/avatars/gitarre_avatar_new.png) or custom photo preserves musician avatar');

// Test 14: Dual-role coach (admin + teacher) in GrooveLab Live Lab receives musician avatar, never chalkboard
const coachAdmin = {
  id: 'admin-peter',
  first_name: 'Peter',
  last_name: 'P.',
  role: 'admin',
  roles: ['admin', 'teacher'],
  photo_url: '/campus_login_hero.png',
  avatar_url: '/campus_login_hero.png'
};
assert.strictEqual(resolveGrooveLabTeacherAvatar(coachAdmin), '/avatar_ghost.jpg');
console.log('✔ Test 14: Dual-role coach (admin + teacher) in GrooveLab receives ghost musician avatar instead of chalkboard');

console.log('\n🎉 ALL AVATAR RESOLUTION INVARIANT TESTS PASSED WITH 100% SUCCESS!');


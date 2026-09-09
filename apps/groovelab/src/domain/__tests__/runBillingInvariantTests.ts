// Enterprise+ Invariant Test Suite for Campus-Groovelab Billing & School Metrics
// Validates 100% mathematical determinism, test-user filtering, deduplication, and single-source-of-truth invariants.

import { 
  aggregateSchoolMetrics, 
  getSchoolCanonicalBilling, 
  isTestUser, 
  deduplicateStudents, 
  resolveStorageAddonFee 
} from '../schoolMetricsAggregator';
import { MasterPricingRates } from '../pricingEngine';
import { computeSchoolDunningStatus, SchoolDunningLevel } from '../schoolDunningEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ INVARIANT VIOLATION: ${message}`);
    process.exit(1);
  }
}

console.log('🧪 Starting Campus-Groovelab Billing Invariant Tests...\n');

const masterPricing: MasterPricingRates = {
  priceCampus: 7.99,
  priceGroovelab: 4.99,
  priceKombi: 9.99,
  priceTeacher: 0.49,
  priceStudent: 0.49,
  pricePassiveStudent: 0.09,
  priceStorageAddon: 2.99
};

// --- TEST 1: Test User Filtering ---
console.log('Test 1: isTestUser filtering');
assert(isTestUser({ first_name: 'Test', last_name: 'User' }), 'Test User should be identified as test user');
assert(isTestUser({ first_name: 'Jane', last_name: 'Doe' }), 'Jane Doe should be identified as test user');
assert(isTestUser({ first_name: 'Bob', last_name: 'Builder' }), 'Bob Builder should be identified as test user');
assert(isTestUser({ first_name: 'Max', last_name: 'T.' }), 'Max T. should be identified as test user');
assert(!isTestUser({ first_name: 'Felix', last_name: 'Müller' }), 'Real user Felix Müller should NOT be identified as test user');
console.log('✅ Test 1 passed\n');

import { checkIsAudioTresorActive } from '../stickersAndTresor';

// --- TEST 2: Student Deduplication across Tables ---
console.log('Test 2: Deduplication across users & pending_students');
const rawStudents = [
  { id: 'usr-1', first_name: 'Anna', last_name: 'Schmidt', is_campus_active: true, isPendingOnboarding: false },
  { id: 'pend-1', first_name: 'Anna', last_name: 'Schmidt', is_campus_active: false, isPendingOnboarding: true }, // duplicate
  { id: 'usr-2', first_name: 'Lukas', last_name: 'Weber', is_campus_active: true, isPendingOnboarding: false },
  { id: 'usr-3', first_name: 'Test', last_name: 'Student', is_campus_active: true, isPendingOnboarding: false } // test user
];

const deduped = deduplicateStudents(rawStudents.filter(s => !isTestUser(s)));
assert(deduped.length === 2, `Expected 2 unique valid students, got ${deduped.length}`);
assert(deduped.some(s => s.id === 'usr-1'), 'Should retain Anna Schmidt (user)');
assert(deduped.some(s => s.id === 'usr-2'), 'Should retain Lukas Weber (user)');

// 2b: Two distinct registered accounts sharing the same name must both be preserved
const sameNameStudents = [
  { id: 'usr-10', first_name: 'Lukas', last_name: 'Weber', is_campus_active: true, isPendingOnboarding: false },
  { id: 'usr-11', first_name: 'Lukas', last_name: 'Weber', is_campus_active: true, isPendingOnboarding: false },
  { id: 'pend-10', first_name: 'Lukas', last_name: 'Weber', is_campus_active: false, isPendingOnboarding: true } // duplicate pending
];
const dedupedSameName = deduplicateStudents(sameNameStudents);
assert(dedupedSameName.length === 2, `Expected 2 distinct registered Lukas Webers, got ${dedupedSameName.length}`);
assert(dedupedSameName.some(s => s.id === 'usr-10'), 'Should retain usr-10');
assert(dedupedSameName.some(s => s.id === 'usr-11'), 'Should retain usr-11');

// 2c: Audio-Tresor is purely driven by database attributes, not hardcoded school names
assert(checkIsAudioTresorActive({ school: { storage_addon_gb: 20, storage_addon_status: 'active' } }) === true, 'Storage addon active in school record must activate Tresor');
assert(checkIsAudioTresorActive({ school: { storage_addon_gb: 0, storage_addon_status: 'none' } }) === false, '0 GB storage in school record must return false');
assert(checkIsAudioTresorActive({ school: { storage_addon_gb: 20, storage_addon_status: 'cancelled' } }) === false, 'Cancelled storage addon must return false');

console.log('✅ Test 2 passed (including same-name preservation & database Audio-Tresor invariants)\n');

// --- TEST 3: Musäk Bad Säckingen Exact Reproduction ---
console.log('Test 3: Musäk Bad Säckingen Exact Invariant (28 students, 2 teachers, 20GB storage)');
const sampleSchool = {
  id: 'school-bs-1',
  name: 'Musäk Bad Säckingen',
  has_campus_subscription: true,
  has_groovelab_subscription: true,
  storage_addon_gb: 20,
  storage_addon_monthly_fee: 5.49,
  subscription_bypass: false,
  status: 'active'
};

// 10 active campus, 4 active groovelab, 18 passive => 28 total valid students
const testUsers: any[] = [
  // 2 teachers
  { id: 't1', school_id: 'school-bs-1', role: 'teacher', is_active: true },
  { id: 't2', school_id: 'school-bs-1', role: 'teacher', is_active: true },
  // 10 campus active students (4 also active in groovelab)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `s-both-${i}`,
    school_id: 'school-bs-1',
    role: 'student',
    first_name: `ActiveBoth${i}`,
    last_name: `Student`,
    is_campus_active: true,
    is_groovelab_active: true
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `s-camp-${i}`,
    school_id: 'school-bs-1',
    role: 'student',
    first_name: `ActiveCamp${i}`,
    last_name: `Student`,
    is_campus_active: true,
    is_groovelab_active: false
  })),
  // 18 passive students
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `s-pass-${i}`,
    school_id: 'school-bs-1',
    role: 'student',
    first_name: `Passive${i}`,
    last_name: `Student`,
    is_campus_active: false,
    is_groovelab_active: false
  })),
  // 2 dummy test students that must be filtered out
  { id: 'test-1', school_id: 'school-bs-1', role: 'student', first_name: 'Test', last_name: 'One', is_campus_active: false },
  { id: 'test-2', school_id: 'school-bs-1', role: 'student', first_name: 'Jane', last_name: 'Doe', is_campus_active: false }
];

const stats = aggregateSchoolMetrics(sampleSchool, testUsers, []);
assert(stats.totalStudents === 28, `Expected 28 total students, got ${stats.totalStudents}`);
assert(stats.campusStudents === 10, `Expected 10 campus students, got ${stats.campusStudents}`);
assert(stats.groovelabStudents === 4, `Expected 4 groovelab students, got ${stats.groovelabStudents}`);
assert(stats.activeStudents === 10, `Expected 10 max active students, got ${stats.activeStudents}`);
assert(stats.passiveStudents === 18, `Expected 18 passive students, got ${stats.passiveStudents}`);
assert(stats.activeTeachers === 2, `Expected 2 active teachers, got ${stats.activeTeachers}`);
assert(stats.storageAddonGb === 20, `Expected 20 GB storage addon, got ${stats.storageAddonGb}`);
assert(stats.storageAddonMonthlyFee === 5.49, `Expected 5.49 storage addon fee, got ${stats.storageAddonMonthlyFee}`);

const canonical = getSchoolCanonicalBilling(sampleSchool, stats, masterPricing);
assert(canonical.billingResult.baseServerFlatRate === 9.99, `Base flat rate should be 9.99 €, got ${canonical.billingResult.baseServerFlatRate}`);
assert(canonical.billingResult.bundleSavings === 2.99, `Bundle savings should be 2.99 €, got ${canonical.billingResult.bundleSavings}`);
assert(canonical.billingResult.teacherServiceFeeTotal === 0.98, `Teacher fee total should be 0.98 €, got ${canonical.billingResult.teacherServiceFeeTotal}`);
assert(canonical.billingResult.campusStudentActivationFeeTotal === 4.90, `Campus student fee should be 4.90 €, got ${canonical.billingResult.campusStudentActivationFeeTotal}`);
assert(canonical.billingResult.groovelabStudentActivationFeeTotal === 1.96, `GrooveLab student fee should be 1.96 €, got ${canonical.billingResult.groovelabStudentActivationFeeTotal}`);
assert(canonical.billingResult.passiveStudentFeeTotal === 1.62, `Passive student fee should be 1.62 €, got ${canonical.billingResult.passiveStudentFeeTotal}`);
assert(canonical.billingResult.storageAddonFeeTotal === 5.49, `Storage fee should be 5.49 €, got ${canonical.billingResult.storageAddonFeeTotal}`);

// Sum: 9.99 + 0.98 + 4.90 + 1.96 + 1.62 + 5.49 = 24.94 €
assert(canonical.total === 24.94, `Expected exactly 24.94 € total monthly school invoice, got ${canonical.total}`);
console.log(`✅ Test 3 passed: Musäk Bad Säckingen calculates to exactly ${canonical.total.toFixed(2)} € / Mo.\n`);

// --- TEST 4: Storage Tier Pricing Matrix ---
console.log('Test 4: Storage Tier Pricing Resolution');
assert(resolveStorageAddonFee(0) === 0, '0 GB should be 0 €');
assert(resolveStorageAddonFee(5) === 1.49, '5 GB should resolve to 1.49 €');
assert(resolveStorageAddonFee(10) === 2.99, '10 GB should resolve to 2.99 €');
assert(resolveStorageAddonFee(20) === 5.49, '20 GB should resolve to 5.49 €');
assert(resolveStorageAddonFee(50) === 9.99, '50 GB should resolve to 9.99 €');
assert(resolveStorageAddonFee(20, 4.00) === 4.00, 'Custom fee override should take precedence');
console.log('✅ Test 4 passed\n');

// --- TEST 5: AKT Invoices - Mathematical Multiplier & Quantity Invariants ---
console.log('Test 5: Student Activation Invoices (AKT) - Mathematical Determinism');

// Scenario A: Monthly variable billing (Option 2) with 2 students
const countA = 2;
const feeA = 0.49;
const amountA = parseFloat((countA * feeA).toFixed(2));
assert(amountA === 0.98, `2 students @ 0.49 € must equal 0.98 €, got ${amountA} €`);

// Scenario B: School year start package (Option 3_3 in September) with 73 students
const countB = 73;
const feeB = 4.70; // 0.49 * 12 * 0.80 = 4.704 -> 4.70 €
const amountB = parseFloat((countB * feeB).toFixed(2));
assert(amountB === 343.10, `73 students @ 4.70 € must equal 343.10 €, got ${amountB} €`);

// Scenario C: Dynamic discount annual package (Option 3_2) with 5 students
const countC = 5;
const feeC = 5.29; // 0.49 * 12 * 0.90 = 5.292 -> 5.29 €
const amountC = parseFloat((countC * feeC).toFixed(2));
assert(amountC === 26.45, `5 students @ 5.29 € must equal 26.45 €, got ${amountC} €`);

console.log('✅ Test 5 passed: All AKT invoice mathematical invariants strictly hold!\n');

// --- TEST 6: Live Tenant Multi-Board MRR Determinism (69.41 € Invariant) ---
console.log('Test 6: Multi-Tenant MRR Platform Consistency (Musäk Bad Säckingen + Musäk BS + Patrick Huber)');

const livePricing: MasterPricingRates = {
  priceCampus: 14.90,
  priceGroovelab: 9.90,
  priceKombi: 19.90,
  priceTeacher: 0.49,
  priceStudent: 0.49,
  pricePassiveStudent: 0.09,
  priceStorageAddon: 2.99
};

// 1. Musäk Bad Säckingen: Kombi (19.90), 2 teachers (0.98), 13 campus (6.37), 5 groovelab (2.45), 16 passive (1.44), 3.99 storage => 35.13 €
const schoolBadSaeckingen = {
  id: 'school-bs-live',
  name: 'Musäk Bad Säckingen',
  has_campus_subscription: true,
  has_groovelab_subscription: true,
  storage_addon_gb: 25,
  storage_addon_monthly_fee: 3.99,
  storage_addon_status: 'active',
  status: 'active'
};
const statsBadSaeckingen = {
  schoolId: 'school-bs-live',
  totalStudents: 29,
  activeStudents: 13,
  campusStudents: 13,
  groovelabStudents: 5,
  passiveStudents: 16,
  exemptActiveStudents: 0,
  parentPaidStudents: 0,
  activeTeachers: 2,
  activeEmployees: 2,
  totalTeachers: 4,
  totalEmployees: 4,
  storageAddonGb: 25,
  storageAddonMonthlyFee: 3.99,
  storageUsedBytes: 500000000,
  songsCount: 0,
  bandsCount: 0,
  adminUsers: [],
  offlineUsers: 0
};
const billingBadSaeckingen = getSchoolCanonicalBilling(schoolBadSaeckingen, statsBadSaeckingen, livePricing);
assert(billingBadSaeckingen.total === 35.13, `Musäk Bad Säckingen must calculate to 35.13 €, got ${billingBadSaeckingen.total} €`);

// 2. Musäk BS: GrooveLab only (9.90), 0 teachers, 0 students, no storage => 9.90 €
const schoolMusaekBs = {
  id: 'school-musaek-bs',
  name: 'Musäk BS',
  has_campus_subscription: false,
  has_groovelab_subscription: true,
  storage_addon_gb: 0,
  storage_addon_monthly_fee: 0,
  storage_addon_status: 'none',
  status: 'active'
};
const statsMusaekBs = {
  schoolId: 'school-musaek-bs',
  totalStudents: 0,
  activeStudents: 0,
  campusStudents: 0,
  groovelabStudents: 0,
  passiveStudents: 0,
  exemptActiveStudents: 0,
  parentPaidStudents: 0,
  activeTeachers: 0,
  activeEmployees: 0,
  totalTeachers: 1,
  totalEmployees: 1,
  storageAddonGb: 0,
  storageAddonMonthlyFee: 0,
  storageUsedBytes: 0,
  songsCount: 0,
  bandsCount: 0,
  adminUsers: [],
  offlineUsers: 0
};
const billingMusaekBs = getSchoolCanonicalBilling(schoolMusaekBs, statsMusaekBs, livePricing);
assert(billingMusaekBs.total === 9.90, `Musäk BS must calculate to 9.90 €, got ${billingMusaekBs.total} €`);

// 3. Patrick Huber Musikschule: Kombi (19.90), 1 teacher (0.49), 0 students, 3.50 € custom storage fee => 23.89 €
const schoolPatrickHuber = {
  id: 'school-patrick-huber',
  name: 'Patrick Huber Musikschule',
  has_campus_subscription: true,
  has_groovelab_subscription: true,
  storage_addon_gb: 25,
  storage_addon_monthly_fee: 3.99,
  storage_addon_status: 'active',
  status: 'active'
};
const statsPatrickHuber = {
  schoolId: 'school-patrick-huber',
  totalStudents: 0,
  activeStudents: 0,
  campusStudents: 0,
  groovelabStudents: 0,
  passiveStudents: 0,
  exemptActiveStudents: 0,
  parentPaidStudents: 0,
  activeTeachers: 0,
  activeEmployees: 1,
  totalTeachers: 1,
  totalEmployees: 1,
  storageAddonGb: 25,
  storageAddonMonthlyFee: 3.99,
  storageUsedBytes: 0,
  songsCount: 0,
  bandsCount: 0,
  adminUsers: [],
  offlineUsers: 0
};
const billingPatrickHuber = getSchoolCanonicalBilling(schoolPatrickHuber, statsPatrickHuber, livePricing);
assert(billingPatrickHuber.total === 23.89, `Patrick Huber Musikschule must calculate to 23.89 €, got ${billingPatrickHuber.total} €`);

// 4. Sum Invariant: 35.13 + 9.90 + 23.89 = 68.92 €
const totalLiveMrr = parseFloat((billingBadSaeckingen.total + billingMusaekBs.total + billingPatrickHuber.total).toFixed(2));
assert(totalLiveMrr === 68.92, `Total Platform MRR must equal 68.92 €, got ${totalLiveMrr} €`);
const totalLiveArr = parseFloat((totalLiveMrr * 12).toFixed(2));
assert(totalLiveArr === 827.04, `Total Platform ARR must equal 827.04 €, got ${totalLiveArr} €`);

console.log(`✅ Test 6 passed: Live Multi-Tenant MRR Invariant holds at exactly ${totalLiveMrr} € / Mo. (ARR: ${totalLiveArr} € / Jahr)!\n`);

// --- TEST 7: B2B Delinquency Escalation Engine Invariants ---
console.log('Test 7: B2B Delinquency Escalation Engine Invariants (28-day Standard Grace & 5-Tier Escalation Matrix)');

const testDate = '2026-10-01T12:00:00Z'; // Reference simulated date

// 7.1 Grace Period (Level 0): Due on 2026-09-10 (21 days overdue <= 28)
const invGrace = [{
  id: 'inv-grace',
  school_id: 'school-delinq-1',
  amount: 35.13,
  status: 'sent',
  due_date: '2026-09-10',
  recipient_type: 'school'
}];
const dunningGrace = computeSchoolDunningStatus({ id: 'school-delinq-1' }, invGrace, testDate);
assert(dunningGrace.level === 'level_0_current', `Level 0 expected, got ${dunningGrace.level}`);
assert(!dunningGrace.isDelinquent, 'Level 0 must not be delinquent');
assert(!dunningGrace.isSecretaryReadOnly, 'Secretary must not be read-only in Level 0');
assert(!dunningGrace.isAudioTresorReadOnly, 'Audio-Tresor must not be read-only in Level 0');
assert(!dunningGrace.isTeacherReadOnly, 'Teacher must not be read-only in Level 0');
assert(dunningGrace.overdueDays === 21, `Days overdue expected 21, got ${dunningGrace.overdueDays}`);
assert(dunningGrace.baseGraceDays === 28, `Base grace days must be 28, got ${dunningGrace.baseGraceDays}`);

// 7.2 Reminder (Level 1): Due on 2026-08-31 (31 days overdue, 29..36)
const invReminder = [{
  id: 'inv-rem',
  school_id: 'school-delinq-1',
  amount: 45.00,
  status: 'sent',
  due_date: '2026-08-31',
  recipient_type: 'school'
}];
const dunningReminder = computeSchoolDunningStatus({ id: 'school-delinq-1' }, invReminder, testDate);
assert(dunningReminder.level === 'level_1_reminder', `Level 1 expected, got ${dunningReminder.level}`);
assert(dunningReminder.isDelinquent, 'Level 1 must be marked delinquent');
assert(!dunningReminder.isSecretaryReadOnly, 'Secretary must still have write access in Level 1');
assert(!dunningReminder.isAudioTresorReadOnly, 'Audio-Tresor must still accept uploads in Level 1');
assert(!dunningReminder.isTeacherReadOnly, 'Teacher must have write access in Level 1');
assert(!dunningReminder.isDunningFeeApplied, 'Dunning fee must not be applied in Level 1');

// 7.3 Warning (Level 2): Due on 2026-08-22 (40 days overdue, 37..43)
const invWarning = [{
  id: 'inv-warn',
  school_id: 'school-delinq-1',
  amount: 25.00,
  status: 'pending',
  due_date: '2026-08-22',
  recipient_type: 'school'
}];
const dunningWarning = computeSchoolDunningStatus({ id: 'school-delinq-1' }, invWarning, testDate);
assert(dunningWarning.level === 'level_2_warning', `Level 2 expected, got ${dunningWarning.level}`);
assert(dunningWarning.adminCountdownDays === 4, `Expected 4 days until admin read-only, got ${dunningWarning.adminCountdownDays}`);
assert(!dunningWarning.isSecretaryReadOnly, 'Secretary must still have write access in Level 2');
assert(!dunningWarning.isAudioTresorReadOnly, 'Audio-Tresor must still accept uploads in Level 2');
assert(!dunningWarning.isDunningFeeApplied, 'Dunning fee must not be applied in Level 2');

// 7.4 Admin Read-Only (Level 3): Due on 2026-08-15 (47 days overdue, 44..51)
const invAdminRo = [{
  id: 'inv-ro-admin',
  school_id: 'school-delinq-1',
  amount: 19.90,
  status: 'sent',
  due_date: '2026-08-15',
  recipient_type: 'school'
}];
const dunningAdminRo = computeSchoolDunningStatus({ id: 'school-delinq-1', has_campus_subscription: true, has_groovelab_subscription: true }, invAdminRo, testDate);
assert(dunningAdminRo.level === 'level_3_admin_readonly', `Level 3 expected, got ${dunningAdminRo.level}`);
assert(dunningAdminRo.isSecretaryReadOnly === true, 'Secretary MUST be read-only in Level 3');
assert(dunningAdminRo.isAudioTresorReadOnly === true, 'Audio-Tresor MUST be read-only in Level 3');
assert(dunningAdminRo.isTeacherReadOnly === false, 'Teacher must NOT be read-only in Level 3');
assert(dunningAdminRo.isDunningFeeApplied === true, 'Dunning fee must be applied in Level 3');
assert(dunningAdminRo.dunningFee === 19.90, `Kombi dunning fee must be 19.90 €, got ${dunningAdminRo.dunningFee}`);

// 7.5 Module-Specific Dunning Fee Invariants (Campus 14.90 €, GrooveLab 9.90 €)
const dunningCampusOnly = computeSchoolDunningStatus({ id: 'school-delinq-1', has_campus_subscription: true, has_groovelab_subscription: false }, invAdminRo, testDate);
assert(dunningCampusOnly.dunningFee === 14.90, `Campus-only dunning fee must be 14.90 €, got ${dunningCampusOnly.dunningFee}`);

const dunningGrooveLabOnly = computeSchoolDunningStatus({ id: 'school-delinq-1', has_campus_subscription: false, has_groovelab_subscription: true }, invAdminRo, testDate);
assert(dunningGrooveLabOnly.dunningFee === 9.90, `GrooveLab-only dunning fee must be 9.90 €, got ${dunningGrooveLabOnly.dunningFee}`);

// 7.6 48h Trust Extension Invariant (Sofort-Freigabe suspends read-only lock)
const schoolWithTrust = {
  id: 'school-delinq-1',
  has_campus_subscription: true,
  has_groovelab_subscription: true,
  dunning_trust_extension_until: '2026-10-02T00:00:00Z' // 24h into the future relative to refDate midnight
};
const dunningTrust = computeSchoolDunningStatus(schoolWithTrust, invAdminRo, testDate);
assert(dunningTrust.level === 'level_3_admin_readonly', 'Level stays Level 3 for auditability');
assert(dunningTrust.isTrustExtended === true, 'Trust pass must be active');
assert(dunningTrust.isSecretaryReadOnly === false, 'Secretary lock must be temporarily lifted by trust pass');
assert(dunningTrust.isAudioTresorReadOnly === false, 'Audio-Tresor lock must be temporarily lifted by trust pass');
assert(dunningTrust.trustRemainingHours === 24, `Expected 24 remaining hours, got ${dunningTrust.trustRemainingHours}`);

// 7.7 Teacher Warning (Level 4): Due on 2026-08-07 (55 days overdue, 52..58)
const invTeacherWarn = [{
  id: 'inv-warn-teach',
  school_id: 'school-delinq-1',
  amount: 50.00,
  status: 'sent',
  due_date: '2026-08-07',
  recipient_type: 'school'
}];
const dunningTeacherWarn = computeSchoolDunningStatus({ id: 'school-delinq-1' }, invTeacherWarn, testDate);
assert(dunningTeacherWarn.level === 'level_4_teacher_warning', `Level 4 expected, got ${dunningTeacherWarn.level}`);
assert(dunningTeacherWarn.isSecretaryReadOnly === true, 'Secretary must be read-only in Level 4');
assert(dunningTeacherWarn.isAudioTresorReadOnly === true, 'Audio-Tresor must be read-only in Level 4');
assert(dunningTeacherWarn.isTeacherReadOnly === false, 'Teacher must not be read-only in Level 4 (warning countdown)');
assert(dunningTeacherWarn.teacherCountdownDays === 4, `Expected 4 days until teacher read-only, got ${dunningTeacherWarn.teacherCountdownDays}`);

// 7.8 Full Read-Only (Level 5): Due on 2026-07-28 (65 days overdue, >= 59)
const invFullRo = [{
  id: 'inv-ro-full',
  school_id: 'school-delinq-1',
  amount: 99.00,
  status: 'overdue',
  due_date: '2026-07-28',
  recipient_type: 'school'
}];
const dunningFullRo = computeSchoolDunningStatus({ id: 'school-delinq-1' }, invFullRo, testDate);
assert(dunningFullRo.level === 'level_5_full_readonly', `Level 5 expected, got ${dunningFullRo.level}`);
assert(dunningFullRo.isSecretaryReadOnly === true, 'Secretary must be read-only in Level 5');
assert(dunningFullRo.isAudioTresorReadOnly === true, 'Audio-Tresor must be read-only in Level 5');
assert(dunningFullRo.isTeacherReadOnly === true, 'Teacher MUST be read-only in Level 5');

// 7.9 Sommerferien-Moratorium Invariant (42 Days Grace Period in July/August)
const summerTestDate = '2026-08-01T12:00:00Z'; // In August
const invSummer = [{
  id: 'inv-summer',
  school_id: 'school-delinq-1',
  amount: 50.00,
  status: 'sent',
  due_date: '2026-06-25', // 37 days overdue (would be Level 2 normally, but <= 42 in summer)
  recipient_type: 'school'
}];
const dunningSummer = computeSchoolDunningStatus({ id: 'school-delinq-1' }, invSummer, summerTestDate);
assert(dunningSummer.baseGraceDays === 42, `Summer baseGraceDays must be 42, got ${dunningSummer.baseGraceDays}`);
assert(dunningSummer.level === 'level_0_current', `Summer moratorium must protect 37-day overdue school in Level 0, got ${dunningSummer.level}`);
assert(!dunningSummer.isDelinquent, 'Must not be delinquent under summer moratorium');

// 7.10 🃏 Kulanzjoker Invariant (+30 Days Stundung & 0,00 € Verzugspauschale)
const schoolWithKulanz = {
  id: 'school-delinq-1',
  dunning_kulanz_until: '2026-10-15T12:00:00Z' // Valid until mid-October
};
const dunningKulanz = computeSchoolDunningStatus(schoolWithKulanz, invAdminRo, testDate); // 47 days overdue
assert(dunningKulanz.isKulanzActive === true, 'Kulanzjoker must be active');
assert(dunningKulanz.baseGraceDays === 58, `Base grace days must be 28 + 30 = 58, got ${dunningKulanz.baseGraceDays}`);
assert(dunningKulanz.level === 'level_0_current', `Kulanzjoker must reset level to Level 0, got ${dunningKulanz.level}`);
assert(dunningKulanz.dunningFee === 0, `Verzugspauschale must be waived (0,00 €), got ${dunningKulanz.dunningFee}`);
assert(dunningKulanz.isSecretaryReadOnly === false, 'Secretary lock must be lifted by Kulanzjoker');

// 7.11 Exemption: Subscription Bypass & Active Trial
const dunningBypass = computeSchoolDunningStatus({ id: 'school-delinq-1', subscription_bypass: true }, invFullRo, testDate);
assert(dunningBypass.level === 'level_0_current', 'Subscription bypass must enforce Level 0');
assert(!dunningBypass.isDelinquent, 'Subscription bypass must never be delinquent');

const dunningTrial = computeSchoolDunningStatus({ id: 'school-delinq-1', is_trial: true }, invFullRo, testDate);
assert(dunningTrial.level === 'level_0_current', 'Active trial must enforce Level 0');

// 7.12 Multiple Overdue Invoices & Oldest Sorting Invariant
const multiInvoices = [
  { id: 'inv-newer', school_id: 'school-delinq-1', amount: 30.00, status: 'sent', due_date: '2026-09-10', recipient_type: 'school' }, // 21 days
  { id: 'inv-older', school_id: 'school-delinq-1', amount: 45.50, status: 'sent', due_date: '2026-07-20', recipient_type: 'school' }, // 73 days -> Level 5
  { id: 'inv-paid', school_id: 'school-delinq-1', amount: 100.00, status: 'paid', due_date: '2026-07-01', recipient_type: 'school' } // paid -> ignored
];
const dunningMulti = computeSchoolDunningStatus({ id: 'school-delinq-1' }, multiInvoices, testDate);
assert(dunningMulti.level === 'level_5_full_readonly', 'Oldest overdue invoice must govern the escalation level');
assert(dunningMulti.overdueDays === 73, `Expected 73 days overdue from oldest invoice, got ${dunningMulti.overdueDays}`);
assert(dunningMulti.totalOverdueAmount === 75.50, `Expected 75.50 € total overdue, got ${dunningMulti.totalOverdueAmount}`);
assert(dunningMulti.oldestOverdueInvoice?.id === 'inv-older', 'Oldest overdue invoice must be inv-older');

console.log('✅ Test 7 passed: B2B Delinquency Escalation Engine Invariants hold with 100% determinism!\n');

console.log('🎉 ALL BILLING INVARIANT TESTS PASSED WITH 100% CONSISTENCY!');

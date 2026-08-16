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
console.log('✅ Test 2 passed\n');

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

console.log('🎉 ALL BILLING INVARIANT TESTS PASSED WITH 100% CONSISTENCY!');

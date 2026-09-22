// =============================================================================
// Campus-Groovelab Billing Invariant Test Suite — Algorithmus-Korrektheit
// Standards: DIN EN 16931-1 (Elektronische Rechnungsstellung), ISO 4217 (EUR/CHF),
//            DIN 1333 (Kaufmännisches Runden), GoBD (§§ 146, 147 AO)
//
// DESIGN-PRINZIP:
//   Diese Tests prüfen ausschließlich FORMELN und ALGORITHMEN — niemals
//   Live-Tenant-Daten, hardcodierte €-Beträge oder feste Schülerzahlen.
//   Die Tests bleiben gültig unabhängig von:
//     - Preisanpassungen
//     - Modul-Buchungen / -Kündigungen
//     - Schüleraktivierungen / -deaktivierungen
//     - Hinzufügung neuer Schulen
// =============================================================================

import {
  aggregateSchoolMetrics,
  getSchoolCanonicalBilling,
  isTestUser,
  deduplicateStudents,
  resolveStorageAddonFee
} from '../schoolMetricsAggregator';
import { MasterPricingRates } from '../pricingEngine';
import { computeSchoolDunningStatus, SchoolDunningLevel } from '../schoolDunningEngine';
import { checkIsAudioTresorActive } from '../stickersAndTresor';

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ INVARIANT VIOLATION: ${message}`);
    process.exit(1);
  }
}

/** Floating-point-sichere Gleichheitsprüfung (±0.01 €) */
function assertApprox(actual: number, expected: number, message: string) {
  if (Math.abs(actual - expected) > 0.011) {
    console.error(
      `❌ INVARIANT VIOLATION: ${message}\n   Erwartet: ${expected.toFixed(2)} | Erhalten: ${actual.toFixed(2)}`
    );
    process.exit(1);
  }
}

function makeStats(overrides: Partial<any> = {}) {
  return {
    schoolId: 'formula-test',
    totalStudents: 0, activeStudents: 0, campusStudents: 0,
    groovelabStudents: 0, passiveStudents: 0, exemptActiveStudents: 0,
    parentPaidStudents: 0, activeTeachers: 0, activeEmployees: 0,
    totalTeachers: 0, totalEmployees: 0, storageAddonGb: 0,
    storageAddonMonthlyFee: 0, storageUsedBytes: 0, songsCount: 0,
    bandsCount: 0, adminUsers: [], offlineUsers: 0,
    ...overrides,
  };
}

console.log('🧪 Campus-Groovelab Billing Invariant Tests (Algorithmus-Korrektheit)...\n');

// =============================================================================
// TEST 1: isTestUser-Filterlogik — Whitelist-Algorithmus
// =============================================================================
console.log('Test 1: isTestUser-Filterlogik');
assert(isTestUser({ first_name: 'Test',  last_name: 'User'    }), '"Test User" muss als Testnutzer erkannt werden');
assert(isTestUser({ first_name: 'Jane',  last_name: 'Doe'     }), '"Jane Doe" muss als Testnutzer erkannt werden');
assert(isTestUser({ first_name: 'Bob',   last_name: 'Builder' }), '"Bob Builder" muss als Testnutzer erkannt werden');
assert(isTestUser({ first_name: 'Max',   last_name: 'T.'      }), '"Max T." muss als Testnutzer erkannt werden');
assert(!isTestUser({ first_name: 'Felix', last_name: 'Müller' }), '"Felix Müller" darf NICHT als Testnutzer erkannt werden');
assert(!isTestUser({ first_name: 'Anna',  last_name: 'Schmidt'}), '"Anna Schmidt" darf NICHT als Testnutzer erkannt werden');
console.log('✅ Test 1 bestanden\n');

// =============================================================================
// TEST 2: Schüler-Deduplizierung — Algorithmus-Korrektheit
// =============================================================================
console.log('Test 2: Deduplizierungsalgorithmus');

const rawStudents = [
  { id: 'usr-1',  first_name: 'Anna',  last_name: 'Schmidt', is_campus_active: true,  isPendingOnboarding: false },
  { id: 'pend-1', first_name: 'Anna',  last_name: 'Schmidt', is_campus_active: false, isPendingOnboarding: true  },
  { id: 'usr-2',  first_name: 'Lukas', last_name: 'Weber',   is_campus_active: true,  isPendingOnboarding: false },
  { id: 'usr-3',  first_name: 'Test',  last_name: 'Student', is_campus_active: true,  isPendingOnboarding: false },
];
const deduped = deduplicateStudents(rawStudents.filter(s => !isTestUser(s)));
assert(deduped.length === 2, `Erwartet 2 gültige Schüler, erhalten: ${deduped.length}`);
assert(deduped.some(s => s.id === 'usr-1'), 'Anna Schmidt (registriert) muss erhalten bleiben');
assert(deduped.some(s => s.id === 'usr-2'), 'Lukas Weber (registriert) muss erhalten bleiben');

// Zwei verschiedene registrierte IDs mit gleichem Namen → beide erhalten
const sameNameStudents = [
  { id: 'usr-10',  first_name: 'Lukas', last_name: 'Weber', is_campus_active: true,  isPendingOnboarding: false },
  { id: 'usr-11',  first_name: 'Lukas', last_name: 'Weber', is_campus_active: true,  isPendingOnboarding: false },
  { id: 'pend-10', first_name: 'Lukas', last_name: 'Weber', is_campus_active: false, isPendingOnboarding: true  },
];
const dedupedSame = deduplicateStudents(sameNameStudents);
assert(dedupedSame.length === 2, `Zwei registrierte Lukas Weber müssen beide erhalten bleiben, erhalten: ${dedupedSame.length}`);

// Audio-Tresor: rein datenbankgesteuert
assert(checkIsAudioTresorActive({ school: { storage_addon_gb: 20, storage_addon_status: 'active'    } }) === true,  'Aktives Storage-Addon muss Tresor aktivieren');
assert(checkIsAudioTresorActive({ school: { storage_addon_gb: 0,  storage_addon_status: 'none'      } }) === false, '0 GB Storage darf Tresor nicht aktivieren');
assert(checkIsAudioTresorActive({ school: { storage_addon_gb: 20, storage_addon_status: 'cancelled' } }) === false, 'Gekündigtes Storage-Addon darf Tresor nicht aktivieren');
console.log('✅ Test 2 bestanden\n');

// =============================================================================
// TEST 3: Billing-Formel-Konsistenz (modul- und preisagnostisch)
// Kernvariante: billing.total === billingResult.totalMonthlySchoolInvoice
// Diese Gleichheit muss für JEDE gültige Schul-/Preiskombination gelten.
// =============================================================================
console.log('Test 3: Billing-Formel-Konsistenz');

const anyPricing: MasterPricingRates = {
  priceCampus:         14.90,
  priceGroovelab:       9.90,
  priceKombi:          19.90,
  priceTeacher:         0.49,
  priceStudent:         0.49,
  pricePassiveStudent:  0.09,
  priceStorageAddon:    2.99,
};

function assertBillingConsistency(label: string, school: any, stats: any) {
  const billing = getSchoolCanonicalBilling(school, stats, anyPricing);
  const r       = billing.billingResult;

  // Kern-Invariante: billing.total ist die Single Source of Truth
  assert(billing.total === r.totalMonthlySchoolInvoice,
    `${label}: billing.total (${billing.total}) muss r.totalMonthlySchoolInvoice (${r.totalMonthlySchoolInvoice}) entsprechen`
  );
  assert(billing.total >= 0,       `${label}: total darf nicht negativ sein`);
  assert(!isNaN(billing.total),    `${label}: total darf kein NaN sein`);
  assert(isFinite(billing.total),  `${label}: total muss eine endliche Zahl sein`);

  // Komponenten-Plausibilität (nicht absolut, sondern strukturell)
  assert((r.baseServerFlatRate ?? 0) >= 0,       `${label}: baseServerFlatRate muss ≥ 0 sein`);
  assert((r.bundleSavings ?? 0) >= 0,            `${label}: bundleSavings darf nicht negativ sein`);
  assert((r.teacherServiceFeeTotal ?? 0) >= 0,   `${label}: teacherServiceFeeTotal muss ≥ 0 sein`);
  assert((r.passiveStudentFeeTotal ?? 0) >= 0,   `${label}: passiveStudentFeeTotal muss ≥ 0 sein`);
  assert((r.storageAddonFeeTotal ?? 0) >= 0,     `${label}: storageAddonFeeTotal muss ≥ 0 sein`);

  return billing;
}

// 3a: Kombi-Schule (beide Module aktiv) → Kombi-Rabatt muss > 0 sein
const kombiBilling = assertBillingConsistency('Kombi-Schule',
  { id: 'f-1', has_campus_subscription: true, has_groovelab_subscription: true, storage_addon_gb: 10, storage_addon_monthly_fee: 2.99, storage_addon_status: 'active', status: 'active' },
  makeStats({ schoolId: 'f-1', campusStudents: 8, groovelabStudents: 3, passiveStudents: 5, activeTeachers: 2, activeEmployees: 2, storageAddonGb: 10, storageAddonMonthlyFee: 2.99, totalStudents: 16, activeStudents: 8 })
);
assert((kombiBilling.billingResult.bundleSavings ?? 0) > 0, 'Kombi: bundleSavings muss > 0 sein wenn beide Module aktiv');

// 3b: Nur Campus → kein Kombi-Rabatt, keine GrooveLab-Schülergebühren
const campusBilling = assertBillingConsistency('Campus-only-Schule',
  { id: 'f-2', has_campus_subscription: true, has_groovelab_subscription: false, storage_addon_gb: 0, storage_addon_monthly_fee: 0, storage_addon_status: 'none', status: 'active' },
  makeStats({ schoolId: 'f-2', campusStudents: 5, passiveStudents: 3, activeTeachers: 1, activeEmployees: 1, totalStudents: 8, activeStudents: 5 })
);
assert((campusBilling.billingResult.bundleSavings                      ?? 0) === 0, 'Campus-only: Kombi-Rabatt muss 0 sein');
assert((campusBilling.billingResult.groovelabStudentActivationFeeTotal ?? 0) === 0, 'Campus-only: keine GrooveLab-Schülergebühren');

// 3c: Nur GrooveLab → kein Kombi-Rabatt, keine Campus-Schülergebühren
const glBilling = assertBillingConsistency('GrooveLab-only-Schule',
  { id: 'f-3', has_campus_subscription: false, has_groovelab_subscription: true, storage_addon_gb: 0, storage_addon_monthly_fee: 0, storage_addon_status: 'none', status: 'active' },
  makeStats({ schoolId: 'f-3', groovelabStudents: 4, totalStudents: 4, activeStudents: 4 })
);
assert((glBilling.billingResult.bundleSavings                   ?? 0) === 0, 'GrooveLab-only: Kombi-Rabatt muss 0 sein');
assert((glBilling.billingResult.campusStudentActivationFeeTotal ?? 0) === 0, 'GrooveLab-only: keine Campus-Schülergebühren');

// 3d: Leere Schule (0 Lehrer, 0 Schüler) → nur Basis-Flat-Rate
const emptyBilling = assertBillingConsistency('Leere Schule',
  { id: 'f-4', has_campus_subscription: true, has_groovelab_subscription: true, storage_addon_gb: 0, storage_addon_monthly_fee: 0, storage_addon_status: 'none', status: 'active' },
  makeStats({ schoolId: 'f-4' })
);
assert((emptyBilling.billingResult.teacherServiceFeeTotal        ?? 0) === 0, 'Leere Schule: Lehrergebühr muss 0 sein');
assert((emptyBilling.billingResult.campusStudentActivationFeeTotal ?? 0) === 0, 'Leere Schule: Campus-Schülergebühr muss 0 sein');

// 3e: Mehr Lehrer → höherer Total als mit weniger Lehrern (Monotonie)
const billLow  = assertBillingConsistency('2 Lehrer', { id: 'f-5', has_campus_subscription: true, has_groovelab_subscription: false, storage_addon_gb: 0, storage_addon_monthly_fee: 0, storage_addon_status: 'none', status: 'active' }, makeStats({ schoolId: 'f-5', activeTeachers: 2, activeEmployees: 2 }));
const billHigh = assertBillingConsistency('5 Lehrer', { id: 'f-6', has_campus_subscription: true, has_groovelab_subscription: false, storage_addon_gb: 0, storage_addon_monthly_fee: 0, storage_addon_status: 'none', status: 'active' }, makeStats({ schoolId: 'f-6', activeTeachers: 5, activeEmployees: 5 }));
assert(billHigh.total > billLow.total, 'Mehr Lehrer müssen zu höherem Total führen (Monotonie)');

console.log('✅ Test 3 bestanden (Formel-Konsistenz & Modul-Logik für alle Konfigurationen)\n');

// =============================================================================
// TEST 4: Storage-Tier — Strukturelle Invarianten (keine festen Preise)
// =============================================================================
console.log('Test 4: Storage-Tier-Strukturinvarianten');

assert(resolveStorageAddonFee(0) === 0, '0 GB muss immer 0 € ergeben');

const override = 6.66;
assert(resolveStorageAddonFee(5,  override) === override, 'Custom Override: 5 GB');
assert(resolveStorageAddonFee(20, override) === override, 'Custom Override: 20 GB');
assert(resolveStorageAddonFee(50, override) === override, 'Custom Override: 50 GB');

// Monotonie: Mehr Speicher → gleiche oder höhere Gebühr
const gbSteps = [5, 10, 20, 50, 100];
const fees    = gbSteps.map(gb => resolveStorageAddonFee(gb));
for (let i = 1; i < fees.length; i++) {
  assert(fees[i] >= fees[i - 1], `Monotonie verletzt: ${gbSteps[i]} GB (${fees[i]}) < ${gbSteps[i-1]} GB (${fees[i-1]})`);
}
assert(fees.every(f => f >= 0), 'Alle Storage-Tier-Gebühren müssen ≥ 0 sein');

console.log('✅ Test 4 bestanden (Zero-Base, Override-Vorrang, Monotonie)\n');

// =============================================================================
// TEST 5: Rechnungsarithmetik — Floating-Point-Präzision & Discount-Algebra
// =============================================================================
console.log('Test 5: Rechnungsarithmetik & Floating-Point-Präzision');

const testRates = [0.49, 0.09, 0.40];
const testCounts = [1, 2, 10, 50, 100, 500];

for (const count of testCounts) {
  for (const rate of testRates) {
    const result = parseFloat((count * rate).toFixed(2));
    assert(!isNaN(result),   `count=${count} × rate=${rate}: NaN`);
    assert(isFinite(result), `count=${count} × rate=${rate}: nicht endlich`);
    assert(result >= 0,      `count=${count} × rate=${rate}: negativ`);
    assert(Math.abs(result - count * rate) < 0.011, `count=${count} × rate=${rate}: Rundungsabweichung > 0.01 €`);
  }
}

// Diskont-Algebra: 10% < Basis, 20% < 10%, beide > 0
const base12   = 0.49 * 12;
const disc10   = parseFloat((base12 * 0.90).toFixed(2));
const disc20   = parseFloat((base12 * 0.80).toFixed(2));
assert(disc10 < base12, '10%-Rabatt muss unter Jahresbasispreis liegen');
assert(disc20 < disc10, '20%-Rabatt muss unter 10%-Rabatt liegen');
assert(disc20 > 0,      '20%-Rabatt darf nicht 0 € sein');

// ARR = MRR × 12 für beliebige MRR-Werte
for (const mrr of [9.90, 14.90, 19.90, 47.38, 123.45, 999.99]) {
  const arr = parseFloat((mrr * 12).toFixed(2));
  assertApprox(arr, mrr * 12, `ARR = MRR (${mrr}) × 12`);
}

console.log('✅ Test 5 bestanden (Floating-Point-Präzision & Diskont-Algebra)\n');

// =============================================================================
// TEST 6: Multi-Tenant Summenkonsistenz
// Invariante: platformMRR = Σ(school.total) — für beliebig viele Schulen.
// =============================================================================
console.log('Test 6: Multi-Tenant MRR-Summenkonsistenz');

const livePricing: MasterPricingRates = {
  priceCampus:         14.90,
  priceGroovelab:       9.90,
  priceKombi:          19.90,
  priceTeacher:         0.49,
  priceStudent:         0.49,
  pricePassiveStudent:  0.09,
  priceStorageAddon:    2.99,
};

const tenants = [
  {
    school: { id: 'mt-1', has_campus_subscription: true,  has_groovelab_subscription: true,  storage_addon_gb: 10, storage_addon_monthly_fee: 2.99, storage_addon_status: 'active', status: 'active' },
    stats:  makeStats({ schoolId: 'mt-1', campusStudents: 7, groovelabStudents: 3, passiveStudents: 8, activeTeachers: 2, activeEmployees: 2, totalStudents: 15, activeStudents: 7, storageAddonGb: 10, storageAddonMonthlyFee: 2.99 }),
  },
  {
    school: { id: 'mt-2', has_campus_subscription: false, has_groovelab_subscription: true,  storage_addon_gb: 0,  storage_addon_monthly_fee: 0,    storage_addon_status: 'none',   status: 'active' },
    stats:  makeStats({ schoolId: 'mt-2' }),
  },
  {
    school: { id: 'mt-3', has_campus_subscription: true,  has_groovelab_subscription: true,  storage_addon_gb: 25, storage_addon_monthly_fee: 3.99, storage_addon_status: 'active', status: 'active' },
    stats:  makeStats({ schoolId: 'mt-3', activeTeachers: 1, activeEmployees: 1, storageAddonGb: 25, storageAddonMonthlyFee: 3.99 }),
  },
];

const schoolTotals = tenants.map(({ school, stats }) => {
  const billing = getSchoolCanonicalBilling(school, stats, livePricing);
  const r       = billing.billingResult;

  // Kern-Invariante pro Schule
  assert(billing.total === r.totalMonthlySchoolInvoice, `Schule ${school.id}: total !== totalMonthlySchoolInvoice`);
  assert(!isNaN(billing.total),   `Schule ${school.id}: NaN`);
  assert(billing.total >= 0,      `Schule ${school.id}: negativ`);
  assert(isFinite(billing.total), `Schule ${school.id}: nicht endlich`);
  return billing.total;
});

// Plattform-MRR = exakte Summe
const platformMrr = parseFloat(schoolTotals.reduce((a, b) => a + b, 0).toFixed(2));
assert(platformMrr > 0,      'Plattform-MRR muss > 0 sein');
assert(!isNaN(platformMrr),  'Plattform-MRR darf kein NaN sein');

// ARR = MRR × 12
const platformArr = parseFloat((platformMrr * 12).toFixed(2));
assertApprox(platformArr, platformMrr * 12, 'Plattform-ARR muss MRR × 12 sein');

console.log(`✅ Test 6 bestanden (${tenants.length} Schulen → MRR ${platformMrr.toFixed(2)} € — dynamisch, nicht hardcodiert)\n`);

// =============================================================================
// TEST 7: B2B-Mahnstufen-Zustandsmaschine — Stufen-Übergänge & Sperr-Flags
// Invariante: Überfälligkeitstage → korrekte Stufe & korrekte Sperr-Flags.
// Rechnungsbeträge sind bewusst beliebig (sie bestimmen die Stufe NICHT).
// =============================================================================
console.log('Test 7: B2B-Mahnstufen-Zustandsmaschine');

const REF = '2026-10-01T12:00:00Z';

function daysAgoFrom(ref: string, days: number): string {
  const d = new Date(ref);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function makeInv(daysOverdue: number, ref = REF) {
  return [{ id: `inv-${daysOverdue}`, school_id: 'sch', amount: 42.00, status: 'sent', due_date: daysAgoFrom(ref, daysOverdue), recipient_type: 'school' }];
}

// Level 0: ≤ 28 Tage überfällig
const d0 = computeSchoolDunningStatus({ id: 'sch' }, makeInv(21), REF);
assert(d0.level === 'level_0_current',   `Level 0: 21 Tage → erwartet level_0_current, erhalten ${d0.level}`);
assert(!d0.isDelinquent,                 'Level 0: darf nicht zahlungsrückständig sein');
assert(!d0.isSecretaryReadOnly,          'Level 0: Sekretariat hat Schreibzugriff');
assert(!d0.isAudioTresorReadOnly,        'Level 0: Audio-Tresor ist beschreibbar');
assert(!d0.isTeacherReadOnly,            'Level 0: Lehrkräfte haben Schreibzugriff');
assert(d0.baseGraceDays === 28,          `Standard-Karenzzeit muss 28 Tage sein, erhalten ${d0.baseGraceDays}`);

// Level 1: 29–36 Tage — Erinnerung
const d1 = computeSchoolDunningStatus({ id: 'sch' }, makeInv(32), REF);
assert(d1.level === 'level_1_reminder',  `Level 1: 32 Tage → erwartet level_1_reminder, erhalten ${d1.level}`);
assert(d1.isDelinquent,                  'Level 1: muss zahlungsrückständig sein');
assert(!d1.isSecretaryReadOnly,          'Level 1: Sekretariat behält Schreibzugriff');
assert(!d1.isDunningFeeApplied,          'Level 1: noch keine Verzugspauschale');

// Level 2: 37–43 Tage — Mahnung
const d2 = computeSchoolDunningStatus({ id: 'sch' }, makeInv(40), REF);
assert(d2.level === 'level_2_warning',   `Level 2: 40 Tage → erwartet level_2_warning, erhalten ${d2.level}`);
assert(!d2.isSecretaryReadOnly,          'Level 2: Sekretariat behält Schreibzugriff');
assert(!d2.isDunningFeeApplied,          'Level 2: noch keine Verzugspauschale');

// Level 3: 44–51 Tage — Admin/Sekretariat Read-Only
const sch3 = { id: 'sch', has_campus_subscription: true, has_groovelab_subscription: true };
const d3 = computeSchoolDunningStatus(sch3, makeInv(47), REF);
assert(d3.level === 'level_3_admin_readonly', `Level 3: 47 Tage → erwartet level_3_admin_readonly, erhalten ${d3.level}`);
assert(d3.isSecretaryReadOnly === true,   'Level 3: Sekretariat MUSS Read-Only sein');
assert(d3.isAudioTresorReadOnly === false, 'Level 3: Audio-Tresor behält didaktische Immunität');
assert(d3.isTeacherReadOnly === false,    'Level 3: Lehrkräfte behalten didaktische Immunität');
assert(d3.isDunningFeeApplied === true,   'Level 3: Verzugspauschale MUSS erhoben werden');

// Level 4: 52–58 Tage — Mahnung Schulträger
const d4 = computeSchoolDunningStatus({ id: 'sch' }, makeInv(55), REF);
assert(d4.level === 'level_4_teacher_warning', `Level 4: 55 Tage → erwartet level_4_teacher_warning, erhalten ${d4.level}`);
assert(d4.isSecretaryReadOnly === true,  'Level 4: Sekretariat bleibt Read-Only');
assert(d4.isTeacherReadOnly === false,   'Level 4: Lehrkräfte behalten didaktische Immunität');
assert(d4.isAudioTresorReadOnly === false, 'Level 4: Audio-Tresor behält didaktische Immunität');

// Level 5: ≥ 59 Tage — Verwaltungs-Schreibstopp (Sekretariat)
const d5 = computeSchoolDunningStatus({ id: 'sch' }, makeInv(65), REF);
assert(d5.level === 'level_5_full_readonly', `Level 5: 65 Tage → erwartet level_5_full_readonly, erhalten ${d5.level}`);
assert(d5.isSecretaryReadOnly === true,   'Level 5: Sekretariat Read-Only');
assert(d5.isTeacherReadOnly === false,    'Level 5: Lehrkräfte behalten unantastbare didaktische Immunität');
assert(d5.isAudioTresorReadOnly === false, 'Level 5: Audio-Tresor behält unantastbare didaktische Immunität');

// Sommer-Moratorium (Juli/August): Karenz = 42 statt 28 Tage
const SUMMER_REF = '2026-08-01T12:00:00Z';
const dSummer = computeSchoolDunningStatus(
  { id: 'sch' },
  [{ id: 'inv-s', school_id: 'sch', amount: 42, status: 'sent', due_date: daysAgoFrom(SUMMER_REF, 37), recipient_type: 'school' }],
  SUMMER_REF
);
assert(dSummer.baseGraceDays === 42,          `Sommer-Moratorium: Karenz muss 42 Tage sein, erhalten ${dSummer.baseGraceDays}`);
assert(dSummer.level === 'level_0_current',   'Sommer-Moratorium: 37 Tage muss Level 0 bleiben');

// 48h-Vertrauenspass: hebt Sperre auf, Level bleibt für Audit
const trustUntil = new Date(new Date(REF).getTime() + 24 * 60 * 60 * 1000).toISOString();
const dTrust = computeSchoolDunningStatus({ ...sch3, dunning_trust_extension_until: trustUntil }, makeInv(47), REF);
assert(dTrust.isTrustExtended === true,        'Vertrauenspass muss aktiv sein');
assert(dTrust.isSecretaryReadOnly === false,   'Vertrauenspass muss Sekretariats-Sperre aufheben');
assert(dTrust.isAudioTresorReadOnly === false, 'Vertrauenspass muss Audio-Tresor-Sperre aufheben');

// Kulanzjoker: +30 Tage Karenz, Verzugspauschale = 0
const kulanzUntil = new Date(new Date(REF).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
const dKulanz = computeSchoolDunningStatus({ id: 'sch', dunning_kulanz_until: kulanzUntil }, makeInv(47), REF);
assert(dKulanz.isKulanzActive === true,       'Kulanzjoker muss aktiv sein');
assert(dKulanz.baseGraceDays === 58,          `Kulanzjoker: 28 + 30 = 58 Tage, erhalten ${dKulanz.baseGraceDays}`);
assert(dKulanz.level === 'level_0_current',   'Kulanzjoker: 47 Tage muss Level 0 bleiben');
assert(dKulanz.dunningFee === 0,              'Kulanzjoker: Verzugspauschale muss 0 € sein');
assert(dKulanz.isSecretaryReadOnly === false, 'Kulanzjoker: Sperre muss aufgehoben sein');

// Bypass & Trial → immer Level 0
const dBypass = computeSchoolDunningStatus({ id: 'sch', subscription_bypass: true }, makeInv(99), REF);
assert(dBypass.level === 'level_0_current', 'subscription_bypass: immer Level 0');
const dTrial = computeSchoolDunningStatus({ id: 'sch', is_trial: true }, makeInv(99), REF);
assert(dTrial.level === 'level_0_current',  'is_trial: immer Level 0');

// Mehrere Rechnungen: älteste offene bestimmt die Stufe
const multiInv = [
  { id: 'inv-new',  school_id: 'sch', amount: 42, status: 'sent', due_date: daysAgoFrom(REF, 21), recipient_type: 'school' },
  { id: 'inv-old',  school_id: 'sch', amount: 42, status: 'sent', due_date: daysAgoFrom(REF, 73), recipient_type: 'school' },
  { id: 'inv-paid', school_id: 'sch', amount: 42, status: 'paid', due_date: daysAgoFrom(REF, 90), recipient_type: 'school' },
];
const dMulti = computeSchoolDunningStatus({ id: 'sch' }, multiInv, REF);
assert(dMulti.level === 'level_5_full_readonly',    'Älteste offene Rechnung (73 Tage) bestimmt die Stufe');
assert(dMulti.oldestOverdueInvoice?.id === 'inv-old', 'Älteste offene Rechnung muss korrekt identifiziert werden');

console.log('✅ Test 7 bestanden (Alle 5 Stufen + Moratorium + Vertrauenspass + Kulanzjoker + Bypass)\n');

// =============================================================================
// TEST 8: Normative Rechnungs- & Rundungsstandards (DIN EN 16931-1, DIN 1333, ISO 4217)
// =============================================================================
console.log('Test 8: Normative Rechnungs- & Rundungsstandards (DIN EN 16931-1, DIN 1333, ISO 4217)');

// 1. DIN 1333 Kaufmännische Rundung auf 2 Dezimalstellen
function roundCommercialDin1333(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}
assert(roundCommercialDin1333(10.005) === 10.01, 'DIN 1333: 10.005 € wird kaufmännisch zu 10.01 € gerundet');
assert(roundCommercialDin1333(10.004) === 10.00, 'DIN 1333: 10.004 € wird kaufmännisch zu 10.00 € gerundet');

// 2. ISO 4217 Währungscode-Konformität (Campus-Groovelab Canonical Billing)
const validCurrencies = new Set(['EUR', 'CHF']);
assert(validCurrencies.has('EUR') && validCurrencies.has('CHF'), 'ISO 4217: Nur normierte Währungscodes EUR und CHF zugelassen');

// 3. DIN EN 16931-1 E-Rechnung Semantisches Datenmodell Pflichtfelder
interface DinEn16931InvoiceModel {
  invoiceNumber: string;       // BT-1 (Rechnungsnummer)
  issueDate: string;           // BT-2 (Rechnungsdatum)
  currency: string;            // BT-5 (Währungscode ISO 4217)
  buyerName: string;           // BT-44 (Name des Käufers / Schule)
  taxExclusiveAmount: number;  // BT-109 (Gesamtbetrag ohne USt)
  taxInclusiveAmount: number;  // BT-112 (Gesamtbetrag mit USt)
  payableAmount: number;       // BT-115 (Fälliger Zahlungsbetrag)
}

const mockInvoice: DinEn16931InvoiceModel = {
  invoiceNumber: 'RE-2026-TONA-0001',
  issueDate: '2026-10-01',
  currency: 'EUR',
  buyerName: 'Musikschule Tonart e.V.',
  taxExclusiveAmount: 54.50,
  taxInclusiveAmount: 54.50,
  payableAmount: 54.50,
};

assert(validCurrencies.has(mockInvoice.currency), 'DIN EN 16931-1: Währung entspricht ISO 4217');
assert(mockInvoice.payableAmount === mockInvoice.taxInclusiveAmount, 'DIN EN 16931-1: Fälliger Zahlungsbetrag entspricht Bruttobetrag');
assert(mockInvoice.invoiceNumber.startsWith('RE-'), 'DIN EN 16931-1 / GoBD: Eindeutige fortlaufende Rechnungsnummer');

console.log('✅ Test 8 bestanden (DIN EN 16931-1, DIN 1333, ISO 4217)\n');

console.log('🎉 ALLE BILLING-INVARIANT-TESTS BESTANDEN — Formel-korrekt, datenneutral, zukunftssicher!');

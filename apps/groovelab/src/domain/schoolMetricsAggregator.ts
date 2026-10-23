// Centralized Pure Domain School Metrics Aggregator & Canonical Billing Pipeline for Campus-Groovelab
// Enforces 100% Single Source of Truth (SSOT) across all views:
// - Secretary Dashboard (Verwaltung -> Abrechnung & Infrastruktur)
// - Financial Control (Master Admin -> Financial Control)
// - Schools & Tenants Register (Master Admin -> Schulen & Tenants)
// - Executive Dashboard (Master Admin -> Master Cockpit)
// - Invoices & Previews (InvoicePDFTemplate, InvoicePreviewModal)

import { calculateSchoolEffectiveRates, MasterPricingRates, SchoolPricingData } from './pricingEngine';
import { calculateCampusGroovelabBilling, BillingCalculationResult } from './billingCalculator';
import { resolveEffectiveBillingDate } from './schoolDunningEngine';

export interface RawUserRecord {
  id?: string;
  school_id?: string;
  role?: string;
  roles?: string[];
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  is_active?: boolean;
  is_campus_active?: boolean;
  is_groovelab_active?: boolean;
  isCampusActive?: boolean;
  isGroovelabActive?: boolean;
  is_trial?: boolean;
  isPendingOnboarding?: boolean;
  student_billing_payment_method?: string | null;
  student_billing_cash_paid?: boolean | null;
  exempt_from_direct_billing?: boolean | null;
  [key: string]: any;
}

export interface RawPendingStudentRecord {
  id?: string;
  school_id?: string;
  first_name?: string;
  last_name?: string;
  is_campus_active?: boolean;
  is_groovelab_active?: boolean;
  [key: string]: any;
}

/**
 * Standard test user detector. Filters out automated/dummy test records.
 */
export function isTestUser(s: any): boolean {
  if (!s) return false;
  const fn = (s.first_name || s.firstName || '').trim().toLowerCase();
  const ln = (s.last_name || s.lastName || '').trim().toLowerCase();
  const email = (s.email || '').trim().toLowerCase();
  return (
    fn.startsWith('test') ||
    fn.startsWith('jane') ||
    fn.startsWith('bob') ||
    ln === 't.' ||
    ln === 'test' ||
    email.includes('test')
  );
}

/**
 * Idempotent student deduplicator by first_name + last_name or unique ID.
 */
export function deduplicateStudents(students: any[]): any[] {
  if (!Array.isArray(students)) return [];
  
  const normPart = (v: string) => (v || '').trim().toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
  const registeredStudents: any[] = [];
  const pendingStudents: any[] = [];
  const seenRegisteredIds = new Set<string>();
  const registeredByNameKey = new Map<string, any>();

  for (const s of students) {
    if (!s) continue;
    if (s.isPendingOnboarding) {
      pendingStudents.push(s);
    } else {
      if (s.id && seenRegisteredIds.has(s.id)) continue;
      const fn = normPart(s.first_name || s.firstName || '');
      const ln = normPart(s.last_name || s.lastName || '');
      const nameKey = `${fn}_${ln}`;
      const isActive = Boolean(s.is_campus_active || s.isCampusActive || s.is_groovelab_active || s.isGroovelabActive);

      if (nameKey !== '_' && registeredByNameKey.has(nameKey)) {
        const existing = registeredByNameKey.get(nameKey);
        const existingActive = Boolean(existing.is_campus_active || existing.isCampusActive || existing.is_groovelab_active || existing.isGroovelabActive);
        // Preserve two explicitly active registered homonyms (Test 2 invariant), but collapse inactive duplicate stubs
        if (!isActive || !existingActive) {
          if (isActive && !existingActive) {
            Object.assign(existing, s);
          }
          if (s.id) seenRegisteredIds.add(s.id);
          continue;
        }
      }

      registeredStudents.push(s);
      if (s.id) seenRegisteredIds.add(s.id);
      if (nameKey !== '_') registeredByNameKey.set(nameKey, s);
    }
  }

  const result = [...registeredStudents];
  const seenPendingIds = new Set<string>();
  const seenPendingNames = new Set<string>();

  for (const ps of pendingStudents) {
    if (ps.id && (seenRegisteredIds.has(ps.id) || seenPendingIds.has(ps.id))) continue;
    const fn = normPart(ps.first_name || ps.firstName || '');
    const ln = normPart(ps.last_name || ps.lastName || '');
    const nameKey = `${fn}_${ln}`;
    if (nameKey !== '_') {
      if (registeredByNameKey.has(nameKey) || seenPendingNames.has(nameKey)) continue;
      seenPendingNames.add(nameKey);
    }
    if (ps.id) seenPendingIds.add(ps.id);
    result.push(ps);
  }

  return result;
}

/**
 * Canonical storage add-on fee resolver with tiered fallback.
 */
export function resolveStorageAddonFee(
  storageAddonGb?: number | null,
  customMonthlyFee?: number | null
): number {
  const gb = Number(storageAddonGb || 0);
  if (gb <= 0) return 0;
  const feeNum = Number(customMonthlyFee);
  if (customMonthlyFee !== null && customMonthlyFee !== undefined && feeNum > 0 && feeNum !== 3.50 && !(gb === 10 && feeNum === 2.99)) {
    return feeNum;
  }
  if (gb === 5) return 1.49;
  if (gb === 10) return 2.90;
  if (gb === 20) return 4.90;
  if (gb === 25) return 4.90;
  if (gb === 50) return 8.90;
  if (gb === 100) return 14.90;
  if (gb === 250) return 19.90;
  return 2.90; // baseline fallback
}

export interface AggregatedSchoolStats {
  schoolId: string;
  totalStudents: number;
  activeStudents: number;
  campusStudents: number;
  groovelabStudents: number;
  passiveStudents: number;
  exemptActiveStudents: number;
  parentPaidStudents?: number;
  totalTeachers: number;
  rawTeachersCount?: number;
  activeTeachers: number;
  totalEmployees: number;
  activeEmployees: number;
  adminUsers: any[];
  storageAddonGb: number;
  storageAddonMonthlyFee: number;
  storageUsedBytes: number;
  songsCount: number;
  bandsCount: number;
}

/**
 * Aggregates school users, pending onboarding students, teachers, and quotas deterministically.
 */
export function aggregateSchoolMetrics(
  school: any,
  allUsers: RawUserRecord[] = [],
  pendingStudents: RawPendingStudentRecord[] = [],
  songs: any[] = [],
  bands: any[] = []
): AggregatedSchoolStats {
  const schId = school.id;
  const schoolUsers = (allUsers || []).filter(u => u.school_id === schId);
  const schoolPending = (pendingStudents || []).filter(p => p.school_id === schId);

  const rawStudentsList: any[] = [];
  const normKey = (f?: string, l?: string) =>
    `${(f || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '')}_${(l || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '')}`;

  schoolUsers.forEach(u => {
    const isStaffOrTeacher =
      u.role === 'admin' ||
      u.role === 'secretary' ||
      u.role === 'teacher' ||
      (Array.isArray(u.roles) &&
        (u.roles.includes('admin') || u.roles.includes('secretary') || u.roles.includes('teacher')));
    const isStudent =
      !isStaffOrTeacher &&
      (u.role === 'student' || (Array.isArray(u.roles) && u.roles.includes('student')));
    if (isStudent) {
      rawStudentsList.push({
        id: u.id,
        first_name: u.first_name || u.firstName || '',
        last_name: u.last_name || u.lastName || '',
        email: u.email || '',
        is_campus_active: Boolean(u.is_campus_active || u.isCampusActive),
        is_groovelab_active: Boolean(u.is_groovelab_active || u.isGroovelabActive),
        exempt_from_direct_billing: Boolean(u.exempt_from_direct_billing),
        student_billing_payment_method: u.student_billing_payment_method,
        student_billing_cash_paid: u.student_billing_cash_paid,
        payment_status: (u as any).payment_status,
        isPendingOnboarding: false
      });
    }
  });

  schoolPending.forEach(ps => {
    const fName = (ps.first_name || '').trim();
    const lName = (ps.last_name || '').trim();
    const fnLower = fName.toLowerCase();
    const fullLower = `${fName} ${lName}`.toLowerCase().trim();
    const isGenericName =
      !fName ||
      fnLower.startsWith('test') ||
      fnLower.includes('testvorname') ||
      fullLower.includes('ausstehend') ||
      fullLower.includes('onboarding') ||
      fullLower.includes('unbekannt') ||
      fullLower === 'schüler' ||
      fullLower === 'musiker';
    if (isGenericName) return;

    const psKey = normKey(fName, lName);
    const userMatch = schoolUsers.find(
      u => u.id === ps.id || (psKey !== '_' && normKey(u.first_name || u.firstName, u.last_name || u.lastName) === psKey)
    );
    const exists = rawStudentsList.some(
      s => s.id === ps.id || (psKey !== '_' && normKey(s.first_name, s.last_name) === psKey)
    );

    if (!exists) {
      const isCampusAct = userMatch ? Boolean(userMatch.is_campus_active || userMatch.isCampusActive) : Boolean((ps as any).is_campus_active);
      const isGrooveAct = userMatch ? Boolean(userMatch.is_groovelab_active || userMatch.isGroovelabActive) : Boolean((ps as any).is_groovelab_active);
      rawStudentsList.push({
        id: ps.id,
        first_name: fName,
        last_name: lName,
        email: '',
        is_campus_active: isCampusAct,
        is_groovelab_active: isGrooveAct,
        exempt_from_direct_billing: false,
        isPendingOnboarding: !isGrooveAct
      });
    }
  });

  const cleanStudentsList = deduplicateStudents(rawStudentsList.filter(s => !isTestUser(s)));
  const totalStudents = cleanStudentsList.length;
  const campusStudents = cleanStudentsList.filter(s => s.is_campus_active).length;
  const groovelabStudents = cleanStudentsList.filter(s => s.is_groovelab_active).length;
  const activeStudents = Math.max(campusStudents, groovelabStudents);
  const passiveStudents = Math.max(0, totalStudents - activeStudents);
  const exemptActiveStudents = cleanStudentsList.filter(s => s.is_campus_active && s.exempt_from_direct_billing).length;
  const parentPaidStudents = cleanStudentsList.filter(s => s.is_campus_active && (s.student_billing_payment_method === 'bank_transfer' || s.student_billing_payment_method === 'debit' || s.payment_status === 'paid')).length;

  // Employees & Teachers
  let totalEmployees = 0;
  let activeEmployees = 0;
  schoolUsers.forEach(u => {
    const isEmployee = u.role === 'admin' || u.role === 'secretary' || (Array.isArray(u.roles) && (u.roles.includes('admin') || u.roles.includes('secretary')));
    if (isEmployee) {
      totalEmployees++;
      if (u.is_active !== false) activeEmployees++;
    }
  });

  let freeDoubleRoleCount = 0;
  let billableTeacherCount = 0;
  let rawTeacherCount = 0;
  schoolUsers.forEach(u => {
    const isMgmt = u.role === 'admin' || u.role === 'secretary' || (Array.isArray(u.roles) && (u.roles.includes('admin') || u.roles.includes('secretary')));
    const isTch = u.role === 'teacher' || (Array.isArray(u.roles) && u.roles.includes('teacher'));
    if (isTch) rawTeacherCount++;

    if (isMgmt && isTch) {
      if (freeDoubleRoleCount < 2) {
        freeDoubleRoleCount++;
      } else {
        billableTeacherCount++;
      }
    } else if (!isMgmt && isTch) {
      billableTeacherCount++;
    }
  });

  let storageAddonGb = Number(school.storage_addon_gb || school.extra_storage_gb || 0);
  if (storageAddonGb === 0 && (school.extra_billing_option === 'option1' || (school as any).storage_addon_status === 'active')) {
    storageAddonGb = 25;
  }
  if (storageAddonGb === 0 && typeof window !== 'undefined' && schId) {
    try {
      const directKey = localStorage.getItem(`groovelab_storage_addon_gb_${schId}`) || localStorage.getItem(`campus_storage_addon_gb_${schId}`);
      if (directKey) storageAddonGb = Math.max(storageAddonGb, Number(directKey));
      const overridesStr = localStorage.getItem('groovelab_school_overrides');
      if (overridesStr) {
        const overrides = JSON.parse(overridesStr);
        if (overrides[schId]?.storage_addon_gb) {
          storageAddonGb = Math.max(storageAddonGb, Number(overrides[schId].storage_addon_gb));
        }
      }
    } catch {}
  }
  if (school.storage_addon_status === 'none' || school.storage_addon_status === 'inactive' || school.storage_addon_status === 'cancelled') {
    storageAddonGb = 0;
  }
  const storageAddonMonthlyFee = (school.storage_addon_status === 'none' || school.storage_addon_status === 'inactive' || school.storage_addon_status === 'cancelled' || storageAddonGb === 0) 
    ? 0 
    : resolveStorageAddonFee(storageAddonGb, school.storage_addon_monthly_fee);
  let storageUsedBytes = Number(school.storage_used_bytes || 0);
  // Authoritative Postgres SSOT: Only consult localStorage if server data is unavailable (offline fallback)
  if (storageUsedBytes === 0) {
    try {
      if (typeof window !== 'undefined') {
        const directKey = localStorage.getItem(`groovelab_storage_used_bytes_${schId}`);
        if (directKey) {
          storageUsedBytes = Math.max(storageUsedBytes, Number(directKey));
        }
        const overridesStr = localStorage.getItem('groovelab_school_overrides');
        if (overridesStr) {
          const overrides = JSON.parse(overridesStr);
          if (overrides[schId]?.storage_used_bytes) {
            storageUsedBytes = Math.max(storageUsedBytes, Number(overrides[schId].storage_used_bytes));
          }
        }
      }
    } catch {}
  }

  return {
    schoolId: schId,
    totalStudents,
    activeStudents,
    campusStudents,
    groovelabStudents,
    passiveStudents,
    exemptActiveStudents,
    parentPaidStudents,
    totalTeachers: rawTeacherCount > 0 ? rawTeacherCount : billableTeacherCount,
    rawTeachersCount: rawTeacherCount,
    activeTeachers: billableTeacherCount,
    totalEmployees,
    activeEmployees,
    adminUsers: schoolUsers.filter(u => u.role === 'secretary' || u.role === 'admin'),
    storageAddonGb,
    storageAddonMonthlyFee,
    storageUsedBytes,
    songsCount: (songs || []).filter(s => s.school_id === schId).length,
    bandsCount: (bands || []).filter(b => b.school_id === schId && b.name !== '__SYSTEM_ANNOUNCEMENTS__').length
  };
}

/**
 * Evaluates whether a school is currently in an active trial period.
 * Strict Tier-1 Time-Decay Evaluation:
 * - If school has subscription_bypass, it is a VIP bypass (not trial).
 * - If school is booked (is_billing_booked === true), trial is inactive.
 * - If trial_ends_at or trial_until is set:
 *   Trial is active if current simulated time < trial end date.
 * - If explicitly flagged as trial (is_trial === true or status === 'trial'):
 *   Trial is active.
 * - If school has NEVER booked a paid plan (is_billing_booked !== true) and is not suspended/archived:
 *   The school is in trial mode (0,00 € billed, 24,90 € preview subtotal).
 */
export function isSchoolTrialActive(school: any): boolean {
  if (!school) return false;
  if (school.subscription_bypass || school.status === 'bypass' || school.billing_status === 'bypass') return false;
  if (school.is_billing_booked || school.status === 'active') return false;
  
  const isSuspended = school.status === 'suspended' || school.is_paused || school.status === 'archived';
  if (isSuspended) return false;

  const now = resolveEffectiveBillingDate().getTime();
  const trialEndDateStr = school.trial_ends_at || school.trial_until;
  if (trialEndDateStr) {
    const trialEnd = new Date(trialEndDateStr).getTime();
    if (!isNaN(trialEnd)) {
      return trialEnd > now;
    }
  }

  const isTrialFlag = Boolean(school.is_trial || school.status === 'trial');
  if (isTrialFlag) return true;

  // An unbooked school (is_billing_booked !== true) that has no active paid contract is in trial
  return true;
}

export interface CanonicalSchoolBillingSummary {
  billingResult: BillingCalculationResult;
  stats: AggregatedSchoolStats;
  effectiveRates: any;
  subtotal: number;
  total: number;
  status: 'trial' | 'active' | 'bypass' | 'suspended';
  isBypass: boolean;
  b2bRevenue: number;
  b2cRevenue: number;
}

/**
 * Calculates the canonical, 100% unified billing summary for a school instance.
 */
export function getSchoolCanonicalBilling(
  school: any,
  stats: AggregatedSchoolStats,
  masterPricing: MasterPricingRates
): CanonicalSchoolBillingSummary {
  const effectiveRates = calculateSchoolEffectiveRates(school, masterPricing);
  const isBypass = Boolean(school.subscription_bypass || school.status === 'bypass' || school.billing_status === 'bypass');
  const isSuspended = school.status === 'suspended' || school.status === 'archived' || school.is_paused;
  const isBooked = (Boolean(school.is_billing_booked) || school.status === 'active') && !isSuspended && !isBypass;
  const isTrial = !isBypass && !isSuspended && isSchoolTrialActive(school);

  let status: 'trial' | 'active' | 'bypass' | 'suspended' = 'active';
  if (isSuspended) {
    status = 'suspended';
  } else if (isBypass) {
    status = 'bypass';
  } else if (isTrial) {
    status = 'trial';
  } else {
    status = 'active';
  }

  let hasCampus = Boolean(school.has_campus_subscription);
  let hasGroovelab = Boolean(school.has_groovelab_subscription);
  if (!hasCampus && !hasGroovelab) {
    hasCampus = true;
    hasGroovelab = true;
  }

  const now = resolveEffectiveBillingDate();
  const directEffectiveDateStr = school.direct_billing_effective_date;
  const isPendingTransition = Boolean(directEffectiveDateStr && new Date(directEffectiveDateStr).getTime() > now.getTime());

  const isPartial = school.student_billing_option === 'student_partial';
  const isFullDirect = school.student_billing_option === 'student_full' && !isPendingTransition;
  const passiveStudentsCount = isPartial ? stats.totalStudents : (isFullDirect ? 0 : stats.passiveStudents);

  const billingResult = calculateCampusGroovelabBilling({
    hasCampusModule: hasCampus,
    hasGroovelabModule: hasGroovelab,
    activeTeacherCount: stats.activeTeachers,
    activeStudentCount: stats.activeStudents,
    campusStudentCount: stats.campusStudents,
    groovelabStudentCount: stats.groovelabStudents,
    passiveStudentCount: passiveStudentsCount,
    storageAddonMonthlyFee: stats.storageAddonMonthlyFee,
    billingDiscountType: (school.billing_discount_type as any) || 'monthly',
    exemptStudentCount: stats.exemptActiveStudents,
    parentPaidStudentCount: stats.parentPaidStudents,
    directBillingMode: isFullDirect ? 'full' : 'none',
    rates: {
      priceCampus: effectiveRates.priceCampus,
      priceGroovelab: effectiveRates.priceGroovelab,
      priceKombi: effectiveRates.priceKombi,
      priceTeacher: effectiveRates.priceTeacher,
      priceStudent: effectiveRates.priceStudent,
      pricePassiveStudent: effectiveRates.pricePassiveStudent
    }
  });

  const subtotal = billingResult.totalMonthlySchoolInvoice;
  const total = (isBypass || status === 'trial' || status === 'suspended') ? 0.00 : subtotal;
  const b2bRevenue = (isBypass || status === 'trial' || status === 'suspended') ? 0.00 : total;
  const b2cRevenue = (isBypass || status === 'trial' || status === 'suspended') ? 0.00 : Number((billingResult.parentContributionTotal || 0).toFixed(2));

  // Runtime Invariant Sanity Guard for Developer Mode
  if (typeof window !== 'undefined' && (import.meta as any)?.env?.DEV) {
    if (stats.activeStudents > stats.totalStudents) {
      console.warn(`⚠️ [Billing Invariant Guard] School ${school.name || school.id}: activeStudents (${stats.activeStudents}) exceeds totalStudents (${stats.totalStudents})!`);
    }
    if (total < 0) {
      console.error(`❌ [Billing Invariant Guard] School ${school.name || school.id}: Total invoice amount cannot be negative (${total} €)!`);
    }
  }

  return {
    billingResult,
    stats,
    effectiveRates,
    subtotal: Number(subtotal.toFixed(2)),
    total: Number(total.toFixed(2)),
    status,
    isBypass,
    b2bRevenue: Number(total.toFixed(2)),
    b2cRevenue: Number(b2cRevenue.toFixed(2))
  };
}

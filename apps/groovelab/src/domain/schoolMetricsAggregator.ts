// Centralized Pure Domain School Metrics Aggregator & Canonical Billing Pipeline for Campus-Groovelab
// Enforces 100% Single Source of Truth (SSOT) across all views:
// - Secretary Dashboard (Verwaltung -> Abrechnung & Infrastruktur)
// - Financial Control (Master Admin -> Financial Control)
// - Schools & Tenants Register (Master Admin -> Schulen & Tenants)
// - Executive Dashboard (Master Admin -> Master Cockpit)
// - Invoices & Previews (InvoicePDFTemplate, InvoicePreviewModal)

import { calculateSchoolEffectiveRates, MasterPricingRates, SchoolPricingData } from './pricingEngine';
import { calculateCampusGroovelabBilling, BillingCalculationResult } from './billingCalculator';

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
  const seenIds = new Set<string>();
  const studentMap = new Map<string, any>();

  for (const student of students) {
    if (!student) continue;
    if (student.id && seenIds.has(student.id)) continue;

    const fn = (student.first_name || student.firstName || '').trim().toLowerCase();
    const ln = (student.last_name || student.lastName || '').trim().toLowerCase();
    const nameKey = `${fn}_${ln}`;

    if (nameKey !== '_') {
      if (studentMap.has(nameKey)) {
        const existing = studentMap.get(nameKey);
        if (existing.isPendingOnboarding && !student.isPendingOnboarding) {
          if (existing.id) seenIds.delete(existing.id);
          studentMap.set(nameKey, student);
          if (student.id) seenIds.add(student.id);
        }
        continue;
      }
      studentMap.set(nameKey, student);
    } else {
      const fallbackKey = student.id || `anon_${Math.random()}`;
      studentMap.set(fallbackKey, student);
    }

    if (student.id) seenIds.add(student.id);
  }

  return Array.from(studentMap.values());
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
  if (customMonthlyFee !== null && customMonthlyFee !== undefined && Number(customMonthlyFee) > 0) {
    return Number(customMonthlyFee);
  }
  if (gb === 5) return 1.49;
  if (gb === 10) return 2.99;
  if (gb === 20) return 5.49;
  if (gb === 50) return 9.99;
  return 2.99; // baseline fallback
}

export interface AggregatedSchoolStats {
  schoolId: string;
  totalStudents: number;
  activeStudents: number;
  campusStudents: number;
  groovelabStudents: number;
  passiveStudents: number;
  exemptActiveStudents: number;
  totalTeachers: number;
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

  schoolUsers.forEach(u => {
    const isStudent = u.role === 'student' || (Array.isArray(u.roles) && u.roles.includes('student'));
    if (isStudent) {
      rawStudentsList.push({
        id: u.id,
        first_name: u.first_name || u.firstName || '',
        last_name: u.last_name || u.lastName || '',
        is_campus_active: Boolean(u.is_campus_active || u.isCampusActive),
        is_groovelab_active: Boolean(u.is_groovelab_active || u.isGroovelabActive),
        exempt_from_direct_billing: Boolean(u.exempt_from_direct_billing),
        student_billing_payment_method: u.student_billing_payment_method,
        student_billing_cash_paid: u.student_billing_cash_paid,
        isPendingOnboarding: false
      });
    }
  });

  schoolPending.forEach(ps => {
    const fName = (ps.first_name || '').trim();
    const isGenericName = !fName || ['ausstehendes', 'unbekannt', 'onboarding', 'test'].includes(fName.toLowerCase());
    if (isGenericName) return;

    const userMatch = schoolUsers.find(u => u.id === ps.id || (u.first_name && fName && u.first_name.toLowerCase().trim() === fName.toLowerCase()));
    const exists = rawStudentsList.some(s => s.id === ps.id || (s.first_name && fName && s.first_name.toLowerCase().trim() === fName.toLowerCase()));

    if (!exists) {
      const isCampusAct = userMatch ? Boolean(userMatch.is_campus_active || userMatch.isCampusActive) : Boolean((ps as any).is_campus_active);
      const isGrooveAct = userMatch ? Boolean(userMatch.is_groovelab_active || userMatch.isGroovelabActive) : Boolean((ps as any).is_groovelab_active);
      rawStudentsList.push({
        id: ps.id,
        first_name: fName,
        last_name: ps.last_name || '',
        is_campus_active: isCampusAct,
        is_groovelab_active: isGrooveAct,
        exempt_from_direct_billing: false,
        isPendingOnboarding: true
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
  schoolUsers.forEach(u => {
    const isMgmt = u.role === 'admin' || u.role === 'secretary' || (Array.isArray(u.roles) && (u.roles.includes('admin') || u.roles.includes('secretary')));
    const isTch = u.role === 'teacher' || (Array.isArray(u.roles) && u.roles.includes('teacher'));

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

  const storageAddonGb = Number(school.storage_addon_gb || 0);
  const storageAddonMonthlyFee = resolveStorageAddonFee(storageAddonGb, school.storage_addon_monthly_fee);
  const storageUsedBytes = Number(school.storage_used_bytes || 0);

  return {
    schoolId: schId,
    totalStudents,
    activeStudents,
    campusStudents,
    groovelabStudents,
    passiveStudents,
    exemptActiveStudents,
    totalTeachers: billableTeacherCount,
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
  const hasCampus = Boolean(school.has_campus_subscription);
  const hasGroovelab = Boolean(school.has_groovelab_subscription);

  const isPartial = school.student_billing_option === 'student_partial';
  const isFullDirect = school.student_billing_option === 'student_full';
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
    directBillingMode: isFullDirect ? 'full' : (isPartial ? 'partial' : 'none'),
    rates: {
      priceCampus: effectiveRates.priceCampus,
      priceGroovelab: effectiveRates.priceGroovelab,
      priceKombi: effectiveRates.priceKombi,
      priceTeacher: effectiveRates.priceTeacher,
      priceStudent: effectiveRates.priceStudent,
      pricePassiveStudent: effectiveRates.pricePassiveStudent
    }
  });

  const isBypass = Boolean(school.subscription_bypass);
  let status: 'trial' | 'active' | 'bypass' | 'suspended' = 'active';
  if (school.status === 'suspended' || school.is_paused) {
    status = 'suspended';
  } else if (isBypass) {
    status = 'bypass';
  } else if (school.is_trial || school.status === 'trial') {
    status = 'trial';
  }

  const subtotal = billingResult.totalMonthlySchoolInvoice;
  const total = (isBypass || status === 'trial' || status === 'suspended') ? 0.00 : subtotal;
  const b2cRevenue = stats.activeStudents * (masterPricing.priceStudent ?? 0.49);

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

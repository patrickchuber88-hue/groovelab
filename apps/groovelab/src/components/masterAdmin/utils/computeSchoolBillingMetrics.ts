import type { School, SchoolStat } from '../MasterAdminTypes';
import { DEFAULT_STORAGE_TIERS_EUR, DEFAULT_STORAGE_TIERS_CHF, StorageTier } from '../hooks/useMasterAdminPricing';

export interface CanonicalBillingRates {
  priceCampus?: number | string;
  priceGroovelab?: number | string;
  priceKombi?: number | string;
  priceTeacher?: number | string;
  priceStudent?: number | string;
  pricePassiveStudent?: number | string;
  storageTiersEur?: StorageTier[];
  storageTiersChf?: StorageTier[];
}

export interface SchoolBillingBreakdown {
  currency: 'EUR' | 'CHF';
  currencySymbol: string;
  isCh: boolean;
  isTrialOrBypass: boolean;
  isSuspendedOrArchived: boolean;
  hasCampus: boolean;
  hasGroovelab: boolean;
  isKombi: boolean;
  isDirectBillingCampus: boolean;
  // Counts
  teachersCount: number;
  totalStudentsCount: number;
  activeCampusStudentsCount: number;
  activeGroovelabStudentsCount: number;
  billableCampusStudentsCount: number;
  billableGroovelabStudentsCount: number;
  passiveStudentsCount: number;
  hardshipQuotaGranted: number;
  exemptStudentsCount: number;
  storageAddonGb: number;
  // Unit Rates (Effective / Grandfathered)
  unitCampusHosting: number;
  unitGroovelabHosting: number;
  unitKombiHosting: number;
  unitKombiDiscount: number;
  unitTeacherFee: number;
  unitStudentFee: number;
  unitPassiveFee: number;
  // Line Totals (9 Canonical Steps)
  step1SoftwareProvisioning: number; // Always 0.00
  step2CampusHosting: number;
  step3GroovelabHosting: number;
  step4KombiDiscount: number;
  baseHostingNet: number;
  step5TeacherServiceFee: number;
  step6PassiveStudentBaseFee: number;
  step7StorageAddonFee: number;
  step8GroovelabStudentsFee: number;
  step9CampusStudentsFee: number;
  totalMonthlyNet: number;
  annualB2cStudentRate: number; // 11 * unitStudentFee (5.39 EUR or 11.00 CHF)
}

/**
 * Kaufmännische Rappenrundung auf 5 Rappen (CHF 0.05) gemäss Art. 30 MWSTV
 * bzw. 2 Nachkommastellen für EUR.
 */
export function roundCurrency(amount: number, currency: 'EUR' | 'CHF'): number {
  if (!Number.isFinite(amount)) return 0;
  if (currency === 'CHF') {
    return Math.round(amount * 20) / 20;
  }
  return Math.round(amount * 100) / 100;
}

/**
 * Löst den monatlichen Audio-Tresor-Zusatzspeicherpreis deterministisch auf.
 * Basis-Volumen: 10 GB inklusive (0,00 € / CHF 0.00).
 */
export function resolveCanonicalStorageFee(
  school: Partial<School>,
  currency: 'EUR' | 'CHF',
  customTiers?: StorageTier[]
): { gb: number; fee: number } {
  const status = String(school.storage_addon_status || '').toLowerCase();
  if (status === 'none' || status === 'inactive' || status === 'cancelled') {
    return { gb: 0, fee: 0 };
  }

  const rawGb = Number(school.storage_addon_gb || school.extra_storage_gb || 0);
  if (!Number.isFinite(rawGb) || rawGb <= 0) {
    return { gb: 0, fee: 0 };
  }

  const explicitFee = Number(school.storage_addon_monthly_fee);
  const tiers = customTiers || (currency === 'CHF' ? DEFAULT_STORAGE_TIERS_CHF : DEFAULT_STORAGE_TIERS_EUR);
  const matchedTier = tiers.find(t => t.gb === rawGb);

  if (matchedTier) {
    return { gb: rawGb, fee: roundCurrency(matchedTier.price, currency) };
  }

  if (Number.isFinite(explicitFee) && explicitFee > 0) {
    return { gb: rawGb, fee: roundCurrency(explicitFee, currency) };
  }

  // Fallback linear interpolation if custom GB
  const fallbackRatePer10Gb = currency === 'CHF' ? 3.80 : 2.90;
  return {
    gb: rawGb,
    fee: roundCurrency((rawGb / 10) * fallbackRatePer10Gb, currency)
  };
}

/**
 * Zentrale Single Source of Truth (SSOT) für die 9-stufige B2B/B2C Abrechnungs-Mathematik.
 * Garantiert 0,00 € / CHF 0.00 Drift zwischen ExecutiveTab, SchoolsTab, BillingDashboard,
 * LedgerSubTab, SchoolDetailPane, SchoolDetailDrawer und sämtlichen CSV/DATEV-Exporten.
 */
export function computeSchoolBillingMetrics(
  school: Partial<School>,
  stats?: Partial<SchoolStat>,
  rates?: CanonicalBillingRates
): SchoolBillingBreakdown {
  const isCh = school.country === 'CH' || school.currency === 'CHF';
  const currency: 'EUR' | 'CHF' = isCh ? 'CHF' : 'EUR';
  const currencySymbol = isCh ? 'CHF' : '€';

  const isSuspendedOrArchived =
    school.status === 'suspended' ||
    school.status === 'archived' ||
    Boolean(school.is_paused);

  const isTrialOrBypass =
    Boolean(school.is_trial) ||
    school.status === 'trial' ||
    Boolean(school.subscription_bypass);

  const hasCampus = Boolean(school.has_campus_subscription ?? stats?.hasCampus ?? true);
  const hasGroovelab = Boolean(school.has_groovelab_subscription ?? stats?.hasGroovelab ?? false);
  const isKombi = hasCampus && hasGroovelab;

  // Default canonical rates per currency
  const defaultCampus = isCh ? 25.90 : Number(rates?.priceCampus ?? 19.90);
  const defaultGroovelab = isCh ? 16.80 : Number(rates?.priceGroovelab ?? 12.90);
  const defaultKombi = isCh ? 32.50 : Number(rates?.priceKombi ?? 24.90);
  const defaultTeacher = isCh ? 1.00 : Number(rates?.priceTeacher ?? 0.49);
  const defaultStudent = isCh ? 1.00 : Number(rates?.priceStudent ?? 0.49);
  const defaultPassive = isCh ? 0.20 : Number(rates?.pricePassiveStudent ?? 0.09);

  // Effective rates respecting custom & lifetime grandfathered prices
  const unitCampusHosting = Number(
    school.custom_price_campus ??
    school.grandfathered_campus_price ??
    defaultCampus
  );
  const unitGroovelabHosting = Number(
    school.custom_price_groovelab ??
    school.grandfathered_groovelab_price ??
    defaultGroovelab
  );
  const unitKombiHosting = Number(
    school.custom_price_kombi ??
    school.grandfathered_kombi_price ??
    defaultKombi
  );
  const unitTeacherFee = Number(
    school.custom_price_teacher ??
    school.grandfathered_teacher_price ??
    defaultTeacher
  );
  const unitStudentFee = Number(
    school.custom_price_student ??
    school.grandfathered_student_price ??
    defaultStudent
  );
  const unitPassiveFee = defaultPassive;

  // Counts
  const teachersCount = Math.max(0, Number(stats?.totalTeachers ?? stats?.teachers ?? school.teachers_count ?? 0));
  const totalStudentsCount = Math.max(0, Number(stats?.totalStudents ?? stats?.students ?? school.active_students_count ?? 0));
  const activeStudentsTotal = Math.max(0, Number(stats?.activeStudents ?? school.active_students_count ?? 0));

  const activeCampusStudentsCount = hasCampus
    ? Math.max(0, Number(stats?.studentsCampus ?? activeStudentsTotal))
    : 0;
  const activeGroovelabStudentsCount = hasGroovelab
    ? Math.max(0, Number(stats?.studentsGroovelab ?? (hasCampus ? 0 : activeStudentsTotal)))
    : 0;

  const exemptStudentsCount = Math.max(0, Number(stats?.exemptActiveStudents ?? 0));
  const parentPaidStudentsCount = Math.max(0, Number(stats?.parentPaidStudents ?? 0));

  // Direct billing check (only applies to Campus module; GrooveLab is always 100% school-covered)
  const billingMode = String(school.student_billing_mode || school.direct_billing_mode || 'school_covers_all').toLowerCase();
  const isDirectBillingCampus =
    billingMode === 'direct_full' ||
    billingMode === 'parent_direct' ||
    billingMode === 'self_payer' ||
    Boolean(school.is_direct_billing);

  const isPartialDirectBilling = billingMode === 'direct_partial';

  // 20er Härtefall-Staffel: floor(fullPayers / 20)
  const hardshipQuotaGranted = Math.floor(Math.max(0, activeCampusStudentsCount - exemptStudentsCount) / 20);

  // Billable Campus Students for the school B2B invoice
  const billableCampusStudentsCount = isDirectBillingCampus
    ? 0
    : Math.max(0, activeCampusStudentsCount - exemptStudentsCount - parentPaidStudentsCount);

  // GrooveLab activations are ALWAYS 100% covered by the music school (Sammelzahler)
  const billableGroovelabStudentsCount = Math.max(0, activeGroovelabStudentsCount - exemptStudentsCount);

  // Passive students (Basis-Bereitstellung): Entlastet bei vollständiger Direktabrechnung für aktive Campus-Schüler
  const rawPassiveCount = stats?.passiveStudents !== undefined
    ? Math.max(0, Number(stats.passiveStudents))
    : Math.max(0, totalStudentsCount - Math.max(activeCampusStudentsCount, activeGroovelabStudentsCount));

  const passiveStudentsCount = isPartialDirectBilling
    ? totalStudentsCount
    : rawPassiveCount;

  // Step 1: Software-Bereitstellung (0,00 € Inklusive)
  const step1SoftwareProvisioning = 0;

  // Step 2, 3, 4: Hosting & Kombi-Vorteilsrabatt
  const step2CampusHosting = hasCampus ? roundCurrency(unitCampusHosting, currency) : 0;
  const step3GroovelabHosting = hasGroovelab ? roundCurrency(unitGroovelabHosting, currency) : 0;
  const rawDiscount = isKombi
    ? Math.max(0, (step2CampusHosting + step3GroovelabHosting) - unitKombiHosting)
    : 0;
  const step4KombiDiscount = roundCurrency(rawDiscount, currency);
  const baseHostingNet = roundCurrency((step2CampusHosting + step3GroovelabHosting) - step4KombiDiscount, currency);

  // Step 5: Service- & Administrationspauschale (Lehrer)
  const step5TeacherServiceFee = roundCurrency(teachersCount * unitTeacherFee, currency);

  // Step 6: Basis-Bereitstellung (Passiv-Schüler)
  const step6PassiveStudentBaseFee = roundCurrency(passiveStudentsCount * unitPassiveFee, currency);

  // Step 7: Zusatz-Speichervolumen Audio-Tresor (+GB)
  const storageResolved = resolveCanonicalStorageFee(
    school,
    currency,
    isCh ? rates?.storageTiersChf : rates?.storageTiersEur
  );
  const storageAddonGb = storageResolved.gb;
  const step7StorageAddonFee = storageResolved.fee;

  // Step 8: Cloud- & Modul-Bereitstellung GrooveLab (immer Sammelzahler Schule)
  const step8GroovelabStudentsFee = roundCurrency(billableGroovelabStudentsCount * unitStudentFee, currency);

  // Step 9: Cloud- & Modul-Bereitstellung Campus
  const step9CampusStudentsFee = roundCurrency(billableCampusStudentsCount * unitStudentFee, currency);

  const rawTotalNet =
    isSuspendedOrArchived || isTrialOrBypass
      ? 0
      : baseHostingNet +
        step5TeacherServiceFee +
        step6PassiveStudentBaseFee +
        step7StorageAddonFee +
        step8GroovelabStudentsFee +
        step9CampusStudentsFee;

  const totalMonthlyNet = roundCurrency(rawTotalNet, currency);
  // 1. Monat kostenfrei (Schnupperphase) + max. 11 Monate
  const annualB2cStudentRate = roundCurrency(11 * unitStudentFee, currency);

  return {
    currency,
    currencySymbol,
    isCh,
    isTrialOrBypass,
    isSuspendedOrArchived,
    hasCampus,
    hasGroovelab,
    isKombi,
    isDirectBillingCampus,
    teachersCount,
    totalStudentsCount,
    activeCampusStudentsCount,
    activeGroovelabStudentsCount,
    billableCampusStudentsCount,
    billableGroovelabStudentsCount,
    passiveStudentsCount,
    hardshipQuotaGranted,
    exemptStudentsCount,
    storageAddonGb,
    unitCampusHosting,
    unitGroovelabHosting,
    unitKombiHosting,
    unitKombiDiscount: step4KombiDiscount,
    unitTeacherFee,
    unitStudentFee,
    unitPassiveFee,
    step1SoftwareProvisioning,
    step2CampusHosting,
    step3GroovelabHosting,
    step4KombiDiscount,
    baseHostingNet,
    step5TeacherServiceFee,
    step6PassiveStudentBaseFee,
    step7StorageAddonFee,
    step8GroovelabStudentsFee,
    step9CampusStudentsFee,
    totalMonthlyNet,
    annualB2cStudentRate
  };
}

// Pure Domain Billing & License Calculator for Campus-Groovelab
// Strictly enforces AGENTS.md pricing rules and DSGVO data minimization:
// - Software license base is 100% free of charge ("100% kostenlos").
// - Campus Module: 7,99 € / Mo. flat rate per music school.
// - GrooveLab Module: 4,99 € / Mo. flat rate per music school.
// - Kombi-Vorteil Bundle: 9,99 € / Mo. flat rate per music school (saves 2,99 € / Mo.).
// - Service Fee: 0,49 € / Mo. per active admin/teacher profile (Admin & Secretary profiles are included free).
// - Student Activations: 0,49 € / Mo. per active student (with 10% annual discount or 20% September start discount).
// - Direct Parent Billing (Campus only): Full (0,49 €) or Partial (0,40 € parent / 0,09 € school).
// - Hardship / Sibling exemptions supported.
// - STRICTLY NO SEPA, payment credentials, contracts, or student email addresses stored.

export interface BillingCalculationInput {
  hasCampusModule: boolean;
  hasGroovelabModule: boolean;
  activeTeacherCount: number;
  activeStudentCount: number;
  campusStudentCount?: number;
  groovelabStudentCount?: number;
  passiveStudentCount?: number;
  billingDiscountType?: 'monthly' | 'annual_10' | 'schoolyear_start_20';
  exemptStudentCount?: number; // Hardship / Sibling exempt students
  directBillingMode?: 'none' | 'full' | 'partial';
  studentProfiles?: Array<{
    custom_student_price?: number | null;
    locked_student_price?: number | null;
    exempt_from_direct_billing?: boolean;
  }>;
  rates?: {
    priceCampus?: number;
    priceGroovelab?: number;
    priceKombi?: number;
    priceTeacher?: number;
    priceStudent?: number;
    pricePassiveStudent?: number;
  };
}

export interface BillingCalculationResult {
  baseServerFlatRate: number;
  bundleSavings: number;
  teacherServiceFeeTotal: number;
  studentActivationFeeTotal: number;
  campusStudentActivationFeeTotal: number;
  groovelabStudentActivationFeeTotal: number;
  passiveStudentFeeTotal: number;
  schoolContributionTotal: number;
  parentContributionTotal: number;
  totalMonthlySchoolInvoice: number;
}

export function calculateCampusGroovelabBilling(input: BillingCalculationInput): BillingCalculationResult {
  const {
    hasCampusModule,
    hasGroovelabModule,
    activeTeacherCount,
    activeStudentCount,
    campusStudentCount,
    groovelabStudentCount,
    billingDiscountType = 'monthly',
    exemptStudentCount = 0,
    directBillingMode = 'none',
    rates = {}
  } = input;

  const rateCampus = rates.priceCampus ?? 7.99;
  const rateGroovelab = rates.priceGroovelab ?? 4.99;
  const rateKombi = rates.priceKombi ?? 9.99;
  const rateTeacher = rates.priceTeacher ?? 0.49;
  const rateStudent = rates.priceStudent ?? 0.49;

  // 1. Base Server Flat Rate & Kombi-Vorteil Bundle Calculation
  let baseServerFlatRate = 0;
  let bundleSavings = 0;

  if (hasCampusModule && hasGroovelabModule) {
    baseServerFlatRate = rateKombi; // Combined Bundle Price
    bundleSavings = Math.max(0, (rateCampus + rateGroovelab) - rateKombi);
  } else if (hasCampusModule) {
    baseServerFlatRate = rateCampus;
  } else if (hasGroovelabModule) {
    baseServerFlatRate = rateGroovelab;
  }

  // 2. Teacher & Staff Service Fee (Admin & Secretary included 100% free)
  const teacherServiceFeeTotal = Math.max(0, activeTeacherCount) * rateTeacher;

  // 3. Passive Student Database Profile Fee (0,09 € / Mo. per passive profile)
  const ratePassiveStudent = rates.pricePassiveStudent ?? 0.09;
  const passiveStudentFeeTotal = Math.max(0, input.passiveStudentCount ?? 0) * ratePassiveStudent;

  // 4. Student Activation Fee Calculation with Discounts & Per-Profile Rate Locking / Custom Overrides
  let effectiveStudentRate = rateStudent;
  if (billingDiscountType === 'annual_10') {
    effectiveStudentRate = rateStudent * 0.90; // 10% Discount
  } else if (billingDiscountType === 'schoolyear_start_20') {
    effectiveStudentRate = rateStudent * 0.80; // 20% Discount
  }

  const effectiveCampusCount = campusStudentCount !== undefined ? campusStudentCount : activeStudentCount;
  const effectiveGroovelabCount = groovelabStudentCount !== undefined ? groovelabStudentCount : 0;

  let campusStudentActivationFeeTotal = 0;
  let groovelabStudentActivationFeeTotal = Math.max(0, effectiveGroovelabCount) * effectiveStudentRate;

  if (input.studentProfiles && input.studentProfiles.length > 0) {
    // Exact summation of individual student profiles
    campusStudentActivationFeeTotal = input.studentProfiles.reduce((sum, profile) => {
      if (profile.exempt_from_direct_billing) return sum;
      const price = profile.custom_student_price !== null && profile.custom_student_price !== undefined
        ? profile.custom_student_price
        : (profile.locked_student_price !== null && profile.locked_student_price !== undefined
          ? profile.locked_student_price
          : effectiveStudentRate);
      return sum + Math.max(0, price);
    }, 0);
  } else {
    const billableCampusCount = Math.max(0, effectiveCampusCount - exemptStudentCount);
    campusStudentActivationFeeTotal = billableCampusCount * effectiveStudentRate;
  }

  const studentActivationFeeTotal = campusStudentActivationFeeTotal + groovelabStudentActivationFeeTotal;
  const billableCampusCount = input.studentProfiles ? input.studentProfiles.filter(p => !p.exempt_from_direct_billing).length : Math.max(0, effectiveCampusCount - exemptStudentCount);

  // 5. Direct Billing vs. Sammelzahler Allocation
  // Note: GrooveLab activations are ALWAYS paid by the music school
  let schoolContributionTotal = 0;
  let parentContributionTotal = 0;

  if (directBillingMode === 'full' && hasCampusModule) {
    parentContributionTotal = billableCampusCount * rateStudent;
    schoolContributionTotal = (exemptStudentCount * rateStudent) + groovelabStudentActivationFeeTotal;
  } else if (directBillingMode === 'partial' && hasCampusModule) {
    const parentPortion = Number((rateStudent * 0.816).toFixed(2));
    const schoolPortion = Number((rateStudent - parentPortion).toFixed(2));
    parentContributionTotal = billableCampusCount * parentPortion;
    schoolContributionTotal = (billableCampusCount * schoolPortion) + (exemptStudentCount * rateStudent) + groovelabStudentActivationFeeTotal;
  } else {
    schoolContributionTotal = studentActivationFeeTotal + (exemptStudentCount * effectiveStudentRate);
  }

  // Total invoice amount billed to the music school
  const totalMonthlySchoolInvoice = baseServerFlatRate + teacherServiceFeeTotal + passiveStudentFeeTotal + schoolContributionTotal;

  return {
    baseServerFlatRate,
    bundleSavings,
    teacherServiceFeeTotal,
    studentActivationFeeTotal,
    campusStudentActivationFeeTotal,
    groovelabStudentActivationFeeTotal,
    passiveStudentFeeTotal,
    schoolContributionTotal,
    parentContributionTotal,
    totalMonthlySchoolInvoice: Number(totalMonthlySchoolInvoice.toFixed(2)),
  };
}

export interface SchoolRatesInput {
  custom_price_campus?: number | null;
  custom_price_groovelab?: number | null;
  custom_price_kombi?: number | null;
  custom_price_teacher?: number | null;
  custom_price_student?: number | null;
  custom_price_passive_student?: number | null;
  custom_free_months_per_year?: number | null;
  locked_contract_pricing?: {
    priceCampus?: number;
    priceGroovelab?: number;
    priceKombi?: number;
    priceTeacher?: number;
    priceStudent?: number;
    pricePassiveStudent?: number;
    freeMonthsPerYear?: number;
  } | null;
}

export function resolveEffectiveSchoolRates(
  school?: SchoolRatesInput | null,
  masterRates?: { priceCampus?: number; priceGroovelab?: number; priceKombi?: number; priceTeacher?: number; priceStudent?: number; pricePassiveStudent?: number; freeMonthsPerYear?: number }
) {
  const master = masterRates || {};
  const locked = school?.locked_contract_pricing || {};

  return {
    priceCampus: school?.custom_price_campus ?? locked.priceCampus ?? master.priceCampus ?? 7.99,
    priceGroovelab: school?.custom_price_groovelab ?? locked.priceGroovelab ?? master.priceGroovelab ?? 4.99,
    priceKombi: school?.custom_price_kombi ?? locked.priceKombi ?? master.priceKombi ?? 9.99,
    priceTeacher: school?.custom_price_teacher ?? locked.priceTeacher ?? master.priceTeacher ?? 0.49,
    priceStudent: school?.custom_price_student ?? locked.priceStudent ?? master.priceStudent ?? 0.49,
    pricePassiveStudent: school?.custom_price_passive_student ?? locked.pricePassiveStudent ?? master.pricePassiveStudent ?? 0.09,
    freeMonthsPerYear: school?.custom_free_months_per_year ?? locked.freeMonthsPerYear ?? master.freeMonthsPerYear ?? 0,
  };
}

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
  billingDiscountType?: 'monthly' | 'annual_10' | 'schoolyear_start_20';
  exemptStudentCount?: number; // Hardship / Sibling exempt students
  directBillingMode?: 'none' | 'full' | 'partial';
}

export interface BillingCalculationResult {
  baseServerFlatRate: number;
  bundleSavings: number;
  teacherServiceFeeTotal: number;
  studentActivationFeeTotal: number;
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
    billingDiscountType = 'monthly',
    exemptStudentCount = 0,
    directBillingMode = 'none',
  } = input;

  // 1. Base Server Flat Rate & Kombi-Vorteil Bundle Calculation
  let baseServerFlatRate = 0;
  let bundleSavings = 0;

  if (hasCampusModule && hasGroovelabModule) {
    baseServerFlatRate = 9.99; // Combined Bundle Price
    bundleSavings = 2.99; // (7.99 + 4.99 = 12.98 - 9.99 = 2.99)
  } else if (hasCampusModule) {
    baseServerFlatRate = 7.99;
  } else if (hasGroovelabModule) {
    baseServerFlatRate = 4.99;
  }

  // 2. Teacher & Staff Service Fee (Admin & Secretary included 100% free)
  const teacherServiceFeeTotal = Math.max(0, activeTeacherCount) * 0.49;

  // 3. Student Activation Fee Calculation with Discounts
  let effectiveStudentRate = 0.49;
  if (billingDiscountType === 'annual_10') {
    effectiveStudentRate = 0.49 * 0.90; // 10% Discount
  } else if (billingDiscountType === 'schoolyear_start_20') {
    effectiveStudentRate = 0.49 * 0.80; // 20% Discount
  }

  const billableStudentCount = Math.max(0, activeStudentCount - exemptStudentCount);
  const studentActivationFeeTotal = billableStudentCount * effectiveStudentRate;

  // 4. Direct Billing vs. Sammelzahler Allocation
  let schoolContributionTotal = 0;
  let parentContributionTotal = 0;

  if (directBillingMode === 'full' && hasCampusModule) {
    // Parents cover full 0,49 € / Mo. School pays 0,00 € for active direct students
    parentContributionTotal = billableStudentCount * 0.49;
    schoolContributionTotal = (exemptStudentCount * 0.49);
  } else if (directBillingMode === 'partial' && hasCampusModule) {
    // Parents cover 0,40 € / Mo., school covers 0,09 € / Mo. passive database fee
    parentContributionTotal = billableStudentCount * 0.40;
    schoolContributionTotal = (billableStudentCount * 0.09) + (exemptStudentCount * 0.49);
  } else {
    // Sammelzahler: School covers 100% of student activation costs
    schoolContributionTotal = studentActivationFeeTotal + (exemptStudentCount * effectiveStudentRate);
  }

  // Total invoice amount billed to the music school
  const totalMonthlySchoolInvoice = baseServerFlatRate + teacherServiceFeeTotal + schoolContributionTotal;

  return {
    baseServerFlatRate,
    bundleSavings,
    teacherServiceFeeTotal,
    studentActivationFeeTotal,
    schoolContributionTotal,
    parentContributionTotal,
    totalMonthlySchoolInvoice: Number(totalMonthlySchoolInvoice.toFixed(2)),
  };
}

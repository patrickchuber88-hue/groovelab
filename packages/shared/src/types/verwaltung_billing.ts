/**
 * Campus-Groovelab Administration & Billing Domain Models
 * Server Hosting Flatrate, Student Activations, Billing Models, Discounts
 */

export type BookedModule = 'campus' | 'groovelab' | 'kombi_bundle';

export type StudentBillingModel =
  | 'sammelzahler_monthly'
  | 'sammelzahler_annual'
  | 'sammelzahler_september'
  | 'direktabrechnung_full'
  | 'direktabrechnung_partial'
  | 'hardship_exemption';

export interface SchoolPricingConfig {
  bookedModule: BookedModule;
  baseHostingFeeMonthly: number; // 7.99 for Campus, 4.99 for GrooveLab, 9.99 for Kombi
  teacherAdminServiceFeeMonthly: number; // 0.49 per active teacher/admin
  studentActivationFeeMonthly: number; // 0.49 standard
}

export interface StudentBillingProfile {
  studentId: string;
  schoolId: string;
  isActivated: boolean;
  billingModel: StudentBillingModel;
  isHardshipExempt: boolean;
  isSiblingDiscount: boolean;
  activationDate?: string;
  lastLoginDate?: string;
  autoDeactivatedAt?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceEuro: number;
  totalPriceEuro: number;
}

export interface MonthlyInvoice {
  id: string;
  schoolId: string;
  billingMonth: string; // e.g. "2026-08"
  items: InvoiceItem[];
  subtotalEuro: number;
  vatAmountEuro: number;
  totalAmountEuro: number;
  pdfUrl?: string;
  isPaid: boolean;
  createdAt: string;
}

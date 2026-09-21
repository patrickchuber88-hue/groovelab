import { ChartOfAccounts, DatevBookingRecord } from '../../utils/datevExporter';
import { ParsedBankTransaction, BankStatementParseResult } from '../../utils/camtParser';
import { SepaDirectDebitBatchOptions, SepaDebtorTransaction } from '../../utils/sepaXmlGenerator';

export type FinanceSubTab = 'invoices' | 'datev' | 'banking' | 'prap' | 'dunning' | 'ledger';

export type DatevTaxMode = 'standard_vat' | 'small_business';

export type DunningFilter = 'all' | 'due' | 'warning1' | 'warning2';

export type DunningLevel = 1 | 2 | 3;

export interface Invoice {
  schoolId: string;
  schoolName: string;
  schoolStreet: string;
  schoolZipCode: string;
  schoolCity: string;
  billingEmail?: string;
  subscriptionType: 'standard' | 'solo';
  hasCampus: boolean;
  hasGroovelab: boolean;
  hasKombiDiscount: boolean;
  subscriptionBypass: boolean;
  activeCampusUsers: number;
  baseFee: number;
  userFee: number;
  kombiDiscountAmount: number;
  subtotal: number;
  total: number;
  status: 'trial' | 'active' | 'bypass' | 'suspended';

  // Specification Fields
  totalStudents: number;
  activeStudents: number;
  premiumStudents: number;
  totalTeachers: number;
  activeTeachers: number;
  b2bRevenue: number;
  b2cRevenue: number;
  userQuota: number;
  pendingUserQuota: number | null;
  studentBillingOption: string;
  isGrandfathered?: boolean;

  // Custom Breakdown Fields
  activeStudentFee: number;
  totalTeachersCount: number;
  totalEmployeesCount: number;
  passiveStudentsCount: number;
  teachersHostingFee: number;
  passiveStudentsHostingFee: number;
  activeCampusCount?: number;
  activeGroovelabCount?: number;
  storageAddonGb: number;
  storageUsedBytes: number;
  storageAddonMonthlyFee: number;
  leitwegId?: string;
  leitweg_id?: string;
  contractStartDate?: string | null;
  createdAt?: string | null;
}

export interface PlatformSummary {
  totalSchools: number;
  totalActiveCampusUsers: number;
  totalMonthlyRevenue: number;
  bypassedSchools: number;
  totalB2BRevenue: number;
  totalB2CRevenue: number;
  totalTeachers: number;
  totalStudents: number;
  totalUnpaid: number;
}

export interface OperatorSettings {
  operatorCompany: string;
  operatorContact: string;
  operatorStreet: string;
  operatorZip: string;
  operatorCity: string;
  operatorIban: string;
  operatorBic: string;
}

export const formatDateDisplay = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateString;
  }
};

export const getSchoolNumericId = (id?: string | null): number => {
  if (!id || typeof id !== 'string') return 1;
  if (id === '74713df2-6176-4a41-a8cd-9fbebe34e9b8') return 1;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 98) + 2;
};

export type {
  ChartOfAccounts,
  DatevBookingRecord,
  ParsedBankTransaction,
  BankStatementParseResult,
  SepaDirectDebitBatchOptions,
  SepaDebtorTransaction
};

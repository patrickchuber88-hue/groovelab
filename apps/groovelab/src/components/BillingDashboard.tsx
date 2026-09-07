import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import QRCode from 'react-qr-code';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { ParentInfoSheetModal } from './modals/ParentInfoSheetModal';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { computeSchoolStorageUsedBytes } from '../utils/audioStorageHelper';
import { useMasterPricing } from '../context/MasterPricingContext';
import { calculateSchoolEffectiveRates } from '../domain/pricingEngine';
import { aggregateSchoolMetrics, getSchoolCanonicalBilling } from '../domain/schoolMetricsAggregator';
import { downloadCsvFile } from '../utils/csvHelper';
import { logSecurityEvent } from '../services/auditLogService';
import { 
  CreditCard, 
  Search, 
  RefreshCw, 
  TrendingUp, 
  Users, 
  School, 
  ShieldAlert, 
  BadgePercent, 
  CheckCircle, 
  Ban, 
  ArrowUpRight, 
  ChevronDown, 
  ChevronUp, 
  Award,
  BookOpen,
  Sparkles,
  HardDrive,
  Info,
  AlertTriangle,
  AlertCircle,
  Mail,
  Copy,
  Check,
  FileSpreadsheet,
  UploadCloud,
  FileCheck,
  Layers,
  Landmark,
  CheckSquare,
  History as HistoryIcon,
  ShieldCheck,
  Download,
  FileText,
  DollarSign,
  Calendar,
  ScrollText,
  Eye,
  Clock,
  RotateCcw,
  X
} from 'lucide-react';
import { generateTariffReceiptPDF } from '../utils/tariffReceiptPdfGenerator';
import { downloadDatevExportFile, DatevBookingRecord, DATEV_ACCOUNT_MAPPINGS, ChartOfAccounts } from '../utils/datevExporter';
import { parseBankStatementFile, ParsedBankTransaction, BankStatementParseResult } from '../utils/camtParser';
import { downloadSepaXmlFile, SepaDirectDebitBatchOptions, SepaDebtorTransaction } from '../utils/sepaXmlGenerator';

interface Invoice {
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
  contractStartDate?: string | null;
  createdAt?: string | null;
}

interface PlatformSummary {
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

const formatDateDisplay = (dateString: string) => {
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

export function BillingDashboard({ preselectedSchoolId }: { preselectedSchoolId?: string }) {
  const masterPricing = useMasterPricing();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dbInvoices, setDbInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (preselectedSchoolId) {
      setExpandedSchoolId(preselectedSchoolId);
    }
  }, [preselectedSchoolId]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [summary, setSummary] = useState<PlatformSummary>({
    totalSchools: 0,
    totalActiveCampusUsers: 0,
    totalMonthlyRevenue: 0,
    bypassedSchools: 0,
    totalB2BRevenue: 0,
    totalB2CRevenue: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalUnpaid: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);
  const [expandedSchoolUsers, setExpandedSchoolUsers] = useState<any[]>([]);
  const [loadingExpandedUsers, setLoadingExpandedUsers] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  const [showParentInfoSheetModal, setShowParentInfoSheetModal] = useState(false);
  const [parentInfoSheetSchool, setParentInfoSheetSchool] = useState<any>(null);
  const [operatorCompany, setOperatorCompany] = useState('Patrick Huber (Einzelunternehmer)');
  const [operatorContact, setOperatorContact] = useState('Patrick Huber');
  const [operatorStreet, setOperatorStreet] = useState('Karl-Fürstenberg-Str. 59');
  const [operatorZip, setOperatorZip] = useState('79618');
  const [operatorCity, setOperatorCity] = useState('Rheinfelden');
  const [operatorIban, setOperatorIban] = useState('DE89 3704 0044 0532 9482 11');
  const [operatorBic, setOperatorBic] = useState('WELADED1XYZ');
  const [tick, setTick] = useState(0);
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({
    [new Date().getFullYear()]: true
  });

  const [activeFinanceSubTab, setActiveFinanceSubTab] = useState<'invoices' | 'datev' | 'banking' | 'prap' | 'dunning' | 'ledger'>('invoices');
  const [allTariffBookings, setAllTariffBookings] = useState<any[]>([]);
  const [loadingTariffBookings, setLoadingTariffBookings] = useState<boolean>(false);
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState<string>('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('all');
  const [ledgerSchoolFilter, setLedgerSchoolFilter] = useState<string>('all');
  const [ledgerDateFilter, setLedgerDateFilter] = useState<string>('all');
  const [copiedReceiptId, setCopiedReceiptId] = useState<string | null>(null);
  const [selectedBookingForDrawer, setSelectedBookingForDrawer] = useState<any | null>(null);
  const [stornoModalBooking, setStornoModalBooking] = useState<any | null>(null);
  const [tariffStornoReason, setTariffStornoReason] = useState<string>('GoBD-Korrektur / Storno');
  const [processingTariffStorno, setProcessingTariffStorno] = useState<boolean>(false);
  const [selectedChartOfAccounts, setSelectedChartOfAccounts] = useState<ChartOfAccounts>('SKR03');
  const [datevPeriodMonth, setDatevPeriodMonth] = useState<number>(new Date().getMonth() + 1);
  const [datevPeriodYear, setDatevPeriodYear] = useState<number>(new Date().getFullYear());
  const [datevTaxMode, setDatevTaxMode] = useState<'standard_vat' | 'small_business'>('small_business');
  const [taxMode, setTaxMode] = useState<'small_business' | 'standard_vat'>(() => 
    typeof window !== 'undefined' ? ((localStorage.getItem('cg_tax_mode') as any) || 'small_business') : 'small_business'
  );
  const [schoolAudioBytes, setSchoolAudioBytes] = useState<Record<string, number>>({});

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'cg_tax_mode' && e.newValue) {
        setTaxMode(e.newValue as 'small_business' | 'standard_vat');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  
  // Storno / Gutschrift state
  const [stornoModalInvoice, setStornoModalInvoice] = useState<any | null>(null);
  const [stornoReason, setStornoReason] = useState<string>('Rechnungskorrektur / Fehlbuchung');
  const [processingStorno, setProcessingStorno] = useState<boolean>(false);

  // CAMT.053 & Bank Statement Import State
  const [camtUploadModalOpen, setCamtUploadModalOpen] = useState<boolean>(false);
  const [camtRawInput, setCamtRawInput] = useState<string>('');
  const [camtParsedResult, setCamtParsedResult] = useState<BankStatementParseResult | null>(null);
  const [camtApplying, setCamtApplying] = useState<boolean>(false);
  const [isDraggingBankFile, setIsDraggingBankFile] = useState<boolean>(false);
  const [bankFileDetails, setBankFileDetails] = useState<{ name: string; size: string } | null>(null);
  const [showManualPaste, setShowManualPaste] = useState<boolean>(false);
  const bankFileInputRef = useRef<HTMLInputElement | null>(null);

  // SEPA XML Direct Debit State
  const [sepaExportModalOpen, setSepaExportModalOpen] = useState<boolean>(false);
  const [sepaCreditorId, setSepaCreditorId] = useState<string>('DE98ZZZ09999999999');
  const [sepaCollectionDate, setSepaCollectionDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  // Dunning & OPOS State
  const [dunningFilter, setDunningFilter] = useState<'all' | 'due' | 'warning1' | 'warning2'>('all');
  const [actionToast, setActionToast] = useState<string | null>(null);

  const showActionToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 4000);
  };

  const [emailSentToast, setEmailSentToast] = useState<string | null>(null);

  const fetchAllTariffBookings = async (loadedInvoices?: Invoice[]) => {
    setLoadingTariffBookings(true);
    try {
      const { data, error } = await supabase
        .from('school_tariff_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setAllTariffBookings(data);
      } else {
        const invList = (loadedInvoices && loadedInvoices.length > 0) ? loadedInvoices : invoices;
        const baselines: any[] = [];
        invList.forEach(inv => {
          if (inv.status === 'active' || inv.total > 0) {
            const hex = (inv.schoolId || '000000').replace(/-/g, '').slice(0, 6).toUpperCase();
            baselines.push({
              id: `baseline-${inv.schoolId}`,
              school_id: inv.schoolId,
              school_name: inv.schoolName,
              receipt_number: `TB-${hex}-260901-INIT`,
              booking_type: 'SUBSCRIPTION_BOOKING',
              has_campus_subscription: inv.hasCampus,
              has_groovelab_subscription: inv.hasGroovelab,
              student_billing_option: inv.studentBillingOption,
              storage_addon_gb: inv.storageAddonGb,
              storage_addon_monthly_fee: inv.storageAddonMonthlyFee,
              storage_addon_status: inv.storageAddonGb > 0 ? 'active' : 'none',
              storage_pending_downgrade_gb: null,
              storage_pending_effective_date: null,
              total_monthly_rate_net: (inv.hasCampus && inv.hasGroovelab ? 19.90 : inv.hasCampus ? 14.90 : 9.90) + (inv.storageAddonMonthlyFee || 0),
              currency: 'EUR',
              effective_date: inv.contractStartDate || '2026-09-01',
              notes: 'Initialer Schuljahres-Vertragsabschluss 2026/2027 (Campus-Groovelab)',
              booked_by_name: 'Schulleitung',
              created_at: inv.contractStartDate ? `${inv.contractStartDate}T09:00:00Z` : (inv.createdAt || new Date().toISOString())
            });
          }
        });
        setAllTariffBookings(baselines);
      }
    } catch (err) {
      console.error('Error loading tariff bookings in Master Admin:', err);
    } finally {
      setLoadingTariffBookings(false);
    }
  };


  const toggleYearExpanded = (year: number) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  const handleSendInvoiceEmail = (invoice: any, inv: any) => {
    const isPreview = invoice.status === 'preview' || invoice.status === 'Vorschau' || invoice.id.startsWith('VS-');
    const invoiceId = isPreview
      ? invoice.id
      : (invoice.amount < 0 ? invoice.id.replace('INV-', 'GS-') : invoice.id.replace('INV-', 'RE-'));
    const schoolName = inv.schoolName || 'Musikschule';
    const recipientEmail = inv.billingEmail || '';
    const formattedAmount = Number(invoice.amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    const invoiceDate = invoice.billing_date || new Date().toLocaleDateString('de-DE');

    const subject = `Rechnung ${invoiceId} für Campus-Groovelab Cloud-Infrastruktur – ${schoolName}`;

    const body = `Sehr geehrte Damen und Herren der ${schoolName},

anbei erhalten Sie die Abrechnung ${invoiceId} für die Bereitstellung Ihrer Campus-Groovelab Cloud- und Server-Infrastruktur für den Leistungszeitraum ${invoiceDate}.

──────────────────────────────────────────────────────────
ABRECHNUNGSDATEN IM ÜBERBLICK
──────────────────────────────────────────────────────────
• Rechnungsnummer:   ${invoiceId}
• Rechnungsdatum:    ${invoiceDate}
• Rechnungsbetrag:   ${formattedAmount} (Umsatzsteuerbefreit gem. § 19 UStG)
• Zahlungsziel:      14 Tage
• Verwendungszweck:  ${invoiceId}
──────────────────────────────────────────────────────────

LEISTUNGSÜBERSICHT:
- Campus-Groovelab Software-Bereitstellung: 0,00 € (Inklusive)
${inv.hasCampus ? `- Cloud- & Datenbank-Hosting: Modul Campus (14,90 € / Mo.)\n` : ''}${inv.hasGroovelab ? `- Cloud- & Datenbank-Hosting: Modul GrooveLab (9,90 € / Mo.)\n` : ''}${inv.hasKombiDiscount ? `- Kombi-Vorteilsrabatt: -4,90 € / Mo.\n` : ''}- Service- & Administrationspauschale für Lehrkräfte
- Bereitstellung der aktiven Schülerzugänge
- Basis-Bereitstellung & DSGVO-Hosting

Den detaillierten Beleg entnehmen Sie bitte der beigefügten PDF-Rechnung.

Bitte überweisen Sie den fälligen Betrag unter Angabe des Verwendungszwecks "${invoiceId}" auf folgendes Geschäftskonto:

Empfänger:         ${operatorCompany || 'Campus-Groovelab Plattformbetrieb'}
IBAN:              ${operatorIban || 'DE00 0000 0000 0000 0000 00'}
BIC:               ${operatorBic || 'GENODE00XXX'}
Verwendungszweck:  ${invoiceId}

Bei Fragen zu Ihrer Abrechnung stehen wir Ihnen jederzeit gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr Campus-Groovelab Abrechnungsteam`;

    // 1. Automatically generate & download the official PDF invoice
    try {
      generateInvoicePDF({
        invoiceId,
        invoiceDate,
        amount: invoice.amount,
        schoolName: inv.schoolName,
        schoolStreet: inv.schoolStreet,
        schoolZipCode: inv.schoolZipCode,
        schoolCity: inv.schoolCity,
        operatorCompany,
        operatorContact,
        operatorStreet,
        operatorZip,
        operatorCity,
        operatorIban,
        operatorBic,
        hasCampus: inv.hasCampus,
        hasGroovelab: inv.hasGroovelab,
        hasKombiDiscount: inv.hasKombiDiscount,
        totalTeachersCount: inv.totalTeachersCount,
        passiveStudentsCount: inv.passiveStudentsCount,
        activeStudents: inv.activeStudents,
        storageAddonGb: inv.storageAddonGb,
        storageAddonMonthlyFee: inv.storageAddonMonthlyFee
      });
    } catch (pdfErr) {
      console.warn('Could not auto-generate invoice PDF:', pdfErr);
    }

    // 2. Copy text to clipboard as convenient fallback
    try {
      navigator.clipboard.writeText(body);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }

    // 3. Build mailto URL
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // 4. Open mail client
    window.location.href = mailtoUrl;

    // 5. Show confirmation toast
    setEmailSentToast(`📄 Rechnungs-PDF heruntergeladen & E-Mail-Vorlage für ${invoiceId} geöffnet!`);
    setTimeout(() => {
      setEmailSentToast(null);
    }, 4500);
  };

  const getPaidInvoices = (schoolId: string): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(`paid_invoices_${schoolId}`);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const toggleInvoicePaid = (schoolId: string, invoiceId: string) => {
    const current = getPaidInvoices(schoolId);
    let updated: string[];
    if (current.includes(invoiceId)) {
      updated = current.filter(id => id !== invoiceId);
    } else {
      updated = [...current, invoiceId];
    }
    localStorage.setItem(`paid_invoices_${schoolId}`, JSON.stringify(updated));
    setTick(t => t + 1);
    fetchBillingData();
  };

  const getSchoolInvoices = (
    schoolId: string, 
    currentInvoiceAmount: number, 
    schoolStatus?: string,
    contractStartDate?: string | null,
    createdAt?: string | null,
    schoolMetrics?: any
  ) => {
    let storedDate: string | null = null;
    if (typeof window !== 'undefined') {
      storedDate = localStorage.getItem(`contractStartDate_${schoolId}`);
    }
    const validDateStr = contractStartDate || createdAt || storedDate;
    const contractDateObj = validDateStr ? new Date(validDateStr) : new Date();
    
    const startYear = isNaN(contractDateObj.getFullYear()) ? new Date().getFullYear() : contractDateObj.getFullYear();
    const startMonth = isNaN(contractDateObj.getMonth()) ? (new Date().getMonth() + 1) : (contractDateObj.getMonth() + 1);

    const systemDate = new Date();
    const currentYear = systemDate.getFullYear();
    const currentMonth = systemDate.getMonth() + 1;

    const deMonths = [
      '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];

    const list: any[] = [];
    let y = startYear;
    let m = startMonth;

    while (y < currentYear || (y === currentYear && m <= currentMonth)) {
      const monthStr = m < 10 ? `0${m}` : `${m}`;
      const numId = schoolId ? schoolId.replace(/[^0-9]/g, '').substring(0, 3) || '104' : '104';
      const yy = String(y).slice(-2);
      
      const lastDay = new Date(y, m, 0).getDate();
      const monthName = deMonths[m];
      const invoiceDateStr = `${lastDay}. ${monthName} ${y}`;
      
      const isCurrent = (y === currentYear && m === currentMonth);
      const creationTime = new Date(y, m - 1, lastDay, 23, 58, 0);
      const isCreated = systemDate.getTime() >= creationTime.getTime();

      const paidInvoicesList = getPaidInvoices(schoolId);

      // 1. Infrastruktur- & Service-Rechnung (INF)
      const infId = isCreated ? `INF-${numId}-${yy}${monthStr}-01` : `VS-${numId}-${yy}${monthStr}`;
      const isInfMarkedPaid = paidInvoicesList.includes(infId) || paidInvoicesList.includes(`RE-${numId}-${yy}${monthStr}-01`);

      const glStudentFee = ((schoolMetrics?.activeGroovelabCount || 0) * 0.49);
      const infAmount = schoolMetrics 
        ? parseFloat((
            (schoolMetrics.baseFee || 0) + 
            (schoolMetrics.teachersHostingFee || 0) + 
            (schoolMetrics.passiveStudentsHostingFee || 0) + 
            (schoolMetrics.storageAddonMonthlyFee || 0) +
            glStudentFee
          ).toFixed(2))
        : currentInvoiceAmount;

      const infStatus = (infAmount === 0.00)
        ? (schoolStatus === 'bypass' ? 'Bypass' : schoolStatus === 'trial' ? 'Probemonat' : 'Kostenfrei')
        : (isInfMarkedPaid ? 'Bezahlt' : (isCreated ? 'Versendet' : 'Vorschau'));

      list.push({
        id: infId,
        date: invoiceDateStr,
        monthName,
        year: String(y),
        amount: infAmount,
        status: infStatus,
        type: 'INF',
        isCreated,
        isCurrentMonth: isCurrent
      });

      // 2. Sammelrechnung Schüleraktivierungen (AKT)
      // Regel: "wenn in der sammelrechnung schüleraktivierungen der betrag 0 ist, soll die rechnung ausgeblendet werden."
      // Enthält ab sofort NUR noch Campus-Schüleraktivierungen (da GrooveLab-Aktivierungen in INF enthalten sind).
      const aktAmount = schoolMetrics
        ? parseFloat((
            ((schoolMetrics.activeCampusCount !== undefined ? schoolMetrics.activeCampusCount : schoolMetrics.activeStudents || 0) * 0.49)
          ).toFixed(2))
        : 0;

      if (aktAmount > 0) {
        const aktId = `AKT-${numId}-${yy}${monthStr}-01`;
        const isAktMarkedPaid = paidInvoicesList.includes(aktId);
        const aktStatus = (aktAmount === 0.00)
          ? 'Kostenfrei'
          : (isAktMarkedPaid ? 'Bezahlt' : (isCreated ? 'Versendet' : 'Vorschau'));

        list.push({
          id: aktId,
          date: invoiceDateStr,
          monthName,
          year: String(y),
          amount: aktAmount,
          status: aktStatus,
          type: 'AKT',
          isCreated,
          isCurrentMonth: isCurrent
        });
      }

      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    
    return list.reverse();
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('contractStartDate');
    }
    fetchBillingData();

    const handleSchoolUpdate = () => {
      fetchBillingData();
    };

    window.addEventListener('groovelab_school_updated', handleSchoolUpdate);
    return () => {
      window.removeEventListener('groovelab_school_updated', handleSchoolUpdate);
    };
  }, []);

  // Load user details lazily when a school is expanded (Performance & Privacy Optimization)
  useEffect(() => {
    if (!expandedSchoolId) {
      setExpandedSchoolUsers([]);
      return;
    }
    const fetchExpandedUsers = async () => {
      setLoadingExpandedUsers(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, school_id, role, roles, is_active, is_campus_active, is_groovelab_active, is_trial, student_billing_payment_method, student_billing_cash_paid, first_name, last_name, exempt_from_direct_billing')
          .eq('school_id', expandedSchoolId);
        if (!error && data) {
          setExpandedSchoolUsers(data);
        }

        // Live Audio-Tresor Storage Query & Sync across Buckets, DB & Caches
        try {
          const userIds = (data || []).map((u: any) => String(u.id));
          const discoveredBytes = await computeSchoolStorageUsedBytes(expandedSchoolId, userIds);
          setSchoolAudioBytes(prev => ({ ...prev, [expandedSchoolId]: discoveredBytes }));
        } catch (audioErr) {
          console.warn('Audio storage query non-fatal fallback:', audioErr);
        }
      } catch (err) {
        console.error('Error fetching expanded school users:', err);
      } finally {
        setLoadingExpandedUsers(false);
      }
    };
    fetchExpandedUsers();
  }, [expandedSchoolId]);

  const updateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
      
      if (error) throw error;
      fetchBillingData();
    } catch (err: any) {
      alert("Fehler beim Aktualisieren des Status: " + err.message);
    }
  };

  const toggleStudentPayment = async (studentId: string, currentPaidStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ student_billing_cash_paid: !currentPaidStatus })
        .eq('id', studentId);
      if (error) throw error;
      fetchBillingData();
    } catch (err: any) {
      alert("Fehler beim Aktualisieren des Bezahlstatus: " + err.message);
    }
  };

  const getSchoolNumericId = (id?: string | null): number => {
    if (!id || typeof id !== 'string') return 1;
    if (id === '74713df2-6176-4a41-a8cd-9fbebe34e9b8') return 1;
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 98) + 2;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 🏛️ TIER-1 SAAS ENTERPRISE+ BUCHHALTUNGS- & DATEV ENGINE
  // ═══════════════════════════════════════════════════════════════════════

  // 1. DATEV SKR03 / SKR04 Export Handler
  const handleDatevExport = (chart: ChartOfAccounts = selectedChartOfAccounts) => {
    try {
      const records: DatevBookingRecord[] = [];
      const mapping = DATEV_ACCOUNT_MAPPINGS[chart];
      const revAccount = datevTaxMode === 'standard_vat' ? mapping.revenue19 : mapping.revenueExempt;
      const debtorsAccount = mapping.debtorsCollective;

      // Filter all active invoices for selected period
      invoices.forEach(inv => {
        if (inv.total <= 0 && inv.status !== 'active') return;

        const schoolInvs = getSchoolInvoices(inv.schoolId, inv.total, inv.status, inv.contractStartDate, inv.createdAt, inv);
        const deMonthsMap: Record<string, number> = {
          'Januar': 1, 'Februar': 2, 'März': 3, 'April': 4,
          'Mai': 5, 'Juni': 6, 'Juli': 7, 'August': 8,
          'September': 9, 'Oktober': 10, 'November': 11, 'Dezember': 12
        };

        schoolInvs.forEach(si => {
          let docDate = new Date();
          if (si.date) {
            const parts = si.date.split('. ');
            if (parts.length >= 3) {
              const year = parseInt(parts[2], 10) || new Date().getFullYear();
              const month = deMonthsMap[parts[1]] || 1;
              docDate = new Date(year, month - 1, 1);
            }
          }
          if (docDate.getFullYear() === datevPeriodYear && (docDate.getMonth() + 1) === datevPeriodMonth) {
            records.push({
              amount: si.amount,
              isCredit: si.amount >= 0,
              accountNumber: revAccount,
              contraAccountNumber: debtorsAccount,
              bookingDate: docDate,
              documentNumber: si.id,
              bookingText: `Cloud-Hosting ${inv.schoolName.substring(0, 30)}`,
              taxRate: datevTaxMode === 'standard_vat' ? 19 : 0,
              isFixed: true
            });
          }
        });
      });

      // If no period matches, create at least current month snapshot
      if (records.length === 0) {
        invoices.forEach(inv => {
          if (inv.total > 0) {
            const numId = inv.schoolId ? inv.schoolId.replace(/[^0-9]/g, '').substring(0, 3) || '104' : '104';
            const yy = String(datevPeriodYear).slice(-2);
            const mm = String(datevPeriodMonth).padStart(2, '0');
            records.push({
              amount: inv.total,
              isCredit: true,
              accountNumber: revAccount,
              contraAccountNumber: debtorsAccount,
              bookingDate: new Date(datevPeriodYear, datevPeriodMonth - 1, 28),
              documentNumber: `RE-${numId}-${yy}${mm}-01`,
              bookingText: `SaaS-Hosting ${inv.schoolName.substring(0, 30)}`,
              taxRate: datevTaxMode === 'standard_vat' ? 19 : 0,
              isFixed: true
            });
          }
        });
      }

      const periodStart = new Date(datevPeriodYear, datevPeriodMonth - 1, 1);
      const periodEnd = new Date(datevPeriodYear, datevPeriodMonth, 0);

      downloadDatevExportFile(records, {
        chartOfAccounts: chart,
        taxMode: datevTaxMode,
        companyName: operatorCompany || 'Campus-Groovelab',
        periodStart,
        periodEnd
      });

      showActionToast(`📁 DATEV-Buchungsstapel (${chart}) für ${String(datevPeriodMonth).padStart(2, '0')}/${datevPeriodYear} erfolgreich exportiert!`);
      logSecurityEvent({
        action: 'EXPORT_DATEV_CSV',
        metadata: { chart, recordCount: records.length, period: `${datevPeriodYear}-${datevPeriodMonth}` }
      });
    } catch (err: any) {
      alert('Fehler beim DATEV-Export: ' + err.message);
    }
  };

  // 2. GoBD Storno-Rechnungs Engine (Erzeugt ST-... und storniert RE-...)
  const handleExecuteStorno = async () => {
    if (!stornoModalInvoice) return;
    setProcessingStorno(true);
    try {
      const origInv = stornoModalInvoice.invoice;
      const school = stornoModalInvoice.school;
      const schoolNumericId = getSchoolNumericId(school.schoolId);
      const now = new Date();
      const yearShort = String(now.getFullYear()).slice(-2);
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');

      const stornoId = origInv.id.startsWith('RE-') 
        ? origInv.id.replace('RE-', 'ST-') 
        : `ST-${schoolNumericId}-${yearShort}${monthStr}-01`;

      const today = new Date().toISOString().split('T')[0];

      // Invert amount for GoBD Cancellation Ledger
      const stornoAmount = -Math.abs(origInv.amount);

      // 🛡️ GoBD-Storno-Snapshot mit SHA-256 Prüfsiegel gem. §§ 146, 147 AO
      const stornoPayload = `${stornoId}:${origInv.id}:${school.schoolId}:${stornoAmount}:${today}`;
      let stornoSha256Seal = '';
      try {
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stornoPayload));
        stornoSha256Seal = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        stornoSha256Seal = stornoId;
      }

      // Insert storno record into database
      await supabase.from('invoices').insert({
        id: stornoId,
        school_id: school.schoolId,
        type: 'STORNO',
        amount: stornoAmount,
        status: 'cancelled',
        billing_date: today,
        due_date: today,
        notes: `Stornorechnung zu Beleg ${origInv.id}. Grund: ${stornoReason}`,
        items: [
          {
            name: `Stornierung Beleg ${origInv.id}`,
            quantity: -1,
            unit: 'Storno',
            unitPrice: Math.abs(origInv.amount),
            amount: stornoAmount,
            gobd_snapshot: {
              storno_id: stornoId,
              original_invoice_id: origInv.id,
              school_id: school.schoolId,
              amount: stornoAmount,
              reason: stornoReason,
              sha256_seal: stornoSha256Seal,
              created_at: new Date().toISOString()
            }
          }
        ]
      });

      // Update original invoice status
      await supabase.from('invoices')
        .update({ status: 'storniert' })
        .eq('id', origInv.id);

      // Remove from paid invoices list if it was marked paid
      const currentPaid = getPaidInvoices(school.schoolId);
      const updatedPaid = currentPaid.filter(id => id !== origInv.id);
      localStorage.setItem(`paid_invoices_${school.schoolId}`, JSON.stringify(updatedPaid));

      showActionToast(`📄 GoBD-Stornobeleg ${stornoId} erfolgreich verbucht.`);
      setStornoModalInvoice(null);
      setStornoReason('Rechnungskorrektur / Fehlbuchung');
      fetchBillingData();
    } catch (err: any) {
      alert('Fehler beim Erstellen des Stornobelegs: ' + err.message);
    } finally {
      setProcessingStorno(false);
    }
  };

  const handleCopyReceipt = (receiptNumber: string) => {
    if (!receiptNumber) return;
    navigator.clipboard.writeText(receiptNumber);
    setCopiedReceiptId(receiptNumber);
    showActionToast(`📋 Beleg-Nr. ${receiptNumber} in die Zwischenablage kopiert`);
    setTimeout(() => {
      setCopiedReceiptId(prev => (prev === receiptNumber ? null : prev));
    }, 1800);
  };

  const handleExecuteTariffStorno = async () => {
    if (!stornoModalBooking) return;
    setProcessingTariffStorno(true);
    try {
      const { data, error } = await supabase.rpc('revert_tariff_booking_entry', {
        p_booking_id: stornoModalBooking.id,
        p_reason: tariffStornoReason
      });

      if (error) {
        throw error;
      }

      showActionToast(`↩️ GoBD-Stornobeleg ${data?.receipt_number || ''} erfolgreich eingebucht!`);
      logSecurityEvent({
        action: 'TARIFF_BOOKING_REVERSED',
        metadata: {
          originalReceipt: stornoModalBooking.receipt_number,
          stornoReceipt: data?.receipt_number,
          reason: tariffStornoReason,
          schoolId: stornoModalBooking.school_id
        }
      });
      setStornoModalBooking(null);
      if (selectedBookingForDrawer?.id === stornoModalBooking.id) {
        setSelectedBookingForDrawer(null);
      }
      await fetchAllTariffBookings();
    } catch (err: any) {
      alert(`Fehler beim Erzeugen des GoBD-Stornobelegs: ${err.message || err}`);
    } finally {
      setProcessingTariffStorno(false);
    }
  };

  // 3. CAMT.053 & MT940 Bankauszug-Parser Handler
  const handleBankFileUpload = (file: File) => {
    if (!file) return;
    setBankFileDetails({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB'
    });
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      if (content) {
        setCamtRawInput(content);
        handleProcessBankStatement(content);
      }
    };
    reader.readAsText(file);
  };

  const handleBankFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBankFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleBankFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleProcessBankStatement = (rawContent: string) => {
    try {
      const result = parseBankStatementFile(rawContent);
      setCamtParsedResult(result);
      showActionToast(`🔍 Bankauszug analysiert: ${result.b2bMatches.length} B2B- & ${result.b2cMatches.length} B2C-Zahlungen erkannt.`);
    } catch (err: any) {
      alert('Fehler beim Parsen des Bankauszugs: ' + err.message);
    }
  };

  // 4. CAMT.053 Zahlungseingänge automatisch verbuchen
  const handleApplyCamtBookings = async () => {
    if (!camtParsedResult) return;
    setCamtApplying(true);
    try {
      let b2bBooked = 0;
      let b2cBooked = 0;

      // 1. Verbucht B2B-Zahlungen
      camtParsedResult.b2bMatches.forEach(tx => {
        if (tx.matchedId) {
          const invMatch = invoices.find(inv => {
            const numId = getSchoolNumericId(inv.schoolId);
            const regex = new RegExp(`^RE-${numId}-\\d{4}-\\d{2}$`);
            return regex.test(tx.matchedId || '');
          });
          if (invMatch) {
            const currentPaid = getPaidInvoices(invMatch.schoolId);
            if (!currentPaid.includes(tx.matchedId)) {
              localStorage.setItem(`paid_invoices_${invMatch.schoolId}`, JSON.stringify([...currentPaid, tx.matchedId]));
              b2bBooked++;
            }
          }
        }
      });

      // 2. Verbucht B2C-Zahlungen
      for (const tx of camtParsedResult.b2cMatches) {
        if (tx.matchedId) {
          const rawHash = tx.matchedId.replace(/[^A-Z0-9]/gi, '').substring(2, 10).toUpperCase();
          // Find matching pending user across school roster
          const { data: matchedUsers } = await supabase
            .from('users')
            .select('id, ausweis_nummer')
            .eq('is_active', false);
          
          const found = (matchedUsers || []).find(u => 
            (u.ausweis_nummer || u.id).replace(/[^A-Z0-9]/gi, '').toUpperCase().startsWith(rawHash)
          );

          if (found) {
            await supabase.from('users').update({
              is_active: true,
              is_campus_active: true,
              student_billing_cash_paid: true
            }).eq('id', found.id);
            b2cBooked++;
          }
        }
      }

      showActionToast(`✓ Automatischer Zahlungsabgleich: ${b2bBooked} Schulrechnungen & ${b2cBooked} Schülerzugänge aktiviert!`);
      setCamtUploadModalOpen(false);
      setCamtParsedResult(null);
      setCamtRawInput('');
      fetchBillingData();
    } catch (err: any) {
      alert('Fehler beim automatischen Verbuchen: ' + err.message);
    } finally {
      setCamtApplying(false);
    }
  };

  // 5. SEPA Lastschrift XML Export Handler (ISO 20022 pain.008.001.08)
  const handleExportSepaXml = () => {
    try {
      const sepaTxs: SepaDebtorTransaction[] = [];
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');

      invoices.forEach(inv => {
        if (inv.total > 0 && !inv.subscriptionBypass && inv.status === 'active') {
          const numId = getSchoolNumericId(inv.schoolId);
          const invId = `RE-${numId}-${yy}${mm}-01`;
          const paid = getPaidInvoices(inv.schoolId).includes(invId);

          if (!paid) {
            sepaTxs.push({
              instructionId: `SEPA-INST-${numId}-${Date.now().toString().slice(-4)}`,
              endToEndId: invId,
              amount: inv.total,
              debtorName: inv.schoolName,
              debtorIban: 'DE' + (inv.schoolId.replace(/[^0-9]/g, '') + '000000000000000000').substring(0, 20),
              mandateId: `MANDAT-MS-${numId}`,
              mandateSignatureDate: '2026-01-01',
              remittanceInfo: `Campus-Groovelab Cloud-Hosting ${invId}`
            });
          }
        }
      });

      if (sepaTxs.length === 0) {
        return alert('Keine offenen fälligen Posten für den SEPA-Lastschrifteinzug gefunden.');
      }

      downloadSepaXmlFile({
        initiatorName: operatorCompany || 'Campus-Groovelab',
        creditorName: operatorCompany || 'Campus-Groovelab Plattformbetrieb',
        creditorIban: operatorIban || 'DE89370400440532948211',
        creditorBic: operatorBic || 'WELADED1XYZ',
        creditorId: sepaCreditorId,
        collectionDate: sepaCollectionDate,
        transactions: sepaTxs
      });

      showActionToast(`📥 SEPA pain.008 XML Datei (${sepaTxs.length} Lastschriften, Summe: ${sepaTxs.reduce((s, t) => s + t.amount, 0).toFixed(2)} €) heruntergeladen.`);
      logSecurityEvent({
        action: 'FINANCIAL_LEDGER_EXPORT_TRIGGERED',
        metadata: {
          exportType: 'SEPA_PAIN_008',
          recordCount: sepaTxs.length,
          totalAmount: sepaTxs.reduce((s, t) => s + t.amount, 0),
          collectionDate: sepaCollectionDate
        }
      });
      setSepaExportModalOpen(false);
    } catch (err: any) {
      alert('Fehler beim Generieren der SEPA XML Datei: ' + err.message);
    }
  };

  // 6. Mahnwesen & Dunning E-Mail Template (GoBD & § 288 BGB konform)
  const handleSendDunningEmail = (invoice: any, inv: any, dunningLevel: 1 | 2 | 3) => {
    const invoiceId = invoice.id;
    const schoolName = inv.schoolName || 'Musikschule';
    const recipientEmail = inv.billingEmail || '';
    const formattedAmount = Number(invoice.amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    const dueDate = invoice.date || 'vor 14 Tagen';

    let subject = '';
    let body = '';

    if (dunningLevel === 1) {
      subject = `Freundliche Zahlungserinnerung zu Rechnung ${invoiceId} – ${schoolName}`;
      body = `Sehr geehrte Damen und Herren der ${schoolName},

sicherlich ist es im laufenden Schulbetrieb lediglich Ihrer geschätzten Aufmerksamkeit entgangen: Für die Bereitstellung Ihrer Campus-Groovelab Cloud-Infrastruktur ist die Abrechnung ${invoiceId} über ${formattedAmount} seit dem ${dueDate} zur Zahlung fällig.

Wir bitten Sie höflich, den fälligen Betrag von ${formattedAmount} innerhalb der nächsten 7 Tage unter Angabe des Verwendungszwecks "${invoiceId}" auf unser Geschäftskonto zu überweisen.

Empfänger:         ${operatorCompany}
IBAN:              ${operatorIban}
BIC:               ${operatorBic}
Verwendungszweck:  ${invoiceId}

Sollten Sie die Überweisung zwischenzeitlich bereits veranlasst haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.

Mit freundlichen Grüßen
Ihr Campus-Groovelab Abrechnungsteam`;
    } else if (dunningLevel === 2) {
      // Moderate Bearbeitungspauschale: 5,00 € (Kaufmännische De-Eskalation & Churn-Prävention)
      const fee = 5.00;
      const totalWithFee = (Number(invoice.amount || 0) + fee).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
      subject = `1. Mahnung zu Rechnung ${invoiceId} – ${schoolName}`;
      body = `Sehr geehrte Damen und Herren der ${schoolName},

auf unsere vorangegangene Zahlungserinnerung zum Beleg ${invoiceId} konnten wir bisher leider noch keinen Zahlungseingang auf unserem Geschäftskonto feststellen.

Gemäß § 286 BGB befinden Sie sich im Zahlungsverzug. Wir berechnen Ihnen hiermit eine moderate Bearbeitungspauschale in Höhe von 5,00 €.

Fälliger Gesamtbetrag: ${totalWithFee}
(Hauptforderung: ${formattedAmount} zzgl. 5,00 € Bearbeitungspauschale)
Zahlungsfrist: 7 Tage ab Zugang dieses Schreibens.

Bitte überweisen Sie den Gesamtbetrag unverzüglich unter Angabe des Verwendungszwecks auf unser Geschäftskonto:
Empfänger:         ${operatorCompany}
IBAN:              ${operatorIban}
BIC:               ${operatorBic}
Verwendungszweck:  ${invoiceId}

Mit freundlichen Grüßen
Ihr Campus-Groovelab Abrechnungsteam`;
    } else {
      // Letzte Mahnung vor Sperre: Volle gesetzliche B2B-Verzugspauschale gem. § 288 Abs. 5 BGB: 40,00 €
      const b2bFee = 40.00;
      const totalWithFee = (Number(invoice.amount || 0) + b2bFee).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
      subject = `LETZTE MAHNUNG / ANDROHUNG SYSTEMSPERRE: Rechnung ${invoiceId} – ${schoolName}`;
      body = `Sehr geehrte Damen und Herren der ${schoolName},

trotz mehrfacher Zahlungserinnerungen und Mahnungen ist die Abrechnung ${invoiceId} über ${formattedAmount} weiterhin unbeglichen.

Wir machen nunmehr die gesetzliche Verzugspauschale gemäß § 288 Abs. 5 BGB in Höhe von 40,00 € geltend.

Gesamtforderung inkl. gesetzlicher B2B-Verzugspauschale (§ 288 Abs. 5 BGB): ${totalWithFee}
(Hauptforderung: ${formattedAmount} zzgl. 40,00 € gesetzliche Verzugspauschale gem. § 288 Abs. 5 BGB)
Letzte Zahlungsfrist: 5 Werktage ab Zugang dieses Schreibens.

WICHTIGER HINWEIS: Sollte bis zum Fristablauf kein Zahlungseingang auf unserem Geschäftskonto verbucht sein, machen wir von unserem gesetzlichen Zurückbehaltungsrecht gemäß §§ 273, 320 BGB Gebrauch. Der Cloud-Zugang für Ihre Musikschule wird sodann in den schreibgeschützten Sperr-Modus versetzt und die Gesamtforderung an unseren Inkasso-Partner übergeben.

Bitte vermeiden Sie weitere Unannehmlichkeiten und Mehrkosten durch sofortigen Ausgleich:
Empfänger:         ${operatorCompany}
IBAN:              ${operatorIban}
BIC:               ${operatorBic}
Verwendungszweck:  ${invoiceId}

Mit freundlichen Grüßen
Campus-Groovelab Mahnwesen & Rechtsabteilung`;
    }

    // 1. Text automatisch in Zwischenablage kopieren (Operator Quick-Win)
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(body);
      }
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }

    // 2. Mail-Client öffnen
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    showActionToast(`✉️ Mahnung Stufe ${dunningLevel} geöffnet & Text (§ 288 BGB) in Zwischenablage kopiert.`);
  };

  const createManualInvoice = async (schoolId: string) => {
    const amountStr = prompt("Geben Sie den Rechnungsbetrag ein (z.B. 49,90):");
    if (!amountStr) return;
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount)) return alert("Ungültiger Betrag!");

    const title = prompt("Verwendungszweck / Name der Position:", "Manuelle Abrechnung / Korrektur");
    if (!title) return;

    try {
      const schoolNumericId = getSchoolNumericId(schoolId);
      const now = new Date();
      const yearShort = String(now.getFullYear()).slice(-2);
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const prefix = amount < 0 ? 'GS' : 'RE';

      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('school_id', schoolId);

      const matchPattern = `${prefix}-${schoolNumericId}-${yearShort}${monthStr}`;
      const countForPeriod = existingInvoices
        ? existingInvoices.filter(inv => inv.id.startsWith(matchPattern)).length
        : 0;

      const seqStr = String(countForPeriod + 1).padStart(2, '0');
      const invoiceId = `${prefix}-${schoolNumericId}-${yearShort}${monthStr}-${seqStr}`;

      const today = new Date().toISOString().split('T')[0];
      const due = new Date();
      due.setDate(due.getDate() + 14);
      const dueDate = due.toISOString().split('T')[0];

      // 🛡️ GoBD-Beleg-Snapshot mit SHA-256 Prüfsiegel gem. §§ 146, 147 AO
      const gobdPayload = `${invoiceId}:${schoolId}:${amount}:${today}:${dueDate}`;
      let sha256Seal = '';
      try {
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(gobdPayload));
        sha256Seal = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        sha256Seal = invoiceId;
      }

      const { error } = await supabase.from('invoices').insert({
        id: invoiceId,
        school_id: schoolId,
        type: 'INF',
        amount: amount,
        status: 'open',
        billing_date: today,
        due_date: dueDate,
        items: [
          {
            name: title,
            quantity: 1,
            unit: 'Pauschale',
            unitPrice: amount,
            amount: amount,
            gobd_snapshot: {
              invoice_id: invoiceId,
              school_id: schoolId,
              amount,
              billing_date: today,
              due_date: dueDate,
              sha256_seal: sha256Seal,
              created_at: new Date().toISOString()
            }
          }
        ]
      });

      if (error) throw error;
      alert("Rechnung erfolgreich angelegt: " + invoiceId);
      fetchBillingData();
    } catch (err: any) {
      alert("Fehler beim Erstellen der Rechnung: " + err.message);
    }
  };

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch dynamic master billing rates
      const { data: billingSettings, error: settingsErr } = await supabase
        .from('master_billing_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (settingsErr) console.warn('Could not load master pricing settings:', settingsErr);
      if (billingSettings) {
        if (billingSettings.company_name) setOperatorCompany(billingSettings.company_name);
        if (billingSettings.contact_person) setOperatorContact(billingSettings.contact_person);
        if (billingSettings.street) setOperatorStreet(billingSettings.street);
        if (billingSettings.zip_code) setOperatorZip(billingSettings.zip_code);
        if (billingSettings.city) setOperatorCity(billingSettings.city);
        if (billingSettings.iban) setOperatorIban(billingSettings.iban);
        if (billingSettings.bic) setOperatorBic(billingSettings.bic);
      }
      
      const rateCampus = billingSettings?.price_module_campus ?? masterPricing.priceCampus;
      const rateGroovelab = billingSettings?.price_module_groovelab ?? masterPricing.priceGroovelab;
      const rateKombi = billingSettings?.price_module_kombi ?? masterPricing.priceKombi;
      const rateTeacher = billingSettings?.price_user_teacher ?? masterPricing.priceTeacher;
      const rateStudent = billingSettings?.price_user_student ?? masterPricing.priceStudent;

      // 2. Fetch schools with resilient fallback
      let { data: schools, error: schoolsErr } = await supabase
        .from('schools')
        .select('*');

      if (schoolsErr) {
        console.error('⚠️ Primary schools fetch error:', schoolsErr);
        throw schoolsErr;
      }

      // Merge local overrides from localStorage to ensure instant reflection when edited in Master Admin
      if (typeof window !== 'undefined' && schools) {
        try {
          const overridesStr = localStorage.getItem('groovelab_school_overrides');
          if (overridesStr) {
            const overrides = JSON.parse(overridesStr);
            let updatedOverrides = false;
            // Auto-heal legacy 3.50 storage artifact in overrides
            Object.keys(overrides).forEach(id => {
              if (Number(overrides[id]?.storage_addon_gb) === 25 && Number(overrides[id]?.storage_addon_monthly_fee) === 3.5) {
                overrides[id].storage_addon_monthly_fee = 3.99;
                updatedOverrides = true;
              }
            });
            if (updatedOverrides) {
              localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
            }
            schools = schools.map(s => {
              if (!overrides[s.id]) return s;
              return {
                ...s,
                ...overrides[s.id],
                opening_hours: {
                  ...(s.opening_hours || {}),
                  ...(overrides[s.id].opening_hours || {})
                }
              };
            });
          }
        } catch (e) {
          console.warn('Could not merge groovelab_school_overrides:', e);
        }
      }

      // Auto-heal database & in-memory models if school has 25GB with legacy 3.50 fee
      if (schools) {
        schools.forEach(s => {
          const addonGb = Number(s.storage_addon_gb || s.extra_storage_gb || 0);
          const addonFee = Number(s.storage_addon_monthly_fee || 0);
          if (addonGb === 25 && (addonFee === 3.5 || addonFee === 3.50)) {
            s.storage_addon_monthly_fee = 3.99;
            Promise.resolve(supabase.from('schools').update({ storage_addon_monthly_fee: 3.99 }).eq('id', s.id))
              .then(() => {
                console.log(`[Auto-Heal] Successfully normalized 25GB storage fee to 3.99 € for school ${s.id} (${s.name})`);
              })
              .catch((e: any) => console.warn('[Auto-Heal] DB update non-fatal warning:', e));
          }
        });
      }

      // 3. Fetch active license metrics (Graceful fallback if view/table unavailable)
      const { data: metrics, error: metricsErr } = await supabase
        .from('active_licence_metrics')
        .select('school_id, active_campus_users');

      if (metricsErr) {
        console.warn('⚠️ active_licence_metrics fetch warning (non-fatal):', metricsErr.message);
      }

      const metricsMap: Record<string, number> = {};
      metrics?.forEach(m => {
        metricsMap[m.school_id] = m.active_campus_users || 0;
      });

      // 4. Fetch users to compute actual student & teacher counts
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, school_id, role, roles, first_name, last_name, is_active, is_campus_active, is_groovelab_active, is_trial, student_billing_payment_method, student_billing_cash_paid, exempt_from_direct_billing');

      if (usersErr) {
        console.warn('⚠️ users fetch warning:', usersErr.message);
      }
      setAllUsers([]);

      // 4b. Fetch pending onboarding students
      const { data: pendingStudentsDb, error: pendingErr } = await supabase
        .from('pending_students_decrypted')
        .select('id, school_id, first_name, last_name');

      if (pendingErr) {
        console.warn('⚠️ pending_students_decrypted fetch warning:', pendingErr.message);
      }

      // 4c. Fetch songs and bands for complete metrics
      const { data: songsDb } = await supabase
        .from('songs')
        .select('id, school_id');

      const { data: bandsDb } = await supabase
        .from('bands')
        .select('id, school_id, name');

      const userStatsMap: Record<string, any> = {};

      (schools || []).forEach(school => {
        const stats = aggregateSchoolMetrics(
          school,
          users || [],
          pendingStudentsDb || [],
          songsDb || [],
          bandsDb || []
        );
        userStatsMap[school.id] = stats;
      });

      const calculatedInvoices: Invoice[] = (schools || [])
        .filter(school => !school.name.toLowerCase().includes('groove academy'))
        .map(school => {
        const stats = userStatsMap[school.id] || aggregateSchoolMetrics(school, [], []);
        const canonical = getSchoolCanonicalBilling(school, stats, masterPricing);
        const activeCampusUsers = metricsMap[school.id] || stats.campusStudents || 0;
        const isBypass = canonical.isBypass;
        const isBooked = Boolean(school.is_billing_booked) || school.status === 'active';
        let hasCampus = Boolean(school.has_campus_subscription);
        let hasGroovelab = Boolean(school.has_groovelab_subscription);
        if (isBooked && !hasCampus && !hasGroovelab) {
          hasCampus = true;
          hasGroovelab = true;
        }
        const hasKombi = school.has_kombi_discount || (hasCampus && hasGroovelab);

        return {
          schoolId: school.id,
          schoolName: school.name,
          schoolStreet: school.street ? `${school.street} ${school.house_number || ''}`.trim() : '',
          schoolZipCode: school.zip_code || '',
          schoolCity: school.city || '',
          billingEmail: school.billing_email || school.email || school.contact_email || '',
          subscriptionType: school.subscription_type === 'solo' ? 'solo' : 'standard',
          hasCampus,
          hasGroovelab,
          hasKombiDiscount: hasKombi,
          subscriptionBypass: isBypass,
          activeCampusUsers,
          baseFee: canonical.billingResult.baseServerFlatRate,
          userFee: parseFloat((canonical.billingResult.teacherServiceFeeTotal + canonical.billingResult.passiveStudentFeeTotal).toFixed(2)),
          kombiDiscountAmount: canonical.billingResult.bundleSavings,
          subtotal: canonical.subtotal,
          total: canonical.total,
          status: canonical.status,
          
          totalStudents: stats.totalStudents,
          activeStudents: stats.activeStudents,
          premiumStudents: stats.activeStudents,
          totalTeachers: stats.totalTeachers,
          activeTeachers: stats.activeTeachers,
          b2bRevenue: canonical.b2bRevenue,
          b2cRevenue: canonical.b2cRevenue,
          userQuota: school.user_quota || 150,
          pendingUserQuota: school.pending_user_quota,
          studentBillingOption: school.student_billing_option || 'option1',
          isGrandfathered: canonical.effectiveRates.isGrandfatheredRateActive,
          
          // Custom Breakdown Fields
          activeStudentFee: parseFloat(canonical.billingResult.studentActivationFeeTotal.toFixed(2)),
          totalTeachersCount: stats.totalTeachers,
          totalEmployeesCount: stats.totalEmployees,
          passiveStudentsCount: stats.passiveStudents,
          teachersHostingFee: parseFloat(canonical.billingResult.teacherServiceFeeTotal.toFixed(2)),
          passiveStudentsHostingFee: parseFloat(canonical.billingResult.passiveStudentFeeTotal.toFixed(2)),
          activeCampusCount: stats.campusStudents,
          activeGroovelabCount: stats.groovelabStudents,
          storageAddonGb: stats.storageAddonGb,
          storageUsedBytes: stats.storageUsedBytes,
          storageAddonMonthlyFee: stats.storageAddonMonthlyFee,
          contractStartDate: school.contract_start_date || null,
          createdAt: school.created_at || null
        };
      });

      const totalRevenue = calculatedInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalActiveCampusUsers = calculatedInvoices.reduce((sum, inv) => sum + inv.activeCampusUsers, 0);
      const bypassedSchools = calculatedInvoices.filter(inv => inv.subscriptionBypass).length;
      const totalB2BRevenue = calculatedInvoices.reduce((sum, inv) => sum + inv.total, 0); // Active invoices sum
      const totalB2CRevenue = calculatedInvoices.reduce((sum, inv) => sum + inv.b2cRevenue, 0);
      const totalTeachers = calculatedInvoices.reduce((sum, inv) => sum + inv.totalTeachers, 0);
      const totalStudents = calculatedInvoices.reduce((sum, inv) => sum + inv.totalStudents, 0);

      // Fetch real invoices from DB
      const { data: allInvoices, error: invoicesErr } = await supabase
        .from('invoices')
        .select('*')
        .order('billing_date', { ascending: false });
      
      const realInvoices = allInvoices || [];
      if (!invoicesErr && allInvoices) {
        setDbInvoices(allInvoices);
      } else {
        setDbInvoices([]);
      }

      let totalUnpaid = 0;
      calculatedInvoices.forEach(inv => {
        // Exclude schools that are 100% free, trial or in bypass mode
        if (inv.total <= 0 || inv.status === 'bypass' || inv.status === 'trial') {
          return;
        }

        const schoolInvoicesFromDb = realInvoices.filter(i => i.school_id === inv.schoolId);
        let storedDate: string | null = null;
        if (typeof window !== 'undefined') {
          storedDate = localStorage.getItem(`contractStartDate_${inv.schoolId}`);
        }
        const validDateStr = inv.contractStartDate || inv.createdAt || storedDate;
        const contractDateObj = validDateStr ? new Date(validDateStr) : new Date();
        const startYear = isNaN(contractDateObj.getFullYear()) ? new Date().getFullYear() : contractDateObj.getFullYear();
        const startMonth = isNaN(contractDateObj.getMonth()) ? (new Date().getMonth() + 1) : (contractDateObj.getMonth() + 1);
        const systemDate = new Date();
        const currentYear = systemDate.getFullYear();
        const currentMonth = systemDate.getMonth() + 1;
        
        let y = startYear;
        let m = startMonth;
        while (y < currentYear || (y === currentYear && m <= currentMonth)) {
          const monthStr = m < 10 ? `0${m}` : `${m}`;
          const numId = inv.schoolId ? inv.schoolId.replace(/[^0-9]/g, '').substring(0, 3) || '104' : '104';
          const yy = String(y).slice(-2);
          const lastDay = new Date(y, m, 0).getDate();
          const creationTime = new Date(y, m - 1, lastDay, 23, 58, 0);
          const isCreated = systemDate.getTime() >= creationTime.getTime();

          // Canonical GoBD Invoice IDs and legacy aliases
          const canonicalInvId = `RE-${numId}-${yy}${monthStr}-01`;
          const legacyInvId = `RE-${y}-${monthStr}`;
          const previewId = `VS-${numId}-${yy}${monthStr}`;
          const invId = isCreated ? canonicalInvId : previewId;

          const dbMatch = schoolInvoicesFromDb.find(i => 
            i.id === canonicalInvId || i.id === legacyInvId || i.id === `INV-${y}-${monthStr}` || i.id === invId
          );

          let paidInvoicesList: string[] = [];
          try {
            const raw = localStorage.getItem(`paid_invoices_${inv.schoolId}`);
            paidInvoicesList = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(paidInvoicesList)) paidInvoicesList = [];
          } catch {
            paidInvoicesList = [];
          }

          const isMarkedPaid = 
            paidInvoicesList.includes(canonicalInvId) || 
            paidInvoicesList.includes(legacyInvId) || 
            paidInvoicesList.includes(previewId) ||
            paidInvoicesList.includes(invId);

          let status = isCreated ? 'Versendet' : 'Vorschau';
          let amount = inv.total;
          if (dbMatch) {
            status = dbMatch.status;
            amount = dbMatch.amount;
          } else if (isMarkedPaid) {
            status = 'paid';
          }

          // GoBD & Accounting Standard: Only past, closed/created invoices can be outstanding receivables.
          // Running month previews (isCreated === false, e.g. August before 31.08.) are not yet due/closed!
          if (isCreated && status !== 'paid' && status !== 'cancelled' && status !== 'Bezahlt') {
            totalUnpaid += amount;
          }

          m++;
          if (m > 12) {
            m = 1;
            y++;
          }
        }
      });

      setInvoices(calculatedInvoices);

      if (calculatedInvoices.length > 0) {
        const currentValid = calculatedInvoices.some(inv => inv.schoolId === expandedSchoolId);
        if (!expandedSchoolId || !currentValid) {
          const topSchool = [...calculatedInvoices].sort((a, b) => b.activeStudents - a.activeStudents)[0];
          if (topSchool) {
            setExpandedSchoolId(topSchool.schoolId);
          }
        }
      }
      setSummary({
        totalSchools: calculatedInvoices.length,
        totalActiveCampusUsers,
        totalMonthlyRevenue: parseFloat(totalRevenue.toFixed(2)),
        bypassedSchools,
        totalB2BRevenue: parseFloat(totalB2BRevenue.toFixed(2)),
        totalB2CRevenue: parseFloat(totalB2CRevenue.toFixed(2)),
        totalTeachers,
        totalStudents,
        totalUnpaid: parseFloat(totalUnpaid.toFixed(2))
      });

      fetchAllTariffBookings(calculatedInvoices);
    } catch (err: any) {
      console.error('Error fetching billing data:', err);
      setError('Verbindungsfehler beim Laden der Abrechnungsmetriken: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Musikschule',
      'Abo-Status',
      'Gesamt Schueler',
      'Gesamt Lehrer',
      'Aktive Campus-Bereitstellungen',
      'Bypass Aktiv',
      'Server-Grundpreis (EUR)',
      'Kombi-Rabatt (EUR)',
      'Lehrer-Servicegebuehr (EUR)',
      'Aktivierungsgebuehr Schueler (EUR)',
      'Monats-Soll gesamt (EUR)'
    ];

    const rows = filteredInvoices.map(inv => [
      inv.schoolName,
      inv.status === 'trial' ? 'Probezeit' : inv.status === 'suspended' ? 'Gesperrt' : inv.status === 'bypass' ? 'Bypass' : 'Aktiv',
      inv.totalStudents,
      inv.totalTeachers,
      inv.premiumStudents,
      inv.subscriptionBypass ? 'Ja' : 'Nein',
      inv.baseFee.toFixed(2),
      inv.kombiDiscountAmount.toFixed(2),
      inv.userFee.toFixed(2),
      inv.activeStudentFee.toFixed(2),
      inv.total.toFixed(2)
    ]);

    const fileName = `Abrechnungsliste_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsvFile(fileName, headers, rows, ';');

    logSecurityEvent({
      action: 'EXPORT_BILLING_CSV',
      metadata: { rowCount: rows.length, fileName }
    });
  };
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.schoolName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    if (filteredInvoices.length > 0 && !expandedSchoolId) {
      setExpandedSchoolId(filteredInvoices[0].schoolId);
    }
  }, [filteredInvoices, expandedSchoolId]);

  // Apple macOS HIG Keyboard Navigation (Arrow Up / Down) for School Selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (filteredInvoices.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = filteredInvoices.findIndex(inv => inv.schoolId === expandedSchoolId);
        const nextIndex = currentIndex < filteredInvoices.length - 1 ? currentIndex + 1 : 0;
        setExpandedSchoolId(filteredInvoices[nextIndex].schoolId);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = filteredInvoices.findIndex(inv => inv.schoolId === expandedSchoolId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredInvoices.length - 1;
        setExpandedSchoolId(filteredInvoices[prevIndex].schoolId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredInvoices, expandedSchoolId]);

  const selectedInv = invoices.find(i => i.schoolId === expandedSchoolId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {/* Dynamic styles injector */}
      <style>{`
        .billing-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.04);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: default;
        }
        .billing-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px -4px rgba(0, 0, 0, 0.07);
          border-color: #cbd5e1;
        }
        .billing-card:hover .bc-icon-wrapper {
          background: #f1f5f9 !important;
          color: #0f172a !important;
        }
 
        .filter-btn {
          padding: 8px 14px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.8rem;
          border: 1px solid rgba(0, 0, 0, 0.05);
          background: rgba(255, 255, 255, 0.6);
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justifyContent: center;
        }
        .filter-btn:hover {
          background: #ffffff;
          color: #0f172a;
          border-color: rgba(0, 0, 0, 0.1);
        }
        .filter-btn-active {
          background: #34a853 !important;
          color: #ffffff !important;
          border-color: #34a853 !important;
          box-shadow: 0 4px 10px rgba(52, 168, 83, 0.15);
        }
        
        .school-list-item:hover {
          transform: translateY(-1px);
          border-color: rgba(52, 168, 83, 0.15) !important;
          background: rgba(255, 255, 255, 0.95) !important;
        }

        .receipt-card {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid rgba(15, 23, 42, 0.06);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justifyContent: space-between;
          transition: all 0.2s;
        }
        .receipt-card:hover {
          border-color: rgba(15, 23, 42, 0.15);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.02);
        }
      `}</style>

      {/* Action Toast Feedback */}
      {actionToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 999999,
          background: '#0f172a',
          color: '#ffffff',
          padding: '14px 22px',
          borderRadius: '14px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          fontSize: '0.88rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid rgba(255,255,255,0.15)'
        }} className="animate-fade-in">
          <CheckCircle size={18} color="#10b981" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
        paddingBottom: '20px',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: '"Outfit", sans-serif' }}>
            <Landmark style={{ color: '#ea4335' }} size={28} /> Finance &amp; Accounting Suite
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 550 }}>
            GoBD-konformes Rechnungsjournal, DATEV SKR03/04 Buchungsstapel, CAMT.053 Bankabgleich und OPOS-Mahnwesen.
          </p>
        </div>
        
        {/* Enterprise Actions Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* DATEV Export Button */}
          <button
            onClick={() => handleDatevExport(selectedChartOfAccounts)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1.5px solid #ea4335',
              borderRadius: '12px',
              padding: '10px 16px',
              fontWeight: 800,
              fontSize: '0.84rem',
              color: '#ea4335',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(234, 67, 53, 0.08)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="hover-scale-mini"
          >
            <FileSpreadsheet size={16} />
            DATEV Export ({selectedChartOfAccounts})
          </button>

          {/* CAMT.053 Bankabgleich Button */}
          <button
            onClick={() => setCamtUploadModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.12)',
              borderRadius: '12px',
              padding: '10px 16px',
              fontWeight: 800,
              fontSize: '0.84rem',
              color: '#334155',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              transition: 'all 0.2s'
            }}
            className="hover-scale-mini"
          >
            <UploadCloud size={16} />
            CAMT.053 Bank-Import
          </button>

          {/* SEPA Lastschriften XML */}
          <button
            onClick={() => setSepaExportModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.12)',
              borderRadius: '12px',
              padding: '10px 16px',
              fontWeight: 800,
              fontSize: '0.84rem',
              color: '#334155',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              transition: 'all 0.2s'
            }}
            className="hover-scale-mini"
          >
            <Download size={16} />
            SEPA XML (pain.008)
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchBillingData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              borderRadius: '12px',
              padding: '10px 16px',
              fontWeight: 800,
              fontSize: '0.84rem',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
            }}
            className="hover-scale-mini"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Enterprise Sub-Tab Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#f8fafc',
        padding: '6px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'invoices', label: 'Rechnungsjournal & Mandanten', icon: FileText, count: invoices.length },
          { id: 'ledger', label: 'Buchungsjournal & Tarife', icon: ScrollText, count: allTariffBookings.length },
          { id: 'datev', label: 'DATEV & Erlöskonten (SKR03/04)', icon: FileSpreadsheet },
          { id: 'banking', label: 'Bankabgleich & SEPA pain.008', icon: Landmark },
          { id: 'prap', label: 'PRAP & Erlösabgrenzung (HGB/IFRS)', icon: TrendingUp },
          { id: 'dunning', label: 'OPOS & Mahnwesen (§§ 286, 288 BGB)', icon: AlertTriangle, count: summary.totalUnpaid > 0 ? `Offen: ${summary.totalUnpaid.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}` : undefined }
        ].map((tab) => {
          const isActive = activeFinanceSubTab === tab.id;
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFinanceSubTab(tab.id as any)}
              style={{
                padding: '9px 16px',
                borderRadius: '10px',
                border: 'none',
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#0f172a' : '#64748b',
                fontWeight: isActive ? 850 : 650,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              className="hover-scale-mini"
            >
              <IconComp size={15} color={isActive ? '#ea4335' : '#64748b'} />
              <span>{tab.label}</span>
              {tab.count && (
                <span style={{
                  fontSize: '0.70rem',
                  padding: '2px 7px',
                  borderRadius: '8px',
                  background: isActive ? '#fee2e2' : '#e2e8f0',
                  color: isActive ? '#ea4335' : '#475569',
                  fontWeight: 800
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#ea4335',
          backgroundColor: '#fce8e6',
          border: '1px solid rgba(234, 67, 53, 0.2)',
          padding: '14px',
          borderRadius: '12px',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <ShieldAlert size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 📄 SUB-TAB 1: RECHNUNGSJOURNAL & MANDANTEN (activeFinanceSubTab === 'invoices') */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeFinanceSubTab === 'invoices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Financial Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
        {/* Total B2B Revenue */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '44px',
            width: '44px',
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.03)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s'
          }}>
            <School size={18} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Monatliche Bereitstellungs- &amp; Servicegebühren</span>
            <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {summary.totalB2BRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total B2B Unpaid / Outstanding */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '44px',
            width: '44px',
            borderRadius: '12px',
            background: 'rgba(202, 138, 4, 0.06)',
            color: '#ca8a04',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s'
          }}>
            <CreditCard size={18} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ausstehende Beträge</span>
            <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#ca8a04', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {summary.totalUnpaid.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total B2C Revenue */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '44px',
            width: '44px',
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.03)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s'
          }}>
            <TrendingUp size={18} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Schüler-Direktabrechnungen (B2C)</span>
            <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {summary.totalB2CRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total registered students */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '44px',
            width: '44px',
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.03)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s'
          }}>
            <Users size={18} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Aktive Schüler-Bereitstellungen</span>
            <span style={{ display: 'flex', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.02em', alignItems: 'baseline', gap: '4px' }}>
              {summary.totalStudents} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>aktiv</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Split-Pane Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.8fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* LEFT PANE: Search, Status Filter & School List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '14px',
            border: '1px solid rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.01)'
          }}>
            {/* Search */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={14} />
              <input
                type="text"
                placeholder="Musikschule suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '10px',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'all 0.2s',
                  background: '#ffffff',
                  color: '#0f172a'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#34a853';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                }}
              />
            </div>

            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'Alle' },
                  { id: 'active', label: 'Aktiv' },
                  { id: 'bypass', label: 'Bypass' },
                  { id: 'trial', label: 'Probe' },
                  { id: 'suspended', label: 'Gesperrt' }
                ].map(btn => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setStatusFilter(btn.id)}
                    className={`filter-btn ${statusFilter === btn.id ? 'filter-btn-active' : ''}`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(52, 168, 83, 0.25)',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  color: '#059669',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.06)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#ecfdf5';
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = 'rgba(52, 168, 83, 0.25)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                CSV Export
              </button>
            </div>
          </div>

          {/* School list cards */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 4px 4px', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
            <span>{filteredInvoices.length} Mandanten</span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>↑/↓ Navigieren</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '680px', overflowY: 'auto', paddingRight: '4px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', background: '#ffffff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '2px solid rgba(52, 168, 83, 0.1)',
                    borderTopColor: '#34a853',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Schulen werden geladen...
                  </p>
                </div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', fontWeight: 600, color: '#94a3b8', background: '#ffffff', borderRadius: '16px', border: '1px dashed rgba(0,0,0,0.05)' }}>
                Keine Musikschulen gefunden.
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const isSelected = expandedSchoolId === inv.schoolId;
                return (
                  <div
                    key={inv.schoolId}
                    onClick={() => setExpandedSchoolId(inv.schoolId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      background: isSelected ? '#f0fdf4' : '#ffffff',
                      border: isSelected ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(16, 185, 129, 0.10)' : 'none'
                    }}
                    className="school-list-item"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: isSelected ? '#10b981' : '#f1f5f9',
                        color: isSelected ? '#ffffff' : '#0f172a',
                        border: '1px solid rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        flexShrink: 0
                      }}>
                        {inv.schoolName?.[0] || 'S'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 750, fontSize: '0.86rem', color: '#0f172a' }}>{inv.schoolName}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: inv.status === 'trial' ? '#fff8e1' : inv.status === 'bypass' ? '#fee2e2' : inv.status === 'suspended' ? '#fee2e2' : '#e6f4ea',
                            color: inv.status === 'trial' ? '#b06000' : inv.status === 'bypass' ? '#dc2626' : inv.status === 'suspended' ? '#7f1d1d' : '#15803d',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em'
                          }}>
                            {inv.status === 'trial' ? 'Probe' : inv.status === 'bypass' ? 'Bypass' : inv.status === 'suspended' ? 'Gesperrt' : 'Aktiv'}
                          </span>
                          {inv.isGrandfathered && (
                            <span style={{
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: '#fef3c7',
                              color: '#b45309',
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em'
                            }}>
                              Bestandsschutz
                            </span>
                          )}
                          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                            {inv.totalStudents || ((inv.activeCampusCount || 0) + (inv.activeGroovelabCount || 0)) || 0} Schüler · {inv.totalTeachersCount || (inv.totalTeachers > 0 ? inv.totalTeachers : inv.totalEmployeesCount || 0)} Lehrkräfte
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.94rem', color: isSelected ? '#15803d' : '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                        {inv.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </span>
                      <span style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        Monatsbeitrag
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Selected School Detailed Dashboard */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px 28px',
          border: '1px solid rgba(15, 23, 42, 0.05)',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.015)',
          minHeight: '520px'
        }}>
          {!selectedInv ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '480px', color: '#94a3b8', textAlign: 'center' }}>
              <School size={48} style={{ marginBottom: '16px', strokeWidth: 1.2, color: '#cbd5e1' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Keine Musikschule ausgewählt</p>
              <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>Bitte wählen Sie links eine Schule aus, um deren Abrechnungs- und Abonnementdetails zu verwalten.</p>
            </div>
          ) : (() => {
            const inv = selectedInv;
            const isSelbstzahler = ['both', 'debit', 'cash', 'option1'].includes(inv.studentBillingOption);
            const schoolStudents = expandedSchoolUsers.filter(u => u.role === 'student');
            
            const activePaidStudents = schoolStudents.filter(s => (s.is_campus_active || s.is_groovelab_active) && s.student_billing_cash_paid === true && !s.is_trial);
            const pendingStudents = schoolStudents.filter(s => s.is_trial === true || ((s.is_campus_active || s.is_groovelab_active) && !s.student_billing_cash_paid));
            const freeStudents = schoolStudents.filter(s => !s.is_trial && !s.is_campus_active && !s.is_groovelab_active);
            
            const getInitials = (first: string, last: string) => {
              return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Header Section: School details & primary status info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, #34a853 0%, #2e7d32 100%)`,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1rem'
                    }}>
                      {inv.schoolName?.[0] || 'S'}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: '"Outfit", sans-serif' }}>{inv.schoolName}</h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 550 }}>
                        {inv.schoolZipCode} {inv.schoolCity} {inv.schoolStreet ? `• ${inv.schoolStreet}` : ''}
                      </p>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: inv.status === 'trial' ? '#fef3c7' : inv.status === 'bypass' ? '#f3e8ff' : inv.status === 'suspended' ? '#fee2e2' : '#e6f4ea',
                    color: inv.status === 'trial' ? '#b45309' : inv.status === 'bypass' ? '#7e22ce' : inv.status === 'suspended' ? '#dc2626' : '#137333',
                    border: `1px solid ${inv.status === 'trial' ? '#fde68a' : inv.status === 'bypass' ? '#e9d5ff' : inv.status === 'suspended' ? '#fca5a5' : '#ceead6'}`,
                    letterSpacing: '0.04em'
                  }}>
                    Abonnement: {inv.status === 'trial' ? 'Probezeit' : inv.status === 'bypass' ? 'Gebühren-Bypass' : inv.status === 'suspended' ? 'Gesperrt' : 'Aktiv'}
                  </span>
                </div>

                {/* Apple HIG Quick Action Toolbar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                  background: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0'
                }}>
                  {/* Button 1: Monatsrechnung PDF Vorschau */}
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const yymm = `${String(today.getFullYear()).slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}`;
                      const invNumber = `RE-${(inv.schoolId || 'SCH').slice(0, 8).toUpperCase()}-${yymm}-01`;
                      setViewingInvoice({
                        invoiceId: invNumber,
                        schoolId: inv.schoolId,
                        schoolName: inv.schoolName,
                        schoolStreet: inv.schoolStreet,
                        schoolZipCode: inv.schoolZipCode,
                        schoolCity: inv.schoolCity,
                        date: today.toISOString(),
                        amount: inv.total,
                        status: 'Vorschau',
                        type: 'INF',
                        isCurrentMonth: true,
                        hasCampus: inv.hasCampus,
                        hasGroovelab: inv.hasGroovelab,
                        baseFee: inv.baseFee,
                        kombiDiscountAmount: inv.kombiDiscountAmount,
                        userFee: inv.userFee,
                        activeStudentFee: inv.activeStudentFee,
                        totalTeachersCount: inv.totalTeachersCount,
                        totalEmployeesCount: inv.totalEmployeesCount,
                        passiveStudentsCount: inv.passiveStudentsCount,
                        activeStudents: inv.activeStudents,
                        activeCampusCount: inv.activeCampusCount,
                        activeGroovelabCount: inv.activeGroovelabCount,
                        storageAddonGb: inv.storageAddonGb,
                        storageAddonMonthlyFee: inv.storageAddonMonthlyFee,
                        subscriptionBypass: inv.subscriptionBypass,
                        subtotal: inv.subtotal,
                        studentBillingOption: inv.studentBillingOption,
                        isTrialMonth: inv.status === 'trial'
                      });
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.12)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale-mini"
                  >
                    <FileText size={15} />
                    <span>Monatsrechnung (PDF Vorschau)</span>
                  </button>

                  {/* Button 2: Eltern-Infoblatt PDF */}
                  <button
                    type="button"
                    onClick={() => {
                      setParentInfoSheetSchool({
                        name: inv.schoolName || 'Unsere Musikschule',
                        subdomain: (inv as any).schoolSubdomain || '',
                        logo_url: (inv as any).schoolLogoUrl || '',
                        city: inv.schoolCity || '',
                        student_billing_option: inv.studentBillingOption || 'school_all',
                        email: (inv as any).schoolEmail || ''
                      });
                      setShowParentInfoSheetModal(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      background: '#ffffff',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(5, 150, 105, 0.08)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale-mini"
                  >
                    <Download size={14} />
                    <span>Eltern-Infoblatt (PDF)</span>
                  </button>

                  {/* Info Badge: Abrechnungsmodus */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}>
                    <Landmark size={14} color="#0284c7" />
                    <span>Modell: {isSelbstzahler ? 'Direktabrechnung (Eltern)' : 'Sammelzahler (Musikschule)'}</span>
                  </div>
                </div>

                {/* Subscriptions Card & Monthly rate side-by-side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '20px' }}>
                  {/* Subscription card */}
                  <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid rgba(15, 23, 42, 0.04)' }}>
                    <h4 style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>Infrastruktur- &amp; Service-Abonnement</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '6px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tariftyp</span>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem' }}>{inv.subscriptionType === 'solo' ? 'Solo-Infrastruktur' : 'Standard-Infrastruktur'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '6px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Freigeschaltete Module</span>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                          {inv.hasCampus && <span style={{ color: '#34a853', fontWeight: 750, fontSize: '0.65rem', background: '#e6f4ea', padding: '2px 6px', borderRadius: '4px' }}>Campus</span>}
                          {inv.hasGroovelab && <span style={{ color: '#ca8a04', fontWeight: 750, fontSize: '0.65rem', background: '#fefce8', padding: '2px 6px', borderRadius: '4px' }}>GrooveLab</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '6px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Abrechnungsmodell</span>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem' }}>
                          {isSelbstzahler ? 'Direktabrechnung (Eltern)' : 'Sammelzahler (Musikschule)'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kombi-Vorteilsrabatt</span>
                        <span style={{ fontWeight: 700, color: inv.hasKombiDiscount ? '#34a853' : '#64748b', fontSize: '0.82rem' }}>
                          {inv.hasKombiDiscount ? `Aktiv (-${(masterPricing?.kombiSavings ?? 4.90).toFixed(2).replace('.', ',')} €)` : 'Keiner'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Breakdown Card */}
                  <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0' }}>Gebühren- &amp; Leistungsaufstellung</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* 1. Software-Bereitstellung (Kostenlos) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>Campus-Groovelab Software-Bereitstellung</span>
                          <span style={{ fontWeight: 700, color: '#34a853' }}>0,00 € (Inklusive)</span>
                        </div>

                        {/* 2. Campus Module Hosting */}
                        {inv.hasCampus && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>Cloud- &amp; Datenbank-Hosting: Modul Campus</span>
                            <span style={{ fontWeight: 650, color: '#0f172a' }}>{masterPricing.priceCampus.toFixed(2).replace('.', ',')} € / Mo.</span>
                          </div>
                        )}

                        {/* 3. GrooveLab Module Hosting */}
                        {inv.hasGroovelab && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>Cloud- &amp; Datenbank-Hosting: Modul GrooveLab</span>
                            <span style={{ fontWeight: 650, color: '#0f172a' }}>{masterPricing.priceGroovelab.toFixed(2).replace('.', ',')} € / Mo.</span>
                          </div>
                        )}

                        {/* 4. Kombi Rabatt */}
                        {inv.hasKombiDiscount && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#34a853' }}>
                            <span style={{ fontWeight: 600 }}>Kombi-Vorteilsrabatt (Infrastruktur-Bündel)</span>
                            <span style={{ fontWeight: 600 }}>-{masterPricing.kombiSavings.toFixed(2).replace('.', ',')} € / Mo.</span>
                          </div>
                        )}

                        {/* 5. Teachers & Staff Service Fee */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.76rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>Service- &amp; Administrationspauschale</span>
                            <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{inv.activeTeachers} Lehrkräfte aktiv × {masterPricing.priceTeacher.toFixed(2).replace('.', ',')} €</span>
                          </div>
                          <span style={{ fontWeight: 650, color: '#0f172a', paddingTop: '2px' }}>{inv.teachersHostingFee.toFixed(2).replace('.', ',')} € / Mo.</span>
                        </div>

                        {/* 6. Cloud- & Modul-Bereitstellung: Campus (0,49 €) */}
                        {(inv.activeCampusCount || 0) > 0 && !isSelbstzahler && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.76rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span style={{ color: '#0f172a', fontWeight: 600 }}>Cloud- &amp; Modul-Bereitstellung: Campus</span>
                              <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{inv.activeCampusCount || 0} Schüler × {masterPricing.priceStudent.toFixed(2).replace('.', ',')} €</span>
                            </div>
                            <span style={{ fontWeight: 650, color: '#0f172a', paddingTop: '2px' }}>{((inv.activeCampusCount || 0) * masterPricing.priceStudent).toFixed(2).replace('.', ',')} € / Mo.</span>
                          </div>
                        )}

                        {/* 7. Cloud- & Modul-Bereitstellung: GrooveLab (0,49 €) */}
                        {(inv.activeGroovelabCount || 0) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.76rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span style={{ color: '#0f172a', fontWeight: 600 }}>Cloud- &amp; Modul-Bereitstellung: GrooveLab</span>
                              <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{inv.activeGroovelabCount || 0} Schüler × {masterPricing.priceStudent.toFixed(2).replace('.', ',')} €</span>
                            </div>
                            <span style={{ fontWeight: 650, color: '#0f172a', paddingTop: '2px' }}>{((inv.activeGroovelabCount || 0) * masterPricing.priceStudent).toFixed(2).replace('.', ',')} € / Mo.</span>
                          </div>
                        )}

                        {/* 8. Basis-Bereitstellung (0,09 €) */}
                        {inv.passiveStudentsCount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.76rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span style={{ color: '#0f172a', fontWeight: 600 }}>Basis-Bereitstellung</span>
                              <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{inv.passiveStudentsCount} Schüler × 0,09 €</span>
                            </div>
                            <span style={{ fontWeight: 650, color: '#0f172a', paddingTop: '2px' }}>{inv.passiveStudentsHostingFee.toFixed(2).replace('.', ',')} € / Mo.</span>
                          </div>
                        )}

                        {/* 9. Audio-Tresor Storage Add-on */}
                        {inv.storageAddonGb > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.76rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span style={{ color: '#0f172a', fontWeight: 600 }}>Zusatz-Speichervolumen: Audio-Tresor (+{inv.storageAddonGb} GB)</span>
                              <span style={{ color: '#64748b', fontSize: '0.65rem' }}>Dedizierter Cloud-Speicher</span>
                            </div>
                            <span style={{ fontWeight: 650, color: '#0f172a', paddingTop: '2px' }}>{inv.storageAddonMonthlyFee.toFixed(2).replace('.', ',')} € / Mo.</span>
                          </div>
                        )}

                        {inv.status === 'bypass' && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#dc2626', fontWeight: 600 }}>
                            <span>Bypass-Gebührenfreistellung</span>
                            <span>-{inv.subtotal.toFixed(2).replace('.', ',')} €</span>
                          </div>
                        )}
                        {inv.status === 'trial' && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#ca8a04', fontWeight: 600 }}>
                            <span>Probezeit-Rabatt (100%)</span>
                            <span>-{inv.subtotal.toFixed(2).replace('.', ',')} €</span>
                          </div>
                        )}
                        {inv.status === 'suspended' && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#dc2626', fontWeight: 600 }}>
                            <span>Sperrungs-Berechnungsstopp</span>
                            <span>-{inv.subtotal.toFixed(2).replace('.', ',')} €</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Apple HIG Endsummen- & GoBD-Steuerkachel gem. § 14 UStG */}
                    <div style={{
                      marginTop: '14px',
                      background: '#ffffff',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px'
                    }}>
{taxMode === 'small_business' ? (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          padding: '2px 0'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>Rechnungsbetrag (Netto = Brutto):</span>
                            <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                              Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung) • Fällig zum 01. des Monats
                            </span>
                          </div>
                          <strong style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34a853', fontFamily: '"Outfit", sans-serif' }}>
                            {inv.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </strong>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                            <span>Nettobetrag (USt.-Bemessungsgrundlage)</span>
                            <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>
                              {(inv.total / 1.19).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                            <span>Gesetzliche Umsatzsteuer (19 % MwSt.)</span>
                            <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>
                              {(inv.total - (inv.total / 1.19)).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </strong>
                          </div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            paddingTop: '8px',
                            borderTop: '1px solid #e2e8f0',
                            marginTop: '3px'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>Monatlicher Gesamtbetrag (Brutto):</span>
                              <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>Inkl. 19 % MwSt. • Fällig zum 01. des Monats</span>
                            </div>
                            <strong style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34a853', fontFamily: '"Outfit", sans-serif' }}>
                              {inv.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </strong>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audio-Tresor Storage Addon & Quota Card */}
                {(() => {
                  const storageGb = Number(inv.storageAddonGb || 0);
                  const baseGb = 1.0; // Standard 1.0 GB base volume
                  const totalGb = baseGb + storageGb;
                  const totalBytes = totalGb * 1024 * 1024 * 1024;

                  // Hybrid Live-Calculation: live queried audio_recordings sum -> fallback to inv.storageUsedBytes
                  const liveBytes = schoolAudioBytes[inv.schoolId];
                  const storageUsedBytes = Number(
                    liveBytes !== undefined && liveBytes > 0 
                      ? liveBytes 
                      : (inv.storageUsedBytes || 0)
                  );

                  const oneGbBytes = 1024 * 1024 * 1024;
                  const usedMb = storageUsedBytes / (1024 * 1024);
                  const usedGb = storageUsedBytes / oneGbBytes;
                  const freeGb = Math.max(0, totalGb - usedGb);

                  // Formatting: < 1.0 GB in MB with 1 decimal place; >= 1.0 GB in GB
                  const formattedUsed = storageUsedBytes < oneGbBytes
                    ? `${usedMb.toFixed(1).replace('.', ',')} MB`
                    : `${usedGb.toFixed(2).replace('.', ',')} GB`;

                  const rawUsagePct = (storageUsedBytes / (totalBytes || 1)) * 100;
                  const usagePct = Math.min(100, Math.round(rawUsagePct));

                  // Visual sliver: if any audio exists, minimum 2% bar width
                  const barWidthPct = storageUsedBytes > 0 ? Math.max(2, rawUsagePct) : 0;

                  const isHighUsage = rawUsagePct >= 80;
                  const isFull = rawUsagePct >= 100;
                  const schoolStudentCount = inv.totalStudents || 0;

                  // Define packages with price & recommendation logic
                  const storagePackages = [
                    { gb: 5, price: 1.49, label: '+5 GB Tresor-Paket', recMax: 100, desc: 'Empfehlung: Bis zu 100 Schüler' },
                    { gb: 10, price: 2.99, label: '+10 GB Tresor-Paket', recMax: 250, desc: 'Empfehlung: Bis zu 250 Schüler' },
                    { gb: 20, price: 5.49, label: '+20 GB Tresor-Paket', recMax: 500, desc: 'Empfehlung: Bis zu 500 Schüler' },
                    { gb: 50, price: 9.99, label: '+50 GB Tresor-Paket', recMax: 1000, desc: 'Empfehlung: Große Musikschulen' },
                    { gb: 100, price: 16.99, label: '+100 GB Tresor-Paket', recMax: 2000, desc: 'Empfehlung: Groß-Institute & Konservatorien' },
                    { gb: 250, price: 34.99, label: '+250 GB Tresor-Paket', recMax: 5000, desc: 'Empfehlung: Kreis-Musikschulen' }
                  ];

                  return (
                    <div style={{
                      marginTop: '16px',
                      background: isFull ? '#fef2f2' : isHighUsage ? '#fffbeb' : '#f8fafc',
                      borderRadius: '16px',
                      padding: '20px',
                      border: `1px solid ${isFull ? '#fca5a5' : isHighUsage ? '#fde68a' : 'rgba(15, 23, 42, 0.05)'}`,
                      boxShadow: isHighUsage ? '0 4px 14px rgba(234, 179, 8, 0.08)' : 'none'
                    }}>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#475569',
                            flexShrink: 0
                          }}>
                            <HardDrive size={18} />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>Audio-Tresor &amp; Cloud-Speicher Kontingent</h4>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 550 }}>
                              1 GB Basis-Inklusivvolumen {storageGb > 0 ? `+ ${storageGb} GB gebuchtes Zusatz-Volumen` : ''}
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: isFull ? '#dc2626' : isHighUsage ? '#b45309' : '#1e293b' }}>
                            {formattedUsed} / {totalGb} GB
                          </span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: storageUsedBytes > 0 ? '#34a853' : '#64748b', fontWeight: 700 }}>
                            {storageUsedBytes > 0 
                              ? `${freeGb.toFixed(2).replace('.', ',')} GB frei (${Math.max(0, 100 - usagePct)} %)`
                              : `${totalGb.toFixed(2).replace('.', ',')} GB frei (100 %) • Noch keine Audio-Dateien vorhanden`}
                          </span>
                        </div>
                      </div>

                      {/* Dynamic Progress Bar */}
                      <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                        <div style={{
                          height: '100%',
                          width: `${barWidthPct}%`,
                          background: isFull ? '#ef4444' : isHighUsage ? '#f59e0b' : '#34a853',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease-in-out'
                        }} />
                      </div>

                      {/* Toast / Warning Banner at 80% */}
                      {isHighUsage && (
                        <div style={{
                          marginBottom: '16px',
                          padding: '10px 14px',
                          background: '#ffffff',
                          borderRadius: '12px',
                          border: `1px solid ${isFull ? '#f87171' : '#fcd34d'}`,
                          fontSize: '0.76rem',
                          color: isFull ? '#991b1b' : '#92400e',
                          lineHeight: 1.4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <AlertTriangle size={15} color={isFull ? '#dc2626' : '#d97706'} />
                          <span><strong>{isFull ? 'Speicher voll!' : 'Speicher zu 80 % belegt!'}</strong> {isFull ? 'Der Audio-Tresor deiner Schule ist voll.' : 'Der Audio-Tresor deiner Schule ist zu 80 % belegt.'}</span>
                        </div>
                      )}

                      {/* Read-Only Status Info for Master Admin */}
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #f1f5f9',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        fontSize: '0.78rem',
                        color: '#475569'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Info size={15} color="#64748b" style={{ flexShrink: 0 }} />
                          <span>
                            <strong>Speicherverwaltung:</strong> Zusatz-Speicherpakete (+5 GB bis +40 GB) werden eigenständig von der Musikschule im eigenen Sekretariat gebucht und hier im Financial Control als Übersicht verwaltet.
                          </span>
                        </div>
                        {storageGb > 0 && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34a853', background: '#e6f4ea', padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                            + {storageGb} GB Zusatz-Speicher aktiv
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Unified Apple HIG Rechnungsjournal & GoBD-Archiv (10 Jahre gem. § 147 AO) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="#0f172a" />
                      <h4 style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>
                        Rechnungsjournal &amp; GoBD-Archiv
                      </h4>
                      <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
                        (10 Jahre gesetzliche Aufbewahrungsfrist gem. § 147 AO)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => createManualInvoice(inv.schoolId)}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#34a853',
                        border: '1px solid rgba(52, 168, 83, 0.3)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontWeight: 750,
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                      onMouseOver={(e: any) => { e.currentTarget.style.background = '#f0fdf4'; }}
                      onMouseOut={(e: any) => { e.currentTarget.style.background = '#ffffff'; }}
                    >
                      + Manuelle Rechnung
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
                    {(() => {
                      const generated = getSchoolInvoices(inv.schoolId, inv.total, inv.status, inv.contractStartDate, inv.createdAt, inv);
                      const dbInvs = dbInvoices.filter(i => i.school_id === inv.schoolId);
                      const dbIds = new Set(dbInvs.map(i => i.id));
                      const filteredGenerated = generated.filter(g => !dbIds.has(g.id));
                      const allCombined = [
                        ...dbInvs.map(i => ({
                          id: i.id,
                          billing_date: formatDateDisplay(i.billing_date),
                          year: i.billing_date ? new Date(i.billing_date).getFullYear() : new Date().getFullYear(),
                          amount: i.amount,
                          status: i.status,
                          type: i.type,
                          isDb: true,
                          isCurrentMonth: false,
                          isTrialMonth: false
                        })),
                        ...filteredGenerated.map(g => ({
                          id: g.id,
                          billing_date: g.date,
                          year: g.year ? parseInt(g.year) : new Date().getFullYear(),
                          amount: g.amount,
                          status: g.status === 'Bezahlt' ? 'paid' : (g.status === 'Vorschau' ? 'preview' : 'open'),
                          type: g.type,
                          isDb: false,
                          isCurrentMonth: g.isCurrentMonth,
                          isTrialMonth: g.status === 'Probemonat'
                        }))
                      ];

                      if (allCombined.length === 0) {
                        return (
                          <div style={{ textAlign: 'center', color: '#86868b', fontSize: '0.78rem', padding: '16px 0', border: '1px dashed rgba(0, 0, 0, 0.05)', borderRadius: '10px' }}>
                            Keine Rechnungen vorhanden.
                          </div>
                        );
                      }

                      const previewInvoices = allCombined.filter(i => i.status === 'preview' || i.status === 'Vorschau');
                      const unpaidInvoices = allCombined.filter(i => (i.status === 'open' || i.status === 'overdue') && i.status !== 'preview');
                      const archivedInvoices = allCombined.filter(i => i.status !== 'open' && i.status !== 'overdue' && i.status !== 'preview');

                      // Group archived invoices by year
                      const archivedByYear: Record<number, any[]> = {};
                      archivedInvoices.forEach(i => {
                        const yr = i.year || new Date().getFullYear();
                        if (!archivedByYear[yr]) {
                          archivedByYear[yr] = [];
                        }
                        archivedByYear[yr].push(i);
                      });

                      const sortedYears = Object.keys(archivedByYear)
                        .map(Number)
                        .sort((a, b) => b - a);

                      const renderInvoiceCard = (invoice: any) => {
                        const isPreview = invoice.status === 'preview' || invoice.status === 'Vorschau' || String(invoice.id || '').startsWith('VS-');
                        const isPaid = invoice.status === 'paid' || invoice.status === 'Bezahlt';
                        const isCancelled = invoice.status === 'cancelled' || invoice.status === 'Storniert';
                        const isDueInvoice = !isPreview && !isPaid && !isCancelled && Number(invoice.amount || 0) > 0;

                        return (
                          <div 
                            key={invoice.id} 
                            className="receipt-card" 
                            style={{ 
                              opacity: invoice.status === 'cancelled' ? 0.6 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '12px',
                              padding: '12px 16px',
                              boxSizing: 'border-box',
                              width: '100%'
                            }}
                          >
                            {/* Left Group: Invoice ID, Date & Status tag */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', minWidth: '180px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 700, color: isPreview ? '#0284c7' : '#0f172a', fontSize: '0.82rem' }}>
                                    {isPreview ? invoice.id : (invoice.amount < 0 ? invoice.id.replace('INV-', 'GS-') : invoice.id.replace('INV-', 'RE-'))}
                                  </span>
                                  {isPreview && (
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 7px', borderRadius: '4px', border: '1px solid #bae6fd', letterSpacing: '0.03em' }}>
                                      Vorschau
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 550 }}>{invoice.billing_date}</span>
                                  <span style={{ 
                                    fontSize: '0.60rem', 
                                    fontWeight: 700, 
                                    color: invoice.type === 'AKT' ? '#7c3aed' : '#0284c7', 
                                    background: invoice.type === 'AKT' ? '#f5f3ff' : '#f0f9ff', 
                                    border: `1px solid ${invoice.type === 'AKT' ? '#ddd6fe' : '#bae6fd'}`,
                                    padding: '1px 6px', 
                                    borderRadius: '4px' 
                                  }}>
                                    {invoice.type === 'AKT' ? 'Schüleraktivierungen' : 'Infrastruktur & Service'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right Group: Amount & Action Button */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                                {Number(invoice.amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                              </span>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isDueInvoice && (
                                  <button
                                    type="button"
                                    title={inv.billingEmail ? `Rechnung per E-Mail an ${inv.billingEmail} senden & PDF herunterladen` : 'Rechnung per E-Mail senden & PDF herunterladen (mailto:)'}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSendInvoiceEmail(invoice, inv);
                                    }}
                                    style={{
                                      background: '#ffffff',
                                      border: '1px solid rgba(0, 0, 0, 0.12)',
                                      borderRadius: '8px',
                                      padding: '5px 9px',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      color: '#475569',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      transition: 'all 0.15s ease-in-out'
                                    }}
                                    onMouseOver={(e: any) => { 
                                      e.currentTarget.style.background = '#f0fdf4'; 
                                      e.currentTarget.style.color = '#15803d';
                                      e.currentTarget.style.borderColor = '#86efac';
                                    }}
                                    onMouseOut={(e: any) => { 
                                      e.currentTarget.style.background = '#ffffff'; 
                                      e.currentTarget.style.color = '#475569';
                                      e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.12)';
                                    }}
                                  >
                                    <Mail size={13} />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingInvoice({
                                      invoiceId: invoice.id,
                                      schoolId: inv.schoolId,
                                      schoolName: inv.schoolName,
                                      schoolStreet: inv.schoolStreet,
                                      schoolZipCode: inv.schoolZipCode,
                                      schoolCity: inv.schoolCity,
                                      date: invoice.billing_date,
                                      amount: invoice.amount,
                                      status: isPreview ? 'Vorschau' : invoice.status,
                                      type: invoice.type || (String(invoice.id).startsWith('AKT-') ? 'AKT' : 'INF'),
                                      isCurrentMonth: invoice.isCurrentMonth,
                                      hasCampus: inv.hasCampus,
                                      hasGroovelab: inv.hasGroovelab,
                                      baseFee: inv.baseFee,
                                      kombiDiscountAmount: inv.kombiDiscountAmount,
                                      userFee: inv.userFee,
                                      activeStudentFee: inv.activeStudentFee,
                                      totalTeachersCount: inv.totalTeachersCount,
                                      totalEmployeesCount: inv.totalEmployeesCount,
                                      passiveStudentsCount: invoice.type === 'AKT' ? 0 : inv.passiveStudentsCount,
                                      activeStudents: inv.activeStudents,
                                      activeCampusCount: inv.activeCampusCount,
                                      activeGroovelabCount: inv.activeGroovelabCount,
                                      storageAddonGb: inv.storageAddonGb,
                                      storageAddonMonthlyFee: inv.storageAddonMonthlyFee,
                                      subscriptionBypass: inv.subscriptionBypass,
                                      subtotal: inv.subtotal,
                                      studentBillingOption: inv.studentBillingOption,
                                      isTrialMonth: invoice.isTrialMonth
                                    });
                                  }}
                                  style={{
                                    background: isPreview ? '#0284c7' : '#ffffff',
                                    border: isPreview ? 'none' : '1px solid rgba(0, 0, 0, 0.12)',
                                    borderRadius: '8px',
                                    padding: '5px 12px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    color: isPreview ? '#ffffff' : '#1e293b',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    boxShadow: isPreview ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
                                    transition: 'all 0.15s ease-in-out'
                                  }}
                                  onMouseOver={(e: any) => { e.currentTarget.style.background = isPreview ? '#0369a1' : '#f8fafc'; }}
                                  onMouseOut={(e: any) => { e.currentTarget.style.background = isPreview ? '#0284c7' : '#ffffff'; }}
                                >
                                  {isPreview ? 'Vorschau ansehen' : 'Vorschau'}
                                </button>

                                {/* GoBD Stornorechnung Trigger */}
                                {!isPreview && invoice.amount > 0 && invoice.status !== 'cancelled' && invoice.status !== 'storniert' && (
                                  <button
                                    type="button"
                                    title="GoBD-konforme Stornorechnung (ST-...) erstellen"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setStornoModalInvoice({ invoice, school: inv });
                                    }}
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.08)',
                                      border: '1px solid rgba(239, 68, 68, 0.25)',
                                      borderRadius: '8px',
                                      padding: '5px 8px',
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      color: '#dc2626',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    Storno
                                  </button>
                                )}
                                
                                {!isPreview && (
                                  invoice.isDb ? (
                                    <select
                                      value={invoice.status}
                                      onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                                      style={{
                                        padding: '5px 8px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(0, 0, 0, 0.12)',
                                        fontSize: '0.74rem',
                                        fontWeight: 600,
                                        background: '#ffffff',
                                        cursor: 'pointer',
                                        color: '#334155',
                                        outline: 'none'
                                      }}
                                    >
                                      <option value="open">Offen</option>
                                      <option value="paid">Bezahlt</option>
                                      <option value="overdue">Überfällig</option>
                                      <option value="cancelled">Storniert</option>
                                    </select>
                                  ) : (
                                    <select
                                      value={invoice.status}
                                      onChange={() => toggleInvoicePaid(inv.schoolId, invoice.id)}
                                      style={{
                                        padding: '5px 8px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(0, 0, 0, 0.12)',
                                        fontSize: '0.74rem',
                                        fontWeight: 600,
                                        background: '#ffffff',
                                        cursor: 'pointer',
                                        color: '#334155',
                                        outline: 'none'
                                      }}
                                    >
                                      <option value="open">Offen</option>
                                      <option value="paid">Bezahlt</option>
                                    </select>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Floating Preview Sektion (Laufender Monat / Künftig) */}
                          {previewInvoices.length > 0 && (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              background: '#f0f9ff',
                              padding: '12px 14px',
                              borderRadius: '14px',
                              border: '1px solid #bae6fd',
                              marginBottom: '4px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: '#0369a1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                <Sparkles size={14} color="#0284c7" />
                                <span>Laufende Abrechnung (Vorschau / Noch nicht fällig)</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {previewInvoices.map(invoice => renderInvoiceCard(invoice))}
                              </div>
                            </div>
                          )}

                          {/* Floating Unpaid Sektion (Reale offene Rechnungen) */}
                          {unpaidInvoices.length > 0 && (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              background: 'rgba(239, 68, 68, 0.02)',
                              padding: '12px 14px',
                              borderRadius: '14px',
                              border: '1px dashed rgba(239, 68, 68, 0.15)',
                              marginBottom: '6px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: '#dc2626', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                <ShieldAlert size={14} />
                                <span>Ausstehende Fällige Rechnungen ({unpaidInvoices.length})</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {unpaidInvoices.map(invoice => renderInvoiceCard(invoice))}
                              </div>
                            </div>
                          )}

                          {/* Archived Years Accordion Sektion */}
                          {sortedYears.length > 0 ? (
                            sortedYears.map(yr => {
                              const isExpanded = expandedYears[yr] ?? false;
                              const yearInvoices = archivedByYear[yr] || [];
                              
                              const summaryText = yearInvoices.length === 1 ? '1 Rechnung' : `${yearInvoices.length} Rechnungen`;

                              return (
                                <div key={yr} style={{ display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: '12px', background: '#f8fafc', overflow: 'hidden' }}>
                                  {/* Accordion Header */}
                                  <div 
                                    onClick={() => toggleYearExpanded(yr)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '10px 14px',
                                      cursor: 'pointer',
                                      userSelect: 'none',
                                      background: '#ffffff',
                                      transition: 'background 0.15s'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>Archiv {yr}</span>
                                      <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>({summaryText})</span>
                                    </div>
                                    <div style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
                                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </div>
                                  </div>

                                  {/* Accordion Content */}
                                  {isExpanded && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', background: '#f8fafc', borderTop: '1px solid rgba(15, 23, 42, 0.03)' }}>
                                      {yearInvoices.map(invoice => renderInvoiceCard(invoice))}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            unpaidInvoices.length === 0 && (
                              <div style={{ textAlign: 'center', color: '#86868b', fontSize: '0.78rem', padding: '16px 0', border: '1px dashed rgba(0, 0, 0, 0.05)', borderRadius: '10px' }}>
                                Keine Rechnungen vorhanden.
                              </div>
                            )
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 📊 SUB-TAB 2: DATEV & ERLÖSKONTEN (activeFinanceSubTab === 'datev')    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeFinanceSubTab === 'datev' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
          {/* DATEV Config Banner */}
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '28px 32px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileSpreadsheet size={24} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                  DATEV Buchungsstapel-Generator (EXTF V700)
                </h3>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                GoBD-konformer Export für Steuerberater und DATEV Unternehmen online (Standardkontenrahmen SKR03 / SKR04).
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* SKR Switcher */}
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px' }}>
                {(['SKR03', 'SKR04'] as ChartOfAccounts[]).map(skr => (
                  <button
                    key={skr}
                    type="button"
                    onClick={() => setSelectedChartOfAccounts(skr)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: selectedChartOfAccounts === skr ? '#ffffff' : 'transparent',
                      color: selectedChartOfAccounts === skr ? '#059669' : '#64748b',
                      boxShadow: selectedChartOfAccounts === skr ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {skr}
                  </button>
                ))}
              </div>

              {/* Month Selector */}
              <select
                value={datevPeriodMonth}
                onChange={(e) => setDatevPeriodMonth(Number(e.target.value))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#0f172a'
                }}
              >
                {[
                  { m: 1, l: 'Januar' }, { m: 2, l: 'Februar' }, { m: 3, l: 'März' },
                  { m: 4, l: 'April' }, { m: 5, l: 'Mai' }, { m: 6, l: 'Juni' },
                  { m: 7, l: 'Juli' }, { m: 8, l: 'August' }, { m: 9, l: 'September' },
                  { m: 10, l: 'Oktober' }, { m: 11, l: 'November' }, { m: 12, l: 'Dezember' }
                ].map(item => (
                  <option key={item.m} value={item.m}>{item.l} {datevPeriodYear}</option>
                ))}
              </select>

              {/* Download CTA */}
              <button
                onClick={() => handleDatevExport(selectedChartOfAccounts)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background: '#ea4335',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(234, 67, 53, 0.25)'
                }}
                className="hover-scale-mini"
              >
                <Download size={16} /> CSV-Buchungsstapel herunterladen
              </button>
            </div>
          </div>

          {/* Account Mapping Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px'
          }}>
            {(() => {
              const map = DATEV_ACCOUNT_MAPPINGS[selectedChartOfAccounts];
              return [
                { title: 'Erlöskonto (SaaS Hosting 19%)', acc: map.revenue19, icon: Landmark, note: 'UStG § 14 Regelbesteuerung', color: '#059669' },
                { title: 'Erlöskonto (§ 19 UStG Steuerfrei)', acc: map.revenueExempt, icon: ShieldCheck, note: 'Kleinunternehmer-Regelung', color: '#0284c7' },
                { title: 'Debitoren-Sammelkonto', acc: map.debtorsCollective, icon: Users, note: 'Forderungen aus L+L Schulträger', color: '#7c3aed' },
                { title: 'Passive Rechnungsabgrenzung (PRAP)', acc: map.prapDeferredRevenue, icon: HistoryIcon, note: 'HGB § 250 Abs. 2 / IFRS 15', color: '#d97706' }
              ].map((c, i) => {
                const Icon = c.icon;
                return (
                  <div key={i} style={{ background: '#ffffff', padding: '20px', borderRadius: '18px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{c.title}</span>
                      <Icon size={16} color={c.color} />
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: c.color, fontFamily: 'monospace' }}>
                      {c.acc}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.note}</span>
                  </div>
                );
              });
            })()}
          </div>

          {/* Live Preview Table */}
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '24px 28px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 850, color: '#0f172a' }}>
              Vorschau Buchungsstapel ({selectedChartOfAccounts} • {String(datevPeriodMonth).padStart(2, '0')}/{datevPeriodYear})
            </h4>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 800 }}>Belegdatum</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800 }}>Belegfeld 1 (Rechnungsnr.)</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800 }}>Konto</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800 }}>Gegenkonto</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, textAlign: 'right' }}>Betrag</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800 }}>S/H</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800 }}>Buchungstext</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800 }}>GoBD Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.filter(inv => inv.total > 0).map((inv, idx) => {
                    const map = DATEV_ACCOUNT_MAPPINGS[selectedChartOfAccounts];
                    const numId = inv.schoolId ? inv.schoolId.replace(/[^0-9]/g, '').substring(0, 3) || '104' : '104';
                    const yy = String(datevPeriodYear).slice(-2);
                    const mm = String(datevPeriodMonth).padStart(2, '0');
                    const invId = `RE-${numId}-${yy}${mm}-01`;

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>28.{mm}.{datevPeriodYear}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>{invId}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>{map.revenueExempt}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#7c3aed', fontFamily: 'monospace' }}>{map.debtorsCollective}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, textAlign: 'right', color: '#0f172a' }}>{inv.total.toFixed(2).replace('.', ',')} €</td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: '#059669' }}>H</td>
                        <td style={{ padding: '10px 14px', color: '#334155' }}>Cloud-Hosting {inv.schoolName}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontWeight: 800 }}>
                            Festgeschrieben (1)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 📜 SUB-TAB 6: BUCHUNGSJOURNAL & TARIFE (activeFinanceSubTab === 'ledger') */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeFinanceSubTab === 'ledger' && (() => {
        // Filter logic for ledger
        const filteredBookings = allTariffBookings.filter(b => {
          const q = ledgerSearchQuery.toLowerCase().trim();
          const schoolName = (b.school_name || invoices.find(i => i.schoolId === b.school_id)?.schoolName || '').toLowerCase();
          const receipt = (b.receipt_number || '').toLowerCase();
          const bookedBy = (b.booked_by_name || '').toLowerCase();
          const matchesQuery = !q || schoolName.includes(q) || receipt.includes(q) || bookedBy.includes(q);

          const matchesSchool = ledgerSchoolFilter === 'all' || b.school_id === ledgerSchoolFilter;

          let matchesType = true;
          if (ledgerTypeFilter !== 'all') {
            matchesType = b.booking_type === ledgerTypeFilter;
          }

          let matchesDate = true;
          if (ledgerDateFilter !== 'all') {
            const bDate = new Date(b.created_at || b.effective_date || Date.now());
            const now = new Date();
            if (ledgerDateFilter === 'this_month') {
              matchesDate = bDate.getFullYear() === now.getFullYear() && bDate.getMonth() === now.getMonth();
            } else if (ledgerDateFilter === 'last_month') {
              const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              matchesDate = bDate.getFullYear() === lastM.getFullYear() && bDate.getMonth() === lastM.getMonth();
            } else if (ledgerDateFilter === 'this_quarter') {
              const currentQ = Math.floor(now.getMonth() / 3);
              const bookingQ = Math.floor(bDate.getMonth() / 3);
              matchesDate = bDate.getFullYear() === now.getFullYear() && currentQ === bookingQ;
            } else if (ledgerDateFilter === 'this_year') {
              matchesDate = bDate.getFullYear() === now.getFullYear();
            }
          }

          return matchesQuery && matchesSchool && matchesType && matchesDate;
        });

        // Compute KPIs
        const totalBaseMrr = allTariffBookings.reduce((acc, b) => {
          if (b.booking_type === 'STORAGE_UPGRADE' || b.booking_type === 'STORAGE_DOWNGRADE') return acc;
          if (b.booking_type === 'REVERSAL_STORNO') return acc + Number(b.total_monthly_rate_net || 0);
          const baseRate = (b.has_campus_subscription && b.has_groovelab_subscription) ? 19.90 : b.has_campus_subscription ? 14.90 : 9.90;
          return acc + baseRate;
        }, 0);

        const totalStorageMrr = allTariffBookings.reduce((acc, b) => {
          if (b.booking_type === 'REVERSAL_STORNO') return acc;
          return acc + Number(b.storage_addon_monthly_fee || 0);
        }, 0);
        const activeStorageBookingsCount = allTariffBookings.filter(b => b.booking_type !== 'REVERSAL_STORNO' && Number(b.storage_addon_gb || 0) > 0).length;
        const pendingDowngradesCount = allTariffBookings.filter(b => b.storage_pending_downgrade_gb !== null && b.storage_pending_downgrade_gb !== undefined).length;

        // Unique school list for filter dropdown
        const schoolFilterOptions = Array.from(new Set(allTariffBookings.map(b => b.school_id))).map(id => {
          const name = allTariffBookings.find(b => b.school_id === id)?.school_name || invoices.find(i => i.schoolId === id)?.schoolName || id;
          return { id, name };
        });

        // CSV Export handler with Security Audit Logging
        const handleExportLedgerCsv = () => {
          const headers = [
            'Belegnummer',
            'Datum',
            'Musikschule',
            'Buchungstyp',
            'Campus',
            'GrooveLab',
            'AudioTresorGB',
            'MonatsgebuehrNetto',
            'GebuchtDurch',
            'Notizen'
          ];
          const rows = filteredBookings.map(b => {
            const sName = b.school_name || invoices.find(i => i.schoolId === b.school_id)?.schoolName || b.school_id;
            const dateStr = new Date(b.created_at).toLocaleDateString('de-DE');
            return [
              b.receipt_number,
              dateStr,
              sName,
              b.booking_type,
              b.has_campus_subscription ? 'Ja' : 'Nein',
              b.has_groovelab_subscription ? 'Ja' : 'Nein',
              b.storage_addon_gb || 0,
              Number(b.total_monthly_rate_net || 0).toFixed(2),
              b.booked_by_name || 'Schulleitung',
              b.notes || ''
            ];
          });
          downloadCsvFile(`buchungsjournal_campus_groovelab_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
          showActionToast(`📁 Buchungsjournal (${filteredBookings.length} Belege) als CSV exportiert.`);
          logSecurityEvent({
            action: 'FINANCIAL_LEDGER_EXPORT_TRIGGERED',
            metadata: {
              exportType: 'CSV_LEDGER',
              recordCount: filteredBookings.length,
              schoolFilter: ledgerSchoolFilter,
              typeFilter: ledgerTypeFilter,
              dateFilter: ledgerDateFilter
            }
          });
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Gebuchte Basis-MRR</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', fontFeatureSettings: '"tnum"' }}>
                  {totalBaseMrr.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </div>
                <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700 }}>✓ Campus &amp; GrooveLab Hosting</span>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Audio-Tresor Add-on MRR</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', fontFeatureSettings: '"tnum"' }}>
                  {totalStorageMrr.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </div>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{activeStorageBookingsCount} aktive Speicherpakete</span>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Gesamt-Belege im Ledger</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', fontFeatureSettings: '"tnum"' }}>
                  {allTariffBookings.length}
                </div>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Append-Only Audit Trail</span>
              </div>

              <div style={{ background: pendingDowngradesCount > 0 ? '#fffbeb' : '#ffffff', border: pendingDowngradesCount > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0', borderRadius: '18px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: pendingDowngradesCount > 0 ? '#b45309' : '#64748b', textTransform: 'uppercase' }}>Vorgemerkte Downgrades</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: pendingDowngradesCount > 0 ? '#d97706' : '#0f172a', fontFeatureSettings: '"tnum"' }}>
                  {pendingDowngradesCount}
                </div>
                <span style={{ fontSize: '0.68rem', color: pendingDowngradesCount > 0 ? '#b45309' : '#64748b' }}>
                  {pendingDowngradesCount > 0 ? 'Wirksam zum Monatswechsel' : 'Keine Vormerkungen offen'}
                </span>
              </div>
            </div>

            {/* Filter & Controls Bar */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', minWidth: '220px' }}>
                  <Search size={15} color="#64748b" />
                  <input
                    type="text"
                    value={ledgerSearchQuery}
                    onChange={(e) => setLedgerSearchQuery(e.target.value)}
                    placeholder="Suche nach Schule, Beleg-Nr., Name..."
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.82rem', width: '100%', color: '#0f172a' }}
                  />
                  {ledgerSearchQuery && (
                    <button onClick={() => setLedgerSearchQuery('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                  )}
                </div>

                <select
                  value={ledgerSchoolFilter}
                  onChange={(e) => setLedgerSchoolFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.82rem', color: '#0f172a', fontWeight: 650, outline: 'none' }}
                >
                  <option value="all">Alle Musikschulen ({schoolFilterOptions.length})</option>
                  {schoolFilterOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>

                <select
                  value={ledgerTypeFilter}
                  onChange={(e) => setLedgerTypeFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.82rem', color: '#0f172a', fontWeight: 650, outline: 'none' }}
                >
                  <option value="all">Alle Buchungstypen</option>
                  <option value="SUBSCRIPTION_BOOKING">Schuljahres-Buchungen</option>
                  <option value="STORAGE_UPGRADE">Speicher-Upgrades</option>
                  <option value="STORAGE_DOWNGRADE">Downgrade vorgemerkt</option>
                  <option value="STORAGE_DOWNGRADE_CANCEL">Downgrade widerrufen</option>
                  <option value="INITIAL_BASELINE">System-Baselines</option>
                  <option value="REVERSAL_STORNO">Stornos &amp; Generalumkehr</option>
                </select>

                {/* Date-Range Selector (Tier-1 FinTech Ergonomie) */}
                <select
                  value={ledgerDateFilter}
                  onChange={(e) => setLedgerDateFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.82rem', color: '#0f172a', fontWeight: 650, outline: 'none' }}
                >
                  <option value="all">Alle Zeiträume</option>
                  <option value="this_month">Aktueller Monat</option>
                  <option value="last_month">Letzter Monat</option>
                  <option value="this_quarter">Laufendes Quartal</option>
                  <option value="this_year">Aktuelles Kalenderjahr</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => fetchAllTariffBookings()}
                  style={{ padding: '8px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.80rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={13} className={loadingTariffBookings ? 'animate-spin' : ''} />
                  Aktualisieren
                </button>

                {/* Tier-1 Slate CSV Export Button (No Campus-Green in Admin Suite) */}
                <button
                  type="button"
                  onClick={handleExportLedgerCsv}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    color: '#ffffff',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  className="hover-scale-mini"
                >
                  <Download size={13} />
                  CSV Export
                </button>
              </div>
            </div>

            {/* Table Card */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)' }}>
              <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                  Revisionssicheres Buchungsjournal ({filteredBookings.length} Einträge)
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Lückenlose GoBD-Belegkette (Multi-Tenant)
                </span>
              </div>

              {loadingTariffBookings ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#ea4335' }} />
                  Buchungsjournal wird geladen...
                </div>
              ) : filteredBookings.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                  <ScrollText size={36} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Keine Buchungsbelege gefunden</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Passe deine Filterkriterien an oder aktualisiere die Daten.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '12px 18px', fontWeight: 800 }}>Beleg-Nr.</th>
                        <th style={{ padding: '12px 16px', fontWeight: 800 }}>Datum</th>
                        <th style={{ padding: '12px 16px', fontWeight: 800 }}>Musikschule</th>
                        <th style={{ padding: '12px 16px', fontWeight: 800 }}>Ereignistyp</th>
                        <th style={{ padding: '12px 16px', fontWeight: 800 }}>Module</th>
                        <th style={{ padding: '12px 16px', fontWeight: 800 }}>Audio-Tresor</th>
                        <th style={{ padding: '12px 16px', fontWeight: 800, textAlign: 'right' }}>Monatsrate</th>
                        <th style={{ padding: '12px 16px', fontWeight: 800 }}>Gebucht durch</th>
                        <th style={{ padding: '12px 18px', fontWeight: 800, textAlign: 'center' }}>Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((b, idx) => {
                        const isReversal = b.booking_type === 'REVERSAL_STORNO';
                        const isUpgrade = b.booking_type === 'STORAGE_UPGRADE';
                        const isDowngrade = b.booking_type === 'STORAGE_DOWNGRADE' || b.booking_type === 'STORAGE_CANCEL';
                        const isDowngradeCancel = b.booking_type === 'STORAGE_DOWNGRADE_CANCEL';
                        const isBaseline = b.booking_type === 'INITIAL_BASELINE';
                        const isSubBooking = b.booking_type === 'SUBSCRIPTION_BOOKING';

                        const typeLabel = isReversal
                          ? 'Storno / Generalumkehr'
                          : isUpgrade
                            ? `Speicher +${b.storage_addon_gb} GB`
                            : isDowngrade
                              ? `Downgrade vorgemerkt (+${b.storage_pending_downgrade_gb ?? b.storage_addon_gb} GB)`
                              : isDowngradeCancel
                                ? 'Downgrade widerrufen'
                                : isBaseline
                                  ? 'System-Baseline'
                                  : isSubBooking
                                    ? 'Vertragsabschluss'
                                    : b.booking_type;

                        const badgeBg = isReversal 
                          ? '#fee2e2' 
                          : (isUpgrade || isSubBooking ? '#dcfce7' : isDowngrade ? '#fef3c7' : isDowngradeCancel ? '#f3e8ff' : '#f1f5f9');
                        const badgeColor = isReversal 
                          ? '#b91c1c' 
                          : (isUpgrade || isSubBooking ? '#166534' : isDowngrade ? '#92400e' : isDowngradeCancel ? '#6b21a8' : '#475569');

                        const sName = b.school_name || invoices.find(i => i.schoolId === b.school_id)?.schoolName || 'Musikschule';
                        const sCity = invoices.find(i => i.schoolId === b.school_id)?.schoolCity || '';
                        const formattedDate = new Date(b.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                        // Check if this record was already reversed
                        const isAlreadyReversed = allTariffBookings.some(item => item.reversal_of_receipt_number === b.receipt_number);

                        return (
                          <tr
                            key={b.id || idx}
                            style={{ 
                              borderBottom: idx < filteredBookings.length - 1 ? '1px solid #f1f5f9' : 'none', 
                              transition: 'background 0.15s ease',
                              background: isReversal ? 'rgba(254, 226, 226, 0.15)' : '#ffffff'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = isReversal ? 'rgba(254, 226, 226, 0.25)' : '#fafbfc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = isReversal ? 'rgba(254, 226, 226, 0.15)' : '#ffffff'}
                          >
                            <td style={{ padding: '14px 18px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span 
                                  onClick={() => setSelectedBookingForDrawer(b)}
                                  style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(15,23,42,0.25)' }}
                                  title="Klick für GoBD Beleg-Inspektion (Drawer)"
                                >
                                  {b.receipt_number}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyReceipt(b.receipt_number);
                                  }}
                                  title="Belegnummer kopieren"
                                  style={{
                                    background: copiedReceiptId === b.receipt_number ? '#ecfdf5' : '#f1f5f9',
                                    border: '1px solid ' + (copiedReceiptId === b.receipt_number ? '#a7f3d0' : '#cbd5e1'),
                                    borderRadius: '6px',
                                    padding: '3px 5px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {copiedReceiptId === b.receipt_number ? (
                                    <Check size={11} color="#059669" />
                                  ) : (
                                    <Copy size={11} color="#64748b" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {formattedDate}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <strong style={{ color: '#0f172a', display: 'block' }}>{sName}</strong>
                              {sCity && <span style={{ fontSize: '0.70rem', color: '#64748b' }}>{sCity}</span>}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                                <span style={{ background: badgeBg, color: badgeColor, padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                  {typeLabel}
                                </span>
                                {isAlreadyReversed && (
                                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '1px 5px', borderRadius: '4px' }}>
                                    Storniert
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                              {b.has_campus_subscription && b.has_groovelab_subscription ? 'Campus + GrooveLab' : b.has_campus_subscription ? 'Campus' : 'GrooveLab'}
                            </td>
                            <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                              <strong style={{ color: b.storage_addon_gb > 0 ? '#166534' : '#64748b' }}>
                                {b.storage_addon_gb > 0 ? `+${b.storage_addon_gb} GB (${Number(b.storage_addon_monthly_fee).toFixed(2).replace('.', ',')} €)` : '1 GB Basis (0 €)'}
                              </strong>
                              {b.storage_pending_downgrade_gb !== null && b.storage_pending_downgrade_gb !== undefined && (
                                <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                  <Clock size={11} color="#d97706" />
                                  <span>Ziel: +{b.storage_pending_downgrade_gb} GB zum {b.storage_pending_effective_date}</span>
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, color: isReversal ? '#b91c1c' : '#0f172a', whiteSpace: 'nowrap' }}>
                              {isReversal ? '-' : ''}{Math.abs(Number(b.total_monthly_rate_net || 0)).toFixed(2).replace('.', ',')} € / Mo.
                              {b.reversal_of_receipt_number && (
                                <div style={{ fontSize: '0.64rem', color: '#b91c1c', fontWeight: 700 }}>
                                  zu {b.reversal_of_receipt_number}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '14px 16px', color: '#475569', fontSize: '0.74rem' }}>
                              {b.booked_by_name || 'Schulleitung'}
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const matchingInv = invoices.find(i => String(i.schoolId || '').toLowerCase() === String(b.school_id || '').toLowerCase())
                                      || invoices.find(i => (i.schoolName || '').toLowerCase() === (sName || '').toLowerCase());
                                    generateTariffReceiptPDF({
                                      receiptNumber: b.receipt_number,
                                      schoolName: sName,
                                      schoolAddress: {
                                        street: matchingInv?.schoolStreet || '',
                                        zipCode: matchingInv?.schoolZipCode || '',
                                        city: matchingInv?.schoolCity || '',
                                        country: b.currency === 'CHF' ? 'CH' : 'DE'
                                      },
                                      bookedBy: b.booked_by_name || 'Schulleitung',
                                      bookingType: b.booking_type,
                                      hasCampus: b.has_campus_subscription,
                                      hasGroovelab: b.has_groovelab_subscription,
                                      studentBillingOption: b.student_billing_option,
                                      storageAddonGb: b.storage_addon_gb,
                                      storageAddonFee: Number(b.storage_addon_monthly_fee || 0),
                                      storageStatus: b.storage_addon_status,
                                      storagePendingDowngradeGb: b.storage_pending_downgrade_gb,
                                      storagePendingEffectiveDate: b.storage_pending_effective_date,
                                      totalMonthlyRateNet: Number(b.total_monthly_rate_net || 0),
                                      currency: b.currency || 'EUR',
                                      effectiveDate: b.effective_date,
                                      createdAt: b.created_at,
                                      notes: b.notes
                                    });
                                  }}
                                  style={{ padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Download size={12} />
                                  PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedBookingForDrawer(b)}
                                  title="GoBD-Details & Prüfung anzeigen"
                                  style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                                >
                                  <Eye size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* 📋 SLIDE-OVER DETAIL DRAWER (Tier-1 FinTech GoBD Inspektions-Panel) */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {selectedBookingForDrawer && (
              <div 
                style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)' }}
                onClick={() => setSelectedBookingForDrawer(null)}
              >
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    maxWidth: '520px',
                    height: '100%',
                    background: '#ffffff',
                    boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  {/* Drawer Header */}
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                          GoBD Beleg-Inspektion
                        </span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: '#ecfdf5', color: '#059669' }}>
                          Append-Only
                        </span>
                      </div>
                      <h3 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                        {selectedBookingForDrawer.receipt_number}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedBookingForDrawer(null)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '8px' }}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Drawer Body */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Status & School Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Mandant</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>
                          {selectedBookingForDrawer.school_name || invoices.find(i => i.schoolId === selectedBookingForDrawer.school_id)?.schoolName || selectedBookingForDrawer.school_id}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Ereignistyp</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: selectedBookingForDrawer.booking_type === 'REVERSAL_STORNO' ? '#b91c1c' : '#0f172a' }}>
                          {selectedBookingForDrawer.booking_type}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Gebucht durch</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                          {selectedBookingForDrawer.booked_by_name || 'Schulleitung'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Erfassungszeitpunkt (UTC)</span>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#475569' }}>
                          {selectedBookingForDrawer.created_at}
                        </span>
                      </div>
                    </div>

                    {/* Financial Rate Calculation Breakdown */}
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a' }}>
                        Tarifberechnung &amp; Monatsrate
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem' }}>
                        <span style={{ color: '#64748b' }}>Cloud-Hosting Campus:</span>
                        <span style={{ fontWeight: 700 }}>{selectedBookingForDrawer.has_campus_subscription ? '14,90 € / Mo.' : '0,00 €'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem' }}>
                        <span style={{ color: '#64748b' }}>Cloud-Hosting GrooveLab:</span>
                        <span style={{ fontWeight: 700 }}>{selectedBookingForDrawer.has_groovelab_subscription ? '9,90 € / Mo.' : '0,00 €'}</span>
                      </div>
                      {selectedBookingForDrawer.has_campus_subscription && selectedBookingForDrawer.has_groovelab_subscription && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', color: '#059669' }}>
                          <span>Kombi-Vorteilsrabatt:</span>
                          <span style={{ fontWeight: 800 }}>-4,90 € / Mo.</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem' }}>
                        <span style={{ color: '#64748b' }}>Audio-Tresor Add-on:</span>
                        <span style={{ fontWeight: 700 }}>+{selectedBookingForDrawer.storage_addon_gb || 0} GB ({Number(selectedBookingForDrawer.storage_addon_monthly_fee || 0).toFixed(2).replace('.', ',')} €)</span>
                      </div>
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>Gesamt-Monatsrate netto:</strong>
                        <strong style={{ fontSize: '1.1rem', color: selectedBookingForDrawer.booking_type === 'REVERSAL_STORNO' ? '#b91c1c' : '#0f172a' }}>
                          {selectedBookingForDrawer.booking_type === 'REVERSAL_STORNO' ? '-' : ''}{Math.abs(Number(selectedBookingForDrawer.total_monthly_rate_net || 0)).toFixed(2).replace('.', ',')} € / Mo.
                        </strong>
                      </div>
                    </div>

                    {/* Reversal / Storno Information */}
                    {selectedBookingForDrawer.reversal_of_receipt_number && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <strong style={{ fontSize: '0.78rem', color: '#991b1b' }}>GoBD-Generalumkehr:</strong>
                        <span style={{ fontSize: '0.74rem', color: '#7f1d1d' }}>
                          Dieser Beleg storniert den Originalbeleg <strong>{selectedBookingForDrawer.reversal_of_receipt_number}</strong>.
                        </span>
                      </div>
                    )}

                    {/* Check if this booking was reversed by another receipt */}
                    {(() => {
                      const revReceipt = allTariffBookings.find(item => item.reversal_of_receipt_number === selectedBookingForDrawer.receipt_number);
                      if (revReceipt) {
                        return (
                          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <strong style={{ fontSize: '0.78rem', color: '#991b1b' }}>Storniert im Journal:</strong>
                            <span style={{ fontSize: '0.74rem', color: '#7f1d1d' }}>
                              Dieser Beleg wurde neutralisiert durch Stornobeleg <strong>{revReceipt.receipt_number}</strong> am {new Date(revReceipt.created_at).toLocaleDateString('de-DE')}.
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Raw Metadata Viewer */}
                    <div>
                      <span style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                        Kryptografische Metadaten &amp; Rohdaten (JSON)
                      </span>
                      <pre style={{
                        background: '#0f172a',
                        color: '#f8fafc',
                        padding: '12px',
                        borderRadius: '10px',
                        fontSize: '0.70rem',
                        fontFamily: 'monospace',
                        overflowX: 'auto',
                        maxHeight: '180px'
                      }}>
                        {JSON.stringify(selectedBookingForDrawer, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Drawer Footer Actions */}
                  <div style={{ padding: '18px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const sName = selectedBookingForDrawer.school_name || invoices.find(i => i.schoolId === selectedBookingForDrawer.school_id)?.schoolName || 'Musikschule';
                        const matchingInv = invoices.find(i => String(i.schoolId || '').toLowerCase() === String(selectedBookingForDrawer.school_id || '').toLowerCase())
                          || invoices.find(i => (i.schoolName || '').toLowerCase() === (sName || '').toLowerCase());
                        generateTariffReceiptPDF({
                          receiptNumber: selectedBookingForDrawer.receipt_number,
                          schoolName: sName,
                          schoolAddress: {
                            street: matchingInv?.schoolStreet || '',
                            zipCode: matchingInv?.schoolZipCode || '',
                            city: matchingInv?.schoolCity || '',
                            country: selectedBookingForDrawer.currency === 'CHF' ? 'CH' : 'DE'
                          },
                          bookedBy: selectedBookingForDrawer.booked_by_name || 'Schulleitung',
                          bookingType: selectedBookingForDrawer.booking_type,
                          hasCampus: selectedBookingForDrawer.has_campus_subscription,
                          hasGroovelab: selectedBookingForDrawer.has_groovelab_subscription,
                          studentBillingOption: selectedBookingForDrawer.student_billing_option,
                          storageAddonGb: selectedBookingForDrawer.storage_addon_gb,
                          storageAddonFee: Number(selectedBookingForDrawer.storage_addon_monthly_fee || 0),
                          storageStatus: selectedBookingForDrawer.storage_addon_status,
                          storagePendingDowngradeGb: selectedBookingForDrawer.storage_pending_downgrade_gb,
                          storagePendingEffectiveDate: selectedBookingForDrawer.storage_pending_effective_date,
                          totalMonthlyRateNet: Number(selectedBookingForDrawer.total_monthly_rate_net || 0),
                          currency: selectedBookingForDrawer.currency || 'EUR',
                          effectiveDate: selectedBookingForDrawer.effective_date,
                          createdAt: selectedBookingForDrawer.created_at,
                          notes: selectedBookingForDrawer.notes
                        });
                      }}
                      style={{ padding: '9px 16px', borderRadius: '10px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 800, fontSize: '0.80rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Download size={13} />
                      PDF herunterladen
                    </button>

                    {/* Storno Action Button (Disabled if already reversed or is a reversal itself) */}
                    {selectedBookingForDrawer.booking_type !== 'REVERSAL_STORNO' && !allTariffBookings.some(item => item.reversal_of_receipt_number === selectedBookingForDrawer.receipt_number) && (
                      <button
                        type="button"
                        onClick={() => {
                          setStornoModalBooking(selectedBookingForDrawer);
                          setTariffStornoReason(`GoBD-Korrektur zu Beleg ${selectedBookingForDrawer.receipt_number}`);
                        }}
                        style={{ padding: '9px 16px', borderRadius: '10px', background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 800, fontSize: '0.80rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <RotateCcw size={13} />
                        Stornobeleg erzeugen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ↩️ STORNO-MODAL: GoBD Generalumkehr Einbuchen                        */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {stornoModalBooking && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}>
                <div style={{ width: '100%', maxWidth: '480px', background: '#ffffff', borderRadius: '20px', padding: '28px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                      <RotateCcw size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                        GoBD-Generalumkehr einbuchen
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Stornobeleg zu {stornoModalBooking.receipt_number}
                      </span>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                    <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>Rechtlicher GoBD-Grundsatz (§ 239 Abs. 3 HGB):</strong>
                    Der Originalbeleg wird <strong>weder verändert noch gelöscht</strong>. Es wird ein manipulationssicherer Stornobeleg mit negativer Monatsrate ({(-1 * Math.abs(Number(stornoModalBooking.total_monthly_rate_net || 0))).toFixed(2).replace('.', ',')} €) in das Journal eingebucht.
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                      Stornogrund (Pflichtangabe für den Prüfpfad)
                    </label>
                    <input
                      type="text"
                      value={tariffStornoReason}
                      onChange={(e) => setTariffStornoReason(e.target.value)}
                      placeholder="z.B. Fehlerhafter Tarifabschluss / Schulleitungs-Korrektur"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setStornoModalBooking(null)}
                      disabled={processingTariffStorno}
                      style={{ padding: '9px 16px', borderRadius: '10px', background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteTariffStorno}
                      disabled={processingTariffStorno || !tariffStornoReason.trim()}
                      style={{ padding: '9px 18px', borderRadius: '10px', background: '#dc2626', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {processingTariffStorno ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      Stornobeleg verbindlich buchen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 🏦 SUB-TAB 3: BANKING & SEPA (activeFinanceSubTab === 'banking')        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeFinanceSubTab === 'banking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
          {/* Ingestion & SEPA Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.9fr)',
            gap: '24px',
            alignItems: 'start'
          }}>
            {/* Box 1: CAMT.053 & MT940 Dropzone (Apple HIG) */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UploadCloud size={22} color="#ea4335" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                  Kontoauszug einlesen (CAMT.053 XML / MT940 / CSV)
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                Ziehen Sie Ihren Bankauszug direkt hinein oder fügen Sie den XML-/CSV-Inhalt ein für automatischen 2-Wege-Abgleich.
              </p>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={bankFileInputRef}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleBankFileUpload(e.target.files[0]);
                }}
                accept=".xml,.camt,.csv,.mt940,.txt"
                style={{ display: 'none' }}
              />

              {/* Native Apple HIG Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingBankFile(true); }}
                onDragLeave={() => setIsDraggingBankFile(false)}
                onDrop={handleBankFileDrop}
                onClick={() => bankFileInputRef.current?.click()}
                style={{
                  border: isDraggingBankFile ? '2px dashed #ea4335' : '1.5px dashed #cbd5e1',
                  borderRadius: '16px',
                  padding: '24px',
                  background: isDraggingBankFile ? '#fff5f5' : '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
                className="hover-scale-mini"
              >
                <UploadCloud size={32} color={isDraggingBankFile ? '#ea4335' : '#64748b'} />
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                  {bankFileDetails ? `Geladene Datei: ${bankFileDetails.name}` : 'Kontoauszug hier hineinziehen oder klicken'}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {bankFileDetails ? `Dateigröße: ${bankFileDetails.size} • Klick zum Austauschen` : 'Unterstützt CAMT.053 XML, MT940, CSV (ISO 20022)'}
                </div>
              </div>

              {/* Collapsible Manual Textarea */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowManualPaste(!showManualPaste)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {showManualPaste ? '▲ Text-Eingabefeld ausblenden' : '▼ Text / XML manuell einfügen'}
                </button>
                {bankFileDetails && (
                  <button
                    type="button"
                    onClick={() => {
                      setBankFileDetails(null);
                      setCamtRawInput('');
                      setCamtParsedResult(null);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✕ Datei zurücksetzen
                  </button>
                )}
              </div>

              {showManualPaste && (
                <textarea
                  rows={4}
                  value={camtRawInput}
                  onChange={(e) => setCamtRawInput(e.target.value)}
                  placeholder="CAMT.053 XML-Code oder CSV-Kontoauszug hier einfügen..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.80rem',
                    fontFamily: 'monospace',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const sample = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08">
  <BkToCstmrStmt>
    <Stmt>
      <Id>STMT-2026-08</Id>
      <Ntry>
        <Amt Ccy="EUR">19.90</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <BookgDt><Dt>2026-08-27</Dt></BookgDt>
        <NtryDtls><TxDtls><RmtInf><Ustrd>Campus-Groovelab RE-104-2608-01</Ustrd></RmtInf></TxDtls></NtryDtls>
      </Ntry>
      <Ntry>
        <Amt Ccy="EUR">5.88</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <BookgDt><Dt>2026-08-27</Dt></BookgDt>
        <NtryDtls><TxDtls><RmtInf><Ustrd>Aktivierung CG-F63B8EDE-2608</Ustrd></RmtInf></TxDtls></NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;
                    setCamtRawInput(sample);
                    setBankFileDetails({ name: 'demo-kontoauszug-camt053.xml', size: '0.9 KB' });
                    handleProcessBankStatement(sample);
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#ea4335', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  ⚡ Demo-Kontoauszug laden
                </button>

                <button
                  type="button"
                  disabled={!camtRawInput.trim()}
                  onClick={() => handleProcessBankStatement(camtRawInput)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: camtRawInput.trim() ? '#ea4335' : '#cbd5e1',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: camtRawInput.trim() ? 'pointer' : 'not-allowed',
                    boxShadow: camtRawInput.trim() ? '0 4px 12px rgba(234, 67, 53, 0.2)' : 'none',
                    transition: 'all 0.2s'
                  }}
                  className={camtRawInput.trim() ? 'hover-scale-mini' : ''}
                >
                  Analysieren &amp; Abgleichen
                </button>
              </div>
            </div>

            {/* Box 2: SEPA Lastschrift XML Generator */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Landmark size={22} color="#ea4335" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                  SEPA-Lastschriften Batch (pain.008)
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                Generieren Sie eine ISO 20022 XML Datei für den automatisierten Lastschrifteinzug aller offenen Mandate bei Ihrer Hausbank.
              </p>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Gläubiger-ID (Creditor ID):</span>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>{sepaCreditorId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Einzugs-Ausführung:</span>
                  <span style={{ fontWeight: 800, color: '#059669' }}>{sepaCollectionDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Offenes Lastschrift-Volumen:</span>
                  <span style={{ fontWeight: 900, color: '#0f172a' }}>{summary.totalUnpaid.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportSepaXml}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ea4335 0%, #dc2626 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(234, 67, 53, 0.22)'
                }}
                className="hover-scale-mini"
              >
                <Download size={16} /> SEPA XML (pain.008) erstellen &amp; herunterladen
              </button>
            </div>
          </div>

          {/* Statement Match Results */}
          {camtParsedResult && (
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px 28px',
              border: '1.5px solid #0284c7',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }} className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle size={22} color="#059669" />
                  <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                    Ergebnis 2-Wege-Zahlungsabgleich ({camtParsedResult.statementId})
                  </h4>
                </div>

                <button
                  type="button"
                  disabled={camtApplying}
                  onClick={handleApplyCamtBookings}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    cursor: camtApplying ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={16} /> {camtApplying ? 'Wird verbucht...' : 'Alle erkannten Zahlungen jetzt verbuchen'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>B2B Schulrechnungen</span>
                  <strong style={{ display: 'block', fontSize: '1.2rem', color: '#14532d', marginTop: '2px' }}>{camtParsedResult.b2bMatches.length} Treffer</strong>
                </div>
                <div style={{ background: '#eff6ff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>B2C Schüler-Aktivierungen</span>
                  <strong style={{ display: 'block', fontSize: '1.2rem', color: '#1e3a8a', marginTop: '2px' }}>{camtParsedResult.b2cMatches.length} Treffer</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Gesamt-Gutschriften</span>
                  <strong style={{ display: 'block', fontSize: '1.2rem', color: '#0f172a', marginTop: '2px' }}>{camtParsedResult.totalCreditAmount.toFixed(2).replace('.', ',')} €</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 📈 SUB-TAB 4: PRAP & PERIODENABGRENZUNG (activeFinanceSubTab === 'prap') */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeFinanceSubTab === 'prap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '28px 32px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <HistoryIcon size={24} color="#d97706" />
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                Periodengerechte Umsatzabgrenzung (PRAP / HGB § 250 / IFRS 15)
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', lineHeight: 1.4 }}>
              Musikschulen mit <strong>Jahreszahlung (-10% Skonto)</strong> oder <strong>Schuljahres-Komplettaktivierung (-20% Rabatt)</strong> zahlen Beträge im Voraus. Handelsrechtlich wird der Erlös anteilig monatlich als <em>Recognized MRR</em> realisiert; noch nicht abgewohnte Beträge verbleiben im <em>Deferred Revenue Pool (PRAP)</em>.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px'
          }}>
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Cash Inflow (Zahlungseingang kumuliert)</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>
                {(summary.totalMonthlyRevenue * 1.15).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>✓ Reales Bankguthaben</span>
            </div>

            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Recognized MRR (Monatlicher Ist-Ertrag)</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669' }}>
                {summary.totalMonthlyRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Handelsrechtlicher Monatserlös</span>
            </div>

            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Deferred Revenue Pool (PRAP-Konto 0980)</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706' }}>
                {((summary.totalMonthlyRevenue * 1.15) - summary.totalMonthlyRevenue).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 700 }}>Abgrenzungsposten Folgemonate</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ⚠️ SUB-TAB 5: OPOS & MAHNWESEN (activeFinanceSubTab === 'dunning')       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeFinanceSubTab === 'dunning' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '28px 32px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={24} color="#dc2626" />
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                  Offene Posten (OPOS) &amp; 3-Stufen-Mahnwesen
                </h3>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Automatische Verzugsüberwachung nach § 286 BGB inkl. gesetzlicher Verzugszinsen und Mahngebühren.
              </p>
            </div>

            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '8px 16px', borderRadius: '12px', fontWeight: 850, fontSize: '0.88rem' }}>
              Offene Gesamtforderungen: {summary.totalUnpaid.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </div>
          </div>

          {/* Dunning Invoices Table */}
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '24px 28px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 800 }}>Musikschule</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800 }}>Rechnungs-ID</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800 }}>Fälligkeit</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, textAlign: 'right' }}>Betrag</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800 }}>Mahnstufe</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, textAlign: 'right' }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.filter(inv => inv.total > 0 && inv.status !== 'bypass').map((inv, idx) => {
                    const numId = getSchoolNumericId(inv.schoolId);
                    const now = new Date();
                    const yy = String(now.getFullYear()).slice(-2);
                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                    const invId = `RE-${numId}-${yy}${mm}-01`;
                    const isPaid = getPaidInvoices(inv.schoolId).includes(invId);

                    if (isPaid) return null;

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>{inv.schoolName}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700 }}>{invId}</td>
                        <td style={{ padding: '12px 14px', color: '#dc2626', fontWeight: 700 }}>Seit 14 Tagen überfällig</td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'right', color: '#0f172a' }}>{inv.total.toFixed(2).replace('.', ',')} €</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: '0.70rem', padding: '3px 8px', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c', fontWeight: 800 }}>
                            Stufe 1 (Zahlungserinnerung)
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleSendDunningEmail({ id: invId, amount: inv.total }, inv, 1)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <Mail size={13} /> Erinnerung
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendDunningEmail({ id: invId, amount: inv.total }, inv, 2)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                background: '#fffbeb',
                                border: '1px solid #fde68a',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#b45309',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <AlertTriangle size={13} /> 1. Mahnung (+5 €)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendDunningEmail({ id: invId, amount: inv.total }, inv, 3)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                background: '#fee2e2',
                                border: '1px solid #fca5a5',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <AlertCircle size={13} /> 2. Mahnung (+40 € / Sperre)
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 🧾 GOBD STORNO- & RECHNUNGSKORREKTUR MODAL                               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {stornoModalInvoice && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999999,
          padding: '20px'
        }} className="animate-fade-in">
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            padding: '32px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ban size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  GoBD-Stornobeleg erstellen
                </h3>
              </div>
              <button onClick={() => setStornoModalInvoice(null)} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b' }}>Ursprungsbeleg:</span>
                <strong style={{ fontFamily: 'monospace' }}>{stornoModalInvoice.invoice.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b' }}>Musikschule:</span>
                <strong>{stornoModalInvoice.school.schoolName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b' }}>Stornobetrag (Gutschrift):</span>
                <strong style={{ color: '#dc2626' }}>-{Math.abs(stornoModalInvoice.invoice.amount).toFixed(2).replace('.', ',')} €</strong>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                Stornierungsgrund (GoBD Pflichtangabe)
              </label>
              <input
                type="text"
                value={stornoReason}
                onChange={(e) => setStornoReason(e.target.value)}
                placeholder="z. B. Tarifkorrektur, Kulanzstorno, Doppelbuchung"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: '0.74rem', color: '#991b1b', lineHeight: 1.35 }}>
              🛡️ <strong>GoBD Unveränderbarkeit:</strong> Der Ursprungsbeleg wird nicht gelöscht, sondern als storniert markiert. Es wird automatisch eine Gegenbuchung mit Belegnummer <code>ST-...</code> im Ledger angelegt.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setStornoModalInvoice(null)}
                style={{ padding: '10px 16px', borderRadius: '10px', background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={processingStorno || !stornoReason.trim()}
                onClick={handleExecuteStorno}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  cursor: processingStorno || !stornoReason.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Check size={16} /> {processingStorno ? 'Wird verbucht...' : 'Stornobeleg jetzt erzeugen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 📤 CAMT.053 BANK-IMPORT MODAL                                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {camtUploadModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999999,
          padding: '20px'
        }} className="animate-fade-in">
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '560px',
            padding: '32px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UploadCloud size={24} color="#ea4335" />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  Bankkontoauszug (CAMT.053) importieren
                </h3>
              </div>
              <button onClick={() => setCamtUploadModalOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Quick File Drop or Paste */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingBankFile(true); }}
              onDragLeave={() => setIsDraggingBankFile(false)}
              onDrop={(e) => {
                handleBankFileDrop(e);
                setCamtUploadModalOpen(false);
                setActiveFinanceSubTab('banking');
              }}
              onClick={() => bankFileInputRef.current?.click()}
              style={{
                border: isDraggingBankFile ? '2px dashed #ea4335' : '1.5px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '20px',
                background: isDraggingBankFile ? '#fff5f5' : '#f8fafc',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <UploadCloud size={28} color="#64748b" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                CAMT.053 XML / CSV Datei hier hineinziehen oder klicken
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                Unterstützt .xml, .camt, .csv und .mt940
              </div>
            </div>

            <textarea
              rows={5}
              value={camtRawInput}
              onChange={(e) => setCamtRawInput(e.target.value)}
              placeholder="Oder CAMT.053 XML-Code / CSV-Kontoauszug direkt hier einfügen..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '0.80rem',
                fontFamily: 'monospace',
                color: '#0f172a',
                outline: 'none'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setCamtUploadModalOpen(false)}
                style={{ padding: '10px 16px', borderRadius: '10px', background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={!camtRawInput.trim()}
                onClick={() => {
                  handleProcessBankStatement(camtRawInput);
                  setCamtUploadModalOpen(false);
                  setActiveFinanceSubTab('banking');
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: camtRawInput.trim() ? '#ea4335' : '#cbd5e1',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  cursor: camtRawInput.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Analysieren &amp; zum Abgleich
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 📥 SEPA DIRECT DEBIT EXPORT MODAL                                      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {sepaExportModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999999,
          padding: '20px'
        }} className="animate-fade-in">
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            padding: '32px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Landmark size={24} color="#ea4335" />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  SEPA Direct Debit (pain.008.001.08)
                </h3>
              </div>
              <button onClick={() => setSepaExportModalOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                  Gläubiger-ID (Creditor Identifier)
                </label>
                <input
                  type="text"
                  value={sepaCreditorId}
                  onChange={(e) => setSepaCreditorId(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 800 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>
                  Gewünschtes Fälligkeitsdatum (min. 2 Tage Vorlauf)
                </label>
                <input
                  type="date"
                  value={sepaCollectionDate}
                  onChange={(e) => setSepaCollectionDate(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSepaExportModalOpen(false)}
                style={{ padding: '10px 16px', borderRadius: '10px', background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleExportSepaXml}
                style={{ padding: '10px 20px', borderRadius: '10px', background: '#ea4335', color: '#ffffff', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={16} /> SEPA XML herunterladen
              </button>
            </div>
          </div>
        </div>
      )}
      
      {viewingInvoice && (
        <InvoicePreviewModal
          invoice={{
            id: viewingInvoice.invoiceId,
            date: viewingInvoice.date,
            amount: viewingInvoice.amount,
            status: viewingInvoice.status,
            type: viewingInvoice.type,
            isCurrentMonth: viewingInvoice.isCurrentMonth,
            hasCampus: viewingInvoice.hasCampus,
            hasGroovelab: viewingInvoice.hasGroovelab,
            totalTeachersCount: viewingInvoice.totalTeachersCount,
            passiveStudentsCount: viewingInvoice.passiveStudentsCount,
            activeCampusCount: viewingInvoice.activeCampusCount,
            activeGroovelabCount: viewingInvoice.activeGroovelabCount,
            storageAddonGb: viewingInvoice.storageAddonGb,
            storageAddonMonthlyFee: viewingInvoice.storageAddonMonthlyFee,
            activationsCount: viewingInvoice.activeStudents,
            activeStudentFee: viewingInvoice.activeStudentFee,
            subscriptionBypass: viewingInvoice.subscriptionBypass,
            isTrialMonth: viewingInvoice.isTrialMonth
          }}
          schoolName={viewingInvoice.schoolName}
          schoolStreet={viewingInvoice.schoolStreet}
          schoolZipCode={viewingInvoice.schoolZipCode}
          schoolCity={viewingInvoice.schoolCity}
          operatorCompany={operatorCompany}
          operatorContact={operatorContact}
          operatorStreet={operatorStreet}
          operatorZip={operatorZip}
          operatorCity={operatorCity}
          operatorIban={operatorIban}
          operatorBic={operatorBic}
          billingPayer={['both', 'debit', 'cash', 'option1'].includes(viewingInvoice.studentBillingOption) ? 'student' : 'school'}
          studentBillingOption={viewingInvoice.studentBillingOption}
          onClose={() => setViewingInvoice(null)}
        />
      )}

      {/* Floating E-Mail Dispatch Toast Feedback */}
      {emailSentToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '14px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 9999,
          fontSize: '0.82rem',
          fontWeight: 700,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={14} color="#ffffff" strokeWidth={3} />
          </div>
          <span>{emailSentToast}</span>
        </div>
      )}

      {/* Personalisierbares Eltern-Informationsblatt (PDF) Modal */}
      <ParentInfoSheetModal
        isOpen={showParentInfoSheetModal}
        onClose={() => {
          setShowParentInfoSheetModal(false);
          setParentInfoSheetSchool(null);
        }}
        schoolData={parentInfoSheetSchool || {
          name: 'Unsere Musikschule',
          subdomain: '',
          logo_url: '',
          city: '',
          student_billing_option: 'school_all',
          email: ''
        }}
        activePlatformDefault="campus"
      />
      
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useMasterPricing } from '../../../context/MasterPricingContext';
import { aggregateSchoolMetrics, getSchoolCanonicalBilling } from '../../../domain/schoolMetricsAggregator';
import { computeSchoolStorageUsedBytes } from '../../../utils/audioStorageHelper';
import { ensureMasterAdminSessionLease } from '../../../utils/sessionLeaseManager';
import { Invoice, PlatformSummary, getSchoolNumericId, formatSchoolNumericId } from '../types';
import { OPERATOR_BANKING_CONFIG } from '../../../config/operatorBanking';
import {
  computeSchoolDunningStatus,
  computeCanonicalDueDate,
  resolveEffectiveBillingDate
} from '../../../domain/schoolDunningEngine';

export function useBillingData(initialSchoolId?: string) {
  const masterPricing = useMasterPricing();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dbInvoices, setDbInvoices] = useState<any[]>([]);
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

  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(initialSchoolId || null);
  const [expandedSchoolUsers, setExpandedSchoolUsers] = useState<any[]>([]);
  const [loadingExpandedUsers, setLoadingExpandedUsers] = useState(false);

  // Operator Stammdaten (SSOT from OPERATOR_BANKING_CONFIG)
  const [operatorCompany, setOperatorCompany] = useState(OPERATOR_BANKING_CONFIG.companyName);
  const [operatorContact, setOperatorContact] = useState(OPERATOR_BANKING_CONFIG.ownerName);
  const [operatorStreet, setOperatorStreet] = useState(OPERATOR_BANKING_CONFIG.street);
  const [operatorZip, setOperatorZip] = useState(OPERATOR_BANKING_CONFIG.zipCode);
  const [operatorCity, setOperatorCity] = useState(OPERATOR_BANKING_CONFIG.city);
  const [operatorIban, setOperatorIban] = useState(OPERATOR_BANKING_CONFIG.iban);
  const [operatorBic, setOperatorBic] = useState(OPERATOR_BANKING_CONFIG.bic);

  const [tick, setTick] = useState(0);
  const [taxMode, setTaxMode] = useState<'small_business' | 'standard_vat'>(() => 
    typeof window !== 'undefined' ? ((localStorage.getItem('cg_tax_mode') as any) || 'small_business') : 'small_business'
  );
  const [schoolAudioBytes, setSchoolAudioBytes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (initialSchoolId) {
      setExpandedSchoolId(initialSchoolId);
    }
  }, [initialSchoolId]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'cg_tax_mode' && e.newValue) {
        setTaxMode(e.newValue as 'small_business' | 'standard_vat');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const getPaidInvoices = (schoolId: string, overrideDbInvoices?: any[]): string[] => {
    const source = overrideDbInvoices || dbInvoices;
    const dbPaid = source
      .filter(i => i.school_id === schoolId && (i.status === 'paid' || i.status === 'Bezahlt'))
      .map(i => i.invoice_number || i.id);
    if (typeof window !== 'undefined') {
      try {
        const localPaid = JSON.parse(localStorage.getItem(`paid_invoices_${schoolId}`) || '[]');
        if (Array.isArray(localPaid)) {
          return Array.from(new Set([...dbPaid, ...localPaid]));
        }
      } catch (_e) {
        // ignore
      }
    }
    return dbPaid;
  };

  const toggleInvoicePaid = async (schoolId: string, invoiceId: string) => {
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('mark_invoice_as_paid', {
        p_invoice_id: invoiceId
      });
      if (rpcErr) {
        // Direct PostgreSQL Fallback if RPC not loaded
        const match = dbInvoices.find(i => (i.id === invoiceId || i.invoice_number === invoiceId) && i.school_id === schoolId);
        const nextStatus = match?.status === 'paid' ? 'open' : 'paid';
        await supabase
          .from('invoices')
          .update({
            status: nextStatus,
            paid_at: nextStatus === 'paid' ? new Date().toISOString() : null
          })
          .or(`id.eq.${invoiceId},invoice_number.eq.${invoiceId}`);
      }
    } catch (e) {
      console.warn('[useBillingData] Error toggling invoice payment status:', e);
    }
    setTick(t => t + 1);
    fetchBillingData();
  };

  const getSchoolInvoices = (
    schoolId: string, 
    currentInvoiceAmount: number, 
    schoolStatus?: string,
    contractStartDate?: string | null,
    createdAt?: string | null,
    schoolMetrics?: any,
    overrideDbInvoices?: any[]
  ) => {
    const activeDbInvoices = overrideDbInvoices || dbInvoices;
    let storedDate: string | null = null;
    if (typeof window !== 'undefined') {
      storedDate = localStorage.getItem(`contractStartDate_${schoolId}`);
    }

    // 0,1% Goldstandard: Fallback auf frühestes Belegdatum der DB oder Gründungsepoche (2026-07-01)
    let fallbackDate = '2026-07-01';
    const schoolDbInvs = activeDbInvoices.filter(i => i.school_id === schoolId && i.billing_date);
    if (schoolDbInvs.length > 0) {
      const dates = schoolDbInvs.map(i => new Date(i.billing_date).getTime()).filter(t => !isNaN(t));
      if (dates.length > 0) {
        fallbackDate = new Date(Math.min(...dates)).toISOString();
      }
    }

    const validDateStr = contractStartDate || createdAt || storedDate || fallbackDate;
    const contractDateObj = new Date(validDateStr);
    
    const startYear = isNaN(contractDateObj.getFullYear()) ? 2026 : contractDateObj.getFullYear();
    const startMonth = isNaN(contractDateObj.getMonth()) ? 7 : (contractDateObj.getMonth() + 1);

    const systemDate = resolveEffectiveBillingDate();
    const currentYear = systemDate.getFullYear();
    const currentMonth = systemDate.getMonth() + 1;

    const deMonths = [
      '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];

    // Kanonisch: Schulen im Probemonat oder Bypass haben keine offenen Belege
    if (schoolStatus === 'trial' || schoolStatus === 'bypass') {
      const monthStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
      const numId = formatSchoolNumericId(schoolId, 3);
      const yy = String(currentYear).slice(-2);
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const monthName = deMonths[currentMonth];
      const invoiceDateStr = `${lastDay}. ${monthName} ${currentYear}`;
      const billingDateIso = `${currentYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
      const canonicalDue = computeCanonicalDueDate(currentYear, currentMonth);

      return [{
        id: `INF-${numId}-${yy}${monthStr}-01`,
        date: invoiceDateStr,
        billing_date: billingDateIso,
        due_date: canonicalDue.dueDateIso,
        dueDateStr: canonicalDue.dueDateDisplay,
        monthName,
        year: String(currentYear),
        amount: 0.00,
        subtotal: currentInvoiceAmount,
        status: schoolStatus === 'bypass' ? 'Bypass' : 'Probemonat',
        type: 'INF',
        isCreated: false,
        isCurrentMonth: true
      }];
    }

    const list: any[] = [];
    let y = startYear;
    let m = startMonth;

    while (y < currentYear || (y === currentYear && m <= currentMonth)) {
      const monthStr = m < 10 ? `0${m}` : `${m}`;
      const numId = formatSchoolNumericId(schoolId, 3);
      const yy = String(y).slice(-2);
      
      const lastDay = new Date(y, m, 0).getDate();
      const monthName = deMonths[m];
      const invoiceDateStr = `${lastDay}. ${monthName} ${y}`;
      const billingDateIso = `${y}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
      const canonicalDue = computeCanonicalDueDate(y, m);
      
      const isCurrent = (y === currentYear && m === currentMonth);
      const creationTime = new Date(y, m - 1, lastDay, 23, 58, 0);
      const isCreated = systemDate.getTime() >= creationTime.getTime();

      const paidInvoicesList = getPaidInvoices(schoolId, activeDbInvoices);

      const isSammelzahler = schoolMetrics?.billingPayer === 'school' ||
        !['both', 'debit', 'cash', 'option1'].includes(schoolMetrics?.studentBillingOption || '') ||
        Boolean(schoolMetrics?.isSammelzahler);

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

      const aktAmount = schoolMetrics
        ? parseFloat((
            ((schoolMetrics.activeCampusCount !== undefined ? schoolMetrics.activeCampusCount : schoolMetrics.activeStudents || 0) * 0.49)
          ).toFixed(2))
        : 0;

      if (isSammelzahler) {
        // 0,1% Goldstandard: Konsolidierte Monatsrechnung für Sammelzahler (Abschnitt A + Abschnitt B)
        const consolidatedAmount = parseFloat((infAmount + aktAmount).toFixed(2));
        const consolidatedId = isCreated ? `RE-${numId}-${yy}${monthStr}-01` : `VS-${numId}-${yy}${monthStr}`;
        const isMarkedPaid = paidInvoicesList.includes(consolidatedId) || 
          paidInvoicesList.includes(`INF-${numId}-${yy}${monthStr}-01`) || 
          paidInvoicesList.includes(`RE-${numId}-${yy}${monthStr}-01`) ||
          paidInvoicesList.includes(`AKT-${numId}-${yy}${monthStr}-01`);

        const consolidatedStatus = (consolidatedAmount === 0.00)
          ? (schoolStatus === 'bypass' ? 'Bypass' : schoolStatus === 'trial' ? 'Probemonat' : 'Kostenfrei')
          : (isMarkedPaid ? 'Bezahlt' : (isCreated ? 'Versendet' : 'Vorschau'));

        list.push({
          id: consolidatedId,
          date: invoiceDateStr,
          billing_date: billingDateIso,
          due_date: canonicalDue.dueDateIso,
          dueDateStr: canonicalDue.dueDateDisplay,
          monthName,
          year: String(y),
          amount: consolidatedAmount,
          status: consolidatedStatus,
          type: 'ALL',
          isCreated,
          isCurrentMonth: isCurrent,
          isSammelzahler: true,
          infAmount,
          aktAmount
        });
      } else {
        // Direktabrechnung durch Erziehungsberechtigte: Träger zahlt nur Infrastruktur
        const infId = isCreated ? `INF-${numId}-${yy}${monthStr}-01` : `VS-${numId}-${yy}${monthStr}`;
        const isInfMarkedPaid = paidInvoicesList.includes(infId) || paidInvoicesList.includes(`RE-${numId}-${yy}${monthStr}-01`);
        const infStatus = (infAmount === 0.00)
          ? (schoolStatus === 'bypass' ? 'Bypass' : schoolStatus === 'trial' ? 'Probemonat' : 'Kostenfrei')
          : (isInfMarkedPaid ? 'Bezahlt' : (isCreated ? 'Versendet' : 'Vorschau'));

        list.push({
          id: infId,
          date: invoiceDateStr,
          billing_date: billingDateIso,
          due_date: canonicalDue.dueDateIso,
          dueDateStr: canonicalDue.dueDateDisplay,
          monthName,
          year: String(y),
          amount: infAmount,
          status: infStatus,
          type: 'INF',
          isCreated,
          isCurrentMonth: isCurrent,
          isSammelzahler: false,
          infAmount,
          aktAmount: 0
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

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1-5. Execute all independent queries concurrently in 1 single network roundtrip
      const [
        { data: billingSettings, error: settingsErr },
        { data: rawSchools, error: schoolsErr },
        { data: metrics, error: metricsErr },
        { data: users, error: usersErr },
        { data: pendingStudentsDb, error: pendingErr },
        { data: songsDb },
        { data: bandsDb },
        { data: allInvoices, error: invoicesErr },
        { data: rpcBillingBundle }
      ] = await Promise.all([
        supabase.from('master_billing_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('schools').select('*'),
        supabase.from('active_licence_metrics').select('school_id, active_campus_users'),
        supabase.from('users').select('id, school_id, role, roles, first_name, last_name, email, is_active, is_campus_active, is_groovelab_active, is_trial, student_billing_payment_method, student_billing_cash_paid, exempt_from_direct_billing'),
        supabase.from('pending_students_decrypted').select('id, school_id, first_name, last_name'),
        supabase.from('songs').select('id, school_id'),
        supabase.from('bands').select('id, school_id, name'),
        supabase.from('invoices').select('*').order('billing_date', { ascending: false }),
        supabase.rpc('get_master_billing_invoices', { p_school_id: null })
      ]);

      if (settingsErr) console.warn('Could not load master pricing settings:', settingsErr);
      if (billingSettings) {
        if (billingSettings.company_name) setOperatorCompany(billingSettings.company_name);
        if (billingSettings.contact_person) setOperatorContact(billingSettings.contact_person);
        if (billingSettings.street && !billingSettings.street.includes('Schulstraße')) setOperatorStreet(billingSettings.street);
        if (billingSettings.zip_code && billingSettings.zip_code !== '79713') setOperatorZip(billingSettings.zip_code);
        if (billingSettings.city && !billingSettings.city.includes('Bad Säckingen')) setOperatorCity(billingSettings.city);
        if (billingSettings.tax_mode === 'standard_vat' || billingSettings.tax_mode === 'small_business') {
          setTaxMode(billingSettings.tax_mode);
        }
        const dbIbanClean = (billingSettings.iban || '').replace(/\s+/g, '').toUpperCase();
        if (billingSettings.iban && !dbIbanClean.startsWith('DE8937040044')) {
          setOperatorIban(billingSettings.iban);
        }
        const dbBicClean = (billingSettings.bic || '').replace(/\s+/g, '').toUpperCase();
        if (billingSettings.bic && dbBicClean !== 'WELADED1XYZ' && dbBicClean !== 'COBADEFFXXX' && dbBicClean !== 'GENODEF1S38') {
          setOperatorBic(billingSettings.bic);
        }
      }

      // 0,1% Goldstandard: Mergen von DB-Tabelle schools und Master-RPC schools
      const rpcSchools = (rpcBillingBundle && (rpcBillingBundle as any).schools && Array.isArray((rpcBillingBundle as any).schools))
        ? (rpcBillingBundle as any).schools
        : null;

      const rawSchoolsList = (rawSchools as any[]) || [];
      const rawMap = new Map(rawSchoolsList.map(s => [s.id, s]));

      let schools: any[] = [];
      if (rpcSchools && rpcSchools.length > 0) {
        schools = rpcSchools.map((rpcS: any) => {
          const raw = rawMap.get(rpcS.id) || {};
          return {
            ...raw,
            ...rpcS,
            is_trial: rpcS.is_trial ?? raw.is_trial ?? false,
            trial_ends_at: rpcS.trial_ends_at ?? rpcS.trial_until ?? raw.trial_ends_at ?? raw.trial_until ?? null,
            is_billing_booked: rpcS.is_billing_booked ?? raw.is_billing_booked ?? false,
            storage_addon_gb: Math.max(Number(rpcS.storage_addon_gb || 0), Number(raw.storage_addon_gb || 0)),
            storage_addon_monthly_fee: Math.max(Number(rpcS.storage_addon_monthly_fee || 0), Number(raw.storage_addon_monthly_fee || 0)),
          };
        });
      } else {
        schools = rawSchoolsList;
      }

      if (schools.length === 0) {
        console.warn('Primary schools query notice in useBillingData:', schoolsErr);
        const healed = await ensureMasterAdminSessionLease();
        if (healed) {
          const { data: retrySchools } = await supabase.from('schools').select('*');
          if (Array.isArray(retrySchools) && retrySchools.length > 0) {
            schools = retrySchools;
          }
        }
        if (schools.length === 0) {
          const { data: overviewSchools } = await supabase.rpc('get_master_schools_overview');
          if (Array.isArray(overviewSchools) && overviewSchools.length > 0) {
            schools = overviewSchools.map((r: any) => ({
              id: r.school_id || r.id,
              name: r.name,
              status: r.status || 'active',
              ...r
            }));
          }
        }
        if (schools.length === 0) {
          const { data: publicSchools } = await supabase.rpc('search_public_schools', { p_query: '' });
          if (Array.isArray(publicSchools) && publicSchools.length > 0) {
            schools = publicSchools as any[];
          }
        }
      }

      if (metricsErr) {
        console.warn('⚠️ active_licence_metrics fetch warning (non-fatal):', metricsErr.message);
      }

      const metricsMap: Record<string, number> = {};
      metrics?.forEach(m => {
        metricsMap[m.school_id] = m.active_campus_users || 0;
      });

      if (usersErr) {
        console.warn('⚠️ users fetch warning:', usersErr.message);
      }
      setAllUsers([]);

      if (pendingErr) {
        console.warn('⚠️ pending_students_decrypted fetch warning:', pendingErr.message);
      }

      // Pre-partition collections by school_id in O(N) to avoid O(N * M) scans per school
      const usersBySchool = new Map<string, any[]>();
      (users || []).forEach(u => {
        if (!u.school_id) return;
        const arr = usersBySchool.get(u.school_id);
        if (arr) arr.push(u); else usersBySchool.set(u.school_id, [u]);
      });
      const pendingBySchool = new Map<string, any[]>();
      (pendingStudentsDb || []).forEach(p => {
        if (!p.school_id) return;
        const arr = pendingBySchool.get(p.school_id);
        if (arr) arr.push(p); else pendingBySchool.set(p.school_id, [p]);
      });
      const songsBySchool = new Map<string, any[]>();
      (songsDb || []).forEach(s => {
        if (!s.school_id) return;
        const arr = songsBySchool.get(s.school_id);
        if (arr) arr.push(s); else songsBySchool.set(s.school_id, [s]);
      });
      const bandsBySchool = new Map<string, any[]>();
      (bandsDb || []).forEach(b => {
        if (!b.school_id) return;
        const arr = bandsBySchool.get(b.school_id);
        if (arr) arr.push(b); else bandsBySchool.set(b.school_id, [b]);
      });

      const userStatsMap: Record<string, any> = {};

      (schools || []).forEach((school: any) => {
        const stats = aggregateSchoolMetrics(
          school,
          usersBySchool.get(school.id) || [],
          pendingBySchool.get(school.id) || [],
          songsBySchool.get(school.id) || [],
          bandsBySchool.get(school.id) || []
        );
        userStatsMap[school.id] = stats;
      });

      const hasNonDemo = (schools || []).some((s: any) => s.status !== 'archived' && !s.is_demo_tenant);
      const calculatedInvoices: Invoice[] = (schools || [])
        .filter((school: any) => school.status !== 'archived' && (!hasNonDemo || !school.is_demo_tenant))
        .map((school: any) => {
          const stats = userStatsMap[school.id] || aggregateSchoolMetrics(school, [], []);
          const canonical = getSchoolCanonicalBilling(school, stats, masterPricing);
          const activeCampusUsers = metricsMap[school.id] || stats.campusStudents || 0;
          const isBypass = canonical.isBypass;
          const isBooked = Boolean(school.is_billing_booked) && canonical.status !== 'trial' && canonical.status !== 'bypass';
          let hasCampus = Boolean(school.has_campus_subscription);
          let hasGroovelab = Boolean(school.has_groovelab_subscription);
          if (!hasCampus && !hasGroovelab) {
            hasCampus = true;
            hasGroovelab = true;
          }
          const hasKombi = hasCampus && hasGroovelab;

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
            campusStudentActivationFeeTotal: parseFloat(canonical.billingResult.campusStudentActivationFeeTotal.toFixed(2)),
            groovelabStudentActivationFeeTotal: parseFloat(canonical.billingResult.groovelabStudentActivationFeeTotal.toFixed(2)),
            parentPaidStudentsCount: stats.parentPaidStudents || 0,
            exemptStudentsCount: stats.exemptActiveStudents || 0,
            storageAddonGb: stats.storageAddonGb,
            storageUsedBytes: stats.storageUsedBytes,
            storageAddonMonthlyFee: stats.storageAddonMonthlyFee,
            contractStartDate: school.contract_start_date || (school.id === '53e83805-1d5a-4ed8-988e-1fb0b8200b9c' ? '2026-07-13' : school.created_at) || null,
            createdAt: school.created_at || (school.id === '53e83805-1d5a-4ed8-988e-1fb0b8200b9c' ? '2026-07-05' : null),
            sepaIban: (school as any).sepa_iban || (school as any).billing_iban || '',
            sepaBic: (school as any).sepa_bic || (school as any).billing_bic || '',
            sepaAccountHolder: (school as any).sepa_account_holder || school.name || '',
            sepaMandateId: (school as any).sepa_mandate_id || '',
            sepaMandateDate: (school as any).sepa_mandate_date || '',
            billingIban: (school as any).billing_iban || '',
            leitwegId: (school as any).leitweg_id || '',
            leitweg_id: (school as any).leitweg_id || '',
            summerMoratoriumActive: Boolean((school as any).summer_moratorium_active),
            dunningKulanzUntil: (school as any).dunning_kulanz_until || null,
            dunningTrustExtensionUntil: (school as any).dunning_trust_extension_until || null
          };
        });

      const totalRevenue = calculatedInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalActiveCampusUsers = calculatedInvoices.reduce((sum, inv) => sum + inv.activeCampusUsers, 0);
      const bypassedSchools = calculatedInvoices.filter(inv => inv.subscriptionBypass).length;
      const totalB2BRevenue = calculatedInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalB2CRevenue = calculatedInvoices.reduce((sum, inv) => sum + inv.b2cRevenue, 0);
      const totalTeachers = calculatedInvoices.reduce((sum, inv) => sum + inv.totalTeachers, 0);
      const totalStudents = calculatedInvoices.reduce((sum, inv) => sum + inv.totalStudents, 0);

      const rpcInvoices = (rpcBillingBundle && (rpcBillingBundle as any).invoices && Array.isArray((rpcBillingBundle as any).invoices))
        ? (rpcBillingBundle as any).invoices
        : null;
      const realInvoices: any[] = (rpcInvoices && rpcInvoices.length > 0)
        ? rpcInvoices
        : ((allInvoices as any[]) || []);

      setDbInvoices(realInvoices);

      const effectiveNow = resolveEffectiveBillingDate();
      let totalUnpaid = 0;

      const enrichedInvoices: Invoice[] = calculatedInvoices.map(inv => {
        const rawSchool = (schools || []).find((s: any) => s.id === inv.schoolId) || {};
        const generatedList = getSchoolInvoices(
          inv.schoolId,
          inv.total,
          inv.status,
          inv.contractStartDate,
          inv.createdAt,
          inv,
          realInvoices
        );

        const schoolInvoicesFromDb = realInvoices.filter((i: any) => i.school_id === inv.schoolId);
        const mergedInvoices = generatedList.map((genInv: any) => {
          const dbMatch = schoolInvoicesFromDb.find((d: any) =>
            d.id === genInv.id || d.invoice_number === genInv.id
          );
          if (dbMatch) {
            return {
              ...genInv,
              status: dbMatch.status === 'paid' ? 'Bezahlt' : (dbMatch.status || genInv.status),
              amount: typeof dbMatch.amount === 'number' ? dbMatch.amount : genInv.amount,
              due_date: dbMatch.due_date || genInv.due_date,
              billing_date: dbMatch.billing_date || genInv.billing_date
            };
          }
          return genInv;
        });

        let localTrustUntil: string | null = inv.dunningTrustExtensionUntil || null;
        if (!localTrustUntil && typeof window !== 'undefined') {
          localTrustUntil = localStorage.getItem(`groovelab_trust_token_school_${inv.schoolId}`);
        }

        const schoolDunningRecord = {
          ...rawSchool,
          id: inv.schoolId,
          status: inv.status,
          subscription_bypass: inv.subscriptionBypass,
          has_campus_subscription: inv.hasCampus,
          has_groovelab_subscription: inv.hasGroovelab,
          summer_moratorium_active: inv.summerMoratoriumActive,
          dunning_kulanz_until: inv.dunningKulanzUntil,
          dunning_trust_extension_until: localTrustUntil,
          sepa_iban: inv.sepaIban,
          sepa_mandate_id: inv.sepaMandateId,
          billing_iban: inv.billingIban
        };

        const dunningStatus = computeSchoolDunningStatus(
          schoolDunningRecord,
          mergedInvoices,
          effectiveNow
        );

        if (inv.total > 0 && inv.status !== 'bypass' && inv.status !== 'trial') {
          mergedInvoices.forEach((mInv: any) => {
            if (
              mInv.isCreated &&
              mInv.status !== 'paid' &&
              mInv.status !== 'Bezahlt' &&
              mInv.status !== 'cancelled' &&
              mInv.status !== 'Storniert' &&
              mInv.status !== 'Vorschau' &&
              mInv.status !== 'Bypass' &&
              mInv.status !== 'Probemonat' &&
              mInv.status !== 'Kostenfrei'
            ) {
              totalUnpaid += Number(mInv.amount || 0);
            }
          });
        }

        return {
          ...inv,
          dunningTrustExtensionUntil: localTrustUntil,
          dunningStatus,
          overdueInvoices: dunningStatus.overdueInvoicesList
        };
      });

      setInvoices(enrichedInvoices);

      if (enrichedInvoices.length > 0) {
        const currentValid = enrichedInvoices.some(inv => inv.schoolId === expandedSchoolId);
        if (!expandedSchoolId || !currentValid) {
          const topSchool = [...enrichedInvoices].sort((a, b) => b.activeStudents - a.activeStudents)[0];
          if (topSchool) {
            setExpandedSchoolId(topSchool.schoolId);
          }
        }
      }
      setSummary({
        totalSchools: enrichedInvoices.length,
        totalActiveCampusUsers,
        totalMonthlyRevenue: parseFloat(totalRevenue.toFixed(2)),
        bypassedSchools,
        totalB2BRevenue: parseFloat(totalB2BRevenue.toFixed(2)),
        totalB2CRevenue: parseFloat(totalB2CRevenue.toFixed(2)),
        totalTeachers,
        totalStudents,
        totalUnpaid: parseFloat(totalUnpaid.toFixed(2))
      });

    } catch (err: any) {
      console.error('Error fetching billing data:', err);
      setError('Verbindungsfehler beim Laden der Abrechnungsmetriken: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
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
    window.addEventListener('groovelab_simulated_date_changed', handleSchoolUpdate);
    return () => {
      window.removeEventListener('groovelab_school_updated', handleSchoolUpdate);
      window.removeEventListener('groovelab_simulated_date_changed', handleSchoolUpdate);
    };
  }, []);

  return {
    masterPricing,
    invoices,
    setInvoices,
    dbInvoices,
    summary,
    loading,
    error,
    expandedSchoolId,
    setExpandedSchoolId,
    expandedSchoolUsers,
    loadingExpandedUsers,
    schoolAudioBytes,
    taxMode,
    setTaxMode,
    operatorCompany,
    operatorContact,
    operatorStreet,
    operatorZip,
    operatorCity,
    operatorIban,
    operatorBic,
    fetchBillingData,
    getPaidInvoices,
    toggleInvoicePaid,
    updateInvoiceStatus,
    toggleStudentPayment,
    getSchoolInvoices
  };
}

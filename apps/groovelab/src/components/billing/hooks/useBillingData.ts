import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useMasterPricing } from '../../../context/MasterPricingContext';
import { aggregateSchoolMetrics, getSchoolCanonicalBilling } from '../../../domain/schoolMetricsAggregator';
import { computeSchoolStorageUsedBytes } from '../../../utils/audioStorageHelper';
import { Invoice, PlatformSummary, getSchoolNumericId } from '../types';

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

  // Operator Stammdaten
  const [operatorCompany, setOperatorCompany] = useState('Patrick Huber (Einzelunternehmer)');
  const [operatorContact, setOperatorContact] = useState('Patrick Huber');
  const [operatorStreet, setOperatorStreet] = useState('Karl-Fürstenberg-Str. 59');
  const [operatorZip, setOperatorZip] = useState('79618');
  const [operatorCity, setOperatorCity] = useState('Rheinfelden');
  const [operatorIban, setOperatorIban] = useState('DE89 3704 0044 0532 9482 11');
  const [operatorBic, setOperatorBic] = useState('WELADED1XYZ');

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

      // 2. Fetch schools with resilient fallback
      let { data: schools, error: schoolsErr } = await supabase
        .from('schools')
        .select('*');

      if (schoolsErr) {
        console.error('⚠️ Primary schools fetch error:', schoolsErr);
        throw schoolsErr;
      }

      // Merge local overrides from localStorage
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

      // 3. Fetch active license metrics
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
      const totalB2BRevenue = calculatedInvoices.reduce((sum, inv) => sum + inv.total, 0);
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
    return () => {
      window.removeEventListener('groovelab_school_updated', handleSchoolUpdate);
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

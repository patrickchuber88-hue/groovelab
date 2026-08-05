import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import QRCode from 'react-qr-code';
import { InvoicePreviewModal } from './InvoicePreviewModal';
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
  BookOpen
} from 'lucide-react';

interface Invoice {
  schoolId: string;
  schoolName: string;
  schoolStreet: string;
  schoolZipCode: string;
  schoolCity: string;
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

  // Custom Breakdown Fields
  activeStudentFee: number;
  totalTeachersCount: number;
  totalEmployeesCount: number;
  passiveStudentsCount: number;
  teachersHostingFee: number;
  passiveStudentsHostingFee: number;
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

  const toggleYearExpanded = (year: number) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  const getPaidInvoices = (schoolId: string): string[] => {
    if (typeof window === 'undefined') return [];
    return JSON.parse(localStorage.getItem(`paid_invoices_${schoolId}`) || '[]');
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
  };

  const getSchoolInvoices = (schoolId: string, currentInvoiceAmount: number, schoolStatus?: string) => {
    const storedDate = localStorage.getItem(`contractStartDate_${schoolId}`) || localStorage.getItem('contractStartDate');
    const contractDateObj = storedDate ? new Date(storedDate) : new Date('2026-07-01T12:00:00Z');
    
    const startYear = contractDateObj.getFullYear();
    const startMonth = contractDateObj.getMonth() + 1;

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
      const invId = `RE-${numId}-${yy}${monthStr}-01`;
      
      const lastDay = new Date(y, m, 0).getDate();
      const monthName = deMonths[m];
      const invoiceDateStr = `${lastDay}. ${monthName} ${y}`;
      
      const isCurrent = (y === currentYear && m === currentMonth);
      const creationTime = new Date(y, m - 1, lastDay, 23, 58, 0);
      const isCreated = systemDate.getTime() >= creationTime.getTime();
      
      const paidInvoicesList = getPaidInvoices(schoolId);
      const isMarkedPaid = paidInvoicesList.includes(invId);

      const invoiceAmount = currentInvoiceAmount;
      const status = (currentInvoiceAmount === 0.00)
        ? (schoolStatus === 'bypass' ? 'Bypass' : schoolStatus === 'trial' ? 'Probemonat' : 'Kostenfrei')
        : (isMarkedPaid ? 'Bezahlt' : (isCreated ? 'Versendet' : 'Vorschau'));

      list.push({
        id: invId,
        date: invoiceDateStr,
        monthName,
        year: String(y),
        amount: invoiceAmount,
        status,
        isCreated,
        isCurrentMonth: isCurrent
      });

      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    
    return list.reverse();
  };

  useEffect(() => {
    fetchBillingData();
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

  const getSchoolNumericId = (id: string): number => {
    if (id === '74713df2-6176-4a41-a8cd-9fbebe34e9b8') return 1;
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 98) + 2;
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
            amount: amount
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
      
      const rateCampus = billingSettings?.price_module_campus ?? 7.99;
      const rateGroovelab = billingSettings?.price_module_groovelab ?? 4.99;
      const rateTeacher = billingSettings?.price_user_teacher ?? 0.49;
      const rateStudent = billingSettings?.price_user_student ?? 0.49;

      // 2. Fetch schools
      const { data: schools, error: schoolsErr } = await supabase
        .from('schools')
        .select('id, name, street, house_number, zip_code, city, subscription_type, has_campus_subscription, has_groovelab_subscription, has_kombi_discount, subscription_bypass, status, is_trial, user_quota, pending_user_quota, student_billing_option');

      if (schoolsErr) throw schoolsErr;

      // 3. Fetch active license metrics
      const { data: metrics, error: metricsErr } = await supabase
        .from('active_licence_metrics')
        .select('school_id, active_campus_users');

      if (metricsErr) throw metricsErr;

      const metricsMap: Record<string, number> = {};
      metrics?.forEach(m => {
        metricsMap[m.school_id] = m.active_campus_users || 0;
      });

      // 4. Fetch users to compute actual student & teacher counts (Optimized payload without large text columns)
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('school_id, role, roles, is_active, is_campus_active, is_groovelab_active, is_trial, student_billing_payment_method, student_billing_cash_paid, exempt_from_direct_billing');

      if (usersErr) throw usersErr;
      setAllUsers([]);

      // 4b. Fetch pending students
      const { data: pendingStudentsDb, error: pendingErr } = await supabase
        .from('pending_students_decrypted')
        .select('id, school_id');
      
      const pendingCountMap: Record<string, number> = {};
      pendingStudentsDb?.forEach(p => {
        if (p.school_id) {
          pendingCountMap[p.school_id] = (pendingCountMap[p.school_id] || 0) + 1;
        }
      });

      const userStatsMap: Record<string, { 
        totalStudents: number; 
        activeStudents: number; 
        premiumStudents: number;
        exemptActiveStudents: number;
        totalTeachers: number;
        activeTeachers: number;
        totalEmployees: number;
        activeEmployees: number;
      }> = {};

      users?.forEach(u => {
        if (!userStatsMap[u.school_id]) {
          userStatsMap[u.school_id] = { 
            totalStudents: 0, 
            activeStudents: 0, 
            premiumStudents: 0,
            exemptActiveStudents: 0,
            totalTeachers: 0,
            activeTeachers: 0,
            totalEmployees: 0,
            activeEmployees: 0
          };
        }
        if (u.role === 'student') {
          userStatsMap[u.school_id].totalStudents++;
          // Active student definition (premium/campus active)
          if (u.is_campus_active) {
            userStatsMap[u.school_id].activeStudents++;
            userStatsMap[u.school_id].premiumStudents++;
            if (u.exempt_from_direct_billing) {
              userStatsMap[u.school_id].exemptActiveStudents++;
            }
          }
        }
        
        // Count employees matching Secretary logic (admins & secretaries are free)
        const isEmployee = u.role === 'admin' || u.role === 'secretary' ||
          (u.roles && (u.roles.includes('admin') || u.roles.includes('secretary')));
        if (isEmployee) {
          userStatsMap[u.school_id].totalEmployees++;
          if (u.is_active) {
            userStatsMap[u.school_id].activeEmployees++;
          }
        }
        
        // Count teachers (exclude those who are also employees/admins)
        const isTeacher = (u.role === 'teacher' || (u.roles && u.roles.includes('teacher'))) && !isEmployee;
        if (isTeacher) {
          userStatsMap[u.school_id].totalTeachers++;
          if (u.is_active) {
            userStatsMap[u.school_id].activeTeachers++;
          }
        }
      });

      const calculatedInvoices: Invoice[] = (schools || [])
        .filter(school => !school.name.toLowerCase().includes('groove academy'))
        .map(school => {
        const activeCampusUsers = metricsMap[school.id] || 0;
        
        const stats = userStatsMap[school.id] || { 
          totalStudents: 0, 
          activeStudents: 0, 
          premiumStudents: 0, 
          exemptActiveStudents: 0,
          totalTeachers: 0, 
          activeTeachers: 0,
          totalEmployees: 0,
          activeEmployees: 0
        };

        const pendingStudentsCount = pendingCountMap[school.id] || 0;
        const totalStudents = stats.totalStudents + pendingStudentsCount;
        const activeStudents = stats.activeStudents;
        const premiumStudents = stats.premiumStudents;
        const exemptActiveStudents = stats.exemptActiveStudents || 0;
        
        const teachersCount = stats.activeTeachers; // Fix: use active count
        const employeesCount = stats.activeEmployees; // Fix: use active count

        // MODULE BASE FEE CALCULATION
        let baseFee = 0;
        if (school.has_campus_subscription) baseFee += rateCampus;
        if (school.has_groovelab_subscription) baseFee += rateGroovelab;

        // COMBINATION DISCOUNT
        const hasKombi = school.has_kombi_discount || (school.has_campus_subscription && school.has_groovelab_subscription);
        const kombiDiscountAmount = hasKombi ? 2.99 : 0.00;

        // STAFF FEE (teachers & employees)
        const staffFee = teachersCount * 0.49;
        
        // PASSIVE STUDENTS FEE (0.09 € per passive student profile)
        const isPartial = school.student_billing_option === 'student_partial';
        const isFullDirect = school.student_billing_option === 'student_full';
        const passiveStudentsCount = isPartial ? totalStudents : (isFullDirect ? 0 : Math.max(0, totalStudents - activeStudents));
        const passiveStudentsFee = passiveStudentsCount * 0.09;

        // Profile-Levy (B2B User Fee)
        const userFee = staffFee + passiveStudentsFee;

        // ACTIVE STUDENTS FEE (only if billing option is option2 / school pays monthly per active student)
        const isSchoolPayer = school.student_billing_option === 'option2' || school.student_billing_option === 'option3_2' || school.student_billing_option === 'option3_3';
        const activeStudentFee = (isSchoolPayer && school.student_billing_option === 'option2') ? activeStudents * 0.49 : 0.00;
        
        // B2C REVENUE (e.g. from student upgrades)
        const b2cRevenue = premiumStudents * 9.99;

        // Subtotal B2B
        const subtotal = Math.max(0, (baseFee - kombiDiscountAmount) + userFee + activeStudentFee);
        const isBypass = school.subscription_bypass || false;
        let status: 'trial' | 'active' | 'bypass' | 'suspended' = 'active';
        if (school.status === 'suspended') {
          status = 'suspended';
        } else if (isBypass) {
          status = 'bypass';
        } else if (school.is_trial) {
          status = 'trial';
        }

        const total = (isBypass || status === 'trial' || status === 'suspended') ? 0.00 : subtotal;

        return {
          schoolId: school.id,
          schoolName: school.name,
          schoolStreet: school.street ? `${school.street} ${school.house_number || ''}`.trim() : '',
          schoolZipCode: school.zip_code || '',
          schoolCity: school.city || '',
          subscriptionType: school.subscription_type === 'solo' ? 'solo' : 'standard',
          hasCampus: school.has_campus_subscription || false,
          hasGroovelab: school.has_groovelab_subscription || false,
          hasKombiDiscount: hasKombi,
          subscriptionBypass: isBypass,
          activeCampusUsers,
          baseFee,
          userFee: parseFloat(userFee.toFixed(2)),
          kombiDiscountAmount,
          subtotal: parseFloat(subtotal.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          status,
          
          totalStudents,
          activeStudents,
          premiumStudents,
          totalTeachers: teachersCount,
          activeTeachers: stats.activeTeachers,
          b2bRevenue: parseFloat(total.toFixed(2)),
          b2cRevenue: parseFloat(b2cRevenue.toFixed(2)),
          userQuota: school.user_quota || 150,
          pendingUserQuota: school.pending_user_quota,
          studentBillingOption: school.student_billing_option || 'option1',
          
          // Custom Breakdown Fields
          activeStudentFee: parseFloat(activeStudentFee.toFixed(2)),
          totalTeachersCount: teachersCount,
          totalEmployeesCount: employeesCount,
          passiveStudentsCount,
          teachersHostingFee: parseFloat(staffFee.toFixed(2)),
          passiveStudentsHostingFee: parseFloat(passiveStudentsFee.toFixed(2))
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
        const schoolInvoicesFromDb = realInvoices.filter(i => i.school_id === inv.schoolId);
        const storedDate = localStorage.getItem(`contractStartDate_${inv.schoolId}`) || localStorage.getItem('contractStartDate');
        const contractDateObj = storedDate ? new Date(storedDate) : new Date('2026-07-01T12:00:00Z');
        const startYear = contractDateObj.getFullYear();
        const startMonth = contractDateObj.getMonth() + 1;
        const systemDate = new Date();
        const currentYear = systemDate.getFullYear();
        const currentMonth = systemDate.getMonth() + 1;
        
        let y = startYear;
        let m = startMonth;
        while (y < currentYear || (y === currentYear && m <= currentMonth)) {
          const monthStr = m < 10 ? `0${m}` : `${m}`;
          const invId = `RE-${y}-${monthStr}`;
          
          const dbMatch = schoolInvoicesFromDb.find(i => i.id === invId || i.id === `INV-${y}-${monthStr}`);
          const paidInvoicesList = JSON.parse(localStorage.getItem(`paid_invoices_${inv.schoolId}`) || '[]');
          const isMarkedPaid = paidInvoicesList.includes(invId);
          
          let status = 'open';
          let amount = inv.total;
          if (dbMatch) {
            status = dbMatch.status;
            amount = dbMatch.amount;
          } else if (isMarkedPaid) {
            status = 'paid';
          }
          
          if (status !== 'paid' && status !== 'cancelled' && status !== 'Bezahlt') {
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
      setError('Verbindungsfehler beim Laden der Abrechnungsmetriken.');
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
      'Aktive Campus-Lizenzen',
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

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Abrechnungsliste_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const selectedInv = invoices.find(i => i.schoolId === expandedSchoolId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {/* Dynamic styles injector */}
      <style>{`
        .billing-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: default;
        }
        .billing-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
          border-color: rgba(52, 168, 83, 0.15);
          background: rgba(255, 255, 255, 0.95);
        }
        .billing-card:hover .bc-icon-wrapper {
          background: rgba(52, 168, 83, 0.06) !important;
          color: #34a853 !important;
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
            <CreditCard style={{ color: '#34a853' }} size={28} /> Abrechnungen &amp; Abonnements
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 550 }}>
            Globale Übersicht über alle Schul-Lizenzgebühren und privaten App-Upgrades von Campus-Groovelab.
          </p>
        </div>
        
        <button
          onClick={fetchBillingData}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '10px',
            padding: '8px 16px',
            fontWeight: 600,
            fontSize: '0.8rem',
            color: '#334155',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.01)'
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e6f4ea'; e.currentTarget.style.color = '#34a853'; e.currentTarget.style.borderColor = 'rgba(52, 168, 83, 0.2)'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'; e.currentTarget.style.color = '#334155'; e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)'; }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Aktualisieren
        </button>
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
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Monatlicher Lizenzumsatz</span>
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
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Upgrade-Umsatz (Eltern)</span>
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
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Aktive Schülerlizenzen</span>
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
                  background: 'transparent',
                  border: '1px solid rgba(52, 168, 83, 0.2)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#34a853',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e6f4ea'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                CSV Export
              </button>
            </div>
          </div>

          {/* School list cards */}
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
                      padding: '14px 18px',
                      borderRadius: '16px',
                      background: isSelected ? 'rgba(52, 168, 83, 0.04)' : '#ffffff',
                      border: `1px solid ${isSelected ? 'rgba(52, 168, 83, 0.15)' : 'rgba(15, 23, 42, 0.05)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isSelected ? '0 4px 12px rgba(52, 168, 83, 0.03)' : 'none'
                    }}
                    className="school-list-item"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: isSelected ? '#34a853' : '#f8fafc',
                        color: isSelected ? '#ffffff' : '#475569',
                        border: '1px solid rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem'
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
                            color: inv.status === 'trial' ? '#b06000' : inv.status === 'bypass' ? '#dc2626' : inv.status === 'suspended' ? '#7f1d1d' : '#34a853',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em'
                          }}>
                            {inv.status === 'trial' ? 'Probe' : inv.status === 'bypass' ? 'Bypass' : inv.status === 'suspended' ? 'Gesperrt' : 'Aktiv'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                            {inv.totalStudents} Schüler | {inv.totalTeachers} Lehrer
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: isSelected ? '#34a853' : '#0f172a' }}>
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
                    borderRadius: '8px',
                    background: inv.status === 'trial' ? '#fff8e1' : inv.status === 'bypass' ? '#fee2e2' : inv.status === 'suspended' ? '#fee2e2' : '#e6f4ea',
                    color: inv.status === 'trial' ? '#b06000' : inv.status === 'bypass' ? '#dc2626' : inv.status === 'suspended' ? '#7f1d1d' : '#34a853',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    Abonnement: {inv.status === 'trial' ? 'Probezeit' : inv.status === 'bypass' ? 'Gebühren-Bypass' : inv.status === 'suspended' ? 'Gesperrt' : 'Aktiv'}
                  </span>
                </div>

                {/* Subscriptions Card & Monthly rate side-by-side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '20px' }}>
                  {/* Subscription card */}
                  <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid rgba(15, 23, 42, 0.04)' }}>
                    <h4 style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>Lizenz-Abonnement</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '6px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tariftyp</span>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem' }}>{inv.subscriptionType === 'solo' ? 'Solo-Lizenz' : 'Standard-Tarif'}</span>
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
                          {inv.hasKombiDiscount ? 'Aktiv (-2,99 €)' : 'Keiner'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Breakdown Card */}
                  <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0' }}>Gebührenaufstellung</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>Modul-Grundpreis</span>
                          <span style={{ fontWeight: 650, color: '#0f172a' }}>{inv.baseFee.toFixed(2).replace('.', ',')} €</span>
                        </div>
                        {inv.hasKombiDiscount && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#34a853' }}>
                            <span style={{ fontWeight: 600 }}>Kombi-Vorteilsrabatt</span>
                            <span style={{ fontWeight: 600 }}>-{(2.99).toFixed(2).replace('.', ',')} €</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.76rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>Infrastruktur- & Server-Hosting</span>
                            <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{inv.totalTeachersCount} Lehrkräfte aktiv × 0,49 €</span>
                          </div>
                          <span style={{ fontWeight: 650, color: '#0f172a', paddingTop: '2px' }}>{inv.teachersHostingFee.toFixed(2).replace('.', ',')} €</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.76rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>Datenbank- & Speicher-Hosting</span>
                            <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{inv.passiveStudentsCount} Schüler passiv × 0,09 €</span>
                          </div>
                          <span style={{ fontWeight: 650, color: '#0f172a', paddingTop: '2px' }}>{inv.passiveStudentsHostingFee.toFixed(2).replace('.', ',')} €</span>
                        </div>
                        {inv.activeStudentFee > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.76rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span style={{ color: '#0f172a', fontWeight: 600 }}>Infrastruktur-Bereitstellung</span>
                              <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{Math.round(inv.activeStudentFee / 0.49)} Schüler aktiv × 0,49 €</span>
                            </div>
                            <span style={{ fontWeight: 650, color: '#0f172a', paddingTop: '2px' }}>{inv.activeStudentFee.toFixed(2).replace('.', ',')} €</span>
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
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Monatlicher Beitrag:</span>
                      <strong style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34a853' }}>
                        {inv.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Direct payment students list if self-paying enabled */}
                {isSelbstzahler && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '18px' }}>
                    <h4 style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Schüler-Freischaltungsstatus</h4>
                    {loadingExpandedUsers ? (
                      <div style={{ padding: '20px 0', textAlign: 'center', color: '#86868b', fontSize: '0.8rem' }}>
                        Lade Schülerdaten...
                      </div>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                      }}>
                        {/* Active Students */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px', borderBottom: '1px solid rgba(0, 0, 0, 0.04)' }}>
                            <span style={{ fontSize: '0.74rem', color: '#0f172a', fontWeight: 700 }}>Aktiv freigeschaltet ({activePaidStudents.length})</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '140px', overflowY: 'auto' }}>
                            {activePaidStudents.length === 0 ? (
                              <span style={{ fontSize: '0.72rem', color: '#86868b', fontStyle: 'italic', padding: '4px 0' }}>Keine aktiven Schüler</span>
                            ) : (
                              activePaidStudents.map(s => (
                                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                  <span style={{ color: '#334155', fontWeight: 550 }}>{s.first_name} {s.last_name ? s.last_name[0] + '.' : ''}</span>
                                  <button 
                                    type="button"
                                    onClick={() => toggleStudentPayment(s.id, true)}
                                    style={{ border: 'none', background: 'none', color: '#dc2626', fontWeight: 700, cursor: 'pointer', fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px' }}
                                    onMouseOver={(e: any) => e.currentTarget.style.background = '#fce8e6'}
                                    onMouseOut={(e: any) => e.currentTarget.style.background = 'none'}
                                  >
                                    Sperren
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Pending Students */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px', borderBottom: '1px solid rgba(0, 0, 0, 0.04)' }}>
                            <span style={{ fontSize: '0.74rem', color: '#0f172a', fontWeight: 700 }}>Ausstehend ({pendingStudents.length})</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '140px', overflowY: 'auto' }}>
                            {pendingStudents.length === 0 ? (
                              <span style={{ fontSize: '0.72rem', color: '#86868b', fontStyle: 'italic', padding: '4px 0' }}>Keine ausstehenden Schüler</span>
                            ) : (
                              pendingStudents.map(s => (
                                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: '#334155', fontWeight: 550 }}>{s.first_name} {s.last_name ? s.last_name[0] + '.' : ''}</span>
                                    <span style={{ fontSize: '0.6rem', color: '#86868b' }}>{s.is_trial ? 'Probezeit' : 'Zahlung offen'}</span>
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => toggleStudentPayment(s.id, false)}
                                    style={{ border: 'none', background: '#e6f4ea', color: '#34a853', fontWeight: 700, cursor: 'pointer', fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px' }}
                                    onMouseOver={(e: any) => e.currentTarget.style.background = '#d1fae5'}
                                    onMouseOut={(e: any) => e.currentTarget.style.background = '#e6f4ea'}
                                  >
                                    Aktivieren
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Basic Students */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px', borderBottom: '1px solid rgba(0, 0, 0, 0.04)' }}>
                            <span style={{ fontSize: '0.74rem', color: '#0f172a', fontWeight: 700 }}>Basic Lizenzen (Kostenlos) ({freeStudents.length})</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '140px', overflowY: 'auto' }}>
                            {freeStudents.length === 0 ? (
                              <span style={{ fontSize: '0.72rem', color: '#86868b', fontStyle: 'italic', padding: '4px 0' }}>Keine basic Schüler</span>
                            ) : (
                              freeStudents.map(s => (
                                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                  <span style={{ color: '#334155', fontWeight: 550 }}>{s.first_name} {s.last_name ? s.last_name[0] + '.' : ''}</span>
                                  <button 
                                    type="button"
                                    onClick={() => toggleStudentPayment(s.id, false)}
                                    style={{ border: 'none', background: 'none', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px' }}
                                    onMouseOver={(e: any) => e.currentTarget.style.background = '#f1f5f9'}
                                    onMouseOut={(e: any) => e.currentTarget.style.background = 'none'}
                                  >
                                    Freischalten
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Invoices History section as beautiful receipt items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Abrechnungsverlauf</h4>
                    <button
                      type="button"
                      onClick={() => createManualInvoice(inv.schoolId)}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#34a853',
                        border: '1px solid rgba(52, 168, 83, 0.2)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      onMouseOver={(e: any) => { e.currentTarget.style.background = '#e6f4ea'; }}
                      onMouseOut={(e: any) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      + Manuelle Rechnung
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
                    {(() => {
                      const generated = getSchoolInvoices(inv.schoolId, inv.total, inv.status);
                      const dbInvs = dbInvoices.filter(i => i.school_id === inv.schoolId);
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
                        ...generated.map(g => ({
                          id: g.id,
                          billing_date: g.date,
                          year: g.year ? parseInt(g.year) : new Date().getFullYear(),
                          amount: g.amount,
                          status: g.status === 'Bezahlt' ? 'paid' : 'open',
                          type: 'INF',
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

                      const unpaidInvoices = allCombined.filter(i => i.status === 'open' || i.status === 'overdue');
                      const archivedInvoices = allCombined.filter(i => i.status !== 'open' && i.status !== 'overdue');

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
                        return (
                          <div key={invoice.id} className="receipt-card" style={{ opacity: invoice.status === 'cancelled' ? 0.6 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8rem' }}>
                                  {invoice.amount < 0 ? invoice.id.replace('INV-', 'GS-') : invoice.id.replace('INV-', 'RE-')}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 550 }}>{invoice.billing_date}</span>
                              </div>
                              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem' }}>
                                {Number(invoice.amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                                    status: invoice.status,
                                    type: invoice.type,
                                    isCurrentMonth: invoice.isCurrentMonth,
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
                                    subscriptionBypass: inv.subscriptionBypass,
                                    subtotal: inv.subtotal,
                                    studentBillingOption: inv.studentBillingOption,
                                    isTrialMonth: invoice.isTrialMonth
                                  });
                                }}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid rgba(0, 0, 0, 0.08)',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  color: '#1e293b',
                                  cursor: 'pointer'
                                }}
                                onMouseOver={(e: any) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                onMouseOut={(e: any) => { e.currentTarget.style.background = 'transparent'; }}
                              >
                                Beleg ansehen
                              </button>
                              {invoice.isDb ? (
                                <select
                                  value={invoice.status}
                                  onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                                  style={{
                                    padding: '4px 6px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(0, 0, 0, 0.08)',
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
                                    padding: '4px 6px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(0, 0, 0, 0.08)',
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
                              )}
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {/* Floating Unpaid Sektion */}
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
                                <span>Ausstehende Rechnungen ({unpaidInvoices.length})</span>
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
      
    </div>
  );
}

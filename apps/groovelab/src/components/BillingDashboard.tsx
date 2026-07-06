import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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

export function BillingDashboard() {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  const [tick, setTick] = useState(0);

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

  const getSchoolInvoices = (schoolId: string, currentInvoiceAmount: number) => {
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
      const invId = `RE-${y}-${monthStr}`;
      
      const lastDay = new Date(y, m, 0).getDate();
      const monthName = deMonths[m];
      const invoiceDateStr = `${lastDay}. ${monthName} ${y}`;
      
      const isCurrent = (y === currentYear && m === currentMonth);
      const creationTime = new Date(y, m - 1, lastDay, 23, 58, 0);
      const isCreated = systemDate.getTime() >= creationTime.getTime();
      
      const paidInvoicesList = getPaidInvoices(schoolId);
      const isMarkedPaid = paidInvoicesList.includes(invId);

      const status = isMarkedPaid ? 'Bezahlt' : (isCreated ? 'Versendet' : 'Vorschau');

      list.push({
        id: invId,
        date: invoiceDateStr,
        monthName,
        year: String(y),
        amount: isCurrent ? currentInvoiceAmount : (currentInvoiceAmount > 0 ? currentInvoiceAmount : 39.90),
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

  const createManualInvoice = async (schoolId: string) => {
    const amountStr = prompt("Geben Sie den Rechnungsbetrag ein (z.B. 49,90):");
    if (!amountStr) return;
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount)) return alert("Ungültiger Betrag!");

    const title = prompt("Verwendungszweck / Name der Position:", "Manuelle Abrechnung / Korrektur");
    if (!title) return;

    try {
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
      const nextSeq = String((count || 0) + 1).padStart(4, '0');
      const invoiceId = `INV-${new Date().getFullYear()}-${nextSeq}`;

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
      
      const rateCampus = billingSettings?.price_module_campus ?? 7.99;
      const rateGroovelab = billingSettings?.price_module_groovelab ?? 4.99;
      const rateTeacher = billingSettings?.price_user_teacher ?? 0.49;
      const rateStudent = billingSettings?.price_user_student ?? 0.49;

      // 2. Fetch schools
      const { data: schools, error: schoolsErr } = await supabase
        .from('schools')
        .select('id, name, subscription_type, has_campus_subscription, has_groovelab_subscription, has_kombi_discount, subscription_bypass, status, is_trial, user_quota, pending_user_quota, student_billing_option');

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

      // 4. Fetch users to compute actual student & teacher counts
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, school_id, role, roles, is_active, is_campus_active, is_groovelab_active, is_trial, student_billing_payment_method, student_billing_cash_paid, first_name, last_name');

      if (usersErr) throw usersErr;
      setAllUsers(users || []);

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
        totalTeachers: number;
        activeTeachers: number;
        totalEmployees: number;
      }> = {};

      users?.forEach(u => {
        if (!userStatsMap[u.school_id]) {
          userStatsMap[u.school_id] = { 
            totalStudents: 0, 
            activeStudents: 0, 
            premiumStudents: 0,
            totalTeachers: 0,
            activeTeachers: 0,
            totalEmployees: 0
          };
        }
        if (u.role === 'student') {
          userStatsMap[u.school_id].totalStudents++;
          // Active student definition (premium/campus active)
          if (u.is_campus_active) {
            userStatsMap[u.school_id].activeStudents++;
            userStatsMap[u.school_id].premiumStudents++;
          }
        }
        
        // Count teachers matching Secretary logic
        const isTeacher = u.role === 'teacher' || (u.roles && u.roles.includes('teacher'));
        if (isTeacher) {
          userStatsMap[u.school_id].totalTeachers++;
          if (u.is_active) {
            userStatsMap[u.school_id].activeTeachers++;
          }
        }
        
        // Count employees matching Secretary logic
        const isEmployee = u.role === 'admin' || u.role === 'secretary' ||
          (u.roles && (u.roles.includes('admin') || u.roles.includes('secretary')));
        if (isEmployee) {
          userStatsMap[u.school_id].totalEmployees++;
        }
      });

      const calculatedInvoices: Invoice[] = (schools || []).map(school => {
        const activeCampusUsers = metricsMap[school.id] || 0;
        
        const stats = userStatsMap[school.id] || { 
          totalStudents: 0, 
          activeStudents: 0, 
          premiumStudents: 0, 
          totalTeachers: 0, 
          activeTeachers: 0,
          totalEmployees: 0
        };

        const pendingStudentsCount = pendingCountMap[school.id] || 0;
        const totalStudents = stats.totalStudents + pendingStudentsCount;
        const activeStudents = stats.activeStudents;
        const premiumStudents = stats.premiumStudents;
        
        const teachersCount = stats.totalTeachers;
        const employeesCount = stats.totalEmployees;

        // MODULE BASE FEE CALCULATION
        let baseFee = 0;
        if (school.has_campus_subscription) baseFee += rateCampus;
        if (school.has_groovelab_subscription) baseFee += rateGroovelab;

        // COMBINATION DISCOUNT
        const hasKombi = school.has_kombi_discount || (school.has_campus_subscription && school.has_groovelab_subscription);
        const kombiDiscountAmount = hasKombi ? 2.99 : 0.00;

        // STAFF FEE (teachers & employees)
        const staffFee = (teachersCount + employeesCount) * 0.49;
        
        // PASSIVE STUDENTS FEE (0.09 € per passive student profile)
        const isPartial = school.student_billing_option === 'student_partial';
        const passiveStudentsCount = isPartial ? totalStudents : Math.max(0, totalStudents - activeStudents);
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
          passiveStudentsCount
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
      'Servicegebuehr Profile (EUR)',
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Dynamic styles injector */}
      <style>{`
        .billing-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.03);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          gap: 20px;
          cursor: default;
        }
        .billing-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.06);
          border-color: rgba(79, 70, 229, 0.2);
          background: rgba(255, 255, 255, 0.95);
        }
        .billing-card:hover .bc-icon-wrapper {
          background: rgba(79, 70, 229, 0.08) !important;
          color: #4f46e5 !important;
        }
 
        .filter-btn {
          padding: 8px 16px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.85rem;
          border: 1px solid rgba(0, 0, 0, 0.05);
          background: rgba(255, 255, 255, 0.6);
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
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
          background: #4f46e5 !important;
          color: #ffffff !important;
          border-color: #4f46e5 !important;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
        }
 
        .billing-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 10px;
          text-align: left;
        }
        .billing-table th {
          padding: 12px 16px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .billing-row {
          background: transparent;
          transition: all 0.2s ease;
        }
        .billing-row td {
          padding: 16px;
          font-size: 0.88rem;
          font-weight: 500;
          color: #1e293b;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-top: 1px solid rgba(0, 0, 0, 0.03);
          border-bottom: 1px solid rgba(0, 0, 0, 0.03);
          transition: all 0.2s ease;
        }
        .billing-row td:first-child {
          border-left: 1px solid rgba(0, 0, 0, 0.03);
          border-top-left-radius: 16px;
          border-bottom-left-radius: 16px;
        }
        .billing-row td:last-child {
          border-right: 1px solid rgba(0, 0, 0, 0.03);
          border-top-right-radius: 16px;
          border-bottom-right-radius: 16px;
        }
        .billing-row:hover td {
          background: rgba(255, 255, 255, 0.95);
          border-color: rgba(79, 70, 229, 0.1);
        }
        .billing-row-expanded td {
          border-bottom: none !important;
          background: rgba(255, 255, 255, 0.9) !important;
        }
        .billing-row-expanded td:first-child {
          border-bottom-left-radius: 0 !important;
        }
        .billing-row-expanded td:last-child {
          border-bottom-right-radius: 0 !important;
        }
 
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .status-badge-active {
          color: #137333;
          background: #e6f4ea;
        }
        .status-badge-trial {
          color: #b06000;
          background: #fff8e1;
        }
        .status-badge-bypass {
          color: #475569;
          background: #f1f5f9;
        }
        .status-badge-suspended {
          color: #7f1d1d;
          background: #fee2e2;
        }
 
        .action-icon-btn {
          border: none;
          background: none;
          cursor: pointer;
          color: #64748b;
          display: flex;
          align-items: center;
          justifyContent: center;
          padding: 8px;
          border-radius: 10px;
          transition: all 0.15s;
        }
        .action-icon-btn:hover {
          color: #4f46e5;
          background: rgba(79, 70, 229, 0.08);
        }   }

        .invoice-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.04);
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.01);
        }
      `}</style>

      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
        paddingBottom: '24px',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CreditCard style={{ color: '#4f46e5' }} size={32} /> Abrechnungen &amp; Abonnements
          </h2>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
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
            borderRadius: '12px',
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: '0.85rem',
            color: '#334155',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e0e7ff'; e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.2)'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'; e.currentTarget.style.color = '#334155'; e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)'; }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Aktualisieren
        </button>
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#4f46e5',
          backgroundColor: '#e0e7ff',
          border: '1px solid rgba(79, 70, 229, 0.2)',
          padding: '16px',
          borderRadius: '16px',
          fontSize: '0.88rem',
          fontWeight: 600
        }}>
          <ShieldAlert size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px'
      }}>
        
        {/* Total B2B Revenue */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '52px',
            width: '52px',
            borderRadius: '14px',
            background: 'rgba(0, 0, 0, 0.04)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <School size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schul-Umsatz (Lizenzen)</span>
            <span style={{ display: 'block', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '4px', letterSpacing: '-0.02em' }}>
              {summary.totalB2BRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total B2B Unpaid / Outstanding */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '52px',
            width: '52px',
            borderRadius: '14px',
            background: 'rgba(234, 67, 53, 0.08)',
            color: '#ea4335',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <CreditCard size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Offene Posten (B2B)</span>
            <span style={{ display: 'block', fontSize: '1.75rem', fontWeight: 800, color: '#ea4335', marginTop: '4px', letterSpacing: '-0.02em' }}>
              {summary.totalUnpaid.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total B2C Revenue */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '52px',
            width: '52px',
            borderRadius: '14px',
            background: 'rgba(0, 0, 0, 0.04)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Direkt-Umsatz (App-Käufe)</span>
            <span style={{ display: 'block', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '4px', letterSpacing: '-0.02em' }}>
              {summary.totalB2CRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total registered students */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '52px',
            width: '52px',
            borderRadius: '14px',
            background: 'rgba(0, 0, 0, 0.04)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <Users size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aktive Nutzer</span>
            <span style={{ display: 'flex', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '4px', letterSpacing: '-0.02em', alignItems: 'baseline', gap: '4px' }}>
              {summary.totalStudents} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Schüler</span>
            </span>
          </div>
        </div>

        {/* Bypassed Schools */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '52px',
            width: '52px',
            borderRadius: '14px',
            background: 'rgba(0, 0, 0, 0.04)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <Ban size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abo-Bypass aktiv</span>
            <span style={{ display: 'flex', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '4px', letterSpacing: '-0.02em', alignItems: 'baseline', gap: '4px' }}>
              {summary.bypassedSchools} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Schulen</span>
            </span>
          </div>
        </div>

      </div>

      {/* Filters & Search Toolbar */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '16px',
        border: '1px solid rgba(0, 0, 0, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        flexWrap: 'wrap',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.01)'
      }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={16} />
          <input
            type="text"
            placeholder="Musikschule suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 16px 10px 46px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              fontSize: '0.88rem',
              fontWeight: 500,
              outline: 'none',
              transition: 'all 0.2s',
              background: '#ffffff',
              color: '#0f172a'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4f46e5';
              e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Alle' },
            { id: 'active', label: 'Aktiv' },
            { id: 'bypass', label: 'Bypass' },
            { id: 'trial', label: 'Probe' },
            { id: 'suspended', label: 'Gesperrt' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setStatusFilter(btn.id)}
              className={`filter-btn ${statusFilter === btn.id ? 'filter-btn-active' : ''}`}
            >
              {btn.label}
            </button>
          ))}
          <button
            onClick={handleExportCSV}
            style={{
              background: '#4f46e5',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 18px',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)',
              transition: 'all 0.2s',
              marginLeft: '12px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#4338ca'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#4f46e5'; }}
          >
            Exportieren (CSV) 📥
          </button>
        </div>

      </div>

      {/* Main Billing Table Container */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table className="billing-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Musikschule</th>
              <th style={{ width: '30%', textAlign: 'center' }}>Nutzer &amp; Lizenzen</th>
              <th style={{ width: '30%', textAlign: 'right', color: '#1e293b' }}>Monats-Soll (Schule)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '60px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '3px solid rgba(79, 70, 229, 0.1)',
                      borderTopColor: '#4f46e5',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Abrechnungen werden geladen...
                    </p>
                  </div>
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '60px', fontWeight: 600, color: '#94a3b8' }}>
                  Keine Einträge für diese Filterkombination gefunden.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const isExpanded = expandedSchoolId === inv.schoolId;
                const schoolInvoices = dbInvoices.filter(i => i.school_id === inv.schoolId);
                
                return (
                  <React.Fragment key={inv.schoolId}>
                    <tr 
                      className={`billing-row ${isExpanded ? 'billing-row-expanded' : ''}`}
                      onClick={() => setExpandedSchoolId(isExpanded ? null : inv.schoolId)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* School Name & Status */}
                      <td style={{ fontWeight: 550, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ 
                            color: isExpanded ? '#4f46e5' : '#64748b', 
                            transform: isExpanded ? 'rotate(180deg)' : 'none', 
                            transition: 'transform 0.2s',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}>
                            <ChevronDown size={16} />
                          </span>
                          <span style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#f8fafc',
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem'
                          }}>
                            {inv.schoolName?.[0] || 'S'}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{inv.schoolName}</span>
                            <div>
                              {inv.status === 'bypass' ? (
                                 <span className="status-badge status-badge-bypass" style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}>Bypass</span>
                              ) : inv.status === 'trial' ? (
                                 <span className="status-badge status-badge-trial" style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}>Probezeit</span>
                              ) : inv.status === 'suspended' ? (
                                 <span className="status-badge status-badge-suspended" style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}>Gesperrt</span>
                              ) : (
                                 <span className="status-badge status-badge-active" style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}>Aktiv</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Users & active licenses merged */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.85rem' }}>
                            {inv.totalStudents} Schüler / {inv.totalTeachers} Lehrer
                          </span>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px', 
                            fontSize: '0.72rem', 
                            fontWeight: 700, 
                            color: '#4f46e5', 
                            backgroundColor: '#e0e7ff', 
                            padding: '2px 8px', 
                            borderRadius: '6px'
                          }}>
                            <BookOpen size={10} /> {inv.premiumStudents} aktive Lizenzen
                          </span>
                        </div>
                      </td>

                      {/* Total Billed & Breakdown merged */}
                      <td style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                        <div style={{ color: '#4f46e5', fontWeight: 800, fontSize: '1rem' }}>
                          {inv.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 400, marginTop: '2px', lineHeight: 1.3 }}>
                          {inv.subscriptionBypass ? (
                            <span style={{ fontWeight: 700, color: '#dc2626' }}>Bypass Aktiv</span>
                          ) : (
                            <>
                              {inv.hasCampus && 'Campus'} {inv.hasCampus && inv.hasGroovelab && '+'} {inv.hasGroovelab && 'GrooveLab'} ({(inv.baseFee - inv.kombiDiscountAmount).toFixed(2).replace('.', ',')} €)
                              <br />
                              + Profile ({(inv.userFee + inv.activeStudentFee).toFixed(2).replace('.', ',')} €)
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Invoice History Details */}
                    {isExpanded && (() => {
                      const isSelbstzahler = ['both', 'debit', 'cash', 'option1'].includes(inv.studentBillingOption);
                      const schoolStudents = allUsers.filter(u => u.school_id === inv.schoolId && u.role === 'student');
                      
                      const activePaidStudents = schoolStudents.filter(s => (s.is_campus_active || s.is_groovelab_active) && s.student_billing_cash_paid === true && !s.is_trial);
                      const pendingStudents = schoolStudents.filter(s => s.is_trial === true || ((s.is_campus_active || s.is_groovelab_active) && !s.student_billing_cash_paid));
                      const freeStudents = schoolStudents.filter(s => !s.is_trial && !s.is_campus_active && !s.is_groovelab_active);
                      
                      const getInitials = (first: string, last: string) => {
                        return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
                      };

                      return (
                        <tr>
                          <td colSpan={3} style={{ 
                            padding: '0 24px 24px 24px', 
                            background: 'rgba(255, 255, 255, 0.95)',
                            borderBottomLeftRadius: '24px',
                            borderBottomRightRadius: '24px',
                            borderLeft: '1px solid rgba(0, 0, 0, 0.03)',
                            borderRight: '1px solid rgba(0, 0, 0, 0.03)',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.03)'
                          }}>
                            <div 
                              onClick={(e: any) => e.stopPropagation()}
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '28px',
                                paddingTop: '20px',
                                borderTop: '1px solid rgba(0, 0, 0, 0.05)'
                              }}
                            >
                              
                              {/* Row 1: Subscription & Billing Grid */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '24px'
                              }}>
                                {/* Left: Subscription details */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abonnement Details</span>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0, 0, 0, 0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(0, 0, 0, 0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                                      <span style={{ color: '#64748b' }}>Vertragstyp:</span>
                                      <span style={{ color: '#0f172a', fontWeight: 700 }}>{inv.subscriptionType === 'solo' ? 'Solo' : 'Standard'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                                      <span style={{ color: '#64748b' }}>Module:</span>
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        {inv.hasCampus && <span style={{ color: '#137333', fontWeight: 700, fontSize: '0.78rem', background: '#e6f4ea', padding: '2px 8px', borderRadius: '6px' }}>Campus</span>}
                                        {inv.hasGroovelab && <span style={{ color: '#d97706', fontWeight: 700, fontSize: '0.78rem', background: '#fef3c7', padding: '2px 8px', borderRadius: '6px' }}>Groovelab</span>}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                                      <span style={{ color: '#64748b' }}>Kombi-Rabatt (Schule):</span>
                                      <strong style={{ color: inv.hasKombiDiscount ? '#137333' : '#64748b', fontWeight: 700 }}>
                                        {inv.hasKombiDiscount ? 'Aktiv (-2,99 €)' : 'Nein'}
                                      </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                                      <span style={{ color: '#64748b' }}>Kostenträger:</span>
                                      <strong style={{ color: isSelbstzahler ? '#4f46e5' : '#475569', fontWeight: 700 }}>
                                        {isSelbstzahler ? 'Schüler / Eltern (Direktabrechnung)' : 'Musikschule (Sammelzahler)'}
                                      </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center', borderTop: '1px dashed rgba(0,0,0,0.08)', paddingTop: '8px', marginTop: '2px' }}>
                                      <span style={{ color: '#64748b' }}>Private App-Upgrades:</span>
                                      <span style={{ color: '#0f172a', fontWeight: 700 }}>
                                        {inv.b2cRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>
                                          ({inv.premiumStudents} x 9,99 €)
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Billing numbers */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monatsgebühren Übersicht</span>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0, 0, 0, 0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(0, 0, 0, 0.02)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#64748b' }}>Grundgebühr Module:</span>
                                        <span style={{ color: '#0f172a', fontWeight: 700 }}>{inv.baseFee.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                      </div>
                                      <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'right', marginTop: '-2px' }}>
                                        ({inv.hasCampus && 'Campus: 7,99 €'}{inv.hasCampus && inv.hasGroovelab && ' + '}{inv.hasGroovelab && 'GrooveLab: 4,99 €'})
                                      </div>
                                    </div>
                                    {inv.hasKombiDiscount && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#137333' }}>
                                        <span style={{ fontWeight: 700 }}>Kombi-Rabatt:</span>
                                        <span style={{ fontWeight: 700 }}>-{inv.kombiDiscountAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                      <span style={{ color: '#64748b' }}>Servicegebühr Profile:</span>
                                      <span style={{ color: '#0f172a', fontWeight: 700 }}>
                                        {inv.userFee.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>
                                          ({inv.totalTeachersCount + inv.totalEmployeesCount} aktive Profile à 0,49 €)
                                        </span>
                                      </span>
                                    </div>
                                    {inv.activeStudentFee > 0 && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#4f46e5' }}>
                                        <span style={{ fontWeight: 700 }}>Schüler-Aktivierung:</span>
                                        <span style={{ fontWeight: 700 }}>
                                          {inv.activeStudentFee.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                        </span>
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', borderTop: '1px solid rgba(0, 0, 0, 0.05)', paddingTop: '10px', marginTop: '2px' }}>
                                      <span style={{ color: '#0f172a', fontWeight: 700 }}>Monats-Soll Schule:</span>
                                      <strong style={{ color: '#4f46e5', fontWeight: 800 }}>{inv.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</strong>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Row 2: Schüler Direct Billing Lists (Selbstzahler only) */}
                              {isSelbstzahler && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schüler-Freischaltungsstatus</span>
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                    gap: '24px',
                                  }}>
                                    {/* Column 1: Aktiv freigeschaltet */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                                        <strong style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>Aktiv freigeschaltet</strong>
                                        <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px' }}>
                                          {activePaidStudents.length}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                        {activePaidStudents.length === 0 ? (
                                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '8px 0' }}>Keine aktiven Schüler</span>
                                        ) : (
                                          activePaidStudents.map(s => (
                                            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f8fafc', border: '1px solid rgba(0, 0, 0, 0.05)', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.65rem' }}>
                                                  {getInitials(s.first_name, s.last_name)}
                                                </div>
                                                <span style={{ color: '#1e293b', fontWeight: 600 }}>{s.first_name} {s.last_name}</span>
                                              </div>
                                              <button 
                                                onClick={() => toggleStudentPayment(s.id, true)}
                                                style={{ border: 'none', background: 'none', color: '#4f46e5', fontWeight: 700, cursor: 'pointer', fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px' }}
                                                onMouseOver={(e: any) => e.currentTarget.style.background = '#e0e7ff'}
                                                onMouseOut={(e: any) => e.currentTarget.style.background = 'none'}
                                              >
                                                Sperren
                                              </button>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>

                                    {/* Column 2: Probezeit / Zahlung ausstehend */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                                        <strong style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>Ausstehend / Probezeit</strong>
                                        <span style={{ background: '#fef7e0', color: '#b06000', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px' }}>
                                          {pendingStudents.length}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                        {pendingStudents.length === 0 ? (
                                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '8px 0' }}>Keine ausstehenden Schüler</span>
                                        ) : (
                                          pendingStudents.map(s => (
                                            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#fff8e1', border: '1px solid rgba(176, 96, 0, 0.1)', color: '#b06000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.65rem' }}>
                                                  {getInitials(s.first_name, s.last_name)}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                  <span style={{ color: '#1e293b', fontWeight: 600 }}>{s.first_name} {s.last_name}</span>
                                                  <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {s.is_trial ? 'Probezeit' : 'Zahlung offen'}
                                                  </span>
                                                </div>
                                              </div>
                                              <button 
                                                onClick={() => toggleStudentPayment(s.id, false)}
                                                style={{ border: 'none', background: '#e0e7ff', color: '#4f46e5', fontWeight: 700, cursor: 'pointer', fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px' }}
                                                onMouseOver={(e: any) => e.currentTarget.style.background = '#c7d2fe'}
                                                onMouseOut={(e: any) => e.currentTarget.style.background = '#e0e7ff'}
                                              >
                                                Freischalten
                                              </button>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>

                                    {/* Column 3: Kostenloser User */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                                        <strong style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>Basic User (Kostenlos)</strong>
                                        <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px' }}>
                                          {freeStudents.length}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                        {freeStudents.length === 0 ? (
                                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '8px 0' }}>Keine kostenlosen Schüler</span>
                                        ) : (
                                          freeStudents.map(s => (
                                            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.65rem' }}>
                                                  {getInitials(s.first_name, s.last_name)}
                                                </div>
                                                <span style={{ color: '#1e293b', fontWeight: 600 }}>{s.first_name} {s.last_name}</span>
                                              </div>
                                              <button 
                                                onClick={() => toggleStudentPayment(s.id, false)}
                                                style={{ border: 'none', background: 'none', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px' }}
                                                onMouseOver={(e: any) => e.currentTarget.style.background = '#f1f5f9'}
                                                onMouseOut={(e: any) => e.currentTarget.style.background = 'none'}
                                              >
                                                Aktivieren
                                              </button>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Row 3: Invoices History */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BookOpen size={16} style={{ color: '#64748b' }} />
                                    <h4 style={{ margin: 0, fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      Abrechnungs- und Rechnungsverlauf
                                    </h4>
                                  </div>
                                  <button
                                    onClick={() => createManualInvoice(inv.schoolId)}
                                    style={{
                                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                      color: '#334155',
                                      border: '1px solid rgba(0, 0, 0, 0.08)',
                                      padding: '6px 14px',
                                      borderRadius: '8px',
                                      fontWeight: 600,
                                      fontSize: '0.8rem',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e: any) => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.1)'; }}
                                    onMouseOut={(e: any) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)'; e.currentTarget.style.color = '#334155'; e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)'; }}
                                  >
                                    + Manuelle Rechnung erstellen
                                  </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {(() => {
                                    const generated = getSchoolInvoices(inv.schoolId, inv.total);
                                    const dbInvs = dbInvoices.filter(i => i.school_id === inv.schoolId);
                                    
                                    const allCombined = [
                                      ...dbInvs.map(i => ({
                                        id: i.id,
                                        billing_date: formatDateDisplay(i.billing_date),
                                        amount: i.amount,
                                        status: i.status,
                                        isDb: true
                                      })),
                                      ...generated.map(g => ({
                                        id: g.id,
                                        billing_date: g.date,
                                        amount: g.amount,
                                        status: g.status === 'Bezahlt' ? 'paid' : 'open',
                                        isDb: false
                                      }))
                                    ];

                                    if (allCombined.length === 0) {
                                      return (
                                        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', padding: '16px 0', border: '1px dashed rgba(0, 0, 0, 0.08)', borderRadius: '8px' }}>
                                          Keine Rechnungen vorhanden.
                                        </div>
                                      );
                                    }

                                    return allCombined.map(invoice => {
                                      return (
                                        <div 
                                          key={invoice.id} 
                                          style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between', 
                                            padding: '12px 16px', 
                                            backgroundColor: '#ffffff', 
                                            borderRadius: '12px',
                                            border: '1px solid rgba(0, 0, 0, 0.04)',
                                            flexWrap: 'wrap',
                                            gap: '12px',
                                            opacity: invoice.status === 'cancelled' ? 0.6 : 1
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{invoice.id}</span>
                                            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>{invoice.billing_date}</span>
                                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                                              {Number(invoice.amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                            </span>
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setViewingInvoice({
                                                  invoiceId: invoice.id,
                                                  schoolId: inv.schoolId,
                                                  schoolName: inv.schoolName,
                                                  date: invoice.billing_date,
                                                  amount: invoice.amount,
                                                  status: invoice.status,
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
                                                  subtotal: inv.subtotal
                                                });
                                              }}
                                              style={{
                                                background: '#f8fafc',
                                                border: '1px solid rgba(0, 0, 0, 0.08)',
                                                borderRadius: '8px',
                                                padding: '6px 12px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                color: '#4f46e5',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                              }}
                                            >
                                              Ansehen 📄
                                            </button>
                                            {invoice.isDb ? (
                                              <select
                                                value={invoice.status}
                                                onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                                                style={{
                                                  padding: '6px 12px',
                                                  borderRadius: '8px',
                                                  border: '1px solid rgba(0, 0, 0, 0.08)',
                                                  fontSize: '0.78rem',
                                                  fontWeight: 600,
                                                  background: '#ffffff',
                                                  cursor: 'pointer',
                                                  outline: 'none',
                                                  color: '#1e293b'
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
                                                  padding: '6px 12px',
                                                  borderRadius: '8px',
                                                  border: '1px solid rgba(0, 0, 0, 0.08)',
                                                  fontSize: '0.78rem',
                                                  fontWeight: 600,
                                                  background: '#ffffff',
                                                  cursor: 'pointer',
                                                  outline: 'none',
                                                  color: '#1e293b'
                                                }}
                                              >
                                                <option value="open">Offen</option>
                                                <option value="paid">Bezahlt</option>
                                              </select>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {viewingInvoice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }} onClick={() => setViewingInvoice(null)}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px 32px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
            }}>
              <div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#4f46e5',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  display: 'block',
                  marginBottom: '4px'
                }}>Campus-Groovelab Rechnung</span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  Rechnung {viewingInvoice.invoiceId}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '8px 16px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Drucken 🖨️
                </button>
                <button
                  onClick={() => setViewingInvoice(null)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '12px',
                    width: '36px',
                    height: '36px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content / Printable Invoice */}
            <div style={{ padding: '40px 48px', color: '#1e293b', fontSize: '0.88rem', lineHeight: 1.5 }}>
              {/* Top Meta Details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Campus-Groovelab</h4>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>groovelab GmbH</span>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Karlsplatz 12, 10117 Berlin</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    backgroundColor: viewingInvoice.status === 'paid' ? '#e6f4ea' : '#fce8e6',
                    color: viewingInvoice.status === 'paid' ? '#137333' : '#ea4335'
                  }}>
                    {viewingInvoice.status === 'paid' ? 'Bezahlt' : 'Offen'}
                  </span>
                </div>
              </div>

              {/* Recipient */}
              <div style={{ marginBottom: '40px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Empfänger:</span>
                <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{viewingInvoice.schoolName}</strong>
                <span style={{ fontSize: '0.82rem', color: '#475569', display: 'block', marginTop: '2px' }}>Musikschulleitung &amp; Verwaltung</span>
              </div>

              {/* Invoice Dates */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '16px',
                padding: '16px 24px',
                backgroundColor: '#f8fafc',
                borderRadius: '16px',
                marginBottom: '40px',
                border: '1px solid rgba(0, 0, 0, 0.02)'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Rechnungsdatum:</span>
                  <strong style={{ color: '#0f172a' }}>{viewingInvoice.date}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Leistungszeitraum:</span>
                  <strong style={{ color: '#0f172a' }}>Monatlich</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Zahlbar bis:</span>
                  <strong style={{ color: '#0f172a' }}>14 Tage netto</strong>
                </div>
              </div>

              {/* Line Items Table */}
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Positionen</h4>
              <div style={{ borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 700, borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569' }}>
                  <span style={{ flex: 2 }}>Beschreibung</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>Menge</span>
                  <span style={{ flex: 1, textAlign: 'right' }}>Einzelpreis</span>
                  <span style={{ flex: 1, textAlign: 'right' }}>Gesamtpreis</span>
                </div>
                
                {/* 1. Base Fee (Campus) */}
                {viewingInvoice.hasCampus && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ flex: 2, fontWeight: 600, color: '#0f172a' }}>
                      Campus Modul (B2B Lizenz)
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>Unterstützung für das Online-Schulportal</span>
                    </span>
                    <span style={{ flex: 1, textAlign: 'center' }}>1</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>7,99 €</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>7,99 €</span>
                  </div>
                )}

                {/* 2. Base Fee (GrooveLab) */}
                {viewingInvoice.hasGroovelab && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ flex: 2, fontWeight: 600, color: '#0f172a' }}>
                      GrooveLab Modul (B2B Lizenz)
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>Unterstützung für die Gamified Music App</span>
                    </span>
                    <span style={{ flex: 1, textAlign: 'center' }}>1</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>4,99 €</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>4,99 €</span>
                  </div>
                )}

                {/* 3. Kombi Discount */}
                {viewingInvoice.hasCampus && viewingInvoice.hasGroovelab && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', color: '#137333' }}>
                    <span style={{ flex: 2, fontWeight: 600 }}>
                      Kombi-Vorteil Rabatt
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#137333', fontWeight: 400 }}>Vorteilspreis bei Doppelbuchung</span>
                    </span>
                    <span style={{ flex: 1, textAlign: 'center' }}>1</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>-2,99 €</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>-2,99 €</span>
                  </div>
                )}

                {/* 4. Active Staff profile fee */}
                {(viewingInvoice.totalTeachersCount + viewingInvoice.totalEmployeesCount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ flex: 2, fontWeight: 600, color: '#0f172a' }}>
                      Servicegebühr Profile (Lehrer/Admin)
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>Monatliche Nutzungsgebühr je aktives Profil</span>
                    </span>
                    <span style={{ flex: 1, textAlign: 'center' }}>{viewingInvoice.totalTeachersCount + viewingInvoice.totalEmployeesCount}</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>0,49 €</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>{((viewingInvoice.totalTeachersCount + viewingInvoice.totalEmployeesCount) * 0.49).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                )}

                {/* 5. Passive students infrastructure fee */}
                {viewingInvoice.passiveStudentsCount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ flex: 2, fontWeight: 600, color: '#0f172a' }}>
                      Infrastrukturgebühr Passiv-Schüler
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>Passiv-Accounts in der Schuldatenbank</span>
                    </span>
                    <span style={{ flex: 1, textAlign: 'center' }}>{viewingInvoice.passiveStudentsCount}</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>0,09 €</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>{(viewingInvoice.passiveStudentsCount * 0.09).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                )}
                
                {/* 6. Active students fee */}
                {viewingInvoice.activeStudentFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ flex: 2, fontWeight: 600, color: '#0f172a' }}>
                      Schüler-Aktivierungsgebühr (Monatlich)
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>Vollständige Freischaltungen durch Schule</span>
                    </span>
                    <span style={{ flex: 1, textAlign: 'center' }}>{Math.round(viewingInvoice.activeStudentFee / 0.49)}</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>0,49 €</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>{viewingInvoice.activeStudentFee.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                )}
              </div>

              {/* Total Calculation Details */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
                <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>Zwischensumme netto:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{viewingInvoice.subscriptionBypass ? '0,00 €' : viewingInvoice.subtotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>Umsatzsteuer (0% - steuerbefreit):</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>0,00 €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', paddingTop: '4px' }}>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>Rechnungsbetrag:</span>
                    <strong style={{ fontWeight: 900, color: '#4f46e5', fontSize: '1.15rem' }}>
                      {viewingInvoice.subscriptionBypass ? '0,00 €' : viewingInvoice.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div style={{
                padding: '20px 24px',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: '16px',
                backgroundColor: 'rgba(0,0,0,0.01)',
                fontSize: '0.78rem',
                color: '#64748b'
              }}>
                <strong style={{ display: 'block', color: '#475569', marginBottom: '6px' }}>Zahlungsinformationen</strong>
                Bitte überweisen Sie den Rechnungsbetrag innerhalb von 14 Tagen unter Angabe des Verwendungszwecks.<br />
                <span style={{ display: 'block', marginTop: '6px' }}>
                  <strong>IBAN:</strong> DE89 1007 0000 0123 4567 89 &nbsp;&bull;&nbsp; 
                  <strong>BIC:</strong> KARSDEFFXXX &nbsp;&bull;&nbsp; 
                  <strong>Verwendungszweck:</strong> {viewingInvoice.invoiceId}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}
      
    </div>
  );
}

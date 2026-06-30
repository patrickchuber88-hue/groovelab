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
    totalStudents: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);
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
    const contractDateObj = storedDate ? new Date(storedDate) : new Date('2026-04-01T12:00:00Z');
    
    const startYear = contractDateObj.getFullYear();
    const startMonth = contractDateObj.getMonth() + 1;

    const systemDate = new Date('2026-06-21T13:58:34+02:00');
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
        const total = isBypass ? 0.00 : subtotal;

        let status: 'trial' | 'active' | 'bypass' | 'suspended' = 'active';
        if (school.status === 'suspended') {
          status = 'suspended';
        } else if (isBypass) {
          status = 'bypass';
        } else if (school.is_trial) {
          status = 'trial';
        }

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
      
      if (!invoicesErr && allInvoices) {
        setDbInvoices(allInvoices);
      } else {
        setDbInvoices([]);
      }

      setInvoices(calculatedInvoices);
      setSummary({
        totalSchools: calculatedInvoices.length,
        totalActiveCampusUsers,
        totalMonthlyRevenue: parseFloat(totalRevenue.toFixed(2)),
        bypassedSchools,
        totalB2BRevenue: parseFloat(totalB2BRevenue.toFixed(2)),
        totalB2CRevenue: parseFloat(totalB2CRevenue.toFixed(2)),
        totalTeachers,
        totalStudents
      });

    } catch (err: any) {
      console.error('Error fetching billing data:', err);
      setError('Verbindungsfehler beim Laden der Abrechnungsmetriken.');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.schoolName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', width: '100%' }}>
      
      {/* Dynamic styles injector */}
      <style>{`
        .billing-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(16px);
          border-radius: 20px;
          padding: 24px;
          border: 1px solid rgba(15, 23, 42, 0.05);
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.02);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          gap: 20px;
          cursor: default;
        }
        .billing-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.04);
          border-color: rgba(234, 67, 53, 0.15);
        }
        .billing-card:hover .bc-icon-wrapper {
          background: rgba(234, 67, 53, 0.1) !important;
          color: #ea4335 !important;
        }

        .filter-btn {
          padding: 10px 18px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.85rem;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #f8fafc;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .filter-btn:hover {
          background: #ffffff;
          color: #0f172a;
          border-color: rgba(15, 23, 42, 0.15);
        }
        .filter-btn-active {
          background: rgba(234, 67, 53, 0.08) !important;
          color: #ea4335 !important;
          border-color: rgba(234, 67, 53, 0.2) !important;
        }

        .billing-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 12px;
          text-align: left;
        }
        .billing-table th {
          padding: 16px 20px;
          font-size: 0.75rem;
          font-weight: 800;
          color: #64748b;
          border-bottom: none;
          background-color: transparent;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .billing-row {
          background: transparent;
          transition: transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        }
        .billing-row td {
          padding: 16px 20px;
          font-size: 0.88rem;
          font-weight: 500;
          color: #334155;
          background: #ffffff;
          border-top: 1px solid rgba(15, 23, 42, 0.04);
          border-bottom: 1px solid rgba(15, 23, 42, 0.04);
        }
        .billing-row td:first-child {
          border-left: 1px solid rgba(15, 23, 42, 0.04);
          border-top-left-radius: 12px;
          border-bottom-left-radius: 12px;
        }
        .billing-row td:last-child {
          border-right: 1px solid rgba(15, 23, 42, 0.04);
          border-top-right-radius: 12px;
          border-bottom-right-radius: 12px;
        }
        .billing-row:hover td {
          background: rgba(15, 23, 42, 0.015);
        }
        .billing-row-expanded td {
          border-bottom: none !important;
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
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
        }
        .status-badge-active {
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }
        .status-badge-trial {
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
        }
        .status-badge-bypass {
          color: #64748b;
          background: rgba(100, 116, 139, 0.1);
        }
        .status-badge-suspended {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .action-icon-btn {
          border: none;
          background: none;
          cursor: pointer;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 10px;
          transition: all 0.15s;
        }
        .action-icon-btn:hover {
          color: #ea4335;
          background: rgba(234, 67, 53, 0.08);
        }

        .invoice-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(15, 23, 42, 0.05);
          padding: 20px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.02);
        }
      `}</style>

      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        paddingBottom: '24px',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', fontFamily: '"Outfit", sans-serif', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CreditCard style={{ color: '#10b981' }} size={32} /> Partner-Abrechnung &amp; Aktivierungen
          </h2>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 550 }}>
            Globale Übersicht über alle B2B Schullizenz-Einnahmen und B2C Premium-Upgrades.
          </p>
        </div>
        
        <button
          onClick={fetchBillingData}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: '4px',
            padding: '8px 16px',
            fontWeight: 550,
            fontSize: '0.85rem',
            color: '#475569',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(234, 67, 53, 0.05)'; e.currentTarget.style.color = '#ea4335'; e.currentTarget.style.borderColor = '#ea4335'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#dadce0'; }}
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
          color: '#d93025',
          backgroundColor: '#fce8e6',
          border: '1px solid #fad2cf',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: 500
        }}>
          <ShieldAlert size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '24px'
      }}>
        
        {/* Total B2B Revenue */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '56px',
            width: '56px',
            borderRadius: '16px',
            background: 'rgba(15, 23, 42, 0.04)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s'
          }}>
            <School size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>B2B Umsatz (Schulen)</span>
            <span style={{ display: 'block', fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginTop: '4px', fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.02em' }}>
              {summary.totalB2BRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total B2C Revenue */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '56px',
            width: '56px',
            borderRadius: '16px',
            background: 'rgba(15, 23, 42, 0.04)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s'
          }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>B2C Umsatz (App-Käufe)</span>
            <span style={{ display: 'block', fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginTop: '4px', fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.02em' }}>
              {summary.totalB2CRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total registered students */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '56px',
            width: '56px',
            borderRadius: '16px',
            background: 'rgba(15, 23, 42, 0.04)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s'
          }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aktive Nutzer</span>
            <span style={{ display: 'flex', fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginTop: '4px', fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.02em', alignItems: 'baseline', gap: '6px' }}>
              {summary.totalStudents} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 700 }}>Schüler</span>
            </span>
          </div>
        </div>

        {/* Bypassed Schools */}
        <div className="billing-card">
          <div className="bc-icon-wrapper" style={{
            height: '56px',
            width: '56px',
            borderRadius: '16px',
            background: 'rgba(15, 23, 42, 0.04)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s'
          }}>
            <Ban size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abo-Bypass aktiv</span>
            <span style={{ display: 'flex', fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginTop: '4px', fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.02em', alignItems: 'baseline', gap: '6px' }}>
              {summary.bypassedSchools} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 700 }}>Schulen</span>
            </span>
          </div>
        </div>

      </div>

      {/* Filters & Search Toolbar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '8px',
        padding: '16px 20px',
        border: '1px solid #dadce0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#5f6368' }} size={16} />
          <input
            type="text"
            placeholder="Musikschule suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 16px 10px 46px',
              borderRadius: '8px',
              border: '1px solid #dadce0',
              fontSize: '0.88rem',
              fontWeight: 400,
              outline: 'none',
              transition: 'all 0.15s ease-in-out',
              color: '#202124'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#ea4335';
              e.target.style.boxShadow = '0 0 0 3px rgba(234,67,53,0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(15, 23, 42, 0.08)';
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
        </div>

      </div>

      {/* Main Billing Table Container */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table className="billing-table">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Musikschule</th>
              <th style={{ width: '12%' }}>Abo-Status</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Schüler (Gesamt)</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Campus aktive User</th>
              <th style={{ width: '12%', textAlign: 'right' }}>B2B Module + Aktivierungen</th>
              <th style={{ width: '12%', textAlign: 'right' }}>B2C App-Upgrades</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Kontingent</th>
              <th style={{ width: '14%', textAlign: 'right', color: '#1e293b' }}>Gesamtbetrag (B2B)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '60px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '3px solid rgba(16, 185, 129, 0.1)',
                      borderTopColor: '#10b981',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Abrechnungen werden geladen...
                    </p>
                  </div>
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '60px', fontWeight: 700, color: '#94a3b8' }}>
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
                      {/* School Name */}
                      <td style={{ fontWeight: 550, color: '#202124' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            color: isExpanded ? '#ea4335' : '#94a3b8', 
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
                            background: '#e8f0fe',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '0.8rem'
                          }}>
                            {inv.schoolName?.[0] || 'S'}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{inv.schoolName}</span>
                        </div>
                      </td>
                      
                      {/* Subscription Status Badge */}
                      <td>
                        {inv.status === 'bypass' ? (
                           <span className="status-badge status-badge-bypass">Bypass</span>
                        ) : inv.status === 'trial' ? (
                           <span className="status-badge status-badge-trial">Probezeit</span>
                        ) : inv.status === 'suspended' ? (
                           <span className="status-badge status-badge-suspended">Gesperrt</span>
                        ) : (
                           <span className="status-badge status-badge-active">Aktiv</span>
                        )}
                      </td>

                      {/* Total Pupils */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span style={{ color: '#202124', fontWeight: 550 }}>{inv.totalStudents} Schüler</span>
                          <span style={{ fontSize: '0.72rem', color: '#5f6368' }}>{inv.totalTeachers} Lehrer</span>
                        </div>
                      </td>

                      {/* Active Campus Users */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          fontSize: '0.78rem', 
                          fontWeight: 600, 
                          color: '#475569', 
                          backgroundColor: '#e8f0fe', 
                          padding: '4px 10px', 
                          borderRadius: '4px' 
                        }}>
                          🎓 {inv.premiumStudents} Campus
                        </span>
                      </td>

                      {/* Detailed B2B Modules & Licenses calculation */}
                      <td style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 550 }}>
                        <div style={{ color: '#202124' }}>{inv.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
                        <div style={{ fontSize: '0.68rem', color: '#5f6368', fontWeight: 400, marginTop: '2px', lineHeight: 1.3 }}>
                          {inv.hasCampus && 'Campus'} {inv.hasCampus && inv.hasGroovelab && '+'} {inv.hasGroovelab && 'GrooveLab'} ({(inv.baseFee - inv.kombiDiscountAmount).toFixed(2).replace('.', ',')} €)
                          <br />
                          + Gebühren ({(inv.userFee + inv.activeStudentFee).toFixed(2).replace('.', ',')} €)
                        </div>
                      </td>

                      {/* Est. B2C Upgrades */}
                      <td style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 550, color: '#137333' }}>
                        <div>{inv.b2cRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
                        <div style={{ fontSize: '0.68rem', color: '#137333', fontWeight: 400, marginTop: '2px' }}>
                          {inv.premiumStudents} upgraded x 9,99 €
                        </div>
                      </td>

                      {/* Active Quota */}
                      <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600, color: '#202124' }}>{inv.userQuota}</span>
                        {inv.pendingUserQuota && (
                          <div style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                            ⏳ Next: {inv.pendingUserQuota}
                          </div>
                        )}
                      </td>

                      {/* B2B Total Invoice */}
                      <td style={{ textAlign: 'right', fontSize: '0.9rem', fontWeight: 700, color: '#202124' }}>
                        <div>{inv.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
                        {inv.subscriptionBypass && (
                          <span style={{ fontSize: '0.65rem', color: '#c5221f', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Bypass Aktiv
                          </span>
                        )}
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
                          <td colSpan={8} style={{ 
                            padding: '0 24px 24px 24px', 
                            background: '#ffffff',
                            borderBottomLeftRadius: '12px',
                            borderBottomRightRadius: '12px',
                            borderLeft: '1px solid rgba(15, 23, 42, 0.04)',
                            borderRight: '1px solid rgba(15, 23, 42, 0.04)',
                            borderBottom: '1px solid rgba(15, 23, 42, 0.04)'
                          }}>
                            <div 
                              onClick={(e: any) => e.stopPropagation()}
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '32px',
                                paddingTop: '16px',
                                borderTop: '1px solid rgba(15, 23, 42, 0.04)'
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
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abonnement Details</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                                      <span style={{ color: '#64748b' }}>Vertragstyp:</span>
                                      <span style={{ color: '#0f172a', fontWeight: 600 }}>{inv.subscriptionType === 'solo' ? 'Solo' : 'Standard'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                                      <span style={{ color: '#64748b' }}>Module:</span>
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        {inv.hasCampus && <span style={{ color: '#137333', fontWeight: 600 }}>Campus</span>}
                                        {inv.hasGroovelab && <span style={{ color: '#ea4335', fontWeight: 600 }}>Groovelab</span>}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                                      <span style={{ color: '#64748b' }}>Kombi-Rabatt (B2B):</span>
                                      <strong style={{ color: inv.hasKombiDiscount ? '#137333' : '#64748b', fontWeight: 600 }}>
                                        {inv.hasKombiDiscount ? 'Aktiv (-2,99 €)' : 'Nein'}
                                      </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                                      <span style={{ color: '#64748b' }}>Kostenträger:</span>
                                      <strong style={{ color: isSelbstzahler ? '#1a73e8' : '#137333', fontWeight: 600 }}>
                                        {isSelbstzahler ? 'Schüler / Eltern' : 'Musikschule'}
                                      </strong>
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Billing numbers */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monatsgebühren Übersicht</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                      <span style={{ color: '#64748b' }}>Server-Grundgebühr:</span>
                                      <span style={{ color: '#0f172a', fontWeight: 600 }}>{inv.baseFee.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                    </div>
                                    {inv.hasKombiDiscount && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#137333' }}>
                                        <span style={{ fontWeight: 600 }}>Kombi-Rabatt:</span>
                                        <span style={{ fontWeight: 600 }}>-{inv.kombiDiscountAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                      <span style={{ color: '#64748b' }}>Profile-Levy (B2B):</span>
                                      <span style={{ color: '#0f172a', fontWeight: 600 }}>
                                        {inv.userFee.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>
                                          ({inv.totalTeachersCount + inv.totalEmployeesCount} Staff, {inv.passiveStudentsCount} Passiv)
                                        </span>
                                      </span>
                                    </div>
                                    {inv.activeStudentFee > 0 && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#1a73e8' }}>
                                        <span style={{ fontWeight: 600 }}>Schüler-Aktivierung:</span>
                                        <span style={{ fontWeight: 600 }}>
                                          {inv.activeStudentFee.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                        </span>
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', borderTop: '1px solid rgba(15, 23, 42, 0.05)', paddingTop: '12px', marginTop: '4px' }}>
                                      <span style={{ color: '#0f172a', fontWeight: 600 }}>Monats-Soll (B2B):</span>
                                      <strong style={{ color: '#0f172a', fontWeight: 800 }}>{inv.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</strong>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Row 2: Schüler Direct Billing Lists (Selbstzahler only) */}
                              {isSelbstzahler && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schüler-Freischaltungsstatus</span>
                                  </div>
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                    gap: '24px',
                                  }}>
                                    {/* Spalte 1: Aktiv freigeschaltet */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(19, 115, 51, 0.2)' }}>
                                        <strong style={{ fontSize: '0.8rem', color: '#137333', fontWeight: 600 }}>Aktiv freigeschaltet</strong>
                                        <span style={{ background: '#e6f4ea', color: '#137333', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>
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
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e6f4ea', color: '#137333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.65rem' }}>
                                                  {getInitials(s.first_name, s.last_name)}
                                                </div>
                                                <span style={{ color: '#0f172a', fontWeight: 500 }}>{s.first_name} {s.last_name}</span>
                                              </div>
                                              <button 
                                                onClick={() => toggleStudentPayment(s.id, true)}
                                                style={{ border: 'none', background: 'none', color: '#ea4335', fontWeight: 600, cursor: 'pointer', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px' }}
                                                onMouseOver={(e: any) => e.currentTarget.style.background = 'rgba(234, 67, 53, 0.1)'}
                                                onMouseOut={(e: any) => e.currentTarget.style.background = 'none'}
                                              >
                                                Sperren
                                              </button>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>

                                    {/* Spalte 2: Probezeit / Zahlung ausstehend */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(176, 96, 0, 0.2)' }}>
                                        <strong style={{ fontSize: '0.8rem', color: '#b06000', fontWeight: 600 }}>Ausstehend / Probezeit</strong>
                                        <span style={{ background: '#fef7e0', color: '#b06000', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>
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
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#fef7e0', color: '#b06000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.65rem' }}>
                                                  {getInitials(s.first_name, s.last_name)}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                  <span style={{ color: '#0f172a', fontWeight: 500 }}>{s.first_name} {s.last_name}</span>
                                                  <span style={{ fontSize: '0.65rem', color: '#b06000', fontWeight: 600 }}>
                                                    {s.is_trial ? '⏳ Probezeit' : '⚠️ Zahlung offen'}
                                                  </span>
                                                </div>
                                              </div>
                                              <button 
                                                onClick={() => toggleStudentPayment(s.id, false)}
                                                style={{ border: 'none', background: 'rgba(234, 67, 53, 0.1)', color: '#ea4335', fontWeight: 600, cursor: 'pointer', fontSize: '0.7rem', padding: '4px 10px', borderRadius: '4px' }}
                                                onMouseOver={(e: any) => e.currentTarget.style.background = 'rgba(234, 67, 53, 0.2)'}
                                                onMouseOut={(e: any) => e.currentTarget.style.background = 'rgba(234, 67, 53, 0.1)'}
                                              >
                                                Freischalten
                                              </button>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>

                                    {/* Spalte 3: Kostenloser User */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(100, 116, 139, 0.2)' }}>
                                        <strong style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Kostenlose Basic User</strong>
                                        <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>
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
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.65rem' }}>
                                                  {getInitials(s.first_name, s.last_name)}
                                                </div>
                                                <span style={{ color: '#0f172a', fontWeight: 500 }}>{s.first_name} {s.last_name}</span>
                                              </div>
                                              <button 
                                                onClick={() => toggleStudentPayment(s.id, false)}
                                                style={{ border: 'none', background: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px' }}
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
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BookOpen size={16} style={{ color: '#5f6368' }} />
                                    <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#202124', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      Abrechnungs- und Rechnungsverlauf
                                    </h4>
                                  </div>
                                  <button
                                    onClick={() => createManualInvoice(inv.schoolId)}
                                    style={{
                                      backgroundColor: '#ffffff',
                                      color: '#475569',
                                      border: '1px solid #dadce0',
                                      padding: '6px 14px',
                                      borderRadius: '4px',
                                      fontWeight: 500,
                                      fontSize: '0.8rem',
                                      cursor: 'pointer',
                                      transition: 'background 0.2s'
                                    }}
                                    onMouseOver={(e: any) => e.currentTarget.style.background = '#f8f9fa'}
                                    onMouseOut={(e: any) => e.currentTarget.style.background = '#ffffff'}
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
                                        <div style={{ textAlign: 'center', color: '#5f6368', fontSize: '0.8rem', padding: '16px 0', border: '1px dashed #dadce0', borderRadius: '4px' }}>
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
                                            padding: '10px 16px', 
                                            backgroundColor: '#ffffff', 
                                            borderRadius: '4px',
                                            border: '1px solid #dadce0',
                                            flexWrap: 'wrap',
                                            gap: '12px',
                                            opacity: invoice.status === 'cancelled' ? 0.6 : 1
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 600, color: '#202124', fontSize: '0.85rem' }}>{invoice.id}</span>
                                            <span style={{ fontSize: '0.82rem', color: '#5f6368', fontWeight: 400 }}>{invoice.billing_date}</span>
                                            <span style={{ fontWeight: 600, color: '#202124', fontSize: '0.85rem' }}>
                                              {Number(invoice.amount || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                            </span>
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {invoice.isDb ? (
                                              <select
                                                value={invoice.status}
                                                onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                                                style={{
                                                  padding: '4px 8px',
                                                  borderRadius: '4px',
                                                  border: '1px solid #dadce0',
                                                  fontSize: '0.75rem',
                                                  fontWeight: 500,
                                                  background: '#ffffff',
                                                  cursor: 'pointer',
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
                                                  padding: '4px 8px',
                                                  borderRadius: '4px',
                                                  border: '1px solid #dadce0',
                                                  fontSize: '0.75rem',
                                                  fontWeight: 500,
                                                  background: '#ffffff',
                                                  cursor: 'pointer',
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
      
    </div>
  );
}

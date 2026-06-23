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
          background: #ffffff;
          border-radius: 12px;
          padding: 22px 24px;
          border: 1px solid #dadce0;
          box-shadow: none;
          transition: all 0.2s ease-in-out;
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
        }
        .billing-card:hover {
          border-color: #bdc1c6;
          box-shadow: 0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15);
        }
        .billing-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 6px;
          height: 100%;
          background: transparent;
        }
        .billing-card-campus::before {
          background: #1a73e8;
        }
        .billing-card-groovelab::before {
          background: #f9ab00;
        }
        .billing-card-purple::before {
          background: #137333;
        }
        .billing-card-slate::before {
          background: #5f6368;
        }

        .filter-btn {
          padding: 8px 16px;
          border-radius: 100px;
          font-weight: 600;
          font-size: 0.82rem;
          border: 1px solid #dadce0;
          background: #ffffff;
          color: #5f6368;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .filter-btn:hover {
          background: #f1f3f4;
          color: #202124;
          border-color: #dadce0;
        }
        .filter-btn-active {
          background: #e8f0fe;
          color: #1a73e8;
          border-color: transparent;
          font-weight: 700;
        }

        .billing-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .billing-table th {
          padding: 16px;
          font-size: 0.78rem;
          font-weight: 700;
          color: #5f6368;
          border-bottom: 1px solid #dadce0;
          background-color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .billing-row {
          background: #ffffff;
          border-bottom: 1px solid #dadce0;
          transition: background-color 0.15s ease-in-out;
        }
        .billing-row td {
          padding: 16px;
          font-size: 0.85rem;
          font-weight: 400;
          color: #3c4043;
        }
        .billing-row:hover td {
          background: #f8f9fa;
        }
        .billing-row-expanded td {
          background: #f8f9fa !important;
          border-bottom: none !important;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .status-badge-active {
          color: #137333;
          background: #e6f4ea;
        }
        .status-badge-trial {
          color: #b06000;
          background: #fef7e0;
        }
        .status-badge-bypass {
          color: #c5221f;
          background: #fce8e6;
        }
        .status-badge-suspended {
          color: #5f6368;
          background: #f1f3f4;
        }

        .action-icon-btn {
          border: none;
          background: none;
          cursor: pointer;
          color: #5f6368;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 50%;
          transition: all 0.15s;
        }
        .action-icon-btn:hover {
          color: #202124;
          background: #f1f3f4;
        }

        .invoice-card {
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #dadce0;
          padding: 16px 20px;
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
            color: '#1a73e8',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
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
        gap: '20px'
      }}>
        
        {/* Total B2B Revenue */}
        <div className="billing-card billing-card-campus">
          <div style={{
            height: '48px',
            width: '48px',
            borderRadius: '50%',
            background: '#e8f0fe',
            color: '#1a73e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <School size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.04em' }}>B2B Umsatz (Schulen)</span>
            <span style={{ display: 'block', fontSize: '1.75rem', fontWeight: 400, color: '#202124', marginTop: '4px', fontFamily: '"Google Sans", "Roboto", sans-serif' }}>
              {summary.totalB2BRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total B2C Revenue */}
        <div className="billing-card billing-card-groovelab">
          <div style={{
            height: '48px',
            width: '48px',
            borderRadius: '50%',
            background: '#fef7e0',
            color: '#b06000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.04em' }}>B2C Umsatz (App-Käufe)</span>
            <span style={{ display: 'block', fontSize: '1.75rem', fontWeight: 400, color: '#202124', marginTop: '4px', fontFamily: '"Google Sans", "Roboto", sans-serif' }}>
              {summary.totalB2CRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total registered students */}
        <div className="billing-card billing-card-purple">
          <div style={{
            height: '48px',
            width: '48px',
            borderRadius: '50%',
            background: '#e6f4ea',
            color: '#137333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Users size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Aktive Nutzer</span>
            <span style={{ display: 'block', fontSize: '1.75rem', fontWeight: 400, color: '#202124', marginTop: '4px', fontFamily: '"Google Sans", "Roboto", sans-serif' }}>
              {summary.totalStudents} <span style={{ fontSize: '0.9rem', color: '#5f6368', fontWeight: 400 }}>Schüler</span>
            </span>
          </div>
        </div>

        {/* Bypassed Schools */}
        <div className="billing-card billing-card-slate">
          <div style={{
            height: '48px',
            width: '48px',
            borderRadius: '50%',
            background: '#f1f3f4',
            color: '#5f6368',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Ban size={22} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Abo-Bypass aktiv</span>
            <span style={{ display: 'block', fontSize: '1.75rem', fontWeight: 400, color: '#202124', marginTop: '4px', fontFamily: '"Google Sans", "Roboto", sans-serif' }}>
              {summary.bypassedSchools} <span style={{ fontSize: '0.9rem', color: '#5f6368', fontWeight: 400 }}>Schulen</span>
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
              e.target.style.borderColor = '#1a73e8';
              e.target.style.boxShadow = '0 0 0 2px rgba(26,115,232,0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#dadce0';
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
                            color: '#5f6368', 
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
                            color: '#1a73e8',
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
                          color: '#1a73e8', 
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
                          <div style={{ fontSize: '0.68rem', color: '#1a73e8', fontWeight: 600, marginTop: '2px' }}>
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
                            padding: '0 24px 28px 24px', 
                            background: '#f8f9fa',
                            borderBottomLeftRadius: '12px',
                            borderBottomRightRadius: '12px',
                            borderLeft: '1px solid #dadce0',
                            borderRight: '1px solid #dadce0',
                            borderBottom: '1px solid #dadce0'
                          }}>
                            <div 
                              onClick={(e: any) => e.stopPropagation()}
                              style={{ 
                                background: '#ffffff',
                                borderRadius: '8px',
                                border: '1px solid #dadce0',
                                padding: '24px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '24px'
                              }}
                            >
                              
                              {/* Row 1: Google Settings Card Grid */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '20px',
                                paddingBottom: '20px',
                                borderBottom: '1px solid #dadce0'
                              }}>
                                {/* Left Card: Subscription details */}
                                <div style={{
                                  background: '#ffffff',
                                  borderRadius: '8px',
                                  padding: '16px 20px',
                                  border: '1px solid #dadce0',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #dadce0', paddingBottom: '8px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#202124', fontWeight: 600 }}>Abonnement Details</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', alignItems: 'center' }}>
                                      <span style={{ color: '#5f6368' }}>Vertragstyp:</span>
                                      <span style={{ color: '#202124', fontWeight: 600, background: '#f1f3f4', padding: '3px 8px', borderRadius: '4px' }}>
                                        {inv.subscriptionType === 'solo' ? 'Solo' : 'Standard'}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', alignItems: 'center' }}>
                                      <span style={{ color: '#5f6368' }}>Freigeschaltete Module:</span>
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        {inv.hasCampus && <span style={{ background: '#e8f0fe', color: '#1a73e8', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>Campus</span>}
                                        {inv.hasGroovelab && <span style={{ background: '#fef7e0', color: '#b06000', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>Groovelab</span>}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', alignItems: 'center' }}>
                                      <span style={{ color: '#5f6368' }}>Kombi-Rabatt (B2B):</span>
                                      <strong style={{ color: inv.hasKombiDiscount ? '#137333' : '#5f6368', fontWeight: 600 }}>
                                        {inv.hasKombiDiscount ? 'Aktiv (-2,99 €)' : 'Nein'}
                                      </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', alignItems: 'center' }}>
                                      <span style={{ color: '#5f6368' }}>Kostenträger:</span>
                                      <strong style={{ color: isSelbstzahler ? '#1a73e8' : '#137333', fontWeight: 600 }}>
                                        {isSelbstzahler ? 'Schüler / Eltern (Selbstzahler)' : 'Musikschule (Sammelzahler)'}
                                      </strong>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Card: Billing numbers */}
                                <div style={{
                                  background: '#ffffff',
                                  borderRadius: '8px',
                                  padding: '16px 20px',
                                  border: '1px solid #dadce0',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #dadce0', paddingBottom: '8px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#202124', fontWeight: 600 }}>Monatsgebühren Übersicht</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                      <span style={{ color: '#5f6368' }}>Server-Grundgebühr:</span>
                                      <span style={{ color: '#202124', fontWeight: 550 }}>{inv.baseFee.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                    </div>
                                    {inv.hasKombiDiscount && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#137333' }}>
                                        <span style={{ fontWeight: 550 }}>Kombi-Rabatt (B2B):</span>
                                        <span style={{ fontWeight: 600 }}>-{inv.kombiDiscountAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                      <span style={{ color: '#5f6368' }}>Profile-Levy (B2B):</span>
                                      <span style={{ color: '#202124', fontWeight: 550 }}>
                                        {inv.userFee.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                        <span style={{ fontSize: '0.72rem', color: '#5f6368', fontWeight: 400, marginLeft: '6px' }}>
                                          ({inv.totalTeachersCount + inv.totalEmployeesCount} Staff x 0,49 + {inv.passiveStudentsCount} Passive x 0,09)
                                        </span>
                                      </span>
                                    </div>
                                    {inv.activeStudentFee > 0 && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#1a73e8' }}>
                                        <span style={{ fontWeight: 550 }}>Schüler-Aktivierung (B2B):</span>
                                        <span style={{ fontWeight: 600 }}>
                                          {inv.activeStudentFee.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                          <span style={{ fontSize: '0.72rem', color: '#1a73e8', fontWeight: 400, marginLeft: '6px' }}>
                                            ({inv.activeStudents} active x 0,49)
                                          </span>
                                        </span>
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px dashed #dadce0', paddingTop: '8px', marginTop: '4px' }}>
                                      <span style={{ color: '#202124', fontWeight: 600 }}>Monats-Soll (B2B):</span>
                                      <strong style={{ color: '#202124', fontSize: '1.05rem', fontWeight: 700 }}>{inv.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</strong>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Row 2: Schüler Direct Billing Lists (Selbstzahler only) */}
                              {isSelbstzahler && (
                                <div style={{ paddingBottom: '20px', borderBottom: '1px solid #dadce0' }}>
                                  <h4 style={{ margin: '0 0 16px 0', fontSize: '0.78rem', fontWeight: 700, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Schüler-Freischaltungsstatus (Direktabrechnung)
                                  </h4>
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                    gap: '16px'
                                  }}>
                                    {/* Spalte 1: Aktiv freigeschaltet */}
                                    <div style={{ 
                                      background: '#ffffff', 
                                      border: '1px solid #dadce0', 
                                      borderTop: '3px solid #137333',
                                      borderRadius: '8px', 
                                      padding: '16px',
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f3f4', paddingBottom: '8px' }}>
                                        <strong style={{ fontSize: '0.8rem', color: '#137333', fontWeight: 600 }}>Aktiv freigeschaltet</strong>
                                        <span style={{ background: '#e6f4ea', color: '#137333', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>
                                          {activePaidStudents.length}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                                        {activePaidStudents.length === 0 ? (
                                          <span style={{ fontSize: '0.75rem', color: '#5f6368', opacity: 0.7, fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>Keine aktiven Schüler</span>
                                        ) : (
                                          activePaidStudents.map(s => (
                                            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '6px 10px', borderRadius: '4px', border: '1px solid #dadce0', fontSize: '0.8rem' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#e6f4ea', color: '#137333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.72rem' }}>
                                                  {getInitials(s.first_name, s.last_name)}
                                                </div>
                                                <span style={{ color: '#202124', fontWeight: 500 }}>{s.first_name} {s.last_name}</span>
                                              </div>
                                              <button 
                                                onClick={() => toggleStudentPayment(s.id, true)}
                                                style={{ border: 'none', background: 'none', color: '#d93025', fontWeight: 500, cursor: 'pointer', fontSize: '0.72rem', padding: '4px 8px', borderRadius: '4px' }}
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

                                    {/* Spalte 2: Probezeit / Zahlung ausstehend */}
                                    <div style={{ 
                                      background: '#ffffff', 
                                      border: '1px solid #dadce0', 
                                      borderTop: '3px solid #f9ab00',
                                      borderRadius: '8px', 
                                      padding: '16px',
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f3f4', paddingBottom: '8px' }}>
                                        <strong style={{ fontSize: '0.8rem', color: '#b06000', fontWeight: 600 }}>Ausstehend / Probezeit</strong>
                                        <span style={{ background: '#fef7e0', color: '#b06000', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>
                                          {pendingStudents.length}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                                        {pendingStudents.length === 0 ? (
                                          <span style={{ fontSize: '0.75rem', color: '#5f6368', opacity: 0.7, fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>Keine ausstehenden Schüler</span>
                                        ) : (
                                          pendingStudents.map(s => (
                                            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '6px 10px', borderRadius: '4px', border: '1px solid #fde68a', fontSize: '0.8rem' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#fef7e0', color: '#b06000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.72rem' }}>
                                                  {getInitials(s.first_name, s.last_name)}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                  <span style={{ color: '#202124', fontWeight: 500 }}>{s.first_name} {s.last_name}</span>
                                                  <span style={{ fontSize: '0.65rem', color: '#b06000', fontWeight: 600 }}>
                                                    {s.is_trial ? '⏳ Probezeit' : '⚠️ Zahlung offen'}
                                                  </span>
                                                </div>
                                              </div>
                                              <button 
                                                onClick={() => toggleStudentPayment(s.id, false)}
                                                style={{ 
                                                  border: 'none', 
                                                  background: '#1a73e8', 
                                                  color: '#ffffff', 
                                                  fontWeight: 500, 
                                                  cursor: 'pointer', 
                                                  fontSize: '0.72rem', 
                                                  padding: '4px 10px', 
                                                  borderRadius: '4px',
                                                  transition: 'background 0.2s'
                                                }}
                                                onMouseOver={(e: any) => e.currentTarget.style.background = '#1557b0'}
                                                onMouseOut={(e: any) => e.currentTarget.style.background = '#1a73e8'}
                                              >
                                                Freischalten
                                              </button>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>

                                    {/* Spalte 3: Kostenloser User */}
                                    <div style={{ 
                                      background: '#ffffff', 
                                      border: '1px solid #dadce0', 
                                      borderTop: '3px solid #5f6368',
                                      borderRadius: '8px', 
                                      padding: '16px',
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f3f4', paddingBottom: '8px' }}>
                                        <strong style={{ fontSize: '0.8rem', color: '#5f6368', fontWeight: 600 }}>Kostenlose Basic User</strong>
                                        <span style={{ background: '#f1f3f4', color: '#5f6368', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>
                                          {freeStudents.length}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                                        {freeStudents.length === 0 ? (
                                          <span style={{ fontSize: '0.75rem', color: '#5f6368', opacity: 0.7, fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>Keine kostenlosen Schüler</span>
                                        ) : (
                                          freeStudents.map(s => (
                                            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '6px 10px', borderRadius: '4px', border: '1px solid #dadce0', fontSize: '0.8rem' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#f1f3f4', color: '#5f6368', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.72rem' }}>
                                                  {getInitials(s.first_name, s.last_name)}
                                                </div>
                                                <span style={{ color: '#202124', fontWeight: 500 }}>{s.first_name} {s.last_name}</span>
                                              </div>
                                              <button 
                                                onClick={() => toggleStudentPayment(s.id, false)}
                                                style={{ border: 'none', background: 'none', color: '#1a73e8', fontWeight: 500, cursor: 'pointer', fontSize: '0.72rem', padding: '4px 8px', borderRadius: '4px' }}
                                                onMouseOver={(e: any) => e.currentTarget.style.background = '#e8f0fe'}
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
                                      color: '#1a73e8',
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

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

export function BillingDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
      const rateGroovelab = billingSettings?.price_module_groovelab ?? 2.49;
      const rateTeacher = billingSettings?.price_user_teacher ?? 0.49;
      const rateStudent = billingSettings?.price_user_student ?? 0.49;

      // 2. Fetch schools
      const { data: schools, error: schoolsErr } = await supabase
        .from('schools')
        .select('id, name, subscription_type, has_campus_subscription, has_groovelab_subscription, has_kombi_discount, subscription_bypass, status, is_trial, user_quota, pending_user_quota');

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
        .select('school_id, role, is_active, is_campus_active');

      if (usersErr) throw usersErr;

      const userStatsMap: Record<string, { 
        totalStudents: number; 
        activeStudents: number; 
        premiumStudents: number;
        totalTeachers: number;
        activeTeachers: number;
      }> = {};

      users?.forEach(u => {
        if (!userStatsMap[u.school_id]) {
          userStatsMap[u.school_id] = { 
            totalStudents: 0, 
            activeStudents: 0, 
            premiumStudents: 0,
            totalTeachers: 0,
            activeTeachers: 0
          };
        }
        if (u.role === 'student') {
          userStatsMap[u.school_id].totalStudents++;
          if (u.is_active) {
            userStatsMap[u.school_id].activeStudents++;
          }
          if (u.is_campus_active) {
            userStatsMap[u.school_id].premiumStudents++;
          }
        } else if (u.role === 'teacher' || u.role === 'lehrer' || u.role === 'admin') {
          userStatsMap[u.school_id].totalTeachers++;
          if (u.is_active) {
            userStatsMap[u.school_id].activeTeachers++;
          }
        }
      });

      const calculatedInvoices: Invoice[] = (schools || []).map(school => {
        const activeCampusUsers = metricsMap[school.id] || 0;
        
        const stats = userStatsMap[school.id] || { 
          totalStudents: 0, 
          activeStudents: 0, 
          premiumStudents: 0, 
          totalTeachers: 0, 
          activeTeachers: 0 
        };

        const totalStudents = stats.totalStudents;
        const activeStudents = stats.activeStudents;
        const premiumStudents = stats.premiumStudents;
        const totalTeachers = stats.totalTeachers;
        const activeTeachers = stats.activeTeachers;

        // MODULE BASE FEE CALCULATION
        let baseFee = 0;
        if (school.has_campus_subscription) baseFee += rateCampus;
        if (school.has_groovelab_subscription) baseFee += rateGroovelab;

        // COMBINATION DISCOUNT
        const hasKombi = school.has_kombi_discount || (school.has_campus_subscription && school.has_groovelab_subscription);
        const kombiDiscountAmount = hasKombi ? 1.00 : 0.00;

        // B2B USER LICENSES REVENUE: (activeStudents * rateStudent) + (activeTeachers * rateTeacher)
        const userFee = (activeStudents * rateStudent) + (activeTeachers * rateTeacher);
        
        // B2C REVENUE (e.g. from student upgrades)
        const b2cRevenue = premiumStudents * 9.99;

        // Subtotal B2B
        const subtotal = Math.max(0, baseFee + userFee - kombiDiscountAmount);
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
          totalTeachers,
          activeTeachers,
          b2bRevenue: parseFloat((baseFee + userFee - kombiDiscountAmount).toFixed(2)),
          b2cRevenue: parseFloat(b2cRevenue.toFixed(2)),
          userQuota: school.user_quota || 150,
          pendingUserQuota: school.pending_user_quota
        };
      });

      const totalRevenue = calculatedInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalActiveCampusUsers = calculatedInvoices.reduce((sum, inv) => sum + inv.activeCampusUsers, 0);
      const bypassedSchools = calculatedInvoices.filter(inv => inv.subscriptionBypass).length;
      const totalB2BRevenue = calculatedInvoices.reduce((sum, inv) => sum + inv.total, 0); // Active invoices sum
      const totalB2CRevenue = calculatedInvoices.reduce((sum, inv) => sum + inv.b2cRevenue, 0);
      const totalTeachers = calculatedInvoices.reduce((sum, inv) => sum + inv.totalTeachers, 0);
      const totalStudents = calculatedInvoices.reduce((sum, inv) => sum + inv.totalStudents, 0);

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
          border-radius: 24px;
          padding: 28px;
          border: 1px solid rgba(15, 23, 42, 0.06);
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.02);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
          overflow: hidden;
        }
        .billing-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.04);
          border-color: rgba(16, 185, 129, 0.15);
        }
        .billing-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: transparent;
          transition: background 0.3s;
        }
        .billing-card-campus::before {
          background: linear-gradient(to bottom, #10b981, #059669);
        }
        .billing-card-groovelab::before {
          background: linear-gradient(to bottom, #eab308, #ca8a04);
        }
        .billing-card-purple::before {
          background: linear-gradient(to bottom, #8b5cf6, #6d28d9);
        }
        .billing-card-slate::before {
          background: linear-gradient(to bottom, #64748b, #475569);
        }

        .filter-btn {
          padding: 8px 18px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: #ffffff;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-btn:hover {
          background: #f8fafc;
          color: #0f172a;
          border-color: rgba(15, 23, 42, 0.15);
        }
        .filter-btn-active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        .billing-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 10px;
          text-align: left;
        }
        .billing-table th {
          padding: 16px 20px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          border-bottom: 2px solid #f1f5f9;
        }
        .billing-row {
          background: #ffffff;
          transition: all 0.25s;
        }
        .billing-row td {
          padding: 20px;
          font-size: 0.88rem;
          font-weight: 600;
          color: #334155;
          border-top: 1px solid rgba(15, 23, 42, 0.04);
          border-bottom: 1px solid rgba(15, 23, 42, 0.04);
        }
        .billing-row td:first-child {
          border-left: 1px solid rgba(15, 23, 42, 0.04);
          border-top-left-radius: 16px;
          border-bottom-left-radius: 16px;
        }
        .billing-row td:last-child {
          border-right: 1px solid rgba(15, 23, 42, 0.04);
          border-top-right-radius: 16px;
          border-bottom-right-radius: 16px;
        }
        .billing-row:hover td {
          background: rgba(16, 185, 129, 0.015);
          border-color: rgba(16, 185, 129, 0.08);
        }
        .billing-row-expanded td {
          background: rgba(15, 23, 42, 0.01) !important;
          border-bottom-left-radius: 0 !important;
          border-bottom-right-radius: 0 !important;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 800;
        }
        .status-badge-active {
          color: #065f46;
          background: #ecfdf5;
          border: 1px solid #d1fae5;
        }
        .status-badge-trial {
          color: #92400e;
          background: #fffbeb;
          border: 1px solid #fef3c7;
        }
        .status-badge-bypass {
          color: #991b1b;
          background: #fef2f2;
          border: 1px solid #fee2e2;
        }
        .status-badge-suspended {
          color: #374151;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
        }

        .action-icon-btn {
          border: none;
          background: none;
          cursor: pointer;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .action-icon-btn:hover {
          color: #0f172a;
          background: #f1f5f9;
        }

        .invoice-card {
          background: #f8fafc;
          border-radius: 16px;
          border: 1px solid rgba(15, 23, 42, 0.05);
          padding: 24px;
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
            <CreditCard style={{ color: '#10b981' }} size={32} /> Partner-Abrechnung &amp; Lizenzen
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
            border: '1px solid rgba(15, 23, 42, 0.12)',
            borderRadius: '14px',
            padding: '12px 20px',
            fontWeight: 800,
            fontSize: '0.85rem',
            color: '#1e293b',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.transform = 'none'; }}
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
          color: '#e11d48',
          backgroundColor: '#fff1f2',
          border: '1px solid #ffe4e6',
          padding: '16px 20px',
          borderRadius: '16px',
          fontSize: '0.88rem',
          fontWeight: 700
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
        <div className="billing-card billing-card-campus">
          <div style={{
            height: '52px',
            width: '52px',
            borderRadius: '14px',
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <School size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>B2B Umsatz (Schulen)</span>
            <span style={{ display: 'block', fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', marginTop: '4px', fontFamily: '"Outfit", sans-serif' }}>
              {summary.totalB2BRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total B2C Revenue */}
        <div className="billing-card billing-card-groovelab">
          <div style={{
            height: '52px',
            width: '52px',
            borderRadius: '14px',
            background: 'rgba(234, 179, 8, 0.1)',
            color: '#ca8a04',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>B2C Umsatz (App-Käufe)</span>
            <span style={{ display: 'block', fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', marginTop: '4px', fontFamily: '"Outfit", sans-serif' }}>
              {summary.totalB2CRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total registered students */}
        <div className="billing-card billing-card-purple">
          <div style={{
            height: '52px',
            width: '52px',
            borderRadius: '14px',
            background: 'rgba(139, 92, 246, 0.1)',
            color: '#8b5cf6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Aktive Nutzer</span>
            <span style={{ display: 'block', fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', marginTop: '4px', fontFamily: '"Outfit", sans-serif' }}>
              {summary.totalStudents} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Schüler</span>
            </span>
          </div>
        </div>

        {/* Bypassed Schools */}
        <div className="billing-card billing-card-slate">
          <div style={{
            height: '52px',
            width: '52px',
            borderRadius: '14px',
            background: 'rgba(100, 116, 139, 0.1)',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Ban size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Abo-Bypass aktiv</span>
            <span style={{ display: 'block', fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', marginTop: '4px', fontFamily: '"Outfit", sans-serif' }}>
              {summary.bypassedSchools} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Schulen</span>
            </span>
          </div>
        </div>

      </div>

      {/* Filters & Search Toolbar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '20px 24px',
        border: '1px solid rgba(15, 23, 42, 0.05)',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.01)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
          <input
            type="text"
            placeholder="Musikschule suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 16px 12px 46px',
              borderRadius: '14px',
              border: '1px solid rgba(15, 23, 42, 0.12)',
              fontSize: '0.88rem',
              fontWeight: 600,
              outline: 'none',
              transition: 'all 0.2s',
              color: '#1e293b'
            }}
            onFocus={(e) => e.target.style.borderColor = '#10b981'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(15, 23, 42, 0.12)'}
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
              <th style={{ width: '12%', textAlign: 'right' }}>B2B Module + Lizenzen</th>
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
                const schoolInvoices = getSchoolInvoices(inv.schoolId, inv.total);
                
                return (
                  <React.Fragment key={inv.schoolId}>
                    <tr 
                      className={`billing-row ${isExpanded ? 'billing-row-expanded' : ''}`}
                      onClick={() => setExpandedSchoolId(isExpanded ? null : inv.schoolId)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* School Name */}
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            color: '#94a3b8', 
                            transform: isExpanded ? 'rotate(90deg)' : 'none', 
                            transition: 'transform 0.2s',
                            display: 'inline-block' 
                          }}>
                            ▶
                          </span>
                          {inv.schoolName}
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
                          <span style={{ color: '#0f172a', fontWeight: 750 }}>{inv.totalStudents} Schüler</span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{inv.totalTeachers} Lehrer</span>
                        </div>
                      </td>

                      {/* Active Campus Users */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          fontSize: '0.78rem', 
                          fontWeight: 750, 
                          color: '#4f46e5', 
                          backgroundColor: '#e0e7ff', 
                          padding: '4px 10px', 
                          borderRadius: '8px' 
                        }}>
                          🎓 {inv.premiumStudents} Campus
                        </span>
                      </td>

                      {/* Detailed B2B Modules & Licenses calculation */}
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700 }}>
                        <div>{inv.b2bRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                          Base + ({inv.activeStudents} active x 0,49 €)
                        </div>
                      </td>

                      {/* Est. B2C Upgrades */}
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: '#059669' }}>
                        <div>{inv.b2cRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
                        <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
                          {inv.premiumStudents} upgraded x 9,99 €
                        </div>
                      </td>

                      {/* Active Quota */}
                      <td style={{ textAlign: 'center', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 800, color: '#1e293b' }}>{inv.userQuota}</span>
                        {inv.pendingUserQuota && (
                          <div style={{ fontSize: '0.65rem', color: '#7c3aed', fontWeight: 800, marginTop: '2px' }}>
                            ⏳ Next: {inv.pendingUserQuota}
                          </div>
                        )}
                      </td>

                      {/* B2B Total Invoice */}
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>
                        <div>{inv.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
                        {inv.subscriptionBypass && (
                          <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Bypass Aktiv
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Invoice History Details */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} style={{ 
                          padding: '0 20px 24px 20px', 
                          background: 'rgba(15, 23, 42, 0.01)',
                          borderBottomLeftRadius: '16px',
                          borderBottomRightRadius: '16px',
                          borderLeft: '1px solid rgba(15, 23, 42, 0.04)',
                          borderRight: '1px solid rgba(15, 23, 42, 0.04)',
                          borderBottom: '1px solid rgba(15, 23, 42, 0.04)'
                        }}>
                          <div className="invoice-card" onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                              <BookOpen size={16} style={{ color: '#64748b' }} />
                              <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Abrechnungs- und Rechnungshistorie ({inv.schoolName})
                              </h4>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {schoolInvoices.map(invoice => (
                                <div 
                                  key={invoice.id} 
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    padding: '12px 18px', 
                                    backgroundColor: '#ffffff', 
                                    borderRadius: '12px',
                                    border: '1px solid rgba(15, 23, 42, 0.03)',
                                    flexWrap: 'wrap',
                                    gap: '12px'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>{invoice.id}</span>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{invoice.date}</span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 850, color: '#334155' }}>
                                      {invoice.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {invoice.status === 'Vorschau' && (
                                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#d97706', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '4px 10px', borderRadius: '20px' }}>
                                        Vorschau (fällig am Monatsende)
                                      </span>
                                    )}
                                    {invoice.status === 'Versendet' && (
                                      <>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ea580c', backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '4px 10px', borderRadius: '20px' }}>
                                          Versendet (Offen)
                                        </span>
                                        <button
                                          onClick={() => toggleInvoicePaid(inv.schoolId, invoice.id)}
                                          style={{
                                            backgroundColor: '#10b981',
                                            border: 'none',
                                            color: '#ffffff',
                                            borderRadius: '8px',
                                            padding: '6px 12px',
                                            fontSize: '0.75rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                          }}
                                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                                        >
                                          ✓ Bezahlt
                                        </button>
                                      </>
                                    )}
                                    {invoice.status === 'Bezahlt' && (
                                      <>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669', backgroundColor: '#ecfdf5', border: '1px solid #d1fae5', padding: '4px 10px', borderRadius: '20px' }}>
                                          Bezahlt
                                        </span>
                                        <button
                                          onClick={() => toggleInvoicePaid(inv.schoolId, invoice.id)}
                                          style={{
                                            backgroundColor: '#f1f5f9',
                                            border: 'none',
                                            color: '#475569',
                                            borderRadius: '8px',
                                            padding: '6px 12px',
                                            fontSize: '0.75rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                          }}
                                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                        >
                                          Auf Offen setzen
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
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

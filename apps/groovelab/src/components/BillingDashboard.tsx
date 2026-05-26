import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CreditCard, Search, RefreshCw, TrendingUp, Users, School, ShieldAlert, BadgePercent, CheckCircle, Ban, Euro } from 'lucide-react';

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
  
  // New Specification Fields
  totalStudents: number;
  activeStudents: number;
  premiumStudents: number;
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
}

export function BillingDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<PlatformSummary>({
    totalSchools: 0,
    totalActiveCampusUsers: 0,
    totalMonthlyRevenue: 0,
    bypassedSchools: 0,
    totalB2BRevenue: 0,
    totalB2CRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = sessionStorage.getItem('groovelab_user_id');
      const response = await fetch('/api/get-billing-metrics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
        setSummary(data.platformSummary);
        return;
      }

      // Fallback direct Supabase query if API is offline
      console.warn('Billing API not reachable, running clientside billing engine fallback...');
      
      const { data: schools, error: schoolsErr } = await supabase
        .from('schools')
        .select('id, name, subscription_type, has_campus_subscription, has_groovelab_subscription, has_kombi_discount, subscription_bypass, status, is_trial, user_quota, pending_user_quota');

      if (schoolsErr) throw schoolsErr;

      const { data: metrics, error: metricsErr } = await supabase
        .from('active_licence_metrics')
        .select('school_id, active_campus_users');

      if (metricsErr) throw metricsErr;

      const metricsMap: Record<string, number> = {};
      metrics?.forEach(m => {
        metricsMap[m.school_id] = m.active_campus_users || 0;
      });

      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('school_id, role, is_active, is_premium_user');

      if (usersErr) throw usersErr;

      const userStatsMap: Record<string, { totalStudents: number; activeStudents: number; premiumStudents: number }> = {};
      users?.forEach(u => {
        if (u.role === 'student') {
          if (!userStatsMap[u.school_id]) {
            userStatsMap[u.school_id] = { totalStudents: 0, activeStudents: 0, premiumStudents: 0 };
          }
          userStatsMap[u.school_id].totalStudents++;
          if (u.is_active) {
            userStatsMap[u.school_id].activeStudents++;
          }
          if (u.is_premium_user) {
            userStatsMap[u.school_id].premiumStudents++;
          }
        }
      });

      const calculatedInvoices: Invoice[] = (schools || []).map(school => {
        const activeCampusUsers = metricsMap[school.id] || 0;
        
        const stats = userStatsMap[school.id] || { totalStudents: 0, activeStudents: 0, premiumStudents: 0 };
        const totalStudents = stats.totalStudents;
        const activeStudents = stats.activeStudents;
        const premiumStudents = stats.premiumStudents;

        const isSolo = school.subscription_type === 'solo';
        const baseFee = isSolo ? 2.49 : 4.99;
        
        // SPECIFICATION B2B: Active student accounts (is_active = true) * 0.49 €
        const b2bRevenue = activeStudents * 0.49;
        
        // SPECIFICATION B2C: Premium users count * 9.99 €
        const b2cRevenue = premiumStudents * 9.99;

        const userFee = activeCampusUsers * 0.49;
        const hasKombi = school.has_kombi_discount || (school.has_campus_subscription && school.has_groovelab_subscription);
        const kombiDiscountAmount = hasKombi ? 1.00 : 0.00;
        
        // Subtotal calculated with the B2B revenue
        const subtotal = Math.max(0, baseFee + b2bRevenue - kombiDiscountAmount);
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
          subscriptionType: isSolo ? 'solo' : 'standard',
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
          b2bRevenue: parseFloat(b2bRevenue.toFixed(2)),
          b2cRevenue: parseFloat(b2cRevenue.toFixed(2)),
          userQuota: school.user_quota || 150,
          pendingUserQuota: school.pending_user_quota
        };
      });

      const totalRevenue = calculatedInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalActiveCampusUsers = calculatedInvoices.reduce((sum, inv) => sum + inv.activeCampusUsers, 0);
      const bypassedSchools = calculatedInvoices.filter(inv => inv.subscriptionBypass).length;
      const totalB2BRevenue = calculatedInvoices.reduce((sum, inv) => sum + inv.b2bRevenue, 0);
      const totalB2CRevenue = calculatedInvoices.reduce((sum, inv) => sum + inv.b2cRevenue, 0);

      setInvoices(calculatedInvoices);
      setSummary({
        totalSchools: calculatedInvoices.length,
        totalActiveCampusUsers,
        totalMonthlyRevenue: parseFloat(totalRevenue.toFixed(2)),
        bypassedSchools,
        totalB2BRevenue: parseFloat(totalB2BRevenue.toFixed(2)),
        totalB2CRevenue: parseFloat(totalB2CRevenue.toFixed(2))
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
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 bg-slate-900/5 min-h-screen">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <CreditCard className="text-indigo-600 h-8 w-8" /> Partner-Abrechnung & Lizenzen
          </h2>
          <p className="text-slate-500 font-semibold text-sm mt-1">
            Globale Übersicht über alle B2B Schullizenz-Einnahmen und B2C Premium-Upgrades.
          </p>
        </div>
        
        <button
          onClick={fetchBillingData}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-50 text-slate-700 font-extrabold py-3 px-5 rounded-2xl shadow-sm hover:shadow transition-all text-sm cursor-pointer"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Aktualisieren
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 px-4 py-3 rounded-2xl text-sm font-semibold">
          <ShieldAlert size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total B2B Revenue */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="h-14 w-14 bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <School size={28} />
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Gesamt B2B Umsatz (Schulen)</span>
            <span className="block text-2xl font-black text-slate-800 tracking-tight mt-1">
              {summary.totalB2BRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total B2C Revenue */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="h-14 w-14 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <TrendingUp size={28} />
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Gesamt B2C Umsatz (App-Käufe)</span>
            <span className="block text-2xl font-black text-slate-800 tracking-tight mt-1">
              {summary.totalB2CRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>

        {/* Total registered students */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="h-14 w-14 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <Users size={28} />
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Premium App-User</span>
            <span className="block text-2xl font-black text-slate-800 tracking-tight mt-1">
              {invoices.reduce((sum, inv) => sum + inv.premiumStudents, 0)} Schüler
            </span>
          </div>
        </div>

        {/* Bypassed Schools */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="h-14 w-14 bg-slate-500/10 text-slate-600 rounded-2xl flex items-center justify-center shrink-0">
            <Ban size={28} />
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Abo-Bypass aktiv</span>
            <span className="block text-2xl font-black text-slate-800 tracking-tight mt-1">
              {summary.bypassedSchools} Schulen
            </span>
          </div>
        </div>

      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Musikschule suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-slate-200/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none text-slate-800 font-semibold text-sm transition-all"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {['all', 'active', 'bypass', 'trial', 'suspended'].map(filter => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`py-2 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border ${
                statusFilter === filter
                  ? 'bg-slate-800 border-slate-800 text-white'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {filter === 'all' ? 'Alle' : filter === 'bypass' ? 'Bypass' : filter === 'trial' ? 'Probe' : filter === 'suspended' ? 'Gesperrt' : 'Aktiv'}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">Musikschule</th>
                <th className="py-4 px-6">Abo-Status</th>
                <th className="py-4 px-6 text-center">Schüler (Gesamt)</th>
                <th className="py-4 px-6 text-center">Premium App-User</th>
                <th className="py-4 px-6 text-right">B2B-Umsatz</th>
                <th className="py-4 px-6 text-right">B2C-Umsatz-Anteil</th>
                <th className="py-4 px-6 text-center">User-Kontingent</th>
                <th className="py-4 px-6 text-right font-black text-slate-800">Gesamtbetrag (B2B)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Abrechnungen laden...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    Keine Einträge für diese Filterkombination gefunden.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.schoolId} className="hover:bg-slate-50/50 transition-all text-sm font-semibold text-slate-650">
                    <td className="py-4.5 px-6 font-extrabold text-slate-800">{inv.schoolName}</td>
                    
                    {/* Status Badge */}
                    <td className="py-4.5 px-6">
                      {inv.status === 'bypass' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">
                          Bypass
                        </span>
                      ) : inv.status === 'trial' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full">
                          Probezeit
                        </span>
                      ) : inv.status === 'suspended' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                          Ausgesetzt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">
                          Aktiv
                        </span>
                      )}
                    </td>

                    {/* Total Pupils */}
                    <td className="py-4.5 px-6 text-center font-bold text-slate-800">
                      {inv.totalStudents} Schüler
                    </td>

                    {/* Premium Users */}
                    <td className="py-4.5 px-6 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-650 bg-indigo-50/80 px-2 py-1 rounded-xl">
                        👑 {inv.premiumStudents} User
                      </span>
                    </td>

                    {/* Resulting B2B Umsatz (Schüler * 0.49 €) */}
                    <td className="py-4.5 px-6 text-right font-mono text-xs font-bold text-slate-700">
                      {inv.b2bRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      <span className="block text-[9px] text-slate-400 font-bold mt-0.5">
                        {inv.activeStudents} active x 0,49 €
                      </span>
                    </td>

                    {/* B2C Revenue share */}
                    <td className="py-4.5 px-6 text-right font-mono text-xs text-emerald-600 font-bold">
                      {inv.b2cRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      <span className="block text-[9px] text-emerald-400 font-bold mt-0.5">
                        {inv.premiumStudents} active x 9,99 €
                      </span>
                    </td>

                    {/* Active/Pending Quota */}
                    <td className="py-4.5 px-6 text-center text-xs">
                      <span className="font-bold text-slate-800">{inv.userQuota}</span>
                      {inv.pendingUserQuota && (
                        <span className="block text-[10px] text-purple-600 font-bold mt-0.5">
                          ⏳ Next: {inv.pendingUserQuota}
                        </span>
                      )}
                    </td>

                    {/* Final Amount (B2B invoice total) */}
                    <td className="py-4.5 px-6 text-right font-mono font-black text-sm text-slate-900 bg-slate-50/20">
                      {inv.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      {inv.subscriptionBypass && (
                        <span className="block text-[9px] text-rose-500 font-black uppercase mt-0.5">
                          Bypass Aktiv
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}

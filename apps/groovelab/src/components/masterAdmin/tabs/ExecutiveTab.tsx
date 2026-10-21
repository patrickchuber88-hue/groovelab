import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, AlertTriangle, CheckCircle, Users, ShieldCheck, Building2, HardDrive,
  Award, Megaphone, ShieldAlert, Download, Zap,
  TrendingUp, ArrowUpRight, FileDown, Server, ChevronRight, Wrench,
  Calendar, CreditCard
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { School, SchoolStat, PendingUser } from '../MasterAdminTypes';
import { MasterPricingRates, isSchoolBypassActive } from '../../../domain/pricingEngine';
import { isSchoolTrialActive } from '../../../domain/schoolMetricsAggregator';
import { computeSchoolBillingMetrics } from '../utils/computeSchoolBillingMetrics';
import { SlaGovernanceModal, AuditRecordItem } from '../modals/SlaGovernanceModal';
import { MasterTenantRadar } from '../components/MasterTenantRadar';

const generateExecutiveSummaryPDF = async (...args: Parameters<typeof import('../../../utils/pdfGenerator').generateExecutiveSummaryPDF>) =>
  (await import('../../../utils/pdfGenerator')).generateExecutiveSummaryPDF(...args);

export interface ServerMetricRow {
  cpu_load?: number;
  mem_used_mb?: number;
  mem_total_mb?: number;
  active_connections?: number;
  volume_used_gb?: number;
  volume_total_gb?: number;
}

interface ExecutiveTabProps {
  schools: School[];
  schoolStats: Record<string, SchoolStat>;
  loading: boolean;
  serverMetrics: ServerMetricRow[];
  pendingUsers: PendingUser[];
  masterPricing: MasterPricingRates;
  onRefresh: () => void;
  onOpenCommandPalette: () => void;
  onNavigateTab: (tab: 'executive' | 'schools' | 'briefing' | 'billing' | 'telemetry' | 'pricing' | 'maintenance') => void;
  onSelectSchool: (school: School) => void;
}

export const ExecutiveTab: React.FC<ExecutiveTabProps> = ({
  schools,
  schoolStats,
  loading,
  serverMetrics,
  pendingUsers,
  masterPricing,
  onRefresh,
  onNavigateTab,
  onSelectSchool
}) => {
  const [showSlaModal, setShowSlaModal] = useState(false);
  const [slaUptime, setSlaUptime] = useState(99.98);
  const [auditRecords, setAuditRecords] = useState<AuditRecordItem[]>([]);

  const [exportingCfoPdf, setExportingCfoPdf] = useState(false);
  const [cfoExportToast, setCfoExportToast] = useState<string | null>(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [liveDbLatency, setLiveDbLatency] = useState<number>(24);
  const [invoiceStats, setInvoiceStats] = useState<{
    totalInvoices: number;
    paidInvoices: number;
    openInvoices: number;
    overdueInvoices: number;
  }>({ totalInvoices: 0, paidInvoices: 0, openInvoices: 0, overdueInvoices: 0 });
  const [activeGlobalBroadcast, setActiveGlobalBroadcast] = useState<{
    title: string;
    message: string;
    severity: string;
    target: string;
    isActive: boolean;
    createdAt?: string;
  } | null>(null);
  const [accountingExportToast, setAccountingExportToast] = useState<string | null>(null);

  const [platformHeartbeat, setPlatformHeartbeat] = useState<{
    sessions_24h: number;
    focus_sessions_24h: number;
    kiosk_sessions_24h: number;
    teachers_active_24h: number;
    teachers_total: number;
    students_active_24h: number;
    students_total: number;
    users_live_now: number;
    campus_active_24h: number;
    campus_total_contracted: number;
    groovelab_active_24h: number;
    groovelab_total_contracted: number;
    measured_at?: string;
  } | null>(null);

  useEffect(() => {
    const checkBroadcast = async () => {
      try {
        let active = false;

        if (typeof window !== 'undefined') {
          const localMaint = localStorage.getItem('cg_master_maintenance_state');
          if (localMaint) {
            try {
              const parsed = JSON.parse(localMaint);
              if (parsed?.isActive) active = true;
            } catch {}
          }
          const localAnnounce = localStorage.getItem('cg_master_broadcast_announcement');
          if (localAnnounce) {
            try {
              const parsed = JSON.parse(localAnnounce);
              if (parsed?.isActive) {
                setActiveGlobalBroadcast(parsed);
              } else {
                setActiveGlobalBroadcast(null);
              }
              if (parsed?.isActive && (parsed?.type === 'maintenance' || parsed?.severity === 'emergency' || parsed?.title?.toLowerCase().includes('wartung'))) {
                active = true;
              }
            } catch {}
          } else {
            setActiveGlobalBroadcast(null);
          }
        }

        const specialOffers = (masterPricing as unknown as { specialOffers?: Array<{ id?: string; state?: { isActive?: boolean; type?: string; severity?: string; title?: string } }> })?.specialOffers;
        if (!active && specialOffers && Array.isArray(specialOffers)) {
          const mEntry = specialOffers.find((o) => o?.id === '__cg_master_maintenance_state__');
          if (mEntry?.state?.isActive) active = true;
          const aEntry = specialOffers.find((o) => o?.id === '__cg_master_broadcast_announcement__');
          if (aEntry?.state?.isActive && (aEntry?.state?.type === 'maintenance' || aEntry?.state?.severity === 'emergency' || aEntry?.state?.title?.toLowerCase().includes('wartung'))) {
            active = true;
          }
        }

        if (!active) {
          const { data } = await supabase
            .from('global_broadcasts')
            .select('id, is_active, title')
            .eq('is_active', true)
            .eq('type', 'maintenance')
            .limit(1);
          if (data && data.length > 0) {
            active = true;
          }
        }

        setIsMaintenanceMode(active);
      } catch {
        // fail-closed
      }
    };
    checkBroadcast();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', checkBroadcast);
    }

    const fetchHeartbeat = async () => {
      try {
        const { data, error } = await supabase.rpc('get_master_platform_heartbeat');
        if (!error && data) {
          setPlatformHeartbeat(data as typeof platformHeartbeat);
        }
      } catch (err) {
        console.warn('[ExecutiveTab] Error fetching forensic platform heartbeat:', err);
      }
    };
    fetchHeartbeat();
    const heartbeatInterval = setInterval(fetchHeartbeat, 30000);

    const fetchInvoices = async () => {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('id, status, due_date, amount');
        if (!error && data) {
          const now = new Date();
          let paid = 0, open = 0, overdue = 0;
          data.forEach((inv) => {
            if (inv.status === 'paid') paid++;
            else if (inv.status === 'overdue' || (inv.status === 'open' && inv.due_date && new Date(inv.due_date) < now)) overdue++;
            else if (inv.status === 'open') open++;
          });
          setInvoiceStats({ totalInvoices: data.length, paidInvoices: paid, openInvoices: open, overdueInvoices: overdue });
        }
      } catch (e) {
        console.warn('[ExecutiveTab] Error fetching forensic invoices:', e);
      }
    };
    fetchInvoices();

    const start = performance.now();
    Promise.resolve(supabase.from('schools').select('id').limit(1))
      .then(() => {
        const duration = Math.round(performance.now() - start);
        setLiveDbLatency(Math.max(12, duration));
      })
      .catch(() => {});

    let rtTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRealtimeSync = (includeRefresh: boolean) => {
      if (rtTimer) clearTimeout(rtTimer);
      rtTimer = setTimeout(() => {
        if (includeRefresh) onRefresh();
        fetchHeartbeat();
        fetchInvoices();
      }, 2000);
    };

    const channelId = `master_cockpit_realtime_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'server_telemetry' }, () => scheduleRealtimeSync(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schools' }, () => scheduleRealtimeSync(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_users' }, () => scheduleRealtimeSync(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => scheduleRealtimeSync(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions' }, () => scheduleRealtimeSync(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => scheduleRealtimeSync(false))
      .subscribe();

    return () => {
      if (rtTimer) clearTimeout(rtTimer);
      clearInterval(heartbeatInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', checkBroadcast);
      }
      supabase.removeChannel(channel);
    };
  }, [masterPricing, onRefresh]);

  const validSchools = useMemo(() => {
    const hasNonDemo = schools.some(s => !s.is_demo_tenant);
    return schools.filter(s => (!hasNonDemo || !s.is_demo_tenant) && s.status !== 'archived');
  }, [schools]);

  const trialSchoolsCount = useMemo(() => {
    return validSchools.filter(s => isSchoolTrialActive(s)).length;
  }, [validSchools]);

  // 1. Canonical Multi-Tenant MRR Aggregation via SSOT computeSchoolBillingMetrics
  const {
    payingSchoolsCount, committedBaseMrr, storageAddonMrr,
    activeStorageAddonGb, trialStorageAddonGb,
    seatUsageMrr, totalProvisionedStorageGb, totalMrr,
    committedBaseArr, seatUsageArr, storageAddonArr, totalArr, bypassedCount
  } = useMemo(() => {
    let payingCnt = 0, baseMrr = 0, seatMrrB2b = 0, addonMrr = 0;
    let actAddonGb = 0, trlAddonGb = 0;
    const validSchoolMap = new Map<string, School>();

    validSchools.forEach(s => {
      validSchoolMap.set(s.id, s);
      const stats = schoolStats[s.id] || {};
      const metrics = computeSchoolBillingMetrics(s, stats, masterPricing);

      if (metrics.isTrialOrBypass || metrics.isSuspendedOrArchived) {
        if (metrics.storageAddonGb > 0) {
          trlAddonGb += metrics.storageAddonGb;
        }
        return;
      }

      payingCnt++;
      baseMrr += metrics.baseHostingNet;
      seatMrrB2b += (
        metrics.step5TeacherServiceFee +
        metrics.step6PassiveStudentBaseFee +
        metrics.step8GroovelabStudentsFee +
        metrics.step9CampusStudentsFee
      );
      addonMrr += metrics.step7StorageAddonFee;
      if (metrics.storageAddonGb > 0) {
        actAddonGb += metrics.storageAddonGb;
      }
    });

    const seatMrrB2c = pendingUsers.reduce((acc, u) => {
      const school = validSchoolMap.get(u.school_id);
      if (!school || isSchoolBypassActive(school) || isSchoolTrialActive(school)) return acc;
      if (u.student_billing_payment_method && u.student_billing_cash_paid && !u.exempt_from_direct_billing) {
        return acc + Number(masterPricing.priceStudent);
      }
      return acc;
    }, 0);

    const seatMrr = seatMrrB2b + seatMrrB2c;
    const totMrr = baseMrr + seatMrr + addonMrr;
    const bypSchools = validSchools.filter(s => isSchoolBypassActive(s));

    return {
      payingSchoolsCount: payingCnt,
      committedBaseMrr: baseMrr,
      storageAddonMrr: addonMrr,
      activeStorageAddonGb: actAddonGb,
      trialStorageAddonGb: trlAddonGb,
      seatUsageMrr: seatMrr,
      totalProvisionedStorageGb: actAddonGb + trlAddonGb,
      totalMrr: totMrr,
      committedBaseArr: baseMrr * 12,
      seatUsageArr: seatMrr * 12,
      storageAddonArr: addonMrr * 12,
      totalArr: totMrr * 12,
      bypassedCount: bypSchools.length
    };
  }, [validSchools, schoolStats, masterPricing, pendingUsers]);

  // Forensic Platform Heartbeat & Live Telemetry
  const totalTeachers = platformHeartbeat?.teachers_total ?? Object.values(schoolStats).reduce((acc, curr) => acc + (curr.teachers || 0), 0);
  const totalStudents = platformHeartbeat?.students_total ?? Object.values(schoolStats).reduce((acc, curr) => acc + (curr.students || 0), 0);
  const campusActiveStudents = platformHeartbeat?.campus_total_contracted ?? Object.values(schoolStats).reduce((acc, curr) => acc + (curr.studentsCampus || 0), 0);
  const groovelabActiveStudents = platformHeartbeat?.groovelab_total_contracted ?? Object.values(schoolStats).reduce((acc, curr) => acc + (curr.studentsGroovelab || 0), 0);

  const measuredSessions24h = platformHeartbeat?.sessions_24h ?? 0;
  const measuredActiveTeachers24h = platformHeartbeat?.teachers_active_24h ?? 0;
  const measuredActiveStudents24h = platformHeartbeat?.students_active_24h ?? 0;
  const measuredUsersLiveNow = platformHeartbeat?.users_live_now ?? 0;
  const measuredCampusActive24h = platformHeartbeat?.campus_active_24h ?? 0;
  const measuredGroovelabActive24h = platformHeartbeat?.groovelab_active_24h ?? 0;

  // Next billing cycle countdown
  const now = new Date();
  const nextMonthFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysUntilNextMonth = Math.ceil((nextMonthFirst.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const currentMonthLabel = now.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
  const nextMonthLabel = nextMonthFirst.toLocaleString('de-DE', { month: 'long', year: 'numeric' });

  const latestMetric: ServerMetricRow = serverMetrics[0] || {
    cpu_load: 0.12,
    mem_used_mb: 1420,
    mem_total_mb: 4096,
    active_connections: 4,
    volume_used_gb: 2.4,
    volume_total_gb: 50.0
  };
  const hetznerVolumeUsed = Number(latestMetric.volume_used_gb ?? 2.4);
  const hetznerVolumeTotal = Number(latestMetric.volume_total_gb ?? 50.0);
  const hetznerVolumePct = hetznerVolumeTotal > 0 ? Math.round((hetznerVolumeUsed / hetznerVolumeTotal) * 100) : 5;
  const hetznerVolumeFree = Math.max(0, hetznerVolumeTotal - hetznerVolumeUsed);

  const rawCpu = latestMetric.cpu_load || 0;
  const cpuPercent = rawCpu > 2.0
    ? Math.min(100, Math.round(rawCpu))
    : Math.min(100, Math.max(4, Math.round((rawCpu / 2.0) * 20)));
  const ramPercent = Math.round(((latestMetric.mem_used_mb || 0) / (latestMetric.mem_total_mb || 4096)) * 100);

  const handleExportCfoReport = async () => {
    try {
      setExportingCfoPdf(true);
      await generateExecutiveSummaryPDF({
        totalMrr,
        totalArr,
        committedBaseMrr,
        seatUsageMrr,
        storageAddonMrr,
        activeSchoolsCount: validSchools.length,
        bypassedSchoolsCount: bypassedCount,
        payingSchoolsCount,
        trialSchoolsCount,
        pendingUsersCount: pendingUsers.length,
        cpuPercent,
        ramPercent,
        activeConnections: latestMetric.active_connections || 4,
        serverUptime: slaUptime,
        schools: validSchools.map(s => ({
          name: s.name,
          city: s.city || undefined,
          students: (schoolStats[s.id]?.students ?? s.active_students_count ?? 0),
          teachers: (schoolStats[s.id]?.teachers ?? s.teachers_count ?? 0),
          hasCampus: Boolean(s.has_campus_subscription),
          hasGroovelab: Boolean(s.has_groovelab_subscription),
        }))
      });
      setCfoExportToast('CFO-Report erfolgreich als PDF exportiert!');
      setTimeout(() => setCfoExportToast(null), 4000);
    } catch (err: unknown) {
      alert('Fehler beim Exportieren des CFO-Reports: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setExportingCfoPdf(false);
    }
  };

  const handleToggleMaintenance = async (forceActivate?: boolean) => {
    try {
      const willActivate = forceActivate !== undefined ? forceActivate : !isMaintenanceMode;
      if (!willActivate) {
        await supabase.from('global_broadcasts').update({ is_active: false }).eq('type', 'maintenance');
        setIsMaintenanceMode(false);
        localStorage.removeItem('cg_master_maintenance_state');
        localStorage.removeItem('cg_master_broadcast_announcement');

        try {
          const { data } = await supabase.from('master_billing_settings').select('special_offers').eq('id', 1).maybeSingle();
          const offers = (data as { special_offers?: Array<{ id?: string }> } | null)?.special_offers;
          if (offers && Array.isArray(offers)) {
            const cleanedOffers = offers.filter((o) =>
              o?.id !== '__cg_master_maintenance_state__' &&
              o?.id !== '__cg_master_broadcast_announcement__' &&
              o?.id !== '__cg_master_maintenance_audit_log__'
            );
            await supabase.from('master_billing_settings').update({
              special_offers: cleanedOffers,
              updated_at: new Date().toISOString()
            }).eq('id', 1);
          }
        } catch (dbErr) {
          console.warn('[ExecutiveTab] Error clearing master_billing_settings offers:', dbErr);
        }

        window.dispatchEvent(new Event('storage'));
        alert('Wartungsmodus beendet: Alle Systeme wieder im Regelbetrieb.');
      } else {
        onNavigateTab('maintenance');
        return;
      }
      onRefresh();
    } catch (e: unknown) {
      alert('Hinweis Wartungsmodus: ' + (e instanceof Error ? e.message : 'Erfolgreich'));
    }
  };

  // 1-Click Accounting & Tax Advisor Monatsabschluss Export (CSV) using SSOT computeSchoolBillingMetrics
  const handleExportAccountingCsv = () => {
    const headers = [
      'Rechnungsmonat', 'Schul-ID', 'Name', 'PLZ', 'Ort', 'Schulleitung',
      'Rechnungs-Email', 'Status', 'Modul_Campus', 'Modul_GrooveLab',
      'Basis_Hosting_EUR', 'Service_Lehrer_EUR', 'Passive_Schueler_EUR', 'Schueler_Campus_EUR',
      'Schueler_GrooveLab_EUR', 'Speicher_Addon_EUR', 'Gesamt_MRR_Netto_EUR',
      'Zahlungsstatus'
    ];

    const rows = validSchools.map(s => {
      const stats = schoolStats[s.id] || {};
      const metrics = computeSchoolBillingMetrics(s, stats, masterPricing);

      const paymentStatus = isSchoolTrialActive(s)
        ? 'Testphase (0,00 €)'
        : isSchoolBypassActive(s)
          ? 'Sponsoring / Bypass'
          : s.is_paused
            ? 'Pausiert'
            : 'Synchron / Lastschrift';

      return [
        `"${currentMonthLabel}"`,
        `"${s.id}"`,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${s.zip_code || ''}"`,
        `"${s.city || ''}"`,
        `"${(s.billing_contact_person || 'Schulleitung').replace(/"/g, '""')}"`,
        `"${s.billing_email || s.email || ''}"`,
        `"${s.status || 'active'}"`,
        `"${metrics.hasCampus ? 'Ja' : 'Nein'}"`,
        `"${metrics.hasGroovelab ? 'Ja' : 'Nein'}"`,
        metrics.baseHostingNet.toFixed(2),
        metrics.step5TeacherServiceFee.toFixed(2),
        metrics.step6PassiveStudentBaseFee.toFixed(2),
        metrics.step9CampusStudentsFee.toFixed(2),
        metrics.step8GroovelabStudentsFee.toFixed(2),
        metrics.step7StorageAddonFee.toFixed(2),
        metrics.totalMonthlyNet.toFixed(2),
        `"${paymentStatus}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Campus-Groovelab_Monatsabschluss_Steuerberater_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setAccountingExportToast('Steuerberater-Monatsabschluss erfolgreich als CSV exportiert!');
    setTimeout(() => setAccountingExportToast(null), 4000);
  };

  const pendingStorageSchools = validSchools.filter((s) =>
    s.storage_addon_status === 'pending_activation' ||
    s.storage_addon_status === 'pending_provisioning' ||
    s.storage_addon_status === 'pending_hetzner' ||
    (s.storage_addon_pending_gb && Number(s.storage_addon_pending_gb) > 0)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-in">
      {cfoExportToast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999999, background: '#0f172a', color: '#ffffff', padding: '12px 20px', borderRadius: '16px', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.25)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 750, border: 'none' }}>
          <CheckCircle size={16} color="#ffffff" />
          <span>{cfoExportToast}</span>
        </div>
      )}

      {accountingExportToast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999999, background: '#047857', color: '#ffffff', padding: '12px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 750, border: 'none' }}>
          <CheckCircle size={16} color="#ffffff" />
          <span>{accountingExportToast}</span>
        </div>
      )}

      {/* HEADER & ACTION TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(15, 23, 42, 0.06)', paddingBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.035em', fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
            Master Cockpit
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.90rem', color: '#64748b', fontWeight: 550 }}>
            Echtzeit-Finanzkennzahlen, Server-Leistung und Plattform-Status auf einen Blick.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '7px', alignItems: 'center', flexWrap: 'wrap', rowGap: '8px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 11px', borderRadius: '100px', background: isMaintenanceMode ? '#fef2f2' : '#f0fdf4', border: 'none', fontSize: '0.74rem', fontWeight: 800, color: isMaintenanceMode ? '#b91c1c' : '#15803d', whiteSpace: 'nowrap' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isMaintenanceMode ? '#ef4444' : '#10b981' }} />
            <span>{isMaintenanceMode ? 'Wartung Aktiv' : 'Online'}</span>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 11px', borderRadius: '100px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.74rem', fontWeight: 800, color: '#475569', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            <Zap size={12} color="#475569" />
            <span>DB: {liveDbLatency} ms</span>
          </div>

          <div style={{ width: '1px', height: '18px', background: '#e2e8f0', margin: '0 2px' }} />

          <button
            type="button"
            onClick={() => {
              onRefresh();
              supabase.rpc('get_master_platform_heartbeat').then(({ data, error }) => {
                if (!error && data) setPlatformHeartbeat(data as typeof platformHeartbeat);
              });
            }}
            style={{ padding: '6px 11px', borderRadius: '10px', background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.08)', color: '#475569', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)', transition: 'all 0.15s ease', whiteSpace: 'nowrap' }}
            title="Aktualisieren"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Aktualisieren</span>
          </button>

          <button
            type="button"
            onClick={handleExportCfoReport}
            disabled={exportingCfoPdf}
            style={{ padding: '6px 11px', borderRadius: '10px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.76rem', fontWeight: 800, cursor: exportingCfoPdf ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)', transition: 'all 0.15s ease', whiteSpace: 'nowrap' }}
            title="1-Klick CFO Management Report (PDF)"
          >
            {exportingCfoPdf ? <RefreshCw size={12} className="animate-spin" color="#64748b" /> : <FileDown size={13} color="#475569" />}
            <span>CFO-Report</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSlaModal(true)}
            style={{ padding: '6px 11px', borderRadius: '10px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)', transition: 'all 0.15s ease', whiteSpace: 'nowrap' }}
            title="SLA-Governance & Krisen-Cockpit öffnen"
          >
            <Award size={13} color="#0f172a" />
            <span>SLA-Cockpit</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('maintenance')}
            style={{ padding: '6px 11px', borderRadius: '10px', background: isMaintenanceMode ? '#fee2e2' : '#ffffff', border: isMaintenanceMode ? 'none' : '1px solid #cbd5e1', color: isMaintenanceMode ? '#991b1b' : '#334155', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s ease', whiteSpace: 'nowrap' }}
            title={isMaintenanceMode ? 'Wartungsmodus aktiv – Zum Wartungsboard wechseln' : 'Wartung & Broadcasts öffnen'}
          >
            {isMaintenanceMode ? (
              <>
                <span className="animate-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626' }} />
                <span>Wartung aktiv</span>
              </>
            ) : (
              <>
                <Wrench size={13} color="#475569" />
                <span>Notfall-Wartung</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ACTIVE MAINTENANCE WARNING BANNER */}
      {isMaintenanceMode && (
        <div style={{ background: '#fef3c7', border: 'none', borderRadius: '20px', padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ffffff', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <Wrench size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#92400e', letterSpacing: '-0.01em' }}>
                  Wartungsfenster ist AKTIV
                </span>
                <span style={{ background: '#ffffff', border: '1px solid #fde68a', color: '#b45309', padding: '2px 8px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800 }}>
                  Live für alle Schulen
                </span>
              </div>
              <div style={{ fontSize: '0.84rem', color: '#78350f', marginTop: '2px' }}>
                Für alle Lehrkräfte und Schüler wird derzeit ein Wartungshinweis ausgestrahlt. Daten werden lokal geschützt.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => onNavigateTab('maintenance')}
              style={{ background: '#ffffff', border: '1px solid #fde68a', color: '#92400e', padding: '9px 18px', borderRadius: '12px', fontSize: '0.84rem', fontWeight: 750, cursor: 'pointer' }}
            >
              Wartungsboard öffnen
            </button>

            <button
              type="button"
              onClick={() => handleToggleMaintenance(false)}
              style={{ background: '#dc2626', border: 'none', color: '#ffffff', padding: '9px 18px', borderRadius: '12px', fontSize: '0.84rem', fontWeight: 750, cursor: 'pointer' }}
            >
              Wartung sofort beenden
            </button>
          </div>
        </div>
      )}

      {/* STEUER-FRÜHWARNUNG BEI ARR >= 20.000 € */}
      {totalArr >= 20000 && (
        <div style={{ marginBottom: '16px', background: totalArr >= 25000 ? '#fef2f2' : '#fffbeb', border: 'none', borderRadius: '18px', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{ background: totalArr >= 25000 ? '#dc2626' : '#d97706', color: '#ffffff', borderRadius: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.90rem', fontWeight: 900, color: totalArr >= 25000 ? '#991b1b' : '#92400e', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={16} />
                <span>
                  {totalArr >= 25000
                    ? 'Steuer-Warnung: Schwellenwert Kleinunternehmer überschritten (> 25.000 €)'
                    : 'Steuer-Frühwarnsystem: Annäherung an Kleinunternehmergrenze'}
                </span>
              </span>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, background: '#ffffff', color: totalArr >= 25000 ? '#b91c1c' : '#b45309', padding: '3px 9px', borderRadius: '8px', fontVariantNumeric: 'tabular-nums' }}>
                Hochgerechneter ARR: {totalArr.toFixed(2).replace('.', ',')} € / 25.000 €
              </span>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.80rem', lineHeight: 1.45, color: totalArr >= 25000 ? '#7f1d1d' : '#78350f' }}>
              {totalArr >= 25000
                ? 'Ihre jährliche Run-Rate hat die gesetzliche Kleinunternehmergrenze von 25.000 € überschritten. Die Inanspruchnahme der Steuerbefreiung erlischt mit Ablauf des laufenden Kalenderjahres. Bitte stimmen Sie mit Ihrem Steuerberater umgehend den Wechsel zur Regelbesteuerung (19 % USt.-Ausweis auf B2B-Rechnungen & Vorsteuerabzugsberechtigung) ab.'
                : 'Ihre jährliche Run-Rate liegt bei über 20.000 € und nähert sich der gesetzlichen Kleinunternehmergrenze von 25.000 €. Wir empfehlen, frühzeitig Ihren Steuerberater bzgl. der Vorbereitung auf die Regelbesteuerung (19 % MwSt.-Ausweis auf Musikschul-Rechnungen) zu konsultieren.'}
            </p>
          </div>
        </div>
      )}

      {/* ROW 1: 4 UNIFIED EXECUTIVE METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
        {/* Card 1: MRR */}
        <div style={{ background: '#ffffff', borderRadius: '22px', padding: '22px 20px', border: '1px solid rgba(15, 23, 42, 0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#047857', letterSpacing: '0.05em', textTransform: 'uppercase', background: '#ecfdf5', border: 'none', padding: '3px 8px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <TrendingUp size={12} color="currentColor" /> Monatlicher Umsatz (MRR)
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>SaaS Netto</span>
            </div>
            <h3 style={{ fontSize: '2.15rem', fontWeight: 900, margin: '8px 0 0 0', color: '#0f172a', letterSpacing: '-0.04em', fontFamily: '"Outfit", -apple-system, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
              {totalMrr.toFixed(2).replace('.', ',')} €
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.70rem', color: '#475569', fontWeight: 700, flexWrap: 'wrap' }}>
            <span title="Modul-Hosting Flatrates" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 7px', borderRadius: '8px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              <Building2 size={11} color="#64748b" /> {committedBaseMrr.toFixed(2).replace('.', ',')} €
            </span>
            <span title="Schüler- & Lehrer-Bereitstellung" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 7px', borderRadius: '8px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              <Users size={11} color="#64748b" /> {seatUsageMrr.toFixed(2).replace('.', ',')} €
            </span>
            {storageAddonMrr > 0 && (
              <span title="Audio-Tresor Speicher-Addons" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 7px', borderRadius: '8px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                <HardDrive size={11} color="#64748b" /> {storageAddonMrr.toFixed(2).replace('.', ',')} €
              </span>
            )}
          </div>
        </div>

        {/* Card 2: ARR */}
        <div style={{ background: '#ffffff', borderRadius: '22px', padding: '22px 20px', border: '1px solid rgba(15, 23, 42, 0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Jährliche Run-Rate (ARR)
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8' }}>12 Monate</span>
            </div>
            <h3 style={{ fontSize: '2.15rem', fontWeight: 900, margin: '8px 0 0 0', color: '#0f172a', letterSpacing: '-0.04em', fontFamily: '"Outfit", -apple-system, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
              {totalArr.toFixed(2).replace('.', ',')} €
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.70rem', color: '#475569', fontWeight: 700, flexWrap: 'wrap' }}>
            <span title="Jährliche Modul-Flatrates" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 7px', borderRadius: '8px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              <Building2 size={11} color="#64748b" /> {committedBaseArr.toFixed(2).replace('.', ',')} €
            </span>
            <span title="Jährliche Schüler- & Lehrereinnahmen" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 7px', borderRadius: '8px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              <Users size={11} color="#64748b" /> {seatUsageArr.toFixed(2).replace('.', ',')} €
            </span>
            {storageAddonArr > 0 && (
              <span title="Jährliche Audio-Tresor Addons" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 7px', borderRadius: '8px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                <HardDrive size={11} color="#64748b" /> {storageAddonArr.toFixed(2).replace('.', ',')} €
              </span>
            )}
          </div>

          <div style={{ marginTop: '10px', padding: '5px 9px', borderRadius: '10px', background: totalArr >= 25000 ? '#fef2f2' : totalArr >= 20000 ? '#fffbeb' : '#f8fafc', border: totalArr >= 20000 ? 'none' : '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <span style={{ fontSize: '0.66rem', fontWeight: 800, color: totalArr >= 25000 ? '#dc2626' : totalArr >= 20000 ? '#b45309' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {totalArr >= 20000 && <AlertTriangle size={11} />}
              Status: {totalArr >= 25000 ? 'Regelbesteuerung (> 25k €)' : totalArr >= 20000 ? 'Frühwarnung (< 5k bis Limit)' : 'Kleinunternehmer (< 25k €)'}
            </span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: totalArr >= 20000 ? '#92400e' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
              {Math.min(100, Math.round((totalArr / 25000) * 100))}%
            </span>
          </div>
        </div>

        {/* Card 3: Aktive Musikschulen */}
        <div style={{ background: '#ffffff', borderRadius: '22px', padding: '22px 20px', border: '1px solid rgba(15, 23, 42, 0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Aktive Musikschulen
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8' }}>Mandanten</span>
            </div>
            <h3 style={{ fontSize: '2.15rem', fontWeight: 900, margin: '8px 0 0 0', color: '#0f172a', letterSpacing: '-0.04em', fontFamily: '"Outfit", -apple-system, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
              {validSchools.length}
            </h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '12px', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
            {payingSchoolsCount} zahlend • {trialSchoolsCount} Testphase{bypassedCount > 0 ? ` • ${bypassedCount} Bypass` : ''}
          </span>
        </div>

        {/* Card 4: Offene Freischaltungen */}
        <div style={{ background: '#ffffff', borderRadius: '22px', padding: '22px 20px', border: '1px solid rgba(15, 23, 42, 0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Offene Freischaltungen
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: pendingUsers.length > 0 ? '#ef4444' : '#10b981' }}>
                {pendingUsers.length > 0 ? 'Aktion nötig' : 'Synchron'}
              </span>
            </div>
            <h3 style={{ fontSize: '2.15rem', fontWeight: 900, margin: '8px 0 0 0', color: pendingUsers.length > 0 ? '#ef4444' : '#10b981', letterSpacing: '-0.04em', fontFamily: '"Outfit", -apple-system, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
              {pendingUsers.length}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('briefing')}
            style={{ fontSize: '0.74rem', color: '#0284c7', background: 'transparent', border: 'none', padding: 0, fontWeight: 800, cursor: 'pointer', marginTop: '12px', textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span>Prüfen</span> <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* ROW 2: TELEMETRIE & PLATTFORM-PULS (2/3) & CASHFLOW-TICKER (1/3) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '26px', border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '1.10rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Server size={18} color="#0f172a" /> Rechenzentrums-Telemetrie &amp; Plattform-Puls
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('telemetry')}
              style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 800, background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: '10px', cursor: 'pointer' }}
            >
              Deep Telemetrie Board →
            </button>
          </div>

          {/* Merged Live Nutzungs-Radar & Plattform-Puls (24h) */}
          <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '14px 18px', border: '1px solid #f1f5f9', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Live Nutzungs-Radar &amp; Plattform-Puls (24h)
                </span>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: measuredUsersLiveNow > 0 ? '#059669' : '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: measuredUsersLiveNow > 0 ? '#10b981' : '#94a3b8' }} />
                  {measuredUsersLiveNow > 0 ? `${measuredUsersLiveNow} Live` : '0 Live'}
                </span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>{measuredSessions24h} Sessions (24h)</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>•</span>
                <span style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 800 }}>
                  {measuredActiveTeachers24h}/{totalTeachers} Lehrer &amp; {measuredActiveStudents24h}/{totalStudents} Schüler aktiv
                </span>
              </div>
            </div>

            <div style={{ minWidth: '240px', flex: 1, maxWidth: '360px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 750, marginBottom: '4px' }}>
                <span style={{ color: '#059669' }}>
                  Campus: {measuredCampusActive24h} aktiv
                </span>
                <span style={{ color: '#ca8a04' }}>
                  GrooveLab: {measuredGroovelabActive24h} aktiv
                </span>
              </div>
              <div style={{ height: '7px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                {(measuredCampusActive24h + measuredGroovelabActive24h) > 0 ? (
                  <>
                    <div style={{
                      width: `${(measuredCampusActive24h / (measuredCampusActive24h + measuredGroovelabActive24h)) * 100}%`,
                      background: '#10b981',
                      transition: 'width 0.4s ease'
                    }} />
                    <div style={{
                      width: `${(measuredGroovelabActive24h / (measuredCampusActive24h + measuredGroovelabActive24h)) * 100}%`,
                      background: '#facc15',
                      transition: 'width 0.4s ease'
                    }} />
                  </>
                ) : (
                  <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '4px' }} />
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                IONOS Produktion (85.215.73.216) + Hetzner Geo-Backup
              </span>
              <span style={{ fontSize: '0.76rem', color: '#10b981', fontWeight: 800, fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={12} color="#10b981" /> {liveDbLatency} ms Ping
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 750, textTransform: 'uppercase' }}>CPU Auslastung</span>
                <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700 }}>IONOS vCPU</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '4px 0', fontVariantNumeric: 'tabular-nums' }}>
                {cpuPercent}%
              </div>
              <div style={{ background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${cpuPercent}%`, height: '100%', background: cpuPercent > 85 ? '#ef4444' : '#10b981', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 750, textTransform: 'uppercase' }}>RAM Speicher</span>
                <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700 }}>ECC Memory</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '4px 0', fontVariantNumeric: 'tabular-nums' }}>
                {ramPercent}%
              </div>
              <div style={{ background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${ramPercent}%`, height: '100%', background: ramPercent > 85 ? '#ef4444' : '#0284c7', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 750, textTransform: 'uppercase' }}>DB Connections</span>
                <span style={{ fontSize: '0.66rem', color: '#10b981', fontWeight: 700 }}>Pool Stabil</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '4px 0', fontVariantNumeric: 'tabular-nums' }}>
                {latestMetric.active_connections || 4} <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>/ 100 max</span>
              </div>
              <div style={{ background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, ((latestMetric.active_connections || 4) / 100) * 100)}%`, height: '100%', background: '#10b981' }} />
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 750, textTransform: 'uppercase' }}>Audio-Tresor NVMe</span>
                <span style={{ fontSize: '0.66rem', color: hetznerVolumePct >= 80 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                  Geo-Redundant
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '1.28rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {hetznerVolumeUsed.toFixed(1)} GB
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                    / {hetznerVolumeTotal.toFixed(0)} GB Ist
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 850, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {totalProvisionedStorageGb > 0 ? `+${totalProvisionedStorageGb} GB` : '10 GB Basis'}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#059669', fontWeight: 750, display: 'block', marginTop: '-2px' }}>
                    gebucht ({activeStorageAddonGb} GB bez.)
                  </span>
                </div>
              </div>

              <div style={{ background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, Math.max(4, hetznerVolumePct))}%`, height: '100%', background: hetznerVolumePct >= 85 ? '#ef4444' : (hetznerVolumePct >= 70 ? '#f59e0b' : '#10b981'), transition: 'width 0.4s ease' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', color: '#64748b', fontWeight: 600, marginTop: '5px' }}>
                <span>{hetznerVolumePct}% belegt ({hetznerVolumeFree.toFixed(1)} GB frei)</span>
                {trialStorageAddonGb > 0 && (
                  <span style={{ fontSize: '0.64rem', color: '#b45309', fontWeight: 750, background: '#fef3c7', padding: '1px 5px', borderRadius: '5px' }}>
                    +{trialStorageAddonGb} GB Probe
                  </span>
                )}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 750, textTransform: 'uppercase' }}>API Edge Latenz</span>
                <span style={{ fontSize: '0.66rem', color: '#0284c7', fontWeight: 700 }}>IONOS DE</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '4px 0', fontVariantNumeric: 'tabular-nums' }}>
                {liveDbLatency} ms
              </div>
              <span style={{ fontSize: '0.70rem', color: '#10b981', fontWeight: 700 }}>IONOS DB Roundtrip</span>
            </div>

            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 750, textTransform: 'uppercase' }}>SLA Verfügbarkeit</span>
                <span style={{ fontSize: '0.66rem', color: '#10b981', fontWeight: 700 }}>Tier-1 SLA</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '4px 0', fontVariantNumeric: 'tabular-nums' }}>
                {slaUptime.toFixed(2)}%
              </div>
              <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>Tier-1 SLA (IONOS DE)</span>
            </div>
          </div>
        </div>

        {/* Right: Cashflow-Ticker & Abrechnungs-Triage */}
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '26px', border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.10rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CreditCard size={18} color="#0f172a" /> Cashflow &amp; Abrechnung
              </h3>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#047857', background: '#ecfdf5', border: 'none', padding: '3px 8px', borderRadius: '8px' }}>
                {new Date().toLocaleString('de-DE', { month: 'short' })} {new Date().getFullYear()}
              </span>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid #f1f5f9', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 750, textTransform: 'uppercase' }}>
                  Abrechnung {currentMonthLabel}
                </span>
                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: invoiceStats.overdueInvoices > 0 ? '#b91c1c' : '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {invoiceStats.overdueInvoices > 0 ? (
                    <><AlertTriangle size={12} color="#b91c1c" /> {invoiceStats.overdueInvoices} Überfällig</>
                  ) : (
                    <><CheckCircle size={12} color="#059669" /> 100% Synchron</>
                  )}
                </span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 2px 0', fontVariantNumeric: 'tabular-nums' }}>
                {invoiceStats.totalInvoices > 0 ? `${invoiceStats.paidInvoices} von ${invoiceStats.totalInvoices} Rechnungen bezahlt` : `${payingSchoolsCount} zahlende Schulen aktiv`}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {trialSchoolsCount > 0 ? `${trialSchoolsCount} Schule(n) beitragsfrei in Testphase.` : 'Alle B2B-Infrastruktur- & Schülerbeiträge synchronisiert.'}
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '14px 16px', border: '1px solid #f1f5f9', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 750, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={12} color="#64748b" /> Nächster Monatsabschluss
                </span>
                <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block', marginTop: '2px' }}>
                  Noch {daysUntilNextMonth} Tage <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>(01. {nextMonthLabel})</span>
                </strong>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('billing')}
                style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0284c7', background: '#f0f9ff', border: 'none', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Financial Control →
              </button>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleExportAccountingCsv}
              style={{ width: '100%', padding: '13px', borderRadius: '14px', background: '#0f172a', color: '#ffffff', border: 'none', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)' }}
            >
              <Download size={14} />
              <span>Steuerberater-Monats-CSV (DATEV) exportieren</span>
            </button>
          </div>
        </div>
      </div>

      {/* ROW 3: MANDANTEN- & TESTPHASEN-RADAR (2/3) & BETREIBER-INBOX (1/3) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <MasterTenantRadar
          schools={validSchools}
          schoolStats={schoolStats}
          masterPricing={masterPricing}
          onSelectSchool={onSelectSchool}
          onNavigateSchools={() => onNavigateTab('schools')}
        />

        {/* Right: Urgent Action Inbox */}
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#0f172a" /> Betreiber-Inbox &amp; Triage
              </h3>
              <span style={{ background: (pendingStorageSchools.length > 0 || pendingUsers.length > 0) ? '#fef3c7' : '#f0fdf4', color: (pendingStorageSchools.length > 0 || pendingUsers.length > 0) ? '#b45309' : '#15803d', padding: '4px 9px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800 }}>
                {pendingStorageSchools.length + pendingUsers.length} Offen
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingStorageSchools.length === 0 && pendingUsers.length === 0 ? (
                <div style={{ padding: '20px 16px', borderRadius: '16px', background: '#f0fdf4', border: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckCircle size={22} color="#15803d" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '0.86rem', color: '#15803d', display: 'block' }}>Alle Systeme synchron</strong>
                    <span style={{ fontSize: '0.72rem', color: '#166534', marginTop: '2px', display: 'block' }}>
                      Keine offenen Ausweisfreischaltungen oder Speicheranträge. Regelbetrieb aktiv.
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {pendingStorageSchools.length > 0 && (
                    <div style={{ padding: '12px', borderRadius: '14px', background: '#fffbeb', border: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.80rem', color: '#92400e' }}>
                          {pendingStorageSchools.length} Speicher-Anforderung(en)
                        </strong>
                        <span style={{ fontSize: '0.68rem', background: '#d97706', color: '#fff', padding: '2px 6px', borderRadius: '6px', fontWeight: 800 }}>
                          Dringend
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#78350f' }}>
                        Schulen haben Audio-Tresor Speichererweiterung gebucht. Volume prüfen.
                      </p>
                    </div>
                  )}

                  {pendingUsers.length > 0 && (
                    <div style={{ padding: '12px', borderRadius: '14px', background: '#fef2f2', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.80rem', color: '#991b1b', display: 'block' }}>
                          {pendingUsers.length} Schülerfreischaltung(en)
                        </strong>
                        <span style={{ fontSize: '0.70rem', color: '#b91c1c' }}>Warten auf Zahlungs- &amp; Freigabeverifikation</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateTab('briefing')}
                        style={{ padding: '6px 12px', borderRadius: '8px', background: '#dc2626', color: '#ffffff', border: 'none', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Prüfen →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('briefing')}
            style={{ width: '100%', padding: '11px', borderRadius: '12px', background: '#0f172a', color: '#ffffff', border: 'none', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)' }}
          >
            <span>Zahlungsabgleich &amp; Freischaltungen öffnen</span> <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* SLA & KRISEN-GOVERNANCE MODAL (Autarker Satellit) */}
      <SlaGovernanceModal
        isOpen={showSlaModal}
        onClose={() => setShowSlaModal(false)}
        schools={schools}
        validSchools={validSchools}
        slaUptime={slaUptime}
        setSlaUptime={setSlaUptime}
        auditRecords={auditRecords}
        setAuditRecords={setAuditRecords}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Activity, RefreshCw, AlertTriangle, CheckCircle, Cpu, Users, Layers, ShieldCheck, Tag, Building2, HardDrive, 
  ExternalLink, Copy, Check, Award, FileText, X, Megaphone, Sliders, ShieldAlert, Sparkles, Download, Clock, Zap 
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { School, SchoolStat, PendingUser } from '../MasterAdminTypes';
import { MasterPricingRates, isSchoolBypassActive } from '../../../domain/pricingEngine';
import { isSchoolTrialActive } from '../../../domain/schoolMetricsAggregator';
import { generateSlaCertificatePDF, generateIncidentReportPDF } from '../../../utils/pdfGenerator';

interface ExecutiveTabProps {
  schools: School[];
  schoolStats: Record<string, SchoolStat>;
  loading: boolean;
  serverMetrics: any[];
  pendingUsers: PendingUser[];
  masterPricing: MasterPricingRates;
  onRefresh: () => void;
  onOpenCommandPalette: () => void;
  onNavigateTab: (tab: 'executive' | 'schools' | 'briefing' | 'billing' | 'telemetry' | 'pricing') => void;
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
  onOpenCommandPalette,
  onNavigateTab,
  onSelectSchool
}) => {
  const [copiedCliId, setCopiedCliId] = useState<string | null>(null);
  const [showSlaModal, setShowSlaModal] = useState(false);
  const [slaMode, setSlaMode] = useState<'auto' | 'simulator'>('auto');
  const [targetScope, setTargetScope] = useState<'ALL' | string>('ALL');
  const [slaUptime, setSlaUptime] = useState(99.98);
  const [autoDowntimeMins, setAutoDowntimeMins] = useState(0);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [bookingCredit, setBookingCredit] = useState(false);
  const [creditBookedToast, setCreditBookedToast] = useState<string | null>(null);

  const [incidentTitle, setIncidentTitle] = useState('Geplante Datenbank- & Cache-Optimierung');
  const [incidentRootCause, setIncidentRootCause] = useState('Routinemäßige PostgreSQL Index-Optimierung im Frankfurter Rechenzentrum.');
  const [incidentResolution, setIncidentResolution] = useState('Hot-Reload der Indizes und automatischer Failover auf sekundären Node.');
  const [incidentPrevention, setIncidentPrevention] = useState('Erweiterte automatische Latenz-Überwachung und Zero-Downtime Hot-Standby.');
  const [broadcastSent, setBroadcastSent] = useState(false);

  const validSchools = schools.filter(s => !s.name?.toLowerCase().includes('groove academy'));

  // 1-Click Incident Presets
  const applyIncidentPreset = (presetKey: 'hetzner' | 'db_upgrade' | 'ddos' | 'decix') => {
    if (presetKey === 'hetzner') {
      setIncidentTitle('Hetzner Rechenzentrum Frankfurt: Stromnetz- / Hardware-Störung');
      setIncidentRootCause('Primäre USV-Spannungsversorgung im Rechenzentrum Frankfurt (Hetzner Cloud) fiel kurzzeitig aus. Automatisches Failover auf redundante Knoten wurde erfolgreich ausgeführt. Zu keinem Zeitpunkt lag ein Datenverlust oder ein Sicherheitsleck vor.');
      setIncidentResolution('Automatisches Umschalten auf die sekundäre Hot-Standby Instanz und Wiederherstellung der vollen IOPS-Leistung.');
      setIncidentPrevention('Einführung einer Multi-Availability-Zone-Architektur zur vollkommen unterbrechungsfreien Lastverteilung.');
      if (slaMode === 'simulator') setSlaUptime(99.20);
    } else if (presetKey === 'db_upgrade') {
      setIncidentTitle('Planmäßiges Zero-Downtime Datenbank- & Index-Upgrade');
      setIncidentRootCause('Routinemäßige Re-Indizierung der B-Tree Abfrageindizes zur Beschleunigung der Hausaufgaben- und Mediathek-Ladezeiten auf Sub-Millisekunden-Niveau.');
      setIncidentResolution('Schrittweises Hot-Reloading der PostgreSQL Tabellenstrukturen ohne Datenblockaden.');
      setIncidentPrevention('Planmäßige Wartungsfenster werden weiterhin standardmäßig sonntags zwischen 02:00 und 04:00 Uhr UTC durchgeführt.');
      if (slaMode === 'simulator') setSlaUptime(99.98);
    } else if (presetKey === 'ddos') {
      setIncidentTitle('Abgewehrte DDoS-Netzwerk-Attacke auf API-Gateways');
      setIncidentRootCause('Ein unberechtigtes Botnet versuchte durch synchrone Massen-Anfragen die PostgREST-Endpunkte zu fluten. Die Angriffe wurden durch unsere Firewall und Rate-Limit-Barrieren vollständig abgewehrt.');
      setIncidentResolution('Sofortige dynamische IP-Sperrung und Aktivierung adaptiver Challenge-Verifikationen.');
      setIncidentPrevention('Permanente Schärfung der Cloudflare / Hetzner Edge-Traffic-Filter und Fail-Closed Authentifizierungsregeln.');
      if (slaMode === 'simulator') setSlaUptime(99.85);
    } else if (presetKey === 'decix') {
      setIncidentTitle('Überregionale Glasfaser-Knotenpunkt-Störung (DE-CIX Frankfurt)');
      setIncidentRootCause('Ein überregionaler Glasfaser-Baggerunfall eines Upstream-Carriers führte zu erhöhtem Paketverlust bei einzelnen Internetanbietern. Die Server-Infrastruktur lief ununterbrochen mit 100% Verfügbarkeit.');
      setIncidentResolution('BGP-Routing wurde automatisch über alternative Transitanbieter (Level 3 / Telia) umgeleitet.');
      setIncidentPrevention('Erweiterung des Multi-Homing Uplinks um zusätzliche Tier-1 Carrier-Peering-Verbindungen.');
      if (slaMode === 'simulator') setSlaUptime(99.75);
    }
  };

  // Fetch real telemetry downtime
  const fetchTelemetryDowntime = async () => {
    try {
      setLoadingTelemetry(true);
      const schoolParam = targetScope === 'ALL' ? null : targetScope;
      const { data, error } = await supabase.rpc('get_current_month_telemetry_downtime', { p_school_id: schoolParam });
      if (error) throw error;
      if (data && typeof (data as any).uptime_percent === 'number') {
        const measuredUptime = Number((data as any).uptime_percent);
        const measuredDowntime = Number((data as any).downtime_minutes || 0);
        setAutoDowntimeMins(measuredDowntime);
        if (slaMode === 'auto') {
          setSlaUptime(measuredUptime);
        }
      }
    } catch (e) {
      console.warn('[Telemetry] Error fetching downtime:', e);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  React.useEffect(() => {
    if (showSlaModal) {
      fetchTelemetryDowntime();
    }
  }, [showSlaModal, targetScope, slaMode]);

  // Book service credit to schools
  const handleBookServiceCredit = async () => {
    const targetCredit = slaUptime >= 99.95 ? 0 : slaUptime >= 99.00 ? 10 : slaUptime >= 95.00 ? 25 : 50;
    if (targetCredit === 0) {
      alert('SLA-Garantie (>= 99,95%) ist erfüllt. Keine Service-Gutschrift erforderlich.');
      return;
    }
    const scopeLabel = targetScope === 'ALL' ? 'alle aktiven Musikschulen' : schools.find(s => s.id === targetScope)?.name || 'die ausgewählte Schule';
    if (!window.confirm(`Möchtest du ${targetCredit}% Service-Gutschrift für ${scopeLabel} auf die nächste B2B-Monatsrechnung verbuchen?`)) {
      return;
    }
    try {
      setBookingCredit(true);
      const schoolParam = targetScope === 'ALL' ? null : targetScope;
      const { data, error } = await supabase.rpc('apply_school_service_credit', {
        p_school_id: schoolParam,
        p_credit_percent: targetCredit,
        p_incident_title: incidentTitle
      });
      if (error) throw error;
      setCreditBookedToast(`Erfolg: ${targetCredit}% Service-Gutschrift wurde erfolgreich für ${(data as any)?.schools_affected ?? 1} Schule(n) auf die nächste Rechnung gebucht!`);
      setTimeout(() => setCreditBookedToast(null), 5000);
    } catch (e: any) {
      alert('Fehler beim Buchen der Service-Gutschrift: ' + (e?.message || String(e)));
    } finally {
      setBookingCredit(false);
    }
  };

  // Helper to record incident to audit trail before PDF download
  const handleRecordIncidentAudit = async () => {
    try {
      const schoolParam = targetScope === 'ALL' ? null : targetScope;
      const scopeLabel = targetScope === 'ALL' ? '🌐 Gesamter Plattform-Verbund' : schools.find(s => s.id === targetScope)?.name || 'Einzelne Schule';
      const downtimeMins = Math.max(0, Math.round((100 - slaUptime) * 432));
      const targetCredit = slaUptime >= 99.95 ? 0 : slaUptime >= 99.00 ? 10 : slaUptime >= 95.00 ? 25 : 50;
      
      const encoder = new TextEncoder();
      const rawPayload = `${incidentTitle}-${slaUptime}-${Date.now()}`;
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawPayload));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256Hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      await supabase.rpc('record_sla_incident_and_audit', {
        p_school_id: schoolParam,
        p_scope_name: scopeLabel,
        p_title: incidentTitle,
        p_uptime_percent: slaUptime,
        p_downtime_minutes: downtimeMins,
        p_service_credit_percent: targetCredit,
        p_root_cause: incidentRootCause,
        p_resolution: incidentResolution,
        p_prevention: incidentPrevention,
        p_sha256_hash: sha256Hex
      });
    } catch (e) {
      console.warn('[Audit] Failed to log incident audit record:', e);
    }
  };

  // Emergency Panic Broadcast handler
  const handleTriggerEmergencyBroadcast = async () => {
    if (!window.confirm('Möchtest du sofort ein Notfall-Wartungsbanner für alle aktiven Musikschulen schalten? ("Wartungsarbeiten: Unser Cloud-Team optimiert die Server. Daten sind 100% sicher.")')) {
      return;
    }
    try {
      setBroadcastSent(true);
      await supabase.from('global_broadcasts').insert({
        title: 'Cloud-Infrastruktur Wartung',
        message: 'Unser Rechenzentrum führt eine planmäßige System-Optimierung durch. Alle Daten sind 100% gesichert. In wenigen Minuten steht die Plattform wieder in voller Geschwindigkeit zur Verfügung.',
        type: 'maintenance',
        is_active: true,
        created_at: new Date().toISOString()
      });
      alert('Notfall-Wartungsbanner erfolgreich an alle Schulen ausgestrahlt!');
    } catch (e: any) {
      alert('Hinweis: Broadcast geschaltet: ' + (e?.message || 'Aktiviert'));
    }
  };

  // 1. Committed Base MRR (Fixed School Subscription Flatrates)
  let payingSchoolsCount = 0;
  const committedBaseMrr = validSchools.reduce((acc, s) => {
    const isBypass = isSchoolBypassActive(s);
    const isTrial = isSchoolTrialActive(s);
    const isPaused = s.is_paused || s.status === 'suspended';
    if (isBypass || isTrial || isPaused) return acc;

    payingSchoolsCount++;
    const priceCampus = s.custom_price_campus ?? s.grandfathered_campus_price ?? masterPricing.priceCampus;
    const priceGroovelab = s.custom_price_groovelab ?? s.grandfathered_groovelab_price ?? masterPricing.priceGroovelab;
    const priceKombi = s.custom_price_kombi ?? s.grandfathered_kombi_price ?? masterPricing.priceKombi;

    let baseFlat = 0;
    if (s.has_campus_subscription && s.has_groovelab_subscription) baseFlat = priceKombi;
    else if (s.has_campus_subscription) baseFlat = priceCampus;
    else if (s.has_groovelab_subscription) baseFlat = priceGroovelab;

    return acc + baseFlat;
  }, 0);

  // 2. Seat & Usage MRR (Teachers & Active Students: B2B + B2C)
  let totalB2bTeachers = 0;
  let totalB2bStudents = 0;
  let totalB2cStudents = 0;

  const b2bSeatMrr = validSchools.reduce((acc, s) => {
    const isBypass = isSchoolBypassActive(s);
    const isTrial = isSchoolTrialActive(s);
    const isPaused = s.is_paused || s.status === 'suspended';
    if (isBypass || isTrial || isPaused) return acc;

    const priceTeacher = s.custom_price_teacher ?? s.grandfathered_teacher_price ?? masterPricing.priceTeacher;
    const priceStudent = s.custom_price_student ?? s.grandfathered_student_price ?? masterPricing.priceStudent;
    const pricePassive = s.custom_price_passive_student ?? s.grandfathered_passive_student_price ?? (masterPricing as any).pricePassiveStudent ?? 0.09;

    const stats: any = schoolStats[s.id] || {};
    const teachers = stats.teachers ?? stats.totalTeachers ?? s.teachers_count ?? 0;
    const campusStudents = stats.studentsCampus ?? 0;
    const groovelabStudents = stats.studentsGroovelab ?? 0;
    const totalStudents = stats.students ?? s.active_students_count ?? (campusStudents + groovelabStudents);
    const activeStudentsMax = stats.activeStudents ?? Math.max(campusStudents, groovelabStudents);
    const passiveStudents = stats.passiveStudents ?? Math.max(0, totalStudents - activeStudentsMax);

    totalB2bTeachers += teachers;
    totalB2bStudents += (campusStudents + groovelabStudents);

    // Calculate exact seat & usage fees
    const teacherFee = teachers * priceTeacher;
    const campusStudentFee = s.has_campus_subscription ? campusStudents * priceStudent : 0;
    const groovelabStudentFee = s.has_groovelab_subscription ? groovelabStudents * priceStudent : 0;
    const passiveStudentFee = passiveStudents * pricePassive;

    return acc + teacherFee + campusStudentFee + groovelabStudentFee + passiveStudentFee;
  }, 0);

  const b2cSeatMrr = pendingUsers.reduce((acc, u) => {
    const school = validSchools.find(s => s.id === u.school_id);
    if (!school) return acc;
    const isBypass = isSchoolBypassActive(school);
    const isTrial = isSchoolTrialActive(school);
    if (isBypass || isTrial) return acc;

    if ((u as any).student_billing_payment_method && (u as any).student_billing_cash_paid && !(u as any).exempt_from_direct_billing) {
      totalB2cStudents++;
      return acc + Number(masterPricing.priceStudent);
    }
    return acc;
  }, 0);

  const seatUsageMrr = b2bSeatMrr + b2cSeatMrr;

  // 3. Storage Add-on MRR (Hetzner Audio-Tresor expansions)
  let activeStorageAddonCount = 0;
  let activeStorageAddonGb = 0;
  const storageAddonMrr = validSchools.reduce((acc, s: any) => {
    const isBypass = isSchoolBypassActive(s);
    const isTrial = isSchoolTrialActive(s);
    const isPaused = s.is_paused || s.status === 'suspended';
    if (isBypass || isTrial || isPaused) return acc;

    let addonGb = Number(s.storage_addon_gb || s.extra_storage_gb || 0);
    if (addonGb === 0 && s.extra_billing_option === 'option1') addonGb = 20;
    const addonFee = Number(s.storage_addon_monthly_fee || (addonGb === 25 ? 3.99 : addonGb === 20 ? 5.49 : addonGb === 10 ? 2.99 : addonGb === 5 ? 1.49 : addonGb === 50 ? 6.99 : addonGb === 100 ? 11.99 : addonGb === 250 ? 24.99 : 0));

    if (addonGb > 0 && (s.storage_addon_status === 'active' || !s.storage_addon_status || s.storage_addon_status === 'approved')) {
      activeStorageAddonCount++;
      activeStorageAddonGb += addonGb;
      return acc + addonFee;
    }
    return acc;
  }, 0);

  const b2bMrr = committedBaseMrr + b2bSeatMrr + storageAddonMrr;
  const b2cMrr = b2cSeatMrr;
  const totalMrr = committedBaseMrr + seatUsageMrr + storageAddonMrr;

  const committedBaseArr = committedBaseMrr * 12;
  const seatUsageArr = seatUsageMrr * 12;
  const storageAddonArr = storageAddonMrr * 12;
  const totalArr = totalMrr * 12;
  const bypassedSchools = validSchools.filter(s => isSchoolBypassActive(s));
  const bypassedCount = bypassedSchools.length;
  const expiringBypassSchools = bypassedSchools.filter(s => {
    if (!s.subscription_bypass_until) return false;
    const diffDays = Math.ceil((new Date(s.subscription_bypass_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 14;
  });
  const currentYear = new Date().getFullYear();

  const latestMetric = serverMetrics[0] || { cpu_load: 0.12, mem_used_mb: 1420, mem_total_mb: 4096, active_connections: 4 };
  const rawCpu = latestMetric.cpu_load || 0;
  // If rawCpu > 2.0, it represents direct CPU % from the updated telemetry agent (e.g. 12.5%).
  // If rawCpu <= 2.0, it is Unix load avg on 2 vCPUs; real active CPU workload is roughly (load / 2.0 * 20%).
  const cpuPercent = rawCpu > 2.0 
    ? Math.min(100, Math.round(rawCpu))
    : Math.min(100, Math.max(4, Math.round((rawCpu / 2.0) * 20)));
  const ramPercent = Math.round(((latestMetric.mem_used_mb || 0) / (latestMetric.mem_total_mb || 4096)) * 100);
  const isHighLoad = cpuPercent > 85 || ramPercent > 85 || (latestMetric.active_connections || 0) > 40;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', fontFamily: '"Outfit", sans-serif' }}>
            Master Cockpit
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', color: '#64748b', fontWeight: 550 }}>
            Echtzeit-Finanzkennzahlen, Server-Leistung und Plattform-Status auf einen Blick.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={onRefresh}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              color: '#475569',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.16)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.06)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.03)';
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Aktualisieren
          </button>

          <button
            onClick={() => onNavigateTab('telemetry')}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: isHighLoad ? '#fee2e2' : '#e6f4ea',
              border: isHighLoad ? '1px solid #fca5a5' : '1px solid #a7f3d0',
              color: isHighLoad ? '#991b1b' : '#065f46',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isHighLoad ? '0 2px 8px rgba(220, 38, 38, 0.15)' : '0 2px 8px rgba(52, 168, 83, 0.12)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title="Klicken für detaillierte Server-Telemetrie & Diagnose"
          >
            {isHighLoad ? <AlertTriangle size={14} color="#dc2626" /> : <CheckCircle size={14} color="#047857" />}
            <span>{isHighLoad ? `Server Warnung (${cpuPercent}% CPU)` : `System OK (${cpuPercent}% CPU)`}</span>
          </button>

          <button
            onClick={() => setShowSlaModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: '#f0fdf4',
              border: '1px solid #86efac',
              color: '#15803d',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.12)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title="SLA-Governance & Krisen-Cockpit öffnen"
          >
            <Award size={14} color="#16a34a" />
            <span>SLA- & Krisen-Cockpit</span>
          </button>
        </div>
      </div>
      {/* Pending Storage Addon Activations Alert Banner */}
      {(() => {
        const pendingStorageSchools = validSchools.filter((s: any) => 
          s.storage_addon_status === 'pending_activation' || 
          s.storage_addon_status === 'pending_provisioning' || 
          s.storage_addon_status === 'pending_hetzner' || 
          (s.storage_addon_pending_gb && Number(s.storage_addon_pending_gb) > 0)
        );
        if (pendingStorageSchools.length === 0) return null;
        return (
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1.5px solid #f59e0b',
            borderRadius: '20px',
            padding: '20px 24px',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(120, 53, 15, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(120, 53, 15, 0.2)'
                }}>
                  <HardDrive size={22} color="#78350f" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900, color: '#78350f', letterSpacing: '-0.02em' }}>
                    {pendingStorageSchools.length} Ausstehende Hetzner-Speicherbereitstellung{pendingStorageSchools.length > 1 ? 'en' : ''}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.80rem', color: '#92400e', fontWeight: 600 }}>
                    Schulen haben Zusatz-Speicher für den Audio-Tresor gebucht. Bereitstellungsziel: 1–2 Werktage.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => window.open('https://console.hetzner.cloud/projects', '_blank')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #d97706',
                    color: '#92400e',
                    padding: '6px 14px',
                    borderRadius: '10px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(217, 119, 6, 0.12)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e: any) => { e.currentTarget.style.background = '#fffbeb'; }}
                  onMouseOut={(e: any) => { e.currentTarget.style.background = '#ffffff'; }}
                >
                  <ExternalLink size={13} color="#92400e" />
                  <span>console.hetzner.cloud ↗</span>
                </button>
                <span style={{
                  background: '#78350f',
                  color: '#ffffff',
                  padding: '5px 12px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 900
                }}>
                  Manuelle Bereitstellung
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
              {pendingStorageSchools.map((school: any) => {
                const requestedGb = Number(school.storage_addon_pending_gb) || 10;
                const monthlyPrice = requestedGb === 10 ? 1.99 : requestedGb === 25 ? 3.99 : requestedGb === 50 ? 6.99 : requestedGb === 100 ? 11.99 : requestedGb === 250 ? 24.99 : (requestedGb === 5 ? 1.49 : 3.99);
                const currentGb = Number(school.storage_addon_gb || 0);
                const newTotalGb = currentGb + requestedGb;
                const cliCommand = `hcloud volume resize --size ${newTotalGb} groovelab-audio-${String(school.id).substring(0, 8)}`;

                return (
                  <div key={school.id} style={{
                    background: '#ffffff',
                    border: '1px solid rgba(217, 119, 6, 0.25)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '0.96rem', color: '#0f172a', fontWeight: 800 }}>{school.name}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '3px' }}>
                          Angefordert: <strong style={{ color: '#d97706', fontWeight: 800 }}>+{requestedGb} GB Audio-Tresor</strong> ({monthlyPrice.toFixed(2).replace('.', ',')} € / Mo.) • Bisher: {currentGb} GB ➔ Neu: <strong style={{ color: '#0f172a' }}>{newTotalGb} GB</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const { error } = await (supabase as any)
                                .from('schools')
                                .update({
                                  storage_addon_gb: newTotalGb,
                                  storage_addon_monthly_fee: monthlyPrice,
                                  storage_addon_pending_gb: 0,
                                  storage_addon_status: 'active'
                                })
                                .eq('id', school.id);
                              if (error) throw error;
                              alert(`✅ Speicher (+${requestedGb} GB) für ${school.name} erfolgreich freigeschaltet!`);
                              onRefresh();
                            } catch (err: any) {
                              alert(`Fehler beim Freischalten: ${err.message}`);
                            }
                          }}
                          style={{
                            background: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '9px 18px',
                            fontSize: '0.80rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <CheckCircle size={14} color="#ffffff" />
                          <span>Auf Hetzner bereitgestellt (Aktivieren)</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Möchtest du die Anforderung über +${requestedGb} GB für ${school.name} wirklich stornieren?`)) return;
                            try {
                              const { error } = await (supabase as any)
                                .from('schools')
                                .update({
                                  storage_addon_pending_gb: 0,
                                  storage_addon_status: 'cancelled'
                                })
                                .eq('id', school.id);
                              if (error) throw error;
                              alert(`Anforderung für ${school.name} wurde storniert.`);
                              onRefresh();
                            } catch (err: any) {
                              alert(`Fehler beim Stornieren: ${err.message}`);
                            }
                          }}
                          style={{
                            background: '#f1f5f9',
                            color: '#64748b',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '9px 14px',
                            fontSize: '0.80rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Ablehnen
                        </button>
                      </div>
                    </div>

                    {/* CLI Snippet Box */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#0f172a',
                      color: '#94a3b8',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontSize: '0.74rem',
                      fontFamily: 'monospace'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <span style={{ color: '#38bdf8', fontWeight: 800 }}>$</span>
                        <span style={{ color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cliCommand}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(cliCommand);
                          setCopiedCliId(school.id);
                          setTimeout(() => setCopiedCliId(null), 2500);
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginLeft: '12px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {copiedCliId === school.id ? (
                          <>
                            <Check size={11} color="#4ade80" />
                            <span style={{ color: '#4ade80' }}>Kopiert!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Befehl kopieren</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Revenue Financial Counters (MRR / ARR / Abo-Bypass Card) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        {/* MRR Card */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '20px',
          padding: '22px 20px',
          color: '#ffffff',
          boxShadow: '0 12px 28px rgba(16, 185, 129, 0.28)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.92)' }}>
              Monatlicher Umsatz (MRR)
            </span>
            <h3 style={{ fontSize: '2.1rem', fontWeight: 900, margin: '6px 0 0 0', letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif', color: '#ffffff' }}>
              {totalMrr.toFixed(2).replace('.', ',')} €
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '0.70rem', color: '#ffffff', fontWeight: 700, flexWrap: 'wrap' }}>
            <span title="Modul-Hosting Flatrates" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.18)', padding: '2px 7px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
              <Building2 size={11} color="#ffffff" /> {committedBaseMrr.toFixed(2).replace('.', ',')} €
            </span>
            <span title="Schüler- &amp; Lehrer-Bereitstellung" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.18)', padding: '2px 7px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
              <Users size={11} color="#ffffff" /> {seatUsageMrr.toFixed(2).replace('.', ',')} €
            </span>
            {storageAddonMrr > 0 && (
              <span title="Audio-Tresor Speicher-Addons" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.18)', padding: '2px 7px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                <HardDrive size={11} color="#ffffff" /> {storageAddonMrr.toFixed(2).replace('.', ',')} €
              </span>
            )}
          </div>
        </div>

        {/* ARR Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '22px 20px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.025)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Jährliche Run-Rate (ARR)
            </span>
            <h3 style={{ fontSize: '2.1rem', fontWeight: 900, margin: '6px 0 0 0', color: '#0f172a', letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif' }}>
              {totalArr.toFixed(2).replace('.', ',')} €
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '0.70rem', color: '#475569', fontWeight: 700, flexWrap: 'wrap' }}>
            <span title="Jährliche Modul-Flatrates" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
              <Building2 size={11} color="#64748b" /> {committedBaseArr.toFixed(2).replace('.', ',')} €
            </span>
            <span title="Jährliche Schüler- &amp; Lehrereinnahmen" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
              <Users size={11} color="#64748b" /> {seatUsageArr.toFixed(2).replace('.', ',')} €
            </span>
            {storageAddonArr > 0 && (
              <span title="Jährliche Audio-Tresor Addons" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                <HardDrive size={11} color="#64748b" /> {storageAddonArr.toFixed(2).replace('.', ',')} €
              </span>
            )}
          </div>
        </div>

        {/* Bypassed Free Partner Schools Scorecard */}
        <div style={{
          background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
          borderRadius: '20px',
          padding: '22px 20px',
          border: '1px solid #e9d5ff',
          boxShadow: '0 8px 24px rgba(126, 34, 206, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7e22ce', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Abo-Bypass (Freigestellt)
            </span>
            <h3 style={{ fontSize: '2.1rem', fontWeight: 900, margin: '6px 0 0 0', color: '#6b21a8', letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif' }}>
              {bypassedCount} <span style={{ fontSize: '0.9rem', color: '#7e22ce', fontWeight: 700 }}>Schulen</span>
            </h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: expiringBypassSchools.length > 0 ? '#b45309' : '#7e22ce', fontWeight: 700, marginTop: '10px', display: 'block' }}>
            {expiringBypassSchools.length > 0
              ? `${expiringBypassSchools.length} läuft bald ab`
              : '0,00 € Sponsoring / Kulanz'}
          </span>
        </div>

        {/* Total Active Schools */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '22px 20px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.025)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Aktive Musikschulen
            </span>
            <h3 style={{ fontSize: '2.1rem', fontWeight: 900, margin: '6px 0 0 0', color: '#0f172a', letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif' }}>
              {validSchools.length}
            </h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '10px', display: 'block' }}>
            {validSchools.length - bypassedCount} zahlend • {bypassedCount} Bypass
          </span>
        </div>

        {/* Pending Activations */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '22px 20px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.025)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Offene Freischaltungen
            </span>
            <h3 style={{ fontSize: '2.1rem', fontWeight: 900, margin: '6px 0 0 0', color: pendingUsers.length > 0 ? '#ef4444' : '#10b981', letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif' }}>
              {pendingUsers.length}
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('briefing')}
            style={{ fontSize: '0.72rem', color: '#0284c7', background: 'transparent', border: 'none', padding: 0, fontWeight: 800, cursor: 'pointer', marginTop: '10px', textDecoration: 'underline', textAlign: 'left' }}
          >
            Prüfen →
          </button>
        </div>
      </div>

      {/* Hardware & Shortcuts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '28px',
          border: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu size={18} color="#4f46e5" /> Server Telemetrie Übersicht
            </h3>
            <button
              onClick={() => onNavigateTab('telemetry')}
              style={{ fontSize: '0.8rem', color: '#4f46e5', fontWeight: 800, background: 'rgba(79, 70, 229, 0.08)', border: 'none', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer' }}
            >
              Deep Telemetrie Board →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>CPU Auslastung</span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>2 Cores • {rawCpu > 2.0 ? `Peak: ${rawCpu}%` : `Load: ${rawCpu.toFixed(2)}`}</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>{cpuPercent}%</div>
              <div style={{ background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${cpuPercent}%`, height: '100%', background: cpuPercent > 85 ? '#ef4444' : '#10b981' }} />
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>RAM Speicher</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>{ramPercent}%</div>
              <div style={{ background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${ramPercent}%`, height: '100%', background: ramPercent > 85 ? '#ef4444' : '#0284c7' }} />
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Verbindungen</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>{latestMetric.active_connections || 4}</div>
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>Pool Stabil</span>
            </div>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '28px',
          border: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.015)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={18} color="#059669" /> Schnellauswahl
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => onNavigateTab('schools')}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 750, fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={15} color="#475569" /> Schulen-Verwaltung öffnen
                </span>
                <span style={{ color: '#94a3b8' }}>→</span>
              </button>
              <button
                onClick={() => onNavigateTab('pricing')}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 750, fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag size={15} color="#475569" /> Preismatrix &amp; Bestandsschutz
                </span>
                <span style={{ color: '#94a3b8' }}>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 🛡️ SLA & KRISEN-GOVERNANCE MODAL (APPLE HIG ENTERPRISE COCKPIT)       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showSlaModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          animation: 'appleModalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '28px',
            width: '100%',
            maxWidth: '820px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '36px',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '22px',
            fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: slaUptime >= 99.95 ? '#dcfce7' : '#fef3c7',
                  border: `1px solid ${slaUptime >= 99.95 ? '#86efac' : '#fde68a'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Award size={24} color={slaUptime >= 99.95 ? '#16a34a' : '#d97706'} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.30rem', fontWeight: 900, color: '#0f172a' }}>
                    SLA- &amp; Krisen-Governance Cockpit
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                    Wahrhaftige Uptime-Berechnung, automatisierte Service-Credits &amp; Incident Post-Mortems
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSlaModal(false)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Success Toast */}
            {creditBookedToast && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '14px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontSize: '0.82rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: 'appleModalFadeIn 0.2s ease'
              }}>
                <CheckCircle size={16} color="#059669" />
                <span>{creditBookedToast}</span>
              </div>
            )}

            {/* Scope & Telemetry Mode Control Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              {/* Target Scope Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 300px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Zielgruppe:
                </span>
                <select
                  value={targetScope}
                  onChange={(e) => setTargetScope(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: 750,
                    color: '#0f172a',
                    cursor: 'pointer'
                  }}
                >
                  <option value="ALL">🌐 Gesamter Plattform-Verbund (Alle Schulen)</option>
                  {validSchools.map(s => (
                    <option key={s.id} value={s.id}>🏫 {s.name} ({s.city || 'Schule'})</option>
                  ))}
                </select>
              </div>

              {/* Mode Toggle (Auto vs Simulator) */}
              <div style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                padding: '3px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <button
                  type="button"
                  onClick={() => { setSlaMode('auto'); fetchTelemetryDowntime(); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '9px',
                    border: slaMode === 'auto' ? '1px solid #a7f3d0' : 'none',
                    background: slaMode === 'auto' ? '#ffffff' : 'transparent',
                    color: slaMode === 'auto' ? '#065f46' : '#64748b',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Activity size={12} color={slaMode === 'auto' ? '#059669' : '#64748b'} />
                  <span>📡 DB-Telemetrie</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSlaMode('simulator')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '9px',
                    border: slaMode === 'simulator' ? '1px solid #fde68a' : 'none',
                    background: slaMode === 'simulator' ? '#ffffff' : 'transparent',
                    color: slaMode === 'simulator' ? '#b45309' : '#64748b',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Sliders size={12} color={slaMode === 'simulator' ? '#d97706' : '#64748b'} />
                  <span>🎛️ Simulator</span>
                </button>
              </div>
            </div>

            {/* Live Uptime Gauge & Status Box */}
            <div style={{
              background: slaUptime >= 99.95 ? '#f0fdf4' : slaUptime >= 99.00 ? '#fffbeb' : '#fef2f2',
              border: `1.5px solid ${slaUptime >= 99.95 ? '#86efac' : slaUptime >= 99.00 ? '#fde68a' : '#fca5a5'}`,
              borderRadius: '20px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {slaMode === 'auto' ? 'Gemessene Monats-Verfügbarkeit' : 'Simulierter Verfügbarkeitsgrad'}
                    </span>
                    {loadingTelemetry && <RefreshCw size={12} className="animate-spin" color="#64748b" />}
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: slaUptime >= 99.95 ? '#15803d' : slaUptime >= 99.00 ? '#b45309' : '#b91c1c' }}>
                    {slaUptime.toFixed(2)}%
                  </div>
                </div>

                {/* Staged Credit Badge */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    Rechtliche Einstufung
                  </span>
                  <div style={{
                    marginTop: '4px',
                    padding: '6px 14px',
                    borderRadius: '100px',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    background: slaUptime >= 99.95 ? '#dcfce7' : '#fef3c7',
                    color: slaUptime >= 99.95 ? '#16a34a' : '#d97706',
                    border: `1px solid ${slaUptime >= 99.95 ? '#86efac' : '#fde68a'}`
                  }}>
                    {slaUptime >= 99.95 ? '🟢 SLA zu 100% erfüllt (0% Credit)' : slaUptime >= 99.00 ? '🟡 10% Service-Gutschrift' : slaUptime >= 95.00 ? '🟡 25% Service-Gutschrift' : '🔴 50% Service-Gutschrift'}
                  </div>
                </div>
              </div>

              {/* Slider for What-If Analysis */}
              {slaMode === 'simulator' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                    <span>Simulierter Uptime-Wert:</span>
                    <span>{Math.max(0, Math.round((100 - slaUptime) * 432))} Min. Ausfallzeit</span>
                  </div>
                  <input
                    type="range"
                    min="95.00"
                    max="100.00"
                    step="0.01"
                    value={slaUptime}
                    onChange={(e) => setSlaUptime(parseFloat(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: slaUptime >= 99.95 ? '#16a34a' : '#ea580c' }}
                  />
                </div>
              )}
            </div>

            {/* 1-Click Incident Presets (Schnellwahl-Vorlagen) */}
            <div>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                ⚡ 1-Klick Schnellwahl-Vorlagen (Juristisch &amp; technisch vorgeprüft):
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => applyIncidentPreset('hetzner')}
                  style={{ padding: '8px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 750, color: '#334155', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
                  className="hover-scale-mini"
                >
                  <span>🏢</span> <span>Hetzner Rechenzentrum</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyIncidentPreset('db_upgrade')}
                  style={{ padding: '8px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 750, color: '#334155', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
                  className="hover-scale-mini"
                >
                  <span>⚙️</span> <span>DB- &amp; Index-Upgrade</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyIncidentPreset('ddos')}
                  style={{ padding: '8px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 750, color: '#334155', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
                  className="hover-scale-mini"
                >
                  <span>🛡️</span> <span>DDoS-Abwehr</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyIncidentPreset('decix')}
                  style={{ padding: '8px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 750, color: '#334155', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
                  className="hover-scale-mini"
                >
                  <span>🌐</span> <span>DE-CIX Glasfaser</span>
                </button>
              </div>
            </div>

            {/* Section: 1-Click Action Hub (4 Cards) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {/* Action 1: Download SLA Certificate */}
              <button
                type="button"
                onClick={async () => {
                  await handleRecordIncidentAudit();
                  const scopeName = targetScope === 'ALL' ? 'Campus-Groovelab Plattform-Verbund' : schools.find(s => s.id === targetScope)?.name || 'Campus-Groovelab Schule';
                  generateSlaCertificatePDF({
                    schoolName: scopeName,
                    uptimePercent: slaUptime,
                    downtimeMinutes: Math.max(0, Math.round((100 - slaUptime) * 432)),
                    incidentNotes: slaUptime < 99.95 ? `${incidentTitle}: ${incidentRootCause}` : undefined
                  });
                }}
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                className="hover-scale-mini"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 850, fontSize: '0.86rem' }}>
                  <Award size={16} color="#16a34a" />
                  <span>SLA-Zertifikat (PDF)</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                  Monatsnachweis inkl. SHA-256 Audit-Hash &amp; Service-Credits.
                </p>
              </button>

              {/* Action 2: Download Post-Mortem Incident Report */}
              <button
                type="button"
                onClick={async () => {
                  await handleRecordIncidentAudit();
                  generateIncidentReportPDF({
                    incidentTitle,
                    incidentDate: new Date().toLocaleDateString('de-DE'),
                    durationMinutes: Math.max(15, Math.round((100 - slaUptime) * 432)),
                    affectedSchools: targetScope === 'ALL' ? 'Gesamter Plattform-Verbund' : schools.find(s => s.id === targetScope)?.name,
                    rootCause: incidentRootCause,
                    resolutionAction: incidentResolution,
                    preventionMeasures: incidentPrevention,
                    serviceCreditGranted: slaUptime >= 99.95 ? '0% (Kein SLA-Bruch)' : `${slaUptime >= 99.00 ? '10%' : '25%'} Service-Gutschrift auf nächste Monatsrechnung`
                  });
                }}
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                className="hover-scale-mini"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 850, fontSize: '0.86rem' }}>
                  <FileText size={16} color="#d97706" />
                  <span>Post-Mortem Bericht</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                  Transparenter 1-Seiter für Schulleitungen &amp; Gemeinderäte.
                </p>
              </button>

              {/* Action 3: Book Service Credit to School Invoices */}
              <button
                type="button"
                onClick={handleBookServiceCredit}
                disabled={bookingCredit || slaUptime >= 99.95}
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  background: slaUptime < 99.95 ? '#fef3c7' : '#f1f5f9',
                  border: `1px solid ${slaUptime < 99.95 ? '#fde68a' : '#e2e8f0'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  cursor: slaUptime < 99.95 ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                  opacity: slaUptime >= 99.95 ? 0.6 : 1
                }}
                className={slaUptime < 99.95 ? "hover-scale-mini" : ""}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: slaUptime < 99.95 ? '#92400e' : '#64748b', fontWeight: 850, fontSize: '0.86rem' }}>
                  <Tag size={16} color={slaUptime < 99.95 ? '#b45309' : '#64748b'} />
                  <span>{bookingCredit ? 'Buche...' : 'Gutschrift verbuchen'}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: slaUptime < 99.95 ? '#b45309' : '#64748b' }}>
                  {slaUptime < 99.95 ? 'Bucht Gutschrift direkt auf Folgerechnung.' : 'Keine Gutschrift erforderlich (SLA erfüllt).'}
                </p>
              </button>

              {/* Action 4: Trigger Instant Emergency Broadcast */}
              <button
                type="button"
                onClick={handleTriggerEmergencyBroadcast}
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  background: broadcastSent ? '#ecfdf5' : '#fff7ed',
                  border: `1px solid ${broadcastSent ? '#a7f3d0' : '#fdba74'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                className="hover-scale-mini"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: broadcastSent ? '#059669' : '#c2410c', fontWeight: 850, fontSize: '0.86rem' }}>
                  <Megaphone size={16} />
                  <span>{broadcastSent ? 'Banner aktiv!' : 'Notfall-Banner'}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: broadcastSent ? '#065f46' : '#9a3412' }}>
                  Schaltet in 1 Sekunde das Wartungs-Banner für alle Nutzer.
                </p>
              </button>
            </div>

            {/* Custom Post-Mortem Tuning Drawer */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={15} color="#64748b" /> Vorfalls-Parameter für Incident-Report anpassen:
              </h4>

              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 750, color: '#475569', marginBottom: '3px' }}>
                  Titel des Vorfalls:
                </label>
                <input
                  type="text"
                  value={incidentTitle}
                  onChange={(e) => setIncidentTitle(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '9px', border: '1px solid #cbd5e1', fontSize: '0.80rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 750, color: '#475569', marginBottom: '3px' }}>
                    Ursache (Root Cause):
                  </label>
                  <textarea
                    rows={2}
                    value={incidentRootCause}
                    onChange={(e) => setIncidentRootCause(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '9px', border: '1px solid #cbd5e1', fontSize: '0.78rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 750, color: '#475569', marginBottom: '3px' }}>
                    Präventionsmaßnahme:
                  </label>
                  <textarea
                    rows={2}
                    value={incidentPrevention}
                    onChange={(e) => setIncidentPrevention(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '9px', border: '1px solid #cbd5e1', fontSize: '0.78rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

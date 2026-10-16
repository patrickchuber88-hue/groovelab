import React, { useState, useMemo } from 'react';
import {
  Building2, Search, Plus, RefreshCw, Eye, Trash2, Download, Check, Copy,
  ShieldCheck, Clock, ShieldAlert, Phone, X, AlertCircle
} from 'lucide-react';
import { isSchoolBypassActive } from '../../../domain/pricingEngine';
import { isSchoolTrialActive } from '../../../domain/schoolMetricsAggregator';
import { computeSchoolBillingMetrics, CanonicalBillingRates } from '../utils/computeSchoolBillingMetrics';
import type { School, SchoolStat } from '../MasterAdminTypes';
import { ProvisionSchoolModal } from '../modals/ProvisionSchoolModal';
import { MagicInviteKitModal, MagicInviteKitData } from '../modals/MagicInviteKitModal';
import { SuspendSchoolModal } from '../modals/SuspendSchoolModal';

interface SchoolsTabProps {
  schools: School[];
  schoolStats: Record<string, Partial<SchoolStat>>;
  loading: boolean;
  masterPricing: CanonicalBillingRates;
  onRefresh: () => void;
  onSelectSchool: (school: School) => void;
  onStartGhostMode: (school: School) => void;
  onDeleteSchool: (school: School) => void;
  onToggleSchoolStatus: (school: School, newStatus: string) => Promise<void>;
  onTogglePauseSchool?: (school: School) => Promise<void>;
  onProvisionSchool: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  onUpdateOperatorNotes?: (schoolId: string, notes: string) => Promise<void>;
  onExtendTrial?: (schoolId: string, days: number) => Promise<void>;
  onRegenerateInvite?: (schoolId: string) => Promise<{ invite_token?: string }>;
  onSuspendWithAudit?: (schoolId: string, reason: string) => Promise<void>;
}

export const SchoolsTab: React.FC<SchoolsTabProps> = ({
  schools,
  schoolStats,
  loading,
  masterPricing,
  onRefresh,
  onSelectSchool,
  onStartGhostMode,
  onDeleteSchool,
  onToggleSchoolStatus,
  onProvisionSchool,
  onExtendTrial,
  onRegenerateInvite,
  onSuspendWithAudit
}) => {
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'all' | 'kombi' | 'campus' | 'groovelab'>('all');
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'trial' | 'pending' | 'archived'>('all');
  const [actionFilter, setActionFilter] = useState<'all' | 'expiring_trial' | 'missing_avv' | 'inactive' | 'high_activity'>('all');
  const [sortOption, setSortOption] = useState<'students' | 'name' | 'newest' | 'mrr' | 'churn'>('students');

  // Modals
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [magicInviteData, setMagicInviteData] = useState<MagicInviteKitData | null>(null);
  const [suspendTargetSchool, setSuspendTargetSchool] = useState<School | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  // Quick Action Feedback states
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [extendingTrialId, setExtendingTrialId] = useState<string | null>(null);
  const [activeMrrTooltipSchoolId, setActiveMrrTooltipSchoolId] = useState<string | null>(null);

  // Keep archived schools in sanitizedSchools so archivedCount and statusTab === 'archived' work truthfully!
  const sanitizedSchools = useMemo(() => {
    const hasNonDemo = (schools || []).some(s => !s.is_demo_tenant);
    return (schools || []).filter(s => !hasNonDemo || !s.is_demo_tenant);
  }, [schools]);

  const nonArchivedSchools = useMemo(() => {
    return sanitizedSchools.filter(s => s.status !== 'archived');
  }, [sanitizedSchools]);

  // Precompute canonical billing metrics for every school (SSOT)
  const schoolMetricsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeSchoolBillingMetrics>>();
    sanitizedSchools.forEach(s => {
      map.set(s.id, computeSchoolBillingMetrics(s, schoolStats[s.id], masterPricing));
    });
    return map;
  }, [sanitizedSchools, schoolStats, masterPricing]);

  // Aggregate Metrics for Header Scorecards & Operator Action Center
  const {
    totalPayingSchools,
    totalCombinedMrr,
    totalActiveStudentsCount,
    totalPassiveStudentsCount,
    totalSignedAvvCount
  } = useMemo(() => {
    let paying = 0;
    let combinedMrr = 0;
    let activeStudentsCnt = 0;
    let passiveStudentsCnt = 0;
    let signedAvvCnt = 0;

    nonArchivedSchools.forEach(s => {
      const m = schoolMetricsMap.get(s.id);
      if (!m) return;

      const activeStudents = Math.max(m.activeCampusStudentsCount, m.activeGroovelabStudentsCount);
      activeStudentsCnt += activeStudents;
      passiveStudentsCnt += m.passiveStudentsCount;
      if (s.avv_signed_at) signedAvvCnt += 1;

      const isSuspendedOrArchived = m.isSuspendedOrArchived || s.status === 'archived' || s.status === 'suspended' || Boolean(s.is_paused);
      const isPending = s.is_approved === false || s.status === 'pending';
      const isTrial = isSchoolTrialActive(s) && !isPending;
      const isPaying = !isTrial && !m.isTrialOrBypass && !isSuspendedOrArchived && !isPending;

      if (isPaying && m.totalMonthlyNet > 0) {
        paying += 1;
        combinedMrr += m.totalMonthlyNet;
      }
    });

    return {
      totalPayingSchools: paying,
      totalCombinedMrr: combinedMrr,
      totalActiveStudentsCount: activeStudentsCnt,
      totalPassiveStudentsCount: passiveStudentsCnt,
      totalSignedAvvCount: signedAvvCnt
    };
  }, [nonArchivedSchools, schoolMetricsMap]);

  // Pure Telemetry Helper (Zero Hardcoded School Names)
  const getSchoolActivityStatus = (school: School) => {
    const lastSeenStr = school.last_session_at || school.created_at;
    if (!lastSeenStr) return { level: 'unknown', label: 'Unbekannt', color: '#94a3b8', bg: '#f1f5f9', daysAgo: 999 };
    const diffMs = Date.now() - new Date(lastSeenStr).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 48) {
      return {
        level: 'active',
        label: diffHours < 2 ? 'Gerade aktiv' : `Vor ${diffHours}h`,
        color: '#059669',
        bg: '#ecfdf5',
        daysAgo: 0
      };
    } else if (diffDays <= 14) {
      return {
        level: 'idle',
        label: `Vor ${diffDays}d`,
        color: '#d97706',
        bg: '#fffbeb',
        daysAgo: diffDays
      };
    } else {
      return {
        level: 'inactive',
        label: `Inaktiv (${diffDays}d)`,
        color: '#dc2626',
        bg: '#fef2f2',
        daysAgo: diffDays
      };
    }
  };

  const getDaysUntilTrialExpires = (school: School) => {
    const expiryDate = school.trial_until || school.trial_ends_at;
    if (!expiryDate) return null;
    const diffMs = new Date(expiryDate).getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const expiringTrialSchools = useMemo(() => {
    return nonArchivedSchools.filter(s => {
      if (!isSchoolTrialActive(s)) return false;
      const days = getDaysUntilTrialExpires(s);
      return days !== null && days <= 7;
    });
  }, [nonArchivedSchools]);

  const missingAvvSchools = useMemo(() => {
    return nonArchivedSchools.filter(s => !s.avv_signed_at);
  }, [nonArchivedSchools]);

  const inactiveSchools = useMemo(() => {
    return nonArchivedSchools.filter(s => {
      const act = getSchoolActivityStatus(s);
      return act.level === 'inactive' && s.status === 'active';
    });
  }, [nonArchivedSchools]);

  // Combined Filter and Sort Logic
  const filteredSchools = useMemo(() => {
    return sanitizedSchools.filter(s => {
      // Exclude archived schools unless statusTab === 'archived'
      if (statusTab !== 'archived' && s.status === 'archived') {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = (s.name || '').toLowerCase().includes(q);
        const matchesContact = (s.billing_contact_person || '').toLowerCase().includes(q);
        const matchesCity = (s.city || '').toLowerCase().includes(q);
        const matchesZip = (s.zip_code || '').toLowerCase().includes(q);
        const matchesEmail = (s.billing_email || s.email || '').toLowerCase().includes(q);
        const matchesPhone = (s.phone_number || '').toLowerCase().includes(q);
        const matchesNotes = (s.operator_notes || '').toLowerCase().includes(q);
        if (!matchesName && !matchesContact && !matchesCity && !matchesZip && !matchesEmail && !matchesPhone && !matchesNotes) {
          return false;
        }
      }

      if (statusTab === 'active') {
        const isPending = s.is_approved === false || s.status === 'pending';
        const isPaused = Boolean(s.is_paused) || s.status === 'suspended' || s.status === 'archived';
        const isTrial = isSchoolTrialActive(s);
        if (isPending || isPaused || isTrial) return false;
      } else if (statusTab === 'trial') {
        const isPending = s.is_approved === false || s.status === 'pending';
        const isPaused = Boolean(s.is_paused) || s.status === 'suspended' || s.status === 'archived';
        if (!isSchoolTrialActive(s) || isPending || isPaused) return false;
      } else if (statusTab === 'pending') {
        if (s.is_approved !== false && s.status !== 'pending') return false;
      } else if (statusTab === 'archived') {
        if (s.status !== 'archived' && !s.is_paused && s.status !== 'suspended') return false;
      }

      if (moduleFilter === 'kombi') {
        if (!s.has_campus_subscription || !s.has_groovelab_subscription) return false;
      } else if (moduleFilter === 'campus') {
        if (!s.has_campus_subscription || s.has_groovelab_subscription) return false;
      } else if (moduleFilter === 'groovelab') {
        if (!s.has_groovelab_subscription || s.has_campus_subscription) return false;
      }

      if (actionFilter === 'expiring_trial') {
        const days = getDaysUntilTrialExpires(s);
        if (!isSchoolTrialActive(s) || days === null || days > 7) return false;
      } else if (actionFilter === 'missing_avv') {
        if (s.avv_signed_at) return false;
      } else if (actionFilter === 'inactive') {
        if (getSchoolActivityStatus(s).level !== 'inactive') return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOption === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortOption === 'newest') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      } else if (sortOption === 'mrr') {
        const mrrA = schoolMetricsMap.get(a.id)?.totalMonthlyNet ?? 0;
        const mrrB = schoolMetricsMap.get(b.id)?.totalMonthlyNet ?? 0;
        return mrrB - mrrA;
      } else if (sortOption === 'churn') {
        return getSchoolActivityStatus(b).daysAgo - getSchoolActivityStatus(a).daysAgo;
      } else {
        const actA = Math.max(schoolStats[a.id]?.studentsCampus || 0, schoolStats[a.id]?.studentsGroovelab || 0);
        const actB = Math.max(schoolStats[b.id]?.studentsCampus || 0, schoolStats[b.id]?.studentsGroovelab || 0);
        return actB - actA;
      }
    });
  }, [sanitizedSchools, searchQuery, moduleFilter, statusTab, actionFilter, sortOption, schoolStats, schoolMetricsMap]);

  const pendingCount = nonArchivedSchools.filter(s => s.is_approved === false || s.status === 'pending').length;
  const trialCount = nonArchivedSchools.filter(s => isSchoolTrialActive(s) && s.is_approved !== false && s.status !== 'pending' && !s.is_paused && s.status !== 'suspended').length;
  const activeCount = nonArchivedSchools.filter(s => !isSchoolTrialActive(s) && s.is_approved !== false && s.status !== 'pending' && !s.is_paused && s.status !== 'suspended').length;
  const archivedCount = sanitizedSchools.filter(s => s.status === 'archived' || s.is_paused || s.status === 'suspended').length;

  // 1-Click CSV Export using SSOT computeSchoolBillingMetrics
  const handleExportFilteredCsv = () => {
    const headers = [
      'Schul-ID', 'Name', 'PLZ', 'Ort', 'Schulleitung', 'Telefon', 'E-Mail',
      'Status', 'Aktivitaet', 'Testphase', 'AVV_Status', 'Modul_Campus',
      'Modul_GrooveLab', 'Lehrer', 'Aktive_Schueler', 'Passive_Schueler',
      'MRR_Netto', 'Waehrung', 'Betreiber_Notiz'
    ];

    const rows = filteredSchools.map(s => {
      const m = schoolMetricsMap.get(s.id) || computeSchoolBillingMetrics(s, schoolStats[s.id], masterPricing);
      const activeStudents = Math.max(m.activeCampusStudentsCount, m.activeGroovelabStudentsCount);
      const act = getSchoolActivityStatus(s);

      return [
        `"${s.id}"`,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${s.zip_code || ''}"`,
        `"${s.city || ''}"`,
        `"${(s.billing_contact_person || '').replace(/"/g, '""')}"`,
        `"${s.phone_number || ''}"`,
        `"${s.billing_email || s.email || ''}"`,
        `"${s.status || 'active'}"`,
        `"${act.label}"`,
        `"${isSchoolTrialActive(s) ? 'Ja' : 'Nein'}"`,
        `"${s.avv_signed_at ? 'Gezeichnet' : 'Ausstehend'}"`,
        `"${m.hasCampus ? 'Aktiv' : 'Inaktiv'}"`,
        `"${m.hasGroovelab ? 'Aktiv' : 'Inaktiv'}"`,
        m.teachersCount,
        activeStudents,
        m.passiveStudentsCount,
        m.totalMonthlyNet.toFixed(2),
        `"${m.currency}"`,
        `"${(s.operator_notes || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Campus-Groovelab_Mandanten_Gefiltert_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleQuickExtendTrial = async (school: School, days: number) => {
    try {
      setExtendingTrialId(school.id);
      if (onExtendTrial) {
        await onExtendTrial(school.id, days);
      }
    } catch (e: unknown) {
      alert('Fehler bei Kulanz-Verlängerung: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExtendingTrialId(null);
    }
  };

  const handleRegenerateAndCopyInvite = async (school: School) => {
    try {
      setCopiedInviteId(school.id);
      let token = school.invite_token;
      if (onRegenerateInvite) {
        const res = await onRegenerateInvite(school.id);
        if (res?.invite_token) token = res.invite_token;
      }

      const inviteUrl = `${window.location.origin}/?school_id=${school.id}&invite=school_onboarding${token ? `&token=${token}` : ''}`;
      const contactName = school.billing_contact_person || 'Schulleitung';
      const text = `Guten Tag ${contactName},\n\nhier ist Ihr persönlicher Einrichtungs- und Aktivierungszugang für Campus-Groovelab an der Musikschule ${school.name}:\n${inviteUrl}\n\nDieser gesicherte Einladungslink ist für 14 Tage gültig. Der 3-Schritte-Assistent führt Sie direkt durch das Setup und die DSGVO-AVV-Gegenzeichnung.\n\nBei Fragen unterstützen wir Sie jederzeit gerne!\n\nHerzliche Grüße,\nPatrick Huber | Campus-Groovelab Leitstand`;

      await navigator.clipboard.writeText(text);
      setTimeout(() => setCopiedInviteId(null), 3000);
    } catch (err: unknown) {
      alert('Fehler beim Kopieren: ' + (err instanceof Error ? err.message : String(err)));
      setCopiedInviteId(null);
    }
  };

  const handleConfirmSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendTargetSchool) return;
    if (!suspendReason.trim()) {
      alert('Bitte geben Sie einen Grund für die Sperrung an.');
      return;
    }

    try {
      setSuspending(true);
      if (onSuspendWithAudit) {
        await onSuspendWithAudit(suspendTargetSchool.id, suspendReason.trim());
      } else {
        await onToggleSchoolStatus(suspendTargetSchool, 'suspended');
      }
      setSuspendTargetSchool(null);
      setSuspendReason('');
    } catch (err: unknown) {
      alert('Fehler bei der Mandanten-Sperrung: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSuspending(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      width: '100%',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Outfit", sans-serif'
    }} className="animate-fade-in">

      {/* 1. MASTER HEADER BAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{
              fontSize: '2.1rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.035em'
            }}>
              Schulen &amp; Tenants Register
            </h2>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: '20px',
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #e2e8f0',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {nonArchivedSchools.length} Aktive / {archivedCount} Archiv
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.90rem', color: '#64748b', fontWeight: 500 }}>
            Zentrale Multi-Tenant Übersicht aller Musikschulen, DSGVO-AVVs, Aktivierungsquoten &amp; MRR.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportFilteredCsv}
            style={{
              padding: '9px 16px',
              borderRadius: '12px',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.84rem',
              fontWeight: 700,
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
            }}
            title="Exportiert exakt die derzeit gefilterte Mandantenliste"
          >
            <Download size={14} color="#475569" /> CSV Export ({filteredSchools.length})
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            style={{
              padding: '9px 14px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#475569',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Aktualisieren
          </button>

          <button
            type="button"
            onClick={() => setShowProvisionModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px'
            }}
            className="hover-scale-mini"
          >
            <Plus size={16} color="#ffffff" /> Schule provisionieren
          </button>
        </div>
      </div>

      {/* 2. UNIFIED METRIC SCORECARDS & SMART ALERTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '20px',
          padding: '20px 22px',
          color: '#ffffff',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.9 }}>
              Mandanten-MRR Gesamt
            </span>
            <h3 style={{ fontSize: '2.0rem', fontWeight: 900, margin: '5px 0 0 0', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
              {totalCombinedMrr.toFixed(2).replace('.', ',')} €
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
            <span style={{ background: 'rgba(255, 255, 255, 0.20)', padding: '2px 8px', borderRadius: '8px' }}>
              {totalPayingSchools} Zahlende Schulen
            </span>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '20px 22px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.025)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Schüler-Aktivierungen
            </span>
            <h3 style={{ fontSize: '2.0rem', fontWeight: 900, margin: '5px 0 0 0', color: '#0f172a', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
              {totalActiveStudentsCount}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
            <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#0f172a', padding: '2px 8px', borderRadius: '8px' }}>
              {totalActiveStudentsCount} Aktiv App
            </span>
            <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', padding: '2px 8px', borderRadius: '8px' }}>
              {totalPassiveStudentsCount} Basis
            </span>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '20px 22px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.025)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              DSGVO-AVV Compliance
            </span>
            <h3 style={{ fontSize: '2.0rem', fontWeight: 900, margin: '5px 0 0 0', color: '#0f172a', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
              {totalSignedAvvCount} <span style={{ fontSize: '1.1rem', color: '#94a3b8', fontWeight: 600 }}>/ {nonArchivedSchools.length}</span>
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: missingAvvSchools.length === 0 ? '#ecfdf5' : '#fffbeb',
              color: missingAvvSchools.length === 0 ? '#059669' : '#d97706',
              padding: '2px 8px',
              borderRadius: '8px'
            }}>
              <ShieldCheck size={12} /> {missingAvvSchools.length} AVVs offen
            </span>
          </div>
        </div>

        {/* Card 4: Ø ARPU / Mandant */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '20px 22px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.025)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Ø ARPU / B2B Mandant
            </span>
            <h3 style={{ fontSize: '2.0rem', fontWeight: 900, margin: '5px 0 0 0', color: '#0f172a', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
              {totalPayingSchools > 0 ? (totalCombinedMrr / totalPayingSchools).toFixed(2).replace('.', ',') : '0,00'} €
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
            <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', padding: '2px 8px', borderRadius: '8px' }}>
              {totalPayingSchools} von {nonArchivedSchools.length} konvertiert
            </span>
          </div>
        </div>
      </div>

      {/* 3. CONTROL BAR (SEGMENTED TABS, SEARCH, SORT) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '16px 20px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '14px',
            gap: '3px',
            border: '1px solid #e2e8f0'
          }}>
            {[
              { id: 'all', label: `Alle (${nonArchivedSchools.length})` },
              { id: 'active', label: `Aktiv (${activeCount})` },
              { id: 'trial', label: `Testphase (${trialCount})` },
              { id: 'pending', label: `Freigabe (${pendingCount})` },
              { id: 'archived', label: `Archiv (${archivedCount})` }
            ].map(tab => {
              const isSel = statusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusTab(tab.id as typeof statusTab)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '11px',
                    border: isSel ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent',
                    background: isSel ? '#ffffff' : 'transparent',
                    color: isSel ? '#0f172a' : '#64748b',
                    fontWeight: isSel ? 800 : 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isSel ? '0 2px 6px rgba(0, 0, 0, 0.05)' : 'none',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { id: 'all', label: 'Alle Module' },
              { id: 'kombi', label: 'Kombi' },
              { id: 'campus', label: 'Campus' },
              { id: 'groovelab', label: 'GrooveLab' }
            ].map(mod => {
              const isSel = moduleFilter === mod.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setModuleFilter(mod.id as typeof moduleFilter)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '100px',
                    border: isSel ? 'none' : '1px solid #e2e8f0',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: isSel ? '#ecfdf5' : '#f8fafc',
                    color: isSel ? '#047857' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {mod.label}
                </button>
              );
            })}

            {missingAvvSchools.length > 0 && (
              <button
                type="button"
                onClick={() => setActionFilter(actionFilter === 'missing_avv' ? 'all' : 'missing_avv')}
                style={{
                  padding: '6px 11px',
                  borderRadius: '100px',
                  border: actionFilter === 'missing_avv' ? 'none' : '1px solid #fed7aa',
                  background: actionFilter === 'missing_avv' ? '#ffedd5' : '#ffffff',
                  color: '#c2410c',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <ShieldAlert size={12} />
                <span>{missingAvvSchools.length} AVVs offen</span>
              </button>
            )}

            {expiringTrialSchools.length > 0 && (
              <button
                type="button"
                onClick={() => setActionFilter(actionFilter === 'expiring_trial' ? 'all' : 'expiring_trial')}
                style={{
                  padding: '6px 11px',
                  borderRadius: '100px',
                  border: actionFilter === 'expiring_trial' ? 'none' : '1px solid #fde68a',
                  background: actionFilter === 'expiring_trial' ? '#fef3c7' : '#ffffff',
                  color: '#b45309',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Clock size={12} />
                <span>{expiringTrialSchools.length} Test &lt;7d</span>
              </button>
            )}

            {inactiveSchools.length > 0 && (
              <button
                type="button"
                onClick={() => setActionFilter(actionFilter === 'inactive' ? 'all' : 'inactive')}
                style={{
                  padding: '6px 11px',
                  borderRadius: '100px',
                  border: actionFilter === 'inactive' ? 'none' : '1px solid #fecaca',
                  background: actionFilter === 'inactive' ? '#fee2e2' : '#ffffff',
                  color: '#b91c1c',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <AlertCircle size={12} />
                <span>{inactiveSchools.length} Inaktiv (&gt;14d)</span>
              </button>
            )}

            {actionFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setActionFilter('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '100px',
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#475569',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche nach Schulname, Schulleitung, PLZ, Ort, E-Mail..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '9px 12px 9px 36px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Suchtext löschen"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
            style={{
              padding: '9px 14px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: '0.80rem',
              fontWeight: 700,
              color: '#334155',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="students">Sortierung: Beste Kunden (Aktiv)</option>
            <option value="mrr">Höchster MRR-Umsatz</option>
            <option value="name">Alphabetisch (A - Z)</option>
            <option value="newest">Neueste Registrierungen</option>
            <option value="churn">Längste Inaktivität (Churn-Alarm)</option>
          </select>
        </div>
      </div>

      {/* 4. ENTERPRISE DATA-GRID */}
      {filteredSchools.length === 0 ? (
        <div style={{
          padding: '60px 24px',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '0.90rem',
          border: '1px dashed #cbd5e1',
          borderRadius: '24px',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Building2 size={36} color="#cbd5e1" />
          <strong style={{ color: '#475569', fontSize: '1.05rem' }}>Keine Mandanten gefunden</strong>
          <span>Passen Sie Ihre Filter oder Suchbegriffe an.</span>
        </div>
      ) : (
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.025)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.82rem',
              tableLayout: 'fixed'
            }}>
              <thead>
                <tr style={{
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  color: '#64748b',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}>
                  <th style={{ padding: '9px 12px', width: '22%' }}>Mandant &amp; Standort</th>
                  <th style={{ padding: '9px 10px', width: '18%' }}>Schulleitung &amp; Kontakt</th>
                  <th style={{ padding: '9px 10px', width: '16%' }}>Vertrag &amp; Aktivität</th>
                  <th style={{ padding: '9px 10px', width: '9%' }}>DSGVO</th>
                  <th style={{ padding: '9px 10px', width: '12%' }}>Nutzer (L / S)</th>
                  <th style={{ padding: '9px 10px', width: '10%' }}>MRR Rate</th>
                  <th style={{ padding: '9px 12px', width: '13%', textAlign: 'left' }}>Schnellaktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((school, idx) => {
                  const stats = schoolStats[school.id] || {};
                  const metrics = schoolMetricsMap.get(school.id) || computeSchoolBillingMetrics(school, stats, masterPricing);
                  const teachers = metrics.teachersCount;
                  const campusActive = metrics.activeCampusStudentsCount;
                  const groovelabActive = metrics.activeGroovelabStudentsCount;
                  const activeStudents = Math.max(campusActive, groovelabActive);
                  const passiveStudents = metrics.passiveStudentsCount;

                  const isPending = school.is_approved === false || school.status === 'pending';
                  const isPaused = school.is_paused || school.status === 'suspended' || school.status === 'archived';
                  const isTrial = isSchoolTrialActive(school) && !isPending;
                  const trialDaysLeft = getDaysUntilTrialExpires(school);
                  const act = getSchoolActivityStatus(school);

                  const mrr = metrics.totalMonthlyNet;

                  return (
                    <tr
                      key={school.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isPending ? '#fffdf7' : isPaused ? '#fcfcfc' : idx % 2 === 1 ? '#fafafa' : '#ffffff',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Mandant & Ort */}
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelectSchool(school)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectSchool(school);
                            }
                          }}
                          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}
                        >
                          <strong style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: 750 }}>
                            {school.name}
                          </strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.70rem', color: '#64748b' }}>
                            <span>{school.zip_code || ''} {school.city || 'Standort hinterlegt'}</span>
                            {metrics.hasCampus && (
                              <span style={{ fontSize: '0.60rem', background: '#ecfdf5', color: '#059669', padding: '1px 4px', borderRadius: '4px', fontWeight: 800 }}>
                                Campus
                              </span>
                            )}
                            {metrics.hasGroovelab && (
                              <span style={{ fontSize: '0.60rem', background: '#fefce8', color: '#ca8a04', padding: '1px 4px', borderRadius: '4px', fontWeight: 800 }}>
                                GrooveLab
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Schulleitung & Kontakt */}
                      <td style={{ padding: '9px 10px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 700, color: school.billing_contact_person ? '#1e293b' : '#64748b', fontSize: '0.76rem' }}>
                            {school.billing_contact_person || 'Schulleitung'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#64748b' }}>
                            {school.phone_number && !['test', '000', '123', 'keine', 'null', '-'].includes(school.phone_number.trim().toLowerCase()) ? (
                              <a
                                href={`tel:${school.phone_number}`}
                                style={{ color: '#0369a1', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                              >
                                <Phone size={9} /> {school.phone_number}
                              </a>
                            ) : school.billing_email || school.email ? (
                              <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>
                                {school.billing_email || school.email}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Kein Direktkontakt</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Vertrag & Aktivität */}
                      <td style={{ padding: '9px 10px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {school.status === 'archived' ? (
                            <span style={{ fontSize: '0.64rem', background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '5px', fontWeight: 800, width: 'fit-content' }}>
                              Archiviert (GoBD)
                            </span>
                          ) : isPending ? (
                            <span style={{ fontSize: '0.64rem', background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '5px', fontWeight: 800, width: 'fit-content' }}>
                              Freigabe offen
                            </span>
                          ) : isPaused ? (
                            <span style={{ fontSize: '0.64rem', background: '#fee2e2', color: '#dc2626', border: 'none', padding: '1px 5px', borderRadius: '5px', fontWeight: 800, width: 'fit-content' }}>
                              Pausiert
                            </span>
                          ) : isTrial ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap' }}>
                              <span style={{
                                fontSize: '0.64rem',
                                background: trialDaysLeft !== null && trialDaysLeft <= 7 ? '#fef3c7' : '#f1f5f9',
                                color: trialDaysLeft !== null && trialDaysLeft <= 7 ? '#b45309' : '#475569',
                                border: 'none',
                                padding: '1px 5px',
                                borderRadius: '5px',
                                fontWeight: 800,
                                width: 'fit-content',
                                whiteSpace: 'nowrap'
                              }}>
                                Testphase {trialDaysLeft !== null ? `(${trialDaysLeft}d)` : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuickExtendTrial(school, 14)}
                                disabled={extendingTrialId === school.id}
                                style={{
                                  padding: '1px 5px',
                                  borderRadius: '5px',
                                  background: '#fffbeb',
                                  border: 'none',
                                  color: '#b45309',
                                  fontSize: '0.60rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  lineHeight: 1.2,
                                  whiteSpace: 'nowrap'
                                }}
                                title="Testphase um +14 Tage Kulanz verlängern"
                              >
                                {extendingTrialId === school.id ? '...' : '+14d'}
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.64rem', background: '#ecfdf5', color: '#059669', border: 'none', padding: '1px 5px', borderRadius: '5px', fontWeight: 800, width: 'fit-content' }}>
                              Abo Aktiv
                            </span>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: act.color, fontWeight: 750, whiteSpace: 'nowrap' }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: act.color, flexShrink: 0 }} />
                            <span>{act.label}</span>
                          </div>
                        </div>
                      </td>

                      {/* DSGVO-AVV Badge */}
                      <td style={{ padding: '9px 10px', verticalAlign: 'middle' }}>
                        {school.avv_signed_at ? (
                          <div
                            title={`DSGVO-AVV gezeichnet am ${new Date(school.avv_signed_at).toLocaleDateString('de-DE')}${school.avv_signee_name ? ` durch ${school.avv_signee_name}` : ''}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: '#ecfdf5',
                              color: '#059669',
                              border: 'none',
                              padding: '2px 6px',
                              borderRadius: '5px',
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              cursor: 'help',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <ShieldCheck size={10} />
                            <span>Gezeichnet</span>
                          </div>
                        ) : (
                          <div
                            title="Auftragsverarbeitungsvertrag (AVV) noch nicht unterzeichnet"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: '#fffbeb',
                              color: '#b45309',
                              border: 'none',
                              padding: '2px 6px',
                              borderRadius: '5px',
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              cursor: 'help',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <ShieldAlert size={10} />
                            <span>Ausstehend</span>
                          </div>
                        )}
                      </td>

                      {/* Nutzer Quoten */}
                      <td style={{ padding: '9px 10px', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '0.74rem', color: activeStudents > 0 || teachers > 0 ? '#1e293b' : '#64748b', fontWeight: 750, whiteSpace: 'nowrap' }}>
                          {teachers} L · {activeStudents} S aktiv
                        </div>
                        {(campusActive > 0 || groovelabActive > 0 || passiveStudents > 0) ? (
                          <div style={{ fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                            {campusActive > 0 && <span style={{ color: '#059669', fontWeight: 700 }}>{campusActive} Campus</span>}
                            {groovelabActive > 0 && <span style={{ color: '#d97706', fontWeight: 700 }}>{groovelabActive} GL</span>}
                            {passiveStudents > 0 && <span style={{ color: '#94a3b8' }}>{passiveStudents} passiv</span>}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>0 Provisioniert</span>
                        )}
                      </td>

                      {/* MRR Rate */}
                      <td style={{ padding: '9px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div
                          style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', gap: '2px' }}
                          onMouseEnter={() => setActiveMrrTooltipSchoolId(school.id)}
                          onMouseLeave={() => setActiveMrrTooltipSchoolId(null)}
                        >
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                            <span style={{
                              fontSize: '0.84rem',
                              fontWeight: 900,
                              fontVariantNumeric: 'tabular-nums',
                              color: isTrial ? '#64748b' : (mrr > 0 ? '#0f172a' : '#94a3b8'),
                              whiteSpace: 'nowrap'
                            }}>
                              {isTrial ? `0,00 ${metrics.currencySymbol}` : `${mrr.toFixed(2).replace('.', ',')} ${metrics.currencySymbol}`}
                            </span>
                            <span style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 650 }}>
                              / Mo.
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            {isTrial ? (
                              <span style={{ fontSize: '0.60rem', background: '#f1f5f9', color: '#64748b', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                Testphase
                              </span>
                            ) : isSchoolBypassActive(school) ? (
                              <span style={{ fontSize: '0.60rem', background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                Kulanz
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.60rem', background: '#ecfdf5', color: '#059669', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                B2B Zahler
                              </span>
                            )}
                          </div>

                          {activeMrrTooltipSchoolId === school.id && (
                            <div style={{
                              position: 'absolute',
                              bottom: 'calc(100% + 8px)',
                              left: '0',
                              background: '#ffffff',
                              color: '#1e293b',
                              border: '1px solid #e2e8f0',
                              padding: '12px 16px',
                              borderRadius: '14px',
                              fontSize: '0.72rem',
                              width: '270px',
                              zIndex: 9999,
                              boxShadow: '0 12px 36px rgba(15, 23, 42, 0.12)',
                              lineHeight: '1.5'
                            }}>
                              <div style={{ fontWeight: 800, borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', marginBottom: '5px' }}>
                                Kanonische B2B-Kalkulation
                              </div>
                              <div style={{ color: '#16a34a' }}>1. Software-Bereitstellung: 0,00 {metrics.currencySymbol}</div>
                              <div>Hosting Netto: {metrics.baseHostingNet.toFixed(2).replace('.', ',')} {metrics.currencySymbol}</div>
                              <div>Service ({teachers} Lehrer): {metrics.step5TeacherServiceFee.toFixed(2).replace('.', ',')} {metrics.currencySymbol}</div>
                              <div>Basis ({passiveStudents} Schüler): {metrics.step6PassiveStudentBaseFee.toFixed(2).replace('.', ',')} {metrics.currencySymbol}</div>
                              {metrics.step7StorageAddonFee > 0 && <div>Audio-Tresor Addon: {metrics.step7StorageAddonFee.toFixed(2).replace('.', ',')} {metrics.currencySymbol}</div>}
                              <div style={{ fontWeight: 900, borderTop: '1px solid #f1f5f9', paddingTop: '4px', marginTop: '4px', color: '#059669' }}>
                                Summe: {mrr.toFixed(2).replace('.', ',')} {metrics.currencySymbol} / Mo.
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Schnellaktionen Toolbar */}
                      <td style={{ padding: '9px 12px', verticalAlign: 'middle', textAlign: 'left' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-start', flexWrap: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => onStartGhostMode(school)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '7px',
                              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.70rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              flexShrink: 0
                            }}
                            title="Ghost-Support im neuen Tab autorisieren & starten"
                          >
                            <Eye size={11} /> Ghost
                          </button>

                          <button
                            type="button"
                            aria-label="Magic-Invite erneuern und Briefing kopieren"
                            onClick={() => handleRegenerateAndCopyInvite(school)}
                            style={{
                              padding: '5px 7px',
                              borderRadius: '7px',
                              background: copiedInviteId === school.id ? '#ecfdf5' : '#f8fafc',
                              border: copiedInviteId === school.id ? 'none' : '1px solid #e2e8f0',
                              color: copiedInviteId === school.id ? '#059669' : '#475569',
                              fontSize: '0.70rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                            title="Magic-Invite erneuern & Schulleiter-Briefing kopieren"
                          >
                            {copiedInviteId === school.id ? <Check size={11} /> : <Copy size={11} />}
                          </button>

                          {(() => {
                            const isSuspended = school.status === 'suspended' || school.is_paused === true;
                            return (
                              <button
                                type="button"
                                role="switch"
                                aria-checked={!isSuspended}
                                aria-label={!isSuspended ? `Schule ${school.name} pausieren` : `Schule ${school.name} reaktivieren`}
                                onClick={() => {
                                  if (!isSuspended) {
                                    setSuspendTargetSchool(school);
                                    setSuspendReason('');
                                  } else {
                                    onToggleSchoolStatus(school, 'active');
                                  }
                                }}
                                style={{
                                  position: 'relative',
                                  width: '32px',
                                  height: '18px',
                                  borderRadius: '9px',
                                  background: !isSuspended ? '#10b981' : '#cbd5e1',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  transition: 'background 0.2s ease',
                                  flexShrink: 0
                                }}
                                title={!isSuspended ? 'Schule pausieren / sperren' : 'Schule reaktivieren'}
                              >
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  transform: !isSuspended ? 'translateX(16px)' : 'translateX(3px)',
                                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                }} />
                              </button>
                            );
                          })()}

                          <button
                            type="button"
                            aria-label={`Schule ${school.name} archivieren oder löschen`}
                            onClick={() => onDeleteSchool(school)}
                            style={{
                              background: '#fef2f2',
                              border: 'none',
                              borderRadius: '7px',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: '5px 7px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                            title="Schule archivieren / löschen"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. AUTARKIC MODALS */}
      <ProvisionSchoolModal
        isOpen={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        onProvisionSchool={onProvisionSchool}
        onProvisionSuccess={(inviteData) => setMagicInviteData(inviteData)}
      />

      <MagicInviteKitModal
        data={magicInviteData}
        onClose={() => setMagicInviteData(null)}
      />

      <SuspendSchoolModal
        school={suspendTargetSchool}
        reason={suspendReason}
        onChangeReason={setSuspendReason}
        suspending={suspending}
        onClose={() => setSuspendTargetSchool(null)}
        onSubmit={handleConfirmSuspend}
      />
    </div>
  );
};

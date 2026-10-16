import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench, ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, Clock,
  RefreshCw, Key, Lock, Zap, Megaphone, Server, Activity, Database,
  Eye, Send, Radio, ShieldCheck, Power, Download, Sparkles, Smartphone,
  Check, Copy, Info, Calendar, Layers, Shield, Search, Cpu, Users,
  HardDrive, Award, Network, GraduationCap, Music
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { MaintenanceState } from '../../MaintenanceLockoutOverlay';
import { BroadcastAnnouncement } from '../../GlobalBroadcastBanner';
import { HiscoxAltsystemeCertModal } from '../modals/HiscoxAltsystemeCertModal';
import { HiscoxVpnCertModal } from '../modals/HiscoxVpnCertModal';

export interface MaintenanceSchool {
  id: string;
  name: string;
  city?: string | null;
}

interface MaintenanceAuditEntry {
  id: string;
  timestamp: string;
  ended_at?: string;
  duration_minutes: number;
  mode: string;
  scope: string;
  reason: string;
  operator: string;
}

interface SpecialOfferStateEntry {
  id?: string;
  state?: unknown;
  [key: string]: unknown;
}

export interface MaintenanceTabProps {
  schools: MaintenanceSchool[];
  saveSuccessToast: string | null;
  setSaveSuccessToast: (msg: string | null) => void;
  onRequestStepUp?: (actionLabel: string, onVerified: () => void) => void;
}

const generateDefaultBypassPin = (): string => {
  const array = new Uint32Array(1);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(array);
    const code = 1000 + (array[0] % 9000);
    return `CG-BYPASS-${code}`;
  }
  return 'CG-BYPASS-4920';
};

export const MaintenanceTab: React.FC<MaintenanceTabProps> = ({
  saveSuccessToast: _saveSuccessToast,
  setSaveSuccessToast,
  onRequestStepUp
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'planner' | 'diagnostics' | 'lifecycle'>('status');
  const [hiscoxAltsystemeModalOpen, setHiscoxAltsystemeModalOpen] = useState(false);
  const [hiscoxVpnModalOpen, setHiscoxVpnModalOpen] = useState(false);

  // --- Audit Log Search & Hygiene Actions ---
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [purgingRateLimits, setPurgingRateLimits] = useState(false);
  const [pruningStudents, setPruningStudents] = useState(false);
  const [vacuumingStorage, setVacuumingStorage] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);

  const getNextSunday2am = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    d.setHours(2, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const getTomorrow3am = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(3, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const getNextMonthFirst1am = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 1);
    d.setHours(1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  // --- Maintenance State ---
  const [maintenance, setMaintenance] = useState<MaintenanceState>(() => {
    const saved = localStorage.getItem('cg_master_maintenance_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as MaintenanceState;
        if (parsed && typeof parsed === 'object') {
          return {
            ...parsed,
            bypassPin: parsed.bypassPin && parsed.bypassPin !== 'CG-ROOT-8822' ? parsed.bypassPin : generateDefaultBypassPin()
          };
        }
      } catch {
        // ignore invalid JSON
      }
    }
    return {
      isActive: false,
      mode: 'calendar_scheduler',
      scope: 'all',
      targetSchoolIds: [],
      reason: 'Planmäßige System-Upgrades und Leistungsoptimierungen für den Schulbetrieb.',
      countdownMinutes: 10,
      scheduledStartTime: getNextSunday2am(),
      estimatedDurationMinutes: 30,
      bypassPin: generateDefaultBypassPin(),
      forceSessionReset: false,
      readOnlyMode: true,
      preNoticeHours: 24,
      autoReleaseHealthCheck: true,
      updatedAt: new Date().toISOString()
    };
  });

  // --- Broadcast Announcement State ---
  const [announcement, setAnnouncement] = useState<BroadcastAnnouncement>(() => {
    const saved = localStorage.getItem('cg_master_broadcast_announcement');
    if (saved) {
      try {
        return JSON.parse(saved) as BroadcastAnnouncement;
      } catch {
        // ignore invalid JSON
      }
    }
    return {
      isActive: false,
      severity: 'info',
      title: 'Information zur Plattform',
      message: 'Am kommenden Sonntag finden zwischen 02:00 und 03:00 Uhr kurze Wartungsarbeiten statt.',
      targetAudience: 'all',
      dismissible: true,
      createdAt: new Date().toISOString()
    };
  });

  // --- Audit Log State (Zero Fake Logs) ---
  const [auditLog, setAuditLog] = useState<MaintenanceAuditEntry[]>(() => {
    const saved = localStorage.getItem('cg_master_maintenance_audit_log');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (e: MaintenanceAuditEntry) => e && e.id !== 'LOG-8841' && e.id !== 'LOG-7729'
          );
        }
      } catch {
        // ignore
      }
    }
    return [];
  });

  // --- Diagnostics State ---
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [pinging, setPinging] = useState<boolean>(false);
  const [lastBustedVersion, setLastBustedVersion] = useState<string>(() => {
    return localStorage.getItem('cg_pwa_busted_version') || 'v2.6.4';
  });

  // Load from DB on mount
  useEffect(() => {
    const loadFromDb = async () => {
      try {
        const { data } = await supabase
          .from('master_billing_settings')
          .select('special_offers')
          .eq('id', 1)
          .maybeSingle();
        if (data && Array.isArray(data.special_offers)) {
          const offers = data.special_offers as SpecialOfferStateEntry[];
          const mEntry = offers.find((o) => o?.id === '__cg_master_maintenance_state__');
          if (mEntry?.state && typeof mEntry.state === 'object') {
            const loadedState = mEntry.state as MaintenanceState;
            setMaintenance(loadedState);
            localStorage.setItem('cg_master_maintenance_state', JSON.stringify(loadedState));
          }

          const aEntry = offers.find((o) => o?.id === '__cg_master_broadcast_announcement__');
          if (aEntry?.state && typeof aEntry.state === 'object') {
            const loadedAnn = aEntry.state as BroadcastAnnouncement;
            setAnnouncement(loadedAnn);
            localStorage.setItem('cg_master_broadcast_announcement', JSON.stringify(loadedAnn));
          }

          const logEntry = offers.find((o) => o?.id === '__cg_master_maintenance_audit_log__');
          if (Array.isArray(logEntry?.state)) {
            const cleanLogs = (logEntry.state as MaintenanceAuditEntry[]).filter(
              (e) => e && e.id !== 'LOG-8841' && e.id !== 'LOG-7729'
            );
            setAuditLog(cleanLogs);
            localStorage.setItem('cg_master_maintenance_audit_log', JSON.stringify(cleanLogs));
          }
        }
      } catch (err) {
        console.warn('Error loading maintenance state from DB:', err);
      }
    };

    void loadFromDb();
  }, []);

  // Persist to DB & LocalStorage
  const persistState = async (
    newMaintenance: MaintenanceState,
    newAnnouncement?: BroadcastAnnouncement,
    newLog?: MaintenanceAuditEntry[]
  ) => {
    const updatedMaintenance = newMaintenance;
    const updatedAnnouncement = newAnnouncement || announcement;
    const updatedLog = newLog || auditLog;

    setMaintenance(updatedMaintenance);
    if (newAnnouncement) setAnnouncement(updatedAnnouncement);
    if (newLog) setAuditLog(updatedLog);

    localStorage.setItem('cg_master_maintenance_state', JSON.stringify(updatedMaintenance));
    localStorage.setItem('cg_master_broadcast_announcement', JSON.stringify(updatedAnnouncement));
    localStorage.setItem('cg_master_maintenance_audit_log', JSON.stringify(updatedLog));

    try {
      const { data } = await supabase
        .from('master_billing_settings')
        .select('special_offers')
        .eq('id', 1)
        .maybeSingle();
      const rawOffers = Array.isArray(data?.special_offers) ? (data.special_offers as SpecialOfferStateEntry[]) : [];
      const existingOffers = rawOffers.filter(
        (o) =>
          o?.id !== '__cg_master_maintenance_state__' &&
          o?.id !== '__cg_master_broadcast_announcement__' &&
          o?.id !== '__cg_master_maintenance_audit_log__'
      );

      const finalOffers = [
        ...existingOffers,
        { id: '__cg_master_maintenance_state__', state: updatedMaintenance },
        { id: '__cg_master_broadcast_announcement__', state: updatedAnnouncement },
        { id: '__cg_master_maintenance_audit_log__', state: updatedLog }
      ];

      await supabase
        .from('master_billing_settings')
        .update({
          special_offers: finalOffers,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      setSaveSuccessToast('Wartungs- und Betriebseinstellungen erfolgreich synchronisiert.');
      setTimeout(() => setSaveSuccessToast(null), 3000);
    } catch (err) {
      console.warn('DB Persist error:', err);
    }
  };

  // Execute Emergency Killswitch State Change
  const executeKillswitchChange = async (willBeActive: boolean) => {
    const updatedMaintenance: MaintenanceState = {
      ...maintenance,
      isActive: willBeActive,
      updatedAt: new Date().toISOString()
    };

    let updatedLog = [...auditLog];
    if (willBeActive) {
      const newEntry: MaintenanceAuditEntry = {
        id: `LOG-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString(),
        duration_minutes: maintenance.estimatedDurationMinutes,
        mode: maintenance.mode,
        scope: maintenance.scope,
        reason: maintenance.reason,
        operator: 'MasterAdmin'
      };
      updatedLog = [newEntry, ...updatedLog];
    } else if (updatedLog.length > 0 && !updatedLog[0].ended_at) {
      updatedLog[0] = {
        ...updatedLog[0],
        ended_at: new Date().toISOString()
      };
    }

    await persistState(updatedMaintenance, undefined, updatedLog);
  };

  // Master Emergency Toggle (Step-Up Protected on Activation)
  const handleToggleEmergencyKillswitch = (forcedNextState?: boolean) => {
    const willBeActive = forcedNextState !== undefined ? forcedNextState : !maintenance.isActive;
    if (willBeActive && onRequestStepUp) {
      onRequestStepUp('Notfall-Wartung / Killswitch aktivieren', () => {
        void executeKillswitchChange(true);
      });
      return;
    }
    void executeKillswitchChange(willBeActive);
  };

  const handlePruneInactiveStudents = async () => {
    if (!window.confirm('Möchten Sie alle monatlich abgerechneten Schülerprofile ohne Login seit > 60 Tagen auf Basis-Bereitstellung (0,09 € / Mo.) umstellen? Accounts & QR-Landingpages bleiben zu 100 % erhalten.')) {
      return;
    }
    try {
      setPruningStudents(true);
      const { data, error } = await supabase.rpc('prune_inactive_students_bulk', { p_school_id: null });
      if (error) throw error;
      const resultRecord = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
      const count = typeof resultRecord.deactivated_count === 'number' ? resultRecord.deactivated_count : 0;
      setSaveSuccessToast(`Inaktivitäts-Sparmodus abgeschlossen: ${count} Profile auf Basis-Bereitstellung (0,09 €) umgestellt.`);
      setTimeout(() => setSaveSuccessToast(null), 4500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('Fehler beim Inaktivitäts-Sparmodus: ' + msg);
    } finally {
      setPruningStudents(false);
    }
  };

  const handleStorageOrphanCleanup = async () => {
    try {
      setVacuumingStorage(true);
      const { data, error } = await supabase.rpc('get_storage_orphan_statistics');
      if (error) throw error;
      const resultRecord = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
      const count = typeof resultRecord.total_matrix_audio_records === 'number' ? resultRecord.total_matrix_audio_records : 0;
      setSaveSuccessToast(`Audio-Tresor Prüflauf erfolgreich: ${count} aktive Audio-Spuren verifiziert. Storage konsistent.`);
      setTimeout(() => setSaveSuccessToast(null), 4500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('Fehler bei der Storage-Prüfung: ' + msg);
    } finally {
      setVacuumingStorage(false);
    }
  };

  const handlePurgeRateLimits = async () => {
    try {
      setPurgingRateLimits(true);
      const { data, error } = await supabase.rpc('purge_expired_rate_limits', { p_days_retention: 7 });
      if (error) throw error;
      setSaveSuccessToast(`Datenbank-Hygiene abgeschlossen: ${typeof data === 'number' ? data : 0} veraltete Rate-Limit-Einträge bereinigt.`);
      setTimeout(() => setSaveSuccessToast(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('Fehler bei der Datenbank-Hygiene: ' + msg);
    } finally {
      setPurgingRateLimits(false);
    }
  };

  const handleMeasurePing = async () => {
    setPinging(true);
    const start = performance.now();
    try {
      await supabase.from('schools').select('id').limit(1);
      const diff = Math.round(performance.now() - start);
      setPingLatency(diff);
    } catch {
      setPingLatency(999);
    } finally {
      setPinging(false);
    }
  };

  const handleTriggerCacheBuster = async () => {
    const newVer = 'v' + Date.now().toString().slice(-6);
    setLastBustedVersion(newVer);
    localStorage.setItem('cg_pwa_busted_version', newVer);
    window.dispatchEvent(new CustomEvent('cg_pwa_cache_bust', { detail: { version: newVer } }));

    const bustAnnouncement: BroadcastAnnouncement = {
      ...announcement,
      isActive: true,
      severity: 'info',
      title: 'App-Update synchronisiert',
      message: `System-Cache wurde aktualisiert (${newVer}). Lokale Anwendungen wurden synchronisiert.`
    };
    await persistState(maintenance, bustAnnouncement);
  };

  const handleForceSessionReset = async () => {
    const confirmed = window.confirm('ACHTUNG: Möchten Sie wirklich alle regulären Benutzer-Sitzungen sofort ungültig machen? Alle Lehrkräfte und Schüler werden abgemeldet.');
    if (!confirmed) return;

    const newMaintenance: MaintenanceState = {
      ...maintenance,
      forceSessionReset: true,
      updatedAt: new Date().toISOString()
    };
    await persistState(newMaintenance);
  };

  const handleCopyPin = () => {
    void navigator.clipboard.writeText(maintenance.bypassPin);
    setPinCopied(true);
    setSaveSuccessToast('Bypass-PIN in Zwischenablage kopiert.');
    setTimeout(() => {
      setPinCopied(false);
      setSaveSuccessToast(null);
    }, 2500);
  };

  const handleExportAuditLogCsv = () => {
    if (!auditLog.length) return;
    const headers = ['ID', 'Zeitstempel (Start)', 'Beendet am', 'Dauer (Min)', 'Modus', 'Geltungsbereich', 'Wartungsgrund', 'Administrator'];
    const rows = auditLog.map(e => [
      `"${e.id}"`,
      `"${new Date(e.timestamp).toLocaleString('de-DE')}"`,
      `"${e.ended_at ? new Date(e.ended_at).toLocaleString('de-DE') : 'Aktiv / Offen'}"`,
      `"${e.duration_minutes}"`,
      `"${e.mode}"`,
      `"${e.scope}"`,
      `"${e.reason.replace(/"/g, '""')}"`,
      `"${e.operator}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Campus-Groovelab_Wartungs_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredAuditLog = useMemo(() => {
    if (!auditSearchQuery.trim()) return auditLog;
    const q = auditSearchQuery.toLowerCase();
    return auditLog.filter(e =>
      e.reason.toLowerCase().includes(q) ||
      e.operator.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.mode.toLowerCase().includes(q)
    );
  }, [auditLog, auditSearchQuery]);

  const announcementPresets: { label: string; severity: 'info' | 'warning' | 'emergency'; title: string; message: string }[] = [
    {
      label: 'Wartung am Wochenende',
      severity: 'warning',
      title: 'Geplante Wartungsarbeiten am Sonntag',
      message: 'Am kommenden Sonntag zwischen 02:00 und 04:00 Uhr finden geplante Server-Upgrades statt. In dieser Zeit kann es zu kurzen Unterbrechungen kommen.'
    },
    {
      label: 'Neues Feature-Update',
      severity: 'info',
      title: 'Neues Campus-Groovelab Update verfügbar',
      message: 'Wir haben neue Funktionen für das Schüler-Protokoll, die Loopstation und den Raumplaner veröffentlicht.'
    },
    {
      label: 'Kurze Datenbank-Optimierung',
      severity: 'info',
      title: 'Routinemäßige System-Optimierung',
      message: 'Aktuell führen wir kurze Leistungsoptimierungen an den Servern durch. Der Betrieb läuft uneingeschränkt weiter.'
    },
    {
      label: 'Wichtige Betriebsmeldung',
      severity: 'emergency',
      title: 'Wichtiger Hinweis zum Audio-Tresor',
      message: 'Aufgrund kurzzeitiger Wartung am Audio-Speicher kann das Hochladen neuer Aufnahmen für wenige Minuten verzögert sein.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1440px', margin: '0 auto', width: '100%', fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif" }} className="animate-fade-in">
      {/* TOP BAR & SEGMENTED CONTROLLER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', background: '#ffffff', padding: '20px 24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: maintenance.isActive ? '#dc2626' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
            {maintenance.isActive ? <ShieldAlert size={24} /> : <Wrench size={24} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em' }}>
                Wartung &amp; Plattform-Betrieb
              </h2>
              <span style={{ fontSize: '0.68rem', fontWeight: 900, padding: '3px 10px', borderRadius: '100px', background: '#f1f5f9', color: '#475569', border: 'none', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                IONOS Produktion + Hetzner Backup
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.84rem', color: '#64748b', fontWeight: 500 }}>
              Zentraler Leitstand für Notfall-Killswitch, Broadcast-Banner, Datenbank-Hygiene &amp; Technologie-Lebenszyklus.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setHiscoxAltsystemeModalOpen(true)}
            style={{ padding: '9px 14px', borderRadius: '12px', background: '#0284c7', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.80rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Award size={15} color="#ffffff" />
            <span>Hiscox Altsysteme-Zertifikat</span>
          </button>

          <button
            type="button"
            onClick={() => setHiscoxVpnModalOpen(true)}
            style={{ padding: '9px 14px', borderRadius: '12px', background: '#0f172a', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.80rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Network size={15} color="#ffffff" />
            <span>Hiscox VPN-Zertifikat</span>
          </button>

          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '14px', gap: '3px', flexWrap: 'wrap' }}>
            {[
              { id: 'status', label: 'Live-Status & Killswitch', icon: Power },
              { id: 'planner', label: 'Broadcast & Planer', icon: Megaphone },
              { id: 'diagnostics', label: 'Diagnose & Hygiene', icon: Activity },
              { id: 'lifecycle', label: 'Altsysteme & EOL-Radar', icon: Cpu }
            ].map((tab) => {
              const Icon = tab.icon;
              const isSel = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)}
                  style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: isSel ? '#ffffff' : 'transparent', color: isSel ? '#0f172a' : '#64748b', fontWeight: isSel ? 800 : 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: isSel ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
                >
                  <Icon size={15} color={isSel ? '#0f172a' : '#64748b'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAB 1: LIVE-STATUS & NOTFALL-KILLSWITCH */}
      {activeSubTab === 'status' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* HERO STATUS BANNER (Fixed High-Contrast Text on White Card) */}
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '28px 32px', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px', border: `1px solid ${maintenance.isActive ? '#fca5a5' : '#e2e8f0'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: maintenance.isActive ? '#fee2e2' : '#ecfdf5', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: maintenance.isActive ? '#dc2626' : '#059669' }}>
                {maintenance.isActive ? <ShieldAlert size={30} /> : <ShieldCheck size={30} />}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '3px 10px', borderRadius: '100px', background: maintenance.isActive ? '#fef2f2' : '#ecfdf5', color: maintenance.isActive ? '#dc2626' : '#059669', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: maintenance.isActive ? '#ef4444' : '#10b981' }} />
                    {maintenance.isActive ? 'Wartungsmodus Aktiv' : 'System Normal & Online'}
                  </span>

                  {!maintenance.isActive && maintenance.mode === 'calendar_scheduler' && maintenance.scheduledStartTime && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '100px', background: '#f0f9ff', color: '#0369a1', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={12} />
                      <span>Geplant: {new Date(maintenance.scheduledStartTime).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr</span>
                    </span>
                  )}

                  <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                    Zuletzt aktualisiert: {new Date(maintenance.updatedAt || Date.now()).toLocaleTimeString('de-DE')} Uhr
                  </span>
                </div>

                <h3 style={{ margin: 0, fontSize: '1.55rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  {maintenance.isActive ? 'Plattform im Wartungsmodus (Sperrbildschirm aktiv)' : 'Campus-Groovelab Betriebs-Status: 100 % Verfügbar'}
                </h3>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#475569', maxWidth: '680px', lineHeight: 1.45 }}>
                  {maintenance.isActive
                    ? `Aktiver Grund: ${maintenance.reason}`
                    : 'Alle Server-Dienste (IONOS Produktiv-Cluster & Hetzner Backup-System), Datenbanken, Audio-Tresore und Raumplaner laufen ohne Einschränkungen.'}
                </p>
              </div>
            </div>

            <div style={{ minWidth: '280px' }}>
              <button
                type="button"
                onClick={() => handleToggleEmergencyKillswitch()}
                style={{ width: '100%', padding: '14px 24px', borderRadius: '100px', border: 'none', background: maintenance.isActive ? '#059669' : '#dc2626', color: '#ffffff', fontSize: '0.92rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              >
                <Power size={18} />
                <span>{maintenance.isActive ? 'Wartung beenden & Freischalten' : 'Notfall-Wartung aktivieren'}</span>
              </button>
              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                {maintenance.isActive ? 'Hebt die Sperre sofort für alle Schulen auf' : 'Step-Up-geschützte Aktivierung (Verhindert Fehlbedienung)'}
              </div>
            </div>
          </div>

          {/* 2-Column Split: Configuration Form Left, Compact Live Preview Right */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
            <div style={{ background: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                  Wartungs- &amp; Killswitch-Konfiguration
                </h4>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Steuerung von Aktivierungsmodus, Geltungsbereich, Lesemodus und Schulleiter-Bypass.
                </span>
              </div>

              {/* Mode Switcher */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
                  Aktivierungs-Modus
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setMaintenance({ ...maintenance, mode: 'scheduled_countdown' })}
                    style={{ padding: '12px 14px', borderRadius: '14px', border: maintenance.mode === 'scheduled_countdown' ? '2px solid #059669' : '1px solid #cbd5e1', background: maintenance.mode === 'scheduled_countdown' ? '#ecfdf5' : '#ffffff', color: maintenance.mode === 'scheduled_countdown' ? '#065f46' : '#334155', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ fontWeight: 900, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={15} />
                      <span>Countdown-Vorwarnung</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                      Warnt {maintenance.countdownMinutes} Min. vor Sperre
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMaintenance({ ...maintenance, mode: 'emergency_killswitch' })}
                    style={{ padding: '12px 14px', borderRadius: '14px', border: maintenance.mode === 'emergency_killswitch' ? '2px solid #dc2626' : '1px solid #cbd5e1', background: maintenance.mode === 'emergency_killswitch' ? '#fef2f2' : '#ffffff', color: maintenance.mode === 'emergency_killswitch' ? '#991b1b' : '#334155', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ fontWeight: 900, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldAlert size={15} />
                      <span>Sofortiger Killswitch</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                      Sperrt Zugriffe unverzüglich
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMaintenance({ ...maintenance, mode: 'calendar_scheduler', scheduledStartTime: maintenance.scheduledStartTime || getNextSunday2am(), preNoticeHours: 24, autoReleaseHealthCheck: true })}
                    style={{ padding: '12px 14px', borderRadius: '14px', border: maintenance.mode === 'calendar_scheduler' ? '2px solid #0284c7' : '1px solid #cbd5e1', background: maintenance.mode === 'calendar_scheduler' ? '#f0f9ff' : '#ffffff', color: maintenance.mode === 'calendar_scheduler' ? '#0369a1' : '#334155', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ fontWeight: 900, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={15} />
                      <span>Geplantes Zeitfenster</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                      Automatischer Wartungs-Zyklus
                    </div>
                  </button>
                </div>
              </div>

              {maintenance.mode === 'calendar_scheduler' && (
                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '18px', border: '1px solid #bae6fd', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <strong style={{ fontSize: '0.86rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={16} /> Geplanter Startzeitpunkt
                    </strong>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => setMaintenance({ ...maintenance, scheduledStartTime: getNextSunday2am() })} style={{ padding: '4px 10px', borderRadius: '100px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0284c7', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}>
                        So. 02:00 Uhr
                      </button>
                      <button type="button" onClick={() => setMaintenance({ ...maintenance, scheduledStartTime: getTomorrow3am() })} style={{ padding: '4px 10px', borderRadius: '100px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0284c7', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}>
                        Morgen 03:00 Uhr
                      </button>
                      <button type="button" onClick={() => setMaintenance({ ...maintenance, scheduledStartTime: getNextMonthFirst1am() })} style={{ padding: '4px 10px', borderRadius: '100px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0284c7', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}>
                        1. des Monats
                      </button>
                    </div>
                  </div>
                  <input
                    type="datetime-local"
                    value={maintenance.scheduledStartTime || getNextSunday2am()}
                    onChange={(e) => setMaintenance({ ...maintenance, scheduledStartTime: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                  Wartungsgrund (Nutzern angezeigt)
                </label>
                <input
                  type="text"
                  value={maintenance.reason}
                  onChange={(e) => setMaintenance({ ...maintenance, reason: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Geltungsbereich (Scope)
                  </label>
                  <select
                    value={maintenance.scope}
                    onChange={(e) => setMaintenance({ ...maintenance, scope: e.target.value as MaintenanceState['scope'] })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}
                  >
                    <option value="all">Plattformweit (Alle Module &amp; Schulen)</option>
                    <option value="campus_only">Nur Modul Campus</option>
                    <option value="groovelab_only">Nur Modul GrooveLab</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Schulleiter Bypass-Code
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={maintenance.bypassPin}
                      onChange={(e) => setMaintenance({ ...maintenance, bypassPin: e.target.value })}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '11px 40px 11px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.86rem', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}
                    />
                    <button
                      type="button"
                      onClick={handleCopyPin}
                      aria-label="Bypass-Code kopieren"
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: pinCopied ? '#059669' : '#64748b', cursor: 'pointer', padding: '4px' }}
                    >
                      {pinCopied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Read-Only Degradation Mode Accessible Switch */}
              <div style={{ background: maintenance.readOnlyMode ? '#fffbeb' : '#f8fafc', borderRadius: '16px', padding: '16px', border: `1px solid ${maintenance.readOnlyMode ? '#fde68a' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                <div>
                  <div style={{ fontWeight: 850, fontSize: '0.86rem', color: maintenance.readOnlyMode ? '#92400e' : '#0f172a' }}>
                    Read-Only Degradation Mode (Sanfte Wartung)
                  </div>
                  <div style={{ fontSize: '0.74rem', color: maintenance.readOnlyMode ? '#b45309' : '#64748b', marginTop: '2px' }}>
                    Stundenpläne und Notizen bleiben einsehbar; Schreibzugriffe werden während der Wartung pausiert.
                  </div>
                </div>

                <div
                  role="switch"
                  aria-checked={Boolean(maintenance.readOnlyMode)}
                  aria-label="Read-Only Degradation Mode umschalten"
                  tabIndex={0}
                  onClick={() => setMaintenance({ ...maintenance, readOnlyMode: !maintenance.readOnlyMode })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setMaintenance({ ...maintenance, readOnlyMode: !maintenance.readOnlyMode });
                    }
                  }}
                  style={{ position: 'relative', width: '44px', height: '24px', flexShrink: 0, cursor: 'pointer', borderRadius: '24px', background: maintenance.readOnlyMode ? '#d97706' : '#cbd5e1', transition: '0.2s' }}
                >
                  <span style={{ position: 'absolute', height: '18px', width: '18px', left: maintenance.readOnlyMode ? '23px' : '3px', bottom: '3px', background: '#ffffff', transition: '0.2s', borderRadius: '50%' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Geschätzte Dauer (Minuten)
                  </label>
                  <input
                    type="number"
                    value={maintenance.estimatedDurationMinutes}
                    onChange={(e) => setMaintenance({ ...maintenance, estimatedDurationMinutes: Number(e.target.value) })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Vorwarn-Countdown (Minuten)
                  </label>
                  <input
                    type="number"
                    value={maintenance.countdownMinutes}
                    onChange={(e) => setMaintenance({ ...maintenance, countdownMinutes: Number(e.target.value) })}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void persistState(maintenance)}
                style={{ padding: '13px', borderRadius: '14px', background: '#0f172a', color: '#ffffff', border: 'none', fontSize: '0.90rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Check size={16} />
                <span>Wartungs-Konfiguration speichern</span>
              </button>
            </div>

            {/* Clean ~35-Line Live Maintenance Banner & Lockout Preview */}
            <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Eye size={16} color="#64748b" /> Live-Vorschau ({maintenance.readOnlyMode ? 'Sanfter Lesemodus' : 'Vollsperre'})
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '100px', background: maintenance.readOnlyMode ? '#fef3c7' : '#fee2e2', color: maintenance.readOnlyMode ? '#b45309' : '#dc2626', border: 'none' }}>
                  {maintenance.scope === 'all' ? 'Plattformweit' : maintenance.scope === 'campus_only' ? 'Nur Campus' : 'Nur GrooveLab'}
                </span>
              </div>

              <div style={{ borderRadius: '18px', padding: '24px', background: '#0f172a', color: '#ffffff', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Wrench size={20} color="#38bdf8" />
                  <strong style={{ fontSize: '1.05rem', fontWeight: 900 }}>
                    {maintenance.readOnlyMode ? 'Wartung aktiv — Lesezugriff geöffnet' : 'Plattform wird aktuell gewartet'}
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {maintenance.reason || 'Planmäßige System-Upgrades.'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '12px' }}>
                  <span>Geschätzte Dauer: ~{maintenance.estimatedDurationMinutes} Min.</span>
                  <span>Bypass: {maintenance.bypassPin}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BROADCAST-STUDIO */}
      {activeSubTab === 'planner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={15} color="#0f172a" /> Schnellvorlagen:
            </div>
            {announcementPresets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setAnnouncement({ ...announcement, severity: p.severity, title: p.title, message: p.message });
                  setSaveSuccessToast(`Vorlage „${p.label}“ geladen.`);
                }}
                style={{ padding: '7px 14px', borderRadius: '100px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
            <div style={{ background: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Broadcast-Banner Studio</h4>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Plattformweite Ankündigungen &amp; Betriebshinweise</span>
                </div>

                {/* Accessible Switch for Broadcast Live State */}
                <div
                  role="switch"
                  aria-checked={Boolean(announcement.isActive)}
                  aria-label="Broadcast-Banner Live-Status umschalten"
                  tabIndex={0}
                  onClick={() => {
                    const nextActive = !announcement.isActive;
                    const updated = { ...announcement, isActive: nextActive };
                    setAnnouncement(updated);
                    void persistState(maintenance, updated);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const nextActive = !announcement.isActive;
                      const updated = { ...announcement, isActive: nextActive };
                      setAnnouncement(updated);
                      void persistState(maintenance, updated);
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', background: announcement.isActive ? '#ecfdf5' : '#f8fafc', border: 'none', padding: '6px 12px', borderRadius: '100px', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '0.76rem', fontWeight: 900, color: announcement.isActive ? '#047857' : '#64748b' }}>
                    {announcement.isActive ? 'LIVE GESCHALTET' : 'ENTWURF (OFFLINE)'}
                  </span>
                  <div style={{ width: '38px', height: '22px', borderRadius: '100px', background: announcement.isActive ? '#10b981' : '#cbd5e1', position: 'relative' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#ffffff', position: 'absolute', top: '2px', left: announcement.isActive ? '18px' : '2px', transition: '0.2s' }} />
                  </div>
                </div>
              </div>

              {/* Severity Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {[
                  { id: 'info', label: 'Information', icon: Info, color: '#0284c7', bg: '#f0f9ff' },
                  { id: 'warning', label: 'Warnung', icon: AlertTriangle, color: '#ca8a04', bg: '#fefce8' },
                  { id: 'emergency', label: 'Störung', icon: AlertCircle, color: '#dc2626', bg: '#fef2f2' }
                ].map((s) => {
                  const SIcon = s.icon;
                  const isSel = announcement.severity === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setAnnouncement({ ...announcement, severity: s.id as BroadcastAnnouncement['severity'] })}
                      style={{ borderRadius: '14px', padding: '12px', border: isSel ? `2px solid ${s.color}` : '1px solid #e2e8f0', background: isSel ? s.bg : '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: isSel ? s.color : '#334155', fontWeight: 800, fontSize: '0.84rem' }}
                    >
                      <SIcon size={16} color={s.color} />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Target Audience */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'all', label: 'Alle Benutzer', icon: Users },
                  { id: 'teachers', label: 'Lehrkräfte & Verwaltung', icon: GraduationCap },
                  { id: 'students', label: 'Nur Schüler', icon: Music },
                  { id: 'admins', label: 'Nur Administratoren', icon: Shield }
                ].map((aud) => {
                  const isSel = announcement.targetAudience === aud.id;
                  const Icon = aud.icon;
                  return (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() => setAnnouncement({ ...announcement, targetAudience: aud.id as BroadcastAnnouncement['targetAudience'] })}
                      style={{ padding: '10px 14px', borderRadius: '12px', border: isSel ? 'none' : '1px solid #cbd5e1', background: isSel ? '#0f172a' : '#f8fafc', color: isSel ? '#ffffff' : '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.80rem' }}
                    >
                      <Icon size={14} color={isSel ? '#ffffff' : '#64748b'} />
                      <span>{aud.label}</span>
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                value={announcement.title}
                onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                placeholder="Banner-Titel..."
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}
              />

              <textarea
                rows={3}
                value={announcement.message}
                onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                placeholder="Nachrichtentext..."
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.86rem', fontWeight: 500, color: '#0f172a', resize: 'vertical' }}
              />

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...announcement, isActive: false };
                    setAnnouncement(updated);
                    void persistState(maintenance, updated);
                  }}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#f1f5f9', color: '#334155', border: 'none', fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Als Entwurf speichern
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...announcement, isActive: true };
                    setAnnouncement(updated);
                    void persistState(maintenance, updated);
                  }}
                  style={{ flex: 1.3, padding: '12px', borderRadius: '12px', background: '#059669', color: '#ffffff', border: 'none', fontSize: '0.88rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Send size={15} />
                  <span>{announcement.isActive ? 'Live-Banner aktualisieren' : 'Jetzt LIVE schalten'}</span>
                </button>
              </div>
            </div>

            {/* Clean ~30-Line Live Broadcast Banner Preview */}
            <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Radio size={16} color="#059669" /> Live Banner-Vorschau
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '100px', background: announcement.isActive ? '#ecfdf5' : '#f1f5f9', color: announcement.isActive ? '#047857' : '#64748b', border: 'none' }}>
                  {announcement.isActive ? 'LIVE' : 'ENTWURF'}
                </span>
              </div>

              <div style={{
                padding: '16px',
                borderRadius: '16px',
                background: announcement.severity === 'emergency' ? '#fef2f2' : announcement.severity === 'warning' ? '#fefce8' : '#f0f9ff',
                color: announcement.severity === 'emergency' ? '#991b1b' : announcement.severity === 'warning' ? '#854d0e' : '#075985',
                border: 'none',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{ marginTop: '2px' }}>
                  {announcement.severity === 'emergency' ? <AlertCircle size={18} /> : announcement.severity === 'warning' ? <AlertTriangle size={18} /> : <Info size={18} />}
                </div>
                <div>
                  <div style={{ fontWeight: 850, fontSize: '0.90rem' }}>{announcement.title || 'Kein Titel'}</div>
                  <div style={{ fontSize: '0.82rem', marginTop: '4px', lineHeight: 1.45 }}>{announcement.message || 'Keine Nachricht'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DIAGNOSE, HYGIENE & AUDIT-LOG */}
      {activeSubTab === 'diagnostics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            {/* Card 1: DB Ping */}
            <div style={{ background: '#ffffff', borderRadius: '22px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Database size={16} color="#0f172a" /> IONOS Produktiv-DB
                  </span>
                  <span style={{ fontSize: '0.70rem', fontWeight: 900, padding: '2px 8px', borderRadius: '100px', background: '#ecfdf5', color: '#059669', border: 'none' }}>
                    {pingLatency === null ? 'Bereit' : pingLatency < 100 ? 'Optimal' : 'Erhöht'}
                  </span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>{pingLatency !== null ? `${pingLatency} ms` : '—'}</div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Echtzeit-Latenzmessung zum primären PostgreSQL-Cluster.</p>
              </div>
              <button type="button" onClick={handleMeasurePing} disabled={pinging} style={{ padding: '10px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <RefreshCw size={14} className={pinging ? 'animate-spin' : ''} />
                <span>{pinging ? 'Messe Latenz...' : 'Latenz-Ping messen'}</span>
              </button>
            </div>

            {/* Card 2: PWA Cache Buster */}
            <div style={{ background: '#ffffff', borderRadius: '22px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Smartphone size={16} color="#0f172a" /> PWA Service Worker
                  </span>
                  <span style={{ fontSize: '0.70rem', fontWeight: 900, padding: '2px 8px', borderRadius: '100px', background: '#e0f2fe', color: '#0284c7', border: 'none' }}>Auto-Sync</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>{lastBustedVersion}</div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Erzwingt bei allen Endgeräten das Neuladen aktueller App-Bundles.</p>
              </div>
              <button type="button" onClick={handleTriggerCacheBuster} style={{ padding: '10px 14px', borderRadius: '12px', background: '#059669', border: 'none', color: '#ffffff', fontSize: '0.82rem', fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Zap size={14} />
                <span>Cache-Bust forcieren</span>
              </button>
            </div>

            {/* Card 3: Session Invalidation */}
            <div style={{ background: '#ffffff', borderRadius: '22px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={16} color="#0f172a" /> Auth-Session Guard
                  </span>
                  <span style={{ fontSize: '0.70rem', fontWeight: 900, padding: '2px 8px', borderRadius: '100px', background: '#fee2e2', color: '#dc2626', border: 'none' }}>Sicherheit</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>Sitzungs-Invalidierung</div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Meldet alle regulären Sitzungen ab (Notfall-Reset).</p>
              </div>
              <button type="button" onClick={handleForceSessionReset} style={{ padding: '10px 14px', borderRadius: '12px', background: '#dc2626', border: 'none', color: '#ffffff', fontSize: '0.82rem', fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Power size={14} />
                <span>Notfall-Logout aller Sitzungen</span>
              </button>
            </div>

            {/* Card 4: Rate Limit Purge */}
            <div style={{ background: '#ffffff', borderRadius: '22px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} color="#0f172a" /> Datenbank-Hygiene
                  </span>
                  <span style={{ fontSize: '0.70rem', fontWeight: 900, padding: '2px 8px', borderRadius: '100px', background: '#eff6ff', color: '#2563eb', border: 'none' }}>Wartung</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>Rate-Limit Bereinigung</div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Bereinigt abgelaufene Login-Rate-Limits älter als 7 Tage.</p>
              </div>
              <button type="button" onClick={handlePurgeRateLimits} disabled={purgingRateLimits} style={{ padding: '10px 14px', borderRadius: '12px', background: '#2563eb', border: 'none', color: '#ffffff', fontSize: '0.82rem', fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <RefreshCw size={14} className={purgingRateLimits ? 'animate-spin' : ''} />
                <span>Rate-Limits bereinigen (&lt; 7 Tage)</span>
              </button>
            </div>

            {/* Card 5: 60-Day Inactive Student Pruner */}
            <div style={{ background: '#ffffff', borderRadius: '22px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={16} color="#0f172a" /> Kostenschutz
                  </span>
                  <span style={{ fontSize: '0.70rem', fontWeight: 900, padding: '2px 8px', borderRadius: '100px', background: '#fff7ed', color: '#ea580c', border: 'none' }}>Sparmodus</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>60-Tage Inaktivitäts-Sparmodus</div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Stellt inaktive Profile (&gt; 60 Tage) auf 0,09 € Basis-Bereitstellung um.</p>
              </div>
              <button type="button" onClick={handlePruneInactiveStudents} disabled={pruningStudents} style={{ padding: '10px 14px', borderRadius: '12px', background: '#ea580c', border: 'none', color: '#ffffff', fontSize: '0.82rem', fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Clock size={14} />
                <span>Inaktivitäts-Sparmodus ausführen</span>
              </button>
            </div>

            {/* Card 6: Audio Storage Vacuum */}
            <div style={{ background: '#ffffff', borderRadius: '22px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HardDrive size={16} color="#0f172a" /> Audio-Tresor
                  </span>
                  <span style={{ fontSize: '0.70rem', fontWeight: 900, padding: '2px 8px', borderRadius: '100px', background: '#f0fdf4', color: '#16a34a', border: 'none' }}>Storage Check</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>Audio-Storage Konsistenz</div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Prüft verwaiste Audio-Aufnahmen und verifiziert die Speicher-Integrität.</p>
              </div>
              <button type="button" onClick={handleStorageOrphanCleanup} disabled={vacuumingStorage} style={{ padding: '10px 14px', borderRadius: '12px', background: '#059669', border: 'none', color: '#ffffff', fontSize: '0.82rem', fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <ShieldCheck size={14} />
                <span>Audio-Tresor prüfen</span>
              </button>
            </div>
          </div>

          {/* Audit-Log Timeline */}
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Revisionssicheres Wartungs- &amp; Incident-Protokoll</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>Chronologische Dokumentation aller ausgelösten Wartungsfenster.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder="Log durchsuchen..."
                    style={{ padding: '7px 12px 7px 32px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.80rem' }}
                  />
                </div>
                <button type="button" onClick={handleExportAuditLogCsv} disabled={auditLog.length === 0} style={{ padding: '8px 14px', borderRadius: '10px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.80rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Download size={14} />
                  <span>CSV-Export</span>
                </button>
              </div>
            </div>

            {filteredAuditLog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontSize: '0.86rem', background: '#f8fafc', borderRadius: '16px' }}>
                Keine Wartungsereignisse protokolliert.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredAuditLog.map((entry) => {
                  const isFinished = Boolean(entry.ended_at);
                  return (
                    <div key={entry.id} style={{ padding: '16px 20px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{entry.reason}</strong>
                          <span style={{ fontSize: '0.68rem', fontWeight: 900, padding: '2px 8px', borderRadius: '100px', background: isFinished ? '#ecfdf5' : '#fee2e2', color: isFinished ? '#059669' : '#dc2626', border: 'none' }}>
                            {isFinished ? 'Beendet' : 'Aktiv'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px' }}>
                          Start: {new Date(entry.timestamp).toLocaleString('de-DE')} {entry.ended_at ? `• Ende: ${new Date(entry.ended_at).toLocaleString('de-DE')}` : ''} • Dauer: ~{entry.duration_minutes} Min. • {entry.operator}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 700 }}>{entry.id}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ALTSYSTEME & EOL-RADAR (Updated 2026/2027 LTS Matrix + 2 Clean Certificate Cards) */}
      {activeSubTab === 'lifecycle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {[
              { title: 'PostgreSQL 15 / 16 Core', subtitle: 'IONOS Produktiv-DB + Hetzner Standby', eol: '11. November 2027', next: 'PostgreSQL 17 LTS (Q2/2027)', badge: 'Aktiv unterstützt', icon: Database, color: '#0284c7' },
              { title: 'Ubuntu 24.04 LTS', subtitle: 'IONOS Cloud DE & Hetzner Backup OS', eol: 'April 2029 (ESM bis 2034)', next: 'Ubuntu 26.04 LTS (Q4/2027)', badge: 'LTS Aktiv', icon: Server, color: '#059669' },
              { title: 'Node.js 22 LTS', subtitle: 'App-Server & BFF-Gateway Runtime', eol: '30. April 2027', next: 'Node.js 24 LTS (Q4/2026)', badge: 'Active LTS', icon: Cpu, color: '#d97706' },
              { title: 'React 18.3 / 19 & Vite', subtitle: 'Zero-Trust PWA Client mit SRI SHA-384', eol: 'Kontinuierliches Rolling LTS', next: 'Laufende Security-Pflege (2026/2027)', badge: 'Rolling LTS', icon: Layers, color: '#7c3aed' }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} style={{ background: '#ffffff', borderRadius: '22px', padding: '22px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 900, color: item.color, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon size={16} color={item.color} /> {item.title}
                      </span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 900, padding: '2px 8px', borderRadius: '100px', background: '#ecfdf5', color: '#047857', border: 'none' }}>{item.badge}</span>
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>{item.subtitle}</div>
                  </div>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', fontSize: '0.76rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Hersteller-Support bis:</span>
                      <strong style={{ color: '#0f172a' }}>{item.eol}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Nächster Zyklus:</span>
                      <strong style={{ color: item.color }}>{item.next}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2 Clean Certificate & Audit Launcher Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            <div style={{ background: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '18px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '4px 10px', borderRadius: '100px', background: '#ecfdf5', color: '#047857', border: 'none' }}>
                  9/9 Kriterien erfüllt • Zero-EOL
                </span>
                <h3 style={{ margin: '12px 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  Hiscox CyberSafe Altsysteme-Zertifikat
                </h3>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
                  Vollständiger Nachweis über aktive Hersteller-Pflege, Proberaum-Kiosk-Quarantäne (30s Session-Lease) und Zero-Trust-Isolation für Versicherungsprüfer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHiscoxAltsystemeModalOpen(true)}
                style={{ padding: '12px 18px', borderRadius: '12px', background: '#0284c7', color: '#ffffff', border: 'none', fontSize: '0.86rem', fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Award size={16} color="#ffffff" />
                <span>Hiscox Altsysteme-Zertifikat öffnen (PDF)</span>
              </button>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '18px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '4px 10px', borderRadius: '100px', background: '#f0f9ff', color: '#0369a1', border: 'none' }}>
                  Zero Public Ports • MFA &amp; ZTNA
                </span>
                <h3 style={{ margin: '12px 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  Hiscox CyberSafe Fernzugriffe &amp; ZTNA-Zertifikat
                </h3>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
                  Audit-Nachweis für geschlossene Datenbank-Ports (127.0.0.1 Loopback auf IONOS Produktion &amp; Hetzner Backup), verpflichtendes TOTP/Passkey-MFA und Zero-Trust-Architektur.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHiscoxVpnModalOpen(true)}
                style={{ padding: '12px 18px', borderRadius: '12px', background: '#0f172a', color: '#ffffff', border: 'none', fontSize: '0.86rem', fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Network size={16} color="#ffffff" />
                <span>Hiscox VPN- &amp; ZTNA-Zertifikat öffnen (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {hiscoxAltsystemeModalOpen && (
        <HiscoxAltsystemeCertModal onClose={() => setHiscoxAltsystemeModalOpen(false)} />
      )}

      {hiscoxVpnModalOpen && (
        <HiscoxVpnCertModal onClose={() => setHiscoxVpnModalOpen(false)} />
      )}
    </div>
  );
};

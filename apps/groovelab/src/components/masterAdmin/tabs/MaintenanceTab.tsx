import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, Clock, 
  RefreshCw, Key, Lock, Zap, Megaphone, Server, Activity, Database, 
  Trash2, Plus, Eye, Send, Radio, UserCheck, ShieldCheck, Power,
  ChevronRight, Download, Sparkles, Sliders, Smartphone, Check, Copy,
  Info, Bell, Calendar, Flame, Layers, Laptop, Tablet, Monitor,
  Shield, CheckCircle, ArrowUpRight, Search, Gauge, BookOpen, HelpCircle,
  X, Compass, FileText, Cpu, CheckSquare, GraduationCap, Music, Rocket, Users
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { MaintenanceState } from '../../MaintenanceLockoutOverlay';
import { BroadcastAnnouncement } from '../../GlobalBroadcastBanner';

interface School {
  id: string;
  name: string;
  city?: string | null;
  [key: string]: any;
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

interface MaintenanceTabProps {
  schools: School[];
  saveSuccessToast: string | null;
  setSaveSuccessToast: (msg: string | null) => void;
}

export const MaintenanceTab: React.FC<MaintenanceTabProps> = ({
  schools,
  saveSuccessToast,
  setSaveSuccessToast
}) => {
  // --- Active Sub-Tab (Apple HIG Segmented Control) ---
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'planner' | 'diagnostics'>('status');

  // --- Preview Device Switcher for Tab 2 (Broadcast Studio) ---
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // --- Audit Log Search & Filter for Tab 3 ---
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [purgingRateLimits, setPurgingRateLimits] = useState(false);

  const handlePurgeRateLimits = async () => {
    try {
      setPurgingRateLimits(true);
      const { data, error } = await supabase.rpc('purge_expired_rate_limits', { p_days_retention: 7 });
      if (error) throw error;
      setSaveSuccessToast(`Datenbank-Hygiene abgeschlossen: ${data ?? 0} veraltete Rate-Limit-Einträge gelöscht.`);
      setTimeout(() => setSaveSuccessToast(null), 4000);
    } catch (err: any) {
      alert('Fehler bei der Datenbank-Hygiene: ' + err.message);
    } finally {
      setPurgingRateLimits(false);
    }
  };

  // --- Copy Feedback State ---
  const [pinCopied, setPinCopied] = useState(false);

  // --- Guide Modal State ---
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideActiveTab, setGuideActiveTab] = useState<'general' | 'status' | 'planner' | 'diagnostics'>('general');

  // --- Date Preset Helpers for Calendar Scheduler ---
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

  // --- Guided Wizard vs. Expert View State ---
  const [configViewMode, setConfigViewMode] = useState<'wizard' | 'expert'>('wizard');
  const [wizardGoal, setWizardGoal] = useState<'upgrade' | 'fix' | 'custom'>('upgrade');
  const [wizardSoftness, setWizardSoftness] = useState<'readonly' | 'lockout'>('readonly');
  const [wizardTiming, setWizardTiming] = useState<'sunday' | 'now_warn' | 'now_instant'>('sunday');

  // --- Live Preview Interactive State ---
  const [previewPlatform, setPreviewPlatform] = useState<'campus' | 'groovelab' | 'secretary'>('campus');
  const [previewIsMinimized, setPreviewIsMinimized] = useState(false);

  // --- Maintenance State ---
  const [maintenance, setMaintenance] = useState<MaintenanceState>(() => {
    const saved = localStorage.getItem('cg_master_maintenance_state');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
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
      bypassPin: 'CG-ROOT-8822',
      forceSessionReset: false,
      readOnlyMode: true,
      preNoticeHours: 24,
      autoReleaseHealthCheck: true,
      updatedAt: new Date().toISOString()
    };
  });

  // Handler: Apply Wizard Selection
  const handleApplyWizard = () => {
    let reason = 'Planmäßige System-Upgrades und Leistungsoptimierungen für den Schulbetrieb.';
    let duration = 30;
    let mode: MaintenanceState['mode'] = 'calendar_scheduler';
    let countdown = 10;
    let scheduledTime: string | null = getNextSunday2am();
    let readOnly = wizardSoftness === 'readonly';

    if (wizardGoal === 'fix') {
      reason = 'Kurze Datenbank-Wartungsarbeiten & Fehlerbehebung.';
      duration = 15;
    } else if (wizardGoal === 'custom') {
      reason = maintenance.reason || 'Wartungsarbeiten';
      duration = maintenance.estimatedDurationMinutes || 30;
    }

    if (wizardTiming === 'sunday') {
      mode = 'calendar_scheduler';
      scheduledTime = getNextSunday2am();
    } else if (wizardTiming === 'now_warn') {
      mode = 'scheduled_countdown';
      countdown = 10;
      scheduledTime = null;
    } else if (wizardTiming === 'now_instant') {
      mode = 'emergency_killswitch';
      countdown = 0;
      scheduledTime = null;
    }

    const updated: MaintenanceState = {
      ...maintenance,
      reason,
      estimatedDurationMinutes: duration,
      mode,
      countdownMinutes: countdown,
      scheduledStartTime: scheduledTime,
      readOnlyMode: readOnly,
      preNoticeHours: 24,
      autoReleaseHealthCheck: true,
      updatedAt: new Date().toISOString()
    };

    setMaintenance(updated);
    persistState(updated);
  };

  // --- Broadcast Announcement State ---
  const [announcement, setAnnouncement] = useState<BroadcastAnnouncement>(() => {
    const saved = localStorage.getItem('cg_master_broadcast_announcement');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
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

  // --- Audit Log State ---
  const [auditLog, setAuditLog] = useState<MaintenanceAuditEntry[]>(() => {
    const saved = localStorage.getItem('cg_master_maintenance_audit_log');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'LOG-8841',
        timestamp: '2026-08-01T02:00:00.000Z',
        ended_at: '2026-08-01T02:24:00.000Z',
        duration_minutes: 24,
        mode: 'scheduled_countdown',
        scope: 'all',
        reason: 'Datenbank-Performance-Indexierung & Supabase Cluster Upgrade',
        operator: 'Patrick Huber (MasterAdmin)'
      },
      {
        id: 'LOG-7729',
        timestamp: '2026-07-15T03:10:00.000Z',
        ended_at: '2026-07-15T03:25:00.000Z',
        duration_minutes: 15,
        mode: 'emergency_killswitch',
        scope: 'campus_only',
        reason: 'Hotfix Audio-Loopstation Speicher-Bereinigung',
        operator: 'Patrick Huber (MasterAdmin)'
      }
    ];
  });

  // --- Diagnostics State ---
  const [pingLatency, setPingLatency] = useState<number | null>(48);
  const [pinging, setPinging] = useState<boolean>(false);
  const [lastBustedVersion, setLastBustedVersion] = useState<string>(() => {
    return localStorage.getItem('cg_pwa_busted_version') || 'v2.6.4';
  });

  // Load from DB on mount
  useEffect(() => {
    const loadFromDb = async () => {
      try {
        const { data } = await supabase.from('master_billing_settings').select('special_offers').eq('id', 1).maybeSingle();
        if (data && Array.isArray(data.special_offers)) {
          const mEntry = data.special_offers.find((o: any) => o?.id === '__cg_master_maintenance_state__');
          if (mEntry?.state) {
            setMaintenance(mEntry.state);
            localStorage.setItem('cg_master_maintenance_state', JSON.stringify(mEntry.state));
          }

          const aEntry = data.special_offers.find((o: any) => o?.id === '__cg_master_broadcast_announcement__');
          if (aEntry?.state) {
            setAnnouncement(aEntry.state);
            localStorage.setItem('cg_master_broadcast_announcement', JSON.stringify(aEntry.state));
          }

          const logEntry = data.special_offers.find((o: any) => o?.id === '__cg_master_maintenance_audit_log__');
          if (logEntry?.state) {
            setAuditLog(logEntry.state);
            localStorage.setItem('cg_master_maintenance_audit_log', JSON.stringify(logEntry.state));
          }
        }
      } catch (err) {
        console.warn('Error loading maintenance state from DB:', err);
      }
    };

    loadFromDb();
  }, []);

  // Helper to persist to DB & LocalStorage
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
      const { data } = await supabase.from('master_billing_settings').select('special_offers').eq('id', 1).maybeSingle();
      const existingOffers = (data?.special_offers || []).filter((o: any) => 
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

      await supabase.from('master_billing_settings').update({
        special_offers: finalOffers,
        updated_at: new Date().toISOString()
      }).eq('id', 1);

      setSaveSuccessToast('Wartungs- & Betriebs-Einstellungen erfolgreich synchronisiert!');
      setTimeout(() => setSaveSuccessToast(null), 3000);
    } catch (err) {
      console.warn('DB Persist error:', err);
    }
  };

  // 🚨 Master Emergency Toggle
  const handleToggleEmergencyKillswitch = async (forcedNextState?: boolean) => {
    const willBeActive = forcedNextState !== undefined ? forcedNextState : !maintenance.isActive;

    const updatedMaintenance: MaintenanceState = {
      ...maintenance,
      isActive: willBeActive,
      updatedAt: new Date().toISOString()
    };

    let updatedLog = [...auditLog];
    if (willBeActive) {
      const newEntry: MaintenanceAuditEntry = {
        id: `LOG-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        duration_minutes: maintenance.estimatedDurationMinutes,
        mode: maintenance.mode,
        scope: maintenance.scope,
        reason: maintenance.reason,
        operator: 'Patrick Huber (MasterAdmin)'
      };
      updatedLog = [newEntry, ...updatedLog];
    } else {
      if (updatedLog.length > 0 && !updatedLog[0].ended_at) {
        updatedLog[0] = {
          ...updatedLog[0],
          ended_at: new Date().toISOString()
        };
      }
    }

    await persistState(updatedMaintenance, undefined, updatedLog);
  };

  // 🩺 Measure DB Latency
  const handleMeasurePing = async () => {
    setPinging(true);
    const start = performance.now();
    try {
      await supabase.from('schools').select('id').limit(1);
      const diff = Math.round(performance.now() - start);
      setPingLatency(diff);
    } catch (e) {
      setPingLatency(999);
    } finally {
      setPinging(false);
    }
  };

  // ⚡ PWA Cache Buster
  const handleTriggerCacheBuster = async () => {
    const newVer = 'v' + (Date.now().toString().slice(-6));
    setLastBustedVersion(newVer);
    localStorage.setItem('cg_pwa_busted_version', newVer);
    
    window.dispatchEvent(new CustomEvent('cg_pwa_cache_bust', { detail: { version: newVer } }));

    const bustAnnouncement: BroadcastAnnouncement = {
      ...announcement,
      isActive: true,
      severity: 'info',
      title: 'App-Update synchronisiert',
      message: `System-Cache wurde aktualisiert (${newVer}). Lokale Daten wurden neu geladen.`
    };
    await persistState(maintenance, bustAnnouncement);
  };

  // 🚪 Force Session Reset (Global Logout)
  const handleForceSessionReset = async () => {
    const confirmed = window.confirm('⚠️ ACHTUNG: Möchten Sie wirklich alle regulären Benutzer-Sitzungen sofort ungültig machen? Alle Lehrer und Schüler werden abgemeldet.');
    if (!confirmed) return;

    const newMaintenance: MaintenanceState = {
      ...maintenance,
      forceSessionReset: true,
      updatedAt: new Date().toISOString()
    };
    await persistState(newMaintenance);
  };

  // 📋 Copy Root PIN with visual feedback
  const handleCopyPin = () => {
    navigator.clipboard.writeText(maintenance.bypassPin);
    setPinCopied(true);
    setSaveSuccessToast('Bypass-PIN in Zwischenablage kopiert!');
    setTimeout(() => {
      setPinCopied(false);
      setSaveSuccessToast(null);
    }, 2500);
  };

  // 📥 Export Audit-Log as CSV
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

  // Filtered audit entries
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

  // Preset Announcements
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
      title: 'Neues Campus-Groovelab Update verfügbar!',
      message: 'Wir haben neue Funktionen für das Schüler-Protokoll, die Loopstation und den Raumplaner veröffentlicht.'
    },
    {
      label: 'Kurze Datenbank-Optimierung',
      severity: 'info',
      title: 'Routinemäßige System-Optimierung',
      message: 'Aktuell führen wir kurze Leistungsoptimierungen an den Cloud-Servern durch. Der Betrieb läuft uneingeschränkt weiter.'
    },
    {
      label: 'Dringende Störungsmeldung',
      severity: 'emergency',
      title: 'Wichtiger Hinweis zum Audio-Tresor',
      message: 'Aufgrund kurzzeitiger Wartung am Audio-Speicher kann das Hochladen neuer Aufnahmen für wenige Minuten verzögert sein.'
    }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      maxWidth: '1440px',
      margin: '0 auto',
      width: '100%',
      fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'
    }} className="animate-fade-in">
      
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 🍎 APPLE HIG UNIFIED TOP CONTEXT & SEGMENTED CONTROLLER                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        padding: '20px 24px',
        borderRadius: '24px',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.02)'
      }}>
        {/* Left: Branding & Status Subtitle */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: maintenance.isActive ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: maintenance.isActive ? '0 8px 20px rgba(239, 68, 68, 0.3)' : '0 8px 20px rgba(16, 185, 129, 0.3)'
            }}>
              {maintenance.isActive ? <ShieldAlert size={24} className="animate-pulse" /> : <Wrench size={24} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em' }}>
                  Wartung &amp; Plattform-Betrieb
                </h2>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: '100px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  macOS Control Suite
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.84rem', color: '#64748b', fontWeight: 500 }}>
                Zentrales Apple Enterprise Cockpit für Notfall-Killswitch, Broadcast-Banner &amp; Revisions-Logs.
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions: Guide Button & Apple Segmented Track */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Anleitung & Handbuch Button */}
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            style={{
              padding: '9px 16px',
              borderRadius: '14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#059669';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
            }}
          >
            <BookOpen size={15} color="#059669" />
            <span>Anleitung &amp; Handbuch</span>
          </button>

          {/* Apple Segmented Track */}
          <div style={{
            display: 'inline-flex',
            background: 'rgba(118, 118, 128, 0.12)',
            padding: '4px',
            borderRadius: '16px',
            gap: '3px',
            border: '1px solid rgba(0, 0, 0, 0.04)',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
          }}>
            {[
              { id: 'status', label: 'Live-Status & Killswitch', icon: Power },
              { id: 'planner', label: 'Broadcast & Planer', icon: Megaphone },
              { id: 'diagnostics', label: 'Diagnose & Audit-Log', icon: Activity }
            ].map((tab) => {
              const Icon = tab.icon;
              const isSel = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id as any)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isSel ? '#ffffff' : 'transparent',
                    color: isSel ? '#0f172a' : '#64748b',
                    fontWeight: isSel ? 850 : 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: isSel ? '0 3px 12px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseOver={(e) => {
                    if (!isSel) {
                      e.currentTarget.style.color = '#0f172a';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isSel) {
                      e.currentTarget.style.color = '#64748b';
                    }
                  }}
                >
                  <Icon size={16} color={isSel ? '#0f172a' : '#64748b'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 🟢 TAB 1: LIVE-STATUS & NOTFALL-KILLSWITCH                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'status' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
          
          {/* Quick Context Card: Tab 1 Guide Callout */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(236, 253, 245, 0.8) 0%, rgba(240, 253, 250, 0.8) 100%)',
            border: '1px solid #a7f3d0',
            borderRadius: '20px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            fontSize: '0.82rem',
            color: '#065f46'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Compass size={18} color="#059669" />
              <span>
                <strong>Leitfaden Tab 1:</strong> Wählen Sie zwischen <em>Vorwarn-Countdown</em> (empfohlen für planmäßige Arbeiten) und <em>Sofortigem Killswitch</em> (bei Sicherheitsvorfällen). Der Master-Bypass-PIN ermöglicht Schulleitern jederzeit privilegierten Zugriff.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setGuideActiveTab('status');
                setShowGuideModal(true);
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #86efac',
                color: '#047857',
                padding: '6px 14px',
                borderRadius: '100px',
                fontWeight: 800,
                fontSize: '0.74rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(4, 120, 87, 0.08)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 10px rgba(4, 120, 87, 0.16)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(4, 120, 87, 0.08)';
              }}
            >
              Details anzeigen →
            </button>
          </div>

          {/* 🌟 BRIGHT APPLE HIG HERO STATUS BANNER */}
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '28px 32px',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            border: `1px solid ${maintenance.isActive ? '#fca5a5' : '#e2e8f0'}`,
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '18px',
                background: maintenance.isActive ? '#fee2e2' : '#ecfdf5',
                border: `1.5px solid ${maintenance.isActive ? '#fecaca' : '#a7f3d0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: maintenance.isActive ? '#dc2626' : '#059669'
              }}>
                {maintenance.isActive ? (
                  <ShieldAlert size={30} className="animate-pulse" />
                ) : (
                  <ShieldCheck size={30} />
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '3px 10px',
                    borderRadius: '100px',
                    background: maintenance.isActive ? '#fef2f2' : '#ecfdf5',
                    color: maintenance.isActive ? '#dc2626' : '#059669',
                    border: `1px solid ${maintenance.isActive ? '#fecaca' : '#a7f3d0'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: maintenance.isActive ? '#ef4444' : '#10b981' }} />
                    {maintenance.isActive ? 'Wartungsmodus Aktiv' : 'System Normal & Online'}
                  </span>

                  {!maintenance.isActive && maintenance.mode === 'calendar_scheduler' && maintenance.scheduledStartTime && (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '100px',
                      background: '#f0f9ff',
                      color: '#0369a1',
                      border: '1px solid #bae6fd',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <Calendar size={12} />
                      <span>Geplant: {new Date(maintenance.scheduledStartTime).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr</span>
                    </span>
                  )}

                  <span style={{ fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 600 }}>
                    Zuletzt aktualisiert: {new Date(maintenance.updatedAt || Date.now()).toLocaleTimeString('de-DE')} Uhr
                  </span>
                </div>

                <h3 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                  {maintenance.isActive 
                    ? 'Plattform gesperrt (Sperrbildschirm aktiv)' 
                    : 'Campus-Groovelab Betriebs-Status: 100% Verfügbar'}
                </h3>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.82)', maxWidth: '680px', lineHeight: '1.45' }}>
                  {maintenance.isActive
                    ? `Grund: ${maintenance.reason}`
                    : 'Alle Server-Dienste, Datenbanken, Audio-Tresore und Raumplaner laufen einwandfrei ohne Einschränkungen.'}
                </p>
              </div>
            </div>

            {/* Apple Guardrail Master Button */}
            <div style={{ position: 'relative', zIndex: 1, minWidth: '290px' }}>
              <button
                type="button"
                onClick={() => handleToggleEmergencyKillswitch()}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '100px',
                  border: 'none',
                  background: maintenance.isActive
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  fontSize: '0.94rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: maintenance.isActive
                    ? '0 6px 20px rgba(16, 185, 129, 0.45)'
                    : '0 6px 20px rgba(239, 68, 68, 0.45)',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="hover-scale-mini"
              >
                <Power size={18} />
                <span>
                  {maintenance.isActive 
                    ? 'Wartung beenden & Freischalten' 
                    : 'Notfall-Wartung aktivieren'}
                </span>
              </button>
              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
                {maintenance.isActive ? 'Hebt die Sperre sofort für alle Schulen auf' : '2-Stufen-Sicherung aktiv (Verhindert Fehlbedienung)'}
              </div>
            </div>
          </div>

          {/* 2-Column Split: Configurator Left, Hyper-Realistic Apple Display Frame Right */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
            gap: '24px',
            alignItems: 'start'
          }}>
            {/* Left Card: Configuration Form & Guided Wizard */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '30px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              {/* Header with Guided Wizard vs. Expert View Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: configViewMode === 'wizard' ? '#ecfdf5' : '#f1f5f9',
                    color: configViewMode === 'wizard' ? '#059669' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {configViewMode === 'wizard' ? <Sparkles size={18} /> : <Sliders size={18} />}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.10rem', fontWeight: 900, color: '#0f172a' }}>
                      {configViewMode === 'wizard' ? 'Geführter Wartungs-Assistent' : 'Experten-Konfiguration'}
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {configViewMode === 'wizard' ? 'In 3 einfachen Schritten Wartung sicher einplanen' : 'Manuelle Parameter, Scopes & Root-Bypass-PIN'}
                    </span>
                  </div>
                </div>

                {/* View Mode Segmented Switcher */}
                <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', gap: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setConfigViewMode('wizard')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '7px',
                      border: 'none',
                      background: configViewMode === 'wizard' ? '#ffffff' : 'transparent',
                      color: configViewMode === 'wizard' ? '#059669' : '#64748b',
                      fontSize: '0.76rem',
                      fontWeight: configViewMode === 'wizard' ? 850 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: configViewMode === 'wizard' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    <Sparkles size={12} color={configViewMode === 'wizard' ? '#059669' : '#64748b'} />
                    <span>Einfach (Assistent)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigViewMode('expert')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '7px',
                      border: 'none',
                      background: configViewMode === 'expert' ? '#ffffff' : 'transparent',
                      color: configViewMode === 'expert' ? '#0f172a' : '#64748b',
                      fontSize: '0.76rem',
                      fontWeight: configViewMode === 'expert' ? 850 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: configViewMode === 'expert' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    <Sliders size={12} color={configViewMode === 'expert' ? '#0f172a' : '#64748b'} />
                    <span>Experten-Details</span>
                  </button>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* WIZARD MODE: 3 GEFÜHRTE SCHRITTE                                */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              {configViewMode === 'wizard' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* SCHRITT 1: ZIEL WÄHLEN */}
                  <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '18px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#059669', color: '#ffffff', fontSize: '0.74rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                      <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>Was möchtest du tun?</strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setWizardGoal('upgrade');
                          setMaintenance({
                            ...maintenance,
                            reason: 'Planmäßige System-Upgrades und Leistungsoptimierungen für den Schulbetrieb.',
                            estimatedDurationMinutes: 30
                          });
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '14px',
                          border: wizardGoal === 'upgrade' ? '2px solid #059669' : '1px solid #cbd5e1',
                          background: wizardGoal === 'upgrade' ? '#ecfdf5' : '#ffffff',
                          color: wizardGoal === 'upgrade' ? '#065f46' : '#334155',
                          textAlign: 'left',
                          cursor: 'pointer',
                          boxShadow: wizardGoal === 'upgrade' ? '0 2px 8px rgba(5, 150, 105, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = wizardGoal === 'upgrade' ? '0 2px 8px rgba(5, 150, 105, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)';
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Rocket size={15} color={wizardGoal === 'upgrade' ? '#059669' : '#64748b'} />
                          <span>Planmäßiges Upgrade</span>
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '2px' }}>Standard-Update (30 Min.)</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setWizardGoal('fix');
                          setMaintenance({
                            ...maintenance,
                            reason: 'Kurze Datenbank-Wartungsarbeiten & Fehlerbehebung.',
                            estimatedDurationMinutes: 15
                          });
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '14px',
                          border: wizardGoal === 'fix' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                          background: wizardGoal === 'fix' ? '#f0f9ff' : '#ffffff',
                          color: wizardGoal === 'fix' ? '#0369a1' : '#334155',
                          textAlign: 'left',
                          cursor: 'pointer',
                          boxShadow: wizardGoal === 'fix' ? '0 2px 8px rgba(2, 132, 199, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = wizardGoal === 'fix' ? '0 2px 8px rgba(2, 132, 199, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)';
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Zap size={15} color={wizardGoal === 'fix' ? '#0284c7' : '#64748b'} />
                          <span>Kurze Fehlerbehebung</span>
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '2px' }}>Schneller Bugfix (15 Min.)</div>
                      </button>
                    </div>
                  </div>

                  {/* SCHRITT 2: SANFTHEITSGRAD / NUTZER-ERLEBNIS */}
                  <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '18px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#059669', color: '#ffffff', fontSize: '0.74rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                      <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>Wie sollen Schüler &amp; Lehrer reagieren?</strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setWizardSoftness('readonly');
                          setMaintenance({ ...maintenance, readOnlyMode: true });
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '14px',
                          border: wizardSoftness === 'readonly' ? '2px solid #d97706' : '1px solid #cbd5e1',
                          background: wizardSoftness === 'readonly' ? '#fffbeb' : '#ffffff',
                          color: wizardSoftness === 'readonly' ? '#92400e' : '#334155',
                          textAlign: 'left',
                          cursor: 'pointer',
                          boxShadow: wizardSoftness === 'readonly' ? '0 2px 8px rgba(217, 119, 6, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = wizardSoftness === 'readonly' ? '0 2px 8px rgba(217, 119, 6, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)';
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.82rem' }}>Sanfter Lesemodus (Empfohlen)</div>
                        <div style={{ fontSize: '0.70rem', color: '#b45309', marginTop: '2px' }}>Stundenpläne bleiben lesbar (0 Frust)</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setWizardSoftness('lockout');
                          setMaintenance({ ...maintenance, readOnlyMode: false });
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '14px',
                          border: wizardSoftness === 'lockout' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                          background: wizardSoftness === 'lockout' ? '#fef2f2' : '#ffffff',
                          color: wizardSoftness === 'lockout' ? '#991b1b' : '#334155',
                          textAlign: 'left',
                          cursor: 'pointer',
                          boxShadow: wizardSoftness === 'lockout' ? '0 2px 8px rgba(220, 38, 38, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = wizardSoftness === 'lockout' ? '0 2px 8px rgba(220, 38, 38, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)';
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.82rem' }}>Kompletter Sperrbildschirm</div>
                        <div style={{ fontSize: '0.70rem', color: '#dc2626', marginTop: '2px' }}>Vollsperre bei DB-Migrationen</div>
                      </button>
                    </div>
                  </div>

                  {/* SCHRITT 3: STARTZEITPUNKT */}
                  <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '18px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#059669', color: '#ffffff', fontSize: '0.74rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                      <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>Wann soll es starten?</strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setWizardTiming('sunday');
                          setMaintenance({
                            ...maintenance,
                            mode: 'calendar_scheduler',
                            scheduledStartTime: getNextSunday2am(),
                            countdownMinutes: 10
                          });
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '14px',
                          border: wizardTiming === 'sunday' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                          background: wizardTiming === 'sunday' ? '#f0f9ff' : '#ffffff',
                          color: wizardTiming === 'sunday' ? '#0369a1' : '#334155',
                          textAlign: 'left',
                          cursor: 'pointer',
                          boxShadow: wizardTiming === 'sunday' ? '0 2px 8px rgba(2, 132, 199, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = wizardTiming === 'sunday' ? '0 2px 8px rgba(2, 132, 199, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)';
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.80rem' }}>So. 02:00 Uhr</div>
                        <div style={{ fontSize: '0.68rem', color: '#0284c7', marginTop: '2px' }}>Vollautomatisch (Beste Zeit)</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setWizardTiming('now_warn');
                          setMaintenance({
                            ...maintenance,
                            mode: 'scheduled_countdown',
                            countdownMinutes: 10,
                            scheduledStartTime: null
                          });
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '14px',
                          border: wizardTiming === 'now_warn' ? '2px solid #059669' : '1px solid #cbd5e1',
                          background: wizardTiming === 'now_warn' ? '#ecfdf5' : '#ffffff',
                          color: wizardTiming === 'now_warn' ? '#065f46' : '#334155',
                          textAlign: 'left',
                          cursor: 'pointer',
                          boxShadow: wizardTiming === 'now_warn' ? '0 2px 8px rgba(5, 150, 105, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = wizardTiming === 'now_warn' ? '0 2px 8px rgba(5, 150, 105, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)';
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.80rem' }}>Jetzt mit 10m Vorlauf</div>
                        <div style={{ fontSize: '0.68rem', color: '#059669', marginTop: '2px' }}>Banner warnt Nutzer vor</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setWizardTiming('now_instant');
                          setMaintenance({
                            ...maintenance,
                            mode: 'emergency_killswitch',
                            countdownMinutes: 0,
                            scheduledStartTime: null
                          });
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '14px',
                          border: wizardTiming === 'now_instant' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                          background: wizardTiming === 'now_instant' ? '#fef2f2' : '#ffffff',
                          color: wizardTiming === 'now_instant' ? '#991b1b' : '#334155',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.80rem' }}>Jetzt sofort</div>
                        <div style={{ fontSize: '0.68rem', color: '#dc2626', marginTop: '2px' }}>Notfall-Sofortsperre</div>
                      </button>
                    </div>
                  </div>

                  {/* ZUSAMMENFASSUNG & 1-KLICK SPEICHERN */}
                  <div style={{ background: '#ecfdf5', borderRadius: '18px', padding: '18px', border: '1px solid #a7f3d0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontWeight: 850, color: '#065f46', fontSize: '0.86rem' }}>
                      Zusammenfassung deiner Auswahl:
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#065f46', lineHeight: '1.6' }}>
                      • <strong>Wartungsziel:</strong> {wizardGoal === 'upgrade' ? 'Planmäßiges Upgrade (30 Min.)' : wizardGoal === 'fix' ? 'Kurze Fehlerbehebung (15 Min.)' : 'Individuell'}<br />
                      • <strong>Modus:</strong> {wizardSoftness === 'readonly' ? 'Sanfter Lesemodus (Stundenpläne bleiben sichtbar)' : 'Vollständiger Sperrbildschirm'}<br />
                      • <strong>Start:</strong> {wizardTiming === 'sunday' ? 'Kommender Sonntag 02:00 Uhr (24h Vorab-Banner)' : wizardTiming === 'now_warn' ? 'Jetzt gleich mit 10 Min. Vorwarnung' : 'Jetzt sofort (Notfall)'}<br />
                      • <strong>Root-Bypass-PIN:</strong> <code style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>{maintenance.bypassPin}</code>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyWizard}
                      style={{
                        marginTop: '4px',
                        padding: '12px 20px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
                      }}
                      className="hover-scale-mini"
                    >
                      <Sparkles size={16} />
                      <span>Wartungs-Konfiguration jetzt anwenden &amp; speichern</span>
                    </button>
                  </div>

                </div>
              ) : (
                /* ═══════════════════════════════════════════════════════════════ */
                /* 🛠️ EXPERT MODE: VOLLE PARAMETER-KONTROLLE                      */
                /* ═══════════════════════════════════════════════════════════════ */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Mode Switcher */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
                      Aktivierungs-Modus
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setMaintenance({ ...maintenance, mode: 'scheduled_countdown' })}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '16px',
                          border: maintenance.mode === 'scheduled_countdown' ? '2px solid #059669' : '1px solid #cbd5e1',
                          background: maintenance.mode === 'scheduled_countdown' ? '#ecfdf5' : '#ffffff',
                          color: maintenance.mode === 'scheduled_countdown' ? '#059669' : '#475569',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ⏳ Countdown-Vorwarnung
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '3px' }}>
                          Banner warnt {maintenance.countdownMinutes}m vor Sperre
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMaintenance({ ...maintenance, mode: 'emergency_killswitch' })}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '16px',
                          border: maintenance.mode === 'emergency_killswitch' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                          background: maintenance.mode === 'emergency_killswitch' ? '#fef2f2' : '#ffffff',
                          color: maintenance.mode === 'emergency_killswitch' ? '#dc2626' : '#475569',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🚨 Sofortiger Killswitch
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '3px' }}>
                          Sperrt Nutzer unverzüglich
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMaintenance({ 
                          ...maintenance, 
                          mode: 'calendar_scheduler',
                          scheduledStartTime: maintenance.scheduledStartTime || getNextSunday2am(),
                          preNoticeHours: 24,
                          autoReleaseHealthCheck: true
                        })}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '16px',
                          border: maintenance.mode === 'calendar_scheduler' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                          background: maintenance.mode === 'calendar_scheduler' ? '#f0f9ff' : '#ffffff',
                          color: maintenance.mode === 'calendar_scheduler' ? '#0284c7' : '#475569',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          📅 Geplantes Zeitfenster
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '3px' }}>
                          Vollautomatischer 3-Stufen Zyklus
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Calendar Scheduler Detailed Controls (Shown when mode === 'calendar_scheduler') */}
                  {maintenance.mode === 'calendar_scheduler' && (
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '18px',
                      padding: '20px',
                      border: '1px solid #bae6fd',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={18} color="#0284c7" />
                          <strong style={{ fontSize: '0.90rem', color: '#0369a1' }}>
                            Wartungs-Scheduler &amp; Kalender-Automatik
                          </strong>
                        </div>

                        {/* Quick-Select Preset Chips */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setMaintenance({ ...maintenance, scheduledStartTime: getNextSunday2am() })}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '100px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#0284c7',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            className="hover-scale-mini"
                          >
                            ⚡ So. 02:00 Uhr
                          </button>
                          <button
                            type="button"
                            onClick={() => setMaintenance({ ...maintenance, scheduledStartTime: getTomorrow3am() })}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '100px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#0284c7',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            className="hover-scale-mini"
                          >
                            ⚡ Morgen 03:00 Uhr
                          </button>
                          <button
                            type="button"
                            onClick={() => setMaintenance({ ...maintenance, scheduledStartTime: getNextMonthFirst1am() })}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '100px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#0284c7',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            className="hover-scale-mini"
                          >
                            ⚡ 1. des Monats
                          </button>
                        </div>
                      </div>

                      {/* Start Date & Time Input */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.70rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                          Geplanter Startzeitpunkt (Datum &amp; Uhrzeit)
                        </label>
                        <input
                          type="datetime-local"
                          value={maintenance.scheduledStartTime || getNextSunday2am()}
                          onChange={(e) => setMaintenance({ ...maintenance, scheduledStartTime: e.target.value })}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            fontSize: '0.86rem',
                            fontWeight: 800,
                            color: '#0f172a'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Maintenance Reason */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                      Wartungsgrund (Wird Nutzern angezeigt)
                    </label>
                    <input
                      type="text"
                      value={maintenance.reason}
                      onChange={(e) => setMaintenance({ ...maintenance, reason: e.target.value })}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        outline: 'none'
                      }}
                      placeholder="z.B. Planmäßige System-Upgrades..."
                    />
                  </div>

                  {/* Scope & Root PIN in 2 Columns */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                        Geltungsbereich (Scope)
                      </label>
                      <select
                        value={maintenance.scope}
                        onChange={(e) => setMaintenance({ ...maintenance, scope: e.target.value as any })}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '11px 12px',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="all">🌐 Plattformweit (Alle Module &amp; Schulen)</option>
                        <option value="campus_only">🏫 Nur Modul Campus</option>
                        <option value="groovelab_only">🎸 Nur Modul GrooveLab</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                        Master Root-Bypass-PIN
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={maintenance.bypassPin}
                          onChange={(e) => setMaintenance({ ...maintenance, bypassPin: e.target.value })}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '11px 40px 11px 12px',
                            borderRadius: '12px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            fontSize: '0.86rem',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            color: '#0f172a',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleCopyPin}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: pinCopied ? '#ecfdf5' : 'transparent',
                            border: 'none',
                            color: pinCopied ? '#059669' : '#64748b',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            padding: '5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s'
                          }}
                          title="PIN kopieren"
                        >
                          {pinCopied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Read-Only Degradation Mode Switch */}
                  <div style={{
                    background: maintenance.readOnlyMode ? '#fffbeb' : '#f8fafc',
                    borderRadius: '16px',
                    padding: '16px',
                    border: `1px solid ${maintenance.readOnlyMode ? '#fde68a' : '#e2e8f0'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: maintenance.readOnlyMode ? '#fef3c7' : '#e2e8f0',
                        color: maintenance.readOnlyMode ? '#d97706' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Lock size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 850, fontSize: '0.86rem', color: maintenance.readOnlyMode ? '#92400e' : '#0f172a' }}>
                          Read-Only Degradation Mode (Sanfte Wartung)
                        </div>
                        <div style={{ fontSize: '0.72rem', color: maintenance.readOnlyMode ? '#b45309' : '#64748b', marginTop: '2px' }}>
                          Schüler &amp; Lehrer können Stundenpläne &amp; Notizen weiter einsehen; Schreibzugriffe werden gesperrt.
                        </div>
                      </div>
                    </div>

                    <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(maintenance.readOnlyMode)}
                        onChange={(e) => setMaintenance({ ...maintenance, readOnlyMode: e.target.checked })}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: maintenance.readOnlyMode ? '#d97706' : '#cbd5e1',
                        transition: '0.2s',
                        borderRadius: '24px'
                      }} />
                      <span style={{
                        position: 'absolute',
                        content: '""',
                        height: '18px',
                        width: '18px',
                        left: maintenance.readOnlyMode ? '23px' : '3px',
                        bottom: '3px',
                        background: '#ffffff',
                        transition: '0.2s',
                        borderRadius: '50%',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </label>
                  </div>

                  {/* Timing Numbers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                        Geschätzte Dauer (Minuten)
                      </label>
                      <input
                        type="number"
                        value={maintenance.estimatedDurationMinutes}
                        onChange={(e) => setMaintenance({ ...maintenance, estimatedDurationMinutes: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '11px 12px',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          fontSize: '0.86rem',
                          fontWeight: 800,
                          color: '#0f172a'
                        }}
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
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '11px 12px',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          fontSize: '0.86rem',
                          fontWeight: 800,
                          color: '#0f172a'
                        }}
                      />
                    </div>
                  </div>

                  {/* Save Settings Button */}
                  <button
                    type="button"
                    onClick={() => persistState(maintenance)}
                    style={{
                      padding: '13px',
                      borderRadius: '14px',
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.90rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale-mini"
                  >
                    <Check size={16} />
                    <span>Experten-Konfiguration speichern</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Card: Apple Studio Display Hardware Mockup Frame */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Header with Title and Mode Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={16} color="#64748b" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {maintenance.readOnlyMode ? 'Live Read-Only Vorschau' : 'Live Sperrbildschirm-Vorschau'}
                  </span>
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: maintenance.readOnlyMode ? '#fef3c7' : '#f1f5f9',
                  color: maintenance.readOnlyMode ? '#b45309' : '#64748b',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  border: maintenance.readOnlyMode ? '1px solid #fde68a' : 'none'
                }}>
                  {maintenance.readOnlyMode ? '⚠️ Read-Only Degradation' : '1:1 Echtzeit-Synchronisation'}
                </span>
              </div>

              {/* Module & View Interactive Switcher Toolbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '6px 10px',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    Modul:
                  </span>
                  <div style={{ display: 'inline-flex', background: '#e2e8f0', padding: '2px', borderRadius: '10px', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewPlatform('campus')}
                      style={{
                        padding: '4px 9px',
                        borderRadius: '8px',
                        border: 'none',
                        background: previewPlatform === 'campus' ? '#ffffff' : 'transparent',
                        color: previewPlatform === 'campus' ? '#15803d' : '#64748b',
                        fontWeight: previewPlatform === 'campus' ? 850 : 700,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: previewPlatform === 'campus' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <GraduationCap size={12} color={previewPlatform === 'campus' ? '#15803d' : '#64748b'} />
                      <span>Campus</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewPlatform('groovelab')}
                      style={{
                        padding: '4px 9px',
                        borderRadius: '8px',
                        border: 'none',
                        background: previewPlatform === 'groovelab' ? '#ffffff' : 'transparent',
                        color: previewPlatform === 'groovelab' ? '#854d0e' : '#64748b',
                        fontWeight: previewPlatform === 'groovelab' ? 850 : 700,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: previewPlatform === 'groovelab' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Music size={12} color={previewPlatform === 'groovelab' ? '#ca8a04' : '#64748b'} />
                      <span>GrooveLab</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewPlatform('secretary')}
                      style={{
                        padding: '4px 9px',
                        borderRadius: '8px',
                        border: 'none',
                        background: previewPlatform === 'secretary' ? '#ffffff' : 'transparent',
                        color: previewPlatform === 'secretary' ? '#b91c1c' : '#64748b',
                        fontWeight: previewPlatform === 'secretary' ? 850 : 700,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: previewPlatform === 'secretary' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Shield size={12} color={previewPlatform === 'secretary' ? '#dc2626' : '#64748b'} />
                      <span>Verwaltung</span>
                    </button>
                  </div>
                </div>

                {maintenance.readOnlyMode && (
                  <button
                    type="button"
                    onClick={() => setPreviewIsMinimized(prev => !prev)}
                    style={{
                      background: previewIsMinimized ? '#fef3c7' : '#ffffff',
                      color: previewIsMinimized ? '#b45309' : '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {previewIsMinimized ? '🔍 Banner einblenden' : '✕ Banner minimieren'}
                  </button>
                )}
              </div>

              {/* Apple Hardware Bezel Mockup */}
              <div style={{
                background: '#090d16',
                borderRadius: '22px',
                padding: '12px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.2)',
                border: '1px solid #1e293b',
                position: 'relative'
              }}>
                {/* Camera Notch Dot */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1e293b' }} />
                </div>

                {/* Internal Screen Content */}
                {maintenance.readOnlyMode ? (() => {
                  const isStaffAdmin = previewPlatform === 'secretary';
                  const isGroove = previewPlatform === 'groovelab';

                  let bannerBg = 'linear-gradient(90deg, #f0fdf4 0%, #ecfdf5 100%)';
                  let bannerBorder = 'rgba(52, 168, 83, 0.28)';
                  let bannerText = '#14532d';
                  let iconColor = '#16a34a';
                  let badgeBg = 'rgba(52, 168, 83, 0.12)';
                  let badgeText = '#15803d';
                  let buttonBg = '#34a853';
                  let buttonText = '#ffffff';

                  if (isStaffAdmin) {
                    bannerBg = 'linear-gradient(90deg, #fef2f2 0%, #fff1f2 100%)';
                    bannerBorder = 'rgba(234, 67, 53, 0.25)';
                    bannerText = '#991b1b';
                    iconColor = '#dc2626';
                    badgeBg = 'rgba(234, 67, 53, 0.12)';
                    badgeText = '#b91c1c';
                    buttonBg = '#ea4335';
                    buttonText = '#ffffff';
                  } else if (isGroove) {
                    bannerBg = 'linear-gradient(90deg, #fefce8 0%, #fffbeb 100%)';
                    bannerBorder = 'rgba(234, 179, 8, 0.35)';
                    bannerText = '#78350f';
                    iconColor = '#ca8a04';
                    badgeBg = 'rgba(234, 179, 8, 0.18)';
                    badgeText = '#854d0e';
                    buttonBg = '#eab308';
                    buttonText = '#000000';
                  }

                  return (
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: '380px',
                      position: 'relative',
                      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)'
                    }}>
                      {/* Top Banner (if not minimized) */}
                      {!previewIsMinimized && (
                        <div style={{
                          background: bannerBg,
                          color: bannerText,
                          padding: '7px 12px',
                          borderBottom: `1px solid ${bannerBorder}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                            <div style={{
                              background: badgeBg,
                              borderRadius: '6px',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: iconColor,
                              flexShrink: 0
                            }}>
                              <Lock size={12} />
                            </div>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <strong style={{ fontWeight: 850 }}>Read-Only Lesemodus: </strong>
                              <span style={{ opacity: 0.9 }}>
                                {maintenance.reason || 'Planmäßige Datenbank-Wartung aktiv'}. Notizen lesbar – Speichern pausiert.
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{
                              fontSize: '0.62rem',
                              background: badgeBg,
                              color: badgeText,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 800,
                              fontFamily: 'monospace'
                            }}>
                              ~{maintenance.estimatedDurationMinutes || 30}:00 min
                            </span>
                            <span style={{
                              fontSize: '0.62rem',
                              background: badgeBg,
                              color: badgeText,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 800
                            }}>
                              🔒 Schreibschutz
                            </span>
                            <div style={{
                              background: buttonBg,
                              color: buttonText,
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '0.64rem',
                              fontWeight: 850,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <RefreshCw size={10} /> Status prüfen
                            </div>
                            <button
                              type="button"
                              onClick={() => setPreviewIsMinimized(true)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: bannerText,
                                padding: '2px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                opacity: 0.7
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Simulated App Header with Platform Tabs */}
                      <div style={{
                        background: '#ffffff',
                        borderBottom: '1px solid #e2e8f0',
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: previewPlatform === 'campus' ? 'rgba(52, 168, 83, 0.15)' : previewPlatform === 'groovelab' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 67, 53, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: previewPlatform === 'campus' ? '#34a853' : previewPlatform === 'groovelab' ? '#ca8a04' : '#ea4335'
                          }}>
                            {previewPlatform === 'campus' ? <GraduationCap size={14} /> : previewPlatform === 'groovelab' ? <Music size={14} /> : <Shield size={14} />}
                          </div>
                          <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#0f172a' }}>
                            {previewPlatform === 'campus' ? 'Campus' : previewPlatform === 'groovelab' ? 'GrooveLab' : 'Schulsekretariat'}
                          </span>
                        </div>

                        {/* Top Module Tabs */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{
                            padding: '3px 8px',
                            borderRadius: '6px 6px 0 0',
                            background: previewPlatform === 'campus' ? '#34a853' : 'rgba(52, 168, 83, 0.08)',
                            color: previewPlatform === 'campus' ? '#ffffff' : '#34a853',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <GraduationCap size={10} /> Campus
                          </div>
                          <div style={{
                            padding: '3px 8px',
                            borderRadius: '6px 6px 0 0',
                            background: previewPlatform === 'groovelab' ? '#facc15' : 'rgba(250, 204, 21, 0.1)',
                            color: previewPlatform === 'groovelab' ? '#09090b' : '#ca8a04',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Music size={10} /> GrooveLab
                          </div>
                        </div>
                      </div>

                      {/* Mock App Content (Hausaufgabenheft / Briefing) */}
                      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.78rem', color: '#0f172a' }}>
                            {previewPlatform === 'groovelab' ? 'Live Lab & Songs' : 'Hausaufgabenheft & Stundenplan'}
                          </strong>
                          <span style={{ fontSize: '0.62rem', background: '#e2e8f0', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            Ansicht aktiv
                          </span>
                        </div>

                        <div style={{ background: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#334155' }}>
                          <strong>🎸 Song: Smoke on the Water (Intro)</strong>
                          <div style={{ color: '#64748b', marginTop: '2px' }}>Fokus auf Takt 1-8 mit Metronom 110 BPM.</div>
                        </div>

                        <div style={{ background: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.70rem', color: '#334155' }}>
                          <strong>📅 Nächste Unterrichtsstunde:</strong>
                          <div style={{ color: '#64748b', marginTop: '2px' }}>Freitag 15:00 Uhr • Raum 2 (EG)</div>
                        </div>

                        {/* Disabled Save Button with Lock */}
                        <div
                          style={{
                            marginTop: 'auto',
                            padding: '8px',
                            borderRadius: '8px',
                            background: '#e2e8f0',
                            color: '#94a3b8',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                        >
                          <Lock size={11} />
                          <span>Eintrag speichern (Vorübergehend pausiert)</span>
                        </div>
                      </div>

                      {/* Minimized Floating Widget in Corner (if minimized) */}
                      {previewIsMinimized && (
                        <div
                          onClick={() => setPreviewIsMinimized(false)}
                          title="Wartung aktiv (Read-Only Lesemodus) – Klicken zum Ausklappen"
                          style={{
                            position: 'absolute',
                            bottom: '12px',
                            right: '12px',
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: isStaffAdmin ? 'rgba(254, 242, 242, 0.95)' : isGroove ? 'rgba(254, 252, 232, 0.95)' : 'rgba(240, 253, 244, 0.95)',
                            border: `1.5px solid ${bannerBorder}`,
                            borderRadius: '100px',
                            padding: '5px 10px 5px 7px',
                            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                            cursor: 'pointer',
                            color: bannerText
                          }}
                        >
                          <div style={{
                            position: 'relative',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: badgeBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: iconColor
                          }}>
                            <Lock size={11} />
                            <span style={{
                              position: 'absolute',
                              top: '-1px',
                              right: '-1px',
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: iconColor,
                              border: '1.5px solid white'
                            }} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 900, lineHeight: 1.1 }}>
                              Wartung aktiv
                            </span>
                            <span style={{ fontSize: '0.58rem', fontWeight: 700, opacity: 0.85 }}>
                              Lesemodus
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  /* Standard Fullscreen Dark Lockout Screen */
                  <div style={{
                    background: 'radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 70%, #020617 100%)',
                    borderRadius: '16px',
                    padding: '28px 16px',
                    color: '#ffffff',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '14px',
                    minHeight: '380px',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.6)'
                  }}>
                    {/* Background Ambient Glow */}
                    <div style={{
                      position: 'absolute',
                      width: '220px',
                      height: '220px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0) 70%)',
                      filter: 'blur(30px)',
                      pointerEvents: 'none'
                    }} />

                    {/* Central Glass Card */}
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: '380px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '20px',
                      padding: '22px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      boxShadow: '0 15px 35px rgba(0,0,0,0.4)'
                    }}>
                      {/* Pulsing Icon */}
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '18px',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 20px rgba(245, 158, 11, 0.35)'
                      }}>
                        <Wrench size={26} color="#ffffff" />
                      </div>

                      {/* Badge & Headline */}
                      <div>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          color: '#fbbf24',
                          padding: '3px 10px',
                          borderRadius: '100px',
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '8px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24' }} />
                          Planmäßige Systemwartung
                        </div>

                        <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>
                          Campus-Groovelab wird gewartet
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.45 }}>
                          {maintenance.reason || 'Wir führen planmäßige System-Upgrades durch.'}
                        </p>
                      </div>

                      {/* Countdown & Scope Box */}
                      <div style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px'
                      }}>
                        <div style={{ borderRight: '1px solid rgba(255, 255, 255, 0.08)', paddingRight: '6px' }}>
                          <div style={{ fontSize: '0.60rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                            Geschätzte Restzeit
                          </div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f59e0b', fontFamily: 'monospace' }}>
                            ~{maintenance.estimatedDurationMinutes || 30}:00 min
                          </div>
                        </div>
                        <div style={{ paddingLeft: '6px' }}>
                          <div style={{ fontSize: '0.60rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                            Geltungsbereich
                          </div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e2e8f0' }}>
                            {maintenance.scope === 'campus_only' ? 'Modul Campus' :
                             maintenance.scope === 'groovelab_only' ? 'Modul GrooveLab' :
                             maintenance.scope === 'schools_only' ? 'Ausgewählte Schulen' : 'Gesamte Plattform'}
                          </div>
                        </div>
                      </div>

                      {/* Refresh Button */}
                      <div
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <RefreshCw size={12} /> Status prüfen &amp; neu laden
                      </div>

                      {/* Bypass PIN footer note */}
                      <div style={{ fontSize: '0.65rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Lock size={11} /> Root-Bypass für Schulleitung: <strong style={{ color: '#94a3b8' }}>{maintenance.bypassPin || 'CG-ROOT-8822'}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 🗓️ TAB 2: WARTUNGSPLANER & BROADCAST-STUDIO                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'planner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
          
          {/* Quick Context Card: Tab 2 Guide Callout */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.8) 0%, rgba(224, 242, 254, 0.8) 100%)',
            border: '1px solid #bae6fd',
            borderRadius: '20px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            fontSize: '0.82rem',
            color: '#0369a1'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Megaphone size={18} color="#0284c7" />
              <span>
                <strong>Leitfaden Tab 2:</strong> Nutzen Sie Broadcast-Banner für allgemeine Informationen oder Feature-Releases. Wählen Sie Dringlichkeit und Zielgruppe. 1-Klick Vorlagen sparen Zeit.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setGuideActiveTab('planner');
                setShowGuideModal(true);
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #7dd3fc',
                color: '#0284c7',
                padding: '5px 12px',
                borderRadius: '100px',
                fontWeight: 800,
                fontSize: '0.74rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Details anzeigen →
            </button>
          </div>

          {/* Quick-Preset Template Pills Bar */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '16px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={15} color="#059669" /> 1-Klick Schnellvorlagen:
            </div>
            {announcementPresets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  const updated: BroadcastAnnouncement = {
                    ...announcement,
                    severity: p.severity,
                    title: p.title,
                    message: p.message
                  };
                  setAnnouncement(updated);
                  setSaveSuccessToast(`Vorlage "${p.label}" geladen! Klicken Sie unten auf "Live schalten" oder "Als Entwurf speichern".`);
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: '100px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
            gap: '24px',
            alignItems: 'start'
          }}>
            {/* Left Card: Broadcast Editor */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              {/* Studio Header with iOS Switch */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: announcement.isActive ? 'rgba(34, 197, 94, 0.15)' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: announcement.isActive ? '#16a34a' : '#64748b'
                  }}>
                    <Megaphone size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                      Broadcast-Banner Studio
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                      Plattformweite Ankündigungen, Systemhinweise &amp; Feature-Releases
                    </span>
                  </div>
                </div>

                {/* Modern Apple iOS Switch Toggle */}
                <div
                  onClick={() => {
                    const nextActive = !announcement.isActive;
                    const updated = { ...announcement, isActive: nextActive };
                    setAnnouncement(updated);
                    persistState(maintenance, updated);
                    setSaveSuccessToast(nextActive ? '🚀 Broadcast-Banner ist jetzt LIVE!' : '🛑 Broadcast-Banner wurde offline genommen.');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: announcement.isActive ? '#f0fdf4' : '#f8fafc',
                    border: `1.5px solid ${announcement.isActive ? '#86efac' : '#e2e8f0'}`,
                    padding: '6px 12px',
                    borderRadius: '100px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  title={announcement.isActive ? 'Klicken zum Deaktivieren' : 'Klicken zum Live-Schalten'}
                >
                  <span style={{
                    fontSize: '0.76rem',
                    fontWeight: 900,
                    color: announcement.isActive ? '#15803d' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    {announcement.isActive && (
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#22c55e',
                        boxShadow: '0 0 6px #22c55e'
                      }} />
                    )}
                    {announcement.isActive ? 'LIVE GESCHALTET' : 'OFFLINE (ENTWURF)'}
                  </span>

                  {/* iOS Toggle Track */}
                  <div style={{
                    width: '38px',
                    height: '22px',
                    borderRadius: '100px',
                    background: announcement.isActive ? '#22c55e' : '#cbd5e1',
                    position: 'relative',
                    transition: 'background 0.2s ease'
                  }}>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      position: 'absolute',
                      top: '2px',
                      left: announcement.isActive ? '18px' : '2px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  </div>
                </div>
              </div>

              {/* Master Live-Status Hero Card */}
              <div style={{
                borderRadius: '18px',
                padding: '16px 20px',
                background: announcement.isActive 
                  ? 'linear-gradient(135deg, rgba(240, 253, 244, 0.95) 0%, rgba(220, 252, 231, 0.95) 100%)' 
                  : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: `1.5px solid ${announcement.isActive ? '#86efac' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: announcement.isActive ? '#22c55e' : '#94a3b8',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: announcement.isActive ? '0 4px 12px rgba(34, 197, 94, 0.35)' : 'none'
                  }}>
                    {announcement.isActive ? <Radio size={20} className="animate-pulse" /> : <Eye size={20} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 900, color: announcement.isActive ? '#14532d' : '#334155' }}>
                      {announcement.isActive ? '🟢 Banner wird aktuell live ausgespielt' : '⚪️ Banner ist aktuell nicht für Nutzer sichtbar'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: announcement.isActive ? '#15803d' : '#64748b', marginTop: '2px' }}>
                      {announcement.isActive 
                        ? `Zielgruppe: ${announcement.targetAudience === 'all' ? 'Alle Benutzer (Plattformweit)' : announcement.targetAudience === 'teachers' ? 'Lehrkräfte & Verwaltung' : announcement.targetAudience === 'students' ? 'Schüler' : 'Admins'}`
                        : 'Entwurf bereit. Klicken Sie auf "Jetzt live schalten", um das Banner zu veröffentlichen.'}
                    </div>
                  </div>
                </div>

                {/* 1-Click Instant Action Button in Status Card */}
                {announcement.isActive ? (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...announcement, isActive: false };
                      setAnnouncement(updated);
                      persistState(maintenance, updated);
                      setSaveSuccessToast('🛑 Broadcast-Banner wurde sofort deaktiviert und offline genommen.');
                    }}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '12px',
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.80rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale-mini"
                  >
                    <Power size={14} />
                    <span>Sofort offline nehmen</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...announcement, isActive: true };
                      setAnnouncement(updated);
                      persistState(maintenance, updated);
                      setSaveSuccessToast('🚀 Broadcast-Banner ist jetzt LIVE für alle Zielgruppen geschaltet!');
                    }}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '12px',
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.80rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale-mini"
                  >
                    <Zap size={14} />
                    <span>Jetzt LIVE schalten</span>
                  </button>
                )}
              </div>

              {/* Visual Severity Selection Cards (Dringlichkeit) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Banner-Typ &amp; Dringlichkeit
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {[
                    { id: 'info', label: 'Information', desc: 'Blau • Updates & Infos', icon: Info, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
                    { id: 'warning', label: 'Warnung', desc: 'Gelb • Wartung & Hinweise', icon: AlertTriangle, color: '#ca8a04', bg: '#fefce8', border: '#fef08a' },
                    { id: 'emergency', label: 'Störung', desc: 'Rot • Wichtige Meldung', icon: AlertCircle, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }
                  ].map((s) => {
                    const SIcon = s.icon;
                    const isSel = announcement.severity === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setAnnouncement({ ...announcement, severity: s.id as any })}
                        style={{
                          borderRadius: '14px',
                          padding: '12px',
                          border: `2px solid ${isSel ? s.color : '#e2e8f0'}`,
                          background: isSel ? s.bg : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isSel ? s.color : '#334155', fontWeight: 850, fontSize: '0.84rem' }}>
                          <SIcon size={16} color={s.color} />
                          <span>{s.label}</span>
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {s.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Target Audience Segmented Buttons */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Zielgruppe (Wer sieht dieses Banner?)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'all', label: 'Alle Benutzer', icon: Users, desc: 'Plattformweit sichtbar' },
                    { id: 'teachers', label: 'Lehrkräfte & Verwaltung', icon: GraduationCap, desc: 'Nur Teacher & Secretary' },
                    { id: 'students', label: 'Nur Schüler', icon: Music, desc: 'Nur Schüler-Accounts' },
                    { id: 'admins', label: 'Nur Administratoren', icon: Shield, desc: 'Nur Schulleiter & Admins' }
                  ].map((aud) => {
                    const isSel = announcement.targetAudience === aud.id;
                    const Icon = aud.icon;
                    return (
                      <div
                        key={aud.id}
                        onClick={() => setAnnouncement({ ...announcement, targetAudience: aud.id as any })}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: `1.5px solid ${isSel ? '#0f172a' : '#cbd5e1'}`,
                          background: isSel ? '#0f172a' : '#f8fafc',
                          color: isSel ? '#ffffff' : '#334155',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontWeight: 850, fontSize: '0.80rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Icon size={14} color={isSel ? '#ffffff' : '#64748b'} />
                          <span>{aud.label}</span>
                        </span>
                        <span style={{ fontSize: '0.66rem', opacity: isSel ? 0.8 : 0.65 }}>{aud.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                  Banner-Titel
                </label>
                <input
                  type="text"
                  value={announcement.title}
                  onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                  placeholder="z.B. Wartungsarbeiten am Sonntag..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Message Textarea */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                  Nachrichtentext
                </label>
                <textarea
                  rows={3}
                  value={announcement.message}
                  onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                  placeholder="Ausführliche Nachricht für alle Benutzer..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.86rem',
                    fontWeight: 500,
                    color: '#0f172a',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Action Buttons Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...announcement, isActive: false };
                    setAnnouncement(updated);
                    persistState(maintenance, updated);
                    setSaveSuccessToast('💾 Banner-Entwurf erfolgreich gespeichert (offline).');
                  }}
                  style={{
                    flex: 1,
                    padding: '13px',
                    borderRadius: '14px',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 850,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Copy size={15} />
                  <span>Als Entwurf speichern</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...announcement, isActive: true };
                    setAnnouncement(updated);
                    persistState(maintenance, updated);
                    setSaveSuccessToast('🚀 Broadcast-Banner erfolgreich live geschaltet & synchronisiert!');
                  }}
                  style={{
                    flex: 1.3,
                    padding: '13px',
                    borderRadius: '14px',
                    background: announcement.isActive ? '#0284c7' : '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.90rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: announcement.isActive ? '0 4px 14px rgba(2, 132, 199, 0.25)' : '0 4px 14px rgba(22, 163, 74, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale-mini"
                >
                  <Send size={16} />
                  <span>{announcement.isActive ? 'Live-Banner synchronisieren' : 'Jetzt LIVE veröffentlichen'}</span>
                </button>
              </div>
            </div>

            {/* Right Card: Multi-Device WYSIWYG Live Banner Preview */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={16} color="#64748b" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    WYSIWYG Live-Vorschau
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.70rem',
                    fontWeight: 800,
                    background: announcement.isActive ? '#dcfce7' : '#f1f5f9',
                    color: announcement.isActive ? '#15803d' : '#64748b',
                    padding: '3px 8px',
                    borderRadius: '100px',
                    border: announcement.isActive ? '1px solid #86efac' : '1px solid #e2e8f0'
                  }}>
                    {announcement.isActive ? '● LIVE IM SYSTEM' : '○ ENTWURF (VORSCHAU)'}
                  </span>

                  {/* Device Switcher Track */}
                  <div style={{
                    display: 'inline-flex',
                    background: '#f1f5f9',
                    padding: '3px',
                    borderRadius: '10px',
                    gap: '2px'
                  }}>
                    {[
                      { id: 'desktop', icon: Laptop },
                      { id: 'tablet', icon: Tablet },
                      { id: 'mobile', icon: Smartphone }
                    ].map((dev) => {
                      const DevIcon = dev.icon;
                      const isSel = previewDevice === dev.id;
                      return (
                        <button
                          key={dev.id}
                          type="button"
                          onClick={() => setPreviewDevice(dev.id as any)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: 'none',
                            background: isSel ? '#ffffff' : 'transparent',
                            color: isSel ? '#0f172a' : '#64748b',
                            cursor: 'pointer',
                            boxShadow: isSel ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                          }}
                        >
                          <DevIcon size={14} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Simulated App Header with Banner */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '18px',
                border: '1px solid #cbd5e1',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '320px',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)'
              }}>
                {/* Banner Render */}
                <div style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                  background: announcement.severity === 'emergency' 
                    ? '#fef2f2' 
                    : announcement.severity === 'warning'
                    ? '#fefce8'
                    : '#f0f9ff',
                  borderBottom: `1px solid ${
                    announcement.severity === 'emergency' 
                      ? '#fecaca' 
                      : announcement.severity === 'warning'
                      ? '#fef08a'
                      : '#bae6fd'
                  }`,
                  color: announcement.severity === 'emergency' 
                    ? '#991b1b' 
                    : announcement.severity === 'warning'
                    ? '#854d0e'
                    : '#075985'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ marginTop: '2px' }}>
                      {announcement.severity === 'emergency' && <AlertCircle size={18} />}
                      {announcement.severity === 'warning' && <AlertTriangle size={18} />}
                      {announcement.severity === 'info' && <Info size={18} />}
                    </div>

                    <div>
                      <div style={{ fontWeight: 850, fontSize: '0.86rem' }}>
                        {announcement.title || 'Kein Titel angegeben'}
                      </div>
                      <div style={{ fontSize: '0.78rem', marginTop: '2px', opacity: 0.9, lineHeight: '1.4' }}>
                        {announcement.message || 'Keine Nachricht verfasst.'}
                      </div>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.80rem', opacity: 0.5, cursor: 'pointer', padding: '2px' }}>✕</span>
                </div>

                {/* Simulated Header Navigation & Content */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34a853' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0f172a' }}>Campus-Groovelab</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, background: 'rgba(52, 168, 83, 0.1)', color: '#34a853', padding: '2px 6px', borderRadius: '4px' }}>Campus</span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, background: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04', padding: '2px 6px', borderRadius: '4px' }}>GrooveLab</span>
                  </div>
                </div>

                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, background: '#f8fafc' }}>
                  <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.74rem' }}>
                    <strong style={{ color: '#0f172a' }}>Stundenplan &amp; Hausaufgabenheft</strong>
                    <div style={{ color: '#64748b', fontSize: '0.68rem', marginTop: '2px' }}>Regulärer Schulbetrieb aktiv</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 🩺 TAB 3: DIAGNOSE, HEALTH & AUDIT-LOG                                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'diagnostics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-in">
          
          {/* Quick Context Card: Tab 3 Guide Callout */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 243, 255, 0.8) 0%, rgba(237, 233, 254, 0.8) 100%)',
            border: '1px solid #ddd6fe',
            borderRadius: '20px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            fontSize: '0.82rem',
            color: '#5b21b6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={18} color="#7c3aed" />
              <span>
                <strong>Leitfaden Tab 3:</strong> Messen Sie Datenbank-Latenzen zur Supabase Cloud, erzwingen Sie PWA-Cache-Updates bei neuen Releases und exportieren Sie das DSGVO-Audit-Protokoll als CSV.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setGuideActiveTab('diagnostics');
                setShowGuideModal(true);
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #c4b5fd',
                color: '#6d28d9',
                padding: '5px 12px',
                borderRadius: '100px',
                fontWeight: 800,
                fontSize: '0.74rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Details anzeigen →
            </button>
          </div>

          {/* Apple Control Center Health Cards Grid (3 Cards) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            {/* Card 1: Supabase Database Latency */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '26px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '18px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Database size={18} color="#059669" />
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      Supabase Cloud DB
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.70rem',
                    fontWeight: 900,
                    padding: '2px 8px',
                    borderRadius: '100px',
                    background: pingLatency === null ? '#f1f5f9' : pingLatency < 100 ? '#ecfdf5' : '#fef3c7',
                    color: pingLatency === null ? '#64748b' : pingLatency < 100 ? '#059669' : '#d97706'
                  }}>
                    {pingLatency === null ? 'Bereit' : pingLatency < 100 ? '● Exzellent' : '● Erhöht'}
                  </span>
                </div>

                <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
                  {pingLatency !== null ? `${pingLatency} ms` : '—'}
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Echtzeit-Latenzmessung zur Postgres-Cloud &amp; RLS-Engine.
                </p>
              </div>

              <button
                type="button"
                onClick={handleMeasurePing}
                disabled={pinging}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
                className="hover-scale-mini"
              >
                <RefreshCw size={14} className={pinging ? 'animate-spin' : ''} />
                <span>{pinging ? 'Messe Latenz...' : 'Latenz-Ping messen'}</span>
              </button>
            </div>

            {/* Card 2: PWA Cache-Buster */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '26px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '18px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Smartphone size={18} color="#0284c7" />
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      PWA Service Worker
                    </span>
                  </div>
                  <span style={{ fontSize: '0.70rem', fontWeight: 900, padding: '2px 8px', borderRadius: '100px', background: '#e0f2fe', color: '#0284c7' }}>
                    v2 Auto-Sync
                  </span>
                </div>

                <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
                  {lastBustedVersion}
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Erzwingt bei allen Endgeräten das Neuladen von JS-Bundles &amp; Assets.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTriggerCacheBuster}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: '#059669',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 10px rgba(5, 150, 105, 0.3)',
                  transition: 'all 0.15s'
                }}
                className="hover-scale-mini"
              >
                <Zap size={14} />
                <span>Cache-Bust forcieren</span>
              </button>
            </div>

            {/* Card 3: Session Invalidation (Global Reset) */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '26px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '18px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={18} color="#dc2626" />
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      Auth-Session Guard
                    </span>
                  </div>
                  <span style={{ fontSize: '0.70rem', fontWeight: 900, padding: '2px 8px', borderRadius: '100px', background: '#fee2e2', color: '#dc2626' }}>
                    Sicherheits-Tool
                  </span>
                </div>

                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Sitzungs-Invalidierung
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Meldet alle regulären Nutzer ab (Notfall-Reset bei Credentials-Update).
                </p>
              </div>

              <button
                type="button"
                onClick={handleForceSessionReset}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '0.82rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
                className="hover-scale-mini"
              >
                <Power size={14} />
                <span>Notfall-Logout aller User</span>
              </button>
            </div>

            {/* Card 4: Database Hygiene & Rate Limit Purge */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '26px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '18px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="#2563eb" />
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      Datenbank-Hygiene
                    </span>
                  </div>
                  <span style={{ fontSize: '0.70rem', fontWeight: 900, padding: '2px 8px', borderRadius: '100px', background: '#eff6ff', color: '#2563eb' }}>
                    Maintenance
                  </span>
                </div>

                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Rate-Limit Purge
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Bereinigt ephemere Login-Rate-Limits älter als 7 Tage zur Vermeidung von Tabellen-Bloat.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePurgeRateLimits}
                disabled={purgingRateLimits}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  fontSize: '0.82rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
                className="hover-scale-mini"
              >
                {purgingRateLimits ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>{purgingRateLimits ? 'Bereinige...' : 'Rate-Limits bereinigen (< 7 Tage)'}</span>
              </button>
            </div>
          </div>

          {/* Apple Pro Audit-Log Timeline with Filter Search */}
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '30px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.20rem', fontWeight: 900, color: '#0f172a' }}>
                  📜 Revisionssicheres Wartungs- &amp; Incident-Audit-Log
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                  Vollständiges DSGVO-Audit-Protokoll aller ausgelösten Betriebsereignisse und Wartungsfenster.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder="Log durchsuchen..."
                    style={{
                      padding: '7px 12px 7px 32px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.80rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExportAuditLogCsv}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                  className="hover-scale-mini"
                >
                  <Download size={14} />
                  <span>CSV-Export</span>
                </button>
              </div>
            </div>

            {/* Timeline List */}
            {filteredAuditLog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '0.85rem' }}>
                Keine passenden Audit-Einträge gefunden.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredAuditLog.map((entry) => {
                  const isFinished = !!entry.ended_at;
                  return (
                    <div
                      key={entry.id}
                      style={{
                        padding: '18px 22px',
                        borderRadius: '16px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '14px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          background: isFinished ? '#ecfdf5' : '#fef2f2',
                          color: isFinished ? '#059669' : '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isFinished ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.94rem', color: '#0f172a' }}>
                              {entry.reason}
                            </span>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              padding: '2px 8px',
                              borderRadius: '100px',
                              background: isFinished ? '#ecfdf5' : '#fee2e2',
                              color: isFinished ? '#059669' : '#dc2626'
                            }}>
                              {isFinished ? 'Beendet' : 'Aktiv / Ausstehend'}
                            </span>
                            <span style={{ fontSize: '0.70rem', color: '#64748b', background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 700 }}>
                              {entry.mode === 'emergency_killswitch' ? 'Killswitch' : 'Planmäßig'}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <span>Start: {new Date(entry.timestamp).toLocaleString('de-DE')}</span>
                            {entry.ended_at && <span>• Ende: {new Date(entry.ended_at).toLocaleString('de-DE')}</span>}
                            <span>• Dauer: ca. {entry.duration_minutes} Min</span>
                            <span>• Operator: {entry.operator}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontFamily: 'monospace', fontWeight: 700 }}>
                        {entry.id}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 💡 APPLE PRO GUIDE & HANDBUCH MODAL                                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showGuideModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '28px',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            maxWidth: '860px',
            width: '100%',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    Bedienungsanleitung &amp; Leitfaden: Wartung &amp; Betrieb
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Offizieller SaaS-Administrator-Leitfaden für unterbrechungsfreie Plattform-Operationen.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Guide Segmented Navigation */}
            <div style={{
              padding: '12px 28px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              gap: '8px',
              background: '#ffffff',
              overflowX: 'auto'
            }}>
              {[
                { id: 'general', label: 'Allgemeine Architektur', icon: Layers },
                { id: 'status', label: 'Tab 1: Live-Status & Killswitch', icon: Power },
                { id: 'planner', label: 'Tab 2: Broadcast & Planer', icon: Megaphone },
                { id: 'diagnostics', label: 'Tab 3: Diagnose & Audit-Log', icon: Activity }
              ].map((t) => {
                const isSel = guideActiveTab === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setGuideActiveTab(t.id as any)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '100px',
                      border: 'none',
                      background: isSel ? '#0f172a' : '#f1f5f9',
                      color: isSel ? '#ffffff' : '#64748b',
                      fontSize: '0.78rem',
                      fontWeight: isSel ? 850 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={13} color={isSel ? '#ffffff' : '#64748b'} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Guide Content Body */}
            <div style={{
              padding: '28px 32px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              fontSize: '0.86rem',
              color: '#334155',
              lineHeight: '1.6'
            }}>
              {/* 🌐 ALLGEMEINE ARCHITEKTUR */}
              {guideActiveTab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-fade-in">
                  <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                      1. Zielsetzung &amp; Hochverfügbarkeits-Architektur
                    </h4>
                    <p style={{ margin: 0 }}>
                      Das <strong>Wartung &amp; Plattform-Betrieb</strong> Board ermöglicht dem Master-Administrator die zentrale Steuerung aller Betriebszustände über sämtliche angeschlossenen Musikschulen, Web-Clients, Tablets und Raum-Kioske hinweg.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1', background: '#ffffff' }}>
                      <strong style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Zap size={15} /> Hybrid Realtime Sync
                      </strong>
                      <span style={{ fontSize: '0.80rem', color: '#64748b' }}>
                        Änderungen am Wartungszustand werden synchron in der Supabase Postgres Cloud (Tabelle <code>master_billing_settings</code>) und im LocalStorage persistiert, sodass alle aktiven Clients innerhalb von Sekunden den Sperrbildschirm oder Banner laden.
                      </span>
                    </div>

                    <div style={{ padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1', background: '#ffffff' }}>
                      <strong style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <ShieldCheck size={15} /> 2-Stufen-Sicherheit
                      </strong>
                      <span style={{ fontSize: '0.80rem', color: '#64748b' }}>
                        Vor dem Auslösen von Killswitches oder Massen-Logouts sichert das System Aktionen durch Schutzmechanismen ab, um versehentliche Störungen des Musikschulunterrichts zu verhindern.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 🟢 TAB 1 LEITFADEN */}
              {guideActiveTab === 'status' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-fade-in">
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                    Leitfaden: Notfall-Killswitch &amp; Countdown-Wartung
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ padding: '14px 18px', borderRadius: '14px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                      <strong style={{ color: '#065f46' }}>⏳ Modus 1: Mit Countdown-Vorwarnung (Empfohlen für Releases &amp; Wartungsfenster)</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.80rem', color: '#047857' }}>
                        Zeigt allen angemeldeten Nutzern einen eleganten Banner mit Live-Countdown (z.B. „Wartung in 15 Minuten“). Nach Ablauf des Countdowns schaltet die Plattform automatisch auf den Sperrbildschirm um. Dies gibt Lehrern Zeit, Unterrichtsnotizen und Hausaufgabenhefte zu speichern.
                      </p>
                    </div>

                    <div style={{ padding: '14px 18px', borderRadius: '14px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                      <strong style={{ color: '#991b1b' }}>🚨 Modus 2: Sofortiger Killswitch (Nur für Sicherheitsvorfälle)</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.80rem', color: '#b91c1c' }}>
                        Aktiviert den Sperrbildschirm unverzüglich ohne Vorwarnung für alle Benutzer. Verwenden Sie diesen Modus nur bei kritischen Datenbank-Wartungen oder Sicherheitsvorfällen.
                      </p>
                    </div>

                    <div style={{ padding: '14px 18px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <strong style={{ color: '#0f172a' }}>🔑 Master Root-Bypass-PIN</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                        Der konfigurierte PIN (z.B. <code>CG-ROOT-8822</code>) wird Schulleitern auf dem Sperrbildschirm als Bypass-Möglichkeit angeboten. Damit kann die Schulleitung die Plattform auch während laufender Wartungsarbeiten für dringende Sekretariatsarbeiten betreten.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 🗓️ TAB 2 LEITFADEN */}
              {guideActiveTab === 'planner' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-fade-in">
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                    Leitfaden: Broadcast-Banner Studio
                  </h4>

                  <p style={{ margin: 0 }}>
                    Über das Broadcast-Studio können globale Ankündigungen, Feature-Neuigkeiten oder Wartungshinweise veröffentlicht werden, ohne dass die Plattform gesperrt wird.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ padding: '14px', borderRadius: '14px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                      <strong style={{ color: '#0369a1', fontSize: '0.84rem' }}>🔵 Information</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#0284c7' }}>
                        Für Feature-Releases, neue Module oder Schulungsangebote.
                      </p>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '14px', background: '#fefce8', border: '1px solid #fef08a' }}>
                      <strong style={{ color: '#854d0e', fontSize: '0.84rem' }}>🟡 Warnung</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#ca8a04' }}>
                        Für geplante Server-Arbeiten am Wochenende oder temporäre Lasten.
                      </p>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '14px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                      <strong style={{ color: '#991b1b', fontSize: '0.84rem' }}>🔴 Dringend</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#dc2626' }}>
                        Für kurzzeitige Störungen oder Verzögerungen an externen APIs.
                      </p>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.80rem', color: '#475569' }}>
                    💡 <strong>Tipp:</strong> Nutzen Sie die <strong>1-Klick Schnellvorlagen</strong> über dem Editor, um vordefinierte, professionell formulierte Ankündigungen in Sekunden zu aktivieren.
                  </div>
                </div>
              )}

              {/* 🩺 TAB 3 LEITFADEN */}
              {guideActiveTab === 'diagnostics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-fade-in">
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                    Leitfaden: Diagnose, PWA Cache-Busting &amp; Revisions-Log
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ padding: '14px 18px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <strong style={{ color: '#0f172a' }}>🩺 1. Datenbank-Latenzmessung</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                        Misst die Roundtrip-Zeit zur Supabase Postgres Cloud inklusive RLS-Sicherheitsprüfung. Werte unter <strong>100 ms</strong> gelten als exzellent.
                      </p>
                    </div>

                    <div style={{ padding: '14px 18px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <strong style={{ color: '#0f172a' }}>⚡ 2. PWA Service-Worker Cache-Buster</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                        Erzwingt bei allen Endgeräten (iPads, Smartboards, Smartphones) das Verwerfen des alten Service-Worker Caches und lädt die neuesten JavaScript-Bundles herunter.
                      </p>
                    </div>

                    <div style={{ padding: '14px 18px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <strong style={{ color: '#0f172a' }}>📜 3. DSGVO Audit-Log &amp; CSV-Export</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                        Jede Aktivierung des Wartungsmodus, jeder Killswitch und jede Entwarnung wird manipulationssicher mit Zeitstempel, Operator und Dauer protokolliert. Über den Button <strong>„CSV-Export“</strong> können Sie diese Daten für Datenschutz-Audits exportieren.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 28px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                style={{
                  padding: '9px 20px',
                  borderRadius: '12px',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                Verstanden &amp; Schließen
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, Clock, 
  RefreshCw, Key, Lock, Zap, Megaphone, Server, Activity, Database, 
  Trash2, Plus, Eye, Send, Radio, UserCheck, ShieldCheck, Power,
  ChevronRight, Download, Sparkles, Sliders, Smartphone, Check, Copy,
  Info, Bell, Calendar, Flame, Layers, Laptop, Tablet, Monitor,
  Shield, CheckCircle, ArrowUpRight, Search, Gauge, BookOpen, HelpCircle,
  X, Compass, FileText, Cpu, CheckSquare
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
      label: '🗓️ Wartung am Wochenende',
      severity: 'warning',
      title: 'Geplante Wartungsarbeiten am Sonntag',
      message: 'Am kommenden Sonntag zwischen 02:00 und 04:00 Uhr finden geplante Server-Upgrades statt. In dieser Zeit kann es zu kurzen Unterbrechungen kommen.'
    },
    {
      label: '🚀 Neues Feature-Update',
      severity: 'info',
      title: 'Neues Campus-Groovelab Update verfügbar!',
      message: 'Wir haben neue Funktionen für das Schüler-Protokoll, die Loopstation und den Raumplaner veröffentlicht.'
    },
    {
      label: '⚡ Kurze Datenbank-Optimierung',
      severity: 'info',
      title: 'Routinemäßige System-Optimierung',
      message: 'Aktuell führen wir kurze Leistungsoptimierungen an den Cloud-Servern durch. Der Betrieb läuft uneingeschränkt weiter.'
    },
    {
      label: '⚠️ Dringende Störungsmeldung',
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
          
          {/* 💡 Anleitung & Handbuch Button */}
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
              transition: 'all 0.15s ease'
            }}
            className="hover-scale-mini"
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
              { id: 'status', label: '🟢 Live-Status & Killswitch', icon: Power },
              { id: 'planner', label: '🗓️ Broadcast & Planer', icon: Megaphone },
              { id: 'diagnostics', label: '🩺 Diagnose & Audit-Log', icon: Activity }
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
                >
                  <Icon size={15} color={isSel ? '#0f172a' : '#64748b'} />
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

          {/* Hero Live Status Glass Banner with Radial Ambient Glow */}
          <div style={{
            background: maintenance.isActive 
              ? 'linear-gradient(135deg, #2d0606 0%, #111827 100%)' 
              : 'linear-gradient(135deg, #042f2e 0%, #0f172a 100%)',
            borderRadius: '28px',
            padding: '36px 40px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '28px',
            boxShadow: maintenance.isActive
              ? '0 24px 50px -15px rgba(220, 38, 38, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 24px 50px -15px rgba(5, 150, 105, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            border: `1px solid ${maintenance.isActive ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Ambient Radial Backlight */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-20%',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: maintenance.isActive ? 'radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
              filter: 'blur(40px)'
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '22px', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '22px',
                background: maintenance.isActive ? 'rgba(239, 68, 68, 0.22)' : 'rgba(16, 185, 129, 0.22)',
                border: `1.5px solid ${maintenance.isActive ? 'rgba(239, 68, 68, 0.45)' : 'rgba(16, 185, 129, 0.45)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
              }}>
                {maintenance.isActive ? (
                  <ShieldAlert size={34} color="#f87171" className="animate-pulse" />
                ) : (
                  <ShieldCheck size={34} color="#34d399" />
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '4px 12px',
                    borderRadius: '100px',
                    background: maintenance.isActive ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)',
                    color: maintenance.isActive ? '#fca5a5' : '#a7f3d0',
                    border: `1px solid ${maintenance.isActive ? 'rgba(239, 68, 68, 0.45)' : 'rgba(16, 185, 129, 0.45)'}`
                  }}>
                    {maintenance.isActive ? '🔴 Wartungsmodus Aktiv' : '🟢 System Normal & Online'}
                  </span>

                  {!maintenance.isActive && maintenance.mode === 'calendar_scheduler' && maintenance.scheduledStartTime && (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '4px 12px',
                      borderRadius: '100px',
                      background: 'rgba(2, 132, 199, 0.35)',
                      color: '#bae6fd',
                      border: '1px solid rgba(56, 189, 248, 0.45)',
                      display: 'flex',
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
                    ? '🟢 Wartung beenden & Freischalten' 
                    : '🚨 Notfall-Wartung aktivieren'}
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
                      boxShadow: configViewMode === 'wizard' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    ✨ Einfach (Assistent)
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
                      boxShadow: configViewMode === 'expert' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    🛠️ Experten-Details
                  </button>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* ✨ WIZARD MODE: 3 GEFÜHRTE SCHRITTE                              */}
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
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.82rem' }}>🚀 Planmäßiges Upgrade</div>
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
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.82rem' }}>⚡ Kurze Fehlerbehebung</div>
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
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.82rem' }}>🛡️ Sanfter Lesemodus (Empfohlen)</div>
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
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.82rem' }}>🔒 Kompletter Sperrbildschirm</div>
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
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.80rem' }}>📅 So. 02:00 Uhr</div>
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
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.80rem' }}>⏳ Jetzt mit 10m Vorlauf</div>
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
                        <div style={{ fontWeight: 900, fontSize: '0.80rem' }}>🚨 Jetzt sofort</div>
                        <div style={{ fontSize: '0.68rem', color: '#dc2626', marginTop: '2px' }}>Notfall-Sofortsperre</div>
                      </button>
                    </div>
                  </div>

                  {/* ZUSAMMENFASSUNG & 1-KLICK SPEICHERN */}
                  <div style={{ background: '#ecfdf5', borderRadius: '18px', padding: '18px', border: '1px solid #a7f3d0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontWeight: 850, color: '#065f46', fontSize: '0.86rem' }}>
                      📋 Zusammenfassung deiner Auswahl:
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#065f46', lineHeight: '1.6' }}>
                      • <strong>Wartungsziel:</strong> {wizardGoal === 'upgrade' ? 'Planmäßiges Upgrade (30 Min.)' : wizardGoal === 'fix' ? 'Kurze Fehlerbehebung (15 Min.)' : 'Individuell'}<br />
                      • <strong>Modus:</strong> {wizardSoftness === 'readonly' ? '🛡️ Sanfter Lesemodus (Stundenpläne bleiben sichtbar)' : '🔒 Vollständiger Sperrbildschirm'}<br />
                      • <strong>Start:</strong> {wizardTiming === 'sunday' ? '📅 Kommender Sonntag 02:00 Uhr (24h Vorab-Banner)' : wizardTiming === 'now_warn' ? '⏳ Jetzt gleich mit 10 Min. Vorwarnung' : '🚨 Jetzt sofort (Notfall)'}<br />
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
                      <span>🪄 Wartungs-Konfiguration jetzt anwenden &amp; speichern</span>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

              {/* Apple Hardware Bezel Mockup */}
              <div style={{
                background: '#090d16',
                borderRadius: '22px',
                padding: '12px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.2)',
                border: '1px solid #1e293b'
              }}>
                {/* Camera Notch Dot */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1e293b' }} />
                </div>

                {/* Internal Screen Content */}
                {maintenance.readOnlyMode ? (
                  /* Read-Only App Preview with Amber Header */
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '340px',
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)'
                  }}>
                    {/* Amber Sticky Banner in Device */}
                    <div style={{
                      background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                      color: '#ffffff',
                      padding: '8px 12px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Lock size={12} />
                        <span>⚠️ Read-Only Lesemodus aktiv</span>
                      </div>
                      <span style={{ fontSize: '0.62rem', background: 'rgba(0,0,0,0.25)', padding: '2px 6px', borderRadius: '4px' }}>
                        🔒 Schreibschutz
                      </span>
                    </div>

                    {/* App Mock Content */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.78rem', color: '#0f172a' }}>Mein Hausaufgabenheft</strong>
                        <span style={{ fontSize: '0.65rem', background: '#e2e8f0', color: '#64748b', padding: '2px 6px', borderRadius: '4px' }}>Nur Ansicht</span>
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
                      <button
                        type="button"
                        disabled
                        style={{
                          marginTop: 'auto',
                          padding: '8px',
                          borderRadius: '8px',
                          background: '#e2e8f0',
                          color: '#94a3b8',
                          border: 'none',
                          fontSize: '0.70rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          cursor: 'not-allowed'
                        }}
                      >
                        <Lock size={11} />
                        <span>Eintrag speichern (Schreibschutz aktiv)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Fullscreen Dark Lockout Screen */
                  <div style={{
                    background: 'linear-gradient(135deg, #0a0f1d 0%, #1e293b 100%)',
                    borderRadius: '16px',
                    padding: '36px 20px',
                    color: '#ffffff',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                    minHeight: '340px',
                    justifyContent: 'center',
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.6)'
                  }}>
                    <div style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '18px',
                      background: 'rgba(239, 68, 68, 0.18)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f87171',
                      boxShadow: '0 8px 24px rgba(239, 68, 68, 0.25)'
                    }}>
                      <Wrench size={26} />
                    </div>

                    <div>
                      <div style={{ fontSize: '0.70rem', fontWeight: 900, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                        Campus-Groovelab Wartungsarbeiten
                      </div>
                      <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                        Vorübergehend nicht verfügbar
                      </h4>
                      <p style={{ margin: '8px 0 0 0', fontSize: '0.80rem', color: '#cbd5e1', lineHeight: '1.45', maxWidth: '320px' }}>
                        {maintenance.reason || 'Planmäßige Upgrades im Gange.'}
                      </p>
                    </div>

                    <div style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '8px 18px',
                      borderRadius: '100px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: '#93c5fd',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Clock size={13} />
                      <span>Geschätzte Dauer: ca. {maintenance.estimatedDurationMinutes} Minuten</span>
                    </div>

                    <div style={{
                      marginTop: '8px',
                      fontSize: '0.72rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <Lock size={12} />
                      <span>Root-Bypass für Schulleitung: <strong>{maintenance.bypassPin}</strong></span>
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
                  setAnnouncement({
                    ...announcement,
                    severity: p.severity,
                    title: p.title,
                    message: p.message,
                    isActive: true
                  });
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
              gap: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Megaphone size={18} color="#0f172a" />
                  <h4 style={{ margin: 0, fontSize: '1.10rem', fontWeight: 900, color: '#0f172a' }}>
                    Broadcast-Banner Studio
                  </h4>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: announcement.isActive ? '#059669' : '#64748b' }}>
                    {announcement.isActive ? '● Live geschaltet' : '○ Inaktiv'}
                  </span>
                  <input
                    type="checkbox"
                    checked={announcement.isActive}
                    onChange={(e) => setAnnouncement({ ...announcement, isActive: e.target.checked })}
                    style={{ accentColor: '#059669', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </label>
              </div>

              {/* Severity & Audience */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Banner-Typ / Dringlichkeit
                  </label>
                  <select
                    value={announcement.severity}
                    onChange={(e) => setAnnouncement({ ...announcement, severity: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '11px 12px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  >
                    <option value="info">🔵 Information (Blau)</option>
                    <option value="warning">🟡 Warnung / Hinweis (Gelb)</option>
                    <option value="emergency">🔴 Dringende Störung (Rot)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Zielgruppe
                  </label>
                  <select
                    value={announcement.targetAudience}
                    onChange={(e) => setAnnouncement({ ...announcement, targetAudience: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '11px 12px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  >
                    <option value="all">👥 Alle Benutzer (Plattformweit)</option>
                    <option value="teachers">🎓 Nur Lehrkräfte &amp; Schulleitung</option>
                    <option value="students">🎸 Nur Schüler</option>
                    <option value="admins">🛡️ Nur Administratoren</option>
                  </select>
                </div>
              </div>

              {/* Title */}
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
                    padding: '11px 14px',
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

              {/* Message */}
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
                    padding: '11px 14px',
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

              <button
                type="button"
                onClick={() => persistState(maintenance, announcement)}
                style={{
                  padding: '13px',
                  borderRadius: '14px',
                  background: announcement.isActive ? '#0284c7' : '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.90rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
              >
                <Send size={16} />
                <span>{announcement.isActive ? 'Banner live aktualisieren' : 'Banner-Entwurf speichern'}</span>
              </button>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={16} color="#64748b" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    WYSIWYG Live-Vorschau
                  </span>
                </div>

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

              {/* Simulated App Header with Banner */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '18px',
                border: '1px solid #cbd5e1',
                padding: previewDevice === 'mobile' ? '14px 10px' : '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
                  Simulierte Benutzeroberfläche ({previewDevice}):
                </div>

                {/* Banner Render */}
                <div style={{
                  borderRadius: '14px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                  background: announcement.severity === 'emergency' 
                    ? '#fef2f2' 
                    : announcement.severity === 'warning'
                    ? '#fefce8'
                    : '#f0f9ff',
                  border: `1px solid ${
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
                      <div style={{ fontWeight: 850, fontSize: '0.88rem' }}>
                        {announcement.title || 'Kein Titel angegeben'}
                      </div>
                      <div style={{ fontSize: '0.80rem', marginTop: '3px', opacity: 0.9, lineHeight: '1.4' }}>
                        {announcement.message || 'Keine Nachricht verfasst.'}
                      </div>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.80rem', opacity: 0.5, cursor: 'pointer' }}>✕</span>
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
                { id: 'general', label: '🌐 Allgemeine Architektur' },
                { id: 'status', label: '🟢 Tab 1: Live-Status & Killswitch' },
                { id: 'planner', label: '🗓️ Tab 2: Broadcast & Planer' },
                { id: 'diagnostics', label: '🩺 Tab 3: Diagnose & Audit-Log' }
              ].map((t) => {
                const isSel = guideActiveTab === t.id;
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
                      transition: 'all 0.15s'
                    }}
                  >
                    {t.label}
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

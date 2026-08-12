import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Save, 
  Calendar, 
  MessageSquare, 
  Award, 
  Settings, 
  Clock, 
  Flame, 
  Users, 
  Bell,
  Link2
} from 'lucide-react';
import { generateConsentPDF, generateDSBCompliancePDF } from '../utils/pdfGenerator';

interface CampusSetupScreenProps {
  school: any;
  admin: any;
  brandColor?: string;
  onUpdate: () => void;
}

export function CampusSetupScreen({ 
  school, 
  admin, 
  onUpdate 
}: CampusSetupScreenProps) {
  // As per styling rules, Campus module uses green (#34a853, #e6f4ea)
  const brandColor = '#34a853';
  const activeBgColor = '#e6f4ea';
  const effectiveSchool = Array.isArray(school) ? school[0] : school;
  const sId = effectiveSchool?.id || admin?.school_id;

  const [isSaving, setIsSaving] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'calendar' | 'communication' | 'gamification' | 'datenschutz'>('calendar');
  const [initialConfig, setInitialConfig] = useState<any>(null);

  // Responsive Mobile Viewport Detection (<= 1024px or Device Simulator)
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 1024 || Boolean(document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait'));
  });

  useEffect(() => {
    const checkMobile = () => {
      const isMob = window.innerWidth <= 1024 || Boolean(document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait'));
      setIsMobileDevice(isMob);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    const observer = new MutationObserver(() => {
      checkMobile();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('resize', checkMobile);
      observer.disconnect();
    };
  }, []);

  // --- States for Settings ---
  const [schoolName, setSchoolName] = useState('');
  const [showWeekends, setShowWeekends] = useState(true);
  const [icalActive, setIcalActive] = useState(true);
  const [calendarUrl, setCalendarUrl] = useState('');
  const [studentToTeacherChat, setStudentToTeacherChat] = useState(true);
  const [autoCancelAlerts, setAutoCancelAlerts] = useState(true);
  const [flamesActive, setFlamesActive] = useState(true);
  const [xpActive, setXpActive] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [showDetailedStats, setShowDetailedStats] = useState(true);

  // Load configuration from database
  useEffect(() => {
    if (effectiveSchool) {
      setSchoolName(effectiveSchool.name || '');
      const rawUrl = effectiveSchool.calendar_url || '';
      setCalendarUrl(rawUrl);

      const campusConfig = effectiveSchool.opening_hours?.campus_settings || {};
      
      const loaded = {
        showWeekends: campusConfig.show_weekends !== false,
        icalActive: campusConfig.ical_active !== false,
        calendarUrl: rawUrl,
        studentToTeacherChat: campusConfig.student_to_teacher_chat !== false,
        autoCancelAlerts: campusConfig.auto_cancel_alerts !== false,
        flamesActive: campusConfig.flames_active !== false,
        xpActive: campusConfig.xp_active !== false,
        showLeaderboard: campusConfig.show_leaderboard !== false,
        showDetailedStats: campusConfig.show_detailed_stats !== false
      };

      setShowWeekends(loaded.showWeekends);
      setIcalActive(loaded.icalActive);
      setStudentToTeacherChat(loaded.studentToTeacherChat);
      setAutoCancelAlerts(loaded.autoCancelAlerts);
      setFlamesActive(loaded.flamesActive);
      setXpActive(loaded.xpActive);
      setShowLeaderboard(loaded.showLeaderboard);
      setShowDetailedStats(loaded.showDetailedStats);

      setInitialConfig(loaded);
    }
  }, [effectiveSchool]);

  const isSettingsDirty = React.useMemo(() => {
    if (!initialConfig) return false;
    return (
      showWeekends !== initialConfig.showWeekends ||
      icalActive !== initialConfig.icalActive ||
      calendarUrl !== initialConfig.calendarUrl ||
      studentToTeacherChat !== initialConfig.studentToTeacherChat ||
      autoCancelAlerts !== initialConfig.autoCancelAlerts ||
      flamesActive !== initialConfig.flamesActive ||
      xpActive !== initialConfig.xpActive ||
      showLeaderboard !== initialConfig.showLeaderboard ||
      showDetailedStats !== initialConfig.showDetailedStats
    );
  }, [
    initialConfig,
    showWeekends, icalActive, calendarUrl, studentToTeacherChat, autoCancelAlerts,
    flamesActive, xpActive, showLeaderboard, showDetailedStats
  ]);

  const handleSave = async () => {
    if (!sId) {
      alert('Fehler: Keine Schul-ID gefunden.');
      return;
    }
    setIsSaving(true);

    try {
      const updatedOpeningHours = {
        ...effectiveSchool?.opening_hours,
        campus_settings: {
          ...effectiveSchool?.opening_hours?.campus_settings,
          show_weekends: showWeekends,
          ical_active: icalActive,
          auto_cancel_alerts: autoCancelAlerts,
          student_to_teacher_chat: studentToTeacherChat,
          flames_active: flamesActive,
          xp_active: xpActive,
          show_leaderboard: showLeaderboard,
          show_detailed_stats: showDetailedStats
        }
      };

      const { error } = await supabase
        .from('schools')
        .update({
          opening_hours: updatedOpeningHours,
          calendar_url: icalActive ? (calendarUrl || null) : null
        })
        .eq('id', sId);

      if (error) throw error;

      setInitialConfig({
        showWeekends,
        icalActive,
        calendarUrl,
        studentToTeacherChat,
        autoCancelAlerts,
        flamesActive,
        xpActive,
        showLeaderboard,
        showDetailedStats
      });

      alert('Campus-Einstellungen erfolgreich gespeichert! 🌟');
      onUpdate();
    } catch (err: any) {
      console.error('Error saving settings:', err);
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderToggleRow = (
    label: string, 
    description: string, 
    value: boolean, 
    onChange: (val: boolean) => void,
    icon: React.ReactNode
  ) => {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobileDevice ? '14px 16px' : '16px',
        borderRadius: '18px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        transition: 'all 0.2s',
        gap: '12px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: value ? `${brandColor}15` : '#f1f5f9', color: value ? brandColor : '#94a3b8', display: 'flex', transition: 'all 0.2s', flexShrink: 0 }}>
            {icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ margin: '0 0 2px 0', fontSize: '0.875rem', fontWeight: 800, color: '#1e293b' }}>{label}</h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600, lineHeight: '1.35' }}>{description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`app-binary-switch ${value ? 'active' : ''}`}
          style={{ backgroundColor: value ? brandColor : undefined, flexShrink: 0 }}
        >
          <div className="app-binary-switch-knob" />
        </button>
      </div>
    );
  };

  return (
    <div style={{ marginTop: isMobileDevice ? '8px' : '24px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* MOBILE APPLE iOS SEGMENTED CONTROL TABS (Smartphones & Simulators) */}
      {isMobileDevice && (
        <div 
          className="no-scrollbar"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            alignItems: 'center',
            background: '#ffffff',
            borderRadius: '100px',
            padding: '3px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {[
            { id: 'calendar', label: 'Kalender', icon: Clock },
            { id: 'communication', label: 'Chat', icon: MessageSquare },
            { id: 'gamification', label: 'Motivation', icon: Award },
            { id: 'datenschutz', label: 'Datenschutz', icon: Users }
          ].map((item) => {
            const isSelected = settingsTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSettingsTab(item.id as any)}
                style={{
                  width: '100%',
                  padding: '8px 2px',
                  borderRadius: '100px',
                  border: 'none',
                  background: isSelected ? brandColor : 'transparent',
                  color: isSelected ? '#ffffff' : '#64748b',
                  fontWeight: isSelected ? 800 : 700,
                  fontSize: '0.64rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  boxSizing: 'border-box'
                }}
              >
                <Icon size={12} color={isSelected ? '#ffffff' : '#64748b'} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ 
        display: 'flex',
        flexDirection: isMobileDevice ? 'column' : 'row',
        background: '#ffffff',
        borderRadius: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)',
        minHeight: isMobileDevice ? 'auto' : '580px',
        overflow: 'hidden',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* DESKTOP LEFT SIDEBAR (Apple-style - Desktop Only) */}
        {!isMobileDevice && (
          <div style={{
            width: '260px',
            background: '#f8fafc',
            borderRight: '1px solid #e2e8f0',
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flexShrink: 0
          }}>
            <h3 style={{ margin: '0 0 16px 8px', fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campus Setup</h3>
            {[
              { id: 'calendar', label: 'Stundenplan & Kalender' },
              { id: 'communication', label: 'Kommunikation' },
              { id: 'gamification', label: 'Motivation & Spiel' },
              { id: 'datenschutz', label: 'Datenschutz & AVV' }
            ].map((item) => {
              const isSelected = settingsTab === item.id;
              const activeColor = isSelected ? brandColor : '#64748b';
              
              const renderIcon = () => {
                switch (item.id) {
                  case 'calendar': return <Clock size={14} color={activeColor} />;
                  case 'communication': return <MessageSquare size={14} color={activeColor} />;
                  case 'gamification': return <Award size={14} color={activeColor} />;
                  case 'datenschutz': return <Users size={14} color={activeColor} />;
                  default: return null;
                }
              };

              return (
                <button
                  key={item.id}
                  onClick={() => setSettingsTab(item.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: isSelected ? '0 12px 12px 0' : '12px',
                    border: 'none',
                    borderLeft: isSelected ? `3px solid ${brandColor}` : '3px solid transparent',
                    background: isSelected ? activeBgColor : 'transparent',
                    color: isSelected ? brandColor : '#475569',
                    fontSize: '0.84rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                >
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: isSelected ? '#ffffff' : '#f1f5f9',
                    boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                  }}>{renderIcon()}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* RIGHT PANEL (Details - Full Width on Mobile) */}
        <div style={{ flex: 1, padding: isMobileDevice ? '20px 16px' : '32px 40px', overflowY: 'auto', textAlign: 'left', width: '100%', boxSizing: 'border-box' }}>
          {settingsTab === 'calendar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>Stundenplan &amp; Kalender</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Wochenend-Anzeige und iCal Synchronisation verwalten.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {renderToggleRow(
                  "Wochenend-Ansicht",
                  "Samstage und Sonntage im Stundenplan-Kalender anzeigen.",
                  showWeekends,
                  setShowWeekends,
                  <Calendar size={18} />
                )}

                {renderToggleRow(
                  "Kalender-Synchronisation (iCal)",
                  "Einen externen Kalender-ICS-Feed für Termine einbinden.",
                  icalActive,
                  setIcalActive,
                  <Link2 size={18} />
                )}

                {icalActive && (
                  <div style={{ marginLeft: '12px', paddingLeft: '24px', borderLeft: `2px dashed ${brandColor}50`, display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.2s ease-out' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>iCal Kalender-Link (ICS Feed)</label>
                    <input 
                      type="url"
                      value={calendarUrl}
                      onChange={e => setCalendarUrl(e.target.value)}
                      placeholder="https://example.com/calendar.ics"
                      style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: 650, fontSize: '0.85rem', outline: 'none', background: '#f8fafc', maxWidth: '600px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {settingsTab === 'communication' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>Kommunikation</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Bestimme, wie Lehrer und Schüler miteinander kommunizieren.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {renderToggleRow(
                  "Schüler-zu-Lehrer Chat",
                  "Schülern erlauben, eigenständig Direktnachrichten-Chats mit Lehrern zu starten.",
                  studentToTeacherChat,
                  setStudentToTeacherChat,
                  <MessageSquare size={18} />
                )}

                {renderToggleRow(
                  "Ausfall-Benachrichtigung",
                  "Schüler & Eltern automatisch informieren, wenn ein Lehrer ausfällt.",
                  autoCancelAlerts,
                  setAutoCancelAlerts,
                  <Bell size={18} />
                )}
              </div>
            </div>
          )}

          {settingsTab === 'gamification' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>Motivation &amp; Spiel</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Aktiviere spielerische Motivationselemente für deine Schüler.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {renderToggleRow(
                  "Übungs-Flames (Streaks)",
                  "Tägliche Übungsserien-Flammen in der Schüler-App anzeigen.",
                  flamesActive,
                  setFlamesActive,
                  <Flame size={18} />
                )}

                {renderToggleRow(
                  "XP- & Level-System",
                  "Erfahrungspunkte und Level-Aufstiege für Schüler aktivieren.",
                  xpActive,
                  setXpActive,
                  <Award size={18} />
                )}

                {renderToggleRow(
                  "Schul-Rangliste (Leaderboard)",
                  "Die Bestenliste für alle Schüler in der App sichtbar machen.",
                  showLeaderboard,
                  setShowLeaderboard,
                  <Users size={18} />
                )}

                {renderToggleRow(
                  "Detaillierte Schüler-Statistiken",
                  "Schülern den Zugriff auf ihre eigene detaillierte Übungshistorie erlauben.",
                  showDetailedStats,
                  setShowDetailedStats,
                  <Clock size={18} />
                )}
              </div>
            </div>
          )}

          {settingsTab === 'datenschutz' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>Datenschutz &amp; Sicherheits-Cockpit</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Transparente Übersicht deiner aktiven Datenschutz-Standards &amp; Schutzschirme.</p>
              </div>

              {/* Visual Enterprise Audit Status Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
                borderRadius: '16px',
                padding: '16px 20px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 4px 12px rgba(4, 120, 87, 0.15)'
              }}>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a7f3d0' }}>
                    Enterprise Sicherheits-Status
                  </span>
                  <h4 style={{ margin: '2px 0 0 0', fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>
                    🛡️ 21 / 21 DSGVO & IT-Sicherheits-Standards Aktiv
                  </h4>
                </div>
                <span style={{
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  whiteSpace: 'nowrap'
                }}>
                  100% ISO 27001 (Hetzner DE)
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Active Guarantees Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.86rem', color: '#1e293b' }}>Schülernamen-Schutz</strong>
                      <span style={{ fontSize: '0.7rem', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>AKTIV</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', lineHeight: '1.4' }}>
                      Alle Schülernamen im Lehrer-Dashboard werden automatisch als "Vorname + 1. Buchstabe Nachname" (z. B. Max M.) gekürzt.
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.86rem', color: '#1e293b' }}>CSP &amp; XSS-Schutz</strong>
                      <span style={{ fontSize: '0.7rem', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>AKTIV</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', lineHeight: '1.4' }}>
                      Strikte Content Security Policy (Browser-Level) unterbindet unerlaubte Skripte und externen Datenabfluss.
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.86rem', color: '#1e293b' }}>Append-Only Audit Logs</strong>
                      <span style={{ fontSize: '0.7rem', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>AKTIV</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', lineHeight: '1.4' }}>
                      Revisionssichere Append-Only Audit-Logs mit SHA-256 Hash-Sicherung verhindern nachträgliches Ändern von Protokollen.
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.86rem', color: '#1e293b' }}>Hardware-Mikrofonschutz</strong>
                      <span style={{ fontSize: '0.7rem', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>AKTIV</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', lineHeight: '1.4' }}>
                      Die Audio-Loopstation stoppt den Mikrofonzugriff beim Verlassen des Moduls oder Reiters sofort und vollständig.
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.86rem', color: '#1e293b' }}>0% Sensible Daten</strong>
                      <span style={{ fontSize: '0.7rem', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>GESCHÜTZT</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', lineHeight: '1.4' }}>
                      Es werden keinerlei E-Mail-Adressen, SEPA- oder Zahlungsdaten deiner Schüler im System gespeichert.
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.86rem', color: '#1e293b' }}>Server &amp; Offsite-Backups</strong>
                      <span style={{ fontSize: '0.7rem', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>ISO 27001</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', lineHeight: '1.4' }}>
                      100% deutsches Hosting in Hetzner-Rechenzentren inkl. täglicher automatisierter Backups.
                    </p>
                  </div>
                </div>

                {/* Only render AVV banner if user is admin/secretary */}
                {(admin?.role === 'admin' || admin?.role === 'secretary') && (
                  <div style={{ 
                    background: '#e6f4ea', 
                    border: '1px solid #a7f3d0', 
                    borderRadius: '16px', 
                    padding: '16px', 
                    fontSize: '0.76rem',
                    color: '#34a853',
                    lineHeight: '1.45'
                  }}>
                    <strong style={{ fontSize: '0.82rem', display: 'block', marginBottom: '4px', color: '#34a853' }}>Auftragsverarbeitungsvereinbarung (AVV nach Art. 28 DSGVO)</strong>
                    Der AVV (inkl. Hetzner Falkenstein Server-Hosting) wurde für deine Schule während der Freischaltung digital gezeichnet.
                  </div>
                )}

                {/* DSB Freigabepaket Download Card */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
                  border: '1.5px solid #86efac', 
                  borderRadius: '16px', 
                  padding: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginTop: '8px'
                }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '0.86rem', color: '#166534', display: 'block', marginBottom: '2px' }}>📄 DSB-Freigabepaket (Für städtische Träger &amp; Kommunen)</strong>
                    <span style={{ fontSize: '0.74rem', color: '#15803d', display: 'block' }}>Vorgefertigtes Freigabe-Dossier inkl. Muster-DSFA (Art. 35 DSGVO), TOM-Datenblatt (Art. 32 DSGVO) &amp; AVV-Bestätigung (Art. 28 DSGVO) als PDF.</span>
                  </div>
                  <button 
                    onClick={() => {
                      generateDSBCompliancePDF(schoolName || 'Meine Musikschule');
                    }}
                    style={{ 
                      padding: '10px 18px',
                      background: '#34a853',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(52, 168, 83, 0.3)',
                      transition: 'transform 0.15s',
                      whiteSpace: 'nowrap'
                    }}
                    className="hover-scale"
                  >
                    DSB-Dossier (PDF)
                  </button>
                </div>

                {/* Optional Fallback Download Card */}
                <div style={{ 
                  background: '#fefce8', 
                  border: '1px solid #fef08a', 
                  borderRadius: '16px', 
                  padding: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginTop: '8px'
                }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '0.84rem', color: '#854d0e', display: 'block', marginBottom: '2px' }}>Papier-Einwilligung (Notfall-Vorlage)</strong>
                    <span style={{ fontSize: '0.72rem', color: '#a16207', display: 'block' }}>Für Ausnahmefälle (Eltern ohne Smartphone): Vorlage als PDF zum Ausdrucken und Unterschreiben.</span>
                  </div>
                  <button 
                    onClick={() => {
                      const hasCampus = effectiveSchool?.has_campus_subscription ?? false;
                      const hasGroove = effectiveSchool?.has_groovelab_subscription ?? false;
                      const activePlat = (!hasCampus && hasGroove) ? 'groovelab' : (hasCampus && !hasGroove) ? 'campus' : 'both';
                      generateConsentPDF(schoolName || 'Meine Musikschule', activePlat, effectiveSchool?.student_billing_option);
                    }}
                    style={{ 
                      padding: '8px 16px',
                      background: '#eab308',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(234, 179, 8, 0.2)',
                      transition: 'transform 0.15s'
                    }}
                    className="hover-scale"
                  >
                    PDF Laden
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PERSISTENT BOTTOM SAVE BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobileDevice ? '12px 16px' : '16px 40px',
        marginTop: '16px',
        border: '1px solid #e2e8f0',
        background: isSettingsDirty ? '#fef2f2' : '#f8fafc',
        borderRadius: '20px',
        transition: 'background-color 0.3s ease',
        gap: '12px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {isSettingsDirty ? (
          <span style={{ fontSize: isMobileDevice ? '0.75rem' : '0.82rem', color: '#ea4335', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            ⚠️ Ungespeicherte Änderungen.
          </span>
        ) : (
          <span style={{ fontSize: isMobileDevice ? '0.75rem' : '0.82rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            ✓ Alle Änderungen gespeichert.
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={!isSettingsDirty || isSaving}
          style={{
            padding: isMobileDevice ? '8px 16px' : '10px 24px',
            background: isSettingsDirty ? brandColor : '#cbd5e1',
            color: isSettingsDirty ? 'white' : '#94a3b8',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: isMobileDevice ? '0.78rem' : '0.84rem',
            cursor: isSettingsDirty ? 'pointer' : 'default',
            boxShadow: isSettingsDirty ? `0 4px 12px ${brandColor}40` : 'none',
            transition: 'all 0.2s',
            opacity: isSaving ? 0.7 : 1,
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
          className={isSettingsDirty ? "hover-scale" : ""}
        >
          {isSaving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}

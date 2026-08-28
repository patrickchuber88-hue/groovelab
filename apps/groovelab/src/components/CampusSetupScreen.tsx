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
  Link2,
  X,
  ShieldCheck,
  Lightbulb,
  BookOpen
} from 'lucide-react';
import { generateConsentPDF, generateDSBCompliancePDF } from '../utils/pdfGenerator';
import { FeedbackHubModal } from './feedback/FeedbackHubModal';
import { HelpCenterModal } from './help/HelpCenterModal';

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
  const [activeCampusSettingsModal, setActiveCampusSettingsModal] = useState<'calendar' | 'communication' | 'gamification' | 'datenschutz' | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState<boolean>(false);
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
    <div style={{ marginTop: '0px', display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', boxSizing: 'border-box' }}>
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', textAlign: 'left' }}>
          ⚙️ Campus-Einstellungen
        </h2>
        <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>
          Konfiguriere Kalender-Sync, Schüler-Kommunikation, Motivation & Gamification sowie DSGVO-Standards für deine Schule.
        </p>
      </div>

      {/* MODULAR COVER CARDS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobileDevice ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '18px',
        width: '100%'
      }}>
        {[
          {
            id: 'calendar',
            title: 'Stundenplan & Sync',
            subtitle: icalActive ? 'iCal Kalender aktiv' : 'Manuelle Termine',
            badge: icalActive ? 'Live-Sync' : 'Lokal',
            gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            shadowColor: 'rgba(16, 185, 129, 0.40)',
            icon: Clock
          },
          {
            id: 'communication',
            title: 'Kommunikation & Chat',
            subtitle: studentToTeacherChat ? 'Direktnachrichten aktiv' : 'Nur Lehrer-Nachrichten',
            badge: studentToTeacherChat ? 'Freigeschaltet' : 'Eingeschränkt',
            gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            shadowColor: 'rgba(59, 130, 246, 0.40)',
            icon: MessageSquare
          },
          {
            id: 'gamification',
            title: 'Motivation & XP',
            subtitle: (flamesActive && xpActive) ? 'Flames & Level aktiv' : 'Teilweise aktiv',
            badge: (flamesActive && xpActive) ? 'Voll Aktiv' : 'Konfigurieren',
            gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            shadowColor: 'rgba(245, 158, 11, 0.40)',
            icon: Flame
          },
          {
            id: 'datenschutz',
            title: 'Datenschutz & AVV',
            subtitle: '21/21 DSGVO Standards',
            badge: '100% DSGVO',
            gradient: 'linear-gradient(135deg, #34a853 0%, #15803d 100%)',
            shadowColor: 'rgba(52, 168, 83, 0.40)',
            icon: ShieldCheck
          },
          {
            id: 'feedback',
            title: 'Ideenschmiede',
            subtitle: 'Wünsche & Fehler melden',
            badge: 'Mitgestalten',
            gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
            shadowColor: 'rgba(236, 72, 153, 0.40)',
            icon: Lightbulb
          }
        ].map((module) => {
          const IconComp = module.icon;
          return (
            <div
              key={module.id}
              onClick={() => {
                if (module.id === 'feedback') {
                  setIsFeedbackModalOpen(true);
                } else {
                  setSettingsTab(module.id as any);
                  setActiveCampusSettingsModal(module.id as any);
                }
              }}
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '20px',
                padding: '24px 16px 20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative'
              }}
              className="hover-scale"
            >
              {/* Square Cover Icon Box */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: module.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
                boxShadow: `0 8px 20px -4px ${module.shadowColor}`
              }}>
                <IconComp size={30} color="#ffffff" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
              </div>

              {/* Status Badge */}
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '3px 9px',
                borderRadius: '100px',
                background: '#e6f4ea',
                color: '#15803d',
                marginBottom: '10px',
                letterSpacing: '0.02em',
                textTransform: 'uppercase'
              }}>
                {module.badge}
              </span>

              {/* Title & Subtitle */}
              <h3 style={{
                margin: '0 0 4px 0',
                fontSize: '1.05rem',
                fontWeight: 900,
                color: '#0f172a',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '-0.01em'
              }}>
                {module.title}
              </h3>
              <p style={{
                margin: 0,
                fontSize: '0.78rem',
                color: '#64748b',
                fontWeight: 600,
                lineHeight: '1.35'
              }}>
                {module.subtitle}
              </p>
            </div>
          );
        })}
      </div>

      {/* PERSISTENT BOTTOM SAVE BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobileDevice ? '12px 16px' : '16px 40px',
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
            ⚠️ Ungespeicherte Änderungen vorhanden.
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

      {/* QUICK LINK: HANDBUCH & AKADEMIE */}
      <div style={{ 
        background: '#f0fdf4', 
        borderRadius: '20px', 
        padding: '18px 24px', 
        border: '1.5px solid #bbf7d0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: brandColor, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#14532d' }}>
              Leitfäden &amp; Akademie (Offizielles Handbuch)
            </h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#166534' }}>
              Schritt-für-Schritt-Anleitungen für Schulleitung, Kollegium und Eltern sowie FAQ und DSGVO-Standards.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsHelpCenterOpen(true)}
          style={{
            background: brandColor,
            color: '#ffffff',
            border: 'none',
            padding: '9px 18px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(52, 168, 83, 0.25)',
            transition: 'all 0.15s'
          }}
          className="hover-scale"
        >
          <BookOpen size={14} /> Leitfäden öffnen
        </button>
      </div>

      {/* FOCUS MODAL */}
      {activeCampusSettingsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveCampusSettingsModal(null);
            }
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: activeCampusSettingsModal === 'datenschutz' ? '860px' : '680px',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
            className="animation-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: activeCampusSettingsModal === 'calendar'
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : activeCampusSettingsModal === 'communication'
                    ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                    : activeCampusSettingsModal === 'gamification'
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(135deg, #34a853 0%, #15803d 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}>
                  {activeCampusSettingsModal === 'calendar' && <Clock size={20} color="#ffffff" />}
                  {activeCampusSettingsModal === 'communication' && <MessageSquare size={20} color="#ffffff" />}
                  {activeCampusSettingsModal === 'gamification' && <Flame size={20} color="#ffffff" />}
                  {activeCampusSettingsModal === 'datenschutz' && <ShieldCheck size={20} color="#ffffff" />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {activeCampusSettingsModal === 'calendar' && 'Stundenplan & Kalender-Sync'}
                    {activeCampusSettingsModal === 'communication' && 'Kommunikation & Chat'}
                    {activeCampusSettingsModal === 'gamification' && 'Motivation & Spiel (Gamification)'}
                    {activeCampusSettingsModal === 'datenschutz' && 'Datenschutz & Sicherheits-Cockpit'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    {activeCampusSettingsModal === 'calendar' && 'Wochenend-Anzeige und iCal Synchronisation verwalten.'}
                    {activeCampusSettingsModal === 'communication' && 'Bestimme, wie Lehrer und Schüler miteinander kommunizieren.'}
                    {activeCampusSettingsModal === 'gamification' && 'Aktiviere spielerische Motivationselemente für deine Schüler.'}
                    {activeCampusSettingsModal === 'datenschutz' && 'Transparente Übersicht deiner aktiven Datenschutz-Standards & Schutzschirme.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveCampusSettingsModal(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
                className="hover-scale"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, textAlign: 'left' }}>
              {activeCampusSettingsModal === 'calendar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                          style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: 650, fontSize: '0.85rem', outline: 'none', background: '#f8fafc', width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeCampusSettingsModal === 'communication' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

              {activeCampusSettingsModal === 'gamification' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                      "Klassen-Highlights & Team-Power",
                      "Gemeinsame Übe-Erfolge und Team-Highlights für Schüler in der App sichtbar machen.",
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

              {activeCampusSettingsModal === 'datenschutz' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                      ISO 27001 Rechenzentrum (DE)
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
                          <span style={{ fontSize: '0.7rem', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>ISO 27001 RZ</span>
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
                        onClick={async () => {
                          await generateDSBCompliancePDF(schoolName || 'Meine Musikschule');
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

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                onClick={() => setActiveCampusSettingsModal(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                className="hover-scale"
              >
                Schließen
              </button>
              <button
                onClick={async () => {
                  await handleSave();
                  setActiveCampusSettingsModal(null);
                }}
                disabled={!isSettingsDirty || isSaving}
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isSettingsDirty ? brandColor : '#cbd5e1',
                  color: isSettingsDirty ? '#ffffff' : '#94a3b8',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: isSettingsDirty ? 'pointer' : 'default',
                  boxShadow: isSettingsDirty ? `0 4px 12px ${brandColor}40` : 'none'
                }}
                className={isSettingsDirty ? "hover-scale" : ""}
              >
                {isSaving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ideenschmiede & Feedback Modal */}
      <FeedbackHubModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        userRole={admin?.role || 'teacher'}
        userId={admin?.id || admin?.userId}
        userName={`${admin?.first_name || ''} ${admin?.last_name || ''}`.trim() || 'Lehrkraft'}
        schoolId={effectiveSchool?.id || admin?.school_id}
        schoolName={effectiveSchool?.name || ''}
        activePlatform="campus"
      />

      {/* Leitfäden & Akademie Modal */}
      <HelpCenterModal
        isOpen={isHelpCenterOpen}
        onClose={() => setIsHelpCenterOpen(false)}
        userRole="admin"
        activePlatform="campus"
        schoolName={effectiveSchool?.name || schoolName || ''}
        onOpenFeedbackHub={() => {
          setIsHelpCenterOpen(false);
          setIsFeedbackModalOpen(true);
        }}
      />
    </div>
  );
}

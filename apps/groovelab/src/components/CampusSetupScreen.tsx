import React, { useState, useEffect, useCallback } from 'react';
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
  BookOpen,
  Key,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Lock,
  Shield
} from 'lucide-react';
import { generateConsentPDF, generateDSBCompliancePDF } from '../utils/pdfGenerator';
import { isWebAuthnSupported, registerBiometrics } from '../utils/webauthn';
import { CourtProofExportModal } from './admin/CourtProofExportModal';

const FeedbackHubModal = React.lazy(() => import('./feedback/FeedbackHubModal').then(m => ({ default: m.FeedbackHubModal })));
const HelpCenterModal = React.lazy(() => import('./help/HelpCenterModal').then(m => ({ default: m.HelpCenterModal })));

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
  const [settingsTab, setSettingsTab] = useState<'calendar' | 'communication' | 'gamification' | 'datenschutz' | 'pin_login'>('calendar');
  const [activeCampusSettingsModal, setActiveCampusSettingsModal] = useState<'calendar' | 'communication' | 'gamification' | 'datenschutz' | 'pin_login' | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState<boolean>(false);
  const [initialConfig, setInitialConfig] = useState<any>(null);
  const [showCourtProofExportModal, setShowCourtProofExportModal] = useState<boolean>(false);

  // Security, PIN & Passkey management state
  const [securityOverview, setSecurityOverview] = useState<{
    has_personal_pin?: boolean;
    has_passkey?: boolean;
    passkey_count?: number;
    passkeys?: Array<{ id: string; device_name: string; created_at: string; counter?: number }>;
    ausweis_nummer?: string;
  } | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [pinSuccessMessage, setPinSuccessMessage] = useState<string | null>(null);
  const [pinErrorMessage, setPinErrorMessage] = useState<string | null>(null);
  const [newPinInput, setNewPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);
  const [revokingPasskey, setRevokingPasskey] = useState(false);

  const currentUserId = admin?.id || admin?.userId;

  const fetchSecurityOverview = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoadingSecurity(true);
      const { data, error } = await supabase.rpc('get_teacher_security_overview', {
        p_teacher_id: currentUserId
      });
      if (!error && data?.success) {
        setSecurityOverview(data);
      }
    } catch (err: any) {
      console.warn('[CampusSetupScreen] get_teacher_security_overview fallback:', err?.message || err);
    } finally {
      setLoadingSecurity(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchSecurityOverview();
  }, [fetchSecurityOverview]);

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
            badge: 'DSGVO-Audit',
            gradient: 'linear-gradient(135deg, #34a853 0%, #15803d 100%)',
            shadowColor: 'rgba(52, 168, 83, 0.40)',
            icon: ShieldCheck
          },
          {
            id: 'pin_login',
            title: 'PIN & Login',
            subtitle: (securityOverview?.has_personal_pin || admin?.has_personal_pin)
              ? (securityOverview?.has_passkey ? '4-stellige PIN & Passkey aktiv' : '4-stellige PIN aktiv • Passkey hinzufügen')
              : (securityOverview?.has_passkey ? 'Passkey aktiv • PIN einrichten' : 'PIN & Passkey einrichten'),
            badge: (securityOverview?.has_personal_pin || admin?.has_personal_pin) ? 'PIN Aktiv ✓' : 'Sicherheit',
            gradient: 'linear-gradient(135deg, #ca8a04 0%, #854d0e 100%)',
            shadowColor: 'rgba(202, 138, 4, 0.40)',
            icon: Key
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
                    : activeCampusSettingsModal === 'pin_login'
                    ? 'linear-gradient(135deg, #ca8a04 0%, #854d0e 100%)'
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
                  {activeCampusSettingsModal === 'pin_login' && <Key size={20} color="#ffffff" />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {activeCampusSettingsModal === 'calendar' && 'Stundenplan & Kalender-Sync'}
                    {activeCampusSettingsModal === 'communication' && 'Kommunikation & Chat'}
                    {activeCampusSettingsModal === 'gamification' && 'Motivation & Spiel (Gamification)'}
                    {activeCampusSettingsModal === 'datenschutz' && 'Datenschutz & Sicherheits-Cockpit'}
                    {activeCampusSettingsModal === 'pin_login' && 'PIN & Login-Sicherheit'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    {activeCampusSettingsModal === 'calendar' && 'Wochenend-Anzeige und iCal Synchronisation verwalten.'}
                    {activeCampusSettingsModal === 'communication' && 'Bestimme, wie Lehrer und Schüler miteinander kommunizieren.'}
                    {activeCampusSettingsModal === 'gamification' && 'Aktiviere spielerische Motivationselemente für deine Schüler.'}
                    {activeCampusSettingsModal === 'datenschutz' && 'Transparente Übersicht deiner aktiven Datenschutz-Standards & Schutzschirme.'}
                    {activeCampusSettingsModal === 'pin_login' && 'Verwalte deine 4-stellige persönliche PIN, Passkeys (Apple Touch ID / Face ID) und Bildschirmsperre.'}
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
                          Revisionssichere Append-Only Audit-Logs mit SHA-512 / SHA-256 Hash-Sicherung verhindern nachträgliches Ändern von Protokollen.
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

                    {/* Gerichtsverwertbarer Mandanten-Export Card (DSGVO Art. 20 / SHA-256) */}
                    <div style={{ 
                      background: '#f8fafc', 
                      border: '1.5px solid #cbd5e1', 
                      borderRadius: '16px', 
                      padding: '16px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginTop: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ flex: '1 1 300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Shield size={16} color="#2563eb" />
                          <strong style={{ fontSize: '0.84rem', color: '#1e293b' }}>
                            Gerichtsverwertbarer Mandanten-Export (SHA-256)
                          </strong>
                          <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '6px', fontWeight: 800 }}>
                            DSGVO Art. 20 / 28
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', lineHeight: '1.4' }}>
                          Revisionssicher signiertes JSON-Dossier aller Schulstammdaten, Räume, Schüler und Terminhistorien mit kryptografischem Prüfsummen-Siegel für DPOs, Schulbehörden &amp; Gerichte.
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowCourtProofExportModal(true)}
                        style={{ 
                          padding: '10px 18px',
                          background: '#1e293b',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(30, 41, 59, 0.2)',
                          transition: 'transform 0.15s',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        className="hover-scale"
                      >
                        <Shield size={14} />
                        <span>Dossier exportieren</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PIN & LOGIN SICHERHEIT */}
              {activeCampusSettingsModal === 'pin_login' && (() => {
                const hasPin = Boolean(securityOverview?.has_personal_pin || admin?.has_personal_pin);
                const passkeyCount = securityOverview?.passkey_count || (securityOverview?.passkeys?.length || 0);
                const hasPasskeys = Boolean(securityOverview?.has_passkey || passkeyCount > 0);

                // Handler: Save 4-digit Personal PIN via authoritative Server RPC
                const handleSavePin = async (e?: React.FormEvent) => {
                  if (e) e.preventDefault();
                  if (savingPin || !currentUserId) return;
                  const cleanPin = newPinInput.trim();

                  if (!/^\d{4}$/.test(cleanPin)) {
                    setPinErrorMessage('Bitte gib eine gültige 4-stellige Zahlen-PIN ein (z. B. 4829).');
                    setPinSuccessMessage(null);
                    return;
                  }

                  const trivialPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
                  if (trivialPins.includes(cleanPin)) {
                    setPinErrorMessage('Diese PIN ist zu einfach zu erraten (bitte keine Reihen wie 1234 oder 0000 wählen).');
                    setPinSuccessMessage(null);
                    return;
                  }

                  setSavingPin(true);
                  setPinErrorMessage(null);
                  setPinSuccessMessage(null);

                  let rpcSuccess = false;
                  let rpcErrorMsg = '';

                  try {
                    // 1. Primary RPC: set_personal_pin(p_user_id, p_pin)
                    const { data: res1, error: err1 } = await supabase.rpc('set_personal_pin', {
                      p_user_id: currentUserId,
                      p_pin: cleanPin
                    });

                    if (!err1 && res1 === true) {
                      rpcSuccess = true;
                    } else if (err1) {
                      // 2. Secondary fallback RPC: set_personal_pin(p_user_id, p_new_pin)
                      const { data: res2, error: err2 } = await supabase.rpc('set_personal_pin', {
                        p_user_id: currentUserId,
                        p_new_pin: cleanPin
                      });
                      if (!err2 && res2 === true) {
                        rpcSuccess = true;
                      } else {
                        rpcErrorMsg = err2?.message || err1?.message || 'Serverfehler beim Speichern der PIN.';
                      }
                    } else {
                      rpcErrorMsg = 'Server hat die PIN-Aktualisierung nicht bestätigt.';
                    }
                  } catch (err: any) {
                    rpcErrorMsg = err?.message || 'Verbindungsfehler beim Speichern der PIN.';
                  } finally {
                    setSavingPin(false);
                  }

                  if (rpcSuccess) {
                    setPinSuccessMessage('Deine 4-stellige PIN wurde erfolgreich und sicher auf dem Server gespeichert!');
                    setNewPinInput('');
                    if (admin) admin.has_personal_pin = true;
                    setSecurityOverview((prev: any) => prev ? { ...prev, has_personal_pin: true } : { has_personal_pin: true });
                    await fetchSecurityOverview();
                  } else {
                    setPinErrorMessage(rpcErrorMsg || 'Fehler beim Speichern der PIN. Bitte versuche es erneut.');
                  }
                };

                // Handler: Register Biometric Passkey (Touch ID / Face ID)
                const handleRegisterPasskey = async () => {
                  if (registeringPasskey || !currentUserId) return;
                  if (!isWebAuthnSupported()) {
                    alert('WebAuthn / Biometrie wird von diesem Browser oder Gerät leider nicht unterstützt.');
                    return;
                  }

                  setRegisteringPasskey(true);
                  try {
                    // 1. Request registration challenge from server
                    const { data: chalData, error: chalErr } = await supabase.rpc('generate_webauthn_challenge', {
                      p_user_id: currentUserId,
                      p_type: 'register'
                    });
                    if (chalErr || !chalData?.challenge) {
                      throw new Error('Sicherheits-Challenge konnte nicht bezogen werden: ' + (chalErr?.message || 'Serverfehler'));
                    }

                    const email = admin?.email || `benutzer.${currentUserId.substring(0, 8)}@campus-groovelab.local`;
                    const userName = `${admin?.first_name || ''} ${admin?.last_name || ''}`.trim() || 'Benutzer';

                    const passkeyResult = await registerBiometrics(
                      email,
                      currentUserId,
                      chalData.challenge,
                      `${userName} (${admin?.role === 'admin' ? 'Schulleitung' : 'Lehrkraft'})`
                    );

                    const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
                    const deviceName = isIOS ? 'Apple Touch ID / Face ID' : 'Passkey Authenticator';

                    const { data: regResult, error: regErr } = await supabase.rpc('register_webauthn_credential', {
                      p_user_id: currentUserId,
                      p_credential_id: passkeyResult.id,
                      p_public_key: JSON.stringify(passkeyResult.response),
                      p_device_name: deviceName,
                      p_challenge: chalData.challenge
                    });

                    if (regErr || !regResult?.success) {
                      throw new Error(regErr?.message || regResult?.error || 'Registrierung fehlgeschlagen.');
                    }

                    alert('Erfolg: Dein biometrischer Passkey wurde erfolgreich auf diesem Gerät aktiviert!');
                    await fetchSecurityOverview();
                  } catch (err: any) {
                    if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
                      return;
                    }
                    alert('Passkey-Einrichtung fehlgeschlagen: ' + err.message);
                  } finally {
                    setRegisteringPasskey(false);
                  }
                };

                // Handler: Revoke all passkeys
                const handleRevokePasskeys = async () => {
                  if (revokingPasskey || !currentUserId) return;
                  const userName = `${admin?.first_name || ''} ${admin?.last_name || ''}`.trim() || 'dein Konto';
                  if (!confirm(`Möchtest du alle biometrischen Passkeys für ${userName} widerrufen? Dadurch werden alle verknüpften Passkey-Geräte gelöscht und aktive Sitzungen auf anderen Geräten zur Sicherheit beendet.`)) {
                    return;
                  }

                  setRevokingPasskey(true);
                  try {
                    const { data, error } = await supabase.rpc('revoke_teacher_passkeys', {
                      p_teacher_id: currentUserId
                    });
                    if (error) throw error;
                    alert(`Erfolg: ${data?.message || 'Alle Passkeys wurden erfolgreich widerrufen.'}`);
                    await fetchSecurityOverview();
                  } catch (err: any) {
                    alert('Fehler beim Widerrufen der Passkeys: ' + err.message);
                  } finally {
                    setRevokingPasskey(false);
                  }
                };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* 1. STATUS & ARCHITEKTUR BANNER */}
                    <div style={{
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '18px',
                      padding: '20px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '260px' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: '#fefce8',
                          border: '1px solid #fef08a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ca8a04',
                          flexShrink: 0
                        }}>
                          <ShieldCheck size={26} strokeWidth={2.4} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.96rem', color: '#0f172a' }}>PIN &amp; Login-Sicherheitsstatus</strong>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              padding: '3px 10px',
                              borderRadius: '999px',
                              background: hasPin ? '#dcfce7' : '#fef3c7',
                              color: hasPin ? '#15803d' : '#b45309',
                              border: `1px solid ${hasPin ? '#bbf7d0' : '#fde68a'}`
                            }}>
                              {hasPin ? 'PIN Aktiviert ✓' : 'PIN nicht hinterlegt'}
                            </span>
                            {hasPasskeys && (
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: '999px',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                border: '1px solid #bae6fd'
                              }}>
                                {passkeyCount} Passkey(s) aktiv ✓
                              </span>
                            )}
                          </div>
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                            Mit deiner persönlichen 4-stelligen PIN und Touch ID / Face ID entsperrst du deinen Arbeitsplatz nach Inaktivität (45-Minuten-Sperrbildschirm) sowie Proberaum-Kiosks sekundenschnell ohne Passworteingabe.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={fetchSecurityOverview}
                        disabled={loadingSecurity}
                        title="Sicherheitsstatus neu laden"
                        aria-label="Sicherheitsstatus neu laden"
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#64748b',
                          fontSize: '0.76rem',
                          fontWeight: 750,
                          cursor: loadingSecurity ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <RefreshCw size={14} className={loadingSecurity ? 'animate-spin' : ''} />
                        <span>Aktualisieren</span>
                      </button>
                    </div>

                    {/* 2. PERSÖNLICHE 4-STELLIGE PIN VERWALTEN */}
                    <div style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '18px',
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: '#fefce8',
                            border: '1px solid #fef08a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ca8a04'
                          }}>
                            <Key size={20} strokeWidth={2.3} />
                          </div>
                          <div>
                            <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>Persönliche 4-stellige PIN</strong>
                            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Schnell-Entsperrung für Bildschirmsperre &amp; iPads</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {hasPin ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '3px 10px', borderRadius: '100px', border: '1px solid #bbf7d0' }}>
                              <CheckCircle2 size={14} /> Aktiviert
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '3px 10px', borderRadius: '100px', border: '1px solid #fde68a' }}>
                              <AlertCircle size={14} /> Keine PIN hinterlegt
                            </span>
                          )}
                        </div>
                      </div>

                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                        Lege eine 4-stellige PIN fest. Wird dein Bildschirm nach 45 Minuten Inaktivität gesperrt, kannst du ihn mit dieser PIN in 2 Sekunden wieder entsperren.
                      </p>

                      {pinSuccessMessage && (
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: '12px',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          color: '#15803d',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                          <span>{pinSuccessMessage}</span>
                        </div>
                      )}

                      {pinErrorMessage && (
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: '12px',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#b91c1c',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <AlertCircle size={18} style={{ flexShrink: 0 }} />
                          <span>{pinErrorMessage}</span>
                        </div>
                      )}

                      <form onSubmit={handleSavePin} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                        <div style={{ position: 'relative', width: '180px' }}>
                          <input
                            type={showPin ? 'text' : 'password'}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            placeholder="••••"
                            value={newPinInput}
                            onChange={(e) => {
                              const filtered = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setNewPinInput(filtered);
                              if (pinErrorMessage) setPinErrorMessage(null);
                              if (pinSuccessMessage) setPinSuccessMessage(null);
                            }}
                            disabled={savingPin}
                            aria-label="Neue 4-stellige PIN"
                            style={{
                              width: '100%',
                              padding: '12px 42px 12px 16px',
                              borderRadius: '12px',
                              border: '1.5px solid #cbd5e1',
                              background: '#ffffff',
                              fontSize: '1.25rem',
                              fontWeight: 900,
                              textAlign: 'center',
                              letterSpacing: '8px',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            aria-label={showPin ? 'PIN verbergen' : 'PIN anzeigen'}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: '#64748b',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={savingPin || newPinInput.trim().length !== 4}
                          style={{
                            padding: '12px 22px',
                            minHeight: '46px',
                            borderRadius: '12px',
                            background: newPinInput.trim().length === 4 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e2e8f0',
                            color: newPinInput.trim().length === 4 ? '#ffffff' : '#94a3b8',
                            border: 'none',
                            fontWeight: 850,
                            fontSize: '0.86rem',
                            cursor: savingPin || newPinInput.trim().length !== 4 ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: newPinInput.trim().length === 4 ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none',
                            transition: 'all 0.15s ease',
                            touchAction: 'manipulation'
                          }}
                        >
                          {savingPin ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                          <span>{hasPin ? 'Neue PIN speichern' : 'PIN aktivieren'}</span>
                        </button>
                      </form>
                    </div>

                    {/* 3. BIOMETRISCHER PASSKEY (APPLE TOUCH ID / FACE ID) */}
                    <div style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '18px',
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#16a34a'
                          }}>
                            <Fingerprint size={22} strokeWidth={2.3} />
                          </div>
                          <div>
                            <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>Biometrischer Passkey (Touch ID / Face ID)</strong>
                            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Passwortloser Zugang mit Fingerabdruck oder Gesichtsscan</span>
                          </div>
                        </div>
                        <div>
                          {isWebAuthnSupported() ? (
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '100px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                              Gerät unterstützt Biometrie ✓
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '100px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                              Nicht unterstützt
                            </span>
                          )}
                        </div>
                      </div>

                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                        Verknüpfe dieses Gerät (MacBook, iPad, iPhone oder Windows PC) mit deinem persönlichen biometrischen Passkey. Deine Biometrie verbleibt zu 100 % lokal auf deinem Endgerät und wird niemals über das Netzwerk übertragen (Art. 9 DSGVO / Zero-Biometrie-Transfer).
                      </p>

                      {/* LIST OF REGISTERED PASSKEYS */}
                      {securityOverview?.passkeys && securityOverview.passkeys.length > 0 && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px' }}>
                          <strong style={{ fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                            Registrierte Geräte &amp; Passkeys ({securityOverview.passkeys.length})
                          </strong>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {securityOverview.passkeys.map((cred: any, idx: number) => (
                              <div key={cred.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Fingerprint size={16} color="#16a34a" />
                                  <span style={{ fontSize: '0.82rem', fontWeight: 750, color: '#0f172a' }}>{cred.device_name || 'Passkey-Gerät'}</span>
                                </div>
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                                  {cred.created_at ? new Date(cred.created_at).toLocaleDateString('de-DE') : 'Aktiv'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={handleRegisterPasskey}
                          disabled={registeringPasskey || !isWebAuthnSupported()}
                          style={{
                            padding: '12px 20px',
                            minHeight: '46px',
                            borderRadius: '12px',
                            background: '#1e293b',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 800,
                            fontSize: '0.84rem',
                            cursor: registeringPasskey || !isWebAuthnSupported() ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            touchAction: 'manipulation',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                        >
                          {registeringPasskey ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} />}
                          <span>Touch ID / Face ID auf diesem Gerät aktivieren</span>
                        </button>

                        {hasPasskeys && (
                          <button
                            type="button"
                            onClick={handleRevokePasskeys}
                            disabled={revokingPasskey}
                            style={{
                              padding: '12px 18px',
                              minHeight: '46px',
                              borderRadius: '12px',
                              background: 'transparent',
                              color: '#dc2626',
                              border: '1.5px solid #fecaca',
                              fontWeight: 750,
                              fontSize: '0.82rem',
                              cursor: revokingPasskey ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              touchAction: 'manipulation',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {revokingPasskey ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            <span>Alle Passkeys widerrufen</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 4. KOPPLUNG & KIOSK-INFOS */}
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>Kopplung &amp; Proberaum-Status</strong>
                      <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.5 }}>
                        Schul-ID: <strong>{sId || 'Aktiv'}</strong><br />
                        Schulausweis-ID: <strong>{securityOverview?.ausweis_nummer || admin?.ausweis_nummer || currentUserId?.substring(0, 8) || '–'}</strong><br />
                        Rolle: <strong>{admin?.role === 'admin' ? 'Schulleitung & Administration' : 'Campus Lehrkraft'}</strong><br />
                        Sperrbildschirm-Schutz: <strong>Aktiviert (45 Min. Inaktivitätssperre)</strong>
                      </span>
                    </div>
                  </div>
                );
              })()}
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
                {activeCampusSettingsModal === 'pin_login' ? 'Fertig' : 'Schließen'}
              </button>
              {activeCampusSettingsModal !== 'pin_login' && (
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ideenschmiede & Feedback Modal */}
      <React.Suspense fallback={null}>
        {isFeedbackModalOpen && (
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
        )}
      </React.Suspense>

      {/* Leitfäden & Akademie Modal */}
      <React.Suspense fallback={null}>
        {isHelpCenterOpen && (
          <HelpCenterModal
            isOpen={isHelpCenterOpen}
            onClose={() => setIsHelpCenterOpen(false)}
            userRole="admin"
            activePlatform="campus"
            initialBoardId="setup"
            schoolName={effectiveSchool?.name || schoolName || ''}
            onOpenFeedbackHub={() => {
              setIsHelpCenterOpen(false);
              setIsFeedbackModalOpen(true);
            }}
          />
        )}
      </React.Suspense>

      {/* Gerichtsverwertbarer Mandanten-Export Modal (DSGVO Art. 20 / 28) */}
      {showCourtProofExportModal && (
        <CourtProofExportModal
          isOpen={showCourtProofExportModal}
          onClose={() => setShowCourtProofExportModal(false)}
          schoolId={effectiveSchool?.id || sId || ''}
          schoolName={effectiveSchool?.name || schoolName || 'Musikschule'}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Shield, 
  Clock, 
  Settings, 
  Award, 
  Bell, 
  Zap, 
  BookOpen, 
  Check, 
  MessageSquare, 
  AlertTriangle, 
  Save, 
  Calendar, 
  UserCheck 
} from 'lucide-react';

interface CampusSetupScreenProps {
  school: any;
  admin: any;
  brandColor?: string;
  onUpdate: () => void;
}

export function CampusSetupScreen({ 
  school, 
  admin, 
  brandColor = '#22c55e', // Green by default for Campus
  onUpdate 
}: CampusSetupScreenProps) {
  const effectiveSchool = Array.isArray(school) ? school[0] : school;
  const sId = effectiveSchool?.id || admin?.school_id;

  // Sub-tabs state
  const [activeTab, setActiveTab] = useState<'general' | 'schedule' | 'gamification' | 'system'>('general');
  const [isSaving, setIsSaving] = useState(false);

  // --- State for Tab 1: Campus-Einstellungen (General Settings) ---
  const [schoolName, setSchoolName] = useState('');
  const [impressum, setImpressum] = useState('');
  const [openingHours, setOpeningHours] = useState<any>({
    monday: { start: '08:00', end: '20:00', active: true },
    tuesday: { start: '08:00', end: '20:00', active: true },
    wednesday: { start: '08:00', end: '20:00', active: true },
    thursday: { start: '08:00', end: '20:00', active: true },
    friday: { start: '08:00', end: '20:00', active: true },
    saturday: { start: '10:00', end: '16:00', active: false },
    sunday: { start: '10:00', end: '16:00', active: false }
  });

  // --- State for Tab 2: Unterrichts- & Stundenplan-Einstellungen (Schedule Settings) ---
  const [lessonDuration, setLessonDuration] = useState('45');
  const [bufferDuration, setBufferDuration] = useState('5');
  const [showWeekends, setShowWeekends] = useState(false);
  const [defaultZoom, setDefaultZoom] = useState('Standard');

  // --- State for Tab 3: Gamification- & Missions-Optionen (Engagement) ---
  const [flamesActive, setFlamesActive] = useState(true);
  const [minPracticeMinutes, setMinPracticeMinutes] = useState('10');
  const [xpMultiplier, setXpMultiplier] = useState('1.0');
  const [autoApproveMissions, setAutoApproveMissions] = useState(false);

  // --- State for Tab 4: Benachrichtigungen & System (Notifications & Strictness) ---
  const [messagingActive, setMessagingActive] = useState(true);
  const [autoCancelAlerts, setAutoCancelAlerts] = useState(true);
  const [strictCheckin, setStrictCheckin] = useState(false);

  // Populate state on load
  useEffect(() => {
    if (effectiveSchool) {
      setSchoolName(effectiveSchool.name || '');
      
      const dbHours = effectiveSchool.opening_hours || {};
      setImpressum(dbHours.impressum || '');
      
      // Separate hours and custom campus fields
      const hoursConfig: any = {};
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      weekdays.forEach(day => {
        hoursConfig[day] = dbHours[day] || { start: '08:00', end: '20:00', active: false };
      });
      setOpeningHours(hoursConfig);

      const campusConfig = dbHours.campus_settings || {};
      setLessonDuration(campusConfig.standard_lesson_duration?.toString() || '45');
      setBufferDuration(campusConfig.buffer_duration?.toString() || '5');
      setShowWeekends(!!campusConfig.show_weekends);
      setDefaultZoom(campusConfig.default_zoom || 'Standard');

      setFlamesActive(campusConfig.flames_active !== false);
      setMinPracticeMinutes(campusConfig.min_practice_minutes?.toString() || '10');
      setXpMultiplier(campusConfig.xp_multiplier?.toString() || '1.0');
      setAutoApproveMissions(!!campusConfig.auto_approve_missions);

      setMessagingActive(campusConfig.messaging_active !== false);
      setAutoCancelAlerts(campusConfig.auto_cancel_alerts !== false);
      setStrictCheckin(!!campusConfig.strict_checkin);
    }
  }, [effectiveSchool]);

  const handleSave = async () => {
    if (!sId) {
      alert('Fehler: Keine Schul-ID gefunden.');
      return;
    }
    setIsSaving(true);

    try {
      // Build updated opening_hours JSON containing hours + our custom configurations
      const updatedOpeningHours = {
        ...effectiveSchool?.opening_hours,
        ...openingHours,
        impressum,
        campus_settings: {
          standard_lesson_duration: Number(lessonDuration),
          buffer_duration: Number(bufferDuration),
          show_weekends: showWeekends,
          default_zoom: defaultZoom,
          flames_active: flamesActive,
          min_practice_minutes: Number(minPracticeMinutes),
          xp_multiplier: Number(xpMultiplier),
          auto_approve_missions: autoApproveMissions,
          messaging_active: messagingActive,
          auto_cancel_alerts: autoCancelAlerts,
          strict_checkin: strictCheckin
        }
      };

      const { error } = await supabase
        .from('schools')
        .update({
          name: schoolName,
          opening_hours: updatedOpeningHours
        })
        .eq('id', sId);

      if (error) throw error;
      alert('Campus-Setup erfolgreich gespeichert! 🌟');
      onUpdate();
    } catch (err: any) {
      console.error('Error saving campus setup:', err);
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setOpeningHours({
      ...openingHours,
      [day]: {
        ...openingHours[day],
        active: !openingHours[day].active
      }
    });
  };

  const changeTime = (day: string, type: 'start' | 'end', val: string) => {
    setOpeningHours({
      ...openingHours,
      [day]: {
        ...openingHours[day],
        [type]: val
      }
    });
  };

  const days = [
    { id: 'monday', label: 'Montag' },
    { id: 'tuesday', label: 'Dienstag' },
    { id: 'wednesday', label: 'Mittwoch' },
    { id: 'thursday', label: 'Donnerstag' },
    { id: 'friday', label: 'Freitag' },
    { id: 'saturday', label: 'Samstag' },
    { id: 'sunday', label: 'Sonntag' }
  ];

  return (
    <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Tab Navigation */}
      <div className="app-segmented-switch">
        <button
          onClick={() => setActiveTab('general')}
          className={`app-segmented-switch-btn ${activeTab === 'general' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Shield size={16} color={activeTab === 'general' ? '#1d1d1f' : '#64748b'} />
          Campus-Einstellungen
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`app-segmented-switch-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Clock size={16} color={activeTab === 'schedule' ? '#1d1d1f' : '#64748b'} />
          Stundenplan & Planer
        </button>
        <button
          onClick={() => setActiveTab('gamification')}
          className={`app-segmented-switch-btn ${activeTab === 'gamification' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Award size={16} color={activeTab === 'gamification' ? '#1d1d1f' : '#64748b'} />
          Missions & Gamification
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`app-segmented-switch-btn ${activeTab === 'system' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Settings size={16} color={activeTab === 'system' ? '#1d1d1f' : '#64748b'} />
          Benachrichtigungen & System
        </button>
      </div>

      {/* Main Settings Card */}
      <div style={{ background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.02)', padding: '36px', minHeight: '400px', position: 'relative' }}>
        
        {/* TAB 1: GENERAL SETTINGS */}
        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={20} color={brandColor} /> Campus-Einstellungen
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Passe den globalen Namen, dein Impressum und die Betriebszeiten deiner Schule an.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schulname</label>
                <input 
                  type="text" 
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  placeholder="z.B. Musäk Bad Säckingen"
                  style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', fontWeight: 650, fontSize: '0.9rem', outline: 'none', background: '#f8fafc' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campus URL Präfix (Informational)</label>
                <input 
                  type="text" 
                  disabled
                  value={`campus.groovelab.de/${effectiveSchool?.id?.substring(0, 8) || ''}`}
                  style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.9rem', color: '#94a3b8', background: '#f1f5f9' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Individuelles Impressum & Datenschutz (Optional)</label>
              <textarea 
                value={impressum}
                onChange={e => setImpressum(e.target.value)}
                placeholder="Individuelle Impressums- und Rechtsangaben für diese Schule..."
                style={{ padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.875rem', outline: 'none', background: '#f8fafc', minHeight: '120px', resize: 'vertical', lineHeight: 1.5 }}
              />
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 555 }}>Dieser Text wird auf der öffentlichen Anmeldeseite und in Einladungslinks deiner Schule angezeigt.</p>
            </div>

            {/* Opening Hours */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 16px 0' }}>Betriebs- & Öffnungszeiten</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {days.map(day => {
                  const dayConf = openingHours[day.id] || { start: '08:00', end: '20:00', active: false };
                  return (
                    <div key={day.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderRadius: '14px', background: dayConf.active ? '#f0fdf4' : '#f8fafc', border: dayConf.active ? '1px solid #bbf7d0' : '1px solid #e2e8f0', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '120px' }}>
                        <span style={{ fontWeight: 800, color: dayConf.active ? '#166534' : '#64748b', fontSize: '0.9rem' }}>{day.label}</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        {dayConf.active ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                              type="time" 
                              value={dayConf.start} 
                              onChange={e => changeTime(day.id, 'start', e.target.value)}
                              style={{ padding: '6px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 700, outline: 'none' }}
                            />
                            <span style={{ color: '#94a3b8', fontWeight: 800 }}>bis</span>
                            <input 
                              type="time" 
                              value={dayConf.end} 
                              onChange={e => changeTime(day.id, 'end', e.target.value)}
                              style={{ padding: '6px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 700, outline: 'none' }}
                            />
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Geschlossen / Kein Unterricht</span>
                        )}

                        <button
                          onClick={() => toggleDay(day.id)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '10px',
                            border: 'none',
                            fontWeight: 900,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            background: dayConf.active ? '#22c55e' : '#cbd5e1',
                            color: 'white',
                            minWidth: '70px',
                            transition: 'all 0.2s'
                          }}
                        >
                          {dayConf.active ? 'AKTIV' : 'ZU'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCHEDULE CONFIG */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={20} color={brandColor} /> Unterrichts- & Stundenplan-Einstellungen
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Stelle standardisierte Werte für Dauer, Pufferzeiten und Ansichten deines Campus-Stundenplans ein.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Standard-Unterrichtsdauer (Minuten)</label>
                <select
                  value={lessonDuration}
                  onChange={e => setLessonDuration(e.target.value)}
                  style={{ padding: '14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.9rem', background: '#f8fafc', outline: 'none' }}
                >
                  <option value="30">30 Minuten</option>
                  <option value="45">45 Minuten (Standard)</option>
                  <option value="60">60 Minuten</option>
                  <option value="90">90 Minuten</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Standard-Pufferzeit (Minuten)</label>
                <select
                  value={bufferDuration}
                  onChange={e => setBufferDuration(e.target.value)}
                  style={{ padding: '14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.9rem', background: '#f8fafc', outline: 'none' }}
                >
                  <option value="0">Kein Puffer (0 Min)</option>
                  <option value="5">5 Minuten</option>
                  <option value="10">10 Minuten</option>
                  <option value="15">15 Minuten</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wochenenden im Kalender anzeigen</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setShowWeekends(!showWeekends)}
                    className={`app-binary-switch ${showWeekends ? 'active' : ''}`}
                    style={{ backgroundColor: showWeekends ? brandColor : undefined }}
                  >
                    <div className="app-binary-switch-knob" />
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: showWeekends ? '#1e293b' : '#64748b' }}>
                    {showWeekends ? 'Samstag & Sonntag sichtbar' : 'Nur Montag bis Freitag'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Standard Kalender-Zoomstufe</label>
                <select
                  value={defaultZoom}
                  onChange={e => setDefaultZoom(e.target.value)}
                  style={{ padding: '14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.9rem', background: '#f8fafc', outline: 'none' }}
                >
                  <option value="Kompakt">Kompakt (Kürzere Zeitschlitze)</option>
                  <option value="Standard">Standard (Mittelgroß)</option>
                  <option value="Groß">Groß (Detailreiche Ansicht)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GAMIFICATION & MISSIONS */}
        {activeTab === 'gamification' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={20} color={brandColor} /> Missions- & Gamification-Einstellungen
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Stelle Lernmotivation, Übungs-Serie und Erfahrungspunkte (XP) für die Schüler-App ein.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Übungs-Flames & Serie aktivieren</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setFlamesActive(!flamesActive)}
                    className={`app-binary-switch ${flamesActive ? 'active' : ''}`}
                    style={{ backgroundColor: flamesActive ? brandColor : undefined }}
                  >
                    <div className="app-binary-switch-knob" />
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: flamesActive ? '#1e293b' : '#64748b' }}>
                    {flamesActive ? 'Aktiv (Übungsserie anfeuern)' : 'Deaktiviert'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mindest-Übungseinheit für Flames (Minuten)</label>
                <select
                  value={minPracticeMinutes}
                  onChange={e => setMinPracticeMinutes(e.target.value)}
                  disabled={!flamesActive}
                  style={{ padding: '14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.9rem', background: flamesActive ? '#f8fafc' : '#f1f5f9', color: flamesActive ? '#0f172a' : '#94a3b8', outline: 'none' }}
                >
                  <option value="5">5 Minuten</option>
                  <option value="10">10 Minuten (Standard)</option>
                  <option value="15">15 Minuten</option>
                  <option value="20">20 Minuten</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Globaler XP-Multiplikator</label>
                <select
                  value={xpMultiplier}
                  onChange={e => setXpMultiplier(e.target.value)}
                  style={{ padding: '14px', borderRadius: '14px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.9rem', background: '#f8fafc', outline: 'none' }}
                >
                  <option value="1.0">1.0x (Standard)</option>
                  <option value="1.5">1.5x (Boost Event)</option>
                  <option value="2.0">2.0x (Double XP Weekend)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Missionen automatisch freigeben (Auto-Abnahme)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setAutoApproveMissions(!autoApproveMissions)}
                    className={`app-binary-switch ${autoApproveMissions ? 'active' : ''}`}
                    style={{ backgroundColor: autoApproveMissions ? brandColor : undefined }}
                  >
                    <div className="app-binary-switch-knob" />
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: autoApproveMissions ? '#1e293b' : '#64748b' }}>
                    {autoApproveMissions ? 'Automatisch freigeben' : 'Manuelle Prüfung durch Lehrer'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM & NOTIFICATIONS */}
        {activeTab === 'system' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={20} color={brandColor} /> System- & Benachrichtigungs-Einstellungen
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Konfiguriere systemweite Chatfunktionen, automatische Krankmeldungs-Bypässe und Kiosk-QR-Anforderungen.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Feature 1 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'start' }}>
                  <div style={{ padding: '10px', borderRadius: '12px', background: `${brandColor}15`, color: brandColor, display: 'flex' }}>
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>Interne Shoutbox & Direktnachrichten</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Schülern und Lehrern erlauben, Direktnachrichten und Chat-Mitteilungen auszutauschen.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMessagingActive(!messagingActive)}
                  className={`app-binary-switch ${messagingActive ? 'active' : ''}`}
                  style={{ backgroundColor: messagingActive ? brandColor : undefined }}
                >
                  <div className="app-binary-switch-knob" />
                </button>
              </div>

              {/* Feature 2 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'start' }}>
                  <div style={{ padding: '10px', borderRadius: '12px', background: `${brandColor}15`, color: brandColor, display: 'flex' }}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>Automatische Ausfall-Benachrichtigung</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Schüler & Eltern automatisch via E-Mail/App informieren, sobald ein Lehrer krankgemeldet wird.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoCancelAlerts(!autoCancelAlerts)}
                  className={`app-binary-switch ${autoCancelAlerts ? 'active' : ''}`}
                  style={{ backgroundColor: autoCancelAlerts ? brandColor : undefined }}
                >
                  <div className="app-binary-switch-knob" />
                </button>
              </div>

              {/* Feature 3 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'start' }}>
                  <div style={{ padding: '10px', borderRadius: '12px', background: `${brandColor}15`, color: brandColor, display: 'flex' }}>
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>QR-Code Pflicht am Kiosk (Strenger Modus)</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Check-In am Terminal erfordert zwingend das Scannen des physischen/digitalen Campus-QR-Ausweises.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStrictCheckin(!strictCheckin)}
                  className={`app-binary-switch ${strictCheckin ? 'active' : ''}`}
                  style={{ backgroundColor: strictCheckin ? brandColor : undefined }}
                >
                  <div className="app-binary-switch-knob" />
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '36px', paddingTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '12px 28px',
              borderRadius: '16px',
              border: 'none',
              background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`,
              color: 'white',
              fontWeight: 900,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: `0 8px 20px -6px ${brandColor}60`,
              opacity: isSaving ? 0.7 : 1,
              transition: 'transform 0.1s, opacity 0.2s'
            }}
          >
            {isSaving ? 'Speichert...' : (
              <>
                <Save size={18} />
                Setup Speichern
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

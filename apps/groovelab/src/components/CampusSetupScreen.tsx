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
  // As per styling rules, Campus module uses green (#137333, #e6f4ea)
  const brandColor = '#137333';
  const activeBgColor = '#e6f4ea';
  const effectiveSchool = Array.isArray(school) ? school[0] : school;
  const sId = effectiveSchool?.id || admin?.school_id;

  const [isSaving, setIsSaving] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'calendar' | 'communication' | 'gamification' | 'datenschutz'>('calendar');
  const [initialConfig, setInitialConfig] = useState<any>(null);

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', transition: 'all 0.2s' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: value ? `${brandColor}15` : '#f1f5f9', color: value ? brandColor : '#94a3b8', display: 'flex', transition: 'all 0.2s' }}>
            {icon}
          </div>
          <div>
            <h4 style={{ margin: '0 0 2px 0', fontSize: '0.875rem', fontWeight: 800, color: '#1e293b' }}>{label}</h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`app-binary-switch ${value ? 'active' : ''}`}
          style={{ backgroundColor: value ? brandColor : undefined }}
        >
          <div className="app-binary-switch-knob" />
        </button>
      </div>
    );
  };

  return (
    <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        display: 'flex',
        background: '#ffffff',
        borderRadius: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)',
        minHeight: '580px',
        overflow: 'hidden',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}>
        {/* LEFT SIDEBAR (Apple-style) */}
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

        {/* RIGHT PANEL (Details) */}
        <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', textAlign: 'left' }}>
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
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>Datenschutz &amp; Rechtliches</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>AVV-Status einsehen und Unterlagen zur Schüler-Einwilligung herunterladen.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ 
                  background: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '16px', 
                  padding: '16px', 
                  fontSize: '0.8rem',
                  lineHeight: '1.5',
                  color: '#475569'
                }}>
                  <strong style={{ display: 'block', marginBottom: '8px', color: '#1e293b', fontSize: '0.88rem' }}>Rechtssicherer Pilotbetrieb</strong>
                  Um den gesetzlichen Anforderungen an Schulsoftware gerecht zu werden, müssen vor dem Eintragen von Schülernamen (nur Vorname + erster Buchstabe Nachname) die Einverständniserklärungen der Erziehungsberechtigten vorliegen. Nutze dafür unser vorbereitetes Infoblatt.
                </div>

                {/* Download Card */}
                <div style={{ 
                  background: '#fefce8', 
                  border: '1px solid #fef08a', 
                  borderRadius: '16px', 
                  padding: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '0.84rem', color: '#854d0e', display: 'block', marginBottom: '2px' }}>Eltern-Information &amp; Einwilligung (Vorlage)</strong>
                    <span style={{ fontSize: '0.72rem', color: '#a16207', display: 'block' }}>Rechtssichere Vorlage als Textdatei zum Ausdrucken oder Versenden.</span>
                  </div>
                  <button 
                    onClick={() => {
                      const hasCampus = effectiveSchool?.has_campus_subscription ?? false;
                      const hasGroove = effectiveSchool?.has_groovelab_subscription ?? false;
                      
                      const isGrooveOnly = !hasCampus && hasGroove;
                      const isCampusOnly = hasCampus && !hasGroove;

                      let appName = 'Campus-Groovelab';
                      let subjectPhrase = 'Instrumental- und Groovelab-Unterrichts';
                      if (isGrooveOnly) {
                        appName = 'GrooveLab';
                        subjectPhrase = 'Groovelab-Unterrichts';
                      } else if (isCampusOnly) {
                        appName = 'Campus';
                        subjectPhrase = 'Instrumentalunterrichts';
                      }

                      const filename = isGrooveOnly 
                        ? 'Eltern_Information_Einwilligung_Groovelab.txt' 
                        : isCampusOnly
                          ? 'Eltern_Information_Einwilligung_Campus.txt'
                          : 'Eltern_Information_Einwilligung_Campus_Groovelab.txt';

                      const text = `ELTERN-INFORMATION & EINWILLIGUNG ZUR ERPROBUNG DER LERN-APP ${appName.toUpperCase()}

Sehr geehrte Eltern, liebe Erziehungsberechtigte,

im Rahmen des ${subjectPhrase} nutzen wir ab sofort die webbasierte, datenschutzkonforme App „${appName}“ zur pädagogischen Begleitung und Gamification (XP-Punkte, Band-Matching, Song-Bibliotheken).

DATENSCHUTZ UND SICHERHEIT STEHEN AN ERSTER STELLE:
- Die Nutzung der App ist für Sie und Ihr Kind vollständig kostenlos.
- Es werden keinerlei sensible Vertragsdaten, Bankdaten oder E-Mail-Adressen von Kindern oder Eltern erfasst.
- Zur Identifizierung wird lediglich ein Profil mit dem Vornamen sowie dem ersten Buchstaben des Nachnamens (z. B. „Jonas M.“) angelegt.
- Das Hosting findet zu 100 % in zertifizierten deutschen Rechenzentren (Hetzner Online GmbH) statt.
- Audio-Aufnahmen dienen nur Übe-Protokollen und werden bei Löschung physisch vernichtet.

Mit der Teilnahme an der Pilotphase willigen Sie ein, dass wir ein anonymisiertes Übe-Profil für Ihr Kind anlegen. Sie können die Löschung oder Sperrung des Profils jederzeit über uns verlangen.

Vielen Dank für Ihre Unterstützung!`;
                      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = filename;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
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
                    Download
                  </button>
                </div>

                <div style={{ 
                  background: '#e6f4ea', 
                  border: '1px solid #a7f3d0', 
                  borderRadius: '16px', 
                  padding: '16px', 
                  fontSize: '0.76rem',
                  color: '#137333',
                  lineHeight: '1.45'
                }}>
                  <strong style={{ fontSize: '0.82rem', display: 'block', marginBottom: '4px', color: '#137333' }}>Auftragsverarbeitungsvereinbarung (AVV)</strong>
                  Der AVV nach Art. 28 DSGVO (inkl. Hetzner Falkenstein Server-Hosting) wurde für deine Schule während der Pilotphasen-Freischaltung digital gezeichnet.
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
        padding: '16px 40px',
        marginTop: '16px',
        border: '1px solid #e2e8f0',
        background: isSettingsDirty ? '#fef2f2' : '#f8fafc',
        borderRadius: '20px',
        transition: 'background-color 0.3s ease'
      }}>
        {isSettingsDirty ? (
          <span style={{ fontSize: '0.82rem', color: '#ea4335', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ Ungespeicherte Änderungen vorhanden.
          </span>
        ) : (
          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✓ Alle Änderungen gespeichert.
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={!isSettingsDirty || isSaving}
          style={{
            padding: '10px 24px',
            background: isSettingsDirty ? brandColor : '#cbd5e1',
            color: isSettingsDirty ? 'white' : '#94a3b8',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '0.84rem',
            cursor: isSettingsDirty ? 'pointer' : 'default',
            boxShadow: isSettingsDirty ? `0 4px 12px ${brandColor}40` : 'none',
            transition: 'all 0.2s',
            opacity: isSaving ? 0.7 : 1
          }}
          className={isSettingsDirty ? "hover-scale" : ""}
        >
          {isSaving ? 'Wird gespeichert...' : 'Einstellungen speichern'}
        </button>
      </div>
    </div>
  );
}

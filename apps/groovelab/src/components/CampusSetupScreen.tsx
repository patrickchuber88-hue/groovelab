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
  brandColor = '#22c55e', // Green by default for Campus
  onUpdate 
}: CampusSetupScreenProps) {
  const effectiveSchool = Array.isArray(school) ? school[0] : school;
  const sId = effectiveSchool?.id || admin?.school_id;

  const [isSaving, setIsSaving] = useState(false);

  // --- States for Settings (defaulting to true) ---
  const [schoolName, setSchoolName] = useState('');
  
  // 1. Stundenplan & Kalender
  const [showWeekends, setShowWeekends] = useState(true);
  const [icalActive, setIcalActive] = useState(true);
  const [calendarUrl, setCalendarUrl] = useState('');

  // 2. Kommunikation & Benachrichtigungen
  const [studentToTeacherChat, setStudentToTeacherChat] = useState(true);
  const [autoCancelAlerts, setAutoCancelAlerts] = useState(true);

  // 3. Motivation & Gamification
  const [flamesActive, setFlamesActive] = useState(true);
  const [xpActive, setXpActive] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [showDetailedStats, setShowDetailedStats] = useState(true);

  // Load configuration from database
  useEffect(() => {
    if (effectiveSchool) {
      setSchoolName(effectiveSchool.name || '');
      setCalendarUrl(effectiveSchool.calendar_url || '');

      const campusConfig = effectiveSchool.opening_hours?.campus_settings || {};
      
      // Load toggles (default to true if undefined)
      setShowWeekends(campusConfig.show_weekends !== false);
      setIcalActive(campusConfig.ical_active !== false);
      setAutoCancelAlerts(campusConfig.auto_cancel_alerts !== false);
      setStudentToTeacherChat(campusConfig.student_to_teacher_chat !== false);
      setFlamesActive(campusConfig.flames_active !== false);
      setXpActive(campusConfig.xp_active !== false);
      setShowLeaderboard(campusConfig.show_leaderboard !== false);
      setShowDetailedStats(campusConfig.show_detailed_stats !== false);
    }
  }, [effectiveSchool]);

  const handleSave = async () => {
    if (!sId) {
      alert('Fehler: Keine Schul-ID gefunden.');
      return;
    }
    setIsSaving(true);

    try {
      // Build updated opening_hours JSON containing our custom campus settings
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
          name: schoolName,
          opening_hours: updatedOpeningHours,
          calendar_url: icalActive ? (calendarUrl || null) : null
        })
        .eq('id', sId);

      if (error) throw error;
      alert('Einstellungen erfolgreich gespeichert! 🌟');
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
    <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Configuration Cards container */}
      <div style={{ background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.02)', padding: '36px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Title and General Settings */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} color={brandColor} /> Campus-Einstellungen
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '450px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schulname</label>
            <input 
              type="text" 
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="z.B. Musäk Bad Säckingen"
              style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', fontWeight: 650, fontSize: '0.9rem', outline: 'none', background: '#f8fafc' }}
            />
          </div>
        </div>

        {/* Section 1: Stundenplan & Kalender */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color={brandColor} /> 1. Stundenplan & Kalender
          </h3>
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

        {/* Section 2: Kommunikation & Benachrichtigungen */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color={brandColor} /> 2. Kommunikation & Benachrichtigungen
          </h3>
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

        {/* Section 3: Motivation & Gamification */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color={brandColor} /> 3. Motivation & Gamification
          </h3>
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

        {/* Footer Actions */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
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
                Einstellungen Speichern
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

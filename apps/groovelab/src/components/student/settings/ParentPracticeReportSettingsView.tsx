import React from 'react';
import { Clock, Sparkles, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export interface ParentPracticeReportSettingsViewProps {
  currentLvlKey: 'junior' | 'teen' | 'pro';
  totalPracticeMinutes: number;
  weeklyPracticeMinutes?: number;
  schoolYearPracticeMinutes?: number;
  avatar: any;
  studentUser: any;
  getTargetMinutes: (item: any) => number;
}

export const ParentPracticeReportSettingsView: React.FC<ParentPracticeReportSettingsViewProps> = ({
  currentLvlKey,
  totalPracticeMinutes,
  weeklyPracticeMinutes,
  schoolYearPracticeMinutes,
  avatar,
  studentUser,
  getTargetMinutes,
}) => {
  const studentId = studentUser?.id;
  const serverMinutes = studentUser?.parent_permissions?.max_screen_minutes;
  const [parentMaxMinutes, setParentMaxMinutes] = React.useState<number>(() => {
    if (typeof serverMinutes === 'number' && serverMinutes > 0) return serverMinutes;
    return currentLvlKey === 'junior' ? 30 : (currentLvlKey === 'teen' ? 45 : 60);
  });

  const handleSetMaxMinutes = async (mins: number) => {
    setParentMaxMinutes(mins);
    if (studentId) {
      try {
        const nextPermissions = {
          ...(studentUser?.parent_permissions || {}),
          max_screen_minutes: mins,
          updated_at: new Date().toISOString()
        };
        await supabase.rpc('save_parent_controls', {
          p_student_id: studentId,
          p_settings: {
            parent_permissions: nextPermissions
          }
        });
        if (studentUser) {
          studentUser.parent_permissions = nextPermissions;
        }
      } catch (e) {
        console.warn('Fehler beim Speichern der maximalen Übezeit via save_parent_controls:', e);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 📊 Eltern-Wochenreport & Übe-Insights */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '24px 22px',
        borderRadius: '24px',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#e6f4ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Clock size={22} color="#16a34a" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Wöchentlicher Übe-Report &amp; Fortschritt
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
                100% datenschutzkonforme Zusammenfassung der Übe-Einheiten zu Hause.
              </div>
            </div>
          </div>
          <span style={{
            background: '#f1f5f9',
            color: '#334155',
            padding: '5px 12px',
            borderRadius: '10px',
            fontSize: '0.74rem',
            fontWeight: 800,
            border: '1px solid #e2e8f0'
          }}>
            Aktuelle Woche
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '6px' }}>
          <div style={{ background: '#f8fafc', border: '1.5px solid #f1f5f9', borderRadius: '16px', padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Diese Woche</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 950, color: '#16a34a', marginTop: '4px', letterSpacing: '-0.02em' }}>
              {weeklyPracticeMinutes !== undefined ? weeklyPracticeMinutes : totalPracticeMinutes} Min.
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>Ziel: {getTargetMinutes(avatar?.streak_flame || 0)} Min./Tag</div>
          </div>

          <div style={{ background: '#f8fafc', border: '1.5px solid #f1f5f9', borderRadius: '16px', padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Aktiver Streak</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 950, color: '#0284c7', marginTop: '4px', letterSpacing: '-0.02em' }}>
              {avatar?.streak_flame || 0} Tage
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>3 Schutzschilde aktiv</div>
          </div>

          <div style={{ background: '#f8fafc', border: '1.5px solid #f1f5f9', borderRadius: '16px', padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Campus-XP</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 950, color: '#ca8a04', marginTop: '4px', letterSpacing: '-0.02em' }}>
              {(avatar as any)?.experience_points || (avatar as any)?.xp || 0} XP
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>Level {avatar?.evolution_level || 1} erreicht</div>
          </div>
        </div>

        {/* Sekundäre Langzeit-Statistik */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '10px 14px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #f1f5f9',
          fontSize: '0.76rem',
          color: '#64748b',
          fontWeight: 650
        }}>
          <span>Laufendes Schuljahr: <strong style={{ color: '#0f172a' }}>{schoolYearPracticeMinutes !== undefined ? schoolYearPracticeMinutes : totalPracticeMinutes} Min.</strong></span>
          <span>Gesamte Übezeit (All-Time): <strong style={{ color: '#0f172a' }}>{totalPracticeMinutes} Min.</strong></span>
        </div>
      </div>

      {/* Pädagogische Leitlinie & Entlastung */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '20px',
        borderRadius: '20px',
        background: '#f0fdf4',
        border: '1.5px solid #bbf7d0',
        color: '#15803d',
        textAlign: 'left'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '12px',
          background: '#dcfce7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#16a34a',
          flexShrink: 0
        }}>
          <Sparkles size={20} strokeWidth={2.5} />
        </div>
        <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
          <strong style={{ display: 'block', marginBottom: '4px', fontSize: '0.90rem', color: '#14532d', fontWeight: 900 }}>
            Pädagogische Motivation ohne Leistungsdruck
          </strong>
          {currentLvlKey === 'junior'
            ? 'Im Junior-Modus steht die Freude am Instrument im Vordergrund. 10 bis 15 Minuten spielerisches Üben an 3–4 Tagen pro Woche reichen völlig aus, um nachhaltige motorische Gewohnheiten zu verankern.'
            : currentLvlKey === 'teen'
            ? 'Im Teen-Modus stärkt der Fokus-Timer die Selbstorganisation. Kontinuierliche Einheiten von 20 bis 30 Minuten fördern die Repertoire-Festigung vor der nächsten Musikstunde.'
            : 'Pro-Modus: Vertiefung von Phrasierung, Technik und Repertoire. Zielgerichtete Sessions ab 30 bis 45 Minuten für fortgeschrittene Musiker.'}
        </div>
      </div>

      {/* ⏱️ F18: Screen-Time & Pausen-Richtzeit für Eltern */}
      <div style={{
        padding: '20px 22px',
        borderRadius: '24px',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={18} color="#0f172a" />
            <div style={{ fontSize: '0.94rem', fontWeight: 850, color: '#0f172a' }}>
              Pausen-Erinnerung &amp; App-Nutzungszeit
            </div>
          </div>
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: '8px',
            background: '#f1f5f9',
            color: '#334155'
          }}>
            {parentMaxMinutes === 0 ? 'Ohne Limit' : `Nach ${parentMaxMinutes} Min`}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', lineHeight: 1.4 }}>
          Legt fest, nach wie vielen Minuten kontinuierlicher Nutzung euer Kind an eine Pause erinnert wird. Es erfolgt keine Zwangssperre, sondern ein freundlicher Pausenhinweis.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
          {[30, 45, 60, 0].map(mins => (
            <button
              key={mins}
              type="button"
              onClick={() => handleSetMaxMinutes(mins)}
              style={{
                padding: '6px 14px',
                borderRadius: '10px',
                border: parentMaxMinutes === mins ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                background: parentMaxMinutes === mins ? '#0f172a' : '#f8fafc',
                color: parentMaxMinutes === mins ? '#ffffff' : '#475569',
                fontSize: '0.76rem',
                fontWeight: 750,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {mins === 0 ? 'Kein Hinweis' : `${mins} Minuten`}
            </button>
          ))}
        </div>
      </div>

      {/* DSGVO Transparenz-Hinweis */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 18px',
        borderRadius: '16px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        color: '#64748b',
        fontSize: '0.78rem',
        textAlign: 'left',
        lineHeight: 1.45
      }}>
        <ShieldCheck size={18} color="#15803d" style={{ flexShrink: 0 }} />
        <span><strong>DSGVO-zertifiziert:</strong> Keine Verhaltens-Scorecards, keine Werbetracker. Die Übedaten verbleiben ausschließlich geschützt zwischen Familie, Schüler und Musikschule.</span>
      </div>
    </div>
  );
};

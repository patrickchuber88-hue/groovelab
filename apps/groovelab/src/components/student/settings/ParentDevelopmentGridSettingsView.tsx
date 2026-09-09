import React from 'react';
import { Award, Target, Info } from 'lucide-react';
import { SKILL_TAGS } from '../meisterwerk.types';
import { SkillRadarPentagon } from '../../common/SkillRadarPentagon';

export interface ParentDevelopmentGridSettingsViewProps {
  currentLvlKey: 'junior' | 'teen' | 'pro';
  studentUser: any;
  studentId?: string;
  instrumentName?: string;
}

export const ParentDevelopmentGridSettingsView: React.FC<ParentDevelopmentGridSettingsViewProps> = ({
  currentLvlKey,
  studentUser,
  studentId,
  instrumentName,
}) => {
  const skillLevels = React.useMemo(() => {
    try {
      if (studentUser?.skill_radar_levels && typeof studentUser.skill_radar_levels === 'object') {
        return studentUser.skill_radar_levels;
      }
      const saved = typeof window !== 'undefined' ? localStorage.getItem(`groovelab_skill_overrides_${studentId || studentUser?.id || 'default'}`) : null;
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  }, [studentUser?.skill_radar_levels, studentId, studentUser?.id]);

  const activeWeeklyFocus = skillLevels?.weekly_focus && skillLevels.weekly_focus !== 'ausgeglichen' ? skillLevels.weekly_focus : null;
  const radarTitle = currentLvlKey === 'junior' ? 'Mein Musik-Stern ⭐' : currentLvlKey === 'pro' ? 'Kompetenz-Radar 🏛️' : 'Skill-Radar ⚡';
  const firstName = studentUser?.first_name || 'dein Kind';

  const getStageName = (level: number) => {
    if (currentLvlKey === 'junior') {
      if (level === 5) return '👑 Meister-Zauberer';
      if (level === 4) return '🌟 Stern-Champion';
      if (level === 3) return '✨ Musik-Könner';
      if (level === 2) return '🚀 Entdecker-Aufbau';
      return '🌱 Entdecker-Basis';
    }
    if (currentLvlKey === 'pro') {
      if (level === 5) return 'Exzellenz';
      if (level === 4) return 'Stilsicher';
      if (level === 3) return 'Fortgeschritten';
      if (level === 2) return 'Fundiert';
      return 'Basis';
    }
    // Teen
    if (level === 5) return 'Band-Meister';
    if (level === 4) return 'Stage-Ready';
    if (level === 3) return 'Solist';
    if (level === 2) return 'Flow-Builder';
    return 'Groove-Starter';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 🌟 Kopfbereich: Didaktisches Entwicklungsraster & Pädagogische Leitlinie */}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: currentLvlKey === 'junior' ? '#fefce8' : '#eff6ff',
              border: currentLvlKey === 'junior' ? '1px solid #fef08a' : '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.45rem',
              flexShrink: 0
            }}>
              {currentLvlKey === 'junior' ? '⭐' : '📊'}
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{radarTitle}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b' }}>· Didaktisches Entwicklungsraster</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, lineHeight: 1.35, marginTop: '2px' }}>
                Ganzheitliche musikalische Förderung durch die Musiklehrkraft (ohne Noten, ohne Leistungsdruck).
              </div>
            </div>
          </div>

          {activeWeeklyFocus ? (
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 850,
              color: '#92400e',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              padding: '4px 12px',
              borderRadius: '100px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Target size={14} color="#d97706" />
              <span>🎯 Wochenfokus aktiv</span>
            </span>
          ) : (
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#334155',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              padding: '4px 12px',
              borderRadius: '100px'
            }}>
              {currentLvlKey === 'junior' ? '⭐ Rundum-Zauber' : currentLvlKey === 'pro' ? '🏛️ Harmonische Balance' : '🌈 Ganzheitlich'}
            </span>
          )}
        </div>

        {/* Pädagogischer Infokasten */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '12px 14px',
          borderRadius: '14px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          fontSize: '0.76rem',
          color: '#475569',
          lineHeight: 1.45
        }}>
          <Info size={16} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Musikalische 5-Säulen-Didaktik:</strong> Im Instrumentalunterricht wachsen Schülerinnen und Schüler auf 5 gleichberechtigten Dimensionen. Die Musiklehrkraft passt die Entwicklungsstufen kontinuierlich und behutsam an den Lernfortschritt an – so behältst du als Elternteil jederzeit vollen Einblick in die Entwicklungsschritte deines Kindes.
          </div>
        </div>
      </div>

      {/* 🧭 Visualisierung: Interaktives Kompetenz-Pentagon / Musik-Stern */}
      <div style={{
        padding: '24px 20px',
        borderRadius: '24px',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '16px'
      }}>
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
              Kompetenz-Profil &amp; 5 Dimensionen
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
              Aktueller didaktischer Stand für {firstName}
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', background: '#f0f9ff', padding: '3px 10px', borderRadius: '100px', border: '1px solid #bae6fd' }}>
            5 Didaktische Säulen
          </span>
        </div>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <SkillRadarPentagon
            levels={skillLevels}
            activeFocusTags={activeWeeklyFocus ? [activeWeeklyFocus] : []}
            size="normal"
            uiLevel={currentLvlKey}
            studentName={firstName}
            instrumentName={instrumentName}
            showVignette={false}
          />
        </div>
      </div>

      {/* 📊 Detaillierte Übersicht der 5 Säulen */}
      <div style={{
        padding: '22px 20px',
        borderRadius: '24px',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        textAlign: 'left'
      }}>
        <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={18} color="#0284c7" />
          <span>Die 5 Entwicklungs-Säulen im Detail</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {SKILL_TAGS.map(tag => {
            const rawLvl = (skillLevels as any)[tag.key] ?? (tag.legacyKey ? (skillLevels as any)[tag.legacyKey] : undefined);
            const level = typeof rawLvl === 'number' && rawLvl >= 1 && rawLvl <= 5 ? rawLvl : 1;
            const isFocus = activeWeeklyFocus === tag.key || (tag.legacyKey && activeWeeklyFocus === tag.legacyKey);
            const stageLabel = getStageName(level);

            return (
              <div
                key={tag.key}
                style={{
                  background: isFocus ? (tag.lightBg || '#fffbeb') : '#f8fafc',
                  border: `1.5px solid ${isFocus ? (tag.border || '#fde68a') : '#f1f5f9'}`,
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: isFocus ? '0 4px 12px rgba(245, 158, 11, 0.12)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 900, color: tag.color || '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.15rem' }}>{tag.icon}</span>
                    <span>{tag.label}</span>
                  </span>
                  {isFocus ? (
                    <span style={{ fontSize: '0.68rem', fontWeight: 850, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '100px', border: '1px solid #fde68a' }}>
                      🎯 Wochenfokus
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>
                      Stufe {level}/5
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 550, lineHeight: 1.35 }}>
                  {tag.description}
                </div>

                {/* Stufen-Badge & Dots */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.70rem', fontWeight: 800, color: tag.color || '#334155' }}>
                      {stageLabel}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>
                      {level === 5 ? 'Voll ausgebildet ✓' : `Nächste Stufe: ${getStageName(Math.min(5, level + 1))}`}
                    </span>
                  </div>

                  {/* 5 Dots Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {[1, 2, 3, 4, 5].map(seg => (
                      <span
                        key={seg}
                        style={{
                          height: '7px',
                          flex: 1,
                          borderRadius: '4px',
                          background: level >= seg ? (tag.dotColor || '#3b82f6') : '#e2e8f0',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

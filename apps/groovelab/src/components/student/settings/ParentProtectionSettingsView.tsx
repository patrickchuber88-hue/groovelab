import React from 'react';
import {
  Compass, Sliders, Volume2, Zap, Library, Mic, Headphones, Calendar, RotateCcw,
  Mail, Trophy, Sparkles, Check, ShieldCheck, AlertTriangle, Star, Target
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { CAMPUS_AGE_STANDARDS } from '../studentAgeStandards';
import { SKILL_TAGS } from '../meisterwerk.types';

export interface ParentProtectionSettingsViewProps {
  studentUser: any;
  studentId: string;
  isAdultStudent: boolean;
  draftUiLevel: string;
  draftAllowAbsences: boolean | null;
  draftAllowReschedule: boolean | null;
  draftAllowChat: boolean | null;
  draftAllowTimer: boolean | null;
  draftAllowLeaderboard: boolean | null;
  draftAllowProposals: boolean | null;
  draftAllowAudio: boolean | null;
  draftAllowTts: boolean | null;
  draftBoardOverrides: Record<string, boolean>;
  applyAndSaveParentControls: (updates: any) => Promise<void>;
  recentlyChangedDiff: any;
  setRecentlyChangedDiff: React.Dispatch<React.SetStateAction<any>>;
  cancelledSchoolYearOccurrences: any[];
  scheduleOccurrences: any[];
}

export const ParentProtectionSettingsView: React.FC<ParentProtectionSettingsViewProps> = ({
  studentUser,
  studentId,
  isAdultStudent,
  draftUiLevel,
  draftAllowAbsences,
  draftAllowReschedule,
  draftAllowChat,
  draftAllowTimer,
  draftAllowLeaderboard,
  draftAllowProposals,
  draftAllowAudio,
  draftAllowTts,
  draftBoardOverrides,
  applyAndSaveParentControls,
  recentlyChangedDiff,
  setRecentlyChangedDiff,
  cancelledSchoolYearOccurrences,
  scheduleOccurrences,
}) => {
  const currentLvlKey = ((draftUiLevel ?? (studentUser as any)?.campus_ui_level ?? (typeof window !== 'undefined' ? localStorage.getItem('campus_student_ui_level') : null)) || 'junior') as 'junior' | 'teen' | 'pro';
  const standard = CAMPUS_AGE_STANDARDS[currentLvlKey] || CAMPUS_AGE_STANDARDS.junior;

  const curAbsences = currentLvlKey === 'junior' 
    ? false 
    : (draftAllowAbsences !== null ? draftAllowAbsences : ((studentUser as any)?.parent_allow_absences !== undefined && (studentUser as any)?.parent_allow_absences !== null ? Boolean((studentUser as any)?.parent_allow_absences) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_absences_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_absences_${studentId}`) === 'true' : (currentLvlKey === 'pro'))));
  
  const curReschedule = currentLvlKey === 'junior'
    ? false
    : (draftAllowReschedule !== null ? draftAllowReschedule : ((studentUser as any)?.parent_allow_reschedule_confirm !== undefined && (studentUser as any)?.parent_allow_reschedule_confirm !== null ? Boolean((studentUser as any)?.parent_allow_reschedule_confirm) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_reschedule_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_reschedule_${studentId}`) === 'true' : true)));
  
  const curChat = draftAllowChat !== null ? draftAllowChat : ((studentUser as any)?.parent_allow_chat !== undefined && (studentUser as any)?.parent_allow_chat !== null ? Boolean((studentUser as any)?.parent_allow_chat) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_chat_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_chat_${studentId}`) === 'true' : (currentLvlKey !== 'junior')));
  
  const curTimer = draftAllowTimer !== null ? draftAllowTimer : ((studentUser as any)?.parent_allow_timer !== undefined && (studentUser as any)?.parent_allow_timer !== null ? Boolean((studentUser as any)?.parent_allow_timer) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_timer_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_timer_${studentId}`) === 'true' : true));
  
  const curLeaderboard = draftAllowLeaderboard !== null ? draftAllowLeaderboard : ((studentUser as any)?.parent_allow_leaderboard !== undefined && (studentUser as any)?.parent_allow_leaderboard !== null ? Boolean((studentUser as any)?.parent_allow_leaderboard) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_leaderboard_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_leaderboard_${studentId}`) === 'true' : (currentLvlKey !== 'junior')));
  
  const curProposals = draftAllowProposals !== null ? draftAllowProposals : ((studentUser as any)?.parent_allow_proposals !== undefined && (studentUser as any)?.parent_allow_proposals !== null ? Boolean((studentUser as any)?.parent_allow_proposals) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_proposals_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_proposals_${studentId}`) === 'true' : (draftBoardOverrides.mediathek ?? (currentLvlKey !== 'junior'))));
  
  const curAudio = draftAllowAudio !== null ? draftAllowAudio : ((studentUser as any)?.parent_allow_audio !== undefined && (studentUser as any)?.parent_allow_audio !== null ? Boolean((studentUser as any)?.parent_allow_audio) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_audio_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_audio_${studentId}`) === 'true' : (draftBoardOverrides.recordings ?? false)));
  
  const curTeacherAudio = (studentUser as any)?.parent_permissions?.allow_teacher_audio !== undefined
    ? Boolean((studentUser as any)?.parent_permissions?.allow_teacher_audio)
    : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_teacher_audio_${studentId}`) !== null
        ? localStorage.getItem(`groovelab_parent_allow_teacher_audio_${studentId}`) === 'true'
        : false);
  
  const curStudentAudio = (studentUser as any)?.parent_permissions?.allow_student_audio !== undefined
    ? Boolean((studentUser as any)?.parent_permissions?.allow_student_audio)
    : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_student_audio_${studentId}`) !== null
        ? localStorage.getItem(`groovelab_parent_allow_student_audio_${studentId}`) === 'true'
        : false);
  
  const curTts = draftAllowTts !== null ? draftAllowTts : ((studentUser as any)?.parent_allow_tts !== undefined && (studentUser as any)?.parent_allow_tts !== null ? Boolean((studentUser as any)?.parent_allow_tts) : (studentId && typeof window !== 'undefined' && localStorage.getItem(`groovelab_parent_allow_tts_${studentId}`) !== null ? localStorage.getItem(`groovelab_parent_allow_tts_${studentId}`) === 'true' : (currentLvlKey === 'junior')));

  const isDeviating = 
    curAbsences !== standard.allowAbsences ||
    curReschedule !== standard.allowRescheduleConfirm ||
    curChat !== standard.allowChat ||
    curTimer !== standard.allowTimer ||
    curLeaderboard !== standard.allowLeaderboard ||
    curProposals !== standard.allowProposals ||
    curAudio !== standard.allowAudio ||
    curTts !== standard.allowTts;

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

  const handleSwitchAgeLevelWithStandard = async (targetLevelId: 'junior' | 'teen' | 'pro') => {
    if (targetLevelId === currentLvlKey) return;
    const targetStandard = CAMPUS_AGE_STANDARDS[targetLevelId] || CAMPUS_AGE_STANDARDS.junior;

    const currentValues: Record<string, boolean> = {
      allowAbsences: curAbsences,
      allowRescheduleConfirm: curReschedule,
      allowChat: curChat,
      allowTimer: curTimer,
      allowLeaderboard: curLeaderboard,
      allowProposals: curProposals,
      allowAudio: curAudio,
      allowTts: curTts,
    };

    const targetValues: Record<string, boolean> = {
      allowAbsences: targetStandard.allowAbsences,
      allowRescheduleConfirm: targetStandard.allowRescheduleConfirm,
      allowChat: targetStandard.allowChat,
      allowTimer: targetStandard.allowTimer,
      allowLeaderboard: targetStandard.allowLeaderboard,
      allowProposals: targetStandard.allowProposals,
      allowAudio: targetStandard.allowAudio,
      allowTts: targetStandard.allowTts,
    };

    const diffKeys: string[] = [];
    const changesRecord: Record<string, { from: boolean; to: boolean }> = {};

    Object.keys(targetValues).forEach((key) => {
      if (currentValues[key] !== targetValues[key]) {
        diffKeys.push(key);
        changesRecord[key] = {
          from: currentValues[key],
          to: targetValues[key],
        };
      }
    });

    if (diffKeys.length > 0) {
      setRecentlyChangedDiff({
        keys: diffKeys,
        targetLevelLabel: targetStandard.label,
        targetLevelId,
        changes: changesRecord,
      });

      setTimeout(() => {
        setRecentlyChangedDiff((prev: any) => (prev?.targetLevelId === targetLevelId ? null : prev));
      }, 4500);
    } else {
      setRecentlyChangedDiff(null);
    }

    await applyAndSaveParentControls({
      uiLevel: targetLevelId,
      allowAbsences: targetStandard.allowAbsences,
      allowRescheduleConfirm: targetStandard.allowRescheduleConfirm,
      allowChat: targetStandard.allowChat,
      allowTimer: targetStandard.allowTimer,
      allowLeaderboard: targetStandard.allowLeaderboard,
      allowProposals: targetStandard.allowProposals,
      allowAudio: targetStandard.allowAudio,
      allowTts: targetStandard.allowTts,
      boardOverrides: targetStandard.boardOverrides,
      bedtimeEnabled: targetStandard.bedtimeEnabled,
      bedtimeStart: targetStandard.bedtimeStart,
      bedtimeEnd: targetStandard.bedtimeEnd,
    });
  };

  const getHighlightProps = (featureKey: string) => {
    const isHighlighted = Boolean(recentlyChangedDiff?.keys?.includes(featureKey));
    const changeMeta = recentlyChangedDiff?.changes?.[featureKey];
    const isNewlyActivated = changeMeta?.to;

    return {
      isHighlighted,
      style: {
        background: isHighlighted ? (isNewlyActivated ? '#f0fdf4' : '#fef2f2') : '#f8fafc',
        border: isHighlighted 
          ? (isNewlyActivated ? '1.5px solid #86efac' : '1.5px solid #fca5a5') 
          : '1px solid #e2e8f0',
        boxShadow: isHighlighted 
          ? (isNewlyActivated ? '0 0 14px rgba(22, 163, 74, 0.22)' : '0 0 14px rgba(220, 38, 38, 0.22)') 
          : 'none',
        transition: 'all 0.4s ease'
      },
      badge: isHighlighted ? (
        <span style={{
          fontSize: '0.66rem',
          fontWeight: 800,
          padding: '2px 8px',
          borderRadius: '6px',
          background: isNewlyActivated ? '#dcfce7' : '#fee2e2',
          color: isNewlyActivated ? '#15803d' : '#b91c1c',
          border: isNewlyActivated ? '1px solid #86efac' : '1px solid #fca5a5',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {isNewlyActivated ? '✨ Neu aktiviert' : '🔒 Automatisch geschützt'}
        </span>
      ) : null
    };
  };

  const hlTts = getHighlightProps('allowTts');
  const hlTimer = getHighlightProps('allowTimer');
  const hlProposals = getHighlightProps('allowProposals');
  const hlAudio = getHighlightProps('allowAudio');
  const hlAbsences = getHighlightProps('allowAbsences');
  const hlReschedule = getHighlightProps('allowRescheduleConfirm');
  const hlChat = getHighlightProps('allowChat');
  const hlLeaderboard = getHighlightProps('allowLeaderboard');

  const pendingTeacherAudioRequest = (() => {
    if (typeof window === 'undefined' || !studentId) return null;
    const raw = localStorage.getItem(`groovelab_parent_req_teacher_audio_${studentId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { requestedAt: raw, teacherName: 'Die Lehrkraft' };
    }
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 🛡️ Anfrage der Lehrkraft für didaktische Audio-Freigabe */}
      {pendingTeacherAudioRequest && !curTeacherAudio && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          borderRadius: '20px',
          padding: '16px 18px',
          border: '1.5px solid #86efac',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Headphones size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 850, color: '#14532d' }}>
                Anfrage von {pendingTeacherAudioRequest.teacherName || 'der Lehrkraft'}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 600 }}>
                Didaktische Tonaufnahme im Unterricht (Freiwillige Lernanalyse)
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#14532d', lineHeight: 1.4 }}>
            Die Lehrkraft bittet um Erlaubnis, im Unterricht kurze Tonbeispiele deines Kindes für gezielte Lernanalysen aufzunehmen.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={async () => {
                await applyAndSaveParentControls({ allowTeacherAudio: true });
                try {
                  localStorage.removeItem(`groovelab_parent_req_teacher_audio_${studentId}`);
                } catch {}
              }}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              ✓ Erlaubnis erteilen
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(`groovelab_parent_req_teacher_audio_${studentId}`);
                } catch {}
              }}
              style={{
                background: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Später entscheiden
            </button>
          </div>
        </div>
      )}

      {/* 🛡️ Volljährigkeits-Selbstbestimmung (Art. 6 Abs. 1 lit. a DSGVO) */}
      {isAdultStudent && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#15803d" />
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#15803d' }}>
                Volljährigkeit (§ 2 BGB): Privatsphäre &amp; Eltern-Einblick
              </span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.80rem', fontWeight: 700, color: '#15803d' }}>
              <input 
                type="checkbox" 
                checked={Boolean((studentUser as any)?.adult_allow_parent_access)}
                onChange={async (e) => {
                  const nextVal = e.target.checked;
                  try {
                    if (studentUser?.id || studentId) {
                      await supabase.from('users').update({ adult_allow_parent_access: nextVal }).eq('id', studentUser?.id || studentId);
                      if (studentUser) (studentUser as any).adult_allow_parent_access = nextVal;
                    }
                  } catch (err) {}
                }}
                style={{ width: '16px', height: '16px', accentColor: '#16a34a' }}
              />
              <span>Eltern-Lesezugriff gestatten</span>
            </label>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#166534', lineHeight: 1.4 }}>
            Als volljährige Person bestimmst du selbst über deine Daten (Art. 6 Abs. 1 lit. a DSGVO). Wenn diese Option deaktiviert ist, wird der elterliche Zugriff über die Eltern-PIN vollständig gesperrt.
          </div>
        </div>
      )}

      {/* Campus UI Design Switcher (Junior, Teen, +16) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '18px',
        borderRadius: '18px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        textAlign: 'left'
      }}>
        <div>
          <div style={{ fontSize: '0.92rem', fontWeight: 850, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={18} color="#0284c7" />
            <span>App-Design &amp; Altersstufe (Campus)</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500, lineHeight: 1.4, marginTop: '2px' }}>
            Legt fest, welche Benutzeroberfläche und Standard-Boards {studentUser?.first_name ? `${studentUser.first_name}` : 'dein Kind'} in der Web-App sieht.
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          background: '#e2e8f0',
          padding: '5px',
          borderRadius: '14px'
        }}>
          {[
            { id: 'junior', label: 'Junior', age: '6–10 J.' },
            { id: 'teen', label: 'Teen', age: '11–15 J.' },
            { id: 'pro', label: '+16 / Pro', age: 'Ab 16 J.' }
          ].map((lvl) => {
            const currentLevel = currentLvlKey;
            const active = currentLevel === lvl.id;
            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => {
                  handleSwitchAgeLevelWithStandard(lvl.id as any);
                }}
                style={{
                  padding: '10px 6px',
                  borderRadius: '11px',
                  border: 'none',
                  background: active ? '#ffffff' : 'transparent',
                  color: active ? '#0284c7' : '#64748b',
                  fontWeight: active ? 850 : 650,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{lvl.label}</span>
                <span style={{ fontSize: '0.66rem', opacity: active ? 0.9 : 0.7 }}>{lvl.age}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🛡️ Feedback-Banner bei automatischem Standard-Load */}
      {recentlyChangedDiff && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: '12px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          color: '#0369a1',
          fontSize: '0.78rem',
          fontWeight: 700,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#0284c7" />
            <span>
              Empfohlener Standard für <strong>{recentlyChangedDiff.targetLevelLabel}</strong> geladen ({recentlyChangedDiff.keys.length} Funktion{recentlyChangedDiff.keys.length > 1 ? 'en' : ''} automatisch angepasst)
            </span>
          </div>
          <span style={{ fontSize: '0.70rem', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
            Standard aktiv
          </span>
        </div>
      )}

      {/* 🌟 Musikalische Förderung & Pädagogisches Entwicklungsraster (5 Säulen) */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '20px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem' }}>{currentLvlKey === 'junior' ? '⭐' : '📊'}</span>
            <div>
              <div style={{ fontSize: '0.94rem', fontWeight: 850, color: '#0f172a' }}>
                {radarTitle} · Didaktisches Entwicklungsraster
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 550, marginTop: '2px' }}>
                Persönliche, behutsame Förderung durch die Musiklehrkraft (keine Noten, kein Leistungsdruck)
              </div>
            </div>
          </div>
          {activeWeeklyFocus ? (
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#b45309',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              padding: '3px 10px',
              borderRadius: '100px'
            }}>
              🎯 Wochenfokus aktiv
            </span>
          ) : (
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#475569',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              padding: '3px 10px',
              borderRadius: '100px'
            }}>
              {currentLvlKey === 'junior' ? '⭐ Rundum-Zauber' : currentLvlKey === 'pro' ? '🏛️ Harmonische Balance' : '🌈 Ganzheitlich'}
            </span>
          )}
        </div>

        {/* 5 Pillars Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {SKILL_TAGS.map(tag => {
            const rawLvl = (skillLevels as any)[tag.key] ?? (tag.legacyKey ? (skillLevels as any)[tag.legacyKey] : undefined);
            const level = typeof rawLvl === 'number' && rawLvl >= 1 && rawLvl <= 5 ? rawLvl : 1;
            const isFocus = activeWeeklyFocus === tag.key || (tag.legacyKey && activeWeeklyFocus === tag.legacyKey);

            return (
              <div
                key={tag.key}
                style={{
                  background: isFocus ? (tag.lightBg || '#fffbeb') : '#f8fafc',
                  border: `1px solid ${isFocus ? (tag.border || '#fde68a') : '#f1f5f9'}`,
                  borderRadius: '14px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: tag.color || '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{tag.icon}</span>
                    <span>{tag.shortLabel}</span>
                  </span>
                  {isFocus ? (
                    <span style={{ fontSize: '0.66rem', fontWeight: 850, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: '100px' }}>
                      Fokus
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>
                      Stufe {level}/5
                    </span>
                  )}
                </div>

                {/* 5 Dots Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map(seg => (
                    <span
                      key={seg}
                      style={{
                        height: '6px',
                        flex: 1,
                        borderRadius: '3px',
                        background: level >= seg ? (tag.dotColor || '#3b82f6') : '#e2e8f0',
                        transition: 'all 0.15s ease'
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Granular Board & Feature Toggles with Reset to Age Standard */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 850, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} color="#0284c7" />
            <span>Individuelle Board- &amp; Feature-Freigaben</span>
          </div>
          {isDeviating ? (
            <button
              type="button"
              onClick={() => applyAndSaveParentControls(standard)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '8px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#0369a1',
                fontSize: '0.72rem',
                fontWeight: 750,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              className="hover-scale"
              title={`Setzt alle Freigaben auf den empfohlenen Standard für ${standard.label} zurück`}
            >
              <RotateCcw size={12} />
              <span>Standard für {standard.label} wiederherstellen</span>
            </button>
          ) : (
            <span style={{ fontSize: '0.70rem', color: '#16a34a', fontWeight: 750, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Check size={12} strokeWidth={3} />
              <span>Standard für {standard.label} aktiv</span>
            </span>
          )}
        </div>

        {/* Toggle 1: Audio-Vorleseassistent (Sprachausgabe) */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderRadius: '16px',
          cursor: 'pointer',
          ...hlTts.style
        }}>
          <div style={{ paddingRight: '12px', textAlign: 'left' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Volume2 size={16} color="#0284c7" style={{ flexShrink: 0 }} />
              <span>Audio-Vorleseassistent (Sprachausgabe)</span>
              {currentLvlKey === 'junior' && (
                <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: '#dcfce7', color: '#16a34a' }}>
                  Empfohlen für Junior
                </span>
              )}
              {hlTts.badge}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
              Liest Hausaufgaben, Notizen und Übe-Fahrpläne kindgerecht laut auf Deutsch vor. Unverzichtbar für Leseanfänger und bei LRS/Dyslexie.
            </div>
          </div>
          <input
            type="checkbox"
            checked={curTts}
            onChange={(e) => applyAndSaveParentControls({ allowTts: e.target.checked })}
            style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer' }}
          />
        </label>

        {/* Toggle 2: Practice Board (Übe-Pfad & Fokus-Timer) */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderRadius: '16px',
          cursor: 'pointer',
          ...hlTimer.style
        }}>
          <div style={{ paddingRight: '12px', textAlign: 'left' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Zap size={16} color="#0284c7" style={{ flexShrink: 0 }} />
              <span>Übe-Pfad &amp; Fokus-Timer</span>
              {hlTimer.badge}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
              {currentLvlKey === 'junior' 
                ? 'Pädagogischer Übe-Timer und Fleiß-Sterne ohne Verluststress für eigenständiges Üben zu Hause.'
                : 'Interaktiver Fokus-Timer, Kontinuität und Meilensteine für eigenständiges Üben zu Hause.'}
            </div>
          </div>
          <input
            type="checkbox"
            checked={curTimer}
            onChange={(e) => applyAndSaveParentControls({ allowTimer: e.target.checked, boardOverrides: { practice_board: e.target.checked } })}
            style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer' }}
          />
        </label>

        {/* Toggle 3: Mediathek: Songs, Begleitspuren & Fahrpläne */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderRadius: '16px',
          cursor: 'pointer',
          ...hlProposals.style
        }}>
          <div style={{ paddingRight: '12px', textAlign: 'left' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Library size={16} color="#0284c7" style={{ flexShrink: 0 }} />
              <span>Mediathek: Songs, Begleitspuren &amp; Fahrpläne</span>
              {hlProposals.badge}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
              Schulkatalog, Play-Along-Tracks und strukturierte Übe-Fahrpläne. Urheberrechtskonform ohne Notenblatt-Downloads (§ 53 Abs. 4 UrhG).
            </div>
          </div>
          <input
            type="checkbox"
            checked={curProposals}
            onChange={(e) => applyAndSaveParentControls({ allowProposals: e.target.checked, boardOverrides: { mediathek: e.target.checked } })}
            style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer' }}
          />
        </label>

        {/* Toggle 4: Checkbox 1 - Eigene Song-Aufnahmen des Schülers (Art. 8 DSGVO / KUG) */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderRadius: '16px',
          cursor: 'pointer',
          ...hlAudio.style
        }}>
          <div style={{ paddingRight: '12px', textAlign: 'left' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Mic size={16} color="#0284c7" style={{ flexShrink: 0 }} />
              <span>Eigene Tonaufnahmen des Schülers (Übe-Studio &amp; Loopstation)</span>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1' }}>
                Art. 8 DSGVO
              </span>
              {hlAudio.badge}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
              Erlaubt deinem Kind, eigene Übe-Aufnahmen, Loopstation-Spuren und Memos mit dem Mikrofon aufzuzeichnen. Standardmäßig deaktiviert (Privacy by Default) zum Schutz Minderjähriger. Inkl. 30-Tage-Speicherfrist.
            </div>
          </div>
          <input
            type="checkbox"
            checked={curStudentAudio && curAudio}
            onChange={(e) => applyAndSaveParentControls({ 
              allowAudio: e.target.checked, 
              allowStudentAudio: e.target.checked, 
              boardOverrides: { recordings: e.target.checked } 
            })}
            style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer' }}
          />
        </label>

        {/* Toggle 4b: Checkbox 2 - Didaktische Tonaufnahmen der Lehrkraft im Unterricht (§ 201 StGB / § 73 UrhG) */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderRadius: '16px',
          cursor: 'pointer',
          background: curTeacherAudio ? '#f0fdf4' : '#f8fafc',
          border: curTeacherAudio ? '1.5px solid #86efac' : '1px solid #e2e8f0',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ paddingRight: '12px', textAlign: 'left' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Headphones size={16} color="#16a34a" style={{ flexShrink: 0 }} />
              <span>Tonaufnahmen des Schülers durch die Lehrkraft im Unterricht</span>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: '#dcfce7', color: '#15803d' }}>
                Freiwillige Didaktik-Freigabe
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
              Erlaubt der Lehrkraft, im Unterricht kurze Tonaufnahmen deines Kindes für gezielte Lernanalysen (Korrektur, Vorspiel-Feedback) aufzunehmen. Diese Freigabe ist freiwillig und kann jederzeit widerrufen werden. Ist dieser Schalter aus, darf die Lehrkraft zum Schutz der Schüler ausschließlich sich selbst vorspielen.
            </div>
          </div>
          <input
            type="checkbox"
            checked={curTeacherAudio}
            onChange={(e) => applyAndSaveParentControls({ allowTeacherAudio: e.target.checked })}
            style={{ width: '20px', height: '20px', accentColor: '#16a34a', cursor: 'pointer' }}
          />
        </label>

        {/* Toggle 5: Absences (Unterrichtsstunden selbstständig absagen) */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderRadius: '16px',
          opacity: currentLvlKey === 'junior' ? 0.75 : 1,
          cursor: currentLvlKey === 'junior' ? 'not-allowed' : 'pointer',
          ...hlAbsences.style
        }}>
          <div style={{ paddingRight: '12px', textAlign: 'left' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: currentLvlKey === 'junior' ? '#64748b' : '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Calendar size={16} color={currentLvlKey === 'junior' ? '#94a3b8' : '#0284c7'} style={{ flexShrink: 0 }} />
              <span>Unterrichtsstunden selbstständig absagen</span>
              {currentLvlKey === 'junior' && (
                <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626' }}>
                  Im Junior-Modus gesperrt
                </span>
              )}
              {hlAbsences.badge}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
              {currentLvlKey === 'junior'
                ? 'Aus rechtlichen Gründen (Vertragsschutz der Eltern) im Junior-Modus dauerhaft deaktiviert. Absagen erfolgen über den Eltern-Zugang.'
                : (currentLvlKey === 'teen'
                    ? 'Erlaubt deinem Teenager, Termine bei Verhinderung selbstständig abzusagen (Eltern erhalten sofort eine Benachrichtigung).'
                    : 'Erlaubt eigenständige Terminabmeldung im Verhinderungsfall gemäß dem Unterrichtsvertrag deiner Musikschule.')}
            </div>
          </div>
          <input
            type="checkbox"
            disabled={currentLvlKey === 'junior'}
            checked={currentLvlKey === 'junior' ? false : curAbsences}
            onChange={(e) => {
              if (currentLvlKey !== 'junior') {
                applyAndSaveParentControls({ allowAbsences: e.target.checked });
              }
            }}
            style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: currentLvlKey === 'junior' ? 'not-allowed' : 'pointer' }}
          />
        </label>

        {/* Toggle 5b: Ausweich- & Verschiebungstermine selbstständig annehmen */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderRadius: '16px',
          opacity: currentLvlKey === 'junior' ? 0.75 : 1,
          cursor: currentLvlKey === 'junior' ? 'not-allowed' : 'pointer',
          ...hlReschedule.style
        }}>
          <div style={{ paddingRight: '12px', textAlign: 'left' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: currentLvlKey === 'junior' ? '#64748b' : '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <RotateCcw size={16} color={currentLvlKey === 'junior' ? '#94a3b8' : '#0284c7'} style={{ flexShrink: 0 }} />
              <span>Ausweich- &amp; Verschiebungstermine annehmen</span>
              {currentLvlKey === 'junior' && (
                <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626' }}>
                  Im Junior-Modus Eltern-PIN erforderlich
                </span>
              )}
              {hlReschedule.badge}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
              {currentLvlKey === 'junior'
                ? 'Im Junior-Modus standardmäßig geschützt. Ausweichtermine müssen von den Eltern per PIN freigegeben werden.'
                : 'Erlaubt deinem Kind, von der Lehrkraft vorgeschlagene Ausweichtermine selbstständig anzunehmen. Wenn deaktiviert, wird die Eltern-PIN verlangt.'}
            </div>
          </div>
          <input
            type="checkbox"
            disabled={currentLvlKey === 'junior'}
            checked={currentLvlKey === 'junior' ? false : curReschedule}
            onChange={(e) => {
              if (currentLvlKey !== 'junior') {
                applyAndSaveParentControls({ allowRescheduleConfirm: e.target.checked });
              }
            }}
            style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: currentLvlKey === 'junior' ? 'not-allowed' : 'pointer' }}
          />
        </label>

        {/* Toggle 6: Chat (Direktnachrichten an Lehrkräfte schreiben) */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderRadius: '16px',
          cursor: 'pointer',
          ...hlChat.style
        }}>
          <div style={{ paddingRight: '12px', textAlign: 'left' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Mail size={16} color="#0284c7" style={{ flexShrink: 0 }} />
              <span>Direktnachrichten an Lehrkräfte schreiben</span>
              {hlChat.badge}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
              {currentLvlKey === 'junior'
                ? 'Im Junior-Modus standardmäßig deaktiviert (Kinderschutz). Erlaubt bei Freigabe nur direkte Fragen zu Hausaufgaben.'
                : 'Erlaubt deinem Kind, im Chat Nachrichten und Fragen zu Hausaufgaben und Songs an die Lehrkraft zu senden.'}
            </div>
            <div style={{ fontSize: '0.70rem', color: '#0369a1', fontWeight: 650, marginTop: '4px' }}>
              💬 Chatverlauf jederzeit im Menüpunkt „Nachrichten“ einsehbar.
            </div>
          </div>
          <input
            type="checkbox"
            checked={curChat}
            onChange={(e) => applyAndSaveParentControls({ allowChat: e.target.checked, boardOverrides: { messages: e.target.checked } })}
            style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer' }}
          />
        </label>

        {/* Toggle 7: Leaderboard (Klassen-Highlights & Team-Power) */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderRadius: '16px',
          cursor: 'pointer',
          ...hlLeaderboard.style
        }}>
          <div style={{ paddingRight: '12px', textAlign: 'left' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Trophy size={16} color="#0284c7" style={{ flexShrink: 0 }} />
              <span>Klassen-Highlights &amp; Team-Power</span>
              {hlLeaderboard.badge}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
              {currentLvlKey === 'junior'
                ? 'Gemeinsame Klassen-Ziele ohne individuelle Ranglisten oder Leistungsdruck (DSA Art. 28 konform).'
                : 'Gemeinsame Übe-Minuten sammeln, Meilensteine der Klasse feiern und Team-Ziele erreichen.'}
            </div>
          </div>
          <input
            type="checkbox"
            checked={curLeaderboard}
            onChange={(e) => applyAndSaveParentControls({ allowLeaderboard: e.target.checked, boardOverrides: { campus_cup: e.target.checked } })}
            style={{ width: '20px', height: '20px', accentColor: '#0284c7', cursor: 'pointer' }}
          />
        </label>
      </div>
    </div>
  );
};

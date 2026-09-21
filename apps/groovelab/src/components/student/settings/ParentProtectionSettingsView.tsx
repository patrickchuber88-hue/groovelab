import React, { useState, useEffect } from 'react';
import {
  Compass, Sliders, Volume2, Zap, Mic, Headphones, Calendar, RotateCcw,
  Mail, Trophy, Sparkles, Check, ShieldCheck, AlertTriangle, Star, Target, BookOpen, Lock, Crown
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { CAMPUS_AGE_STANDARDS } from '../studentAgeStandards';

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
  draftAllowProposals?: boolean | null;
  draftAllowAudio: boolean | null;
  draftAllowTts: boolean | null;
  draftBoardOverrides: Record<string, boolean>;
  applyAndSaveParentControls: (updates: any) => Promise<void>;
  recentlyChangedDiff: any;
  setRecentlyChangedDiff: React.Dispatch<React.SetStateAction<any>>;
  cancelledSchoolYearOccurrences: any[];
  scheduleOccurrences: any[];
  onLockSession?: () => void;
  parentSessionSecondsRemaining?: number;
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
  onLockSession,
  parentSessionSecondsRemaining,
}) => {
  const [optimisticLevel, setOptimisticLevel] = useState<'junior' | 'teen' | 'pro' | null>(null);
  const baseLvlKey = ((draftUiLevel ?? (studentUser as any)?.campus_ui_level ?? (typeof window !== 'undefined' ? localStorage.getItem('campus_student_ui_level') : null)) || 'junior') as 'junior' | 'teen' | 'pro';
  const currentLvlKey = (optimisticLevel || baseLvlKey);

  useEffect(() => {
    if (optimisticLevel && baseLvlKey === optimisticLevel) {
      setOptimisticLevel(null);
    }
  }, [baseLvlKey, optimisticLevel]);

  const standard = CAMPUS_AGE_STANDARDS[currentLvlKey] || CAMPUS_AGE_STANDARDS.junior;

  const curAbsences = currentLvlKey === 'junior' 
    ? false 
    : (draftAllowAbsences !== null 
        ? draftAllowAbsences 
        : ((studentUser as any)?.parent_allow_absences !== undefined && (studentUser as any)?.parent_allow_absences !== null 
            ? Boolean((studentUser as any)?.parent_allow_absences) 
            : standard.allowAbsences));
  
  const curReschedule = currentLvlKey === 'junior'
    ? false
    : (draftAllowReschedule !== null 
        ? draftAllowReschedule 
        : ((studentUser as any)?.parent_allow_reschedule_confirm !== undefined && (studentUser as any)?.parent_allow_reschedule_confirm !== null 
            ? Boolean((studentUser as any)?.parent_allow_reschedule_confirm) 
            : standard.allowRescheduleConfirm));
  
  const curChat = draftAllowChat !== null 
    ? draftAllowChat 
    : ((studentUser as any)?.parent_allow_chat !== undefined && (studentUser as any)?.parent_allow_chat !== null 
        ? Boolean((studentUser as any)?.parent_allow_chat) 
        : standard.allowChat);
  
  const curTimer = draftAllowTimer !== null 
    ? draftAllowTimer 
    : ((studentUser as any)?.parent_allow_timer !== undefined && (studentUser as any)?.parent_allow_timer !== null 
        ? Boolean((studentUser as any)?.parent_allow_timer) 
        : standard.allowTimer);
  
  const curLeaderboard = draftAllowLeaderboard !== null 
    ? draftAllowLeaderboard 
    : ((studentUser as any)?.parent_allow_leaderboard !== undefined && (studentUser as any)?.parent_allow_leaderboard !== null 
        ? Boolean((studentUser as any)?.parent_allow_leaderboard) 
        : standard.allowLeaderboard);
  
  const curAudio = draftAllowAudio !== null 
    ? draftAllowAudio 
    : ((studentUser as any)?.parent_allow_audio !== undefined && (studentUser as any)?.parent_allow_audio !== null 
        ? Boolean((studentUser as any)?.parent_allow_audio) 
        : (draftBoardOverrides.recordings ?? standard.allowAudio));
  
  const curTeacherAudio = (studentUser as any)?.parent_permissions?.allow_teacher_audio !== undefined
    ? Boolean((studentUser as any)?.parent_permissions?.allow_teacher_audio)
    : standard.allowTeacherAudio;
  
  const curStudentAudio = (studentUser as any)?.parent_permissions?.allow_student_audio !== undefined
    ? Boolean((studentUser as any)?.parent_permissions?.allow_student_audio)
    : standard.allowStudentAudio;
  
  const curTts = draftAllowTts !== null 
    ? draftAllowTts 
    : ((studentUser as any)?.parent_allow_tts !== undefined && (studentUser as any)?.parent_allow_tts !== null 
        ? Boolean((studentUser as any)?.parent_allow_tts) 
        : standard.allowTts);

  const isDeviating = 
    curAbsences !== standard.allowAbsences ||
    curReschedule !== standard.allowRescheduleConfirm ||
    curChat !== standard.allowChat ||
    curTimer !== standard.allowTimer ||
    curLeaderboard !== standard.allowLeaderboard ||
    curAudio !== standard.allowAudio ||
    curStudentAudio !== standard.allowStudentAudio ||
    curTeacherAudio !== standard.allowTeacherAudio ||
    curTts !== standard.allowTts;

  const [isSwitchingLevel, setIsSwitchingLevel] = useState<boolean>(false);

  const handleSwitchAgeLevelWithStandard = async (targetLevelId: 'junior' | 'teen' | 'pro') => {
    if (targetLevelId === currentLvlKey || isSwitchingLevel) return;
    setOptimisticLevel(targetLevelId);
    setIsSwitchingLevel(true);
    try {
      const targetStandard = CAMPUS_AGE_STANDARDS[targetLevelId] || CAMPUS_AGE_STANDARDS.junior;

      const currentValues: Record<string, boolean> = {
        allowAbsences: curAbsences,
        allowRescheduleConfirm: curReschedule,
        allowChat: curChat,
        allowTimer: curTimer,
        allowLeaderboard: curLeaderboard,
        allowAudio: curAudio,
        allowStudentAudio: curStudentAudio,
        allowTeacherAudio: curTeacherAudio,
        allowTts: curTts,
      };

      const targetValues: Record<string, boolean> = {
        allowAbsences: targetStandard.allowAbsences,
        allowRescheduleConfirm: targetStandard.allowRescheduleConfirm,
        allowChat: targetStandard.allowChat,
        allowTimer: targetStandard.allowTimer,
        allowLeaderboard: targetStandard.allowLeaderboard,
        allowAudio: targetStandard.allowAudio,
        allowStudentAudio: targetStandard.allowStudentAudio,
        allowTeacherAudio: targetStandard.allowTeacherAudio,
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
        allowProposals: true,
        allowAudio: targetStandard.allowAudio,
        allowStudentAudio: targetStandard.allowStudentAudio,
        allowTeacherAudio: targetStandard.allowTeacherAudio,
        allowTts: targetStandard.allowTts,
        boardOverrides: { ...targetStandard.boardOverrides, mediathek: true },
        bedtimeEnabled: targetStandard.bedtimeEnabled,
        bedtimeStart: targetStandard.bedtimeStart,
        bedtimeEnd: targetStandard.bedtimeEnd,
      });
    } catch (err) {
      setOptimisticLevel(null);
      console.error('Error switching age level:', err);
    } finally {
      setIsSwitchingLevel(false);
    }
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
  const hlAudio = getHighlightProps('allowAudio');
  const hlTeacherAudio = getHighlightProps('allowTeacherAudio');
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
      {/* 🛡️ TIER 1 SAAS ENTERPRISE+ PARENT SESSION STATUS BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        borderRadius: '18px',
        padding: '14px 18px',
        border: '1.5px solid #86efac',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        boxShadow: '0 4px 14px rgba(22, 163, 74, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            background: '#16a34a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 850, color: '#14532d', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Eltern-Sitzung aktiv & autorisiert</span>
              {parentSessionSecondsRemaining !== undefined && parentSessionSecondsRemaining > 0 && (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: 'rgba(22, 163, 74, 0.15)',
                  color: '#15803d',
                  padding: '2px 8px',
                  borderRadius: '20px'
                }}>
                  {Math.floor(parentSessionSecondsRemaining / 60)}:{(parentSessionSecondsRemaining % 60).toString().padStart(2, '0')} Min.
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 600 }}>
              Änderungen werden sofort revisionssicher gespeichert (ohne erneute PIN-Eingabe).
            </div>
          </div>
        </div>

        {onLockSession && (
          <button
            type="button"
            onClick={onLockSession}
            style={{
              background: '#ffffff',
              border: '1px solid #86efac',
              borderRadius: '10px',
              padding: '7px 14px',
              fontSize: '0.76rem',
              fontWeight: 800,
              color: '#15803d',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              touchAction: 'manipulation'
            }}
            className="hover-scale"
            title="Elternbereich jetzt kindersicher sperren"
          >
            <Lock size={13} />
            Jetzt sperren
          </button>
        )}
      </div>

      {/* 💡 DIDAKTISCHE EMPFEHLUNG DER LEHRKRAFT */}
      {(() => {
        const rec = (studentUser as any)?.parent_permissions?.teacher_recommendation;
        if (!rec) return null;
        return (
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            borderRadius: '20px',
            padding: '16px 20px',
            border: '1.5px solid #93c5fd',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            textAlign: 'left',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.10)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 850, color: '#1e3a8a' }}>
                    Empfehlung von {rec.teacher_name || 'der Lehrkraft'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    Empfohlene Freigabe: <strong>{rec.recommended_level === 'teen' ? 'Teen-Stufe (11–15 J.)' : rec.recommended_level === 'loopstation' ? 'Loopstation' : 'Pro-Stufe (ab 16 J.)'}</strong>
                  </div>
                </div>
              </div>
              {rec.recommended_level && rec.recommended_level !== currentLvlKey && rec.recommended_level !== 'loopstation' && (
                <button
                  type="button"
                  onClick={() => handleSwitchAgeLevelWithStandard(rec.recommended_level as any)}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '6px 14px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                  className="hover-scale"
                >
                  Jetzt übernehmen
                </button>
              )}
            </div>
            {rec.note && (
              <div style={{ fontSize: '0.78rem', color: '#334155', fontStyle: 'italic', background: 'rgba(255,255,255,0.6)', padding: '8px 12px', borderRadius: '10px' }}>
                „{rec.note}“
              </div>
            )}
          </div>
        );
      })()}

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
                Volljährigkeit: Privatsphäre &amp; Eltern-Einblick
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

        <div 
          role="tablist"
          aria-label="Didaktische Altersstufe"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'
          }}
        >
          {[
            { 
              id: 'junior' as const, 
              label: 'Junior', 
              age: '6–10 J.', 
              icon: Sparkles, 
              color: '#16a34a',
              activeBorder: 'rgba(22, 163, 74, 0.4)',
              desc: 'Spielerisch & einfach'
            },
            { 
              id: 'teen' as const, 
              label: 'Teen', 
              age: '11–15 J.', 
              icon: Zap, 
              color: '#0284c7',
              activeBorder: 'rgba(2, 132, 199, 0.4)',
              desc: 'Fokus & Flow'
            },
            { 
              id: 'pro' as const, 
              label: '+16 / Pro', 
              age: 'Ab 16 J.', 
              icon: Crown, 
              color: '#6366f1',
              activeBorder: 'rgba(99, 102, 241, 0.4)',
              desc: 'Volles Studio & Tools'
            }
          ].map((lvl) => {
            const active = currentLvlKey === lvl.id;
            const IconComp = lvl.icon;
            return (
              <button
                key={lvl.id}
                type="button"
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                aria-label={`Altersstufe ${lvl.label} (${lvl.age}): ${lvl.desc}`}
                onClick={() => {
                  handleSwitchAgeLevelWithStandard(lvl.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSwitchAgeLevelWithStandard(lvl.id);
                  }
                }}
                style={{
                  padding: '10px 6px',
                  minHeight: '48px',
                  borderRadius: '12px',
                  border: active ? `1.5px solid ${lvl.activeBorder}` : '1px solid transparent',
                  background: active ? '#ffffff' : 'transparent',
                  color: active ? lvl.color : '#64748b',
                  fontWeight: active ? 850 : 650,
                  fontSize: '0.82rem',
                  cursor: isSwitchingLevel ? 'wait' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  boxShadow: active ? '0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)' : 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <IconComp size={14} color={active ? lvl.color : '#94a3b8'} />
                  <span style={{ fontWeight: 850 }}>{lvl.label}</span>
                </div>
                <span style={{ 
                  fontSize: '0.66rem', 
                  color: active ? lvl.color : '#64748b',
                  fontWeight: active ? 700 : 500,
                  opacity: active ? 1 : 0.75 
                }}>
                  {lvl.age}
                </span>
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
            checked={Boolean(curStudentAudio && curAudio)}
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
          ...(hlTeacherAudio.isHighlighted ? hlTeacherAudio.style : {
            background: curTeacherAudio ? '#f0fdf4' : '#f8fafc',
            border: curTeacherAudio ? '1.5px solid #86efac' : '1px solid #e2e8f0',
            transition: 'all 0.2s ease'
          })
        }}>
          <div style={{ paddingRight: '12px', textAlign: 'left' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Headphones size={16} color="#16a34a" style={{ flexShrink: 0 }} />
              <span>Didaktische Tonaufnahmen der Lehrkraft im Unterricht</span>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: '#dcfce7', color: '#15803d' }}>
                Freiwillige Didaktik-Freigabe (Vertraulichkeit)
              </span>
              {hlTeacherAudio.badge}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35, marginTop: '2px' }}>
              Erlaubt der Lehrkraft, im Unterricht kurze Tonaufnahmen deines Kindes für gezielte Lernanalysen (Korrektur, Vorspiel-Feedback) aufzunehmen. Diese Freigabe ist freiwillig und kann jederzeit widerrufen werden. Ist dieser Schalter aus, darf die Lehrkraft zum Schutz der Schüler ausschließlich sich selbst vorspielen.
            </div>
          </div>
          <input
            type="checkbox"
            checked={Boolean(curTeacherAudio)}
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

        {/* End-of-List Safe Area Spacer (Zero Occlusion) */}
        <div
          style={{ height: 'calc(80px + env(safe-area-inset-bottom, 24px))', width: '100%', flexShrink: 0 }}
          className="mobile-bottom-clearance-spacer"
        />
      </div>
    </div>
  );
};

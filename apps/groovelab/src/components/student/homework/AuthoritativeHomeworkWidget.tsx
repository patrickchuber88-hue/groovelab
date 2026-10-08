import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen, Music, Headphones, FileText, HelpCircle,
  Play, Pause, Check, AlertTriangle, ChevronRight, Sparkles
} from 'lucide-react';
import {
  useAuthoritativeHomeworkPlan, AuthoritativeHomeworkPlan, UseAuthoritativeHomeworkPlanParams
} from '../hooks/useAuthoritativeHomeworkPlan';
import { useAuthoritativeHomeworkOptional } from '../context/AuthoritativeHomeworkContext';
import { isWeeklySnapshotContainer, formatConsecutivePageRanges } from '../tabs/briefing/homeworkSummaryHelper';
import { getSongColor } from '../studentDateUtils';
import { StudentHomeworkStatusButton } from './StudentHomeworkStatusButton';
import { MicroScoreSnippetButton } from '../meisterwerk/microscore/MicroScoreSnippetButton';

export interface AuthoritativeHomeworkWidgetProps extends UseAuthoritativeHomeworkPlanParams {
  variant?: 'hero' | 'stage_banner' | 'hud';
  plan?: AuthoritativeHomeworkPlan;
  onOpenHomework?: () => void;
  onOpenQuestionModal?: () => void;
  onOpenRecordings?: () => void;
  isMusicStandMode?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;
}

const cardRowStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #f1f5f9',
  boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.04)',
  padding: '10px 14px',
  borderRadius: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px'
};

const getReflStyle = (refl?: 'super' | 'wackelig' | 'hilfe') => ({
  color: refl === 'super' ? '#ffffff' : refl === 'wackelig' ? '#b45309' : refl === 'hilfe' ? '#b91c1c' : '#64748b',
  background: refl === 'super' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : refl === 'wackelig' ? '#fef3c7' : refl === 'hilfe' ? '#fee2e2' : '#f1f5f9',
  border: refl === 'super' ? 'none' : refl === 'wackelig' ? '1px solid #fde68a' : refl === 'hilfe' ? '1px solid #fca5a5' : '1px solid #e2e8f0',
  boxShadow: refl === 'super' ? '0 2px 8px rgba(16, 185, 129, 0.28)' : 'none'
});

export const AuthoritativeHomeworkWidget: React.FC<AuthoritativeHomeworkWidgetProps> = ({
  variant = 'hero',
  plan: passedPlan,
  studentId,
  studentUser,
  localProgress,
  lehrwerke,
  progressItems,
  activeSongSkills,
  assignedCampusSongs,
  onOpenHomework,
  onOpenQuestionModal,
  onOpenRecordings,
  isMusicStandMode = false,
  theme = 'light',
  className = '',
  style = {}
}) => {
  const contextPlan = useAuthoritativeHomeworkOptional();
  const internalPlan = useAuthoritativeHomeworkPlan({
    studentId,
    studentUser,
    localProgress,
    lehrwerke,
    progressItems,
    activeSongSkills,
    assignedCampusSongs
  });

  const plan = passedPlan || contextPlan || internalPlan;
  const {
    books, songs, generalNotes, audioTracks, microScores, studentQuestion,
    taskReflections, setTaskReflection, hasActiveHomework
  } = plan;

  const safeSongs = (songs || []).filter(s =>
    !isWeeklySnapshotContainer(s.cleanTitle) &&
    !isWeeklySnapshotContainer(s.title) &&
    !isWeeklySnapshotContainer(s.artist)
  );
  const effectiveHasActiveHomework = hasActiveHomework && (books.length > 0 || safeSongs.length > 0 || generalNotes.length > 0 || (microScores && microScores.length > 0));

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleAudio = (url: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.ontimeupdate = () => { if (audioRef.current) setAudioCurrentTime(audioRef.current.currentTime); };
      audioRef.current.onloadedmetadata = () => { if (audioRef.current) setAudioDuration(audioRef.current.duration); };
      audioRef.current.onended = () => { setIsPlayingAudio(false); setAudioCurrentTime(0); };
    }
    if (audioRef.current.src !== url) audioRef.current.src = url;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(err => console.warn('Audio play error:', err));
    }
  };

  const formatSeconds = (sec?: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const cycleReflection = (taskId: string, label: string, currentStatus?: 'super' | 'wackelig' | 'hilfe') => {
    const cur = currentStatus !== undefined ? currentStatus : taskReflections[taskId]?.status;
    const next = cur === undefined ? 'super' : cur === 'super' ? 'wackelig' : cur === 'wackelig' ? 'hilfe' : undefined;
    setTaskReflection(taskId, (next as any) || '', label);
  };

  // ---------------------------------------------------------------------------
  // VARIANT: STAGE BANNER (1-Line layout for Aufgabenheft / Repertoire)
  // ---------------------------------------------------------------------------
  if (variant === 'stage_banner') {
    if (!effectiveHasActiveHomework) return null;
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label="Hausaufgaben Wochen-Fahrplan öffnen"
        onClick={onOpenHomework}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenHomework?.(); } }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          padding: '10px 16px', minHeight: '48px',
          background: theme === 'dark' ? '#1e293b' : '#ffffff',
          border: theme === 'dark' ? '1px solid #334154' : '1.5px solid #10b981',
          borderRadius: '16px', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)',
          cursor: onOpenHomework ? 'pointer' : 'default', transition: 'all 0.15s ease',
          boxSizing: 'border-box', ...style
        }}
        className={`hover-scale-mini ${className}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff',
            fontSize: '0.76rem', fontWeight: 900, padding: '4px 10px', borderRadius: '100px', flexShrink: 0
          }}>
            <Music size={13} strokeWidth={2.5} />
            <span>Wochen-Fahrplan</span>
          </div>

          {books.map((b, idx) => (
            <div key={`sb-b-${idx}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', fontWeight: 800,
              color: theme === 'dark' ? '#f8fafc' : '#0f172a',
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f8fafc',
              border: '1px solid #e2e8f0', padding: '3px 9px', borderRadius: '8px'
            }}>
              <BookOpen size={13} color="#e11d48" />
              <span>{b.title}</span>
              <span style={{ color: '#16a34a', fontWeight: 900 }}>{b.formattedPages}</span>
            </div>
          ))}

          {safeSongs.map((s, idx) => (
            <div key={`sb-s-${idx}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', fontWeight: 800,
              color: theme === 'dark' ? '#f8fafc' : '#0f172a',
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f8fafc',
              border: '1px solid #e2e8f0', padding: '3px 9px', borderRadius: '8px'
            }}>
              <Music size={13} color="#ca8a04" />
              <span>{s.cleanTitle}</span>
            </div>
          ))}

          {studentQuestion && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 800,
              color: '#854d0e', background: '#fef08a', padding: '3px 8px', borderRadius: '8px'
            }}>
              <HelpCircle size={12} color="#854d0e" />
              <span>Frage aktiv</span>
            </div>
          )}

          {audioTracks.length > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', fontWeight: 800,
              color: '#15803d', background: '#e6f4ea', padding: '3px 8px', borderRadius: '8px'
            }}>
              <Headphones size={12} />
              <span>{audioTracks.length === 1 ? '1 Aufnahme' : `${audioTracks.length} Aufnahmen`}</span>
            </div>
          )}
        </div>

        {onOpenHomework && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.80rem', fontWeight: 850, color: '#16a34a', flexShrink: 0 }}>
            <span>Aufgaben ansehen →</span>
            <ChevronRight size={16} />
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VARIANT: HUD (Ergonomic Pre-Session Notenständer display for Fokus-Timer)
  // ---------------------------------------------------------------------------
  if (variant === 'hud') {
    const isDark = theme === 'dark';
    const hudRow: React.CSSProperties = {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
      padding: '6px 10px', borderRadius: '10px', background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc'
    };
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', padding: '12px 14px',
        background: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
        borderRadius: '16px', boxShadow: isDark ? '0 4px 16px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
        boxSizing: 'border-box', ...style
      }} className={className}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Music size={14} color="#16a34a" strokeWidth={2.4} />
            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Wochen-Fahrplan
            </span>
          </div>
          {audioTracks.length > 0 && (
            <span style={{
              fontSize: '0.72rem', fontWeight: 800,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              padding: '2px 8px', borderRadius: '100px'
            }}>
              🎧 {audioTracks.length} {audioTracks.length === 1 ? 'Aufnahme' : 'Aufnahmen'}
            </span>
          )}
        </div>

        {books.map((b, idx) => {
          const taskId = `book-${b.title}`;
          return (
            <div key={`hud-b-${idx}`} style={hudRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                <BookOpen size={14} color="#f43f5e" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.title}
                </span>
                <span style={{ fontSize: '0.76rem', fontWeight: 850, color: '#059669', background: '#ecfdf5', border: '1px solid #10b981', padding: '2px 6px', borderRadius: '6px', flexShrink: 0 }}>
                  {formatConsecutivePageRanges(b.pages) || b.formattedPages}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <StudentHomeworkStatusButton
                  studentId={studentId || studentUser?.id}
                  taskId={taskId}
                  label={b.title}
                  variant="compact_hud"
                  theme={theme}
                />
              </div>
            </div>
          );
        })}

        {safeSongs.map((s, idx) => {
          const taskId = `song-${s.id || s.cleanTitle || idx}`;
          return (
            <div key={`hud-s-${idx}`} style={hudRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                <Music size={14} color="#eab308" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.cleanTitle}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {s.notes && (
                  <span style={{ fontSize: '0.76rem', color: isDark ? '#94a3b8' : '#64748b', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>
                    {s.notes}
                  </span>
                )}
                <StudentHomeworkStatusButton
                  studentId={studentId || studentUser?.id}
                  taskId={taskId}
                  label={s.cleanTitle}
                  variant="compact_hud"
                  theme={theme}
                />
              </div>
            </div>
          );
        })}

        {studentQuestion && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '10px',
            background: '#fffdf0', border: '1px solid #fde047', fontSize: '0.80rem', color: '#713f12'
          }}>
            <HelpCircle size={13} color="#ca8a04" style={{ flexShrink: 0 }} />
            <strong style={{ color: '#ca8a04' }}>Deine Frage:</strong>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>„{studentQuestion}“</span>
          </div>
        )}

        {!effectiveHasActiveHomework && (
          <div style={{ fontSize: '0.80rem', fontWeight: 650, color: isDark ? '#94a3b8' : '#64748b', padding: '4px 6px', fontStyle: 'italic' }}>
            Keine Hausaufgaben aufgegeben – freies Üben!
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VARIANT: HERO (Complete Briefing Board Card Layout)
  // ---------------------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', ...style }} className={className}>
      {/* 1. Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: isMusicStandMode ? '0.92rem' : '0.84rem', fontWeight: 950, color: '#34a853',
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            Hausaufgaben
          </span>
          {audioTracks.length > 0 && (
            <span style={{
              fontSize: '0.72rem', fontWeight: 850, color: '#ffffff', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none', padding: '2px 8px', borderRadius: '100px',
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }} title={`${audioTracks.length} Aufnahme(n) vorhanden`}>
              <Headphones size={11} strokeWidth={2.4} />
              <span>{audioTracks.length === 1 ? '1 Aufnahme' : `${audioTracks.length} Aufnahmen`}</span>
            </span>
          )}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          fontSize: isMusicStandMode ? '0.78rem' : '0.74rem', fontWeight: 800, color: '#16a34a', whiteSpace: 'nowrap'
        }}>
          <Music size={12} color="#16a34a" strokeWidth={2.4} />
          <span>Dein Wochen-Fahrplan</span>
        </div>
      </div>

      {/* 2. Lehrwerke Rows with 3-Level Reflection */}
      {books.map((b, idx) => {
        const pageRangeText = formatConsecutivePageRanges(b.pages) || b.formattedPages;
        const taskId = `book-${b.title}`;
        const refl = taskReflections[taskId]?.status || (b.pages?.[0] ? taskReflections[`book-${b.title}-page-${b.pages[0]}`]?.status : undefined);
        const rStyle = getReflStyle(refl);
        return (
          <div
            key={`hero-b-${idx}`}
            style={{ ...cardRowStyle, cursor: onOpenHomework ? 'pointer' : 'default' }}
            onClick={() => onOpenHomework?.()}
            role={onOpenHomework ? "button" : undefined}
            tabIndex={onOpenHomework ? 0 : undefined}
            aria-label={onOpenHomework ? `Lehrwerk ${b.title} im Aufgabenheft öffnen` : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#e11d48', boxShadow: '0 1px 3px rgba(225, 29, 72, 0.12)', flexShrink: 0
              }}>
                <BookOpen size={14} strokeWidth={2.4} />
              </div>
              <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {b.title}
              </span>
              {pageRangeText && (
                <span style={{
                  fontSize: '0.80rem', fontWeight: 900, color: '#059669', background: '#ecfdf5',
                  border: '1px solid #10b981', padding: '3px 9px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0
                }}>
                  {pageRangeText}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); cycleReflection(taskId, `${b.title} ${pageRangeText}`, refl); }}
                title={`Reflexion für ${b.title} umschalten (Klappt / Wackelig / Hilfe)`}
                aria-label={`Reflexion für ${b.title} umschalten`}
                style={{
                  fontSize: '0.78rem', fontWeight: 850, minHeight: '36px', padding: '4px 10px', borderRadius: '100px',
                  color: rStyle.color, background: rStyle.background, border: rStyle.border,
                  flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.15s ease'
                }}
                className="hover-scale-mini"
              >
                {refl === 'super' ? <Check size={12} strokeWidth={3} /> : refl === 'wackelig' ? <AlertTriangle size={12} strokeWidth={2.5} /> : refl === 'hilfe' ? <HelpCircle size={12} strokeWidth={2.5} /> : <Sparkles size={12} />}
                <span>{refl === 'super' ? 'Klappt' : refl === 'wackelig' ? 'Wackelig' : refl === 'hilfe' ? 'Hilfe' : 'Status'}</span>
              </button>
            </div>
          </div>
        );
      })}

      {/* 3. Songs Rows with 3-Level Reflection */}
      {safeSongs.map((s, idx) => {
        const taskId = `song-${s.id || s.cleanTitle || idx}`;
        const refl = taskReflections[taskId]?.status;
        const songColor = getSongColor(s.cleanTitle);
        const rStyle = getReflStyle(refl);
        return (
          <div
            key={`hero-s-${idx}`}
            style={{ ...cardRowStyle, cursor: onOpenHomework ? 'pointer' : 'default' }}
            onClick={() => onOpenHomework?.()}
            role={onOpenHomework ? "button" : undefined}
            tabIndex={onOpenHomework ? 0 : undefined}
            aria-label={onOpenHomework ? `Song ${s.cleanTitle} öffnen` : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: `linear-gradient(135deg, ${songColor.from}, ${songColor.to})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: songColor.text || '#0f172a', boxShadow: `0 2px 6px ${songColor.shadowFrom || 'rgba(0,0,0,0.06)'}`, flexShrink: 0
              }}>
                <Music size={14} strokeWidth={2.4} />
              </div>
              <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.cleanTitle}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); cycleReflection(taskId, s.cleanTitle, refl); }}
              title={`Reflexion für Song ${s.cleanTitle} umschalten`}
              aria-label={`Reflexion für Song ${s.cleanTitle} umschalten`}
              style={{
                fontSize: '0.78rem', fontWeight: 850, minHeight: '36px', padding: '4px 10px', borderRadius: '100px',
                color: rStyle.color, background: rStyle.background, border: rStyle.border,
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.15s ease'
              }}
              className="hover-scale-mini"
            >
              {refl === 'super' ? <Check size={12} strokeWidth={3} /> : refl === 'wackelig' ? <AlertTriangle size={12} strokeWidth={2.5} /> : refl === 'hilfe' ? <HelpCircle size={12} strokeWidth={2.5} /> : <Sparkles size={12} />}
              <span>{refl === 'super' ? 'Klappt' : refl === 'wackelig' ? 'Wackelig' : refl === 'hilfe' ? 'Hilfe' : 'Status'}</span>
            </button>
          </div>
        );
      })}

      {/* 3.5 Notenschnipsel (MicroScores 1–4 Takte) */}
      {microScores && microScores.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {microScores.map((ms: any, msIdx: number) => (
            <div key={`hero-ms-${ms.id || msIdx}`} style={cardRowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <MicroScoreSnippetButton
                  studentId={studentId}
                  taskId={ms.id}
                  taskTitle={ms.title}
                  defaultInstrument={ms.instrument}
                  initialSnippet={ms}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.90rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ms.title}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    {ms.tempoBpm || 80} BPM • {ms.barsCount || 2} Takte Notenschnipsel
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. General Notes Rows */}
      {generalNotes && generalNotes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {generalNotes.map((noteItem, nIdx) => (
            <div key={`hero-gn-${nIdx}`} style={cardRowStyle}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0
              }}>
                <FileText size={14} strokeWidth={2.4} />
              </div>
              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {noteItem}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 5. Student Question Yellow Pill */}
      {studentQuestion && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.88rem', padding: '8px 12px',
          borderRadius: '12px', background: '#fffdf0', border: '1px solid #fde047', boxShadow: '0 1px 3px rgba(250, 204, 21, 0.15)'
        }}>
          <HelpCircle size={15} style={{ color: '#ca8a04', flexShrink: 0, marginTop: '2px' }} strokeWidth={2.5} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minWidth: 0, flex: 1, lineHeight: 1.35 }}>
            <strong style={{ color: '#ca8a04', fontWeight: 850, flexShrink: 0 }}>Deine Frage:</strong>
            <span style={{ color: '#713f12', fontWeight: 700, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              „{studentQuestion}“
            </span>
          </div>
        </div>
      )}

      {/* 6. Empty State */}
      {!hasActiveHomework && (
        <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
          Keine offenen Aufgaben für diese Woche erfasst
        </div>
      )}

      {/* 7. Audio Quickie Mini-Player */}
      {audioTracks.length > 0 && (
        <div style={{
          background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <button
              type="button"
              role="button"
              tabIndex={0}
              aria-label={isPlayingAudio ? "Aufnahme pausieren" : "Aufnahme abspielen"}
              onClick={(e) => { e.stopPropagation(); toggleAudio(audioTracks[0].url); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleAudio(audioTracks[0].url); } }}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: isPlayingAudio ? '#16a34a' : '#ffffff', color: isPlayingAudio ? '#ffffff' : '#16a34a',
                border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 6px rgba(22, 163, 74, 0.15)', transition: 'all 0.15s ease'
              }}
              className="hover-scale-mini"
            >
              {isPlayingAudio ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" style={{ marginLeft: '2px' }} />}
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Headphones size={12} color="#16a34a" />
                  <span style={{ fontSize: '0.70rem', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {isPlayingAudio ? 'Wird abgespielt' : 'Aufnahme anhören'}
                  </span>
                </div>
                {audioTracks.length > 1 && onOpenRecordings && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenRecordings(); }}
                    style={{
                      fontSize: '0.68rem', fontWeight: 900, color: '#15803d', background: '#e6f4ea',
                      border: '1px solid #bbf7d0', borderRadius: '100px', padding: '2px 8px', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '2px', transition: 'all 0.15s ease'
                    }}
                    className="hover-scale-mini"
                    title={`${audioTracks.length} Aufnahmen vorhanden - alle im Hausaufgabenheft anzeigen`}
                    aria-label={`${audioTracks.length} Aufnahmen vorhanden`}
                  >
                    +{audioTracks.length - 1} weitere
                  </button>
                )}
              </div>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {audioTracks[0].label || 'Aufnahme deiner Lehrkraft'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {isPlayingAudio && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px', paddingRight: '2px' }} aria-hidden="true">
                <span style={{ width: '3px', height: '8px', background: '#16a34a', borderRadius: '4px' }} />
                <span style={{ width: '3px', height: '14px', background: '#16a34a', borderRadius: '4px' }} />
                <span style={{ width: '3px', height: '10px', background: '#16a34a', borderRadius: '4px' }} />
              </div>
            )}
            <span style={{ fontSize: '0.76rem', fontWeight: 850, color: '#64748b', background: '#ffffff', padding: '3px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', flexShrink: 0 }}>
              {isPlayingAudio && audioCurrentTime > 0
                ? `${formatSeconds(audioCurrentTime)} / ${formatSeconds(audioDuration || audioTracks[0].duration)}`
                : formatSeconds(audioTracks[0].duration)}
            </span>
          </div>
        </div>
      )}

      {/* 8. Action Buttons Footer */}
      {(onOpenHomework || onOpenQuestionModal) && (
        <div style={{ display: 'grid', gridTemplateColumns: onOpenQuestionModal ? 'minmax(0, 1.4fr) minmax(0, 1fr)' : '1fr', gap: '10px' }}>
          {onOpenHomework && (
            <button
              type="button"
              role="button"
              tabIndex={0}
              aria-label="Aufgaben ansehen"
              title="Aufgaben ansehen"
              onClick={(e) => { e.stopPropagation(); onOpenHomework(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onOpenHomework(); } }}
              style={{
                padding: isMusicStandMode ? '16px 14px' : '14px 12px', minHeight: '48px', borderRadius: '18px',
                border: 'none', background: 'linear-gradient(135deg, #34a853 0%, #2e9549 100%)', color: '#ffffff',
                fontSize: isMusicStandMode ? '1.02rem' : '0.94rem', fontWeight: 950, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 6px 18px rgba(52, 168, 83, 0.28)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}
              className="hover-scale"
            >
              <BookOpen size={isMusicStandMode ? 18 : 16} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Aufgaben ansehen →</span>
            </button>
          )}

          {onOpenQuestionModal && (
            <button
              type="button"
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onOpenQuestionModal(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onOpenQuestionModal(); } }}
              style={{
                padding: isMusicStandMode ? '16px 14px' : '14px 12px', minHeight: '48px', borderRadius: '18px',
                border: 'none',
                background: '#facc15', color: '#0f172a',
                fontSize: isMusicStandMode ? '1.02rem' : '0.94rem', fontWeight: 950, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 14px rgba(250, 204, 21, 0.35)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}
              className="hover-scale"
              title={studentQuestion ? "Frage an Lehrkraft bearbeiten" : "Frage an Lehrkraft stellen"}
              aria-label={studentQuestion ? "Frage an Lehrkraft bearbeiten" : "Frage an Lehrkraft stellen"}
            >
              <HelpCircle size={isMusicStandMode ? 18 : 16} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {studentQuestion ? 'Frage aktiv' : 'Frage?'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

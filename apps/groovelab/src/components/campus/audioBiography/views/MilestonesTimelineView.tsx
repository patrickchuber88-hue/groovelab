import React from 'react';
import { 
  Sparkles, Crown, Star, Check, History, CheckCircle2, Lock, Unlock, 
  Pause, Play, Download, Award, Mic, MessageSquare, Sliders, Music, 
  Gift, Bell, Zap, Lightbulb, Flame, Heart 
} from 'lucide-react';
import { MilestoneData } from '../types';

export interface MilestonesTimelineViewProps {
  milestones: MilestoneData[];
  selectedMilestoneId: string;
  setSelectedMilestoneId: (id: string) => void;
  isLight: boolean;
  isMobileOrSim: boolean;
  colors: any;
  completedCount: number;
  progressPercent: number;
  isAllMilestonesCompleted: boolean;
  activePlayingId: string | null;
  handlePlayToggle: (audioUrl?: string, masteredAudioUrl?: string, trackId?: string) => void;
  formatSeconds: (secs?: number) => string;
  downloadAudioTrack: (audioUrl?: string, masteredAudioUrl?: string, title?: string, trackId?: string) => void;
  isTeacher: boolean;
  verifyMilestoneByTeacher: (id: string) => void;
  openUploadModal: (ms: MilestoneData) => void;
  openReflectionModal: (ms: MilestoneData) => void;
  toggleVisibility: (id: string) => void;
  canPlayAB: boolean;
  startABComparison: () => void;
  isPlayingABComparison: boolean;
  isPlayingPlaylist: boolean;
  vinylShelfSlot?: React.ReactNode;
}

const renderMilestoneIcon = (iconName: string, isGold: boolean = false, size: number = 20, customColor?: string) => {
  const props = { size, color: customColor || (isGold ? '#f59e0b' : '#10b981'), strokeWidth: 2.2 };
  switch (iconName) {
    case 'sparkles': return <Sparkles {...props} />;
    case 'sliders': return <Sliders {...props} />;
    case 'music': return <Music {...props} />;
    case 'gift': return <Gift {...props} />;
    case 'bell': return <Bell {...props} />;
    case 'zap': return <Zap {...props} />;
    case 'lightbulb': return <Lightbulb {...props} />;
    case 'flame': return <Flame {...props} />;
    case 'heart': return <Heart {...props} />;
    case 'crown': return <Crown {...props} />;
    default: return <Sparkles {...props} />;
  }
};

export const MilestonesTimelineView: React.FC<MilestonesTimelineViewProps> = ({
  milestones,
  selectedMilestoneId,
  setSelectedMilestoneId,
  isLight,
  isMobileOrSim,
  colors,
  completedCount,
  progressPercent,
  isAllMilestonesCompleted,
  activePlayingId,
  handlePlayToggle,
  formatSeconds,
  downloadAudioTrack,
  isTeacher,
  verifyMilestoneByTeacher,
  openUploadModal,
  openReflectionModal,
  toggleVisibility,
  canPlayAB,
  startABComparison,
  isPlayingABComparison,
  isPlayingPlaylist,
  vinylShelfSlot
}) => {
  const effectiveActiveMilestone =
    milestones.find((m) => m.id === selectedMilestoneId) ||
    milestones.find((m) => !m.audioUrl) ||
    milestones[0];

  return (
    <>
      {/* 🌟 1. STICKY KINDGERECHTER ENTDECKER-HEADER MIT FORTSCHRITT */}
      <div
        style={{
          position: 'sticky',
          top: '0px',
          zIndex: 40,
          background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)'}`,
          borderRadius: '22px',
          padding: isMobileOrSim ? '12px 14px' : '14px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: isLight ? '0 10px 28px rgba(0, 0, 0, 0.08)' : '0 12px 35px rgba(0, 0, 0, 0.45)',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Header Title & Counter Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '1.5px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)'
              }}
            >
              <Sparkles size={18} color="#b45309" />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: isMobileOrSim ? '0.94rem' : '1.05rem',
                  fontWeight: 900,
                  color: colors.textPrimary,
                  letterSpacing: '-0.01em'
                }}
              >
                Meilenstein-Entdeckerpfad
              </h3>
              <span style={{ fontSize: '0.74rem', color: colors.textSecondary, fontWeight: 600 }}>
                Vom ersten Ton zum Meisterstück – Wähle frei eine Station & verewige dein Spiel!
              </span>
            </div>
          </div>

          {/* Badges: Counter & Completion */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background:
                  completedCount === milestones.length
                    ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                    : isLight
                    ? '#dcfce7'
                    : 'rgba(16, 185, 129, 0.18)',
                border: `1.5px solid ${
                  completedCount === milestones.length
                    ? '#f59e0b'
                    : isLight
                    ? '#86efac'
                    : 'rgba(16, 185, 129, 0.35)'
                }`,
                color: completedCount === milestones.length ? '#b45309' : isLight ? '#15803d' : '#34d399',
                padding: '4px 12px',
                borderRadius: '100px',
                fontSize: '0.75rem',
                fontWeight: 900,
                boxShadow: completedCount === milestones.length ? '0 2px 8px rgba(245, 158, 11, 0.25)' : 'none'
              }}
            >
              {completedCount === milestones.length ? (
                <>
                  <Crown size={14} color="#d97706" />
                  <span>Meisterwerk vollendet! (10 / 10)</span>
                </>
              ) : (
                <>
                  <Star size={13} color="#10b981" />
                  <span>
                    {completedCount} von {milestones.length} Stationen gemeistert
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Animated Progress Track */}
        <div
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '100px',
            background: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.max(5, progressPercent)}%`,
              borderRadius: '100px',
              background:
                completedCount === milestones.length
                  ? 'linear-gradient(90deg, #f59e0b 0%, #eab308 50%, #fde047 100%)'
                  : 'linear-gradient(90deg, #10b981 0%, #059669 60%, #f59e0b 100%)',
              boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
              transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          />
        </div>

        {/* Quick Station Step Chips */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobileOrSim ? 'repeat(5, 1fr)' : `repeat(${milestones.length}, 1fr)`,
            gap: '6px',
            overflowX: 'auto',
            paddingTop: '2px'
          }}
        >
          {milestones.map((ms) => {
            const isCompleted = !!ms.audioUrl;
            const isSelected = effectiveActiveMilestone?.id === ms.id;

            return (
              <div
                key={ms.id}
                onClick={() => {
                  setSelectedMilestoneId(ms.id);
                  const targetEl = document.getElementById(`milestone-journey-card-${ms.id}`);
                  if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  cursor: 'pointer',
                  padding: '4px 2px',
                  borderRadius: '10px',
                  background: isSelected ? (isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.18)') : 'transparent',
                  border: isSelected ? '1.5px solid #10b981' : '1.5px solid transparent',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale"
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isCompleted
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      : isSelected
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : isLight
                      ? '#f1f5f9'
                      : 'rgba(255, 255, 255, 0.08)',
                    border: isCompleted
                      ? '2px solid #fef3c7'
                      : isSelected
                      ? '2px solid #a7f3d0'
                      : `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.18)'}`,
                    color: isCompleted || isSelected ? 'white' : colors.textMuted,
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    boxShadow: isCompleted
                      ? '0 2px 6px rgba(245, 158, 11, 0.3)'
                      : isSelected
                      ? '0 0 10px rgba(16, 185, 129, 0.4)'
                      : 'none'
                  }}
                >
                  {isCompleted ? (
                    <Check size={13} strokeWidth={3} />
                  ) : ms.stepNumber < 10 ? (
                    `0${ms.stepNumber}`
                  ) : (
                    ms.stepNumber
                  )}
                </div>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    color: isCompleted ? '#f59e0b' : isSelected ? '#10b981' : colors.textMuted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    textAlign: 'center'
                  }}
                >
                  #{ms.stepNumber < 10 ? `0${ms.stepNumber}` : ms.stepNumber}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🌟 2. MOBILE-SPEZIFISCHE MINI-VINYL SCHALLPLATTE (<= 768px) */}
      {isMobileOrSim && (
        <div
          style={{
            background: isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.85)',
            border: `1.5px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '20px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: isLight ? '0 6px 20px rgba(0, 0, 0, 0.05)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: isAllMilestonesCompleted
                  ? 'radial-gradient(circle, #fef08a 0%, #eab308 40%, #ca8a04 75%, #713f12 100%)'
                  : 'radial-gradient(circle, #1c1917 25%, #0c0a09 60%, #000000 100%)',
                border: isAllMilestonesCompleted ? '2.5px solid #ca8a04' : '2.5px solid #292524',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: isPlayingPlaylist || isPlayingABComparison ? 'vinylSpin 3.5s linear infinite' : 'none',
                flexShrink: 0
              }}
            >
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#10b981' }} />
            </div>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 900, color: colors.textPrimary, display: 'block' }}>
                {isAllMilestonesCompleted ? '🏆 Goldene Meister-LP' : 'Meine Meilenstein-LP'}
              </span>
              <span style={{ fontSize: '0.70rem', color: colors.textSecondary, fontWeight: 700 }}>
                {completedCount} von {milestones.length} Tracks im Album
              </span>
            </div>
          </div>

          {canPlayAB && (
            <button
              type="button"
              onClick={startABComparison}
              style={{
                padding: '7px 12px',
                borderRadius: '100px',
                border: '1.5px solid #10b981',
                background: isPlayingABComparison ? '#f59e0b' : 'rgba(16, 185, 129, 0.12)',
                color: isPlayingABComparison ? '#ffffff' : '#10b981',
                fontSize: '0.70rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              className="hover-scale"
            >
              <History size={13} />
              <span>Hörvergleich</span>
            </button>
          )}
        </div>
      )}

      {/* 🌟 3. HAUPTLAYOUT: 2-SPALTEN-ERLEBNIS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobileOrSim ? '1fr' : 'minmax(0, 1fr) 340px',
          gap: '24px',
          alignItems: 'start'
        }}
      >
        {/* 🗺️ LINKE SPALTE: DER VERTIKAL GESCHWUNGENE MEILENSTEIN-ENTDECKERPFAD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
          {milestones.map((ms, idx) => {
            const isCompleted = !!ms.audioUrl;
            const isSelected = effectiveActiveMilestone?.id === ms.id;
            const isPlayingThis = activePlayingId === ms.id;
            const isLast = idx === milestones.length - 1;

            const curveOffset = isMobileOrSim
              ? '0px'
              : idx % 4 === 0
              ? '0px'
              : idx % 4 === 1
              ? '24px'
              : idx % 4 === 2
              ? '42px'
              : '20px';

            return (
              <div
                key={ms.id}
                id={`milestone-journey-card-${ms.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginLeft: curveOffset,
                  position: 'relative',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div
                  onClick={() => setSelectedMilestoneId(ms.id)}
                  style={{
                    background: isSelected
                      ? isLight
                        ? '#ffffff'
                        : 'rgba(30, 41, 59, 0.95)'
                      : isLight
                      ? 'rgba(255, 255, 255, 0.85)'
                      : 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: isSelected
                      ? '2px solid #10b981'
                      : isCompleted
                      ? `1.5px solid ${isLight ? '#fcd34d' : 'rgba(245, 158, 11, 0.45)'}`
                      : `1.5px solid ${colors.cardBorder}`,
                    borderRadius: '24px',
                    padding: isMobileOrSim ? '14px' : '18px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: isSelected
                      ? isLight
                        ? '0 12px 30px rgba(16, 185, 129, 0.18)'
                        : '0 12px 35px rgba(16, 185, 129, 0.3)'
                      : isCompleted
                      ? isLight
                        ? '0 6px 20px rgba(245, 158, 11, 0.10)'
                        : '0 6px 20px rgba(0, 0, 0, 0.25)'
                      : colors.shadow,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative',
                    zIndex: isSelected ? 5 : 2
                  }}
                  className="hover-scale"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '16px',
                          background: isCompleted
                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            : isSelected
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : isLight
                            ? '#ffffff'
                            : 'rgba(30, 41, 59, 0.9)',
                          border: isCompleted
                            ? '2.5px solid #fef3c7'
                            : isSelected
                            ? '2.5px solid #a7f3d0'
                            : `2px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: isCompleted
                            ? '0 6px 18px rgba(245, 158, 11, 0.35)'
                            : isSelected
                            ? '0 0 20px rgba(16, 185, 129, 0.45)'
                            : '0 4px 10px rgba(0, 0, 0, 0.05)',
                          animation: isSelected ? 'activeStepGlow 2.2s infinite' : 'none'
                        }}
                      >
                        {isCompleted ? (
                          <Check size={22} color="#ffffff" strokeWidth={3} />
                        ) : (
                          renderMilestoneIcon(ms.iconName, false, 22, isSelected ? '#ffffff' : isLight ? '#059669' : '#34d399')
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              color: isCompleted ? '#b45309' : isSelected ? '#047857' : '#f59e0b',
                              background: isCompleted
                                ? '#fef3c7'
                                : isSelected
                                ? '#dcfce7'
                                : isLight
                                ? '#fef3c7'
                                : 'rgba(245, 158, 11, 0.15)',
                              padding: '2px 8px',
                              borderRadius: '100px',
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              fontVariantNumeric: 'tabular-nums'
                            }}
                          >
                            {ms.stepNumber === 10
                              ? '👑 STATION 10 • FINALE'
                              : `STATION ${ms.stepNumber < 10 ? `0${ms.stepNumber}` : ms.stepNumber}`}
                          </span>
                          {ms.isVerified && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.66rem',
                                fontWeight: 900,
                                color: '#b45309',
                                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                border: '1px solid #f59e0b',
                                padding: '2px 8px',
                                borderRadius: '100px',
                                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.25)'
                              }}
                            >
                              <CheckCircle2 size={11} color="#d97706" />
                              <span>Meisterwerk</span>
                            </span>
                          )}
                        </div>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: '0.98rem',
                            fontWeight: 900,
                            color: colors.textPrimary,
                            letterSpacing: '-0.01em'
                          }}
                        >
                          {ms.title}
                        </h4>
                        <span
                          style={{
                            fontSize: '0.76rem',
                            color: colors.textSecondary,
                            fontWeight: 600,
                            display: 'block',
                            marginTop: '2px'
                          }}
                        >
                          {ms.subtitle}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '100px',
                          background: isCompleted
                            ? isLight
                              ? '#fef3c7'
                              : 'rgba(245, 158, 11, 0.15)'
                            : isSelected
                            ? isLight
                              ? '#dcfce7'
                              : 'rgba(16, 185, 129, 0.15)'
                            : isLight
                            ? '#f1f5f9'
                            : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${
                            isCompleted
                              ? '#f59e0b'
                              : isSelected
                              ? '#10b981'
                              : isLight
                              ? '#cbd5e1'
                              : 'rgba(255, 255, 255, 0.1)'
                          }`,
                          color: isCompleted ? '#b45309' : isSelected ? '#047857' : colors.textMuted
                        }}
                      >
                        {isCompleted ? '✓ Gemeistert' : isSelected ? '🎯 Aktiver Fokus' : '🎵 Bereit'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(ms.id);
                        }}
                        title={ms.visibility === 'private' ? 'Nur für mich (Privat)' : 'Für Lehrer freigegeben'}
                        aria-label={ms.visibility === 'private' ? 'Nur für mich (Privat)' : 'Für Lehrer freigegeben'}
                        style={{
                          background:
                            ms.visibility === 'private'
                              ? isLight
                                ? '#fee2e2'
                                : 'rgba(239, 68, 68, 0.18)'
                              : isLight
                              ? '#dcfce7'
                              : 'rgba(16, 185, 129, 0.18)',
                          border: `1px solid ${
                            ms.visibility === 'private'
                              ? isLight
                                ? '#fca5a5'
                                : 'rgba(239, 68, 68, 0.4)'
                              : isLight
                              ? '#86efac'
                              : 'rgba(16, 185, 129, 0.4)'
                          }`,
                          color:
                            ms.visibility === 'private'
                              ? isLight
                                ? '#dc2626'
                                : '#fca5a5'
                              : isLight
                              ? '#15803d'
                              : '#34d399',
                          padding: '4px 8px',
                          borderRadius: '100px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {ms.visibility === 'private' ? <Lock size={11} /> : <Unlock size={11} />}
                        <span>{ms.visibility === 'private' ? 'Privat' : 'Lehrer'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Spotlight Action Card */}
                  {isSelected && (
                    <div
                      style={{
                        marginTop: '8px',
                        paddingTop: '14px',
                        borderTop: `1.5px dashed ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        animation: 'fadeIn 0.25s ease-out'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {isCompleted ? (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayToggle(ms.audioUrl, ms.masteredAudioUrl, ms.id);
                              }}
                              style={{
                                flex: 1,
                                minWidth: '160px',
                                padding: '12px 18px',
                                borderRadius: '100px',
                                border: 'none',
                                background: isPlayingThis
                                  ? '#d97706'
                                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                fontWeight: 900,
                                fontSize: '0.86rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                boxShadow: isPlayingThis
                                  ? '0 4px 16px rgba(217, 119, 6, 0.4)'
                                  : '0 4px 16px rgba(16, 185, 129, 0.35)',
                                transition: 'all 0.15s ease'
                              }}
                              className="hover-scale"
                            >
                              {isPlayingThis ? <Pause size={17} /> : <Play size={17} />}
                              <span>{isPlayingThis ? 'Pausieren' : `Aufnahme anhören (${formatSeconds(ms.duration)})`}</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadAudioTrack(ms.audioUrl, ms.masteredAudioUrl, ms.title, ms.id);
                              }}
                              title="Aufnahme herunterladen (WAV)"
                              aria-label="Aufnahme herunterladen (WAV)"
                              style={{
                                padding: '11px 14px',
                                borderRadius: '100px',
                                border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.18)'}`,
                                background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                                color: colors.textPrimary,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.04)' : 'none'
                              }}
                              className="hover-scale"
                            >
                              <Download size={16} color="#10b981" />
                            </button>

                            {isTeacher && !ms.isVerified && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  verifyMilestoneByTeacher(ms.id);
                                }}
                                title="Als verifiziertes Meisterwerk besiegeln"
                                aria-label="Als verifiziertes Meisterwerk besiegeln"
                                style={{
                                  padding: '11px 16px',
                                  borderRadius: '100px',
                                  border: '1.5px solid #f59e0b',
                                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                  color: '#b45309',
                                  fontWeight: 900,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                                }}
                                className="hover-scale"
                              >
                                <Award size={16} color="#d97706" />
                                <span>Als Meisterwerk besiegeln</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openUploadModal(ms);
                              }}
                              title="Eine noch bessere Aufnahme einspielen"
                              aria-label="Eine noch bessere Aufnahme einspielen"
                              style={{
                                padding: '11px 14px',
                                borderRadius: '100px',
                                border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`,
                                background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.05)',
                                color: colors.textSecondary,
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              className="hover-scale"
                            >
                              <Mic size={14} color="#10b981" />
                              <span>Neu aufnehmen</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openUploadModal(ms);
                            }}
                            style={{
                              width: '100%',
                              padding: '13px 20px',
                              borderRadius: '100px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              fontWeight: 900,
                              fontSize: '0.88rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '10px',
                              cursor: 'pointer',
                              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.38)',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover-scale"
                          >
                            <Mic size={18} />
                            <span>Jetzt Aufnahme starten</span>
                          </button>
                        )}
                      </div>

                      {/* Reflection Note */}
                      {ms.personalNote ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            openReflectionModal(ms);
                          }}
                          style={{
                            background: colors.noteBg,
                            border: `1px solid ${colors.noteBorder}`,
                            borderRadius: '12px',
                            padding: '10px 14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}
                          className="hover-scale"
                        >
                          <MessageSquare size={15} color="#10b981" />
                          <span
                            style={{
                              fontSize: '0.78rem',
                              color: colors.textPrimary,
                              fontStyle: 'italic',
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            &ldquo;{ms.personalNote}&rdquo;
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openReflectionModal(ms);
                          }}
                          style={{
                            background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                            border: `1px dashed ${isLight ? '#94a3b8' : 'rgba(255, 255, 255, 0.25)'}`,
                            borderRadius: '12px',
                            padding: '8px 14px',
                            color: colors.textSecondary,
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          className="hover-scale"
                        >
                          <MessageSquare size={14} color="#10b981" />
                          <span>+ Notiz: Warum hast du dieses Stück gewählt?</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {!isLast && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '18px',
                      margin: '2px 0',
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{
                        width: '3px',
                        height: '100%',
                        background: isCompleted
                          ? 'linear-gradient(to bottom, #f59e0b 0%, #10b981 100%)'
                          : `repeating-linear-gradient(to bottom, ${
                              isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'
                            } 0px, ${
                              isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'
                            } 3px, transparent 3px, transparent 6px)`
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 💿 RECHTE SPALTE: DAS SCHALLPLATTEN-STUDIO */}
        {!isMobileOrSim && vinylShelfSlot}
      </div>
    </>
  );
};

import React, { useState } from 'react';
import {
  Trophy,
  Sparkles,
  Pause,
  Mic,
  Lock,
  RotateCcw,
  Sliders,
  Gift,
  Bell,
  Zap,
  Lightbulb,
  Flame,
  Heart,
  Crown,
  Music,
  CheckCircle2,
  Cake,
  X
} from 'lucide-react';
import { MilestoneData } from '../types';

export interface JuniorMilestonesSectionProps {
  milestones: MilestoneData[];
  completedMilestones: MilestoneData[];
  isLight: boolean;
  colors: { textPrimary: string; textSecondary: string; cardBg?: string; cardBorder?: string };
  selectedMilestoneVersions: Record<string, string>;
  setSelectedMilestoneVersions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  activePlayingId: string | null;
  handlePlayToggle: (audioUrl?: string, masteredAudioUrl?: string, trackId?: string) => void;
  onOpenShareModal: () => void;
  onOpenJuniorWizardForMilestone: (milestoneId: string, playlistId?: string | null) => void;
  isMobileOrSim?: boolean;
}

// 🌟 100% Monochrom Lucide Icon Resolver pro Meilenstein-Stufe
const getMilestoneIcon = (stepNumber: number, iconName?: string, size = 21, color = '#ffffff') => {
  const p = { size, color, strokeWidth: 2.2 };
  switch (stepNumber) {
    case 1:
      return <Music {...p} />;
    case 2:
      return <Sliders {...p} />;
    case 3:
      return <Cake {...p} />;
    case 4:
      return <Gift {...p} />;
    case 5:
      return <Bell {...p} />;
    case 6:
      return <Zap {...p} />;
    case 7:
      return <Lightbulb {...p} />;
    case 8:
      return <Heart {...p} />;
    case 9:
      return <Flame {...p} />;
    case 10:
      return <Crown {...p} />;
    default:
      switch (iconName) {
        case 'sliders': return <Sliders {...p} />;
        case 'cake': return <Cake {...p} />;
        case 'gift': return <Gift {...p} />;
        case 'bell': return <Bell {...p} />;
        case 'zap': return <Zap {...p} />;
        case 'lightbulb': return <Lightbulb {...p} />;
        case 'heart': return <Heart {...p} />;
        case 'flame': return <Flame {...p} />;
        case 'crown': return <Crown {...p} />;
        default: return <Music {...p} />;
      }
  }
};

const cleanMilestoneTitle = (rawTitle: string): string => {
  const cleaned = rawTitle.replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim();
  return cleaned || rawTitle || 'Meilenstein';
};

export const JuniorMilestonesSection: React.FC<JuniorMilestonesSectionProps> = ({
  milestones,
  completedMilestones,
  isLight,
  colors,
  selectedMilestoneVersions,
  setSelectedMilestoneVersions,
  activePlayingId,
  handlePlayToggle,
  onOpenJuniorWizardForMilestone,
  isMobileOrSim = false
}) => {
  // Soft-Locking Confirmation Modal State
  const [softLockTarget, setSoftLockTarget] = useState<MilestoneData | null>(null);

  // Finde die erste unvollendete Station in der didaktischen Reihenfolge
  const activeMilestone = milestones.find((m) => !m.audioUrl) || null;

  return (
    <div
      style={{
        background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
        borderRadius: '20px',
        border: `1.5px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
        padding: isMobileOrSim ? '14px 12px' : '18px 20px',
        boxShadow: isLight ? '0 4px 18px rgba(0,0,0,0.04)' : 'none'
      }}
    >
      {/* 🏆 Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: isLight ? '#dcfce7' : 'rgba(52, 168, 83, 0.18)',
              color: '#34a853',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Trophy size={16} strokeWidth={2.4} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: colors.textPrimary }}>
              Deine 10 Meilensteine
            </h3>
            <span style={{ fontSize: '0.70rem', color: colors.textSecondary, fontWeight: 600 }}>
              Sammle alle 10 Stufen für dein musikalisches Meisterwerk
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${isLight ? '#10b981' : 'rgba(16, 185, 129, 0.3)'}`,
            padding: '4px 12px',
            borderRadius: '100px',
            color: isLight ? '#065f46' : '#34d399',
            fontSize: '0.76rem',
            fontWeight: 800
          }}
        >
          <Sparkles size={12} color="#34a853" strokeWidth={2.2} />
          <span>
            {completedMilestones.length} von {milestones.length || 10} Gemeistert
          </span>
        </div>
      </div>

      {/* 🌟 2×5 Collectible Token Grid (<220px Gesamthöhe) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobileOrSim ? 'repeat(2, 1fr)' : 'repeat(5, minmax(0, 1fr))',
          gap: '10px'
        }}
      >
        {milestones.map((ms, idx) => {
          const isDone = !!ms.audioUrl;
          const isActive = !isDone && activeMilestone?.id === ms.id;
          const isLocked = !isDone && !isActive;

          const isFirstSong = ms.type === 'first_song';
          const isMasterpiece = ms.stepNumber === 10;
          const isFamilyShare = ms.type === 'family_share';
          const xpAmount = isFirstSong || isMasterpiece ? 100 : 50;

          // Versions- & Playback-Auflösung
          const selectedVerId = selectedMilestoneVersions[ms.id] || 'latest';
          let activeAudioUrl = ms.audioUrl;
          let activeMasterUrl = ms.masteredAudioUrl;
          let activePlayingTrackId = ms.id;

          if (selectedVerId !== 'latest' && ms.history && ms.history.length > 0) {
            const chosenVer = ms.history.find((v) => v.id === selectedVerId);
            if (chosenVer) {
              activeAudioUrl = chosenVer.audioUrl;
              activeMasterUrl = chosenVer.masteredAudioUrl;
              activePlayingTrackId = chosenVer.id;
            }
          }

          const isPlaying = activePlayingId === activePlayingTrackId;
          const isAnyVersionOfThisMsPlaying = activePlayingId === ms.id || (ms.history?.some((h) => h.id === activePlayingId) ?? false);
          const hasHistory = ms.history && ms.history.length > 0;

          const durationSeconds = ms.duration || 45;
          const durationFormatted = `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, '0')}`;
          const cleanTitle = cleanMilestoneTitle(ms.title);

          const handleCardAction = () => {
            if (isDone) {
              handlePlayToggle(activeAudioUrl, activeMasterUrl, activePlayingTrackId);
            } else if (isActive) {
              onOpenJuniorWizardForMilestone(ms.id, isFamilyShare ? 'pl_gifts' : null);
            } else {
              setSoftLockTarget(ms);
            }
          };

          return (
            <div
              key={ms.id || idx}
              tabIndex={0}
              role="button"
              aria-label={`Stufe ${ms.stepNumber}: ${cleanTitle}${isDone ? ', gemeistert, Aufnahme abspielen' : isActive ? ', nächste Station, jetzt aufnehmen' : ', didaktisch gesperrt'}`}
              onClick={handleCardAction}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardAction();
                }
              }}
              style={{
                height: '92px',
                boxSizing: 'border-box',
                borderRadius: '16px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                outline: 'none',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                background: isDone
                  ? (isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.7)')
                  : isActive
                  ? (isLight ? '#ffffff' : 'rgba(52, 168, 83, 0.08)')
                  : (isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)'),
                border: isDone
                  ? ms.isVerified
                    ? '1.5px solid #f59e0b'
                    : `1.5px solid ${isLight ? '#10b981' : 'rgba(16, 185, 129, 0.4)'}`
                  : isActive
                  ? '2px solid #34a853'
                  : (isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)'),
                boxShadow: isDone
                  ? ms.isVerified
                    ? '0 4px 12px rgba(245, 158, 11, 0.2)'
                    : isLight ? '0 2px 8px rgba(16, 185, 129, 0.1)' : '0 2px 8px rgba(0, 0, 0, 0.25)'
                  : isActive
                  ? '0 0 0 3px rgba(52, 168, 83, 0.2), 0 4px 14px rgba(52, 168, 83, 0.15)'
                  : (isLight ? '0 1px 4px rgba(0,0,0,0.02)' : 'none')
              }}
              className={`spotify-card-hover ${isLight ? 'spotify-card-hover-light' : 'spotify-card-hover-dark'}`}
            >
              {/* Obere Reihe: Stufe links, Dezentralisierter Lock / Status rechts */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minHeight: '14px' }}>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    letterSpacing: '0.03em',
                    color: isDone
                      ? (isLight ? '#059669' : '#10b981')
                      : isActive
                      ? '#34a853'
                      : (isLight ? '#64748b' : '#94a3b8')
                  }}
                >
                  Stufe {ms.stepNumber}
                </span>

                {/* Decentralize Lock: Move the lock icon to the top-right corner as a tiny subtle badge (12–14px, #94a3b8) */}
                {isLocked ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      width: '14px',
                      height: '14px'
                    }}
                    title="Station gesperrt (pädagogische Reihenfolge)"
                  >
                    <Lock size={12} strokeWidth={2.2} />
                  </div>
                ) : isActive ? (
                  <span
                    style={{
                      fontSize: '0.58rem',
                      fontWeight: 900,
                      color: '#ffffff',
                      background: '#34a853',
                      padding: '1px 5px',
                      borderRadius: '100px',
                      lineHeight: 1.2
                    }}
                  >
                    JETZT
                  </span>
                ) : ms.isVerified ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      color: '#d97706'
                    }}
                    title="Von Lehrkraft als Meisterwerk bestätigt"
                  >
                    <Crown size={12} strokeWidth={2.4} />
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      color: '#10b981'
                    }}
                    title="Meilenstein gemeistert"
                  >
                    <CheckCircle2 size={12} strokeWidth={2.4} />
                  </div>
                )}
              </div>

              {/* Zentrum: Collectible Token Icon */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  margin: '1px 0'
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: isLocked
                      ? (isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)')
                      : isActive
                      ? '#34a853'
                      : '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isLocked
                      ? 'none'
                      : isActive
                      ? '0 3px 10px rgba(52, 168, 83, 0.35)'
                      : '0 3px 10px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                >
                  {isDone && isPlaying ? (
                    <Pause size={18} fill="#ffffff" color="#ffffff" />
                  ) : (
                    getMilestoneIcon(
                      ms.stepNumber,
                      ms.iconName,
                      21,
                      isLocked ? '#94a3b8' : '#ffffff'
                    )
                  )}
                </div>

                {/* Waveform play indicator for mastered cards */}
                {isDone && (
                  <div
                    style={{
                      position: 'absolute',
                      right: '2px',
                      bottom: '-2px',
                      display: 'inline-flex',
                      alignItems: 'flex-end',
                      gap: '1.5px',
                      height: '10px',
                      background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.9)',
                      padding: '2px 4px',
                      borderRadius: '6px',
                      border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'}`
                    }}
                    title={isPlaying ? 'Wiedergabe aktiv' : `${durationFormatted} Min`}
                  >
                    <span
                      style={{
                        width: '2px',
                        height: isPlaying ? '9px' : '6px',
                        background: '#10b981',
                        borderRadius: '1px',
                        animation: isPlaying ? 'pulse 0.8s infinite' : 'none'
                      }}
                    />
                    <span
                      style={{
                        width: '2px',
                        height: isPlaying ? '6px' : '4px',
                        background: '#10b981',
                        borderRadius: '1px'
                      }}
                    />
                    <span
                      style={{
                        width: '2px',
                        height: isPlaying ? '10px' : '8px',
                        background: '#10b981',
                        borderRadius: '1px',
                        animation: isPlaying ? 'pulse 0.6s infinite' : 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* 📋 Titel & Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0, textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    color: isLocked ? (isLight ? '#475569' : '#94a3b8') : colors.textPrimary,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.15
                  }}
                  title={cleanTitle}
                >
                  {cleanTitle}
                </div>

                <div
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    lineHeight: 1.15,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: isLocked
                      ? (isLight ? '#64748b' : '#94a3b8')
                      : isActive
                      ? '#34a853'
                      : (isLight ? '#059669' : '#10b981')
                  }}
                >
                  {isDone ? (
                    hasHistory ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                        <span>{selectedVerId === 'latest' ? 'Heute' : 'V1'}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="A/B Version umschalten"
                          onClick={(e) => {
                            e.stopPropagation();
                            const isCurrentlyLatest = selectedVerId === 'latest';
                            const oldestTake = ms.history![0];
                            const nextVerId = isCurrentlyLatest ? oldestTake.id : 'latest';
                            setSelectedMilestoneVersions((prev) => ({
                              ...prev,
                              [ms.id]: nextVerId
                            }));
                            if (isAnyVersionOfThisMsPlaying) {
                              if (nextVerId === 'latest') {
                                handlePlayToggle(ms.audioUrl, ms.masteredAudioUrl, ms.id);
                              } else {
                                handlePlayToggle(oldestTake.audioUrl, oldestTake.masteredAudioUrl, oldestTake.id);
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              const isCurrentlyLatest = selectedVerId === 'latest';
                              const oldestTake = ms.history![0];
                              const nextVerId = isCurrentlyLatest ? oldestTake.id : 'latest';
                              setSelectedMilestoneVersions((prev) => ({
                                ...prev,
                                [ms.id]: nextVerId
                              }));
                              if (isAnyVersionOfThisMsPlaying) {
                                if (nextVerId === 'latest') {
                                  handlePlayToggle(ms.audioUrl, ms.masteredAudioUrl, ms.id);
                                } else {
                                  handlePlayToggle(oldestTake.audioUrl, oldestTake.masteredAudioUrl, oldestTake.id);
                                }
                              }
                            }
                          }}
                          title="A/B Zeitkapsel umschalten"
                          style={{ fontSize: '0.62rem', opacity: 0.85, cursor: 'pointer', padding: '0 2px' }}
                        >
                          ⇄
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="Meilenstein neu aufnehmen"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenJuniorWizardForMilestone(ms.id, isFamilyShare ? 'pl_gifts' : null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onOpenJuniorWizardForMilestone(ms.id, isFamilyShare ? 'pl_gifts' : null);
                            }
                          }}
                          title="Neu aufnehmen"
                          style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', marginLeft: '2px', opacity: 0.85 }}
                        >
                          <RotateCcw size={9} />
                        </span>
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                        <span>Gemeistert</span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="Meilenstein neu aufnehmen"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenJuniorWizardForMilestone(ms.id, isFamilyShare ? 'pl_gifts' : null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onOpenJuniorWizardForMilestone(ms.id, isFamilyShare ? 'pl_gifts' : null);
                            }
                          }}
                          title="Neu aufnehmen"
                          style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', opacity: 0.85 }}
                        >
                          <RotateCcw size={9} />
                        </span>
                      </span>
                    )
                  ) : isActive ? (
                    <span>+{xpAmount} XP</span>
                  ) : (
                    <span>Gesperrt</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🌟 Pädagogisches Soft-Locking Bestätigungs-Modal */}
      {softLockTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="soft-lock-dialog-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setSoftLockTarget(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSoftLockTarget(null);
            }
          }}
        >
          <div
            style={{
              background: isLight ? '#ffffff' : '#1e293b',
              borderRadius: '24px',
              padding: '26px 28px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
              border: `1.5px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'}`,
              color: colors.textPrimary,
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: isLight ? '#dcfce7' : 'rgba(52, 168, 83, 0.18)',
                    color: '#34a853',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Music size={18} strokeWidth={2.4} />
                </div>
                <h4 id="soft-lock-dialog-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>
                  Station {softLockTarget.stepNumber} vorziehen?
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSoftLockTarget(null)}
                aria-label="Dialog schließen"
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: colors.textSecondary, lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Toll, dass du motiviert bist! Eigentlich steht als nächstes eine andere Station an, aber du kannst{' '}
              <strong>„{cleanMilestoneTitle(softLockTarget.title)}“</strong> natürlich jetzt schon aufnehmen (z. B. wenn bald Weihnachten oder ein Geburtstag ist).
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSoftLockTarget(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '100px',
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.18)'}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Der Reihe nach
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = softLockTarget;
                  setSoftLockTarget(null);
                  onOpenJuniorWizardForMilestone(target.id, target.type === 'family_share' ? 'pl_gifts' : null);
                }}
                style={{
                  padding: '10px 22px',
                  borderRadius: '100px',
                  border: 'none',
                  background: '#34a853',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(52, 168, 83, 0.35)'
                }}
              >
                <Mic size={15} strokeWidth={2.4} />
                <span>Jetzt aufnehmen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


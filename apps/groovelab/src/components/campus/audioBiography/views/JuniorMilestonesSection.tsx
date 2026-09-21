import React from 'react';
import { Trophy, Sparkles, Play, Pause, Share2, RotateCcw, Gift, Music, Mic } from 'lucide-react';
import { MilestoneData } from '../types';

export interface JuniorMilestonesSectionProps {
  milestones: MilestoneData[];
  completedMilestones: MilestoneData[];
  isLight: boolean;
  colors: { textPrimary: string; textSecondary: string };
  selectedMilestoneVersions: Record<string, string>;
  setSelectedMilestoneVersions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  activePlayingId: string | null;
  handlePlayToggle: (audioUrl?: string, masteredAudioUrl?: string, trackId?: string) => void;
  onOpenShareModal: () => void;
  onOpenJuniorWizardForMilestone: (milestoneId: string, playlistId?: string | null) => void;
}

export const JuniorMilestonesSection: React.FC<JuniorMilestonesSectionProps> = ({
  milestones,
  completedMilestones,
  isLight,
  colors,
  selectedMilestoneVersions,
  setSelectedMilestoneVersions,
  activePlayingId,
  handlePlayToggle,
  onOpenShareModal,
  onOpenJuniorWizardForMilestone
}) => {
  return (
    <div
      style={{
        background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
        borderRadius: '24px',
        border: `1.5px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
        padding: '22px',
        boxShadow: isLight ? '0 4px 18px rgba(0,0,0,0.04)' : 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.2)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Trophy size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900, color: colors.textPrimary }}>
              Deine 10 Meilensteine
            </h3>
            <span style={{ fontSize: '0.74rem', color: colors.textSecondary, fontWeight: 600 }}>
              Stufe für Stufe zu deinem musikalischen Lebenswerk
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #86efac',
            padding: '4px 14px',
            borderRadius: '100px',
            color: isLight ? '#166534' : '#86efac',
            fontSize: '0.80rem',
            fontWeight: 900
          }}
        >
          <Sparkles size={13} color="#10b981" />
          <span>
            {completedMilestones.length} von {milestones.length} Gemeistert •{' '}
            {completedMilestones.reduce((acc, m) => acc + (m.type === 'first_song' ? 100 : 50), 0)} Campus XP
          </span>
        </div>
      </div>

      {/* Stepping-Stone-Pfad */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {milestones.map((ms, idx) => {
          const isDone = !!ms.audioUrl;
          const isFamilyShareMs = ms.type === 'family_share';
          const isFirstSongMs = ms.type === 'first_song';
          const xpAmount = isFirstSongMs ? 100 : 50;

          const selectedVerId = selectedMilestoneVersions[ms.id] || 'latest';
          let activeAudioUrl = ms.audioUrl;
          let activeMasterUrl = ms.masteredAudioUrl;
          let activePlayingTrackId = ms.id;
          let activeVerLabel = `Heute (${ms.schoolYear || '2026/27'})`;

          if (selectedVerId !== 'latest' && ms.history && ms.history.length > 0) {
            const chosenVer = ms.history.find((v) => v.id === selectedVerId);
            if (chosenVer) {
              activeAudioUrl = chosenVer.audioUrl;
              activeMasterUrl = chosenVer.masteredAudioUrl;
              activePlayingTrackId = chosenVer.id;
              activeVerLabel = chosenVer.schoolYear
                ? `Schuljahr ${chosenVer.schoolYear}`
                : chosenVer.recordedAt || `Version ${chosenVer.versionNumber}`;
            }
          }

          const isPlaying = activePlayingId === activePlayingTrackId;
          const hasHistory = ms.history && ms.history.length > 0;
          const totalVersions = 1 + (ms.history?.length || 0);

          return (
            <div
              key={ms.id || idx}
              style={{
                borderRadius: '20px',
                border: `1.5px solid ${
                  isDone
                    ? '#86efac'
                    : isFirstSongMs
                    ? '#f59e0b'
                    : isLight
                    ? '#e2e8f0'
                    : 'rgba(255, 255, 255, 0.08)'
                }`,
                background: isDone
                  ? isLight
                    ? '#f0fdf4'
                    : 'rgba(16, 185, 129, 0.08)'
                  : isFirstSongMs
                  ? isLight
                    ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                    : 'rgba(245, 158, 11, 0.08)'
                  : isLight
                  ? '#ffffff'
                  : 'rgba(255, 255, 255, 0.03)',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: isDone
                  ? 'none'
                  : isFirstSongMs
                  ? '0 6px 20px rgba(245, 158, 11, 0.16)'
                  : isLight
                  ? '0 2px 8px rgba(0,0,0,0.03)'
                  : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Obere Reihe */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      background: isDone
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : isFirstSongMs
                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                        : isFamilyShareMs
                        ? isLight
                          ? '#fff7ed'
                          : 'rgba(249, 115, 22, 0.15)'
                        : isLight
                        ? '#f0fdf4'
                        : 'rgba(16, 185, 129, 0.12)',
                      border: isDone
                        ? 'none'
                        : `1.5px solid ${
                            isFirstSongMs
                              ? '#fbbf24'
                              : isFamilyShareMs
                              ? '#fed7aa'
                              : isLight
                              ? '#86efac'
                              : 'rgba(16, 185, 129, 0.3)'
                          }`,
                      color: isDone
                        ? '#ffffff'
                        : isFirstSongMs
                        ? '#ffffff'
                        : isFamilyShareMs
                        ? '#ea580c'
                        : isLight
                        ? '#047857'
                        : '#86efac',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: 900,
                      flexShrink: 0,
                      boxShadow: isDone
                        ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                        : isFirstSongMs
                        ? '0 4px 12px rgba(245, 158, 11, 0.35)'
                        : 'none'
                    }}
                  >
                    {isDone
                      ? hasHistory
                        ? '🏆'
                        : isFirstSongMs
                        ? '👑'
                        : isFamilyShareMs
                        ? '🎁'
                        : '⭐'
                      : isFirstSongMs
                      ? '👑'
                      : ms.stepNumber}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 900,
                          color: isDone
                            ? '#059669'
                            : isFirstSongMs
                            ? '#b45309'
                            : isFamilyShareMs
                            ? '#c2410c'
                            : '#047857',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        STUFE {ms.stepNumber}{' '}
                        {isFirstSongMs
                          ? `• 👑 MEISTER-MEILENSTEIN • +${xpAmount} XP`
                          : isDone
                          ? hasHistory
                            ? `• ${totalVersions} ZEITKAPSELN • +${xpAmount} XP`
                            : `• GEMEISTERT • +${xpAmount} XP`
                          : `• JETZT OFFEN • +${xpAmount} XP`}
                      </span>
                      {ms.recordedAt && (
                        <span style={{ fontSize: '0.66rem', color: colors.textSecondary }}>
                          ({ms.recordedAt})
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: '0.98rem',
                        fontWeight: 900,
                        color: colors.textPrimary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {ms.title}
                    </div>

                    <div
                      style={{
                        fontSize: '0.74rem',
                        color: colors.textSecondary,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {ms.subtitle}
                    </div>
                  </div>
                </div>

                {/* Rechter Bereich: Aktionen */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {isDone ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePlayToggle(activeAudioUrl, activeMasterUrl, activePlayingTrackId)}
                        aria-label={isPlaying ? 'Pause' : `Anhören (${activeVerLabel})`}
                        style={{
                          padding: '9px 18px',
                          borderRadius: '100px',
                          border: 'none',
                          background: isPlaying ? '#ef4444' : '#10b981',
                          color: '#ffffff',
                          fontWeight: 900,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: isPlaying ? '0 3px 10px rgba(239, 68, 68, 0.35)' : '0 3px 10px rgba(16, 185, 129, 0.35)'
                        }}
                        className="hover-scale"
                      >
                        {isPlaying ? <Pause size={15} fill="#ffffff" /> : <Play size={15} fill="#ffffff" style={{ marginLeft: '1px' }} />}
                        <span>{isPlaying ? 'Pause' : `Anhören (${activeVerLabel})`}</span>
                      </button>

                      {isFamilyShareMs ? (
                        <button
                          type="button"
                          onClick={onOpenShareModal}
                          title="Jetzt an Familie verschicken"
                          aria-label="Jetzt an Familie verschicken"
                          style={{
                            padding: '8px 16px',
                            borderRadius: '100px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                            color: '#ffffff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            boxShadow: '0 3px 10px rgba(249, 115, 22, 0.3)'
                          }}
                          className="hover-scale"
                        >
                          <Share2 size={14} />
                          <span>Verschicken / Teilen</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenJuniorWizardForMilestone(ms.id, null)}
                          title="Neue Zeitkapsel aufnehmen"
                          aria-label="Neue Zeitkapsel aufnehmen"
                          style={{
                            padding: '8px 12px',
                            borderRadius: '100px',
                            border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.18)'}`,
                            background: isLight ? '#ffffff' : 'rgba(255,255,255,0.06)',
                            color: colors.textSecondary,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                          className="hover-scale"
                        >
                          <RotateCcw size={13} />
                          <span>Neu aufnehmen (+25 XP)</span>
                        </button>
                      )}
                    </>
                  ) : isFamilyShareMs ? (
                    <button
                      type="button"
                      onClick={() => onOpenJuniorWizardForMilestone(ms.id, 'pl_gifts')}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '100px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)'
                      }}
                      className="hover-scale"
                    >
                      <Gift size={15} />
                      <span>Geschenk aufnehmen ✨ +50 XP</span>
                    </button>
                  ) : isFirstSongMs ? (
                    <button
                      type="button"
                      onClick={() => onOpenJuniorWizardForMilestone(ms.id, null)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '100px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
                      }}
                      className="hover-scale"
                    >
                      <Music size={15} />
                      <span>Meisterstück einspielen 👑 +100 XP</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenJuniorWizardForMilestone(ms.id, null)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '100px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                      }}
                      className="hover-scale"
                    >
                      <Mic size={15} />
                      <span>Einspielen ✨ +50 XP</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Zeitkapsel-Zeitleiste */}
              {hasHistory && (
                <div
                  style={{
                    marginTop: '4px',
                    paddingTop: '10px',
                    borderTop: `1px dashed ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.70rem',
                      fontWeight: 900,
                      color: isLight ? '#047857' : '#86efac'
                    }}
                  >
                    <span>⏳ Wachstums-Reise:</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMilestoneVersions((prev) => ({ ...prev, [ms.id]: 'latest' }));
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '100px',
                      border:
                        selectedVerId === 'latest'
                          ? '1.5px solid #10b981'
                          : `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.18)'}`,
                      background:
                        selectedVerId === 'latest'
                          ? isLight
                            ? '#dcfce7'
                            : 'rgba(16, 185, 129, 0.25)'
                          : isLight
                          ? '#ffffff'
                          : 'transparent',
                      color: selectedVerId === 'latest' ? '#047857' : colors.textSecondary,
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>🌟 Heute ({ms.schoolYear || '2026/27'})</span>
                  </button>

                  {ms.history!.map((ver, vIdx) => {
                    const isVerSelected = selectedVerId === ver.id;
                    const verAgeIcon = vIdx === 0 ? '🎈' : vIdx === ms.history!.length - 1 ? '👶' : '🌱';
                    const verLabel = ver.schoolYear ? `${ver.schoolYear}` : ver.recordedAt || `V${ver.versionNumber}`;

                    return (
                      <button
                        key={ver.id || vIdx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMilestoneVersions((prev) => ({ ...prev, [ms.id]: ver.id }));
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '100px',
                          border: isVerSelected
                            ? '1.5px solid #f59e0b'
                            : `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.18)'}`,
                          background: isVerSelected
                            ? isLight
                              ? '#fef3c7'
                              : 'rgba(245, 158, 11, 0.25)'
                            : isLight
                            ? '#ffffff'
                            : 'transparent',
                          color: isVerSelected ? '#b45309' : colors.textSecondary,
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>
                          {verAgeIcon} {verLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

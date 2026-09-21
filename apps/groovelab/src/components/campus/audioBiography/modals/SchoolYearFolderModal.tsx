import React from 'react';
import { FolderOpen, X, Play, Music, Check, Pause } from 'lucide-react';
import { SchoolYearLP, CustomPlaylist, MilestoneData, VIBE_THEMES } from '../types';

interface SchoolYearFolderModalProps {
  lp: SchoolYearLP;
  onClose: () => void;
  customPlaylists: CustomPlaylist[];
  milestones: MilestoneData[];
  isLight: boolean;
  isMobileOrSim?: boolean;
  activePlayingId: string | null;
  onPlayToggle: (audioUrl?: string, masteredAudioUrl?: string, trackId?: string) => void;
  onPlayAlbumQueue: (title: string, subtitle: string, tracks: any[], gradient?: string, accentColor?: string) => void;
}

export const SchoolYearFolderModal: React.FC<SchoolYearFolderModalProps> = ({
  lp,
  onClose,
  customPlaylists,
  milestones,
  isLight,
  isMobileOrSim,
  activePlayingId,
  onPlayToggle,
  onPlayAlbumQueue
}) => {
  const colors = {
    textPrimary: isLight ? '#0f172a' : '#f8fafc',
    textSecondary: isLight ? '#475569' : '#cbd5e1',
    textMuted: isLight ? '#64748b' : '#94a3b8',
    panelBorder: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)',
    cardBorder: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)'
  };

  const yearPlaylists = customPlaylists.filter(pl => pl.createdAt && pl.createdAt.includes(lp.year));
  const yearMilestones = milestones.filter(m => m.audioUrl && (m.schoolYear === lp.year || (lp.isCurrent && !m.schoolYear)));
  const allYearTracks = [
    ...yearMilestones.map(m => ({
      id: m.id,
      title: m.title,
      subtitle: m.subtitle,
      audioUrl: m.audioUrl!,
      masteredAudioUrl: m.masteredAudioUrl,
      duration: m.duration || 60,
      albumTitle: lp.title
    })),
    ...yearPlaylists.flatMap(pl => pl.tracks.map(t => ({ ...t, albumTitle: pl.title })))
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Schuljahr-Archiv ${lp.year}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
    >
      <div style={{
        background: isLight ? '#ffffff' : '#1e293b',
        border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)'}`,
        borderRadius: '28px',
        padding: '28px',
        maxWidth: '740px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        color: colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        gap: '22px',
        boxShadow: '0 30px 70px rgba(0, 0, 0, 0.8)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: lp.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 6px 18px rgba(0,0,0,0.3)'
            }}>
              <FolderOpen size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: lp.accentColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Schuljahr-Archiv
              </span>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>
                Schuljahr {lp.year} – Playlists & Aufnahmen
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textSecondary,
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Action: Play entire school year */}
        <div style={{
          background: isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.6)',
          border: `1px solid ${colors.panelBorder}`,
          borderRadius: '18px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: colors.textPrimary, display: 'block' }}>
              Gesamte Jahres-LP abspielen
            </span>
            <span style={{ fontSize: '0.76rem', color: colors.textMuted }}>
              {allYearTracks.length} Aufnahmen • {Math.ceil(allYearTracks.reduce((acc, t) => acc + (t.duration || 60), 0) / 60)} Minuten Gesamt-Laufzeit
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onPlayAlbumQueue(`Schuljahr ${lp.year} (Gesamt-LP)`, lp.subtitle, allYearTracks, lp.gradient, lp.accentColor);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: 'white',
              padding: '10px 18px',
              borderRadius: '100px',
              fontSize: '0.82rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
            }}
            className="hover-scale"
          >
            <Play size={16} />
            <span>Ganzes Schuljahr abspielen</span>
          </button>
        </div>

        {/* Playlists in this school year */}
        <div>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.94rem', fontWeight: 900, color: colors.textPrimary }}>
            Playlists in diesem Schuljahr ({yearPlaylists.length})
          </h4>

          {yearPlaylists.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.2)', borderRadius: '14px', color: colors.textMuted, fontSize: '0.82rem' }}>
              Keine separaten Playlists für dieses Schuljahr angelegt.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobileOrSim ? '1fr' : 'repeat(2, 1fr)', gap: '12px' }}>
              {yearPlaylists.map((pl) => {
                const themeObj = VIBE_THEMES.find(v => v.id === pl.vibeTheme) || VIBE_THEMES[0];
                return (
                  <div
                    key={pl.id}
                    style={{
                      background: isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.8)',
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: '16px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: themeObj.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <Music size={18} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.86rem', fontWeight: 900, color: colors.textPrimary, display: 'block' }}>
                          {pl.title}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: isLight ? '#475569' : '#94a3b8', fontWeight: 600 }}>
                          {pl.tracks.length} {pl.tracks.length === 1 ? 'Song' : 'Songs'} • Studio-Master
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onPlayAlbumQueue(pl.title, pl.description || 'Playlist', pl.tracks, themeObj.gradient, themeObj.color);
                      }}
                      style={{
                        background: '#10b981',
                        border: 'none',
                        color: 'white',
                        borderRadius: '50%',
                        width: '34px',
                        height: '34px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Play size={15} style={{ marginLeft: '2px' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Milestones in this school year */}
        <div>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.94rem', fontWeight: 900, color: colors.textPrimary }}>
            Gemeisterte Meilensteine in diesem Schuljahr ({yearMilestones.length})
          </h4>

          {yearMilestones.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.2)', borderRadius: '14px', color: colors.textMuted, fontSize: '0.82rem' }}>
              Keine Meilensteine in diesem Schuljahr aufgezeichnet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {yearMilestones.map((ms) => (
                <div
                  key={ms.id}
                  style={{
                    background: isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.8)',
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: '14px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#f59e0b',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 900
                    }}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: colors.textPrimary, display: 'block' }}>
                        Station {ms.stepNumber}: {ms.title}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: colors.textMuted }}>
                        {ms.subtitle}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onPlayToggle(ms.audioUrl, ms.masteredAudioUrl, ms.id)}
                    style={{
                      background: activePlayingId === ms.id ? '#f59e0b' : '#10b981',
                      border: 'none',
                      color: 'white',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    {activePlayingId === ms.id ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

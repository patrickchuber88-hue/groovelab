import React from 'react';
import { Disc, ChevronDown, Play, Download, Mic, Clock, Edit3, Trash2 } from 'lucide-react';
import { MilestoneData } from '../types';

export interface VinylTracklistSectionProps {
  effectiveShelfMode: 'years' | 'playlists';
  showChapterList: boolean;
  setShowChapterList: (show: boolean) => void;
  currentShelfVibeObj: { color: string };
  milestones: MilestoneData[];
  activePlaylistTracks: any[];
  activePlayingId: string | null;
  isLight: boolean;
  colors: { textPrimary: string; textSecondary: string; textMuted: string };
  selectedCustomPlaylistId: string | null;
  handlePlayToggle: (audioUrl?: string, masteredAudioUrl?: string, trackId?: string) => void;
  downloadAudioTrack: (audioUrl?: string, masteredAudioUrl?: string, title?: string, trackId?: string) => void;
  openUploadModal: (milestone: MilestoneData) => void;
  openEditTrackModal: (playlistId: string, track: any) => void;
  requestDeleteTrack?: (playlistId: string, trackId: string, title: string) => void;
  onRecordForPlaylist: () => void;
}

export const VinylTracklistSection: React.FC<VinylTracklistSectionProps> = ({
  effectiveShelfMode,
  showChapterList,
  setShowChapterList,
  currentShelfVibeObj,
  milestones,
  activePlaylistTracks,
  activePlayingId,
  isLight,
  colors,
  selectedCustomPlaylistId,
  handlePlayToggle,
  downloadAudioTrack,
  openUploadModal,
  openEditTrackModal,
  requestDeleteTrack,
  onRecordForPlaylist
}) => {
  return (
    <div
      style={{
        background: isLight ? '#f1f5f9' : 'rgba(0, 0, 0, 0.35)',
        border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)'}`,
        borderRadius: '18px',
        overflow: 'hidden'
      }}
    >
      <button
        type="button"
        onClick={() => setShowChapterList(!showChapterList)}
        style={{
          width: '100%',
          padding: '11px 14px',
          background: 'transparent',
          border: 'none',
          color: colors.textPrimary,
          fontSize: '0.8rem',
          fontWeight: 900,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Disc size={15} color={currentShelfVibeObj.color} />
          <span>
            {effectiveShelfMode === 'years'
              ? `${milestones.length} Meilenstein-Kapitel (${activePlaylistTracks.length}/${milestones.length})`
              : `Titelliste (${activePlaylistTracks.length} Songs)`}
          </span>
        </div>
        <ChevronDown
          size={15}
          style={{ transform: showChapterList ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>

      {showChapterList && (
        <div style={{ padding: '0 10px 10px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {effectiveShelfMode === 'years' ? (
            milestones.map((ms) => {
              const isTrackPlaying = activePlayingId === ms.id;
              const isRecorded = !!ms.audioUrl;

              return (
                <div
                  key={ms.id}
                  style={{
                    padding: '9px 11px',
                    borderRadius: '12px',
                    background: isTrackPlaying
                      ? isLight
                        ? '#dcfce7'
                        : 'rgba(16, 185, 129, 0.2)'
                      : isLight
                      ? '#ffffff'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: isTrackPlaying
                      ? `1.5px solid ${isLight ? '#86efac' : 'rgba(16, 185, 129, 0.5)'}`
                      : `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.06)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: isRecorded ? 1 : 0.75,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div
                    onClick={() => isRecorded && handlePlayToggle(ms.audioUrl, ms.masteredAudioUrl, ms.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: isRecorded ? 'pointer' : 'default',
                      flex: 1
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: isRecorded ? (isLight ? '#059669' : '#34d399') : colors.textMuted,
                        fontWeight: 900,
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      #{ms.stepNumber < 10 ? `0${ms.stepNumber}` : ms.stepNumber}
                    </span>
                    <div>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: isTrackPlaying ? '#10b981' : colors.textPrimary,
                          display: 'block',
                          lineHeight: 1.25
                        }}
                      >
                        {ms.title}
                      </span>
                      {ms.personalNote && (
                        <span
                          style={{
                            fontSize: '0.66rem',
                            color: colors.textSecondary,
                            fontStyle: 'italic',
                            fontWeight: 500
                          }}
                        >
                          &ldquo;{ms.personalNote.slice(0, 24)}...&rdquo;
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isRecorded ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handlePlayToggle(ms.audioUrl, ms.masteredAudioUrl, ms.id)}
                          aria-label={isTrackPlaying ? 'Pausieren' : 'Abspielen'}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          {isTrackPlaying ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '12px' }}>
                              {[0, 1, 2].map((b) => (
                                <div
                                  key={b}
                                  style={{
                                    width: '2.5px',
                                    background: '#10b981',
                                    borderRadius: '2px',
                                    animation: 'soundBarPulse 0.8s ease-in-out infinite alternate',
                                    animationDelay: `${b * 0.2}s`
                                  }}
                                />
                              ))}
                            </div>
                          ) : (
                            <Play size={13} color="#10b981" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadAudioTrack(ms.audioUrl, ms.masteredAudioUrl, ms.title, ms.id);
                          }}
                          title="Song herunterladen"
                          aria-label="Song herunterladen"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          className="hover-scale"
                        >
                          <Download size={12} color={isLight ? '#64748b' : '#94a3b8'} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openUploadModal(ms)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '100px',
                          border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`,
                          background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
                          color: colors.textPrimary,
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        className="hover-scale"
                      >
                        <Mic size={11} color="#10b981" />
                        <span>+ Aufnehmen</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : activePlaylistTracks.length === 0 ? (
            <div
              style={{
                padding: '9px 11px',
                borderRadius: '12px',
                background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                border: `1.5px dashed ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: isLight ? '#059669' : '#34d399',
                    fontWeight: 900,
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  #01
                </span>
                <div>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: colors.textPrimary,
                      display: 'block',
                      lineHeight: 1.25
                    }}
                  >
                    Erster Song für diese Playlist
                  </span>
                  <span style={{ fontSize: '0.66rem', color: colors.textSecondary }}>Bereit für Studio-Aufnahme</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onRecordForPlaylist}
                style={{
                  padding: '5px 10px',
                  borderRadius: '100px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)'
                }}
                className="hover-scale"
              >
                <Mic size={11} color="#ffffff" />
                <span>+ Aufnehmen</span>
              </button>
            </div>
          ) : (
            activePlaylistTracks.map((t, idx) => {
              const isTrackPlaying = activePlayingId === t.id;
              const isRecorded = !!t.audioUrl;

              return (
                <div
                  key={t.id}
                  onClick={() => isRecorded && handlePlayToggle(t.audioUrl, t.masteredAudioUrl, t.id)}
                  style={{
                    padding: '9px 11px',
                    borderRadius: '12px',
                    background: isTrackPlaying
                      ? isLight
                        ? '#dcfce7'
                        : 'rgba(16, 185, 129, 0.2)'
                      : isLight
                      ? '#ffffff'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: isTrackPlaying
                      ? `1.5px solid ${isLight ? '#86efac' : 'rgba(16, 185, 129, 0.5)'}`
                      : `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.06)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: isRecorded ? 'pointer' : 'default',
                    opacity: isRecorded ? 1 : 0.6,
                    transition: 'all 0.15s ease'
                  }}
                  className={isRecorded ? 'hover-scale' : ''}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: isLight ? '#059669' : '#34d399',
                        fontWeight: 900,
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </span>
                    <div>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: isTrackPlaying ? '#10b981' : colors.textPrimary,
                          display: 'block',
                          lineHeight: 1.25
                        }}
                      >
                        {t.title}
                      </span>
                      {t.personalNote && (
                        <span
                          style={{
                            fontSize: '0.66rem',
                            color: colors.textSecondary,
                            fontStyle: 'italic',
                            fontWeight: 500
                          }}
                        >
                          &ldquo;{t.personalNote.slice(0, 24)}...&rdquo;
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isTrackPlaying ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '12px' }}>
                        {[0, 1, 2].map((b) => (
                          <div
                            key={b}
                            style={{
                              width: '2.5px',
                              background: '#10b981',
                              borderRadius: '2px',
                              animation: 'soundBarPulse 0.8s ease-in-out infinite alternate',
                              animationDelay: `${b * 0.2}s`
                            }}
                          />
                        ))}
                      </div>
                    ) : isRecorded ? (
                      <Play size={13} color="#10b981" />
                    ) : (
                      <Clock size={13} color={isLight ? '#94a3b8' : '#64748b'} />
                    )}

                    {isRecorded && effectiveShelfMode === 'playlists' && selectedCustomPlaylistId && t.audioUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedCustomPlaylistId) {
                            openEditTrackModal(selectedCustomPlaylistId, t);
                          }
                        }}
                        title="Song bearbeiten"
                        aria-label="Song bearbeiten"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        className="hover-scale"
                      >
                        <Edit3 size={12} color="#0ea5e9" />
                      </button>
                    )}

                    {isRecorded && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadAudioTrack(t.audioUrl, t.masteredAudioUrl, t.title, t.id);
                        }}
                        title="Song herunterladen"
                        aria-label="Song herunterladen"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        className="hover-scale"
                      >
                        <Download size={12} color={isLight ? '#64748b' : '#94a3b8'} />
                      </button>
                    )}

                    {effectiveShelfMode === 'playlists' && selectedCustomPlaylistId && requestDeleteTrack && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDeleteTrack(selectedCustomPlaylistId, t.id, t.title);
                        }}
                        title="Song aus Playlist löschen"
                        aria-label="Song aus Playlist löschen"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        className="hover-scale"
                      >
                        <Trash2 size={12} color="#ef4444" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

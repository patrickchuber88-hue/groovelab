import React from 'react';
import { X, Mic, Play, Pause, Trash2, Share2 } from 'lucide-react';
import { CustomPlaylist, UNIVERSAL_PLAYLIST_COVERS, UniversalPlaylistCoverConfig } from '../types';

export interface JuniorAlbumModalProps {
  playlist: CustomPlaylist | null;
  onClose: () => void;
  isLight: boolean;
  colors: { textPrimary: string; textSecondary: string };
  student?: { first_name?: string } | null;
  studentId: string;
  activePlayingId: string | null;
  onPlayToggle: (audioUrl?: string, masteredAudioUrl?: string, trackId?: string) => void;
  onOpenJuniorWizard: (playlistId: string) => void;
  onRequestDeletePlaylist: (playlistId: string, title: string) => void;
  onRequestDeleteTrack: (playlistId: string, trackId: string, title: string) => void;
  onTrackRemovedLocally?: (trackId: string) => void;
  copyToClipboard: (text: string) => void;
}

export const JuniorAlbumModal: React.FC<JuniorAlbumModalProps> = ({
  playlist,
  onClose,
  isLight,
  colors,
  student,
  studentId,
  activePlayingId,
  onPlayToggle,
  onOpenJuniorWizard,
  onRequestDeletePlaylist,
  onRequestDeleteTrack,
  copyToClipboard
}) => {
  if (!playlist) return null;

  const coverConfig = UNIVERSAL_PLAYLIST_COVERS.find((c: UniversalPlaylistCoverConfig) => c.id === playlist.coverPresetId);
  const isGifts = playlist.id === 'pl_gifts';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={playlist.title}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
    >
      <div
        style={{
          background: isLight ? '#ffffff' : '#1e293b',
          borderRadius: '28px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'}`
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '22px 26px',
            borderBottom: `1px solid ${isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isGifts
              ? (isLight ? '#fdf2f8' : 'rgba(236, 72, 153, 0.12)')
              : (isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)')
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '18px',
                background: isGifts
                  ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                  : (coverConfig?.gradient || 'linear-gradient(135deg, #10b981 0%, #059669 100%)'),
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                flexShrink: 0
              }}
            >
              {isGifts ? '🎁' : (coverConfig?.emoji || '🎵')}
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.70rem',
                  fontWeight: 900,
                  color: isGifts ? '#ea580c' : '#059669',
                  textTransform: 'uppercase'
                }}
              >
                ALBUM • {playlist.tracks?.length || 0}{' '}
                {playlist.tracks?.length === 1
                  ? (isGifts ? 'GESCHENK' : 'STÜCK')
                  : (isGifts ? 'GESCHENKE' : 'STÜCKE')}
              </div>
              <h2 style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: 900, color: colors.textPrimary }}>
                {playlist.title}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isGifts && playlist.id !== 'pl_meilenstein_lp' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestDeletePlaylist(playlist.id, playlist.title);
                }}
                title="Album löschen"
                aria-label="Album löschen"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: 'none',
                  background: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.15)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                className="hover-scale"
              >
                <Trash2 size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.1)',
                color: colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              className="hover-scale"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Record Action Button */}
          <button
            type="button"
            onClick={() => {
              const plId = playlist.id;
              onClose();
              onOpenJuniorWizard(plId);
            }}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '16px',
              border: 'none',
              background: isGifts
                ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isGifts
                ? '0 6px 18px rgba(236, 72, 153, 0.35)'
                : '0 6px 18px rgba(16, 185, 129, 0.35)'
            }}
            className="hover-scale"
          >
            <Mic size={18} />
            <span>{isGifts ? 'Neues Musik-Geschenk aufnehmen 🎁' : 'Neues Stück für dieses Album aufnehmen ✨'}</span>
          </button>

          {/* Tracks List */}
          {(!playlist.tracks || playlist.tracks.length === 0) ? (
            <div
              style={{
                background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.02)',
                borderRadius: '18px',
                padding: '28px 18px',
                textAlign: 'center',
                border: `1.5px dashed ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`
              }}
            >
              <span style={{ fontSize: '2rem' }}>{isGifts ? '🎁' : '🎶'}</span>
              <div style={{ fontSize: '0.94rem', fontWeight: 900, color: colors.textPrimary, marginTop: '8px' }}>
                Dieses Album ist noch leer
              </div>
              <div style={{ fontSize: '0.76rem', color: colors.textSecondary, marginTop: '4px' }}>
                Klicke auf den Button oben, um dein erstes Stück aufzunehmen!
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {playlist.tracks.map((t, tIdx) => {
                const isPlaying = activePlayingId === t.id;
                const isGiftTrack = isGifts || t.title.toLowerCase().includes('geschenk') || t.subtitle?.includes('🎁');

                return (
                  <div
                    key={t.id || tIdx}
                    style={{
                      borderRadius: '16px',
                      background: isGiftTrack
                        ? (isLight ? '#fff5f7' : 'rgba(236, 72, 153, 0.08)')
                        : (isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)'),
                      border: `1.5px solid ${isGiftTrack ? '#fbcfe8' : (isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)')}`,
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '10px',
                          background: isGiftTrack ? '#fce7f3' : (isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'),
                          color: isGiftTrack ? '#be185d' : colors.textPrimary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.82rem',
                          fontWeight: 900,
                          flexShrink: 0
                        }}
                      >
                        {isGiftTrack ? '🎁' : `${tIdx + 1}`}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: '0.90rem',
                            fontWeight: 900,
                            color: colors.textPrimary,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {t.title}
                        </div>
                        <div style={{ fontSize: '0.70rem', color: colors.textSecondary, marginTop: '2px' }}>
                          {t.recordedAt || 'Aufnahme'} • {Math.floor((t.duration || 30) / 60)}:{(t.duration || 30) % 60 < 10 ? '0' : ''}{(t.duration || 30) % 60} Min.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {isGiftTrack && (
                        <button
                          type="button"
                          onClick={async () => {
                            const sName = student?.first_name || 'Junger Musiker';
                            const origin = typeof window !== 'undefined' ? window.location.origin : 'https://campus-groovelab.de';
                            const shareUrl = `${origin}/share/audio-bio?student_id=${studentId}`;
                            const msg = `Ein Musik-Geschenk von ${sName}! 🎶🎁\n\nIch habe ein persönliches Stück für dich eingespielt:\n${shareUrl}`;
                            if (navigator.share) {
                              try {
                                await navigator.share({ title: `Musik-Geschenk von ${sName}`, text: msg, url: shareUrl });
                                return;
                              } catch {
                                // fallback to clipboard
                              }
                            }
                            copyToClipboard(msg);
                          }}
                          title="Mit Familie teilen"
                          aria-label="Mit Familie teilen"
                          style={{
                            padding: '7px 12px',
                            borderRadius: '100px',
                            border: 'none',
                            background: '#10b981',
                            color: 'white',
                            fontSize: '0.74rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                          }}
                          className="hover-scale"
                        >
                          <Share2 size={13} />
                          <span>Teilen</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onRequestDeleteTrack(playlist.id, t.id, t.title)}
                        title="Stück aus Album entfernen"
                        aria-label="Stück aus Album entfernen"
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          border: 'none',
                          background: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.12)',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        className="hover-scale"
                      >
                        <Trash2 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onPlayToggle(t.audioUrl, t.masteredAudioUrl, t.id)}
                        aria-label={isPlaying ? 'Pause' : 'Abspielen'}
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          border: 'none',
                          background: isPlaying ? '#ef4444' : '#10b981',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: isPlaying ? '0 2px 8px rgba(239, 68, 68, 0.35)' : '0 2px 8px rgba(16, 185, 129, 0.35)'
                        }}
                        className="hover-scale"
                      >
                        {isPlaying ? <Pause size={16} fill="#ffffff" /> : <Play size={16} fill="#ffffff" style={{ marginLeft: '2px' }} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Delete Playlist Option at Bottom */}
          {!isGifts && playlist.id !== 'pl_meilenstein_lp' && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '14px',
                paddingTop: '14px',
                borderTop: `1px solid ${isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)'}`
              }}
            >
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestDeletePlaylist(playlist.id, playlist.title);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  transition: 'all 0.15s ease'
                }}
                className="hover-scale"
              >
                <Trash2 size={15} />
                <span>Dieses Album löschen</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

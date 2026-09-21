import React from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Sparkles, Volume2, VolumeX, X 
} from 'lucide-react';
import { MilestoneData, CustomPlaylist } from '../types';

export interface FloatingMiniPlayerProps {
  activePlayingId: string | null;
  isPlayingPlaylist: boolean;
  isMiniPlayerPlaying: boolean;
  playbackQueue: any[];
  currentQueueIndex: number;
  milestones: MilestoneData[];
  customPlaylists: CustomPlaylist[];
  currentAlbumMeta: { title: string; subtitle?: string } | null;
  shelfMode: string;
  activeCustomPlaylist: CustomPlaylist | null;
  isLight: boolean;
  colors: { textPrimary: string; textMuted: string; textSecondary: string };
  audioCurrentTime: number;
  audioDuration: number;
  formatSeconds: (secs: number) => string;
  seekMiniPlayer: (posSeconds: number) => void;
  playPrevInPlaylist: () => void;
  playNextInPlaylist: () => void;
  toggleMiniPlayerPlay: () => void;
  isMobileOrSim: boolean;
  audioMode: 'master' | 'raw';
  switchAudioMode: (mode: 'master' | 'raw') => void;
  isMiniPlayerMuted: boolean;
  setIsMiniPlayerMuted: (muted: boolean) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioVolume: number;
  onCloseMiniPlayer: () => void;
}

export const FloatingMiniPlayer: React.FC<FloatingMiniPlayerProps> = ({
  activePlayingId,
  isPlayingPlaylist,
  isMiniPlayerPlaying,
  playbackQueue,
  currentQueueIndex,
  milestones,
  customPlaylists,
  currentAlbumMeta,
  shelfMode,
  activeCustomPlaylist,
  isLight,
  colors,
  audioCurrentTime,
  audioDuration,
  formatSeconds,
  seekMiniPlayer,
  playPrevInPlaylist,
  playNextInPlaylist,
  toggleMiniPlayerPlay,
  isMobileOrSim,
  audioMode,
  switchAudioMode,
  isMiniPlayerMuted,
  setIsMiniPlayerMuted,
  audioRef,
  audioVolume,
  onCloseMiniPlayer
}) => {
  if (!activePlayingId && !isPlayingPlaylist && !isMiniPlayerPlaying) return null;

  const currentTrack =
    (playbackQueue.length > 0 ? playbackQueue[currentQueueIndex] : null) ||
    milestones.find((m) => m.id === activePlayingId) ||
    customPlaylists.flatMap((p) => p.tracks).find((t) => t.id === activePlayingId) || {
      title: currentAlbumMeta?.title || 'Wiedergabe aktiv',
      subtitle: currentAlbumMeta?.subtitle || 'Campus-Groovelab Studio Player'
    };

  const albumName =
    currentAlbumMeta?.title ||
    (shelfMode === 'years' ? '🌟 Meine Meilenstein-LP' : activeCustomPlaylist?.title || 'Studio-Album');

  return (
    <div
      role="region"
      aria-label="Audio-Player Steuerung"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(94%, 860px)',
        zIndex: 99998,
        background: isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        border: `1.5px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.16)'}`,
        borderRadius: '24px',
        padding: '12px 18px',
        boxShadow: isLight ? '0 16px 45px rgba(0, 0, 0, 0.12)' : '0 20px 50px rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxSizing: 'border-box'
      }}
    >
      {/* Progress Scrubber */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: colors.textMuted, minWidth: '32px' }}>
          {formatSeconds(audioCurrentTime)}
        </span>
        <div
          role="slider"
          aria-label="Song-Position"
          aria-valuemin={0}
          aria-valuemax={Math.round(audioDuration || 0)}
          aria-valuenow={Math.round(audioCurrentTime || 0)}
          tabIndex={0}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            if (audioDuration > 0) seekMiniPlayer(pos * audioDuration);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' && audioDuration > 0) {
              seekMiniPlayer(Math.min(audioDuration, audioCurrentTime + 5));
            } else if (e.key === 'ArrowLeft' && audioDuration > 0) {
              seekMiniPlayer(Math.max(0, audioCurrentTime - 5));
            }
          }}
          style={{
            flex: 1,
            height: '5px',
            borderRadius: '100px',
            background: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.15)',
            position: 'relative',
            cursor: 'pointer'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: `${audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0}%`,
              background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
              borderRadius: '100px'
            }}
          />
        </div>
        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: colors.textMuted, minWidth: '32px', textAlign: 'right' }}>
          {formatSeconds(audioDuration)}
        </span>
      </div>

      {/* Main Player Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
        {/* Left: Mini-Disc Artwork + Song Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '160px', flex: 1 }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, #0f172a 20%, #334155 22%, #0f172a 40%, #1e293b 60%, #0f172a 80%, #334155 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              animation: isMiniPlayerPlaying ? 'vinylSpin 3.5s linear infinite' : 'none'
            }}
          >
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#10b981' }} />
          </div>

          <div style={{ minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.86rem',
                fontWeight: 900,
                color: colors.textPrimary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {currentTrack.title}
            </span>
            <span
              style={{
                display: 'block',
                fontSize: '0.72rem',
                color: colors.textMuted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {albumName}
            </span>
          </div>
        </div>

        {/* Center: Playback Controls (Skip Prev, Play/Pause, Skip Next) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={playPrevInPlaylist}
            title="Vorheriger Song"
            aria-label="Vorheriger Song"
            style={{
              background: 'none',
              border: 'none',
              color: colors.textPrimary,
              cursor: 'pointer',
              padding: '6px'
            }}
            className="hover-scale"
          >
            <SkipBack size={18} />
          </button>

          <button
            type="button"
            onClick={toggleMiniPlayerPlay}
            title={isMiniPlayerPlaying ? 'Pause' : 'Play'}
            aria-label={isMiniPlayerPlaying ? 'Pause' : 'Play'}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
            }}
            className="hover-scale"
          >
            {isMiniPlayerPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
          </button>

          <button
            type="button"
            onClick={playNextInPlaylist}
            title="Nächster Song"
            aria-label="Nächster Song"
            style={{
              background: 'none',
              border: 'none',
              color: colors.textPrimary,
              cursor: 'pointer',
              padding: '6px'
            }}
            className="hover-scale"
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* Right: Studio Audio-Processing Switcher & Volume */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: isMobileOrSim ? 0 : 1,
            justifyContent: 'flex-end'
          }}
        >
          {!isMobileOrSim && (
            <button
              type="button"
              onClick={() => switchAudioMode(audioMode === 'master' ? 'raw' : 'master')}
              aria-label={`Audiomodus umschalten (aktuell: ${audioMode})`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '100px',
                border: `1px solid ${audioMode === 'master' ? '#10b981' : isLight ? '#94a3b8' : 'rgba(255,255,255,0.2)'}`,
                background: audioMode === 'master' ? (isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.2)') : 'transparent',
                color: audioMode === 'master' ? '#047857' : (isLight ? '#334155' : colors.textMuted),
                fontSize: '0.72rem',
                fontWeight: 900,
                cursor: 'pointer',
                touchAction: 'manipulation'
              }}
            >
              <Sparkles size={12} color={audioMode === 'master' ? '#047857' : '#10b981'} />
              <span>{audioMode === 'master' ? '✨ Studio-Master' : '🎙️ RAW'}</span>
            </button>
          )}

          {/* Volume toggle */}
          {!isMobileOrSim && (
            <button
              type="button"
              onClick={() => {
                if (audioRef.current) {
                  const newMuted = !isMiniPlayerMuted;
                  setIsMiniPlayerMuted(newMuted);
                  audioRef.current.volume = newMuted ? 0 : audioVolume;
                }
              }}
              aria-label={isMiniPlayerMuted ? 'Ton einschalten' : 'Stummschalten'}
              style={{
                background: 'none',
                border: 'none',
                color: colors.textSecondary,
                cursor: 'pointer',
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                touchAction: 'manipulation'
              }}
            >
              {isMiniPlayerMuted ? <VolumeX size={18} color="#ef4444" /> : <Volume2 size={18} />}
            </button>
          )}

          {/* Stop & Close Mini-Player */}
          <button
            type="button"
            onClick={onCloseMiniPlayer}
            title="Player schließen"
            aria-label="Player schließen"
            style={{
              background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textSecondary,
              cursor: 'pointer',
              touchAction: 'manipulation'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

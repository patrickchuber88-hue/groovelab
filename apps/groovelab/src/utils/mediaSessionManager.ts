/**
 * Campus-Groovelab Media Session Manager
 * 
 * Synchronizes audio playback with OS Lock Screen, Control Center,
 * and Smartwatches (Apple Watch, WearOS) via the W3C Media Session API.
 */

export interface MediaTrackInfo {
  title: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
}

export interface MediaActionHandlers {
  onPlay?: () => void;
  onPause?: () => void;
  onSeekBackward?: (details?: any) => void;
  onSeekForward?: (details?: any) => void;
  onStop?: () => void;
}

export class MediaSessionManager {
  private static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
  }

  /**
   * Sets OS lock screen and control center track metadata.
   */
  public static setMetadata(info: MediaTrackInfo): void {
    if (!this.isSupported()) return;

    try {
      const artwork = info.artworkUrl
        ? [
            { src: info.artworkUrl, sizes: '192x192', type: 'image/png' },
            { src: info.artworkUrl, sizes: '512x512', type: 'image/png' }
          ]
        : [
            { src: '/pwa-icon.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-icon.png', sizes: '512x512', type: 'image/png' }
          ];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: info.title || 'Campus-Groovelab Audio',
        artist: info.artist || 'Campus-Groovelab',
        album: info.album || 'Campus Musikschule',
        artwork
      });
    } catch (e) {
      console.warn('[MediaSession] Could not set metadata:', e);
    }
  }

  /**
   * Updates playback state ('playing' | 'paused' | 'none').
   */
  public static setPlaybackState(state: 'playing' | 'paused' | 'none'): void {
    if (!this.isSupported()) return;

    try {
      navigator.mediaSession.playbackState = state;
    } catch (e) {
      console.warn('[MediaSession] Could not set playback state:', e);
    }
  }

  /**
   * Sets hardware and lock screen action handlers (Play/Pause/Skip).
   */
  public static setActionHandlers(handlers: MediaActionHandlers): void {
    if (!this.isSupported()) return;

    try {
      if (handlers.onPlay) {
        navigator.mediaSession.setActionHandler('play', () => {
          handlers.onPlay?.();
          this.setPlaybackState('playing');
        });
      }

      if (handlers.onPause) {
        navigator.mediaSession.setActionHandler('pause', () => {
          handlers.onPause?.();
          this.setPlaybackState('paused');
        });
      }

      if (handlers.onSeekBackward) {
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          handlers.onSeekBackward?.(details);
        });
      }

      if (handlers.onSeekForward) {
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          handlers.onSeekForward?.(details);
        });
      }

      if (handlers.onStop) {
        navigator.mediaSession.setActionHandler('stop', () => {
          handlers.onStop?.();
          this.setPlaybackState('none');
        });
      }
    } catch (e) {
      console.warn('[MediaSession] Error setting action handlers:', e);
    }
  }

  /**
   * Resets the Media Session upon stopping or unmounting.
   */
  public static clear(): void {
    if (!this.isSupported()) return;

    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('stop', null);
    } catch (e) {}
  }
}

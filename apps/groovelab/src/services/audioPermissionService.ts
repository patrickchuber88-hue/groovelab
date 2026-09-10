/**
 * Centralized Audio & Microphone Permission Gatekeeper
 * Tier-1 SaaS Enterprise+ Architecture
 * Campus-Groovelab
 * 
 * Provides unified, 1-click persistent microphone authorization,
 * fast pre-flight checking, and strict hardware-safety track teardown.
 */

const STORAGE_KEY = 'campus_microphone_permission_granted';

/**
 * Checks the current browser permission state for the microphone.
 */
export async function checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return 'denied';
  }

  // 1. Web Permissions API (Chrome, Edge, Firefox, modern Safari)
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (status.state === 'granted') {
        localStorage.setItem(STORAGE_KEY, 'true');
        return 'granted';
      } else if (status.state === 'denied') {
        localStorage.removeItem(STORAGE_KEY);
        return 'denied';
      }
      return status.state as 'prompt';
    } catch (e) {
      // Some browsers throw on querying 'microphone'
    }
  }

  // 2. LocalStorage cache fallback
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached === 'true') {
    return 'granted';
  }

  return 'prompt';
}

/**
 * Performs a 1-time pre-flight permission request:
 * - If already granted in browser or cached in session, returns true immediately (0ms, zero flicker).
 * - Otherwise prompts the user once, immediately stops hardware tracks (DSGVO/Hardware light off),
 *   and caches the approval for seamless future access across all audio recordings and dictation.
 */
export async function requestMicrophonePermissionOnce(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('[AudioPermission] MediaDevices API not supported');
    return false;
  }

  // 1. Fast-path: Check Web Permissions API (instant, no hardware activation)
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (status.state === 'granted') {
        localStorage.setItem(STORAGE_KEY, 'true');
        return true;
      } else if (status.state === 'denied') {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
    } catch (e) {
      // Some browsers throw on querying 'microphone'
    }
  }

  // 2. Fast-path: LocalStorage cache for current session / origin
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached === 'true') {
    return true;
  }

  // 3. Pre-flight authorization request via user gesture
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });

    // Immediately stop hardware tracks to ensure privacy & turn off camera/mic light
    stream.getTracks().forEach(track => {
      track.stop();
    });

    localStorage.setItem(STORAGE_KEY, 'true');
    console.info('[AudioPermission] Microphone permission successfully granted and cached.');
    return true;
  } catch (err: any) {
    console.warn('[AudioPermission] User denied or dismissed microphone access:', err);
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

/**
 * Fast synchronous check whether microphone permission is cached as granted in local storage.
 */
export function isMicrophonePermissionCached(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Studio-Grade High-Fidelity Audio Constraints (Zero Compression, Zero Filter DSP Artifacts)
 */
export const STUDIO_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: { ideal: false },
  noiseSuppression: { ideal: false },
  autoGainControl: { ideal: false },
  voiceIsolation: { ideal: false } as any,
  googEchoCancellation: false,
  googAutoGainControl: false,
  googNoiseSuppression: false,
  googHighpassFilter: false,
  googAudioMirroring: false,
  googTypingNoiseDetection: false,
  channelCount: { ideal: 2 },
  sampleRate: { ideal: 48000 },
  sampleSize: { ideal: 16 }
} as any;

/**
 * Seamlessly acquires an active audio stream for recording, tuner, or loopstation.
 */
export async function acquireAudioStream(constraints: MediaStreamConstraints = { audio: STUDIO_AUDIO_CONSTRAINTS }): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Mikrofon-Zugriff wird von diesem Browser nicht unterstützt.');
  }

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  localStorage.setItem(STORAGE_KEY, 'true');
  return stream;
}

/**
 * Hardware & WebKit Pre-Roll Stabilization:
 * Gives browser/driver audio units 300ms to settle, preventing initial transient clicks,
 * zero-fill lag, and delayed AGC convergence.
 */
export async function stabilizeAudioStream(stream: MediaStream, waitMs = 300): Promise<void> {
  if (!stream || !stream.active) return;
  await new Promise(resolve => setTimeout(resolve, Math.max(50, waitMs)));
}

/**
 * Hardware-Safety release: stops all active audio tracks immediately.
 */
export function releaseAudioStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach(track => {
      track.stop();
      stream.removeTrack(track);
    });
  } catch (err) {
    console.warn('[AudioPermission] Error releasing audio stream tracks:', err);
  }
}

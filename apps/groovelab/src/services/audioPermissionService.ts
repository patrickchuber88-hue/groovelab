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
 * Prompts the user once, immediately stops hardware tracks (DSGVO/Hardware light off),
 * and caches the approval for seamless future access across all modules.
 */
export async function requestMicrophonePermissionOnce(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('[AudioPermission] MediaDevices API not supported');
    return false;
  }

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
 * Seamlessly acquires an active audio stream for recording, tuner, or loopstation.
 */
export async function acquireAudioStream(constraints: MediaStreamConstraints = { audio: true }): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Mikrofon-Zugriff wird von diesem Browser nicht unterstützt.');
  }

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  localStorage.setItem(STORAGE_KEY, 'true');
  return stream;
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

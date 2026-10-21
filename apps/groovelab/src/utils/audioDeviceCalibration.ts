/**
 * Audio Device Calibration & Hardware Fingerprint Utility
 * 
 * Provides unified, cross-module hardware latency identification and storage.
 * Synchronizes per-device calibration between Loopstation, GrooveTrainer and PracticeCompanion,
 * persisting offsets to localStorage and Supabase user profiles via save_user_audio_calibration.
 */

import { supabase } from '../lib/supabase';
import { audioLatencyService } from '../services/audioLatencyService';

export interface DeviceAudioFingerprint {
  hash: string;
  name: string;
}

/**
 * Computes a deterministic hardware audio fingerprint based on active input/output audio devices
 * and AudioContext sample rate.
 */
export async function getAudioDeviceFingerprint(sampleRate: number = 44100): Promise<DeviceAudioFingerprint> {
  let deviceName = 'Standard Audio-Gerät';
  let rawString = 'default';

  if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput').map(d => d.label || d.deviceId).join('|');
      const audioOutputs = devices.filter(d => d.kind === 'audiooutput').map(d => d.label || d.deviceId).join('|');
      rawString = `${audioInputs}_${audioOutputs}_${sampleRate}`;

      const primaryInput = devices.find(d => d.kind === 'audioinput' && d.label);
      const primaryOutput = devices.find(d => d.kind === 'audiooutput' && d.label);
      if (primaryInput?.label) {
        deviceName = primaryInput.label;
      } else if (primaryOutput?.label) {
        deviceName = primaryOutput.label;
      }
    } catch (_) {}
  }

  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }

  return {
    hash: Math.abs(hash).toString(36),
    name: deviceName
  };
}

/**
 * Retrieves the calibrated latency offset for a given device hash.
 */
export function getDeviceLatency(deviceHash: string): number | null {
  if (audioLatencyService.isCurrentRouteCalibrated()) {
    return audioLatencyService.getEffectiveLatencyMs();
  }
  if (typeof localStorage === 'undefined') return null;

  try {
    const savedPerDevice = localStorage.getItem(`groovelab_latency_dev_${deviceHash}`);
    if (savedPerDevice !== null) {
      const parsed = parseInt(savedPerDevice, 10);
      if (!isNaN(parsed)) return parsed;
    }
  } catch (_) {}

  return null;
}

/**
 * Checks if the current hardware device has already been calibrated for the active user.
 */
export function isDeviceCalibrated(_deviceHash?: string): boolean {
  return audioLatencyService.isCurrentRouteCalibrated();
}

/**
 * Persists the calibrated latency offset locally and in the Supabase user profile.
 */
export async function saveDeviceLatency(
  deviceHash: string,
  deviceName: string,
  offsetVal: number,
  studentId?: string
): Promise<void> {
  audioLatencyService.setManualLatencyMs(offsetVal, 'manual_slider');

  if (studentId) {
    try {
      const platform = audioLatencyService.detectPlatform();
      const profileKey = `${platform}_speaker_${deviceHash || 'default'}`;
      await (supabase.rpc as any)('save_user_audio_calibration', {
        p_user_id: studentId,
        p_profile_key: profileKey,
        p_calibration: {
          profile_key: profileKey,
          device_hash: deviceHash,
          device_name: deviceName,
          latency_ms: offsetVal,
          calibrated_at: new Date().toISOString()
        }
      });
    } catch (err) {
      console.warn('[AudioDeviceCalibration] Supabase device calibration sync error:', err);
    }
  }
}

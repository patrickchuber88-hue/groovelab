/**
 * Audio Device Calibration & Hardware Fingerprint Utility
 * 
 * Provides unified, cross-module hardware latency identification and storage.
 * Synchronizes per-device calibration between Loopstation, GrooveTrainer and PracticeCompanion,
 * persisting offsets to localStorage and Supabase student profiles.
 */

import { supabase } from '../lib/supabase';

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
 * Checks per-device storage first, then falls back to global offset if marked as calibrated.
 */
export function getDeviceLatency(deviceHash: string): number | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const savedPerDevice = localStorage.getItem(`groovelab_latency_dev_${deviceHash}`);
    if (savedPerDevice !== null) {
      const parsed = parseInt(savedPerDevice, 10);
      if (!isNaN(parsed)) return parsed;
    }

    const globalSaved = localStorage.getItem('groovelab_sync_offset_ms');
    const isCalibrated = localStorage.getItem('groovelab_latency_calibrated') === 'true';
    if (globalSaved !== null && isCalibrated) {
      const parsed = parseInt(globalSaved, 10);
      if (!isNaN(parsed)) return parsed;
    }
  } catch (_) {}

  return null;
}

/**
 * Checks if the current hardware device has already been calibrated.
 */
export function isDeviceCalibrated(deviceHash: string): boolean {
  if (typeof localStorage === 'undefined') return false;

  try {
    const savedPerDevice = localStorage.getItem(`groovelab_latency_dev_${deviceHash}`);
    if (savedPerDevice !== null) return true;

    return localStorage.getItem('groovelab_latency_calibrated') === 'true';
  } catch (_) {
    return false;
  }
}

/**
 * Persists the calibrated latency offset locally and in the Supabase student profile.
 */
export async function saveDeviceLatency(
  deviceHash: string,
  deviceName: string,
  offsetVal: number,
  studentId?: string
): Promise<void> {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('groovelab_sync_offset_ms', offsetVal.toString());
      localStorage.setItem('groovelab_latency_calibrated', 'true');
      if (deviceHash) {
        localStorage.setItem(`groovelab_latency_dev_${deviceHash}`, offsetVal.toString());
      }
    } catch (_) {}
  }

  if (studentId) {
    try {
      await supabase
        .from('students')
        .update({
          device_calibration: {
            device_hash: deviceHash,
            device_name: deviceName,
            latency_ms: offsetVal,
            calibrated_at: new Date().toISOString()
          }
        })
        .eq('id', studentId);
    } catch (err) {
      console.warn('[AudioDeviceCalibration] Supabase device calibration sync error:', err);
    }
  }
}

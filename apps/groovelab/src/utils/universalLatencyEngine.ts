/**
 * Campus-Groovelab Universal Audio Latency & Grid Synchronization Engine
 * 
 * Single Source of Truth (SSOT) for platform-wide audio hardware latency compensation:
 * - Deterministic hardware fingerprinting & Bluetooth / AirPods detection.
 * - Unified storage across localStorage ('campus_master_latency_ms') and Supabase.
 * - Reactive cross-module event propagation ('campus_latency_updated').
 * - 100% backwards-compatible with legacy keys ('groovelab_sync_offset_ms', 'campus_timing_latency_offset').
 */

import { supabase } from '../lib/supabase';
import { detectDeviceLatencyInfo, DeviceLatencyInfo } from './deviceLatencyDetector';
import { getAudioDeviceFingerprint, DeviceAudioFingerprint } from './audioDeviceCalibration';

export const MASTER_LATENCY_STORAGE_KEY = 'campus_master_latency_ms';
export const LATENCY_UPDATED_EVENT = 'campus_latency_updated';

export class UniversalLatencyEngine {
  private static cachedLatencyMs: number | null = null;
  private static isDeviceChangeListenerAttached = false;

  /**
   * Returns the currently active latency compensation in seconds.
   * Ideal for WebAudio AudioBuffer slicing and mathematical calculations.
   */
  public static getLatencySec(audioCtx?: AudioContext | null): number {
    return this.getLatencyMs(audioCtx) / 1000.0;
  }

  /**
   * Returns the currently active latency compensation in samples for a given sample rate.
   */
  public static getLatencySamples(sampleRate: number, audioCtx?: AudioContext | null): number {
    const sec = this.getLatencySec(audioCtx);
    return Math.max(0, Math.round(sec * sampleRate));
  }

  /**
   * Returns the active hardware latency in milliseconds:
   * 1. Checks memory cache or explicit user calibration in localStorage (SSOT).
   * 2. Checks legacy keys for seamless backwards-compatibility.
   * 3. Falls back to zero-touch hardware & Bluetooth heuristic (detectDeviceLatencyInfo).
   */
  public static getLatencyMs(audioCtx?: AudioContext | null): number {
    if (typeof window === 'undefined') return 70;

    if (this.cachedLatencyMs !== null) {
      return this.cachedLatencyMs;
    }

    try {
      // 1. Primary SSOT key
      const masterSaved = localStorage.getItem(MASTER_LATENCY_STORAGE_KEY);
      if (masterSaved !== null) {
        const parsed = parseInt(masterSaved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 600) {
          this.cachedLatencyMs = parsed;
          this.attachDeviceChangeListener();
          return parsed;
        }
      }

      // 2. Legacy key fallbacks
      const loopstationSaved = localStorage.getItem('groovelab_sync_offset_ms');
      if (loopstationSaved !== null) {
        const parsed = parseInt(loopstationSaved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 600) {
          this.cachedLatencyMs = parsed;
          this.attachDeviceChangeListener();
          return parsed;
        }
      }

      const trainerSaved = localStorage.getItem('campus_timing_latency_offset');
      if (trainerSaved !== null) {
        const parsed = parseInt(trainerSaved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 600) {
          this.cachedLatencyMs = parsed;
          this.attachDeviceChangeListener();
          return parsed;
        }
      }
    } catch (_) {}

    // 3. Zero-touch heuristic auto-detection (CoreAudio, iOS, WASAPI, Android + Bluetooth detection)
    const detected = detectDeviceLatencyInfo(audioCtx);
    this.attachDeviceChangeListener();
    return detected.baselineLatencyMs;
  }

  /**
   * Returns the detailed device analysis including OS, suspected Bluetooth status, and default baseline.
   */
  public static getDeviceInfo(audioCtx?: AudioContext | null): DeviceLatencyInfo {
    return detectDeviceLatencyInfo(audioCtx);
  }

  /**
   * Saves the calibrated latency offset across all storage layers (Memory, LocalStorage, Supabase),
   * syncs legacy keys, and dispatches a cross-module event to update all active UIs without reload.
   */
  public static async saveLatencyMs(
    offsetMs: number, 
    studentId?: string, 
    audioCtx?: AudioContext | null
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    const clamped = Math.max(0, Math.min(600, Math.round(offsetMs)));
    this.cachedLatencyMs = clamped;

    // 1. LocalStorage SSOT + Legacy Mirroring
    try {
      localStorage.setItem(MASTER_LATENCY_STORAGE_KEY, clamped.toString());
      localStorage.setItem('groovelab_sync_offset_ms', clamped.toString());
      localStorage.setItem('groovelab_latency_calibrated', 'true');
      localStorage.setItem('campus_timing_latency_offset', clamped.toString());
    } catch (_) {}

    // 2. Per-device hardware fingerprinting storage
    let fingerprint: DeviceAudioFingerprint | null = null;
    try {
      const sampleRate = audioCtx?.sampleRate || 44100;
      fingerprint = await getAudioDeviceFingerprint(sampleRate);
      if (fingerprint?.hash) {
        localStorage.setItem(`groovelab_latency_dev_${fingerprint.hash}`, clamped.toString());
      }
    } catch (_) {}

    // 3. Cloud Synchronization to Supabase (Student Profile)
    if (studentId) {
      try {
        await supabase
          .from('students')
          .update({
            device_calibration: {
              device_hash: fingerprint?.hash || 'default',
              device_name: fingerprint?.name || 'Standard Audio-Gerät',
              latency_ms: clamped,
              calibrated_at: new Date().toISOString()
            }
          })
          .eq('id', studentId);
      } catch (err) {
        console.warn('[UniversalLatencyEngine] Supabase device calibration sync error:', err);
      }
    }

    // 4. Realtime Reactive Event Broadcast across all modules and tabs
    try {
      window.dispatchEvent(new CustomEvent(LATENCY_UPDATED_EVENT, {
        detail: {
          latencyMs: clamped,
          latencySec: clamped / 1000.0,
          fingerprint: fingerprint?.hash || 'default',
          deviceName: fingerprint?.name || 'Audio-Gerät'
        }
      }));
    } catch (_) {}
  }

  /**
   * Subscribes to cross-module latency changes with auto-cleanup.
   */
  public static subscribe(callback: (latencyMs: number) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handler = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ latencyMs: number }>;
      if (customEvt.detail && typeof customEvt.detail.latencyMs === 'number') {
        this.cachedLatencyMs = customEvt.detail.latencyMs;
        callback(customEvt.detail.latencyMs);
      }
    };

    window.addEventListener(LATENCY_UPDATED_EVENT, handler);
    return () => {
      window.removeEventListener(LATENCY_UPDATED_EVENT, handler);
    };
  }

  /**
   * Internal hardware device change listener:
   * Invalidates memory cache when external headphones or AirPods are connected/disconnected.
   */
  private static attachDeviceChangeListener(): void {
    if (this.isDeviceChangeListenerAttached || typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return;
    }

    this.isDeviceChangeListenerAttached = true;
    try {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        // Clear cached value so next query re-evaluates device heuristics
        this.cachedLatencyMs = null;
        try {
          window.dispatchEvent(new CustomEvent('campus_audio_device_changed', {}));
        } catch (_) {}
      });
    } catch (_) {}
  }
}

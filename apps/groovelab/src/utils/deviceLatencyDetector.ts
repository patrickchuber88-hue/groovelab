/**
 * 🎧 Zero-Touch Device Latency Detector for Web Audio API & Rhythm Games
 * 
 * Erkennt vollautomatisch das Endgerät (macOS, iOS, Android, Windows) und
 * kompensiert Audio-Hardware- und Bluetooth-Latenzen ohne manuelle Kalibrierung.
 */

export interface DeviceLatencyInfo {
  detectedPlatform: 'macos' | 'ios' | 'android' | 'windows' | 'other';
  isBluetoothSuspected: boolean;
  baselineLatencyMs: number;
  description: string;
}

export function detectDeviceLatencyInfo(audioCtx?: AudioContext | null): DeviceLatencyInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      detectedPlatform: 'other',
      isBluetoothSuspected: false,
      baselineLatencyMs: 80,
      description: 'Standard-Latenz (80ms)'
    };
  }

  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua));
  const isMac = !isIOS && /Macintosh|Mac OS X/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isWindows = /Windows/i.test(ua);

  let platform: 'macos' | 'ios' | 'android' | 'windows' | 'other' = 'other';
  let baseMs = 80;

  if (isMac) {
    platform = 'macos';
    baseMs = 70; // CoreAudio Buffer + Keyboard/Trackpad Polling
  } else if (isIOS) {
    platform = 'ios';
    baseMs = 60; // iOS Low-Latency Audio Stack + Touchscreen
  } else if (isAndroid) {
    platform = 'android';
    baseMs = 105; // Android Audio HAL + Touch Digitizer
  } else if (isWindows) {
    platform = 'windows';
    baseMs = 95; // WASAPI Shared Buffer + USB Input
  }

  // 🎧 Bluetooth & External DAC Latenz-Detektor via Web Audio API
  let isBluetooth = false;
  if (audioCtx) {
    try {
      const outputLat = (audioCtx as any).outputLatency || 0;
      const baseLat = audioCtx.baseLatency || 0;
      
      // Wenn der Output-Puffer > 75ms ist, handelt es sich mit hoher Wahrscheinlichkeit um Bluetooth (z. B. AirPods)
      if (outputLat > 0.075 || baseLat > 0.04) {
        isBluetooth = true;
        baseMs += 110; // Typischer Bluetooth A2DP / AAC Hardware-Puffer
      }
    } catch (_) {}
  }

  return {
    detectedPlatform: platform,
    isBluetoothSuspected: isBluetooth,
    baselineLatencyMs: Math.max(30, Math.min(260, baseMs)),
    description: isBluetooth 
      ? `${platform.toUpperCase()} + Bluetooth Audio (+110ms)` 
      : `${platform.toUpperCase()} Lautsprecher (${baseMs}ms)`
  };
}

export function getOptimalDeviceLatency(audioCtx?: AudioContext | null): number {
  return detectDeviceLatencyInfo(audioCtx).baselineLatencyMs;
}

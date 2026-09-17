/**
 * Campus-Groovelab Network Awareness & Adaptive Audio Service
 * 
 * 1% Goldstandard for Mobile & Constrained Networks:
 * - Network Information API with Chromium/Android & fallback support
 * - iOS Safari Heuristic Latency/Throughput Estimation
 * - Dynamic Bitrate Governance: 320 kbps (WLAN) / 128 kbps (4G/5G) / 64 kbps (2G/3G/Saver)
 * - Deferred Heavy Media Upload Policy (Zero-Data-Waste Axiom)
 * - Reusable Reactive Subscription Pattern
 */

export type NetworkTier = 'wifi_unmetered' | 'cellular_fast' | 'cellular_constrained' | 'offline';
export type DataSaverPreference = 'auto' | 'always_saver' | 'never_saver';

export interface NetworkProfile {
  tier: NetworkTier;
  isOnline: boolean;
  isCellular: boolean;
  isMetered: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  targetAudioBitrate: number; // in bits per second (bps)
  shouldAutoUploadMedia: boolean;
  maxStreamPrebufferSec: number;
  downlinkMbps?: number;
  rttMs?: number;
  estimatedProfileReason: string;
}

const STORAGE_PREF_KEY = 'groovelab_mobile_data_saver_pref';

class NetworkAwarenessManager {
  private static instance: NetworkAwarenessManager | null = null;
  private listeners: Set<(profile: NetworkProfile) => void> = new Set();
  private lastMeasuredRttMs: number | null = null;
  private lastMeasuredKbps: number | null = null;
  private currentProfile: NetworkProfile;

  private constructor() {
    this.currentProfile = this.calculateProfile();
    this.attachEventListeners();
  }

  public static getInstance(): NetworkAwarenessManager {
    if (!NetworkAwarenessManager.instance) {
      NetworkAwarenessManager.instance = new NetworkAwarenessManager();
    }
    return NetworkAwarenessManager.instance;
  }

  private attachEventListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => this.reevaluate());
    window.addEventListener('offline', () => this.reevaluate());

    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (conn && typeof conn.addEventListener === 'function') {
      conn.addEventListener('change', () => this.reevaluate());
    }
  }

  public getDataSaverPreference(): DataSaverPreference {
    if (typeof localStorage === 'undefined') return 'auto';
    const saved = localStorage.getItem(STORAGE_PREF_KEY);
    if (saved === 'always_saver' || saved === 'never_saver' || saved === 'auto') {
      return saved;
    }
    return 'auto';
  }

  public setDataSaverPreference(pref: DataSaverPreference): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_PREF_KEY, pref);
    }
    this.reevaluate();
  }

  /**
   * Records a latency/bandwidth sample from actual fetch operations (e.g. SpotifyGradeStreamController or Supabase ping)
   * to classify network quality on iOS Safari where Network Information API is omitted by WebKit.
   */
  public recordSample(latencyMs: number, bytesTransferred?: number, durationMs?: number): void {
    this.lastMeasuredRttMs = latencyMs;
    if (bytesTransferred && durationMs && durationMs > 0) {
      const kbps = (bytesTransferred * 8) / durationMs;
      this.lastMeasuredKbps = kbps;
    }
    this.reevaluate();
  }

  private calculateProfile(): NetworkProfile {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      return {
        tier: 'offline',
        isOnline: false,
        isCellular: false,
        isMetered: false,
        effectiveType: 'unknown',
        targetAudioBitrate: 0,
        shouldAutoUploadMedia: false,
        maxStreamPrebufferSec: 0,
        estimatedProfileReason: 'Gerät ist offline (keine Verbindung)'
      };
    }

    const pref = this.getDataSaverPreference();
    if (pref === 'always_saver') {
      return {
        tier: 'cellular_constrained',
        isOnline: true,
        isCellular: true,
        isMetered: true,
        effectiveType: '3g',
        targetAudioBitrate: 64000, // 64 kbps Opus
        shouldAutoUploadMedia: false,
        maxStreamPrebufferSec: 10,
        estimatedProfileReason: 'Datensparmodus manuell forciert (Always Saver)'
      };
    }

    const nav = navigator as any;
    const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
    const osSaveData = conn?.saveData === true;
    const effectiveType = conn?.effectiveType || 'unknown';
    const connType = conn?.type;
    const downlink = conn?.downlink;
    const rtt = conn?.rtt || this.lastMeasuredRttMs || undefined;

    const isCellular = connType === 'cellular' || ['2g', '3g', '4g'].includes(effectiveType);

    // 1. Constrained mobile network or OS SaveData active
    if (
      osSaveData ||
      effectiveType === 'slow-2g' ||
      effectiveType === '2g' ||
      effectiveType === '3g' ||
      (this.lastMeasuredRttMs && this.lastMeasuredRttMs > 750) ||
      (this.lastMeasuredKbps && this.lastMeasuredKbps < 350)
    ) {
      return {
        tier: 'cellular_constrained',
        isOnline: true,
        isCellular: true,
        isMetered: true,
        effectiveType: (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') ? effectiveType : '3g',
        targetAudioBitrate: 80000, // 80 kbps Opus (Dynamic voice/instrument balanced)
        shouldAutoUploadMedia: false, // Deferred Sync
        maxStreamPrebufferSec: 10,
        downlinkMbps: downlink,
        rttMs: rtt,
        estimatedProfileReason: osSaveData ? 'Betriebssystem-Datensparer aktiv' : 'Schwaches mobiles Netz (2G/3G/Hohe Latenz)'
      };
    }

    // 2. High-speed Cellular (4G / 5G / LTE)
    if (isCellular && pref !== 'never_saver') {
      return {
        tier: 'cellular_fast',
        isOnline: true,
        isCellular: true,
        isMetered: true,
        effectiveType: '4g',
        targetAudioBitrate: 128000, // 128 kbps Opus (Golden Standard: 60% Bandwidth saving, acoustic transparency)
        shouldAutoUploadMedia: false, // Default to waiting for WiFi unless overridden or preference changed
        maxStreamPrebufferSec: 15,
        downlinkMbps: downlink,
        rttMs: rtt,
        estimatedProfileReason: 'Mobiles Datennetz (4G/5G) - Smart-Audio aktiv'
      };
    }

    // 3. High-Speed WiFi / Unmetered or 'never_saver' explicitly set
    return {
      tier: 'wifi_unmetered',
      isOnline: true,
      isCellular: false,
      isMetered: false,
      effectiveType: '4g',
      targetAudioBitrate: 320000, // 320 kbps Studio Quality
      shouldAutoUploadMedia: true, // Immediate background upload
      maxStreamPrebufferSec: 60,
      downlinkMbps: downlink,
      rttMs: rtt,
      estimatedProfileReason: pref === 'never_saver' ? 'Datensparen deaktiviert (Studio-Modus)' : 'WLAN / Breitband unlimitiert'
    };
  }

  public reevaluate(): void {
    const next = this.calculateProfile();
    const changed = 
      next.tier !== this.currentProfile.tier ||
      next.targetAudioBitrate !== this.currentProfile.targetAudioBitrate ||
      next.shouldAutoUploadMedia !== this.currentProfile.shouldAutoUploadMedia ||
      next.isOnline !== this.currentProfile.isOnline;

    this.currentProfile = next;
    if (changed) {
      this.notify();
    }
  }

  private notify(): void {
    const prof = this.getProfile();
    this.listeners.forEach(cb => {
      try {
        cb(prof);
      } catch (err) {
        console.warn('[NetworkAwareness] Listener exception:', err);
      }
    });
  }

  public getProfile(): NetworkProfile {
    return { ...this.currentProfile };
  }

  public subscribe(cb: (profile: NetworkProfile) => void): () => void {
    this.listeners.add(cb);
    cb(this.getProfile());
    return () => {
      this.listeners.delete(cb);
    };
  }
}

export const getEffectiveNetworkProfile = (): NetworkProfile => {
  return NetworkAwarenessManager.getInstance().getProfile();
};

export const subscribeNetworkProfile = (cb: (profile: NetworkProfile) => void): (() => void) => {
  return NetworkAwarenessManager.getInstance().subscribe(cb);
};

export const setDataSaverPreference = (pref: DataSaverPreference): void => {
  NetworkAwarenessManager.getInstance().setDataSaverPreference(pref);
};

export const getDataSaverPreference = (): DataSaverPreference => {
  return NetworkAwarenessManager.getInstance().getDataSaverPreference();
};

export const recordNetworkSample = (latencyMs: number, bytesTransferred?: number, durationMs?: number): void => {
  NetworkAwarenessManager.getInstance().recordSample(latencyMs, bytesTransferred, durationMs);
};

/**
 * Human-readable byte formatter for 1% UI transparency
 */
export function formatByteSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  const mb = (bytes / (1024 * 1024)).toFixed(1).replace('.', ',');
  return `${mb} MB`;
}

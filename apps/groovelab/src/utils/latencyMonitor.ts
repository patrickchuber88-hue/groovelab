/**
 * Database Ping & Network Quality Monitor
 * Measures latency to Supabase PostgreSQL cluster in Germany
 */
import { supabase } from '../lib/supabase';

export interface LatencyMetric {
  rttMs: number;
  quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'OFFLINE';
  timestamp: number;
}

const latencyListeners = new Set<(metric: LatencyMetric) => void>();
let latestMetric: LatencyMetric = {
  rttMs: 0,
  quality: 'GOOD',
  timestamp: Date.now()
};

export const subscribeLatency = (cb: (metric: LatencyMetric) => void): (() => void) => {
  latencyListeners.add(cb);
  cb(latestMetric);
  return () => latencyListeners.delete(cb);
};

export const measureDatabasePing = async (): Promise<LatencyMetric> => {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    latestMetric = { rttMs: 0, quality: 'OFFLINE', timestamp: Date.now() };
    latencyListeners.forEach(cb => cb(latestMetric));
    return latestMetric;
  }

  const start = performance.now();
  try {
    // Ultra-lightweight head query to check round-trip time
    await supabase.from('schools').select('id', { count: 'exact', head: true }).limit(1);
    const rtt = Math.round(performance.now() - start);

    let quality: LatencyMetric['quality'] = 'EXCELLENT';
    if (rtt > 800) quality = 'POOR';
    else if (rtt > 400) quality = 'FAIR';
    else if (rtt > 120) quality = 'GOOD';

    latestMetric = { rttMs: rtt, quality, timestamp: Date.now() };
  } catch (e) {
    latestMetric = { rttMs: 999, quality: 'POOR', timestamp: Date.now() };
  }

  latencyListeners.forEach(cb => cb(latestMetric));
  return latestMetric;
};

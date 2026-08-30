/**
 * Campus-Groovelab Tier-1 High-Performance Audio Processing Web Worker
 * Offloads heavy audio DSP calculations from the main UI thread to guarantee 120 FPS.
 */

// Worker message interface
export interface AudioWorkerMessage {
  type: 'NORMALIZE' | 'DETECT_PITCH' | 'EXTRACT_PEAKS';
  payload: {
    audioData: Float32Array;
    sampleRate?: number;
    targetPeak?: number;
    numPeaks?: number;
  };
}

export interface AudioWorkerResponse {
  type: 'NORMALIZE_COMPLETE' | 'DETECT_PITCH_COMPLETE' | 'EXTRACT_PEAKS_COMPLETE' | 'ERROR';
  result?: any;
  error?: string;
}

// Self listener in Web Worker context
self.onmessage = (event: MessageEvent<AudioWorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'NORMALIZE': {
        const { audioData, targetPeak = 0.95 } = payload;
        let maxPeak = 0;
        for (let i = 0; i < audioData.length; i++) {
          const abs = Math.abs(audioData[i]);
          if (abs > maxPeak) maxPeak = abs;
        }

        const normalized = new Float32Array(audioData.length);
        const gain = maxPeak > 0 ? targetPeak / maxPeak : 1.0;
        for (let i = 0; i < audioData.length; i++) {
          normalized[i] = audioData[i] * gain;
        }

        (self as any).postMessage({
          type: 'NORMALIZE_COMPLETE',
          result: { normalizedBuffer: normalized, gain, previousPeak: maxPeak }
        }, [normalized.buffer]);
        break;
      }

      case 'EXTRACT_PEAKS': {
        const { audioData, numPeaks = 200 } = payload;
        const step = Math.floor(audioData.length / numPeaks);
        const peaks = new Float32Array(numPeaks);

        for (let i = 0; i < numPeaks; i++) {
          let maxVal = 0;
          const start = i * step;
          const end = Math.min(start + step, audioData.length);
          for (let j = start; j < end; j++) {
            const val = Math.abs(audioData[j]);
            if (val > maxVal) maxVal = val;
          }
          peaks[i] = maxVal;
        }

        self.postMessage({
          type: 'EXTRACT_PEAKS_COMPLETE',
          result: { peaks: Array.from(peaks) }
        });
        break;
      }

      case 'DETECT_PITCH': {
        const { audioData, sampleRate = 44100 } = payload;
        // Autocorrelation pitch detector
        const SIZE = audioData.length;
        let r1 = 0, r2 = SIZE - 1, threshold = 0.2;
        
        for (let i = 0; i < SIZE / 2; i++) {
          if (Math.abs(audioData[i]) < threshold) { r1 = i; break; }
        }
        for (let i = 1; i < SIZE / 2; i++) {
          if (Math.abs(audioData[SIZE - i]) < threshold) { r2 = SIZE - i; break; }
        }

        const trimmed = audioData.slice(r1, r2);
        const c = new Float32Array(trimmed.length).fill(0);
        for (let i = 0; i < trimmed.length; i++) {
          for (let j = 0; j < trimmed.length - i; j++) {
            c[i] = c[i] + trimmed[j] * trimmed[j + i];
          }
        }

        let d = 0; while (c[d] > c[d + 1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < trimmed.length; i++) {
          if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
          }
        }

        let pitch = -1;
        if (maxpos > 0) {
          pitch = sampleRate / maxpos;
        }

        self.postMessage({
          type: 'DETECT_PITCH_COMPLETE',
          result: { pitch: pitch > 30 && pitch < 4000 ? Math.round(pitch * 10) / 10 : null }
        });
        break;
      }

      default:
        self.postMessage({ type: 'ERROR', error: `Unknown message type: ${type}` });
    }
  } catch (err: any) {
    self.postMessage({ type: 'ERROR', error: err?.message || String(err) });
  }
};

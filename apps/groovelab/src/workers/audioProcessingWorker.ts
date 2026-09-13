/**
 * Campus-Groovelab Tier-1 High-Performance Audio Processing Web Worker
 * Offloads heavy audio DSP calculations from the main UI thread to guarantee 120 FPS.
 */

// Worker message interface
export interface AudioWorkerMessage {
  type: 'NORMALIZE' | 'DETECT_PITCH' | 'EXTRACT_PEAKS' | 'CALCULATE_LUFS';
  payload: {
    audioData?: Float32Array;
    channelL?: Float32Array;
    channelR?: Float32Array;
    sampleRate?: number;
    targetPeak?: number;
    numPeaks?: number;
  };
}

export interface AudioWorkerResponse {
  type: 'NORMALIZE_COMPLETE' | 'DETECT_PITCH_COMPLETE' | 'EXTRACT_PEAKS_COMPLETE' | 'CALCULATE_LUFS_COMPLETE' | 'ERROR';
  result?: any;
  error?: string;
}

// Self listener in Web Worker context
self.onmessage = (event: MessageEvent<AudioWorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'NORMALIZE': {
        const audioData = payload.audioData || payload.channelL;
        if (!audioData) throw new Error('No audio data provided for normalization');
        const targetPeak = payload.targetPeak ?? 0.95;
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

      case 'CALCULATE_LUFS': {
        const sampleRate = payload.sampleRate || 48000;
        const channels: Float32Array[] = [];
        if (payload.channelL) channels.push(payload.channelL);
        if (payload.channelR) channels.push(payload.channelR);
        if (channels.length === 0 && payload.audioData) channels.push(payload.audioData);

        if (channels.length === 0 || channels[0].length === 0) {
          self.postMessage({ type: 'CALCULATE_LUFS_COMPLETE', result: { lufs: -70 } });
          break;
        }

        const length = channels[0].length;

        // Stage 1: High-Shelf Pre-Filter Coefficients (ITU-R BS.1770-4)
        const dbGain = 3.999843853973347;
        const f0 = 1681.974450955533;
        const Q = 0.7071752369554196;
        const K = Math.tan((Math.PI * f0) / sampleRate);
        const Vh = Math.pow(10, dbGain / 20);
        const Vb = Math.pow(Vh, 0.4996667741545416);

        const a0_1 = 1 + K / Q + K * K;
        const b0_1 = (Vh + Vb * (K / Q) + K * K) / a0_1;
        const b1_1 = (2 * (K * K - Vh)) / a0_1;
        const b2_1 = (Vh - Vb * (K / Q) + K * K) / a0_1;
        const a1_1 = (2 * (K * K - 1)) / a0_1;
        const a2_1 = (1 - K / Q + K * K) / a0_1;

        // Stage 2: RLB High-Pass Filter Coefficients (~38 Hz)
        const f0_hp = 38.13547087602444;
        const Q_hp = 0.5003270373238773;
        const K_hp = Math.tan((Math.PI * f0_hp) / sampleRate);

        const a0_2 = 1 + K_hp / Q_hp + K_hp * K_hp;
        const b0_2 = 1 / a0_2;
        const b1_2 = -2 / a0_2;
        const b2_2 = 1 / a0_2;
        const a1_2 = (2 * (K_hp * K_hp - 1)) / a0_2;
        const a2_2 = (1 - K_hp / Q_hp + K_hp * K_hp) / a0_2;

        let totalWeightedSum = 0;
        for (let c = 0; c < channels.length; c++) {
          const channelData = channels[c];
          let y1_1 = 0, y2_1 = 0, x1_1 = 0, x2_1 = 0;
          let y1_2 = 0, y2_2 = 0, x1_2 = 0, x2_2 = 0;
          let channelEnergy = 0;

          for (let i = 0; i < length; i++) {
            const x = channelData[i];
            const y_stage1 = b0_1 * x + b1_1 * x1_1 + b2_1 * x2_1 - a1_1 * y1_1 - a2_1 * y2_1;
            x2_1 = x1_1; x1_1 = x;
            y2_1 = y1_1; y1_1 = y_stage1;

            const y_stage2 = b0_2 * y_stage1 + b1_2 * x1_2 + b2_2 * x2_2 - a1_2 * y1_2 - a2_2 * y2_2;
            x2_2 = x1_2; x1_2 = y_stage1;
            y2_2 = y1_2; y1_2 = y_stage2;

            channelEnergy += y_stage2 * y_stage2;
          }

          totalWeightedSum += (channelEnergy / Math.max(1, length));
        }

        const lufs = totalWeightedSum <= 1e-12 ? -70 : -0.691 + 10 * Math.log10(totalWeightedSum);
        self.postMessage({
          type: 'CALCULATE_LUFS_COMPLETE',
          result: { lufs: Math.round(lufs * 10) / 10 }
        });
        break;
      }

      case 'EXTRACT_PEAKS': {
        const audioData = payload.audioData || payload.channelL;
        if (!audioData) throw new Error('No audio data provided');
        const numPeaks = payload.numPeaks || 200;
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
        const audioData = payload.audioData || payload.channelL;
        if (!audioData) throw new Error('No audio data provided');
        const sampleRate = payload.sampleRate || 44100;
        const SIZE = audioData.length;
        const threshold = 0.2;
        let r1 = 0;
        let r2 = SIZE - 1;
        
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

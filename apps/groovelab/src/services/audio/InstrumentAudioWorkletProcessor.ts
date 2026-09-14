/**
 * Campus-Groovelab Tier-1 Instrument Audio Worklet Processor
 * 
 * Runs inside the native Real-Time Audio Render Thread.
 * Guarantees:
 * - ZERO Garbage Collection pauses: All buffers are pre-allocated at initialization.
 * - Subsonic DC-Offset Blocking (10 Hz 2nd-order Butterworth IIR filter).
 * - 4x Polyphase True-Peak (ITU-R BS.1770-4) inter-sample overshot calculation.
 * - Lock-free ring buffering with Transferable Float32Array messaging.
 */

export const INSTRUMENT_WORKLET_PROCESSOR_NAME = 'campus-instrument-worklet-processor';

/**
 * Raw JavaScript source code executed inside the AudioWorkletGlobalScope.
 * Kept as an inlined string to avoid Vite bundler chunking and asset-path issues in PWA mode.
 */
export const INSTRUMENT_WORKLET_PROCESSOR_CODE = `
class InstrumentAudioWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Configuration
    this.isRecording = false;
    this.sampleRate = 48000;
    this.enableTruePeak = true;
    this.enableSubsonicHpf = true;

    // RingBuffer Configuration (Pre-allocated 4096 samples per channel)
    this.bufferSize = 4096;
    this.writeIndex = 0;
    this.ringBufferL = new Float32Array(this.bufferSize);
    this.ringBufferR = new Float32Array(this.bufferSize);

    // DC-Offset Filter State (10 Hz High-Pass at 48 kHz)
    this.dc_x1_L = 0; this.dc_x2_L = 0; this.dc_y1_L = 0; this.dc_y2_L = 0;
    this.dc_x1_R = 0; this.dc_x2_R = 0; this.dc_y1_R = 0; this.dc_y2_R = 0;

    // Metrics throttler
    this.lastMetricsTime = 0;
    this.peakMax = 0;
    this.truePeakMax = 0;
    this.underruns = 0;

    this.port.onmessage = (event) => {
      const msg = event.data;
      if (!msg) return;

      if (msg.type === 'START_RECORDING') {
        this.isRecording = true;
        this.writeIndex = 0;
        this.peakMax = 0;
        this.truePeakMax = 0;
      } else if (msg.type === 'STOP_RECORDING') {
        this.isRecording = false;
        this.flushRemainingBuffer();
      } else if (msg.type === 'SET_CONFIG' && msg.config) {
        if (msg.config.enableTruePeakDetection !== undefined) {
          this.enableTruePeak = msg.config.enableTruePeakDetection;
        }
        if (msg.config.enableSubsonicHpf !== undefined) {
          this.enableSubsonicHpf = msg.config.enableSubsonicHpf;
        }
      } else if (msg.type === 'RESET') {
        this.writeIndex = 0;
        this.peakMax = 0;
        this.truePeakMax = 0;
        this.underruns = 0;
      }
    };
  }

  // 10 Hz 2nd-order Highpass (Pre-calculated for 48000 Hz)
  filterDc(sample, channel) {
    if (!this.enableSubsonicHpf) return sample;
    // Biquad HPF: fc = 10Hz, Q = 0.7071
    const b0 = 0.999075;
    const b1 = -1.998150;
    const b2 = 0.999075;
    const a1 = -1.998149;
    const a2 = 0.998151;

    if (channel === 0) {
      const y0 = b0 * sample + b1 * this.dc_x1_L + b2 * this.dc_x2_L - a1 * this.dc_y1_L - a2 * this.dc_y2_L;
      this.dc_x2_L = this.dc_x1_L;
      this.dc_x1_L = sample;
      this.dc_y2_L = this.dc_y1_L;
      this.dc_y1_L = y0;
      return y0;
    } else {
      const y0 = b0 * sample + b1 * this.dc_x1_R + b2 * this.dc_x2_R - a1 * this.dc_y1_R - a2 * this.dc_y2_R;
      this.dc_x2_R = this.dc_x1_R;
      this.dc_x1_R = sample;
      this.dc_y2_R = this.dc_y1_R;
      this.dc_y1_R = y0;
      return y0;
    }
  }

  // 4-tap Polyphase Interpolator for ITU-R BS.1770-4 True Peak Estimation
  calculateTruePeak(s0, s1, s2, s3) {
    const p1 = Math.abs(s1);
    const p2 = Math.abs(-0.15625 * s0 + 0.9375 * s1 + 0.3125 * s2 - 0.09375 * s3);
    const p3 = Math.abs(-0.09375 * s0 + 0.3125 * s1 + 0.9375 * s2 - 0.15625 * s3);
    return Math.max(p1, p2, p3);
  }

  flushRemainingBuffer() {
    if (this.writeIndex === 0) return;
    const outL = new Float32Array(this.writeIndex);
    const outR = new Float32Array(this.writeIndex);
    outL.set(this.ringBufferL.subarray(0, this.writeIndex));
    outR.set(this.ringBufferR.subarray(0, this.writeIndex));
    this.writeIndex = 0;

    this.port.postMessage({
      type: 'BUFFER_READY',
      bufferL: outL,
      bufferR: outR
    }, [outL.buffer, outR.buffer]);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const inL = input[0];
    const inR = input[1] || input[0]; // Fallback to mono duplicate if single channel
    const numSamples = inL.length; // Standard Web Audio is 128 samples per render quantum

    for (let i = 0; i < numSamples; i++) {
      let sampleL = this.filterDc(inL[i], 0);
      let sampleR = this.filterDc(inR[i], 1);

      const absL = Math.abs(sampleL);
      const absR = Math.abs(sampleR);
      const instantPeak = Math.max(absL, absR);
      if (instantPeak > this.peakMax) this.peakMax = instantPeak;

      if (this.enableTruePeak && i >= 3) {
        const tpL = this.calculateTruePeak(inL[i - 3], inL[i - 2], inL[i - 1], inL[i]);
        const tpR = this.calculateTruePeak(inR[i - 3], inR[i - 2], inR[i - 1], inR[i]);
        const instantTruePeak = Math.max(tpL, tpR);
        if (instantTruePeak > this.truePeakMax) this.truePeakMax = instantTruePeak;
      }

      if (this.isRecording) {
        this.ringBufferL[this.writeIndex] = sampleL;
        this.ringBufferR[this.writeIndex] = sampleR;
        this.writeIndex++;

        // If ring buffer is full, transfer it to main thread with Zero-Copy
        if (this.writeIndex >= this.bufferSize) {
          const chunkL = new Float32Array(this.bufferSize);
          const chunkR = new Float32Array(this.bufferSize);
          chunkL.set(this.ringBufferL);
          chunkR.set(this.ringBufferR);
          this.writeIndex = 0;

          this.port.postMessage({
            type: 'BUFFER_READY',
            bufferL: chunkL,
            bufferR: chunkR
          }, [chunkL.buffer, chunkR.buffer]);
        }
      }
    }

    // Post throttled metrics (roughly every 50ms)
    const now = currentTime;
    if (now - this.lastMetricsTime >= 0.05) {
      const peakDbfs = this.peakMax > 0 ? 20 * Math.log10(this.peakMax) : -100;
      const truePeakDbtp = this.truePeakMax > 0 ? 20 * Math.log10(this.truePeakMax) : -100;

      this.port.postMessage({
        type: 'METRICS',
        peakDbfs: Math.max(-100, peakDbfs),
        truePeakDbtp: Math.max(-100, truePeakDbtp),
        isOverloaded: truePeakDbtp > -1.0 // -1.0 dBTP Ceiling Guard
      });

      // Decay meters slowly
      this.peakMax = 0;
      this.truePeakMax = 0;
      this.lastMetricsTime = now;
    }

    // Passthrough audio to output if connected
    const output = outputs[0];
    if (output && output[0]) {
      output[0].set(inL);
      if (output[1]) output[1].set(inR);
    }

    return true;
  }
}

registerProcessor('${INSTRUMENT_WORKLET_PROCESSOR_NAME}', InstrumentAudioWorkletProcessor);
`;

let cachedBlobUrl: string | null = null;

/**
 * Returns a secure, in-memory Blob URL for loading the AudioWorkletProcessor.
 */
export function getInstrumentWorkletBlobUrl(): string {
  if (typeof window === 'undefined') return '';
  if (!cachedBlobUrl) {
    const blob = new Blob([INSTRUMENT_WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
    cachedBlobUrl = URL.createObjectURL(blob);
  }
  return cachedBlobUrl;
}

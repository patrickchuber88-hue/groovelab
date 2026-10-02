/**
 * Campus-Groovelab 0,1% Goldstandard Audio Engine
 * YinAudioWorkletEngine.ts
 * 
 * High-performance, verified AudioWorklet engine for real-time chromatic tuning,
 * intonation analysis, and pitch detection.
 * 
 * Architectural Guarantees:
 * 1. ZERO Audio-Thread Choking: AudioWorkletProcessor process() executes exclusively
 *    lock-free ringbuffer memory copies (< 0.01 ms).
 * 2. Blob URL Worklet Bundling: In-memory JavaScript Blob URL prevents SyntaxErrors
 *    in AudioWorkletGlobalScope (no raw TypeScript or Vite ?url asset bugs).
 * 3. Dual-Path SharedArrayBuffer: Automatic feature detection (crossOriginIsolated)
 *    with a seamless MessagePort transfer fallback for iPad Safari / WebViews.
 * 4. Acoustic Physics: Dynamic buffer scaling (N=4096 @ 48kHz, N=8192 @ 96kHz)
 *    guarantees f_min <= 23.45 Hz, accurately detecting 5-string Bass (B0 = 30.87 Hz)
 *    and Cello (C2 = 65.41 Hz) without octave-jump hacks.
 * 5. Numerical Hardening: Epsilon guard (Math.abs(denom) > 1e-6) prevents NaN/Infinity
 *    during parabolic interpolation, with an RMS squelch gate against room noise.
 * 6. WebKit Pull-Model Immunity: AudioWorkletNode connects through a zero-gain node
 *    to audioContext.destination, ensuring the audio graph is continuously pulled
 *    on iOS Safari while preventing classroom audio feedback loops.
 */

import { getYinWorkletBlobUrl, YIN_WORKLET_PROCESSOR_NAME } from './YinWorkletProcessor';

/**
 * Robust detection of SharedArrayBuffer and crossOriginIsolated availability.
 */
export function isSharedArrayBufferSupported(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const hasSAB = typeof SharedArrayBuffer !== 'undefined';
    const isIsolated = Boolean(window.crossOriginIsolated || (self as any).crossOriginIsolated);
    if (!hasSAB || !isIsolated) return false;
    const testBuf = new SharedArrayBuffer(16);
    return testBuf.byteLength === 16;
  } catch {
    return false;
  }
}

export class YinAudioWorkletEngine {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private mediaSource: MediaStreamAudioSourceNode | null = null;
  private biquadFilter: BiquadFilterNode | null = null;
  private silentGain: GainNode | null = null;

  // Shared Memory Architecture
  private isSharedMemory: boolean = false;
  private sharedRingBuffer: SharedArrayBuffer | null = null;
  private sharedStateBuffer: SharedArrayBuffer | null = null;
  private ringBufferView: Float32Array | null = null;
  private stateBufferView: Int32Array | null = null;

  // Local Fallback State (MessagePort)
  private localWriteIndex: number = 0;

  // Buffer & Math Dimensions
  private analysisBufferSize: number = 4096;
  private ringBufferSize: number = 8192;
  private ringBufferMask: number = 8191;

  // Pre-allocated Zero-GC Analysis Buffers
  private yinBuffer: Float32Array = new Float32Array(2048);
  private analysisFrame: Float32Array = new Float32Array(4096);

  // Throttled Pitch Cache
  private lastAnalysisTime: number = 0;
  private readonly minIntervalMs: number = 20; // 50 updates/sec maximum
  private cachedPitch: number = -1;

  private isInitialized: boolean = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({
        latencyHint: 'interactive'
      });

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Dynamic buffer sizing: N=4096 for fs <= 48kHz, N=8192 for fs > 48kHz
      const sampleRate = this.audioContext.sampleRate || 48000;
      this.analysisBufferSize = sampleRate > 48000 ? 8192 : 4096;
      this.ringBufferSize = this.analysisBufferSize * 2;
      this.ringBufferMask = this.ringBufferSize - 1;

      // Re-allocate analysis buffers to match sample rate
      this.yinBuffer = new Float32Array(Math.floor(this.analysisBufferSize / 2));
      this.analysisFrame = new Float32Array(this.analysisBufferSize);

      // Load Worklet from memory via Blob URL
      const workletBlobUrl = getYinWorkletBlobUrl();
      await this.audioContext.audioWorklet.addModule(workletBlobUrl);

      // WebKit / iOS Pull Architecture:
      // Configure 1 output and route to a muted GainNode (gain = 0) connected to destination.
      // This forces the WebKit audio render thread to pull audio samples without any speaker acoustic feedback.
      this.workletNode = new AudioWorkletNode(this.audioContext, YIN_WORKLET_PROCESSOR_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1
      });

      this.silentGain = this.audioContext.createGain();
      this.silentGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.workletNode.connect(this.silentGain);
      this.silentGain.connect(this.audioContext.destination);

      this.isSharedMemory = isSharedArrayBufferSupported();

      if (this.isSharedMemory) {
        try {
          this.sharedRingBuffer = new SharedArrayBuffer(this.ringBufferSize * 4);
          this.sharedStateBuffer = new SharedArrayBuffer(16 * 4);
          this.ringBufferView = new Float32Array(this.sharedRingBuffer);
          this.stateBufferView = new Int32Array(this.sharedStateBuffer);

          await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error('SharedArrayBuffer worklet handshake timeout'));
            }, 1000);

            this.workletNode!.port.onmessage = (event) => {
              const data = event.data;
              if (data?.type === 'READY') {
                clearTimeout(timeoutId);
                resolve();
              } else if (data?.type === 'ERROR') {
                clearTimeout(timeoutId);
                reject(new Error(data.error || 'Worklet shared buffer init rejected'));
              }
            };

            this.workletNode!.port.postMessage({
              type: 'INIT_SHARED_BUFFERS',
              ringBuffer: this.sharedRingBuffer,
              stateBuffer: this.sharedStateBuffer,
              bufferSize: this.ringBufferSize
            });
          });
        } catch (sharedErr) {
          // Seamless failover to MessagePort if SAB is rejected or throws (e.g. DataCloneError in WebKit)
          console.warn('[YinAudioWorkletEngine] SharedArrayBuffer handshake failed, falling back to MessagePort:', sharedErr);
          this.isSharedMemory = false;
          this.sharedRingBuffer = null;
          this.sharedStateBuffer = null;
          this.ringBufferView = null;
          this.stateBufferView = null;
        }
      }

      if (!this.isSharedMemory) {
        // Fallback Path: Standard Float32Array with MessagePort transferable chunks
        this.ringBufferView = new Float32Array(this.ringBufferSize);
        this.localWriteIndex = 0;

        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('MessagePort worklet handshake timeout'));
          }, 1500);

          this.workletNode!.port.onmessage = (event) => {
            const data = event.data;
            if (!data) return;

            if (data.type === 'READY') {
              clearTimeout(timeoutId);
              resolve();
            } else if (data.type === 'AUDIO_CHUNK' && data.chunk) {
              if (!this.ringBufferView) return;
              const chunk: Float32Array = data.chunk;
              const mask = this.ringBufferMask;
              let w = this.localWriteIndex;
              for (let i = 0; i < chunk.length; i++) {
                this.ringBufferView[w] = chunk[i];
                w = (w + 1) & mask;
              }
              this.localWriteIndex = w;
            }
          };

          this.workletNode!.port.postMessage({
            type: 'INIT_PORT_BUFFERS',
            bufferSize: this.ringBufferSize
          });
        });
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('[YinAudioWorkletEngine] Initialisierungsfehler:', error);
      this.destroy();
      throw error;
    }
  }

  /**
   * Connects the microphone MediaStream and sets up a harmonic low-pass filter
   * (e.g. 400 Hz for Bass/Cello to eliminate overtone interference, 1800 Hz for Guitar/Violin).
   */
  public connectMicrophone(stream: MediaStream, lowpassFreq: number = 1800): void {
    if (!this.audioContext || !this.workletNode) {
      throw new Error('Engine nicht initialisiert.');
    }

    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch (_) {}
    }
    if (this.biquadFilter) {
      try {
        this.biquadFilter.disconnect();
      } catch (_) {}
    }

    this.mediaSource = this.audioContext.createMediaStreamSource(stream);

    this.biquadFilter = this.audioContext.createBiquadFilter();
    this.biquadFilter.type = 'lowpass';
    this.biquadFilter.frequency.setValueAtTime(lowpassFreq, this.audioContext.currentTime);

    this.mediaSource.connect(this.biquadFilter);
    this.biquadFilter.connect(this.workletNode);
  }

  /**
   * Dynamically adapts the harmonic low-pass filter frequency in real time
   * (e.g. when the user switches instruments between Bass and Guitar while listening).
   */
  public setLowpassCutoff(cutoffFreq: number): void {
    if (this.biquadFilter && this.audioContext) {
      try {
        this.biquadFilter.frequency.setValueAtTime(cutoffFreq, this.audioContext.currentTime);
      } catch (_) {}
    }
  }

  /**
   * Lock-free extraction of the latest frame of audio samples from the ringbuffer.
   */
  public getLatestAudioFrame(frameSize: number = this.analysisBufferSize): Float32Array {
    if (!this.ringBufferView) return new Float32Array(0);

    const writeIndex = this.isSharedMemory && this.stateBufferView
      ? (typeof Atomics !== 'undefined' && Atomics.load ? Atomics.load(this.stateBufferView, 0) : this.stateBufferView[0])
      : this.localWriteIndex;

    const frame = new Float32Array(frameSize);
    const ringSize = this.ringBufferSize;
    const mask = this.ringBufferMask;

    for (let i = 0; i < frameSize; i++) {
      const readIndex = (writeIndex - frameSize + i + ringSize) & mask;
      frame[i] = this.ringBufferView[readIndex];
    }
    return frame;
  }

  /**
   * Main API for real-time pitch detection.
   * Reads from the lock-free ring buffer and executes mathematical YIN correlation
   * with RMS noise squelching and sub-sample parabolic interpolation.
   * 
   * Returns detected frequency in Hz, or -1 if silent or unpitched.
   */
  public getDetectedPitch(): number {
    if (!this.ringBufferView || !this.isInitialized) return -1;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastAnalysisTime < this.minIntervalMs) {
      return this.cachedPitch;
    }
    this.lastAnalysisTime = now;

    const writeIndex = this.isSharedMemory && this.stateBufferView
      ? (typeof Atomics !== 'undefined' && Atomics.load ? Atomics.load(this.stateBufferView, 0) : this.stateBufferView[0])
      : this.localWriteIndex;

    const frameSize = this.analysisBufferSize;
    const ringSize = this.ringBufferSize;
    const mask = this.ringBufferMask;

    // Zero-GC in-place frame copy
    for (let i = 0; i < frameSize; i++) {
      const readIndex = (writeIndex - frameSize + i + ringSize) & mask;
      this.analysisFrame[i] = this.ringBufferView[readIndex];
    }

    const pitch = this.computeYin(this.analysisFrame);
    this.cachedPitch = pitch;
    return pitch;
  }

  /**
   * High-precision YIN algorithm implementation with Zero-GC scratch buffers,
   * RMS noise gating, and parabolic interpolation with an epsilon guard against NaN.
   */
  private computeYin(buffer: Float32Array): number {
    const len = buffer.length;
    if (len === 0) return -1;

    // 1. RMS Squelch / Noise Gate
    let energySum = 0;
    for (let i = 0; i < len; i++) {
      energySum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(energySum / len);
    if (rms < 0.005) {
      return -1;
    }

    const sampleRate = this.audioContext?.sampleRate || 48000;
    const windowSize = Math.floor(len / 2);

    // Fundamental limits: f_min = 23.0 Hz (covers B0 = 30.87 Hz), f_max = 2200 Hz
    const minFreq = 23.0;
    const maxFreq = 2200.0;
    const tauMin = Math.max(2, Math.floor(sampleRate / maxFreq));
    const tauMax = Math.min(windowSize - 1, Math.floor(sampleRate / minFreq));

    if (tauMax <= tauMin) return -1;

    // 2. Cumulative Mean Normalized Difference Function (CMNDF)
    this.yinBuffer[0] = 1;
    let runningSum = 0;
    let tauCandidate = -1;
    const threshold = 0.12;

    for (let tau = 1; tau <= tauMax; tau++) {
      let sum = 0;
      for (let i = 0; i < windowSize; i++) {
        const delta = buffer[i] - buffer[i + tau];
        sum += delta * delta;
      }
      runningSum += sum;
      this.yinBuffer[tau] = runningSum > 0 ? (sum * tau) / runningSum : 1;

      // Check for local minimum below threshold
      if (tau >= tauMin && tauCandidate === -1 && this.yinBuffer[tau] < threshold) {
        tauCandidate = tau;
      } else if (tauCandidate !== -1) {
        if (this.yinBuffer[tau] < this.yinBuffer[tauCandidate]) {
          tauCandidate = tau;
        } else {
          break; // Local trough confirmed
        }
      }
    }

    // 3. Fallback: Search for global minimum if threshold was not crossed
    if (tauCandidate === -1) {
      let minVal = 1000;
      for (let tau = tauMin; tau <= tauMax; tau++) {
        if (this.yinBuffer[tau] < minVal) {
          minVal = this.yinBuffer[tau];
          tauCandidate = tau;
        }
      }
      if (minVal > 0.35 || tauCandidate === -1) {
        return -1;
      }
    }

    // 4. Sub-Sample Parabolic Interpolation with Epsilon Guard
    let betterTau = tauCandidate;
    if (tauCandidate > tauMin && tauCandidate < tauMax) {
      const s0 = this.yinBuffer[tauCandidate - 1];
      const s1 = this.yinBuffer[tauCandidate];
      const s2 = this.yinBuffer[tauCandidate + 1];
      const denom = 2 * (s0 - 2 * s1 + s2);
      if (Math.abs(denom) > 1e-6) {
        const delta = (s0 - s2) / denom;
        if (Math.abs(delta) <= 1.0) {
          betterTau = tauCandidate + delta;
        }
      }
    }

    if (betterTau <= 0 || !isFinite(betterTau)) {
      return -1;
    }

    const detectedFreq = sampleRate / betterTau;
    if (detectedFreq < 20 || detectedFreq > 2200 || !isFinite(detectedFreq)) {
      return -1;
    }

    return detectedFreq;
  }

  public destroy(): void {
    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      try {
        this.workletNode.disconnect();
      } catch (_) {}
      this.workletNode = null;
    }
    if (this.silentGain) {
      try {
        this.silentGain.disconnect();
      } catch (_) {}
      this.silentGain = null;
    }
    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch (_) {}
      this.mediaSource = null;
    }
    if (this.biquadFilter) {
      try {
        this.biquadFilter.disconnect();
      } catch (_) {}
      this.biquadFilter = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
    }
    this.ringBufferView = null;
    this.stateBufferView = null;
    this.sharedRingBuffer = null;
    this.sharedStateBuffer = null;
    this.isInitialized = false;
    this.cachedPitch = -1;
  }
}

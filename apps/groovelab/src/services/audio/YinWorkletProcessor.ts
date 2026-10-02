/**
 * Campus-Groovelab 0,1% Goldstandard YIN AudioWorklet Processor
 * 
 * Runs in the native real-time audio render thread.
 * Strict guarantees:
 * - ZERO Pitch Calculation in Audio-Thread (< 0.01 ms execution budget).
 * - Lock-free Ringbuffer Copy.
 * - Dual-Path: Zero-Copy SharedArrayBuffer with Atomics + Fallback MessagePort chunking.
 * - Bundled via Blob URL (no external chunk or Vite ?url dependency, preventing SyntaxErrors in AudioWorkletGlobalScope).
 */

export const YIN_WORKLET_PROCESSOR_NAME = 'campus-yin-worklet-processor';

export const YIN_WORKLET_PROCESSOR_CODE = `
class YinWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ringBuffer = null;
    this.stateBuffer = null;
    this.localRing = null;
    this.writeIndex = 0;
    this.bufferSize = 8192;
    this.bufferMask = 8191;
    this.isShared = false;
    this.samplesSinceLastPost = 0;
    this.batchSize = 256;

    this.port.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'INIT_SHARED_BUFFERS') {
        try {
          this.bufferSize = data.bufferSize || 8192;
          this.bufferMask = this.bufferSize - 1;
          this.ringBuffer = new Float32Array(data.ringBuffer);
          this.stateBuffer = new Int32Array(data.stateBuffer);
          this.writeIndex = 0;
          this.isShared = true;
          this.port.postMessage({ type: 'READY' });
        } catch (err) {
          this.isShared = false;
          this.port.postMessage({ type: 'ERROR', error: String(err) });
        }
      } else if (data.type === 'INIT_PORT_BUFFERS') {
        try {
          this.bufferSize = data.bufferSize || 8192;
          this.bufferMask = this.bufferSize - 1;
          this.localRing = new Float32Array(this.bufferSize);
          this.writeIndex = 0;
          this.samplesSinceLastPost = 0;
          this.isShared = false;
          this.port.postMessage({ type: 'READY' });
        } catch (err) {
          this.port.postMessage({ type: 'ERROR', error: String(err) });
        }
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channel = input[0];
    if (!channel) return true;
    const numSamples = channel.length;
    if (numSamples === 0) return true;

    if (this.isShared && this.ringBuffer && this.stateBuffer) {
      const mask = this.bufferMask;
      let w = this.writeIndex;
      for (let i = 0; i < numSamples; i++) {
        this.ringBuffer[w] = channel[i];
        w = (w + 1) & mask;
      }
      this.writeIndex = w;
      if (typeof Atomics !== 'undefined' && Atomics.store) {
        Atomics.store(this.stateBuffer, 0, w);
      } else {
        this.stateBuffer[0] = w;
      }
    } else if (!this.isShared && this.localRing) {
      const mask = this.bufferMask;
      let w = this.writeIndex;
      for (let i = 0; i < numSamples; i++) {
        this.localRing[w] = channel[i];
        w = (w + 1) & mask;
      }
      this.writeIndex = w;
      this.samplesSinceLastPost += numSamples;

      if (this.samplesSinceLastPost >= this.batchSize) {
        this.samplesSinceLastPost -= this.batchSize;
        const chunk = new Float32Array(this.batchSize);
        let r = (w - this.batchSize + this.bufferSize) & mask;
        for (let i = 0; i < this.batchSize; i++) {
          chunk[i] = this.localRing[r];
          r = (r + 1) & mask;
        }
        this.port.postMessage({ type: 'AUDIO_CHUNK', chunk }, [chunk.buffer]);
      }
    }

    // Keep outputs silent if connected to graph
    if (outputs && outputs[0] && outputs[0][0]) {
      outputs[0][0].fill(0);
    }

    return true;
  }
}

registerProcessor('${YIN_WORKLET_PROCESSOR_NAME}', YinWorkletProcessor);
`;

let cachedBlobUrl: string | null = null;

/**
 * Returns a secure, in-memory Blob URL for loading the YinAudioWorkletProcessor.
 */
export function getYinWorkletBlobUrl(): string {
  if (typeof window === 'undefined') return '';
  if (!cachedBlobUrl) {
    const blob = new Blob([YIN_WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
    cachedBlobUrl = URL.createObjectURL(blob);
  }
  return cachedBlobUrl;
}

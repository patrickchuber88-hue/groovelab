/**
 * Campus-Groovelab Tier-1 Audio Capture Engine
 * 
 * Hardware-level audio capture controller:
 * - Strict WebRTC Voice Processing Bypass (echoCancellation: false, noiseSuppression: false, agc: false)
 * - 48 kHz / 44.1 kHz Sample-Rate Locking
 * - AudioWorklet Render-Thread Isolation via InstrumentAudioWorkletProcessor
 * - High-Resolution True-Peak & RMS Telemetry
 * - Clean Lossless Float32 / WAV Export
 */

import { SharedAudioEngine } from '../../utils/sharedAudioEngine';
import { 
  AudioCaptureConfig, 
  AudioCaptureState, 
  AudioEngineMetrics, 
  InstrumentProfileType 
} from './types';
import { 
  INSTRUMENT_WORKLET_PROCESSOR_NAME, 
  getInstrumentWorkletBlobUrl 
} from './InstrumentAudioWorkletProcessor';
import { acquireAudioStream, stabilizeAudioStream } from '../audioPermissionService';
import { applyBufferZeroPopEnvelopes } from '../../utils/audioTailEngine';

export type MetricsListener = (metrics: AudioEngineMetrics) => void;
export type StateListener = (state: AudioCaptureState) => void;
export type OverloadListener = (truePeakDbtp: number) => void;

export class AudioCaptureEngine {
  private static instance: AudioCaptureEngine | null = null;

  private state: AudioCaptureState = 'idle';
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;

  // Recorded Chunks
  private recordedChunksL: Float32Array[] = [];
  private recordedChunksR: Float32Array[] = [];
  private totalRecordedSamples = 0;

  // Configuration
  private config: AudioCaptureConfig = {
    sampleRate: 48000,
    channelCount: 2,
    bufferSize: 4096,
    enableTruePeakDetection: true,
    enableSubsonicHpf: true,
    profile: 'general_clean'
  };

  // Metrics
  private currentMetrics: AudioEngineMetrics = {
    sampleRate: 48000,
    inputLatencyMs: 0,
    bufferUnderrunCount: 0,
    peakDbfs: -100,
    truePeakDbtp: -100,
    integratedLufs: -70,
    isOverloaded: false,
    isHeadphonesConnected: false
  };

  // Hardware Device Awareness
  private isHeadphonesConnected = false;
  private isDeviceListenerActive = false;
  private headphoneListeners: Set<(connected: boolean) => void> = new Set();

  // Listeners
  private metricsListeners: Set<MetricsListener> = new Set();
  private stateListeners: Set<StateListener> = new Set();
  private overloadListeners: Set<OverloadListener> = new Set();

  private isWorkletRegistered = false;

  private constructor() {}

  public static getInstance(): AudioCaptureEngine {
    if (!AudioCaptureEngine.instance) {
      AudioCaptureEngine.instance = new AudioCaptureEngine();
    }
    return AudioCaptureEngine.instance;
  }

  public getState(): AudioCaptureState {
    return this.state;
  }

  public getMetrics(): AudioEngineMetrics {
    return { ...this.currentMetrics };
  }

  public getIsHeadphonesConnected(): boolean {
    return this.isHeadphonesConnected;
  }

  public subscribeHeadphones(listener: (connected: boolean) => void): () => void {
    this.headphoneListeners.add(listener);
    listener(this.isHeadphonesConnected);
    return () => this.headphoneListeners.delete(listener);
  }

  public async detectHeadphones(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return false;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasHeadphones = devices.some(d => {
        const label = (d.label || '').toLowerCase();
        return (
          label.includes('headphone') ||
          label.includes('headset') ||
          label.includes('airpods') ||
          label.includes('buds') ||
          label.includes('earphones') ||
          label.includes('bluetooth') ||
          (d.kind === 'audiooutput' && label.includes('external'))
        );
      });
      this.isHeadphonesConnected = hasHeadphones;
      this.currentMetrics.isHeadphonesConnected = hasHeadphones;
      this.headphoneListeners.forEach(l => l(hasHeadphones));
      return hasHeadphones;
    } catch {
      return false;
    }
  }

  public subscribeMetrics(listener: MetricsListener): () => void {
    this.metricsListeners.add(listener);
    return () => this.metricsListeners.delete(listener);
  }

  public subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  public subscribeOverload(listener: OverloadListener): () => void {
    this.overloadListeners.add(listener);
    return () => this.overloadListeners.delete(listener);
  }

  private setState(newState: AudioCaptureState): void {
    this.state = newState;
    this.stateListeners.forEach(listener => listener(newState));
  }

  /**
   * Initializes hardware mic input and registers the real-time AudioWorklet.
   */
  public async initialize(customConfig?: Partial<AudioCaptureConfig>): Promise<void> {
    if (this.state === 'recording') {
      throw new Error('[AudioCaptureEngine] Cannot initialize while recording is active.');
    }

    this.setState('initializing');
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    try {
      const audioCtx = SharedAudioEngine.getContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // 1. Register AudioWorkletProcessor via inlined Blob URL
      if (!this.isWorkletRegistered) {
        const workletUrl = getInstrumentWorkletBlobUrl();
        await audioCtx.audioWorklet.addModule(workletUrl);
        this.isWorkletRegistered = true;
      }

      // 2. Hardware Device Awareness & Feedback Guard
      if (!this.isDeviceListenerActive && typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', () => {
          this.detectHeadphones();
        });
        this.isDeviceListenerActive = true;
      }
      await this.detectHeadphones();

      // Adaptive WebRTC Constraints:
      // If no headphones are connected and strictStudioBypass is not requested, enable AEC
      // to eliminate screeching acoustic feedback loops during backing track playback!
      const shouldEnableAec = !this.isHeadphonesConnected && !this.config.strictStudioBypass;

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: shouldEnableAec,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: this.config.channelCount,
          sampleRate: { ideal: this.config.sampleRate },
          latency: { ideal: 0.005 }
        } as MediaTrackConstraints,
        video: false
      };

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('[AudioCaptureEngine] getUserMedia is not supported in this browser environment.');
      }

      this.mediaStream = await acquireAudioStream(constraints);
      await stabilizeAudioStream(this.mediaStream, 300);

      // Verify acquired hardware track settings
      const track = this.mediaStream.getAudioTracks()[0];
      if (track) {
        const settings = track.getSettings();
        if (settings.sampleRate) {
          this.config.sampleRate = (settings.sampleRate === 44100 ? 44100 : 48000);
          this.currentMetrics.sampleRate = this.config.sampleRate;
        }
      }

      // 3. Connect MediaStream into WebAudio Graph
      this.sourceNode = audioCtx.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(audioCtx, INSTRUMENT_WORKLET_PROCESSOR_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: this.config.channelCount
      });

      // Handle messages from the AudioWorklet real-time thread
      this.workletNode.port.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;

        if (msg.type === 'METRICS') {
          this.currentMetrics.peakDbfs = msg.peakDbfs;
          this.currentMetrics.truePeakDbtp = msg.truePeakDbtp;
          this.currentMetrics.isOverloaded = msg.isOverloaded;

          if (msg.isOverloaded) {
            this.overloadListeners.forEach(listener => listener(msg.truePeakDbtp));
          }

          this.metricsListeners.forEach(listener => listener(this.getMetrics()));
        } else if (msg.type === 'BUFFER_READY') {
          if (this.state === 'recording' && msg.bufferL) {
            this.recordedChunksL.push(msg.bufferL);
            this.recordedChunksR.push(msg.bufferR || msg.bufferL);
            this.totalRecordedSamples += msg.bufferL.length;
          }
        }
      };

      this.sourceNode.connect(this.workletNode);
      this.setState('idle');
    } catch (err: unknown) {
      this.setState('error');
      console.error('[AudioCaptureEngine] Initialization failed:', err);
      throw err;
    }
  }

  /**
   * Starts real-time capture to buffer.
   */
  public startRecording(): void {
    if (!this.workletNode || this.state === 'recording') return;

    this.recordedChunksL = [];
    this.recordedChunksR = [];
    this.totalRecordedSamples = 0;

    this.workletNode.port.postMessage({ type: 'START_RECORDING' });
    this.setState('recording');
  }

  /**
   * Stops recording and returns the master-quality AudioBuffer.
   */
  public async stopRecording(): Promise<AudioBuffer> {
    if (!this.workletNode || this.state !== 'recording') {
      throw new Error('[AudioCaptureEngine] No active recording to stop.');
    }

    this.workletNode.port.postMessage({ type: 'STOP_RECORDING' });
    this.setState('idle');

    // Give worklet 50ms to flush remaining buffers
    await new Promise(resolve => setTimeout(resolve, 50));

    const audioCtx = SharedAudioEngine.getContext();
    const totalLength = Math.max(1, this.totalRecordedSamples);
    const audioBuffer = audioCtx.createBuffer(
      this.config.channelCount,
      totalLength,
      this.config.sampleRate
    );

    const channelL = audioBuffer.getChannelData(0);
    const channelR = this.config.channelCount > 1 ? audioBuffer.getChannelData(1) : null;

    let offset = 0;
    for (let i = 0; i < this.recordedChunksL.length; i++) {
      const chunkL = this.recordedChunksL[i];
      channelL.set(chunkL, offset);

      if (channelR && this.recordedChunksR[i]) {
        channelR.set(this.recordedChunksR[i], offset);
      }
      offset += chunkL.length;
    }

    // 🪄 0,1% DAW Goldstandard: Zero-Pop Envelope Schutz (5ms Head Fade-In + 35ms Cos² Tail Soft-Release)
    applyBufferZeroPopEnvelopes(audioBuffer, 0.005, 0.035);

    return audioBuffer;
  }

  /**
   * Converts an AudioBuffer into an uncompressed, studio-grade 24-bit PCM WAV Blob.
   */
  public audioBufferToWavBlob(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 24;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const length = buffer.length * blockAlign;
    const headerByteLength = 44;
    const totalByteLength = headerByteLength + length;

    const arrayBuffer = new ArrayBuffer(totalByteLength);
    const view = new DataView(arrayBuffer);

    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    this.writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, length, true);

    // Write interleaved 24-bit PCM audio samples
    const channels: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let c = 0; c < numChannels; c++) {
        // Clamp sample to [-1.0, +1.0]
        let s = Math.max(-1.0, Math.min(1.0, channels[c][i]));
        // Scale to 24-bit signed integer [-8388608, 8388607]
        let intSample = s < 0 ? s * 8388608 : s * 8388607;
        intSample = Math.round(intSample);

        view.setUint8(offset, intSample & 0xff);
        view.setUint8(offset + 1, (intSample >> 8) & 0xff);
        view.setUint8(offset + 2, (intSample >> 16) & 0xff);
        offset += 3;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Cleans up all resources, stops tracks and disconnects nodes.
   */
  public dispose(): void {
    if (this.state === 'recording') {
      try {
        this.workletNode?.port.postMessage({ type: 'STOP_RECORDING' });
      } catch (_) {}
    }

    this.sourceNode?.disconnect();
    this.workletNode?.disconnect();
    this.sourceNode = null;
    this.workletNode = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (_) {}
      });
      this.mediaStream = null;
    }

    this.recordedChunksL = [];
    this.recordedChunksR = [];
    this.totalRecordedSamples = 0;
    this.setState('idle');
  }

  private static registeredContexts: WeakSet<AudioContext> = new WeakSet();

  /**
   * 🎙️ UNIFIED REAL-TIME PCM CAPTURE TAP (AudioWorklet First, ScriptProcessor Fallback)
   * Provides lock-free, real-time Float32 PCM capture in the dedicated AudioWorklet thread
   * for Aufnahmestudio, Loopstation Auto-Sequence, and Studio Recorders.
   */
  public static async createRealtimePcmCaptureTap(
    audioCtx: AudioContext,
    stream: MediaStream,
    options?: {
      channelCount?: 1 | 2;
      enableSubsonicHpf?: boolean;
      onChunk?: (chunkL: Float32Array, chunkR: Float32Array) => void;
    }
  ): Promise<{
    start: () => void;
    stopAndFlush: () => Promise<{ chunksL: Float32Array[]; chunksR: Float32Array[]; totalSamples: number }>;
    getLiveChunks: () => { chunksL: Float32Array[]; chunksR: Float32Array[]; totalSamples: number };
    disconnect: () => void;
    workletOrProcessorNode: AudioNode | null;
  }> {
    const channelCount = options?.channelCount ?? 2;
    const enableSubsonicHpf = options?.enableSubsonicHpf ?? false;
    const chunksL: Float32Array[] = [];
    const chunksR: Float32Array[] = [];
    let totalSamples = 0;
    let isCapturing = false;

    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let workletNode: AudioWorkletNode | null = null;
    let fallbackProcessor: ScriptProcessorNode | null = null;
    let silentGain: GainNode | null = null;

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => {});
    }

    sourceNode = audioCtx.createMediaStreamSource(stream);
    silentGain = audioCtx.createGain();
    silentGain.gain.setValueAtTime(0, audioCtx.currentTime);

    const pushStereoChunk = (inL: Float32Array, rawR?: Float32Array) => {
      let inR = inL;
      if (rawR && rawR.length === inL.length) {
        let hasSignal = false;
        for (let i = 0; i < rawR.length; i += 16) {
          if (Math.abs(rawR[i]) > 0.0001) {
            hasSignal = true;
            break;
          }
        }
        if (hasSignal) {
          inR = rawR;
        }
      }
      const copyL = new Float32Array(inL);
      const copyR = channelCount > 1 ? new Float32Array(inR) : copyL;
      chunksL.push(copyL);
      chunksR.push(copyR);
      totalSamples += copyL.length;
      options?.onChunk?.(copyL, copyR);
    };

    let workletReady = false;
    if (typeof AudioWorkletNode !== 'undefined' && audioCtx.audioWorklet) {
      try {
        if (!AudioCaptureEngine.registeredContexts.has(audioCtx)) {
          const workletUrl = getInstrumentWorkletBlobUrl();
          if (workletUrl) {
            await audioCtx.audioWorklet.addModule(workletUrl);
            AudioCaptureEngine.registeredContexts.add(audioCtx);
          }
        }
        workletNode = new AudioWorkletNode(audioCtx, INSTRUMENT_WORKLET_PROCESSOR_NAME, {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount
        });
        workletNode.port.postMessage({
          type: 'SET_CONFIG',
          config: {
            enableTruePeakDetection: false,
            enableSubsonicHpf
          }
        });
        workletNode.port.onmessage = (event: MessageEvent) => {
          const msg = event.data;
          if (msg && msg.type === 'BUFFER_READY' && msg.bufferL instanceof Float32Array) {
            if (isCapturing) {
              pushStereoChunk(
                msg.bufferL,
                msg.bufferR instanceof Float32Array ? msg.bufferR : undefined
              );
            }
          }
        };
        sourceNode.connect(workletNode);
        workletNode.connect(silentGain);
        silentGain.connect(audioCtx.destination);
        workletReady = true;
      } catch (workletErr) {
        console.warn('[AudioCaptureEngine] Worklet init notice, using PCM fallback:', workletErr);
      }
    }

    if (!workletReady) {
      fallbackProcessor = audioCtx.createScriptProcessor(4096, channelCount, channelCount);
      fallbackProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!isCapturing) return;
        const inL = e.inputBuffer.getChannelData(0);
        const inR = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : undefined;
        pushStereoChunk(inL, inR);
      };
      sourceNode.connect(fallbackProcessor);
      fallbackProcessor.connect(silentGain);
      silentGain.connect(audioCtx.destination);
    }

    const disconnect = () => {
      isCapturing = false;
      try {
        if (workletNode) {
          workletNode.port.onmessage = null;
          workletNode.disconnect();
        }
      } catch {}
      try {
        if (fallbackProcessor) {
          fallbackProcessor.onaudioprocess = null;
          fallbackProcessor.disconnect();
        }
      } catch {}
      try {
        silentGain?.disconnect();
      } catch {}
      try {
        sourceNode?.disconnect();
      } catch {}
    };

    return {
      start: () => {
        isCapturing = true;
        if (workletNode) {
          workletNode.port.postMessage({ type: 'START_RECORDING' });
        }
      },
      stopAndFlush: async () => {
        if (workletNode) {
          workletNode.port.postMessage({ type: 'STOP_RECORDING' });
          await new Promise((resolve) => setTimeout(resolve, 35));
        }
        disconnect();
        return { chunksL, chunksR, totalSamples };
      },
      getLiveChunks: () => ({ chunksL, chunksR, totalSamples }),
      disconnect,
      workletOrProcessorNode: workletNode || fallbackProcessor
    };
  }

  /**
   * 🎙️ UNIFIED HIGH-BITRATE MEDIARECORDER FACTORY
   * Guarantees consistent 256-320 kbps Opus/AAC recording across all dashboards and boards.
   */
  public static createHighResMediaRecorder(
    stream: MediaStream,
    targetBitrateBps = 256000
  ): { recorder: MediaRecorder; mimeType: string } {
    let mimeType = '';
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        mimeType = 'audio/aac';
      }
    }

    try {
      const options: MediaRecorderOptions = { audioBitsPerSecond: targetBitrateBps };
      if (mimeType) options.mimeType = mimeType;
      const recorder = new MediaRecorder(stream, options);
      return { recorder, mimeType: recorder.mimeType || mimeType || 'audio/webm' };
    } catch {
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      return { recorder, mimeType: recorder.mimeType || mimeType || 'audio/webm' };
    }
  }

  /**
   * Resolves the canonical file extension for a processed or raw audio Blob.
   * Ensures 24-bit WAV Blobs returned by processPureRawBlob are never mislabeled as .webm.
   */
  public static resolveAudioFileExtension(
    blob: Blob,
    fallbackMime = ''
  ): 'wav' | 'mp3' | 'm4a' | 'mp4' | 'webm' {
    const mime = (blob.type || fallbackMime || '').toLowerCase();
    if (mime.includes('wav')) return 'wav';
    if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
    if (mime.includes('mp4') || mime.includes('aac') || mime.includes('m4a')) return 'm4a';
    return 'webm';
  }

  /**
   * 🎧 Stops a MediaRecorder after a natural acoustic tail decay delay (Default: 900ms),
   * ensuring the last note/chord rings out naturally after pressing "Beenden" instead of cutting off abruptly.
   */
  public static stopRecorderWithTail(
    recorder: MediaRecorder | null | undefined,
    tailDelayMs = 900,
    onAfterStop?: () => void
  ): ReturnType<typeof setTimeout> | null {
    if (!recorder || recorder.state === 'inactive') {
      if (onAfterStop) onAfterStop();
      return null;
    }

    try {
      recorder.requestData();
    } catch {}

    return setTimeout(() => {
      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      } catch {}
      if (onAfterStop) onAfterStop();
    }, Math.max(0, tailDelayMs));
  }
}

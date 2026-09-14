/**
 * Campus-Groovelab Tier-1 Audio Engine - Core Type Definitions
 * 
 * Strict Enterprise+ TypeScript contracts for:
 * - Real-Time AudioWorklet communication (zero-alloc messaging)
 * - Instrument-Adaptive Audio Capture (WebRTC Bypass, 48 kHz Locking)
 * - Spotify-Grade Byte-Range Streaming (RFC 7233 partial content)
 * - Didactic High-Fidelity Playback (WSOLA Time-Stretching & Looping)
 */

export type InstrumentProfileType = 
  | 'acoustic_guitar' 
  | 'grand_piano' 
  | 'strings' 
  | 'brass_woodwinds' 
  | 'drums_percussion' 
  | 'general_clean';

export type AudioCaptureState = 
  | 'idle' 
  | 'initializing' 
  | 'recording' 
  | 'paused' 
  | 'error';

export interface AudioEngineMetrics {
  sampleRate: number;
  inputLatencyMs: number;
  bufferUnderrunCount: number;
  peakDbfs: number;
  truePeakDbtp: number;
  integratedLufs: number;
  isOverloaded: boolean;
}

export interface AudioCaptureConfig {
  sampleRate: 44100 | 48000;
  channelCount: 1 | 2;
  bufferSize: number;
  enableTruePeakDetection: boolean;
  enableSubsonicHpf: boolean;
  profile: InstrumentProfileType;
}

export interface StreamChunkConfig {
  initialChunkBytes: number; // Default: 262144 (256 KB)
  subsequentChunkBytes: number; // Default: 524288 (512 KB)
  preBufferDurationSec: number; // Default: 4.0
  cacheInIndexedDb: boolean; // Default: true
}

export interface WsolaPlaybackState {
  playbackRate: number; // 0.5 - 1.5
  isLooping: boolean;
  loopStartSec: number;
  loopEndSec: number;
  currentTimeSec: number;
  durationSec: number;
  isPlaying: boolean;
  volume: number; // 0.0 - 1.0
  isMuted: boolean;
}

export interface AudioStem {
  id: string;
  label: string;
  url: string;
  volume: number; // 0.0 - 1.0
  isMuted: boolean;
  isSoloed: boolean;
  pan: number; // -1.0 (Left) to +1.0 (Right)
}

export interface WorkletToMainMessage {
  type: 'METRICS' | 'BUFFER_READY' | 'OVERLOAD' | 'ERROR';
  peak?: number;
  truePeak?: number;
  buffer?: Float32Array;
  channel?: number;
  underruns?: number;
  error?: string;
}

export interface MainToWorkletMessage {
  type: 'SET_CONFIG' | 'START_RECORDING' | 'STOP_RECORDING' | 'RESET';
  config?: Partial<AudioCaptureConfig>;
}

/**
 * Dual-Track Synchronous Audio Engine (Tier-1 SaaS Enterprise+ Goldstandard)
 * Campus-Groovelab
 *
 * Replaces dual HTML5 <audio> elements with a unified, sample-accurate
 * Web Audio API AudioContext pipeline.
 *
 * Core Features:
 * - 0% Drift: Both tracks run on AudioContext.currentTime hardware sample clock
 * - Zero Seeking Locks: Direct buffer offset scheduling instead of HTML5 seek events
 * - Seamless Gain Control: Live gain changes via AudioParam without audio restarts
 * - Sample-Accurate Count-In: Synthesized sine clicks scheduled directly on audio timeline
 * - Hardware Latency Compensation: Sub-millisecond offset shifting
 * - OfflineAudioContext Stereo Mixdown: Instant WAV export of both synchronized layers
 */

import { SharedAudioEngine } from './sharedAudioEngine';

// Shared AudioContext Singleton via Campus-Groovelab SharedAudioEngine
export function getSharedAudioContext(): AudioContext {
  return SharedAudioEngine.getContext();
}

/**
 * Decodes an audio Blob, URL or ArrayBuffer into an AudioBuffer.
 */
export async function decodeAudioSource(
  source: Blob | ArrayBuffer | string,
  ctx?: AudioContext
): Promise<AudioBuffer> {
  const audioCtx = ctx || getSharedAudioContext();
  let arrayBuffer: ArrayBuffer;

  if (typeof source === 'string') {
    const res = await fetch(source);
    arrayBuffer = await res.arrayBuffer();
  } else if (source instanceof Blob) {
    arrayBuffer = await source.arrayBuffer();
  } else {
    arrayBuffer = source;
  }

  // WebKit backward-compatibility callback fallback
  return new Promise<AudioBuffer>((resolve, reject) => {
    audioCtx.decodeAudioData(
      arrayBuffer.slice(0),
      (decoded) => resolve(decoded),
      (err) => reject(err || new Error('Audio decoding failed'))
    );
  });
}

/**
 * Synthesizes a sample-accurate 4-beat count-in click on the AudioContext clock.
 * Returns the exact AudioContext timestamp when Beat 1 of the song starts.
 */
export function scheduleCountInBeeps(
  bpm: number,
  beats = 4,
  ctx?: AudioContext,
  onBeatProgress?: (beatNumber: number) => void
): { songStartTime: number; cancel: () => void } {
  const audioCtx = ctx || getSharedAudioContext();
  const safeBpm = Math.max(40, Math.min(240, bpm || 100));
  const beatInterval = 60 / safeBpm;
  const leadTime = 0.05; // 50ms scheduling headroom
  const now = audioCtx.currentTime + leadTime;

  const timeouts: number[] = [];

  for (let i = 0; i < beats; i++) {
    const clickTime = now + (i * beatInterval);
    const isFirstBeat = (i === 0);

    // Visual callback dispatch
    const delayMs = Math.max(0, (clickTime - audioCtx.currentTime) * 1000);
    const tId = window.setTimeout(() => {
      if (onBeatProgress) {
        onBeatProgress(beats - i); // Count down: 4, 3, 2, 1
      }
    }, delayMs);
    timeouts.push(tId);

    // Audio Click Synthesis
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isFirstBeat ? 880 : 440, clickTime);

      gain.gain.setValueAtTime(0.35, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, clickTime + 0.065);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(clickTime);
      osc.stop(clickTime + 0.07);
    } catch (err) {
      console.warn('[DualTrackEngine] Error scheduling count-in beep:', err);
    }
  }

  const songStartTime = now + (beats * beatInterval);

  return {
    songStartTime,
    cancel: () => {
      timeouts.forEach(t => clearTimeout(t));
    }
  };
}

export interface DualTrackPlaybackSession {
  stop: () => void;
  pause: () => void;
  setTeacherVolume: (vol: number) => void;
  setStudentVolume: (vol: number) => void;
  getCurrentPlaybackTime: () => number;
}

/**
 * Starts dual-buffer synchronized playback on a single hardware clock tick.
 */
export function playDualTrackSynchronous(params: {
  teacherBuffer: AudioBuffer;
  studentBuffer?: AudioBuffer | null;
  offsetSec?: number;
  latencyOffsetMs?: number;
  teacherVolume?: number;
  studentVolume?: number;
  ctx?: AudioContext;
  onEnded?: () => void;
}): DualTrackPlaybackSession {
  const {
    teacherBuffer,
    studentBuffer,
    offsetSec = 0,
    latencyOffsetMs = 0,
    teacherVolume = 1.0,
    studentVolume = 1.0,
    onEnded
  } = params;

  const audioCtx = params.ctx || getSharedAudioContext();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  const scheduleLead = 0.035; // 35ms ahead
  const startTick = audioCtx.currentTime + scheduleLead;

  // Track 1: Teacher
  const teacherSource = audioCtx.createBufferSource();
  teacherSource.buffer = teacherBuffer;
  const teacherGain = audioCtx.createGain();
  teacherGain.gain.setValueAtTime(Math.max(0, Math.min(1, teacherVolume)), audioCtx.currentTime);
  teacherSource.connect(teacherGain);
  teacherGain.connect(audioCtx.destination);

  // Track 2: Student (with latency compensation offset)
  let studentSource: AudioBufferSourceNode | null = null;
  let studentGain: GainNode | null = null;

  if (studentBuffer) {
    studentSource = audioCtx.createBufferSource();
    studentSource.buffer = studentBuffer;
    studentGain = audioCtx.createGain();
    studentGain.gain.setValueAtTime(Math.max(0, Math.min(1, studentVolume)), audioCtx.currentTime);
    studentSource.connect(studentGain);
    studentGain.connect(audioCtx.destination);
  }

  let isStopped = false;

  teacherSource.onended = () => {
    if (!isStopped) {
      isStopped = true;
      if (studentSource) {
        try { studentSource.stop(); } catch (e) {}
      }
      if (onEnded) onEnded();
    }
  };

  // Compute sub-track offsets
  const teacherOffset = Math.max(0, Math.min(teacherBuffer.duration, offsetSec));
  const latencySec = latencyOffsetMs / 1000;
  
  teacherSource.start(startTick, teacherOffset);

  if (studentSource && studentBuffer) {
    // 🎯 1% Tier-1 Korrektur: Positiver Latenz-Offset schiebt die Schülerspur nach vorne (früher im Zeitstrahl)
    const effectiveStudentPos = offsetSec + latencySec;
    if (effectiveStudentPos < 0) {
      // Wenn der Schüler zeitlich nach dem Start einsetzen soll (Verzögerter Start)
      const delayedStartTick = startTick + Math.abs(effectiveStudentPos);
      studentSource.start(delayedStartTick, 0);
    } else {
      // Normalfall: Schüler-Audio beginnt ab sofort, aber um den Latenzoffset vorgespult
      const studentOffset = Math.min(studentBuffer.duration, effectiveStudentPos);
      studentSource.start(startTick, studentOffset);
    }
  }

  return {
    stop: () => {
      if (!isStopped) {
        isStopped = true;
        try { teacherSource.stop(); } catch (e) {}
        if (studentSource) {
          try { studentSource.stop(); } catch (e) {}
        }
      }
    },
    pause: () => {
      if (!isStopped) {
        isStopped = true;
        try { teacherSource.stop(); } catch (e) {}
        if (studentSource) {
          try { studentSource.stop(); } catch (e) {}
        }
      }
    },
    setTeacherVolume: (vol: number) => {
      try {
        teacherGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), audioCtx.currentTime);
      } catch (e) {}
    },
    setStudentVolume: (vol: number) => {
      if (studentGain) {
        try {
          studentGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), audioCtx.currentTime);
        } catch (e) {}
      }
    },
    getCurrentPlaybackTime: () => {
      if (isStopped) return teacherOffset;
      const elapsed = audioCtx.currentTime - startTick;
      return Math.max(0, teacherOffset + Math.max(0, elapsed));
    }
  };
}

/**
 * Renders both teacher and student layers into a single, mastered stereo WAV file
 * using an OfflineAudioContext.
 */
export async function renderDuettMixdown(params: {
  teacherBuffer: AudioBuffer;
  studentBuffer: AudioBuffer;
  latencyOffsetMs?: number;
  teacherVolume?: number;
  studentVolume?: number;
}): Promise<Blob> {
  const {
    teacherBuffer,
    studentBuffer,
    latencyOffsetMs = 0,
    teacherVolume = 1.0,
    studentVolume = 1.0
  } = params;

  const sampleRate = teacherBuffer.sampleRate || 44100;
  const totalDuration = Math.max(
    teacherBuffer.duration,
    studentBuffer.duration + Math.abs(latencyOffsetMs / 1000)
  );

  const length = Math.ceil(totalDuration * sampleRate);
  const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

  // Teacher Layer
  const tSource = offlineCtx.createBufferSource();
  tSource.buffer = teacherBuffer;
  const tGain = offlineCtx.createGain();
  tGain.gain.value = teacherVolume;
  tSource.connect(tGain);
  tGain.connect(offlineCtx.destination);
  tSource.start(0);

  // Student Layer
  const sSource = offlineCtx.createBufferSource();
  sSource.buffer = studentBuffer;
  const sGain = offlineCtx.createGain();
  sGain.gain.value = studentVolume;
  sSource.connect(sGain);
  sGain.connect(offlineCtx.destination);

  const latencySec = latencyOffsetMs / 1000;
  if (latencySec < 0) {
    sSource.start(Math.abs(latencySec));
  } else {
    sSource.start(0, Math.min(studentBuffer.duration, latencySec));
  }

  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWavBlob(renderedBuffer);
}

/**
 * Converts an AudioBuffer to a standard 16-bit PCM WAV Blob.
 */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;
  const numSamples = buffer.length;

  const dataSize = numSamples * blockAlign;
  const bufferLength = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF Chunk
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt Subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data Subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave and scale float samples to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Left channel
    const sampleL = Math.max(-1, Math.min(1, left[i]));
    view.setInt16(offset, sampleL < 0 ? sampleL * 0x8000 : sampleL * 0x7FFF, true);
    offset += 2;

    // Right channel
    const sampleR = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, sampleR < 0 ? sampleR * 0x8000 : sampleR * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

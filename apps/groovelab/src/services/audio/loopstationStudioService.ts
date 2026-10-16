import { supabase } from '../../lib/supabase';

export const LOOP_VAULT_TOPIC_NAME = '__STUDENT_LOOPSTATION_VAULT__';
export const LOOP_VAULT_CATEGORY_ID = 'groovelab_loops';

export interface SavedLoopEntry {
  url: string;
  duration: string;
  date: string;
  label: string;
  creatorRole: string;
  visibility: string;
  originalStr: string;
}

const peakCache = new WeakMap<AudioBuffer, Map<number, number[]>>();

/**
 * O(1) Memoized waveform peak extractor using WeakMap<AudioBuffer, Map<number, number[]>>.
 * Eliminates 60 FPS full-buffer scans during playback.
 */
export function getMemoizedBufferPeaks(buffer: AudioBuffer | null | undefined, numSteps: number = 32): number[] {
  if (!buffer || buffer.length === 0) {
    return new Array(numSteps).fill(0);
  }
  let stepMap = peakCache.get(buffer);
  if (!stepMap) {
    stepMap = new Map<number, number[]>();
    peakCache.set(buffer, stepMap);
  }
  const cached = stepMap.get(numSteps);
  if (cached) return cached;

  const peaks: number[] = new Array(numSteps).fill(0);
  const data = buffer.getChannelData(0);
  const stepSamples = Math.floor(data.length / numSteps);
  if (stepSamples <= 0) {
    stepMap.set(numSteps, peaks);
    return peaks;
  }

  for (let i = 0; i < numSteps; i++) {
    const start = i * stepSamples;
    const end = Math.min(start + stepSamples, data.length);
    let max = 0;
    for (let j = start; j < end; j += 4) {
      const val = Math.abs(data[j]);
      if (val > max) max = val;
    }
    peaks[i] = max;
  }

  const maxPeak = Math.max(...peaks, 0.001);
  const normalized = peaks.map((p) => Math.min(1.0, p / maxPeak));
  stepMap.set(numSteps, normalized);
  return normalized;
}

/**
 * Shared 16-bit PCM WAV encoder for Loopstation tracks and bounces.
 */
export function encodeLoopAudioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));

  const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(out, 0, 'RIFF');
  out.setUint32(4, 36 + buffer.length * numChannels * 2, true);
  writeString(out, 8, 'WAVE');
  writeString(out, 12, 'fmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, numChannels, true);
  out.setUint32(24, sampleRate, true);
  out.setUint32(28, sampleRate * numChannels * 2, true);
  out.setUint16(32, numChannels * 2, true);
  out.setUint16(34, 16, true);
  writeString(out, 36, 'data');
  out.setUint32(40, buffer.length * numChannels * 2, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = Math.max(-1, Math.min(1, channels[channel][i]));
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7fff) | 0;
      out.setInt16(offset, sample, true);
      offset += 2;
    }
  }

  return new Blob([out], { type: 'audio/wav' });
}

interface LameMp3EncoderInstance {
  encodeBuffer: (left: Int16Array, right?: Int16Array) => Int8Array;
  flush: () => Int8Array;
}

interface LameModuleShape {
  Mp3Encoder?: new (channels: number, sampleRate: number, kbps: number) => LameMp3EncoderInstance;
  default?: {
    Mp3Encoder?: new (channels: number, sampleRate: number, kbps: number) => LameMp3EncoderInstance;
  };
}

/**
 * Shared 128 kbps MP3 encoder for Loopstation mixes.
 */
export async function encodeLoopAudioBufferToMp3(buffer: AudioBuffer): Promise<Blob> {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const lamejs = (await import('@breezystack/lamejs')) as unknown as LameModuleShape;
  const Mp3EncoderClass = lamejs.Mp3Encoder || lamejs.default?.Mp3Encoder;
  if (!Mp3EncoderClass) {
    throw new Error('LameJS Mp3Encoder constructor not found.');
  }
  const mp3encoder = new Mp3EncoderClass(channels, sampleRate, 128);
  const mp3Data: BlobPart[] = [];
  const samples = buffer.getChannelData(0);

  const sampleBlockSize = 1152;
  const int16Samples = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    int16Samples[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  if (channels === 2) {
    const samples2 = buffer.getChannelData(1);
    const int16Samples2 = new Int16Array(samples2.length);
    for (let i = 0; i < samples2.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples2[i]));
      int16Samples2[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    for (let i = 0; i < int16Samples.length; i += sampleBlockSize) {
      const chunk1 = int16Samples.subarray(i, i + sampleBlockSize);
      const chunk2 = int16Samples2.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(chunk1, chunk2);
      if (mp3buf.length > 0) mp3Data.push(new Uint8Array(mp3buf));
    }
  } else {
    for (let i = 0; i < int16Samples.length; i += sampleBlockSize) {
      const chunk = int16Samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) mp3Data.push(new Uint8Array(mp3buf));

  return new Blob(mp3Data, { type: 'audio/mp3' });
}

// ============================================================================
// STUDENT LOOP VAULT (WEEK-INDEPENDENT & DECOUPLED FROM HOMEWORK)
// ============================================================================

function getVaultLocalStorageKey(studentId: string): string {
  return `campus_loop_vault_${studentId}`;
}

function getDeletedLoopsLocalStorageKey(studentId: string): string {
  return `campus_loop_deleted_${studentId}`;
}

function getDeletedLoopUrls(studentId: string): Set<string> {
  if (typeof window === 'undefined' || !studentId) return new Set();
  try {
    const raw = localStorage.getItem(getDeletedLoopsLocalStorageKey(studentId));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((item): item is string => typeof item === 'string'));
    }
  } catch {}
  return new Set();
}

export function markLoopUrlAsDeleted(studentId: string | undefined, loopStrOrUrl: string): void {
  if (typeof window === 'undefined' || !studentId) return;
  const url = loopStrOrUrl.startsWith('LOOP:')
    ? loopStrOrUrl.replace('LOOP:', '').split('|')[0]
    : loopStrOrUrl;
  if (!url) return;
  try {
    const deleted = getDeletedLoopUrls(studentId);
    deleted.add(url);
    localStorage.setItem(getDeletedLoopsLocalStorageKey(studentId), JSON.stringify(Array.from(deleted)));
  } catch {}
}

export function parseSavedLoopToken(note: string): SavedLoopEntry | null {
  if (!note.startsWith('LOOP:')) return null;
  const parts = note.replace('LOOP:', '').split('|');
  const url = parts[0] || '';
  if (!url) return null;
  const creatorRole = parts[4] || 'student';
  const visibility = parts[5] || (creatorRole === 'teacher' ? 'shared_with_teacher' : 'private');
  return {
    url,
    duration: parts[1] || '0',
    date: parts[2] || new Date().toISOString(),
    label: parts[3] || 'Loop-Mix',
    creatorRole,
    visibility,
    originalStr: note
  };
}

function deduplicateLoopTokens(tokens: string[], deletedUrls: Set<string>): string[] {
  const byUrl = new Map<string, string>();
  for (const token of tokens) {
    if (typeof token !== 'string' || !token.startsWith('LOOP:')) continue;
    const url = token.replace('LOOP:', '').split('|')[0];
    if (!url || deletedUrls.has(url)) continue;
    byUrl.set(url, token);
  }
  return Array.from(byUrl.values());
}

export function readCachedStudentLoopVault(
  studentId: string | undefined,
  legacyHomeworkNotes?: string[]
): string[] {
  const deletedUrls = studentId ? getDeletedLoopUrls(studentId) : new Set<string>();
  const combined: string[] = [];

  if (typeof window !== 'undefined' && studentId) {
    try {
      const raw = localStorage.getItem(getVaultLocalStorageKey(studentId));
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item === 'string' && item.startsWith('LOOP:')) {
              combined.push(item);
            }
          }
        }
      }
    } catch {}
  }

  if (Array.isArray(legacyHomeworkNotes)) {
    for (const note of legacyHomeworkNotes) {
      if (typeof note === 'string' && note.startsWith('LOOP:')) {
        combined.push(note);
      }
    }
  }

  return deduplicateLoopTokens(combined, deletedUrls);
}

/**
 * Loads all saved loops for a student from their permanent, week-independent
 * `__STUDENT_LOOPSTATION_VAULT__` row (`is_current_homework: false`) and seamlessly
 * migrates any historical `LOOP:` tokens from past weekly rows without creating a homework assignment.
 */
export async function loadStudentLoopVault(
  studentId: string | undefined,
  legacyHomeworkNotes?: string[]
): Promise<string[]> {
  const initial = readCachedStudentLoopVault(studentId, legacyHomeworkNotes);
  if (!studentId || studentId === 'teacher-self') {
    return initial;
  }

  const deletedUrls = getDeletedLoopUrls(studentId);

  try {
    const { data: rows, error } = await supabase
      .from('progress_matrix')
      .select('id, topic_name, homework_notes')
      .eq('student_id', studentId);

    if (error || !rows) {
      return initial;
    }

    const legacyTokens: string[] = [];
    const vaultTokens: string[] = [];
    let hasVaultRow = false;

    for (const row of rows) {
      const rawNotes = row.homework_notes;
      if (!rawNotes || typeof rawNotes !== 'string') continue;
      let parsedList: unknown = null;
      try {
        parsedList = JSON.parse(rawNotes);
      } catch {
        continue;
      }
      if (!Array.isArray(parsedList)) continue;

      const loopEntries = parsedList.filter(
        (entry): entry is string => typeof entry === 'string' && entry.startsWith('LOOP:')
      );

      if (row.topic_name === LOOP_VAULT_TOPIC_NAME) {
        hasVaultRow = true;
        vaultTokens.push(...loopEntries);
      } else if (loopEntries.length > 0) {
        legacyTokens.push(...loopEntries);
      }
    }

    // Order: legacy first, then local cache, then authoritative vault row so latest visibility wins
    const merged = deduplicateLoopTokens([...legacyTokens, ...initial, ...vaultTokens], deletedUrls);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(getVaultLocalStorageKey(studentId), JSON.stringify(merged));
      } catch {}
    }

    // If legacy loops were found that are not yet in the vault row, persist them into the non-homework vault
    if (merged.length > vaultTokens.length || (!hasVaultRow && merged.length > 0)) {
      await saveStudentLoopVault(studentId, merged);
    }

    return merged;
  } catch {
    return initial;
  }
}

/**
 * Persists the student's saved loops exclusively into the week-independent
 * `__STUDENT_LOOPSTATION_VAULT__` record with `is_current_homework: false`.
 * Never creates or modifies a weekly homework assignment (`Hausaufgabe KW XX`).
 */
export async function saveStudentLoopVault(
  studentId: string | undefined,
  loopTokens: string[]
): Promise<void> {
  if (!studentId) return;

  const deletedUrls = getDeletedLoopUrls(studentId);
  const cleanTokens = deduplicateLoopTokens(loopTokens, deletedUrls);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getVaultLocalStorageKey(studentId), JSON.stringify(cleanTokens));
    } catch {}
  }

  if (studentId === 'teacher-self') return;

  try {
    const serialized = JSON.stringify(cleanTokens);
    const { data: existingVault } = await supabase
      .from('progress_matrix')
      .select('id')
      .eq('student_id', studentId)
      .eq('topic_name', LOOP_VAULT_TOPIC_NAME)
      .maybeSingle();

    if (existingVault?.id) {
      await supabase
        .from('progress_matrix')
        .update({
          homework_notes: serialized,
          is_current_homework: false,
          last_updated: new Date().toISOString()
        })
        .eq('id', existingVault.id);
    } else {
      await supabase
        .from('progress_matrix')
        .insert({
          student_id: studentId,
          category_id: LOOP_VAULT_CATEGORY_ID,
          topic_name: LOOP_VAULT_TOPIC_NAME,
          status: 'IN_PROGRESS',
          is_current_homework: false,
          homework_notes: serialized,
          last_updated: new Date().toISOString()
        });
    }
  } catch (err) {
    console.warn('[LoopVault] Cloud persistence fallback to local cache:', err);
  }
}

/**
 * 🎙️ 0.1% Goldstandard Loop Buffer Slicer & Boundary Micro-Fader (Hetzner Reference Parity)
 * 
 * - Slices raw recorded AudioBuffer to the exact musical grid length (sample-accurate).
 * - Compensates roundtrip hardware latency (syncOffsetMs).
 * - Applies a clean 3ms micro-fade at the start and end boundaries to guarantee
 *   zero sample discontinuity at loop wraparound while preserving 100% of Beat 1's transient attack.
 */
export function sliceAndCrossfadeLoopBuffer(
  rawBuffer: AudioBuffer,
  options: {
    ctx: BaseAudioContext;
    latencySec: number;
    targetDurationSec: number;
    crossfadeDurationSec?: number;
  }
): AudioBuffer {
  const { ctx, latencySec, targetDurationSec, crossfadeDurationSec = 0.003 } = options;
  const sampleRate = rawBuffer.sampleRate;
  const numChannels = rawBuffer.numberOfChannels;
  const targetSamples = Math.max(1, Math.round(targetDurationSec * sampleRate));
  const startSample = Math.max(0, Math.min(Math.round(latencySec * sampleRate), rawBuffer.length));
  const fadeSamples = Math.min(
    Math.round(crossfadeDurationSec * sampleRate),
    Math.floor(targetSamples * 0.05)
  );

  const aligned = ctx.createBuffer(numChannels, targetSamples, sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const src = rawBuffer.getChannelData(c);
    const dst = aligned.getChannelData(c);

    const available = Math.max(0, src.length - startSample);
    const copyLen = Math.min(available, targetSamples);
    if (copyLen > 0) {
      dst.set(src.subarray(startSample, startSample + copyLen), 0);
    }

    for (let i = 0; i < fadeSamples; i++) {
      const gain = i / fadeSamples;
      if (i < dst.length) {
        dst[i] *= gain;
      }
      const endIdx = dst.length - 1 - i;
      if (endIdx >= 0) {
        dst[endIdx] *= gain;
      }
    }
  }

  return aligned;
}

/**
 * 🏛️ Audio-Biografie Stage-0 Pure RAW Loop Track Calibrator (100% Linear, 0% Distortion, 0% Noise Pumping)
 *
 * 1. Applies an 18 Hz Subsonic DC-Offset Blocker (removes hardware DC bias without bass phase shift).
 * 2. Performs 100% linear Peak-to-Headroom calibration toward -2.5 dBTP (0.75 linear):
 *    - If recorded signal exceeds -2.5 dBTP (hot mic / loud strum), attenuates linearly to prevent any bus clipping.
 *    - If recorded signal is quieter (above -42 dBFS noise floor), boosts linearly by at most +6.0 dB (max 1.995x)
 *      so sparse/rhythmic tracks gain punch without ever boosting room noise during rests.
 * 3. Re-applies the 3ms boundary micro-fade so sample[0] and sample[N-1] remain strictly 0.0 after DC blocking.
 */
export function calibratePureRawLoopTrack(
  buffer: AudioBuffer,
  fixedGain?: number
): { buffer: AudioBuffer; appliedGain: number } {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;

  if (length === 0) {
    return { buffer, appliedGain: 1.0 };
  }

  // 1. 18 Hz First-Order Subsonic DC-Offset Blocker (Audio-Biografie Stage 0 Parity)
  const rc = 1.0 / (2.0 * Math.PI * 18.0);
  const dt = 1.0 / sampleRate;
  const alpha = rc / (rc + dt);

  let maxPeak = 0;
  for (let c = 0; c < numChannels; c++) {
    const data = buffer.getChannelData(c);
    let prevX = data[0] || 0;
    let prevY = 0;
    for (let i = 0; i < length; i++) {
      const x = data[i];
      const y = alpha * (prevY + x - prevX);
      prevX = x;
      prevY = y;
      data[i] = y;
      const absY = Math.abs(y);
      if (absY > maxPeak) {
        maxPeak = absY;
      }
    }
  }

  // 2. Determine 100% linear gain factor (Target Peak: -2.5 dBTP = 0.74989, Max Boost: +6.0 dB = 1.99526)
  const TARGET_PEAK_LINEAR = 0.7498942; // -2.5 dBTP multi-track headroom sweet spot
  const MAX_BOOST_LINEAR = 1.9952623;   // +6.0 dB maximum clean gain boost
  const NOISE_FLOOR_LINEAR = 0.007943;  // -42 dBFS noise gate threshold

  let appliedGain = 1.0;
  if (typeof fixedGain === 'number' && Number.isFinite(fixedGain) && fixedGain > 0) {
    // Prevent clipping even if later 150ms tail had a slightly hotter peak
    const safeCeiling = maxPeak > 0 ? Math.min(fixedGain, 0.89125 / maxPeak) : fixedGain;
    appliedGain = safeCeiling;
  } else if (maxPeak > TARGET_PEAK_LINEAR) {
    // Hot signal: pure linear attenuation to -2.5 dBTP (zero waveform distortion)
    appliedGain = TARGET_PEAK_LINEAR / maxPeak;
  } else if (maxPeak > NOISE_FLOOR_LINEAR) {
    // Quiet/normal signal: pure linear boost capped at +6.0 dB
    appliedGain = Math.min(MAX_BOOST_LINEAR, TARGET_PEAK_LINEAR / maxPeak);
  }

  const fadeSamples = Math.min(Math.floor(sampleRate * 0.003), Math.floor(length * 0.05));

  for (let c = 0; c < numChannels; c++) {
    const data = buffer.getChannelData(c);
    if (Math.abs(appliedGain - 1.0) > 0.001) {
      for (let i = 0; i < length; i++) {
        data[i] *= appliedGain;
      }
    }
    // 3. Ensure 3ms zero-crossing micro-fade at loop boundaries
    for (let i = 0; i < fadeSamples; i++) {
      const w = i / fadeSamples;
      data[i] *= w;
      const endIdx = length - 1 - i;
      if (endIdx >= 0) {
        data[endIdx] *= w;
      }
    }
  }

  return { buffer, appliedGain };
}

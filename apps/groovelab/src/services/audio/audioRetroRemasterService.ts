/**
 * ==============================================================================
 * CAMPUS-GROOVELAB NON-DESTRUCTIVE RETRO-REMASTERING SERVICE
 * ==============================================================================
 * Automatically upgrades existing recordings in the Aufnahmen module
 * ("Meine Studio-Aufnahmen", Vinyl-LPs & Monats-Chronik) to the 0.1% Goldstandard:
 * - Natural Clarity EQ (De-Mud 255 Hz, Natural Presence 3.5 kHz, Silk-Air 10.5 kHz)
 * - ITU-R BS.1770-4 / EBU R128 Gated Loudness Normalization to healthy -16.0 LUFS
 * - Transparent Lookahead True-Peak Limiting (-1.0 dBTP, resolves Single-Transient-Trap)
 * - Smart Boundary Silence Trimming (preserves 120ms natural breath window; skips Duets/Loops)
 * - 100% Non-Destructive: Preserves original untouched recording in `originalAudioUrl`.
 * ==============================================================================
 */

import { getBlob, storeBlob } from '../../utils/blobStorage';
import { SharedAudioEngine } from '../../utils/sharedAudioEngine';
import {
  ensureCenteredStereoAudioBuffer,
  processPureRawAudioBuffer,
  audioBufferToWavBlob,
  CURRENT_MASTERING_VERSION,
  TARGET_PURE_RAW_LUFS,
  TARGET_PEAK_DBTP,
  MAX_PURE_RAW_LIMITER_GR_DB
} from '../../utils/audioMasteringEngine';
import { applyBufferZeroPopEnvelopes } from '../../utils/audioTailEngine';

export interface RetroRemasterCandidateRecord {
  id?: string;
  url?: string;
  blobKey?: string;
  originalAudioUrl?: string;
  title?: string;
  label?: string;
  duration?: number;
  date?: string;
  isLoop?: boolean;
  isDuettTake?: boolean;
  source?: string;
  masteringVersion?: string;
  [key: string]: unknown;
}

const activeRemasterJobs = new Set<string>();

/**
 * Gently trims dead pre-roll silence (< -58 dBFS, 120ms margin) at the start
 * while preserving a generous 800ms natural acoustic decay tail (< -64 dBFS) at the end
 * so the final chord/note never cuts off abruptly.
 */
export function trimExcessiveBoundarySilence(
  ctx: BaseAudioContext,
  buffer: AudioBuffer
): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  if (length < sampleRate * 1.5) return buffer;

  const startThresholdLinear = 0.00125; // ~ -58 dBFS for pre-roll onset
  const endThresholdLinear = 0.00063;   // ~ -64 dBFS for delicate string/room decay at the end
  const startMarginSamples = Math.floor(sampleRate * 0.12); // 120ms pre-roll breath margin
  const endMarginSamples = Math.floor(sampleRate * 0.80);   // 800ms generous natural tail decay margin
  const minRetainedSamples = Math.floor(sampleRate * 1.0);

  let firstActiveSample = 0;
  let foundStart = false;
  for (let i = 0; i < length; i += 8) {
    for (let c = 0; c < numChannels; c++) {
      if (Math.abs(buffer.getChannelData(c)[i]) > startThresholdLinear) {
        firstActiveSample = Math.max(0, i - startMarginSamples);
        foundStart = true;
        break;
      }
    }
    if (foundStart) break;
  }

  let lastActiveSample = length - 1;
  let foundEnd = false;
  for (let i = length - 1; i >= firstActiveSample; i -= 8) {
    for (let c = 0; c < numChannels; c++) {
      if (Math.abs(buffer.getChannelData(c)[i]) > endThresholdLinear) {
        lastActiveSample = Math.min(length - 1, i + endMarginSamples);
        foundEnd = true;
        break;
      }
    }
    if (foundEnd) break;
  }

  const trimmedLength = lastActiveSample - firstActiveSample + 1;
  // Only trim if at least 350ms of dead boundary silence is removed and >= 1.0s of music remains
  if (
    !foundStart ||
    !foundEnd ||
    trimmedLength < minRetainedSamples ||
    length - trimmedLength < Math.floor(sampleRate * 0.35)
  ) {
    return buffer;
  }

  const trimmed = ctx.createBuffer(numChannels, trimmedLength, sampleRate);
  for (let c = 0; c < numChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = trimmed.getChannelData(c);
    dst.set(src.subarray(firstActiveSample, firstActiveSample + trimmedLength));
  }

  return trimmed;
}

/**
 * Remasters a single audio Blob to the 0.1% Natural Clarity & Healthy Loudness (-16.0 LUFS) standard.
 */
export async function remasterSingleAudioBlob(
  inputBlob: Blob,
  options?: {
    title?: string;
    preserveExactLength?: boolean;
  }
): Promise<{ wavBlob: Blob; durationSec: number }> {
  const arrayBuffer = await inputBlob.arrayBuffer();
  const audioCtx = SharedAudioEngine.getContext();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume().catch(() => {});
  }

  const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  let workingBuffer = ensureCenteredStereoAudioBuffer(audioCtx, decoded);

  if (!options?.preserveExactLength) {
    workingBuffer = trimExcessiveBoundarySilence(audioCtx, workingBuffer);
  }

  applyBufferZeroPopEnvelopes(workingBuffer, 0.005, 0.110);

  processPureRawAudioBuffer(workingBuffer, {
    targetLufs: TARGET_PURE_RAW_LUFS,
    targetPeakDb: TARGET_PEAK_DBTP,
    maxLimiterGrDb: MAX_PURE_RAW_LIMITER_GR_DB,
    applyNaturalClarity: true,
    applyLookaheadLeveler: true,
    applyOptoLeveler: true
  });

  applyBufferZeroPopEnvelopes(workingBuffer, 0.003, 0.110);

  const wavBlob = audioBufferToWavBlob(workingBuffer, {
    title: options?.title || 'Campus Studio Aufnahme',
    artist: 'Campus-Groovelab'
  });

  return {
    wavBlob,
    durationSec: Math.max(1, Math.round(workingBuffer.duration))
  };
}

/**
 * Scans and upgrades existing student recordings stored in localStorage + IndexedDB
 * to `CURRENT_MASTERING_VERSION` ('v3_hd_natural_16lufs') while preserving `originalAudioUrl`.
 */
export async function remasterExistingStudentRecordings(
  candidateStudentIds: string[]
): Promise<number> {
  if (typeof window === 'undefined' || !Array.isArray(candidateStudentIds)) return 0;

  let totalUpgraded = 0;

  for (const rawId of candidateStudentIds) {
    const studentId = String(rawId || '').trim();
    if (!studentId || activeRemasterJobs.has(studentId)) continue;

    const storageKey = `campus_junior_recordings_${studentId}`;
    const rawJson = localStorage.getItem(storageKey);
    if (!rawJson) continue;

    let parsedList: unknown;
    try {
      parsedList = JSON.parse(rawJson);
    } catch {
      continue;
    }
    if (!Array.isArray(parsedList) || parsedList.length === 0) continue;

    const records = parsedList as RetroRemasterCandidateRecord[];
    const needsUpgrade = records.some(
      (r) =>
        r &&
        typeof r === 'object' &&
        r.masteringVersion !== CURRENT_MASTERING_VERSION &&
        !r.isLoop &&
        String(r.blobKey || r.url || '').length > 0
    );

    if (!needsUpgrade) continue;

    activeRemasterJobs.add(studentId);
    try {
      let didModifyList = false;

      for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        if (!rec || typeof rec !== 'object') continue;
        if (rec.masteringVersion === CURRENT_MASTERING_VERSION || rec.isLoop) continue;

        const lookupKey = String(rec.blobKey || rec.url || '').trim();
        if (!lookupKey) continue;

        try {
          const rawExisting = await getBlob(lookupKey);
          const existingBlob = rawExisting instanceof Blob ? rawExisting : (rawExisting ? new Blob([rawExisting], { type: 'audio/wav' }) : null);
          if (!existingBlob || existingBlob.size <= 44) continue;

          // 1. Preserve non-destructive original backup before remastering
          if (!rec.originalAudioUrl) {
            const safeRecId = String(rec.id || `legacy_${Date.now()}_${i}`).replace(/[^a-zA-Z0-9_-]/g, '_');
            const backupKey = `campus_blob_orig_${studentId}_${safeRecId}.wav`;
            await storeBlob(backupKey, existingBlob);
            rec.originalAudioUrl = backupKey;
          } else {
            // If an original backup already exists, remaster from the untouched original source!
            const rawOriginal = await getBlob(String(rec.originalAudioUrl));
            const originalBlob = rawOriginal instanceof Blob ? rawOriginal : (rawOriginal ? new Blob([rawOriginal], { type: 'audio/wav' }) : null);
            if (originalBlob && originalBlob.size > 44) {
              const preserveExactLength = Boolean(rec.isDuettTake || rec.source === 'duet' || rec.source === 'practice_companion');
              const { wavBlob, durationSec } = await remasterSingleAudioBlob(originalBlob, {
                title: String(rec.title || rec.label || 'Aufnahme'),
                preserveExactLength
              });
              await storeBlob(lookupKey, wavBlob);
              if (rec.url && String(rec.url).startsWith('campus_') && rec.url !== lookupKey) {
                await storeBlob(String(rec.url), wavBlob);
              }
              rec.duration = durationSec;
              rec.masteringVersion = CURRENT_MASTERING_VERSION;
              didModifyList = true;
              totalUpgraded++;
              continue;
            }
          }

          const preserveExactLength = Boolean(rec.isDuettTake || rec.source === 'duet' || rec.source === 'practice_companion');
          const { wavBlob, durationSec } = await remasterSingleAudioBlob(existingBlob, {
            title: String(rec.title || rec.label || 'Aufnahme'),
            preserveExactLength
          });

          await storeBlob(lookupKey, wavBlob);
          if (rec.url && String(rec.url).startsWith('campus_') && rec.url !== lookupKey) {
            await storeBlob(String(rec.url), wavBlob);
          }

          rec.duration = durationSec;
          rec.masteringVersion = CURRENT_MASTERING_VERSION;
          didModifyList = true;
          totalUpgraded++;
        } catch (remasterErr) {
          console.warn('[audioRetroRemasterService] Skipping single take remaster:', remasterErr);
        }
      }

      if (didModifyList) {
        localStorage.setItem(storageKey, JSON.stringify(records));
      }
    } finally {
      activeRemasterJobs.delete(studentId);
    }
  }

  if (totalUpgraded > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('campus_junior_recordings_updated'));
    window.dispatchEvent(new Event('campus-recordings-updated'));
  }

  return totalUpgraded;
}

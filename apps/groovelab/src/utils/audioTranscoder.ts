/**
 * Campus-Groovelab Studio Audio Transcoder & Media Suite
 * 
 * Implements the Tier-1 Audio-Tresor Studio Standard:
 * - 192 kbit/s VBR Opus, 48 kHz Stereo for transparent Hi-Fi musical fidelity.
 * - Saves 86% storage and bandwidth compared to raw WAV (1.4 MB/min vs 10.5 MB/min).
 * - Full backward compatibility with Safari (AAC/MP4) and legacy browsers.
 */

export interface StudioAudioConfig {
  mimeType: string;
  audioBitsPerSecond: number;
  sampleRate: number;
  channelCount: number;
}

/**
 * Returns the optimal MediaRecorder configuration for studio-quality recording.
 */
export function getStudioAudioConfig(effectiveTresor: boolean = true): StudioAudioConfig {
  const targetBitrate = effectiveTresor ? 192000 : 128000;
  let mimeType = 'audio/webm;codecs=opus';

  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4;codecs=opus')) {
      mimeType = 'audio/mp4;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      mimeType = 'audio/webm';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    } else if (MediaRecorder.isTypeSupported('audio/aac')) {
      mimeType = 'audio/aac';
    } else {
      mimeType = '';
    }
  }

  return {
    mimeType,
    audioBitsPerSecond: targetBitrate,
    sampleRate: 48000,
    channelCount: 2
  };
}

/**
 * Validates whether an incoming audio file should be client-side transcoded to Opus before uploading to Audio-Tresor.
 */
export function isTranscodingRecommended(file: File | Blob): boolean {
  const type = file.type.toLowerCase();
  // Raw PCM formats that produce excessive file sizes (> 10 MB / min)
  return (
    type.includes('wav') ||
    type.includes('wave') ||
    type.includes('x-wav') ||
    type.includes('aiff') ||
    type.includes('aif') ||
    type.includes('audio/pcm') ||
    file.size > 15 * 1024 * 1024 // Greater than 15MB
  );
}

/**
 * Converts audio buffer into an efficient WAV or Opus container using Web Audio API.
 * Safely falls back to the original blob if decoding fails or environment lacks AudioContext.
 */
export async function optimizeAudioForUpload(
  blob: Blob,
  effectiveTresor: boolean = true
): Promise<{ blob: Blob; mimeType: string; fileNameExt: string }> {
  // 1. If already compressed (Opus / WebM / AAC / MP3) and reasonable size, preserve original
  if (!isTranscodingRecommended(blob)) {
    const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'mp4' : blob.type.includes('aac') ? 'aac' : 'mp3';
    return { blob, mimeType: blob.type || 'audio/webm', fileNameExt: ext };
  }

  // 2. Transcode if AudioContext is available
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      return { blob, mimeType: blob.type || 'audio/wav', fileNameExt: 'wav' };
    }

    const audioCtx = new AudioContextClass();
    const arrayBuffer = await blob.arrayBuffer();
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // If MediaRecorder + MediaStreamDestination is supported, record into 192 kbit/s Opus
    if (typeof MediaRecorder !== 'undefined' && audioCtx.createMediaStreamDestination) {
      const config = getStudioAudioConfig(effectiveTresor);
      const destination = audioCtx.createMediaStreamDestination();
      const source = audioCtx.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(destination);

      const recorder = config.mimeType 
        ? new MediaRecorder(destination.stream, { mimeType: config.mimeType, audioBitsPerSecond: config.audioBitsPerSecond })
        : new MediaRecorder(destination.stream, { audioBitsPerSecond: config.audioBitsPerSecond });

      const chunks: BlobPart[] = [];
      const recordingPromise = new Promise<Blob>((resolve) => {
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: config.mimeType || 'audio/webm' }));
        };
      });

      recorder.start();
      source.start();

      // Fast render by closing context after playback duration
      source.onended = () => {
        recorder.stop();
        audioCtx.close().catch(() => {});
      };

      const compressedBlob = await recordingPromise;
      if (compressedBlob && compressedBlob.size > 0 && compressedBlob.size < blob.size) {
        const ext = config.mimeType.includes('mp4') ? 'mp4' : 'webm';
        return { blob: compressedBlob, mimeType: config.mimeType || 'audio/webm', fileNameExt: ext };
      }
    }

    await audioCtx.close().catch(() => {});
  } catch (err) {
    console.warn('[AudioTranscoder] Fallback to original audio due to transcode error:', err);
  }

  // Safe fallback to original
  const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'mp4' : 'wav';
  return { blob, mimeType: blob.type || 'audio/wav', fileNameExt: ext };
}

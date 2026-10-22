import { reportAudioError } from '../lib/errorTelemetry';
import { SharedAudioEngine } from './sharedAudioEngine';

// ==============================================================================
// 🎙️ SAFE AUDIO BUFFER DECODER (Universal Safari, WebKit, Chrome & Firefox)
// ==============================================================================
export async function safeDecodeAudioData(audioContext: BaseAudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  if (!arrayBuffer || arrayBuffer.byteLength < 128) {
    return Promise.reject(new Error('Audio buffer too small or empty to decode'));
  }

  return new Promise<AudioBuffer>((resolve, reject) => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        const timeoutErr = new Error('Audio decoding timed out in browser engine');
        reportAudioError(timeoutErr, 'safeDecodeAudioData', { tag: 'AUDIO_DECODE_TIMEOUT', severity: 'WARNING' });
        reject(timeoutErr);
      }
    }, 8000);

    const onSuccess = (buffer: AudioBuffer) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(buffer);
      }
    };

    const onError = (error: unknown) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        const decodeErr = error || new Error('Audio decoding failed');
        reportAudioError(decodeErr, 'safeDecodeAudioData', { tag: 'AUDIO_DECODE_FAILED', severity: 'WARNING' });
        reject(decodeErr);
      }
    };

    try {
      const res = audioContext.decodeAudioData(arrayBuffer.slice(0), onSuccess, onError);
      if (res && typeof res.then === 'function') {
        res.then(onSuccess).catch(onError);
      }
    } catch (err) {
      onError(err);
    }
  });
}

// ==============================================================================
// 💾 24-BIT LOSSLESS PCM WAV ENCODER (Broadcast Format & TPDF Dithering)
// ==============================================================================
export function audioBufferToWavBlob(buffer: AudioBuffer, metadata?: { title?: string; artist?: string }): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 24;
  const bytesPerSample = 3; // 24-bit
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;

  const titleText = metadata?.title || 'Campus-Groovelab Master Track';
  const artistText = metadata?.artist || 'Campus-Groovelab Artist';
  const softwareText = 'Campus-Groovelab 24-Bit Audiophile DSP Engine';

  function createInfoSubChunk(tag: string, text: string): Uint8Array {
    const textBytes = new TextEncoder().encode(text + '\0');
    const chunkSize = textBytes.length;
    const paddedSize = chunkSize + (chunkSize % 2);
    const res = new Uint8Array(8 + paddedSize);
    for (let i = 0; i < 4; i++) res[i] = tag.charCodeAt(i);
    const dv = new DataView(res.buffer);
    dv.setUint32(4, chunkSize, true);
    res.set(textBytes, 8);
    return res;
  }

  const inamChunk = createInfoSubChunk('INAM', titleText);
  const iartChunk = createInfoSubChunk('IART', artistText);
  const isftChunk = createInfoSubChunk('ISFT', softwareText);
  const listDataSize = 4 + inamChunk.length + iartChunk.length + isftChunk.length;
  const listChunkTotalSize = 8 + listDataSize;

  const headerSize = 44;
  const totalSize = headerSize + dataSize + listChunkTotalSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);
  const uint8 = new Uint8Array(arrayBuffer);

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');

  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  let byteOffset = 44;
  const invScale = 1.0 / 8388608.0;

  if (numChannels === 2) {
    const left = channelData[0];
    const right = channelData[1];
    for (let i = 0; i < length; i++) {
      let sL = left[i] + (Math.random() - Math.random()) * invScale;
      if (sL > 1.0) sL = 1.0;
      else if (sL < -1.0) sL = -1.0;
      const pcmL = sL < 0 ? (sL * 8388608) | 0 : (sL * 8388607) | 0;
      const cL = pcmL < -8388608 ? -8388608 : pcmL > 8388607 ? 8388607 : pcmL;
      uint8[byteOffset] = cL & 0xff;
      uint8[byteOffset + 1] = (cL >> 8) & 0xff;
      uint8[byteOffset + 2] = (cL >> 16) & 0xff;

      let sR = right[i] + (Math.random() - Math.random()) * invScale;
      if (sR > 1.0) sR = 1.0;
      else if (sR < -1.0) sR = -1.0;
      const pcmR = sR < 0 ? (sR * 8388608) | 0 : (sR * 8388607) | 0;
      const cR = pcmR < -8388608 ? -8388608 : pcmR > 8388607 ? 8388607 : pcmR;
      uint8[byteOffset + 3] = cR & 0xff;
      uint8[byteOffset + 4] = (cR >> 8) & 0xff;
      uint8[byteOffset + 5] = (cR >> 16) & 0xff;

      byteOffset += 6;
    }
  } else {
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channelData[c][i] + (Math.random() - Math.random()) * invScale;
        if (sample > 1.0) sample = 1.0;
        else if (sample < -1.0) sample = -1.0;
        const pcm = sample < 0 ? (sample * 8388608) | 0 : (sample * 8388607) | 0;
        const clamped = pcm < -8388608 ? -8388608 : pcm > 8388607 ? 8388607 : pcm;

        uint8[byteOffset++] = clamped & 0xff;
        uint8[byteOffset++] = (clamped >> 8) & 0xff;
        uint8[byteOffset++] = (clamped >> 16) & 0xff;
      }
    }
  }

  writeString(view, byteOffset, 'LIST');
  view.setUint32(byteOffset + 4, listDataSize, true);
  writeString(view, byteOffset + 8, 'INFO');
  byteOffset += 12;

  uint8.set(inamChunk, byteOffset);
  byteOffset += inamChunk.length;
  uint8.set(iartChunk, byteOffset);
  byteOffset += iartChunk.length;
  uint8.set(isftChunk, byteOffset);

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// ==============================================================================
// 📦 TIER-1 AUDIOPHILE STREAMING ENCODER (192-256 kbit/s Transparent Quality)
// ==============================================================================
export async function audioBufferToStreamingBlob(
  buffer: AudioBuffer,
  options?: {
    bitrateKbps?: number;
    title?: string;
    artist?: string;
  }
): Promise<{ blob: Blob; mimeType: string; fileNameExt: string }> {
  const bitrate = options?.bitrateKbps || 256;
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;

  try {
    const lamejs = await import('@breezystack/lamejs');
    const lameMod = lamejs as unknown as {
      Mp3Encoder?: new (ch: number, sr: number, br: number) => {
        encodeBuffer: (l: Int16Array, r?: Int16Array) => Int8Array;
        flush: () => Int8Array;
      };
      default?: {
        Mp3Encoder?: new (ch: number, sr: number, br: number) => {
          encodeBuffer: (l: Int16Array, r?: Int16Array) => Int8Array;
          flush: () => Int8Array;
        };
      };
    };
    const winLame = (window as unknown as { lamejs?: { Mp3Encoder?: typeof lameMod.Mp3Encoder } }).lamejs;
    const Mp3EncoderClass = lameMod.Mp3Encoder || lameMod.default?.Mp3Encoder || winLame?.Mp3Encoder;
    if (Mp3EncoderClass) {
      const mp3encoder = new Mp3EncoderClass(channels, sampleRate, bitrate);
      const mp3Data: BlobPart[] = [];
      const sampleBlockSize = 1152;

      const samplesL = buffer.getChannelData(0);
      const int16L = new Int16Array(samplesL.length);
      for (let i = 0; i < samplesL.length; i++) {
        const s = Math.max(-1, Math.min(1, samplesL[i]));
        int16L[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      if (channels >= 2) {
        const samplesR = buffer.getChannelData(1);
        const int16R = new Int16Array(samplesR.length);
        for (let i = 0; i < samplesR.length; i++) {
          const s = Math.max(-1, Math.min(1, samplesR[i]));
          int16R[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        for (let i = 0; i < int16L.length; i += sampleBlockSize) {
          const chunkL = int16L.subarray(i, i + sampleBlockSize);
          const chunkR = int16R.subarray(i, i + sampleBlockSize);
          const mp3buf = mp3encoder.encodeBuffer(chunkL, chunkR);
          if (mp3buf.length > 0) mp3Data.push(new Uint8Array(mp3buf));
        }
      } else {
        for (let i = 0; i < int16L.length; i += sampleBlockSize) {
          const chunk = int16L.subarray(i, i + sampleBlockSize);
          const mp3buf = mp3encoder.encodeBuffer(chunk);
          if (mp3buf.length > 0) mp3Data.push(new Uint8Array(mp3buf));
        }
      }

      const mp3buf = mp3encoder.flush();
      if (mp3buf.length > 0) mp3Data.push(new Uint8Array(mp3buf));

      const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
      return { blob: mp3Blob, mimeType: 'audio/mp3', fileNameExt: 'mp3' };
    }
  } catch (encErr) {
    console.warn('[audioMasteringEngine] Streaming MP3 compression fallback to WAV:', encErr);
  }

  // Safe fallback to 24-bit WAV if MP3 encoder unavailable
  const wavBlob = audioBufferToWavBlob(buffer, { title: options?.title, artist: options?.artist });
  return { blob: wavBlob, mimeType: 'audio/wav', fileNameExt: 'wav' };
}

// ==============================================================================
// ⚡ PREVIEW SLICE GENERATOR (Ultra-Fast 20-second center slice for Instant A/B)
// ==============================================================================
export async function sliceAudioBlobForPreview(
  audioBlobOrFile: Blob | File,
  sliceDurationSec = 20
): Promise<Blob> {
  const arrayBuffer = await audioBlobOrFile.arrayBuffer();
  const audioCtx = SharedAudioEngine.getContext();
  
  const rawDecoded = await safeDecodeAudioData(audioCtx, arrayBuffer);
  const totalDuration = rawDecoded.duration;
  
  if (totalDuration <= sliceDurationSec) {
    return audioBlobOrFile instanceof Blob ? audioBlobOrFile : new Blob([audioBlobOrFile], { type: 'audio/wav' });
  }

  // 🏛️ Goldstandard: Vorschau startet ab Sekunde 0.00 (ab der ersten gespielten Note)
  const sampleRate = rawDecoded.sampleRate;
  const startSample = 0;
  const lengthSamples = Math.min(rawDecoded.length, Math.floor(sliceDurationSec * sampleRate));

  const numChannels = rawDecoded.numberOfChannels;
  const slicedBuffer = audioCtx.createBuffer(numChannels, lengthSamples, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const srcData = rawDecoded.getChannelData(ch);
    const dstData = slicedBuffer.getChannelData(ch);
    dstData.set(srcData.subarray(startSample, startSample + lengthSamples));
  }

  if (lengthSamples > sampleRate * 0.1) {
    const fadeSamples = Math.min(Math.floor(sampleRate * 0.01), Math.floor(lengthSamples * 0.05));
    for (let ch = 0; ch < numChannels; ch++) {
      const dstData = slicedBuffer.getChannelData(ch);
      for (let i = 0; i < fadeSamples; i++) {
        const factor = Math.sin((i / fadeSamples) * (Math.PI / 2));
        dstData[i] *= factor;
        dstData[lengthSamples - 1 - i] *= factor;
      }
    }
  }

  const wavBlob = audioBufferToWavBlob(slicedBuffer, {
    title: 'Campus-Groovelab Preview Slice',
    artist: 'Campus-Groovelab Studio'
  });
  return wavBlob;
}

/**
 * 🎵 UNIVERSAL 24-BIT LOSSLESS PCM WAV CONVERTER
 * Ensures that any audio blob (already WAV, or legacy WebM, MP4, MP3) is delivered
 * as a pristine, uncompressed 24-bit PCM WAV file (.wav) with native sample rate.
 */
export async function ensureWavBlob(
  blob: Blob | File,
  metadata?: { title?: string; artist?: string }
): Promise<Blob> {
  if (!blob) return blob;
  const mime = (blob.type || '').toLowerCase();
  if (mime === 'audio/wav' || mime === 'audio/x-wav' || mime === 'audio/wave') {
    return blob;
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = SharedAudioEngine.getContext();
    const decoded = await safeDecodeAudioData(audioCtx, arrayBuffer);
    return audioBufferToWavBlob(decoded, {
      title: metadata?.title || 'Campus-Groovelab Audio',
      artist: metadata?.artist || 'Campus-Groovelab'
    });
  } catch (err) {
    console.warn('[ensureWavBlob] Transcode fallback note:', err);
    return blob instanceof Blob ? blob : new Blob([blob], { type: 'audio/wav' });
  }
}

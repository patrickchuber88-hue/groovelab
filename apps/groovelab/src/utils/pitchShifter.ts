/**
 * 🎵 High-Performance Studio Pitch-Shifter (SOLA / WSOLA Algorithm)
 * 
 * Transposes audio pitch by ±N semitones while guaranteeing 100% constant playback speed and duration.
 * Zero external dependencies, pure Web Audio API & Float32Array SIMD-friendly math.
 */

/**
 * Linearly resample a Float32Array by a given ratio.
 */
function resampleChannel(input: Float32Array, ratio: number): Float32Array {
  const newLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIdx = i * ratio;
    const base = Math.floor(srcIdx);
    const frac = srcIdx - base;

    if (base + 1 < input.length) {
      output[i] = input[base] * (1 - frac) + input[base + 1] * frac;
    } else if (base < input.length) {
      output[i] = input[base];
    } else {
      output[i] = 0;
    }
  }

  return output;
}

/**
 * Standard SOLA (Synchronized Overlap-Add) Time-Stretch Engine.
 * Stretches or compresses the input signal to match targetLength without altering its pitch.
 */
function solaTimeStretch(input: Float32Array, targetLength: number): Float32Array {
  if (input.length === 0 || targetLength === 0) return new Float32Array(targetLength);
  if (input.length === targetLength) return new Float32Array(input);

  const output = new Float32Array(targetLength);
  const stretchRatio = targetLength / input.length;

  // Window and frame parameters optimized for music and voice (44.1kHz / 48kHz)
  const windowSize = 2048;
  const halfWindow = windowSize >> 1;
  const searchRange = 384; // Search range for cross-correlation peak
  const analysisHop = Math.round(halfWindow / stretchRatio);
  const synthesisHop = halfWindow;

  // Precompute Hann synthesis window
  const window = new Float32Array(windowSize);
  for (let i = 0; i < windowSize; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSize - 1)));
  }

  let inPos = 0;
  let outPos = 0;

  // Copy initial grain
  const initialCopyLen = Math.min(windowSize, input.length, targetLength);
  for (let i = 0; i < initialCopyLen; i++) {
    output[i] = input[i] * window[i];
  }

  outPos = synthesisHop;
  inPos = analysisHop;

  while (outPos + windowSize <= targetLength && inPos + windowSize + searchRange <= input.length) {
    // Cross-correlation search: find best alignment within [-searchRange, searchRange]
    let bestOffset = 0;
    let maxCorr = -Infinity;

    const minSearch = Math.max(-searchRange, -inPos);
    const maxSearch = Math.min(searchRange, input.length - inPos - windowSize);

    for (let offset = minSearch; offset <= maxSearch; offset += 2) {
      let corr = 0;
      const testInPos = inPos + offset;
      
      // Compute correlation over the overlap region (halfWindow)
      for (let j = 0; j < halfWindow; j += 4) {
        corr += output[outPos + j] * input[testInPos + j];
      }

      if (corr > maxCorr) {
        maxCorr = corr;
        bestOffset = offset;
      }
    }

    const alignedInPos = inPos + bestOffset;

    // Overlap-add the aligned grain with Hann crossfade
    for (let i = 0; i < windowSize; i++) {
      const outIdx = outPos + i;
      if (outIdx < targetLength && alignedInPos + i < input.length) {
        output[outIdx] += input[alignedInPos + i] * window[i];
      }
    }

    outPos += synthesisHop;
    inPos += analysisHop;
  }

  // Normalize / fade out tail if outPos didn't reach targetLength
  if (outPos < targetLength && inPos < input.length) {
    const remaining = Math.min(targetLength - outPos, input.length - inPos);
    for (let i = 0; i < remaining; i++) {
      output[outPos + i] += input[inPos + i] * (1 - i / remaining);
    }
  }

  return output;
}

/**
 * Shifts the pitch of an AudioBuffer by semitones (-12 to +12)
 * GUARANTEED INVARIANT: The output AudioBuffer has the EXACT same length, duration, and sampleRate as sourceBuffer.
 * Playback speed does not change at all.
 */
export function shiftAudioBufferPitch(
  sourceBuffer: AudioBuffer,
  semitones: number,
  audioCtx: AudioContext | BaseAudioContext
): AudioBuffer {
  if (!sourceBuffer || semitones === 0) {
    return sourceBuffer;
  }

  const pitchRatio = Math.pow(2, semitones / 12);
  const numChannels = sourceBuffer.numberOfChannels;
  const originalLength = sourceBuffer.length;
  const sampleRate = sourceBuffer.sampleRate;

  const resultBuffer = audioCtx.createBuffer(numChannels, originalLength, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const srcData = sourceBuffer.getChannelData(ch);

    // Step 1: Resample by pitchRatio (shifts pitch and scales length by 1/pitchRatio)
    const resampled = resampleChannel(srcData, pitchRatio);

    // Step 2: Time-stretch resampled signal back to originalLength via SOLA (restores duration without altering pitch)
    const stretched = solaTimeStretch(resampled, originalLength);

    // Copy to destination channel
    const destData = resultBuffer.getChannelData(ch);
    destData.set(stretched);
  }

  return resultBuffer;
}

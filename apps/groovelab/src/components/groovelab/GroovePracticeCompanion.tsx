import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2, VolumeX, Music, Clock, Sliders, RotateCcw, Mic, Zap, Activity, CheckCircle2, Sparkles, Star, BookOpen, Check, Settings, Pause, Headphones, ChevronRight, X, Minus, Plus, Bell, Maximize2, Minimize2, Flame } from 'lucide-react';
import { ACOUSTIC_STUDIO_SAMPLES } from './AcousticDrumSamples';
import { storeBlob } from '../../utils/blobStorage';
import { 
  processPureRawBlob, 
  safeDecodeAudioData, 
  ensureCenteredStereoAudioBuffer, 
  audioBufferToWavBlob, 
  processPureRawAudioBuffer,
  TARGET_PURE_RAW_LUFS,
  TARGET_PEAK_DBTP,
  MAX_PURE_RAW_LIMITER_GR_DB
} from '../../utils/audioMasteringEngine';
import { acquireAudioStream, stabilizeAudioStream, releaseAudioStream, PURE_RAW_AUDIO_CONSTRAINTS } from '../../services/audioPermissionService';
import { supabase } from '../../lib/supabase';
import { validateMediaBlob, stripAudioMetadata } from '../../utils/mediaSecurityValidator';
import { getSecureAudioUrl, buildCanonicalAudioStoragePath, computeBlobSha256 } from '../../utils/audioStorageHelper';
import { useFocusInterruptionGuard } from '../../hooks/useFocusInterruptionGuard';
import { FocusInterruptionBanner } from '../focus/FocusInterruptionBanner';
import { FocusAbortedModal } from '../focus/FocusAbortedModal';
import { extractWaveformPeaks } from '../../utils/waveformHelper';

// Helper to decode Base64 WAV into AudioBuffer with true header sample rate
const decodeBase64Wav = (ctx: AudioContext | BaseAudioContext, b64Uri: string): AudioBuffer => {
  const base64 = b64Uri.split(',')[1];
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const dataView = new DataView(bytes.buffer);
  const sr = dataView.getUint32(24, true) || 44100;
  const channels = dataView.getUint16(22, true) || 1;
  const numSamples = Math.floor((bytes.length - 44) / (2 * channels));
  const buf = ctx.createBuffer(channels, numSamples, sr);
  
  for (let ch = 0; ch < channels; ch++) {
    const chanData = buf.getChannelData(ch);
    for (let i = 0; i < numSamples; i++) {
      const raw = dataView.getInt16(44 + (i * channels + ch) * 2, true);
      chanData[i] = raw / 32768.0;
    }
  }
  return buf;
};

// 🎧 Studio Logic Pro "Klopfgeist" & Wittner Acoustic Hybrid Engine
// Beat 1 (Accent): 1.760 Hz (A6) + 3.520 Hz Snap + 880 Hz Body
// Beats 2, 3, 4:   880 Hz (A5) + 1.760 Hz Snap + 440 Hz Body
const playKlopfgeistClick = (
  ctx: AudioContext | BaseAudioContext,
  time: number,
  isAccent: boolean,
  volume: number,
  destination: AudioNode
) => {
  if (volume <= 0.001) return;
  try {
    const primaryFreq = isAccent ? 1760 : 880;
    const snapFreq = isAccent ? 3520 : 1760;
    const bodyFreq = isAccent ? 880 : 440;

    const primaryOsc = ctx.createOscillator();
    primaryOsc.type = 'sine';
    primaryOsc.frequency.setValueAtTime(primaryFreq, time);

    const snapOsc = ctx.createOscillator();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(snapFreq, time);

    const bodyOsc = ctx.createOscillator();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(bodyFreq, time);

    const clickGain = ctx.createGain();
    const peakLevel = volume * (isAccent ? 0.95 : 0.68);
    const decayTime = isAccent ? 0.026 : 0.020;

    clickGain.gain.setValueAtTime(0.0001, time);
    clickGain.gain.linearRampToValueAtTime(peakLevel, time + 0.0008);
    clickGain.gain.exponentialRampToValueAtTime(0.00001, time + decayTime);

    const snapGain = ctx.createGain();
    snapGain.gain.setValueAtTime(0.45, time);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.012);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.35, time);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + decayTime);

    primaryOsc.connect(clickGain);
    snapOsc.connect(snapGain);
    snapGain.connect(clickGain);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(clickGain);

    clickGain.connect(destination);

    primaryOsc.start(time);
    snapOsc.start(time);
    bodyOsc.start(time);

    primaryOsc.stop(time + decayTime + 0.005);
    snapOsc.stop(time + 0.015);
    bodyOsc.stop(time + decayTime + 0.005);
  } catch (_) {}
};

// 🎶 Crisp Subdivision Click (440 Hz gentle tick for eighths/triplets/16ths)
const playSubdivisionClick = (
  ctx: AudioContext | BaseAudioContext,
  time: number,
  volume: number,
  destination: AudioNode
) => {
  if (volume <= 0.001) return;
  try {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, time);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume * 0.40, time + 0.0008);
    gain.gain.exponentialRampToValueAtTime(0.00001, time + 0.015);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(time);
    osc.stop(time + 0.02);
  } catch (_) {}
};

// 🔔 Pleasant Chime Tone (for Speed-Trainer tempo ramp signal)
const playChimeTone = (ctx: AudioContext, time: number) => {
  try {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2093, time); // C7 pleasant chime
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.14, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.3);
  } catch (_) {}
};

// 🥁 High-Fidelity Studio Acoustic Drum Samples Decoders
export const renderRimBuffer = (ctx: BaseAudioContext): AudioBuffer => decodeBase64Wav(ctx, ACOUSTIC_STUDIO_SAMPLES.rim);
export const renderRideBuffer = (ctx: BaseAudioContext): AudioBuffer => decodeBase64Wav(ctx, ACOUSTIC_STUDIO_SAMPLES.ride);
export const renderShakerBuffer = (ctx: BaseAudioContext, forward = true): AudioBuffer => decodeBase64Wav(ctx, forward ? ACOUSTIC_STUDIO_SAMPLES.shakerFwd : ACOUSTIC_STUDIO_SAMPLES.shakerBack);


// 🎛️ IN-THE-BOX DIRECT-STEM BACKING-BEAT MIXER (PDC Phase-Locked & EBU R128 Mastered)
async function mixMicWithDirectBackingBeat(
  micBlob: Blob,
  bpm: number,
  style: string,
  variation: 'A' | 'B' | 'C',
  meter: string = '4/4'
): Promise<{ processedBlob: Blob; processedUrl: string; durationSec: number; waveformPeaks?: number[] }> {
  try {
    const arrayBuffer = await micBlob.arrayBuffer();
    const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    let rawMicBuffer: AudioBuffer;
    try {
      const rawDecoded = await safeDecodeAudioData(tempCtx, arrayBuffer);
      rawMicBuffer = ensureCenteredStereoAudioBuffer(tempCtx, rawDecoded);
    } finally {
      try { tempCtx.close(); } catch {}
    }

    const sampleRate = 48000;

    // 🌟 PDC (Plugin Delay Compensation):
    // Compensate for Output Latency (~25ms) + Input Latency (~30ms) + MediaRecorder Start Offset (~20ms) = ~75ms
    const LATENCY_COMPENSATION_SEC = 0.075;
    const trimSamples = Math.min(
      Math.floor(LATENCY_COMPENSATION_SEC * sampleRate),
      Math.floor(rawMicBuffer.length * 0.25)
    );

    const micBuffer = (trimSamples > 0 && rawMicBuffer.length > trimSamples)
      ? (() => {
          const compensated = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
            rawMicBuffer.numberOfChannels,
            rawMicBuffer.length - trimSamples,
            sampleRate
          ).createBuffer(rawMicBuffer.numberOfChannels, rawMicBuffer.length - trimSamples, sampleRate);

          for (let ch = 0; ch < rawMicBuffer.numberOfChannels; ch++) {
            const src = rawMicBuffer.getChannelData(ch);
            const dest = compensated.getChannelData(ch);
            dest.set(src.subarray(trimSamples));
          }
          return compensated;
        })()
      : rawMicBuffer;

    const duration = micBuffer.duration;
    const totalSamples = Math.max(1, Math.floor(duration * sampleRate));

    const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(2, totalSamples, sampleRate);

    // 1. Student Instrument (Microphone) Track - Full presence (0 dBFS)
    const micSource = offlineCtx.createBufferSource();
    micSource.buffer = micBuffer;
    const micGain = offlineCtx.createGain();
    micGain.gain.setValueAtTime(1.0, 0);
    micSource.connect(micGain);
    micGain.connect(offlineCtx.destination);
    micSource.start(0);

    // 2. Direct Backing Rhythm Track - Studio accompaniment (-14 dBFS)
    const backingMasterGain = offlineCtx.createGain();
    backingMasterGain.gain.setValueAtTime(0.20, 0);
    backingMasterGain.connect(offlineCtx.destination);

    // Decode sample buffers on offlineCtx + Physical Acoustic Modeling
    const kitBuffers: Record<string, AudioBuffer> = {
      kick: decodeBase64Wav(offlineCtx, ACOUSTIC_STUDIO_SAMPLES.kick),
      snare: decodeBase64Wav(offlineCtx, ACOUSTIC_STUDIO_SAMPLES.snare),
      hatClosed: decodeBase64Wav(offlineCtx, ACOUSTIC_STUDIO_SAMPLES.hatClosed),
      hatOpen: decodeBase64Wav(offlineCtx, ACOUSTIC_STUDIO_SAMPLES.hatOpen),
      click: decodeBase64Wav(offlineCtx, ACOUSTIC_STUDIO_SAMPLES.click),
      rim: renderRimBuffer(offlineCtx),
      ride: renderRideBuffer(offlineCtx),
      shakerFwd: renderShakerBuffer(offlineCtx, true),
      shakerBack: renderShakerBuffer(offlineCtx, false),
    };

    let lastOpenHatGainNode: GainNode | null = null;

    const playOfflineSample = (buffer: AudioBuffer, volMul = 1.0, time: number, filterNode?: BiquadFilterNode): GainNode | null => {
      if (!buffer || time >= duration) return null;
      const source = offlineCtx.createBufferSource();
      source.buffer = buffer;
      const gain = offlineCtx.createGain();
      const targetGain = volMul * 0.85;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(targetGain, time + 0.0008);

      if (filterNode) {
        source.connect(filterNode);
        filterNode.connect(gain);
      } else {
        source.connect(gain);
      }
      gain.connect(backingMasterGain);
      source.start(time);
      return gain;
    };

    // 🌟 Tonmeister Calibrated Offline Instrument Functions
    const playOfflineKick = (volMul = 1.0, time: number) => playOfflineSample(kitBuffers.kick, volMul * 1.0, time);
    const playOfflineRim = (volMul = 1.0, time: number) => playOfflineSample(kitBuffers.rim, volMul * 0.63, time);

    // 🌟 Hi-Hat Choking Engine (8ms physical pedal clamp)
    const playOfflineHat = (isOpen = false, volMul = 1.0, time: number) => {
      if (isOpen) {
        lastOpenHatGainNode = playOfflineSample(kitBuffers.hatOpen, volMul * 0.38, time);
      } else {
        if (lastOpenHatGainNode) {
          try {
            lastOpenHatGainNode.gain.setValueAtTime(volMul * 0.38 * 0.85, time);
            lastOpenHatGainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.008);
          } catch {}
          lastOpenHatGainNode = null;
        }
        playOfflineSample(kitBuffers.hatClosed, volMul * 0.45, time);
      }
    };

    // 🌟 Multi-Velocity Snare (Dynamic Ghost-Note Layer at volMul <= 0.35)
    const playOfflineSnare = (volMul = 1.0, time: number) => {
      if (volMul <= 0.35) {
        const ghostFilter = offlineCtx.createBiquadFilter();
        ghostFilter.type = 'lowpass';
        ghostFilter.frequency.setValueAtTime(2600, time);
        ghostFilter.Q.setValueAtTime(0.7, time);
        return playOfflineSample(kitBuffers.snare, volMul * 0.84, time, ghostFilter);
      }
      return playOfflineSample(kitBuffers.snare, volMul * 0.84, time);
    };

    const playOfflineRide = (volMul = 1.0, time: number) => playOfflineSample(kitBuffers.ride, volMul * 0.33, time);
    const playOfflineShaker = (forward = true, volMul = 1.0, time: number) => playOfflineSample(forward ? kitBuffers.shakerFwd : kitBuffers.shakerBack, volMul * 0.26, time);

    const isSwing = style === 'swing';
    const isWaltz = style === 'walzer';
    const isBallad = style === 'ballad68';
    const isHipHopOrFunk = style === 'hiphop' || style === 'funk';

    let stepsPerBar = isSwing ? 12 : (isWaltz ? 12 : (isBallad ? 12 : 16));
    let stepDuration = isSwing 
      ? (60.0 / bpm) / 3 
      : (isBallad ? (60.0 / bpm) / 2 : (60.0 / bpm) / 4);

    if (style === 'metronome') {
      if (meter === '3/4') {
        stepsPerBar = 12;
        stepDuration = (60.0 / bpm) / 4;
      } else if (meter === '2/4') {
        stepsPerBar = 8;
        stepDuration = (60.0 / bpm) / 4;
      } else if (meter === '6/8') {
        stepsPerBar = 12;
        stepDuration = (60.0 / bpm) / 2;
      } else {
        stepsPerBar = 16;
        stepDuration = (60.0 / bpm) / 4;
      }
    }

    let step = 0;
    while (step * stepDuration < duration) {
      const time = step * stepDuration;
      const currentStepInBar = step % stepsPerBar;

      // 🌟 MPC Micro-Swing Offset for Hip-Hop & Funk Pocket
      const microSwing = (isHipHopOrFunk && currentStepInBar % 2 === 1) ? stepDuration * 0.12 : 0;
      const hitTime = time + microSwing;

      if (style === 'metronome') {
        if (meter === '6/8') {
          const beatIdx = Math.floor(currentStepInBar / 2);
          if (currentStepInBar % 2 === 0) {
            playKlopfgeistClick(offlineCtx, hitTime, beatIdx === 0, 1.0, backingMasterGain);
          }
        } else {
          const beatIdx = Math.floor(currentStepInBar / 4);
          if (variation === 'A') {
            if (currentStepInBar % 4 === 0) playKlopfgeistClick(offlineCtx, hitTime, beatIdx === 0, 1.0, backingMasterGain);
          } else if (variation === 'B') {
            if (currentStepInBar % 2 === 0) playKlopfgeistClick(offlineCtx, hitTime, currentStepInBar === 0, 1.0, backingMasterGain);
          } else {
            playKlopfgeistClick(offlineCtx, hitTime, currentStepInBar === 0, 1.0, backingMasterGain);
          }
        }
      } else if (style === 'rock') {
        if (variation === 'A') {
          if (currentStepInBar === 0 || currentStepInBar === 8 || currentStepInBar === 10) playOfflineKick(1.0, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineSnare(1.0, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(false, currentStepInBar % 4 === 0 ? 1.0 : 0.62, hitTime);
        } else if (variation === 'B') {
          if (currentStepInBar === 0 || currentStepInBar === 6 || currentStepInBar === 8 || currentStepInBar === 10 || currentStepInBar === 14) playOfflineKick(1.0, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineSnare(1.0, hitTime);
          if (currentStepInBar === 14) playOfflineHat(true, 0.85, hitTime);
          else if (currentStepInBar % 2 === 0) playOfflineHat(false, currentStepInBar % 4 === 0 ? 1.0 : 0.65, hitTime);
        } else {
          if (currentStepInBar === 0 || currentStepInBar === 3 || currentStepInBar === 8 || currentStepInBar === 10 || currentStepInBar === 11) playOfflineKick(1.0, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineSnare(1.0, hitTime);
          else if (currentStepInBar === 7 || currentStepInBar === 15) playOfflineSnare(0.25, hitTime); // Ghost note
          if (currentStepInBar % 2 === 0) playOfflineHat(false, currentStepInBar % 4 === 0 ? 1.05 : 0.72, hitTime);
          else if (currentStepInBar === 11) playOfflineHat(false, 0.45, hitTime);
        }
      } else if (style === 'hiphop') {
        if (variation === 'A') {
          if (currentStepInBar === 0) playOfflineKick(1.3, hitTime);
          else if (currentStepInBar === 3 || currentStepInBar === 10) playOfflineKick(0.9, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineSnare(1.1, hitTime);
          else if (currentStepInBar === 7 || currentStepInBar === 15) playOfflineSnare(0.22, hitTime); // Ghost note
          if (currentStepInBar % 2 === 0) playOfflineHat(currentStepInBar === 14, currentStepInBar % 4 === 0 ? 0.9 : 0.55, hitTime);
        } else if (variation === 'B') {
          if (currentStepInBar === 0 || currentStepInBar === 2 || currentStepInBar === 8 || currentStepInBar === 10) playOfflineKick(1.2, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineSnare(1.1, hitTime);
          else if (currentStepInBar === 15) playOfflineSnare(0.25, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(false, currentStepInBar % 4 === 0 ? 0.95 : 0.62, hitTime);
        } else {
          if (currentStepInBar === 0 || currentStepInBar === 8 || currentStepInBar === 11) playOfflineKick(1.3, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineSnare(1.15, hitTime);
          if (currentStepInBar === 14 || currentStepInBar === 15) playOfflineHat(false, 0.75, hitTime);
          else if (currentStepInBar % 2 === 0) playOfflineHat(false, currentStepInBar % 4 === 0 ? 1.0 : 0.6, hitTime);
        }
      } else if (style === 'singersongwriter') {
        if (variation === 'A') {
          if (currentStepInBar === 0 || currentStepInBar === 10) playOfflineKick(0.70, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineRim(0.85, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(false, currentStepInBar % 4 === 0 ? 0.65 : 0.35, hitTime);
          playOfflineShaker(currentStepInBar % 2 === 0, 0.32, hitTime);
        } else if (variation === 'B') {
          if (currentStepInBar === 0 || currentStepInBar === 10) playOfflineKick(0.75, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineSnare(0.48, hitTime);
          else if (currentStepInBar === 7 || currentStepInBar === 15) playOfflineSnare(0.16, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(false, currentStepInBar % 4 === 0 ? 0.70 : 0.40, hitTime);
          playOfflineShaker(currentStepInBar % 2 === 0, 0.38, hitTime);
        } else {
          if (currentStepInBar === 0 || currentStepInBar === 6 || currentStepInBar === 10) playOfflineKick(0.80, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineSnare(0.55, hitTime);
          else if (currentStepInBar === 14 || currentStepInBar === 15) playOfflineRim(0.70, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(currentStepInBar === 10, currentStepInBar === 10 ? 0.70 : 0.45, hitTime);
          playOfflineShaker(currentStepInBar % 2 === 0, 0.40, hitTime);
        }
      } else if (style === 'swing') {
        if (variation === 'A') {
          // 🌟 10/10 Goldstandard: 20" Ride Cymbal & Hi-Hat Foot Chick
          if (currentStepInBar === 0 || currentStepInBar === 3 || currentStepInBar === 6 || currentStepInBar === 9) playOfflineKick(0.20, hitTime);
          if (currentStepInBar === 2) playOfflineRim(0.35, hitTime);
          else if (currentStepInBar === 8) playOfflineSnare(0.30, hitTime);
          if (currentStepInBar === 0 || currentStepInBar === 3 || currentStepInBar === 6 || currentStepInBar === 9) playOfflineRide(0.75, hitTime);
          else if (currentStepInBar === 2 || currentStepInBar === 5 || currentStepInBar === 8 || currentStepInBar === 11) playOfflineRide(0.38, hitTime);
          if (currentStepInBar === 3 || currentStepInBar === 9) playOfflineHat(false, 0.65, hitTime);
        } else if (variation === 'B') {
          if (currentStepInBar === 0 || currentStepInBar === 6) playOfflineKick(0.22, hitTime);
          if (currentStepInBar === 2 || currentStepInBar === 5 || currentStepInBar === 11) playOfflineSnare(0.38, hitTime);
          if (currentStepInBar === 0 || currentStepInBar === 3 || currentStepInBar === 6 || currentStepInBar === 9) playOfflineRide(0.80, hitTime);
          else if (currentStepInBar === 2 || currentStepInBar === 5 || currentStepInBar === 8 || currentStepInBar === 11) playOfflineRide(0.42, hitTime);
          if (currentStepInBar === 3 || currentStepInBar === 9) playOfflineHat(false, 0.70, hitTime);
        } else {
          if (currentStepInBar === 0 || currentStepInBar === 6) playOfflineKick(0.28, hitTime);
          if (currentStepInBar === 9 || currentStepInBar === 10 || currentStepInBar === 11) playOfflineSnare(0.55, hitTime);
          else if (currentStepInBar === 2 || currentStepInBar === 5) playOfflineSnare(0.26, hitTime);
          if (currentStepInBar === 0 || currentStepInBar === 3 || currentStepInBar === 6 || currentStepInBar === 9) playOfflineRide(0.75, hitTime);
          else if (currentStepInBar === 2 || currentStepInBar === 5 || currentStepInBar === 8) playOfflineRide(0.40, hitTime);
          if (currentStepInBar === 3 || currentStepInBar === 9) playOfflineHat(false, 0.68, hitTime);
        }
      } else if (style === 'latin') {
        if (variation === 'A') {
          if (currentStepInBar === 0 || currentStepInBar === 3 || currentStepInBar === 8 || currentStepInBar === 11) playOfflineKick(0.90, hitTime);
          if (currentStepInBar === 0 || currentStepInBar === 3 || currentStepInBar === 6 || currentStepInBar === 10 || currentStepInBar === 12) playOfflineRim(0.95, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(false, currentStepInBar % 4 === 0 ? 0.70 : 0.40, hitTime);
          playOfflineShaker(currentStepInBar % 2 === 0, 0.35, hitTime);
        } else if (variation === 'B') {
          if (currentStepInBar % 2 === 0) playOfflineKick(currentStepInBar % 4 === 2 ? 1.05 : 0.55, hitTime);
          if (currentStepInBar === 0 || currentStepInBar === 4 || currentStepInBar === 8 || currentStepInBar === 12) playOfflineRim(0.90, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(false, 0.65, hitTime);
          playOfflineShaker(currentStepInBar % 2 === 0, 0.40, hitTime);
        } else {
          if (currentStepInBar === 0 || currentStepInBar === 3 || currentStepInBar === 8 || currentStepInBar === 11) playOfflineKick(0.95, hitTime);
          if (currentStepInBar === 0 || currentStepInBar === 2 || currentStepInBar === 3 || currentStepInBar === 5 || currentStepInBar === 6 || currentStepInBar === 8 || currentStepInBar === 10 || currentStepInBar === 11 || currentStepInBar === 13 || currentStepInBar === 14) {
            playOfflineRim(0.80, hitTime);
          }
          if (currentStepInBar % 4 === 2) playOfflineHat(true, 0.65, hitTime);
          playOfflineShaker(currentStepInBar % 2 === 0, 0.42, hitTime);
        }
      } else if (style === 'funk') {
        if (variation === 'A') {
          if (currentStepInBar === 0 || currentStepInBar === 6 || currentStepInBar === 10 || currentStepInBar === 11) playOfflineKick(1.15, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineSnare(1.1, hitTime);
          else if (currentStepInBar === 7 || currentStepInBar === 13 || currentStepInBar === 15) playOfflineSnare(0.28, hitTime); // Ghost note
          if (currentStepInBar % 2 === 0) playOfflineHat(currentStepInBar === 6 || currentStepInBar === 14, (currentStepInBar === 6 || currentStepInBar === 14) ? 1.0 : (currentStepInBar % 4 === 0 ? 0.95 : 0.55), hitTime);
          else if (currentStepInBar === 3 || currentStepInBar === 11) playOfflineHat(false, 0.35, hitTime);
        } else if (variation === 'B') {
          if (currentStepInBar === 0 || currentStepInBar === 6 || currentStepInBar === 10) playOfflineKick(1.2, hitTime);
          else if (currentStepInBar === 4 || currentStepInBar === 12 || currentStepInBar === 14) playOfflineSnare(1.15, hitTime);
          else if (currentStepInBar === 2 || currentStepInBar === 8 || currentStepInBar === 15) playOfflineHat(false, 0.85, hitTime);
        } else {
          if (currentStepInBar === 0 || currentStepInBar === 6 || currentStepInBar === 11) playOfflineKick(1.2, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineSnare(1.1, hitTime);
          else if (currentStepInBar === 13 || currentStepInBar === 14 || currentStepInBar === 15) playOfflineSnare(0.9, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(false, 0.8, hitTime);
        }
      } else if (style === 'reggae') {
        if (variation === 'A') {
          if (currentStepInBar === 8) { playOfflineKick(1.2, hitTime); playOfflineSnare(1.05, hitTime); }
          if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineRim(0.9, hitTime);
          if (currentStepInBar === 0) playOfflineRim(0.22, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(false, (currentStepInBar === 2 || currentStepInBar === 6 || currentStepInBar === 10 || currentStepInBar === 14) ? 1.0 : 0.58, hitTime);
        } else if (variation === 'B') {
          if (currentStepInBar === 0 || currentStepInBar === 4 || currentStepInBar === 8 || currentStepInBar === 12) playOfflineKick(1.15, hitTime);
          if (currentStepInBar === 8) playOfflineSnare(1.05, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineRim(0.85, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(false, 0.88, hitTime);
        } else {
          if (currentStepInBar === 8) playOfflineKick(1.2, hitTime);
          if (currentStepInBar === 8 || currentStepInBar === 14 || currentStepInBar === 15) playOfflineSnare(1.0, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineRim(0.9, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(false, 0.8, hitTime);
        }
      } else if (style === 'walzer') {
        if (variation === 'A') {
          if (currentStepInBar === 0) playOfflineKick(1.0, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 8) { playOfflineRim(0.85, hitTime); playOfflineSnare(0.22, hitTime); }
          if (currentStepInBar % 2 === 0) playOfflineHat(false, currentStepInBar === 0 ? 0.95 : (currentStepInBar === 4 || currentStepInBar === 8 ? 0.72 : 0.45), hitTime);
        } else if (variation === 'B') {
          if (currentStepInBar === 0 || currentStepInBar === 6) playOfflineKick(0.9, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 8) playOfflineSnare(0.75, hitTime);
          if (currentStepInBar === 0 || currentStepInBar === 3 || currentStepInBar === 4 || currentStepInBar === 7 || currentStepInBar === 8 || currentStepInBar === 11) playOfflineHat(false, 0.8, hitTime);
        } else {
          if (currentStepInBar === 0) playOfflineKick(1.0, hitTime);
          if (currentStepInBar === 4) playOfflineSnare(0.7, hitTime);
          if (currentStepInBar === 8 || currentStepInBar === 9 || currentStepInBar === 10 || currentStepInBar === 11) playOfflineSnare(0.8, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(false, 0.8, hitTime);
        }
      } else if (style === 'ballad68') {
        if (variation === 'A') {
          if (currentStepInBar === 0) playOfflineKick(1.2, hitTime);
          else if (currentStepInBar === 5) playOfflineKick(0.6, hitTime);
          if (currentStepInBar === 6) playOfflineSnare(1.1, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(false, (currentStepInBar === 0 || currentStepInBar === 6) ? 1.0 : 0.6, hitTime);
        } else if (variation === 'B') {
          if (currentStepInBar === 0 || currentStepInBar === 4 || currentStepInBar === 5) playOfflineKick(1.1, hitTime);
          if (currentStepInBar === 6) playOfflineSnare(1.15, hitTime);
          else if (currentStepInBar === 11) playOfflineRim(0.5, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(false, 0.82, hitTime);
        } else {
          if (currentStepInBar === 0 || currentStepInBar === 5) playOfflineKick(1.2, hitTime);
          if (currentStepInBar === 6) playOfflineSnare(1.1, hitTime);
          else if (currentStepInBar === 10 || currentStepInBar === 11) playOfflineSnare(0.85, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(false, 0.8, hitTime);
        }
      } else if (style === 'disco') {
        if (variation === 'A') {
          if (currentStepInBar === 0 || currentStepInBar === 4 || currentStepInBar === 8 || currentStepInBar === 12) playOfflineKick(1.15, hitTime);
          if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineSnare(1.0, hitTime);
          if (currentStepInBar % 2 === 0) playOfflineHat(currentStepInBar === 2 || currentStepInBar === 6 || currentStepInBar === 10 || currentStepInBar === 14, (currentStepInBar === 2 || currentStepInBar === 6 || currentStepInBar === 10 || currentStepInBar === 14) ? 1.05 : 0.5, hitTime);
        } else if (variation === 'B') {
          // 🌟 V2: 10/10 Goldstandard Disco Groove+ (Studio 54 / Chic / Daft Punk Energy)
          if (currentStepInBar === 0 || currentStepInBar === 4 || currentStepInBar === 8 || currentStepInBar === 10 || currentStepInBar === 12) {
            playOfflineKick(currentStepInBar === 10 ? 0.95 : 1.20, hitTime);
          }
          if (currentStepInBar === 4 || currentStepInBar === 12) {
            playOfflineSnare(1.15, hitTime);
            playOfflineRim(0.70, hitTime);
          } else if (currentStepInBar === 15) {
            playOfflineSnare(0.32, hitTime);
          }
          if (currentStepInBar === 2 || currentStepInBar === 6 || currentStepInBar === 10 || currentStepInBar === 14) {
            playOfflineHat(true, 1.15, hitTime);
          } else if (currentStepInBar === 3 || currentStepInBar === 7 || currentStepInBar === 11 || currentStepInBar === 15) {
            playOfflineHat(false, 0.55, hitTime);
          } else if (currentStepInBar % 4 === 0) {
            playOfflineHat(false, 0.85, hitTime);
          } else {
            playOfflineHat(false, 0.38, hitTime);
          }
          playOfflineShaker(currentStepInBar % 2 === 0, 0.38, hitTime);
        } else {
          // 🌟 V3: Complex (Full Disco fill with rolling snares & crash transition)
          if (currentStepInBar === 0 || currentStepInBar === 4 || currentStepInBar === 8 || currentStepInBar === 10 || currentStepInBar === 11) playOfflineKick(1.15, hitTime);
          if (currentStepInBar === 4) {
            playOfflineSnare(1.15, hitTime);
            playOfflineRim(0.70, hitTime);
          } else if (currentStepInBar === 12 || currentStepInBar === 13 || currentStepInBar === 14 || currentStepInBar === 15) {
            playOfflineSnare(currentStepInBar === 12 ? 1.15 : (currentStepInBar === 13 ? 0.70 : (currentStepInBar === 14 ? 0.85 : 1.05)), hitTime);
          }
          if (currentStepInBar % 2 === 0) playOfflineHat(currentStepInBar === 2 || currentStepInBar === 6, (currentStepInBar === 2 || currentStepInBar === 6) ? 1.1 : 0.65, hitTime);
          playOfflineShaker(currentStepInBar % 2 === 0, 0.40, hitTime);
        }
      } else {
        // Steady 4/4 groove fallback
        if (currentStepInBar === 0 || currentStepInBar === 8) playOfflineKick(1.0, hitTime);
        if (currentStepInBar === 4 || currentStepInBar === 12) playOfflineSnare(0.9, hitTime);
        if (currentStepInBar % 2 === 0) playOfflineHat(false, 0.6, hitTime);
      }

      step++;
    }

    const renderedBuffer = await offlineCtx.startRendering();
    processPureRawAudioBuffer(renderedBuffer, { 
      targetLufs: TARGET_PURE_RAW_LUFS, 
      targetPeakDb: TARGET_PEAK_DBTP,
      maxLimiterGrDb: MAX_PURE_RAW_LIMITER_GR_DB
    });

    const wavBlob = audioBufferToWavBlob(renderedBuffer, {
      title: 'Campus-Groovelab Übe-Take',
      artist: 'Campus-Groovelab'
    });
    const processedUrl = URL.createObjectURL(wavBlob);
    const peaks = extractWaveformPeaks(renderedBuffer, 80);

    return {
      processedBlob: wavBlob,
      processedUrl,
      durationSec: Math.round(renderedBuffer.duration * 10) / 10,
      waveformPeaks: peaks
    };
  } catch (err) {
    console.warn('[mixMicWithDirectBackingBeat] Falling back to pure raw blob:', err);
    const fallback = await processPureRawBlob(micBlob, { 
      targetLufs: TARGET_PURE_RAW_LUFS, 
      targetPeakDb: TARGET_PEAK_DBTP,
      maxLimiterGrDb: MAX_PURE_RAW_LIMITER_GR_DB
    });
    return {
      processedBlob: fallback.processedBlob,
      processedUrl: fallback.processedUrl,
      durationSec: fallback.durationSec,
      waveformPeaks: []
    };
  }
}

export interface GroovePracticeCompanionProps {
  useNotebookLayout?: boolean;
  onRhythmScoreUpdate?: (score: number, details: { beatsCount: number; precision: number; bpm: number; songTitle?: string; stars?: number; advice?: string }) => void;
  onPracticeMinutesLogged?: (minutes: number, details: { bpm: number; style: string; styleLabel: string }) => void;
  targetBpm?: number;
  targetScore?: number;
  isCampusModule?: boolean;
  activeSongContext?: { songTitle: string; targetBpm: number; songId?: string } | null;
  studentId?: string;
  student?: any;
  uiLevel?: 'junior' | 'teen' | 'pro';
  onNavigateToRecordings?: () => void;
}

// GroovePracticeCompanion (Student Metronome & Beat Generator with Campus Rhythmus-Coach)
// --------------------------------------------------------------------------------------


export const GroovePracticeCompanion: React.FC<GroovePracticeCompanionProps> = ({ 
  useNotebookLayout,
  onRhythmScoreUpdate,
  onPracticeMinutesLogged,
  targetBpm,
  targetScore,
  isCampusModule = true,
  activeSongContext,
  studentId,
  student,
  uiLevel,
  onNavigateToRecordings
}) => {
  const effectiveUiLevel: 'junior' | 'teen' | 'pro' = uiLevel || student?.campus_ui_level || 'junior';
  const getActiveMeter = (style: string, metMeter: string) => {
    if (style === 'walzer') {
      return { meter: '3/4', beats: 3, countInBeats: 3, stepsInBar: 12, stepDivision: 4 };
    }
    if (style === 'ballad68') {
      return { meter: '6/8', beats: 6, countInBeats: 6, stepsInBar: 12, stepDivision: 2 };
    }
    if (style === 'swing') {
      return { meter: '4/4', beats: 4, countInBeats: 4, stepsInBar: 12, stepDivision: 3 };
    }
    if (style === 'metronome') {
      if (metMeter === '3/4') return { meter: '3/4', beats: 3, countInBeats: 3, stepsInBar: 12, stepDivision: 4 };
      if (metMeter === '2/4') return { meter: '2/4', beats: 2, countInBeats: 2, stepsInBar: 8, stepDivision: 4 };
      if (metMeter === '6/8') return { meter: '6/8', beats: 6, countInBeats: 6, stepsInBar: 12, stepDivision: 2 };
      return { meter: '4/4', beats: 4, countInBeats: 4, stepsInBar: 16, stepDivision: 4 };
    }
    return { meter: '4/4', beats: 4, countInBeats: 4, stepsInBar: 16, stepDivision: 4 };
  };

  const [mobileTab, setMobileTab] = useState<'metronome' | 'rhythms'>('metronome');
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768 || !!document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait');
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768 || !!document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait'));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(activeSongContext?.targetBpm || targetBpm || 120);
  const [selectedStyle, setSelectedStyle] = useState<'metronome' | 'rock' | 'hiphop' | 'swing' | 'latin' | 'funk' | 'reggae' | 'walzer' | 'ballad68' | 'disco' | 'singersongwriter'>('metronome');
  const [selectedVariation, setSelectedVariation] = useState<'A' | 'B' | 'C'>('A');
  const [metronomeMeter, setMetronomeMeter] = useState<'4/4' | '3/4' | '2/4' | '6/8'>('4/4');
  const metronomeMeterRef = useRef(metronomeMeter);
  useEffect(() => { metronomeMeterRef.current = metronomeMeter; }, [metronomeMeter]);

  const activeMeterInfo = getActiveMeter(selectedStyle, metronomeMeter);
  const [volMaster, setVolMaster] = useState(100);
  const [volKick, setVolKick] = useState(100);
  const [volSnare, setVolSnare] = useState(100);
  const [volHat, setVolHat] = useState(100);
  const [volMetronome, setVolMetronome] = useState(100);

  // 🎯 Kindgerechte Fokus-Ebenen (Sekundär-Toolbox Drawer)
  const [showAllStyles, setShowAllStyles] = useState(false);
  const [showStudioMixer, setShowStudioMixer] = useState(false);

  // 🎙️ Campus Rhythmus-Coach States & Realtime Audio Tracking
  const [rhythmCoachActive, setRhythmCoachActive] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState<1 | 2>(1);
  const [step1Count, setStep1Count] = useState<number>(0);
  const [step2Count, setStep2Count] = useState<number>(0);
  const [calibrationDoneText, setCalibrationDoneText] = useState<string | null>(null);

  const [grooveFeedback, setGrooveFeedback] = useState<{ type: 'perfect' | 'rushing' | 'dragging'; noteLabel?: string } | null>(null);
  const [rhythmScoreStats, setRhythmScoreStats] = useState<{
    totalBeats: number;
    inTime: number;
    rushing: number;
    dragging: number;
    quarters: number;
    eights: number;
    sixteenths: number;
    dotted: number;
  }>({
    totalBeats: 0,
    inTime: 0,
    rushing: 0,
    dragging: 0,
    quarters: 0,
    eights: 0,
    sixteenths: 0,
    dotted: 0
  });

  const microTimingDeltasRef = useRef<number[]>([]);

  // ⭐️ Non-XP 3-Star Summary Card State
  const [summaryCardData, setSummaryCardData] = useState<{
    stars: number;
    precision: number;
    beatsCount: number;
    barsCount: number;
    bpm: number;
    songTitle?: string;
    advice: string;
    noteDistribution?: { quartersPct: number; eightsPct: number; sixteenthsPct: number; dottedPct: number };
    microTimingDeltas?: number[];
  } | null>(null);

  // 🥁 Interactive Accent Matrix: 4-level cycle per beat: 'accent' | 'normal' | 'ghost' | 'mute'
  const [beatAccents, setBeatAccents] = useState<Array<'accent' | 'normal' | 'ghost' | 'mute'>>(['accent', 'normal', 'normal', 'normal']);
  const beatAccentsRef = useRef(beatAccents);
  useEffect(() => { beatAccentsRef.current = beatAccents; }, [beatAccents]);

  // Update beat accents array when meter changes
  useEffect(() => {
    const numBeats = activeMeterInfo.beats;
    setBeatAccents(prev => {
      const next = Array(numBeats).fill('normal') as Array<'accent' | 'normal' | 'ghost' | 'mute'>;
      next[0] = 'accent';
      for (let i = 1; i < numBeats; i++) {
        if (prev[i]) next[i] = prev[i];
      }
      return next;
    });
  }, [activeMeterInfo.beats]);

  const toggleBeatAccent = (index: number) => {
    setBeatAccents(prev => {
      const next = [...prev];
      const curr = next[index] || 'normal';
      const cycle: Record<'accent' | 'normal' | 'ghost' | 'mute', 'accent' | 'normal' | 'ghost' | 'mute'> = {
        accent: 'normal',
        normal: 'ghost',
        ghost: 'mute',
        mute: 'accent'
      };
      next[index] = cycle[curr];
      return next;
    });
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(20); } catch (_) {}
    }
  };

  // 🎶 Subdivisions: '1' (Viertel), '2' (Achtel), '3' (Triolen), '4' (16tel)
  const [subdivision, setSubdivision] = useState<'1' | '2' | '3' | '4'>('1');
  const subdivisionRef = useRef(subdivision);
  useEffect(() => { subdivisionRef.current = subdivision; }, [subdivision]);

  // ⚡ Speed-Trainer States
  const [speedTrainerActive, setSpeedTrainerActive] = useState(false);
  const [speedTrainerTargetBpm, setSpeedTrainerTargetBpm] = useState(Math.min(240, (activeSongContext?.targetBpm || targetBpm || 120) + 20));
  const [speedTrainerIntervalBars, setSpeedTrainerIntervalBars] = useState(4);
  const [speedTrainerStep, setSpeedTrainerStep] = useState(2);
  const [speedTrainerBarsUntilNext, setSpeedTrainerBarsUntilNext] = useState(4);
  const speedTrainerActiveRef = useRef(speedTrainerActive);
  const speedTrainerTargetBpmRef = useRef(speedTrainerTargetBpm);
  const speedTrainerIntervalBarsRef = useRef(speedTrainerIntervalBars);
  const speedTrainerStepRef = useRef(speedTrainerStep);
  useEffect(() => { speedTrainerActiveRef.current = speedTrainerActive; }, [speedTrainerActive]);
  useEffect(() => { speedTrainerTargetBpmRef.current = speedTrainerTargetBpm; }, [speedTrainerTargetBpm]);
  useEffect(() => { speedTrainerIntervalBarsRef.current = speedTrainerIntervalBars; }, [speedTrainerIntervalBars]);
  useEffect(() => { speedTrainerStepRef.current = speedTrainerStep; }, [speedTrainerStep]);

  // 🧠 Mute-Bar Inner-Clock Challenge States
  const [muteBarActive, setMuteBarActive] = useState(false);
  const [muteBarMode, setMuteBarMode] = useState<'3_plus_1' | '1_plus_1'>('3_plus_1');
  const [isCurrentBarMuted, setIsCurrentBarMuted] = useState(false);
  const muteBarActiveRef = useRef(muteBarActive);
  const muteBarModeRef = useRef(muteBarMode);
  const isCurrentBarMutedRef = useRef(false);
  useEffect(() => { muteBarActiveRef.current = muteBarActive; }, [muteBarActive]);
  useEffect(() => { muteBarModeRef.current = muteBarMode; }, [muteBarMode]);

  // 🔔 Stimmgabel / Chamber Pitch (440 Hz / 442 Hz)
  const [chamberPitch, setChamberPitch] = useState<0 | 440 | 442>(0);
  const chamberOscRef = useRef<OscillatorNode | null>(null);
  const chamberGainRef = useRef<GainNode | null>(null);
  const chamberCtxRef = useRef<AudioContext | null>(null);

  const stopChamberPitch = () => {
    if (chamberOscRef.current && chamberGainRef.current && chamberCtxRef.current) {
      try {
        const ctx = chamberCtxRef.current;
        chamberGainRef.current.gain.setValueAtTime(chamberGainRef.current.gain.value, ctx.currentTime);
        chamberGainRef.current.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
        setTimeout(() => {
          try {
            chamberOscRef.current?.stop();
            chamberCtxRef.current?.close();
          } catch {}
          chamberOscRef.current = null;
          chamberGainRef.current = null;
          chamberCtxRef.current = null;
        }, 50);
      } catch {}
    }
    setChamberPitch(0);
  };

  const playChamberPitch = (freq: 440 | 442) => {
    if (chamberPitch === freq) {
      stopChamberPitch();
      return;
    }
    stopChamberPitch();
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      chamberCtxRef.current = ctx;
      chamberOscRef.current = osc;
      chamberGainRef.current = gain;
      setChamberPitch(freq);
    } catch (e) {
      console.error('Failed to play chamber pitch:', e);
    }
  };

  // ⛶ Notenständer-Modus (Full Stage View) & Ambient Border Flash
  const [isStageView, setIsStageView] = useState(false);
  const [ambientBorderFlash, setAmbientBorderFlash] = useState<'accent' | 'regular' | null>(null);
  const ambientFlashTimeoutRef = useRef<any>(null);

  // 🛠️ Studio-Modal for "Übe-Werkzeuge"
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showToolsModal) {
        setShowToolsModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showToolsModal]);

  // ⏱️ Zero-Click Smart Practice Diary Session Timer
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);
  const sessionStartTimeRef = useRef<number | null>(null);
  const sessionElapsedSecondsRef = useRef<number>(0);
  const [sessionLoggedToast, setSessionLoggedToast] = useState<{ minutes: number; bpm: number; styleLabel: string } | null>(null);
  const totalBarsCountRef = useRef(0);

  // 🔴 Recording Engine & 4-Beat Count-In States
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isCountingIn, setIsCountingIn] = useState(false);
  const [countInBeat, setCountInBeat] = useState<number>(1);
  const [pendingPreviewTake, setPendingPreviewTake] = useState<{ id: string; blob: Blob; blobUrl: string; duration: number; title: string; label: string; date: Date; bpm: number; style: string; waveformPeaks?: number[] } | null>(null);
  const [savedTakeSuccessToast, setSavedTakeSuccessToast] = useState<string | null>(null);
  const [isSavingTake, setIsSavingTake] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewProgress, setPreviewProgress] = useState(0);

  const [limitReachedToast, setLimitReachedToast] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordAudioCtxRef = useRef<AudioContext | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const countInIntervalRef = useRef<any>(null);
  const countInPendingRef = useRef<boolean>(false);
  const countInTimersRef = useRef<any[]>([]);
  const limitTimerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const isRecordingRef = useRef(false);
  const isCountingInRef = useRef(false);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { isCountingInRef.current = isCountingIn; }, [isCountingIn]);

  // 🛡️ Hardware & Sperrzeiten Safety: Stop audio when requested
  useEffect(() => {
    const handleForceStopAudio = () => {
      setIsPlaying(false);
      setRhythmCoachActive(false);
      if (isRecordingRef.current) {
        setIsRecording(false);
      }
      try {
        if (typeof window !== 'undefined') {
          (window as any).__campus_is_audio_recording = false;
        }
      } catch (e) {}
    };
    window.addEventListener('campus_force_stop_audio', handleForceStopAudio);
    return () => window.removeEventListener('campus_force_stop_audio', handleForceStopAudio);
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const isRecOrPlaying = isPlaying || isRecording || rhythmCoachActive;
        (window as any).__campus_is_audio_recording = isRecOrPlaying;
      }
    } catch (e) {}
  }, [isPlaying, isRecording, rhythmCoachActive]);

  // ⏱️ Zero-Click Smart Practice Diary: Session Time Tracker
  useEffect(() => {
    if (isPlaying && !isRecording) {
      if (!sessionStartTimeRef.current) {
        sessionStartTimeRef.current = Date.now();
      }
      const interval = setInterval(() => {
        if (sessionStartTimeRef.current) {
          const secs = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
          sessionElapsedSecondsRef.current = secs;
          setSessionElapsedSeconds(secs);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      if (sessionStartTimeRef.current) {
        const totalSecs = sessionElapsedSecondsRef.current;
        sessionStartTimeRef.current = null;
        sessionElapsedSecondsRef.current = 0;
        setSessionElapsedSeconds(0);

        // Quality gate: Session must be at least 120 seconds (2 minutes)
        if (totalSecs >= 120) {
          const mins = Math.round(totalSecs / 60);
          const styleLabels: Record<string, string> = {
            metronome: 'Metronom Klick',
            rock: 'Rock & Pop Groove',
            hiphop: 'Hip-Hop Pocket',
            singersongwriter: 'Singer-Songwriter',
            swing: 'Jazz Swing',
            latin: 'Latin Bossa',
            funk: 'Funk Break',
            reggae: 'Reggae One-Drop',
            walzer: 'Walzer',
            ballad68: '6/8 Ballade',
            disco: 'Disco'
          };
          const styleLabel = styleLabels[selectedStyle] || selectedStyle;

          if (onPracticeMinutesLogged) {
            onPracticeMinutesLogged(mins, { bpm, style: selectedStyle, styleLabel });
          }

          setSessionLoggedToast({
            minutes: mins,
            bpm,
            styleLabel
          });
          setTimeout(() => {
            setSessionLoggedToast(null);
          }, 5000);
        }
      }
    }
  }, [isPlaying, isRecording, selectedStyle, bpm, onPracticeMinutesLogged]);

  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const scheduledBeatTimesRef = useRef<number[]>([]);
  const lastTransientTimeRef = useRef<number>(0);
  const calibratedThresholdRef = useRef<number>(0.045);
  const getInitialLatency = () => {
    const saved = localStorage.getItem('groovelab_latency_offset');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 140; // True round-trip hardware latency baseline for WebAudio
  };
  const calibratedLatencyOffsetRef = useRef<number>(getInitialLatency());
  const feedbackTimerRef = useRef<any>(null);
  const onRhythmScoreUpdateRef = useRef(onRhythmScoreUpdate);

  useEffect(() => {
    onRhythmScoreUpdateRef.current = onRhythmScoreUpdate;
  }, [onRhythmScoreUpdate]);

  useEffect(() => {
    if (activeSongContext?.targetBpm) {
      setBpm(activeSongContext.targetBpm);
      const isCalibrated = localStorage.getItem('groovelab_latency_calibrated') === 'true';
      if (!isCalibrated) {
        handleStartCalibration();
      } else {
        setRhythmCoachActive(true);
      }
    }
  }, [activeSongContext]);

  // 🎛️ Exact Loopstation Cubase Auto-Einmessung States
  const [isLoopstationCalibrating, setIsLoopstationCalibrating] = useState(false);
  const [loopstationPhaseState, setLoopstationPhaseState] = useState<'idle' | 'ambient' | 'clicks' | 'result'>('idle');
  const [loopstationClickCount, setLoopstationClickCount] = useState<number>(0);
  const [loopstationMicLevel, setLoopstationMicLevel] = useState<number>(0);
  const [loopstationLatencyResult, setLoopstationLatencyResult] = useState<number>(140);
  const loopstationStreamRef = useRef<MediaStream | null>(null);

  // 🎙️ Instrument 3-Tone Einpegeln States
  const [liveMicLevelPct, setLiveMicLevelPct] = useState<number>(0);
  const [instrumentToneCount, setInstrumentToneCount] = useState<number>(0);
  const [instrumentToneDoneText, setInstrumentToneDoneText] = useState<string | null>(null);
  const [isInstrumentCalibrating, setIsInstrumentCalibrating] = useState<boolean>(false);

  // Toggle Rhythm Coach with Forced Initial Calibration Guard
  const toggleRhythmCoach = () => {
    const isCalibrated = localStorage.getItem('groovelab_latency_calibrated') === 'true';
    if (!rhythmCoachActive && !isCalibrated) {
      handleStartCalibration(true);
      return;
    }
    const next = !rhythmCoachActive;
    setRhythmCoachActive(next);
    if (next) {
      setSelectedStyle('metronome');
    }
  };

  // Smart Cascade Calibration Handler
  const handleStartCalibration = (forceLoopstationCheck: boolean = false) => {
    setSelectedStyle('metronome');
    const isForce = typeof forceLoopstationCheck === 'boolean' ? forceLoopstationCheck : false;
    const isCalibrated = localStorage.getItem('groovelab_latency_calibrated') === 'true';

    if (!isCalibrated || isForce) {
      runLoopstationAutoCalibration();
    } else {
      runInstrumentToneCalibration();
    }
  };

  // Ref to hold step 1 ambient sound timer
  const ambientToneTimerRef = useRef<any>(null);
  const calibrationAudioCtxRef = useRef<AudioContext | null>(null);
  const calibrationAnalyserRef = useRef<AnalyserNode | null>(null);

  // 1️⃣ Loopstation Cubase 15 Pro Auto-Einmessung Engine
  const runLoopstationAutoCalibration = async () => {
    setIsLoopstationCalibrating(true);
    setLoopstationPhaseState('ambient');
    setLoopstationClickCount(0);
    setLoopstationMicLevel(0);

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      calibrationAudioCtxRef.current = audioCtx;

      const stream = await acquireAudioStream({ audio: PURE_RAW_AUDIO_CONSTRAINTS });
      await stabilizeAudioStream(stream, 300);
      loopstationStreamRef.current = stream;

      const micSource = audioCtx.createMediaStreamSource(stream);

      // 🎛️ DSP Biquad Bandpass Filter (1800Hz, Q=2.5)
      // Filters out keyboard typing clicks, table thumps & ambient hum by 90%, isolating only metronome chirp frequencies
      const bandpassFilter = audioCtx.createBiquadFilter();
      bandpassFilter.type = 'bandpass';
      bandpassFilter.frequency.setValueAtTime(1800, audioCtx.currentTime);
      bandpassFilter.Q.setValueAtTime(2.5, audioCtx.currentTime);

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;

      micSource.connect(bandpassFilter);
      bandpassFilter.connect(analyser);
      calibrationAnalyserRef.current = analyser;

      const pcmData = new Float32Array(analyser.fftSize);

      // 🎚️ 60 FPS Frequency-Selective Peak-Decay VU Envelope Follower
      let animFrameId: number;
      let peakRms = 0;

      const updateMicLevel = () => {
        if (!calibrationAudioCtxRef.current || calibrationAudioCtxRef.current.state === 'closed') return;

        analyser.getFloatTimeDomainData(pcmData);
        let sumSq = 0;
        for (let i = 0; i < pcmData.length; i++) {
          sumSq += pcmData[i] * pcmData[i];
        }
        const currentRms = Math.sqrt(sumSq / pcmData.length);

        if (currentRms > peakRms) {
          peakRms = currentRms;
        } else {
          peakRms = peakRms * 0.90; // Smooth VU decay
        }

        // Calibrated level formula for filtered metronome frequency band
        const levelPct = Math.min(100, Math.round(Math.pow(peakRms, 0.40) * 1450));
        setLoopstationMicLevel(levelPct);

        animFrameId = requestAnimationFrame(updateMicLevel);
      };

      animFrameId = requestAnimationFrame(updateMicLevel);

      // Play pleasant, comfortable metronome test chirp pulses (0.16 gain) every 400ms
      if (ambientToneTimerRef.current) clearInterval(ambientToneTimerRef.current);
      ambientToneTimerRef.current = setInterval(() => {
        try {
          if (audioCtx && audioCtx.state === 'running') {
            const t = audioCtx.currentTime;
            const freqs = [1200, 2400];
            freqs.forEach(f => {
              const osc = audioCtx.createOscillator();
              const g = audioCtx.createGain();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(f, t);
              g.gain.setValueAtTime(0.16, t);
              g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
              osc.connect(g);
              g.connect(audioCtx.destination);
              osc.start(t);
              osc.stop(t + 0.055);
            });
          }
        } catch (_) {}
      }, 400);
    } catch (err) {
      console.warn("Loopstation auto calibration error:", err);
      setIsLoopstationCalibrating(false);
      runInstrumentToneCalibration();
    }
  };

  // Proceed from Schritt 1 to Schritt 2 (Metronom-Pings Latenz-Messung)
  const proceedToStep2PingCalibration = async () => {
    if (ambientToneTimerRef.current) {
      clearInterval(ambientToneTimerRef.current);
      ambientToneTimerRef.current = null;
    }

    const audioCtx = calibrationAudioCtxRef.current;
    const analyser = calibrationAnalyserRef.current;
    if (!audioCtx || !analyser || !loopstationStreamRef.current) return;

    setLoopstationPhaseState('clicks');
    const pcmData = new Float32Array(analyser.fftSize);
    const dynamicPeakThreshold = 0.015;
    const pingDeltas: number[] = [];

    for (let pingIdx = 1; pingIdx <= 5; pingIdx++) {
      setLoopstationClickCount(pingIdx);

      const pingAudioTime = audioCtx.currentTime + 0.04;
      const pingWallStart = performance.now();

      const freqs = [1000, 2200, 3400]; // Multi-harmonic chirp burst
      freqs.forEach(f => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, pingAudioTime);
        gain.gain.setValueAtTime(0.33, pingAudioTime);
        gain.gain.setValueAtTime(0.33, pingAudioTime + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, pingAudioTime + 0.045);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(pingAudioTime);
        osc.stop(pingAudioTime + 0.045);
      });

      // Capture mic peak window with high-precision performance.now() linked to AudioContext clock
      let maxPeak = 0;
      let peakWallTime = 0;

      const sampleInterval = setInterval(() => {
        analyser.getFloatTimeDomainData(pcmData);
        const now = performance.now();
        for (let i = 0; i < pcmData.length; i++) {
          const absVal = Math.abs(pcmData[i]);
          if (absVal > maxPeak) {
            maxPeak = absVal;
            peakWallTime = now;
          }
        }
      }, 5);

      await new Promise(r => setTimeout(r, 420));
      clearInterval(sampleInterval);

      if (maxPeak >= dynamicPeakThreshold && peakWallTime > pingWallStart) {
        const delta = Math.round(peakWallTime - pingWallStart - 40);
        if (delta > 20 && delta < 500) {
          pingDeltas.push(delta);
        }
      }
    }

    // Stop mic stream
    if (loopstationStreamRef.current) {
      loopstationStreamRef.current.getTracks().forEach(t => t.stop());
      loopstationStreamRef.current = null;
    }

    // Compute final calibrated offset using Cubase Median Outlier Filter
    let finalOffsetMs = 0;
    if (pingDeltas.length > 0) {
      const sorted = [...pingDeltas].sort((a, b) => a - b);
      let trimmed = sorted;
      if (sorted.length >= 4) {
        trimmed = sorted.slice(1, sorted.length - 1);
      }
      const medianAvg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
      finalOffsetMs = Math.max(15, Math.min(450, Math.round(medianAvg)));
    } else {
      const baseLat = (audioCtx.baseLatency || 0.005) * 1000;
      const outLat = (audioCtx.outputLatency || 0.020) * 1000;
      finalOffsetMs = Math.round(baseLat + outLat + 95);
    }

    audioCtx.close();

    setLoopstationLatencyResult(finalOffsetMs);
    calibratedLatencyOffsetRef.current = finalOffsetMs;

    // 🔗 Save shared latency calibration globally (Loopstation + Rhythmus-Coach sync)
    try {
      localStorage.setItem('groovelab_latency_offset', finalOffsetMs.toString());
      localStorage.setItem('groovelab_latency_calibrated', 'true');
    } catch (_) {}

    setLoopstationPhaseState('result');
  };

  // 2️⃣ Instrument 3-Tone Einpegeln Engine
  const runInstrumentToneCalibration = () => {
    setIsInstrumentCalibrating(true);
    setInstrumentToneCount(0);
    setInstrumentToneDoneText(null);

    acquireAudioStream({ audio: PURE_RAW_AUDIO_CONSTRAINTS }).then(stream => {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const pcmBuffer = new Float32Array(analyser.fftSize);
      let maxPeak = 0;
      let count = 0;
      let lastTransient = 0;

      // Audio confirmation ping when a tone is locked in
      const playLockPing = () => {
        try {
          const t = audioCtx.currentTime;
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, t);
          g.gain.setValueAtTime(0.2, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
          osc.connect(g);
          g.connect(audioCtx.destination);
          osc.start(t);
          osc.stop(t + 0.09);
        } catch (_) {}
      };

      const checkInterval = setInterval(() => {
        analyser.getFloatTimeDomainData(pcmBuffer);
        let sum = 0;
        for (let i = 0; i < pcmBuffer.length; i++) {
          const val = Math.abs(pcmBuffer[i]);
          sum += val * val;
          if (val > maxPeak) maxPeak = val;
        }
        const rms = Math.sqrt(sum / pcmBuffer.length);
        const now = audioCtx.currentTime;
        setLiveMicLevelPct(Math.round(Math.min(100, (rms / 0.12) * 100)));

        if (rms > 0.04 && (now - lastTransient) > 0.45) {
          lastTransient = now;
          count += 1;
          setInstrumentToneCount(count);
          playLockPing();

          if (count >= 3) {
            clearInterval(checkInterval);
            stream.getTracks().forEach(t => t.stop());
            audioCtx.close();

            calibratedThresholdRef.current = Math.max(0.025, Math.min(0.25, maxPeak * 0.42 || 0.045));
            setInstrumentToneDoneText("Instrument fertig eingepeigelt! 🎯");

            setTimeout(() => {
              setIsInstrumentCalibrating(false);
              setRhythmCoachActive(true);
            }, 800);
          }
        }
      }, 25);
    }).catch(err => {
      console.warn("Instrument tone calibration error:", err);
      setIsInstrumentCalibrating(false);
    });
  };
  
  const [mutedInstruments, setMutedInstruments] = useState<string[]>([]);
  const [soloedInstruments, setSoloedInstruments] = useState<string[]>([]);
  
  const [activeBeatIndex, setActiveBeatIndex] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0.0);
  const current16thNoteRef = useRef(0);
  const timerIdRef = useRef<any>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const [barProgress, setBarProgress] = useState(0);
  const barStartAudioTimeRef = useRef<number>(0);
  const progressFrameRef = useRef<number | null>(null);

  // Refs to allow real-time volume, variation, and solo/mute adjustments without rebuilding the scheduler loop
  const volMasterRef = useRef(volMaster);
  const volKickRef = useRef(volKick);
  const volSnareRef = useRef(volSnare);
  const volHatRef = useRef(volHat);
  const volMetronomeRef = useRef(volMetronome);
  const selectedVariationRef = useRef(selectedVariation);
  const mutedInstrumentsRef = useRef(mutedInstruments);
  const soloedInstrumentsRef = useRef(soloedInstruments);

  useEffect(() => {
    volMasterRef.current = volMaster;
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime((volMaster / 100) * 1.5, audioCtxRef.current.currentTime);
    }
  }, [volMaster]);
  useEffect(() => { volKickRef.current = volKick; }, [volKick]);
  useEffect(() => { volSnareRef.current = volSnare; }, [volSnare]);
  useEffect(() => { volHatRef.current = volHat; }, [volHat]);
  useEffect(() => { volMetronomeRef.current = volMetronome; }, [volMetronome]);
  useEffect(() => { selectedVariationRef.current = selectedVariation; }, [selectedVariation]);
  useEffect(() => { mutedInstrumentsRef.current = mutedInstruments; }, [mutedInstruments]);
  useEffect(() => { soloedInstrumentsRef.current = soloedInstruments; }, [soloedInstruments]);

  const toggleMute = (inst: string) => {
    setMutedInstruments(prev => 
      prev.includes(inst) ? prev.filter(x => x !== inst) : [...prev, inst]
    );
  };
  const toggleSolo = (inst: string) => {
    setSoloedInstruments(prev => 
      prev.includes(inst) ? prev.filter(x => x !== inst) : [...prev, inst]
    );
  };
  const isMuted = (inst: string) => mutedInstruments.includes(inst);
  const isSolo = (inst: string) => soloedInstruments.includes(inst);

  // Keep bpm and style in refs to update scheduler on the fly without closing AudioContext
  const bpmRef = useRef(bpm);
  const selectedStyleRef = useRef(selectedStyle);
  const isPlayingRef = useRef(isPlaying);
  const sampleBufferCacheRef = useRef<Record<string, Record<string, AudioBuffer>>>({});
  const activeOpenHatGainsRef = useRef<GainNode[]>([]);

  const getOrCreateGenreSampleBuffers = (ctx: AudioContext, genre: string): Record<string, AudioBuffer> => {
    if (sampleBufferCacheRef.current[genre]) {
      return sampleBufferCacheRef.current[genre];
    }

    // Decode REAL Studio Recorded PCM WAV Samples & Sterile Quartz Digital Metronome Click
    const kickBuf = decodeBase64Wav(ctx, ACOUSTIC_STUDIO_SAMPLES.kick);
    const snareBuf = decodeBase64Wav(ctx, ACOUSTIC_STUDIO_SAMPLES.snare);
    const hatClosedBuf = decodeBase64Wav(ctx, ACOUSTIC_STUDIO_SAMPLES.hatClosed);
    const hatOpenBuf = decodeBase64Wav(ctx, ACOUSTIC_STUDIO_SAMPLES.hatOpen);
    const clickBuf = decodeBase64Wav(ctx, ACOUSTIC_STUDIO_SAMPLES.click);

    const kitBuffers: Record<string, AudioBuffer> = {
      kick: kickBuf,
      snare: snareBuf,
      hatClosed: hatClosedBuf,
      hatOpen: hatOpenBuf,
      click: clickBuf,
      rim: renderRimBuffer(ctx),
      ride: renderRideBuffer(ctx),
      shakerFwd: renderShakerBuffer(ctx, true),
      shakerBack: renderShakerBuffer(ctx, false),
    };

    sampleBufferCacheRef.current[genre] = kitBuffers;
    return kitBuffers;
  };

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { selectedStyleRef.current = selectedStyle; }, [selectedStyle]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const tapTimesRef = useRef<number[]>([]);
  const handleTapTempo = () => {
    const now = performance.now();
    tapTimesRef.current = [...tapTimesRef.current.filter(t => now - t < 2000), now];
    if (tapTimesRef.current.length >= 2) {
      const intervals = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      setBpm(Math.max(40, Math.min(240, calculatedBpm)));
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleStopAll = () => {
    if (countInIntervalRef.current) {
      clearInterval(countInIntervalRef.current);
      countInIntervalRef.current = null;
    }
    if (limitTimerRef.current) {
      clearInterval(limitTimerRef.current);
      limitTimerRef.current = null;
    }
    countInTimersRef.current.forEach(t => clearTimeout(t));
    countInTimersRef.current = [];
    countInPendingRef.current = false;
    setIsCountingIn(false);
    setIsPlaying(false);
    setRecordSeconds(0);
    activeOpenHatGainsRef.current = [];

    if (isRecordingRef.current) {
      setIsRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.warn('[GroovePracticeCompanion] Error stopping mediaRecorder:', err);
        }
      }
    }

    if (recordAudioCtxRef.current && recordAudioCtxRef.current.state !== 'closed') {
      try {
        recordAudioCtxRef.current.close();
      } catch {}
      recordAudioCtxRef.current = null;
    }
    setIsCurrentBarMuted(false);
    isCurrentBarMutedRef.current = false;
    totalBarsCountRef.current = 0;
  };

  const handleTogglePlay = () => {
    stopChamberPitch();
    if (isPlaying || isRecording || isCountingIn) {
      handleStopAll();
    } else {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      setIsPlaying(true);
    }
  };

  const startCountInAndRecord = async () => {
    try {
      const stream = await acquireAudioStream({ audio: PURE_RAW_AUDIO_CONSTRAINTS });
      recordingStreamRef.current = stream;

      // 🎙️ Direct Hardware Stream Capture (Zero WebAudio resampler / Zero pitch shift):
      // Passes hardware stream directly to MediaRecorder, eliminating clock drift & Safari WebKit pitch artifacts.
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
        else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/aac')) mimeType = 'audio/aac';
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;
        const rawBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        let finalBlob = rawBlob;
        let blobUrl = '';
        let durationSec = Math.max(1, Math.round((Date.now() - (recordingStartTimeRef.current || Date.now())) / 1000));

        const styleNames: Record<string, string> = {
          metronome: 'Metronom Klick',
          singersongwriter: 'Singer-Songwriter (Akustik)',
          rock: 'Rock & Pop Groove',
          hiphop: 'Hip-Hop Pocket',
          swing: 'Jazz Swing',
          latin: 'Latin Bossa',
          funk: 'Funk Break',
          reggae: 'Reggae One-Drop',
          walzer: 'Walzer (3/4 Takt)',
          ballad68: '6/8 Ballade',
          disco: 'Disco (4-on-the-Floor)'
        };
        const rhythmLabel = styleNames[selectedStyleRef.current || 'metronome'] || 'Begleit-Rhythmus';
        const recTitle = `Übe-Begleiter: ${rhythmLabel} (${bpmRef.current} BPM)`;

        let takePeaks: number[] = [];
        try {
          const mixResult = await mixMicWithDirectBackingBeat(
            rawBlob,
            bpmRef.current,
            selectedStyleRef.current,
            selectedVariationRef.current,
            metronomeMeterRef.current
          );
          if (mixResult.waveformPeaks && mixResult.waveformPeaks.length > 0) {
            takePeaks = mixResult.waveformPeaks;
          }
          finalBlob = mixResult.processedBlob;
          blobUrl = mixResult.processedUrl;
          if (mixResult.durationSec) durationSec = Math.round(mixResult.durationSec);
        } catch (dspErr) {
          console.warn('[GroovePracticeCompanion] Direct Beat Mix fallback:', dspErr);
          try {
            const pureRawRes = await processPureRawBlob(rawBlob, { 
              targetLufs: TARGET_PURE_RAW_LUFS, 
              targetPeakDb: TARGET_PEAK_DBTP,
              maxLimiterGrDb: MAX_PURE_RAW_LIMITER_GR_DB
            });
            finalBlob = pureRawRes.processedBlob;
            blobUrl = pureRawRes.processedUrl;
            if (pureRawRes.durationSec) durationSec = Math.round(pureRawRes.durationSec);
          } catch (e) {
            blobUrl = URL.createObjectURL(rawBlob);
          }
        }

        const recId = `stud-${Date.now()}`;

        setPendingPreviewTake({
          id: recId,
          blob: finalBlob,
          blobUrl: blobUrl,
          duration: durationSec,
          title: recTitle,
          label: recTitle,
          date: new Date(),
          bpm: bpmRef.current,
          style: selectedStyleRef.current,
          waveformPeaks: takePeaks
        });
        setPreviewCurrentTime(0);
        setPreviewProgress(0);
        setIsPreviewPlaying(false);

        if (recordingStreamRef.current) {
          recordingStreamRef.current.getTracks().forEach(t => t.stop());
          recordingStreamRef.current = null;
        }
        if (recordAudioCtxRef.current && recordAudioCtxRef.current.state !== 'closed') {
          try {
            recordAudioCtxRef.current.close();
          } catch {}
          recordAudioCtxRef.current = null;
        }
      };

      // 🌟 3. Unified AudioContext & Seamless Count-In Engine
      countInPendingRef.current = true;
      setIsCountingIn(true);
      setCountInBeat(1);

      if (isPlaying) {
        // Restart seamlessly with count-in
        setIsPlaying(false);
        setTimeout(() => setIsPlaying(true), 25);
      } else {
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Microphone access failed for practice recording:', err);
      setIsCountingIn(false);
      setIsRecording(false);
      alert('Mikrofon-Zugriff nicht möglich. Bitte erlaube das Mikrofon in den Browser-Einstellungen.');
    }
  };

  const handleToggleRecording = () => {
    if (isRecording || isCountingIn) {
      handleStopAll();
    } else {
      startCountInAndRecord();
    }
  };

  const handleTogglePreviewPlay = () => {
    if (!pendingPreviewTake?.blobUrl) return;
    if (!previewAudioRef.current || previewAudioRef.current.src !== pendingPreviewTake.blobUrl) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(pendingPreviewTake.blobUrl);
      audio.ontimeupdate = () => {
        setPreviewCurrentTime(audio.currentTime);
        setPreviewProgress(pendingPreviewTake.duration ? (audio.currentTime / pendingPreviewTake.duration) * 100 : 0);
      };
      audio.onended = () => {
        setIsPreviewPlaying(false);
        setPreviewProgress(0);
        setPreviewCurrentTime(0);
      };
      previewAudioRef.current = audio;
    }
    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().catch(() => {});
      setIsPreviewPlaying(true);
    }
  };

  const handleSavePendingTake = async () => {
    if (!pendingPreviewTake) return;
    setIsSavingTake(true);

    try {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        setIsPreviewPlaying(false);
      }

      const recId = pendingPreviewTake.id;
      const blobKey = `campus_audio_${recId}_raw`;
      await storeBlob(blobKey, pendingPreviewTake.blob).catch(() => {});

      // Derive song tag if practiced in an active song context
      const songTag = typeof activeSongContext === 'string'
        ? activeSongContext
        : ((activeSongContext as any)?.songTitle || (activeSongContext as any)?.title || (activeSongContext as any)?.name || undefined);

      const newRec = {
        id: recId,
        url: blobKey,
        blobKey: blobKey,
        previewUrl: pendingPreviewTake.blobUrl,
        duration: pendingPreviewTake.duration,
        date: pendingPreviewTake.date.toISOString(),
        title: pendingPreviewTake.title,
        label: pendingPreviewTake.label,
        visibility: 'private',
        source: 'practice_companion',
        bpm: pendingPreviewTake.bpm,
        style: pendingPreviewTake.style,
        songTag,
        waveformPeaks: pendingPreviewTake.waveformPeaks || [],
        cloudSyncStatus: 'pending' as const
      };

      // 🛡️ Multi-Tenant & Aliasing Safe candidate resolution across all possible ID representations
      const candidateStudentIds = Array.from(new Set([
        studentId,
        student?.id,
        (student as any)?.student_id,
        (student as any)?.studentId,
        (student as any)?.canonical_uuid,
        (student as any)?.slot_id,
        (() => {
          try {
            const u = localStorage.getItem('groovelab_user') || localStorage.getItem('campus_user');
            if (u) return JSON.parse(u).id;
          } catch {}
          return null;
        })()
      ].filter(Boolean))) as string[];

      const primaryStudentId = candidateStudentIds[0] || 'student-default';
      const targetSchoolId = student?.school_id || (student as any)?.schoolId || localStorage.getItem('campus_school_id') || localStorage.getItem('groovelab_school_id') || 'global';

      // 1. Optimistic Local Persistence across all candidate keys
      candidateStudentIds.forEach(cid => {
        const juniorKey = `campus_junior_recordings_${cid}`;
        let existing: any[] = [];
        try {
          const stored = localStorage.getItem(juniorKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) existing = parsed;
          }
        } catch {}
        const updated = [newRec, ...existing.filter((r: any) => r.id !== recId && r.url !== blobKey)];
        localStorage.setItem(juniorKey, JSON.stringify(updated));
      });

      // ⚡ Dispatch events on both event contracts for 100% reactive parity
      candidateStudentIds.forEach(cid => {
        window.dispatchEvent(new CustomEvent('campus_junior_recordings_updated', { detail: { studentId: cid } }));
        window.dispatchEvent(new CustomEvent('campus-recordings-updated', { detail: { studentId: cid } }));
      });
      window.dispatchEvent(new Event('campus_junior_recordings_updated'));
      window.dispatchEvent(new Event('campus-recordings-updated'));
      window.dispatchEvent(new Event('storage'));

      setSavedTakeSuccessToast(pendingPreviewTake.title);
      setTimeout(() => setSavedTakeSuccessToast(null), 4000);

      // Keep reference to take for background sync before clearing pendingPreviewTake
      const currentTake = pendingPreviewTake;
      setPendingPreviewTake(null);

      // ☁️ 2. Revisionssicherer Tier-1 Enterprise+ Background Cloud-Sync (Non-blocking with 10s Guard)
      (async () => {
        try {
          const takeBlob = currentTake.blob;
          const contentType = takeBlob.type || 'audio/webm';
          const fileExt = contentType.includes('mp4') ? 'mp4' : (contentType.includes('ogg') ? 'ogg' : 'webm');
          const fileName = `${recId}.${fileExt}`;
          const filePath = buildCanonicalAudioStoragePath(targetSchoolId, primaryStudentId, 'practice_companion', fileName);

          // 🛡️ Enterprise Child Privacy: Strip device metadata / hardware fingerprints
          const sanitizedBlob = await stripAudioMetadata(takeBlob);
          const checksum = await computeBlobSha256(sanitizedBlob);

          // 🛡️ Anti-Malware Ingestion Gate
          const validation = await validateMediaBlob(sanitizedBlob, 'audio', contentType);
          if (!validation.isValid) {
            console.warn('[GroovePracticeCompanion] Media validation blocked upload:', validation.reason);
            return;
          }

          // Resilient Upload with 10s Timeout Guard
          const uploadPromise = supabase.storage
            .from('campus-assets')
            .upload(filePath, sanitizedBlob, {
              contentType,
              upsert: true,
              cacheControl: 'private, max-age=3600'
            });

          const timeoutPromise = new Promise<{ error: Error }>((_, reject) =>
            setTimeout(() => reject(new Error('Storage upload timeout')), 10000)
          );

          const uploadRes = await Promise.race([uploadPromise, timeoutPromise]) as any;

          if (uploadRes && !uploadRes.error) {
            const cloudUrl = await getSecureAudioUrl(filePath, 'campus-assets', 300);
            if (cloudUrl) {
              // Cache also in IndexedDB under cloudUrl for instantaneous offline/online playback
              await storeBlob(cloudUrl, sanitizedBlob).catch(() => {});

              // Stilles Upgrade in allen candidate IDs
              candidateStudentIds.forEach(cid => {
                const jKey = `campus_junior_recordings_${cid}`;
                try {
                  const stored = localStorage.getItem(jKey);
                  if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                      const upgraded = parsed.map((r: any) => {
                        if (r.id === recId || r.url === blobKey) {
                          return {
                            ...r,
                            url: cloudUrl,
                            cloudSyncStatus: 'synced',
                            cloudPath: filePath,
                            checksumSha256: checksum
                          };
                        }
                        return r;
                      });
                      localStorage.setItem(jKey, JSON.stringify(upgraded));
                    }
                  }
                } catch {}
              });

              // Reaktiv benachrichtigen
              window.dispatchEvent(new Event('campus_junior_recordings_updated'));
              window.dispatchEvent(new Event('storage'));
            }
          }

          // Optional: Quota Accounting in schools table (Audio-Tresor Quota)
          if (targetSchoolId && targetSchoolId !== 'global' && sanitizedBlob.size) {
            try {
              const { data: schoolData } = await supabase
                .from('schools')
                .select('storage_used_bytes')
                .eq('id', targetSchoolId)
                .maybeSingle();
              if (schoolData) {
                const currentBytes = Number(schoolData.storage_used_bytes || 0);
                await supabase
                  .from('schools')
                  .update({ storage_used_bytes: currentBytes + sanitizedBlob.size })
                  .eq('id', targetSchoolId);
              }
            } catch {}
          }
        } catch (syncErr) {
          console.warn('[GroovePracticeCompanion] Background cloud upload note (local playback fully intact):', syncErr);
        }
      })();
    } catch (e) {
      console.error('Error saving take:', e);
    } finally {
      setIsSavingTake(false);
    }
  };

  const handleDiscardPendingTake = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (pendingPreviewTake?.blobUrl) {
      try { URL.revokeObjectURL(pendingPreviewTake.blobUrl); } catch {}
    }
    setIsPreviewPlaying(false);
    setPreviewProgress(0);
    setPreviewCurrentTime(0);
    setPendingPreviewTake(null);
  };

  useEffect(() => {
    return () => {
      if (countInIntervalRef.current) clearInterval(countInIntervalRef.current);
      if (limitTimerRef.current) clearInterval(limitTimerRef.current);
      countInTimersRef.current.forEach(t => clearTimeout(t));
      countInTimersRef.current = [];
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (recordAudioCtxRef.current && recordAudioCtxRef.current.state !== 'closed') {
        try {
          recordAudioCtxRef.current.close();
        } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      if (progressFrameRef.current) cancelAnimationFrame(progressFrameRef.current);
      countInTimersRef.current.forEach(t => clearTimeout(t));
      countInTimersRef.current = [];
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setActiveBeatIndex(null);
      setBarProgress(0);
      return;
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = (volMasterRef.current / 100) * 1.5;

    // 🎚️ Master Studio Bus Compressor & Limiter (100% Pure, Dry, Ring-Free Audio)
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, audioCtx.currentTime);
    compressor.knee.setValueAtTime(4, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(4.0, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.015, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.12, audioCtx.currentTime);

    // 🌟 3D Studio Room Ambience bus (-22 dB diffuse wooden studio reflection)
    const roomGain = audioCtx.createGain();
    roomGain.gain.setValueAtTime(0.08, audioCtx.currentTime); // subtle -22 dB
    const roomDelayL = audioCtx.createDelay();
    roomDelayL.delayTime.setValueAtTime(0.019, audioCtx.currentTime);
    const roomDelayR = audioCtx.createDelay();
    roomDelayR.delayTime.setValueAtTime(0.027, audioCtx.currentTime);
    const roomFilter = audioCtx.createBiquadFilter();
    roomFilter.type = 'lowpass';
    roomFilter.frequency.setValueAtTime(4200, audioCtx.currentTime);

    const roomMerger = audioCtx.createChannelMerger(2);
    roomDelayL.connect(roomMerger, 0, 0);
    roomDelayR.connect(roomMerger, 0, 1);
    roomMerger.connect(roomFilter);
    roomFilter.connect(roomGain);
    roomGain.connect(compressor);

    // Direct Dry Signal + Parallel Acoustic Room Glue
    masterGain.connect(compressor);
    masterGain.connect(roomDelayL);
    masterGain.connect(roomDelayR);
    compressor.connect(audioCtx.destination);
    masterGainRef.current = masterGain;

    const bufferSize = audioCtx.sampleRate * 0.25;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    noiseBufferRef.current = noiseBuffer;

    countInTimersRef.current.forEach(t => clearTimeout(t));
    countInTimersRef.current = [];

    const isCountInActive = countInPendingRef.current;
    countInPendingRef.current = false;

    const secondsPerBeat = 60.0 / bpmRef.current;
    const initialStartTime = audioCtx.currentTime + 0.05;

    if (isCountInActive) {
      const activeMeter = getActiveMeter(selectedStyleRef.current, metronomeMeterRef.current);
      const totalCountInBeats = activeMeter.countInBeats;
      const countInInterval = activeMeter.meter === '6/8' ? (secondsPerBeat / 2) : secondsPerBeat;
      const rhythmStart = initialStartTime + totalCountInBeats * countInInterval;

      // 1. Audio Scheduling for Count-In Clicks (Audio Thread)
      for (let b = 0; b < totalCountInBeats; b++) {
        const clickTime = initialStartTime + b * countInInterval;
        const isAccent = b === 0;
        playKlopfgeistClick(audioCtx, clickTime, isAccent, isAccent ? 0.95 : 0.75, masterGain);
      }

      // 2. Visual UI Counters (Synchronized to Audio Clock)
      setCountInBeat(1);
      const timers: any[] = [];
      for (let b = 1; b < totalCountInBeats; b++) {
        const clickTime = initialStartTime + b * countInInterval;
        timers.push(setTimeout(() => setCountInBeat(b + 1), Math.max(0, (clickTime - audioCtx.currentTime) * 1000)));
      }

      // 3. Exact Seamless Transition to Measure 1 Beat 1 (0ms Delay)
      const tRec = setTimeout(() => {
        setIsCountingIn(false);
        setIsRecording(true);
        setRecordSeconds(0);
        recordingStartTimeRef.current = Date.now();

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
          try {
            mediaRecorderRef.current.start(100);
          } catch (e) {
            console.error('Failed to start media recorder:', e);
          }
        }

        if (limitTimerRef.current) clearInterval(limitTimerRef.current);
        limitTimerRef.current = setInterval(() => {
          const elapsed = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
          setRecordSeconds(elapsed);
          if (elapsed >= 420) {
            setLimitReachedToast(true);
            handleStopAll();
          }
        }, 1000);
      }, Math.max(0, (rhythmStart - audioCtx.currentTime) * 1000));

      countInTimersRef.current = [...timers, tRec];

      nextNoteTimeRef.current = rhythmStart;
      barStartAudioTimeRef.current = rhythmStart;
      current16thNoteRef.current = 0;
    } else {
      nextNoteTimeRef.current = initialStartTime;
      barStartAudioTimeRef.current = initialStartTime;
      current16thNoteRef.current = 0;
    }

    const syncBarProgress = () => {
      if (!audioCtxRef.current || !isPlayingRef.current) return;
      const ctx = audioCtxRef.current;
      const secondsPerBeat = 60.0 / bpmRef.current;
      const meterInfo = getActiveMeter(selectedStyleRef.current, metronomeMeterRef.current);
      const secondsPerBar = meterInfo.stepsInBar * (secondsPerBeat / meterInfo.stepDivision);
      
      const elapsed = ctx.currentTime - barStartAudioTimeRef.current;
      const progressPercent = Math.min(100, Math.max(0, (elapsed / secondsPerBar) * 100));
      setBarProgress(progressPercent);
      progressFrameRef.current = requestAnimationFrame(syncBarProgress);
    };
    progressFrameRef.current = requestAnimationFrame(syncBarProgress);

    const scheduler = () => {
      while (nextNoteTimeRef.current < audioCtx.currentTime + 0.1) {
        scheduleNote(current16thNoteRef.current, nextNoteTimeRef.current, audioCtx, masterGain);
        advanceNote();
      }
    };

    const advanceNote = () => {
      const secondsPerBeat = 60.0 / bpmRef.current;
      const meterInfo = getActiveMeter(selectedStyleRef.current, metronomeMeterRef.current);
      const stepsInBar = meterInfo.stepsInBar;
      const stepDuration = secondsPerBeat / meterInfo.stepDivision;

      nextNoteTimeRef.current += stepDuration;
      current16thNoteRef.current = (current16thNoteRef.current + 1) % stepsInBar;
      
      if (current16thNoteRef.current === 0) {
        barStartAudioTimeRef.current = nextNoteTimeRef.current;
        totalBarsCountRef.current++;

        // ⚡ Speed-Trainer Progression (Automated tempo ramp)
        if (speedTrainerActiveRef.current) {
          const interval = speedTrainerIntervalBarsRef.current || 4;
          const barsLeft = interval - (totalBarsCountRef.current % interval);
          setSpeedTrainerBarsUntilNext(barsLeft === 0 ? interval : barsLeft);
          if (totalBarsCountRef.current % interval === 0) {
            const target = speedTrainerTargetBpmRef.current;
            const step = speedTrainerStepRef.current || 2;
            if (bpmRef.current < target) {
              const newBpm = Math.min(target, bpmRef.current + step);
              bpmRef.current = newBpm;
              setBpm(newBpm);
              playChimeTone(audioCtx, nextNoteTimeRef.current);
            }
          }
        }

        // 🧠 Mute-Bar Challenge State (Bar mute cycle)
        if (muteBarActiveRef.current) {
          const is3plus1 = muteBarModeRef.current === '3_plus_1';
          const cycleLen = is3plus1 ? 4 : 2;
          const barInCycle = totalBarsCountRef.current % cycleLen;
          const shouldMute = is3plus1 ? (barInCycle === 3) : (barInCycle === 1);
          isCurrentBarMutedRef.current = shouldMute;
          setIsCurrentBarMuted(shouldMute);
        } else {
          isCurrentBarMutedRef.current = false;
          setIsCurrentBarMuted(false);
        }
      }
    };

    timerIdRef.current = setInterval(scheduler, 25);
    return () => {
      clearInterval(timerIdRef.current);
      if (progressFrameRef.current) cancelAnimationFrame(progressFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [isPlaying]);

  // 🎙️ Realtime Microphone Audio Transient Tracker for Campus Rhythmus-Coach
  useEffect(() => {
    if (!isPlaying || !rhythmCoachActive) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
      setGrooveFeedback(null);
      return;
    }

    let animFrameId: number;

    acquireAudioStream({ audio: PURE_RAW_AUDIO_CONSTRAINTS }).then(stream => {
      micStreamRef.current = stream;

      const initTracking = () => {
        const ctx = audioCtxRef.current;
        if (!ctx || ctx.state === 'closed') {
          setTimeout(initTracking, 50);
          return;
        }

        try {
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.2;
          source.connect(analyser);
          analyserNodeRef.current = analyser;

          const pcmBuffer = new Float32Array(analyser.fftSize);

          const checkTransient = () => {
            const currentCtx = audioCtxRef.current;
            if (!currentCtx || currentCtx.state === 'closed' || !isPlayingRef.current) return;
            analyser.getFloatTimeDomainData(pcmBuffer);

            // Calculate RMS energy of current audio frame
            let sum = 0;
            for (let i = 0; i < pcmBuffer.length; i++) {
              sum += pcmBuffer[i] * pcmBuffer[i];
            }
            const rms = Math.sqrt(sum / pcmBuffer.length);
            const now = currentCtx.currentTime;

            // Dynamic adaptive RMS threshold for 100% reliable mic detection across all instruments & claps
            const activeThreshold = Math.max(0.012, Math.min(calibratedThresholdRef.current || 0.022, 0.032));

            // Check if transient exceeds calibrated noise threshold & refractory period (160ms)
            if (rms > activeThreshold && (now - lastTransientTimeRef.current) > 0.16) {
              lastTransientTimeRef.current = now;

              // 🎼 Metronom-Klick Verankerungs-Engine (DAW-Grade Precision Anchor)
              const beats = scheduledBeatTimesRef.current;
              if (beats.length > 0) {
                let closestBeat = beats[0];
                let minDiffSec = Math.abs(now - closestBeat);
                for (const b of beats) {
                  const d = Math.abs(now - b);
                  if (d < minDiffSec) {
                    minDiffSec = d;
                    closestBeat = b;
                  }
                }

                const quarterSec = 60.0 / bpmRef.current;
                const barElapsed = Math.max(0, now - barStartAudioTimeRef.current);
                const posInBeats = (barElapsed / quarterSec) % 4.0;
                const beatFraction = posInBeats - Math.floor(posInBeats);

                // 🎯 100% Complete Metric Sub-Beat Window Partitioning (Viertel ♩, Achtel ♪, 16tel 𝅘𝅥𝅯, Punktiert ♩.)
                let noteType: 'quarter' | 'eight' | 'sixteenth' | 'dotted' = 'quarter';

                if (beatFraction <= 0.18 || beatFraction >= 0.82) {
                  noteType = 'quarter'; // ♩ Viertelnote (±18% des Hauptbeats)
                } else if (Math.abs(beatFraction - 0.50) <= 0.14) {
                  // Check if dotted syncopation on beat 1.5 or 3.5
                  if (Math.abs(posInBeats - 1.5) < 0.18 || Math.abs(posInBeats - 3.5) < 0.18) {
                    noteType = 'dotted'; // ♩. Punktierte Viertel/Achtel Synkope
                  } else {
                    noteType = 'eight'; // ♪ Achtelnote auf dem Off-Beat
                  }
                } else {
                  noteType = 'sixteenth'; // 𝅘𝅥𝅯 16tel Subdivision (0.25 oder 0.75)
                }

                const diffMs = ((now - closestBeat) * 1000) - calibratedLatencyOffsetRef.current;

                microTimingDeltasRef.current.push(Math.round(diffMs));
                if (microTimingDeltasRef.current.length > 40) {
                  microTimingDeltasRef.current.shift();
                }

                let feedbackType: 'perfect' | 'rushing' | 'dragging' = 'perfect';
                if (Math.abs(diffMs) <= 35) {
                  feedbackType = 'perfect';
                } else if (diffMs < -35 && diffMs >= -120) {
                  feedbackType = 'rushing';
                } else if (diffMs > 35 && diffMs <= 120) {
                  feedbackType = 'dragging';
                }

                const noteLabel = noteType === 'quarter' ? '♩ Viertel' : (noteType === 'eight' ? '♪ Achtel' : (noteType === 'sixteenth' ? '𝅘𝅥𝅯 16tel' : '♩. Punktiert'));
                setGrooveFeedback({ type: feedbackType, noteLabel });
                if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
                feedbackTimerRef.current = setTimeout(() => setGrooveFeedback(null), 340);

                setRhythmScoreStats(prev => {
                  const newTotal = prev.totalBeats + 1;
                  const newInTime = prev.inTime + (feedbackType === 'perfect' ? 1 : 0);
                  const newRushing = prev.rushing + (feedbackType === 'rushing' ? 1 : 0);
                  const newDragging = prev.dragging + (feedbackType === 'dragging' ? 1 : 0);

                  const precisionPct = Math.round((newInTime / newTotal) * 100);
                  if (onRhythmScoreUpdateRef.current) {
                    onRhythmScoreUpdateRef.current(precisionPct, {
                      beatsCount: newTotal,
                      precision: precisionPct,
                      bpm: bpmRef.current
                    });
                  }

                  return {
                    totalBeats: newTotal,
                    inTime: newInTime,
                    rushing: newRushing,
                    dragging: newDragging,
                    quarters: prev.quarters + (noteType === 'quarter' ? 1 : 0),
                    eights: prev.eights + (noteType === 'eight' ? 1 : 0),
                    sixteenths: prev.sixteenths + (noteType === 'sixteenth' ? 1 : 0),
                    dotted: prev.dotted + (noteType === 'dotted' ? 1 : 0)
                  };
                });
              }
            }
            animFrameId = requestAnimationFrame(checkTransient);
          };

          animFrameId = requestAnimationFrame(checkTransient);
        } catch (err) {
          console.warn("Error setting up mic media stream source:", err);
        }
      };

      initTracking();
    }).catch(err => {
      console.warn('Microphone access for Campus Rhythmus-Coach unavailable:', err);
      setRhythmCoachActive(false);
    });

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
    };
  }, [isPlaying, rhythmCoachActive]);

  const scheduleNote = (step: number, time: number, ctx: AudioContext, masterGain: GainNode) => {
    const getEffectiveVolume = (id: string, baseVol: number) => {
      if (soloedInstrumentsRef.current.length > 0 && !soloedInstrumentsRef.current.includes(id)) {
        return 0;
      }
      if (mutedInstrumentsRef.current.includes(id)) {
        return 0;
      }
      return baseVol / 100;
    };

    const kVol = getEffectiveVolume('kick', volKickRef.current);
    const sVol = getEffectiveVolume('snare', volSnareRef.current);
    const hVol = getEffectiveVolume('hat', volHatRef.current);
    const mVol = getEffectiveVolume('click', volMetronomeRef.current);

    const style = selectedStyleRef.current;
    const kitBuffers = getOrCreateGenreSampleBuffers(ctx, style);

    // 🌟 MPC Micro-Swing Offset for Hip-Hop & Funk Pocket (56% Shuffle feel)
    const isHipHopOrFunk = style === 'hiphop' || style === 'funk';
    const microSwingOffset = (isHipHopOrFunk && step % 2 === 1) ? ((60.0 / bpmRef.current) / 4) * 0.12 : 0;
    const noteTime = time + microSwingOffset;

    // 🌟 Hi-Hat Choking Engine (8ms physical pedal clamp)
    const chokeOpenHats = (atTime: number) => {
      const gains = activeOpenHatGainsRef.current;
      activeOpenHatGainsRef.current = [];
      for (const g of gains) {
        try {
          g.gain.cancelScheduledValues(atTime);
          g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), atTime);
          g.gain.exponentialRampToValueAtTime(0.0001, atTime + 0.008);
        } catch {}
      }
    };

    // High-End Sample Playback with Micro-Ramp (Zero Clicking & Phase-Locked Metronome Alignment)
    const playSample = (buffer: AudioBuffer, vol: number, volMultiplier = 1.0, pitchJitter = 0.0, filterNode?: BiquadFilterNode): GainNode | null => {
      if (vol <= 0.001 || !buffer) return null;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      if (pitchJitter > 0) {
        source.playbackRate.value = 1 + (Math.random() * 2 - 1) * pitchJitter;
      }
      const gain = ctx.createGain();
      const targetGain = vol * volMultiplier * 0.85;
      // Micro 0.8ms linear ramp prevents DC zero-crossing clicks & pops
      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(targetGain, noteTime + 0.0008);
      
      if (filterNode) {
        source.connect(filterNode);
        filterNode.connect(gain);
      } else {
        source.connect(gain);
      }
      gain.connect(masterGain);
      source.start(noteTime);
      return gain;
    };

    // 🎚️ Tonmeister Studio Mix Calibration:
    const playKick = (volMul = 1.0) => playSample(kitBuffers.kick, kVol, volMul * 1.0, 0.008);

    // 🌟 Multi-Velocity Snare (Dynamic Ghost-Note Layer at volMul <= 0.35)
    const playSnare = (volMul = 1.0) => {
      if (volMul <= 0.35) {
        const ghostFilter = ctx.createBiquadFilter();
        ghostFilter.type = 'lowpass';
        ghostFilter.frequency.setValueAtTime(2600, noteTime);
        ghostFilter.Q.setValueAtTime(0.7, noteTime);
        return playSample(kitBuffers.snare, sVol, volMul * 0.84, 0.022, ghostFilter);
      }
      return playSample(kitBuffers.snare, sVol, volMul * 0.84, 0.015);
    };

    const playRimClick = (volMul = 1.0) => playSample(kitBuffers.rim, sVol, volMul * 0.63, 0.010);

    // 🌟 Hi-Hat with automatic Choking on pedal closing
    const playHat = (isOpen = false, volMul = 1.0) => {
      if (isOpen) {
        const g = playSample(kitBuffers.hatOpen, hVol, volMul * 0.38, 0.018);
        if (g) activeOpenHatGainsRef.current.push(g);
        return g;
      } else {
        chokeOpenHats(noteTime);
        return playSample(kitBuffers.hatClosed, hVol, volMul * 0.45, 0.018);
      }
    };

    // 🌟 Supplementary Studio Instruments (Warm Ride & Organic Shaker)
    const playRide = (volMul = 1.0) => playSample(kitBuffers.ride, hVol, volMul * 0.33, 0.012);
    const playShaker = (forward = true, volMul = 1.0) => playSample(forward ? kitBuffers.shakerFwd : kitBuffers.shakerBack, hVol, volMul * 0.26, 0.025);
    const playClick = (isAccent = false) => playKlopfgeistClick(ctx, noteTime, isAccent, selectedStyleRef.current === 'metronome' ? mVol : mVol * 0.75, masterGain);

    const triggerVisualBeat = (beatIdx: number) => {
      // Record scheduled quarter beat timestamp for Rhythmus-Coach transient alignment
      scheduledBeatTimesRef.current.push(time);
      if (scheduledBeatTimesRef.current.length > 30) {
        scheduledBeatTimesRef.current.shift();
      }

      ctx.resume().then(() => {
        setActiveBeatIndex(beatIdx);
        const isAccent = beatIdx === 0;
        setAmbientBorderFlash(isAccent ? 'accent' : 'regular');
        if (ambientFlashTimeoutRef.current) clearTimeout(ambientFlashTimeoutRef.current);
        ambientFlashTimeoutRef.current = setTimeout(() => {
          setAmbientBorderFlash(null);
        }, isAccent ? 120 : 70);

        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(isAccent ? 25 : 12); } catch (_) {}
        }
      });
    };

    const isSwing = selectedStyleRef.current === 'swing';
    const variant = selectedVariationRef.current; // 'A', 'B' or 'C'
    const isMutedBar = isCurrentBarMutedRef.current;

    if (selectedStyleRef.current === 'metronome') {
      const meterInfo = getActiveMeter('metronome', metronomeMeterRef.current);
      if (meterInfo.meter === '6/8') {
        const beatIdx = Math.floor(step / 2);
        if (step % 2 === 0) {
          const accentType = beatAccentsRef.current[beatIdx] || (beatIdx === 0 ? 'accent' : 'normal');
          if (!isMutedBar && accentType !== 'mute') {
            const isAcc = accentType === 'accent';
            const gainMul = accentType === 'ghost' ? 0.30 : (isAcc ? 1.0 : 0.75);
            playKlopfgeistClick(ctx, noteTime, isAcc, mVol * gainMul, masterGain);
          }
          triggerVisualBeat(beatIdx);
        }
      } else {
        const beatIdx = Math.floor(step / 4);
        const isMainBeat = step % 4 === 0;
        if (isMainBeat) {
          const accentType = beatAccentsRef.current[beatIdx] || (beatIdx === 0 ? 'accent' : 'normal');
          if (!isMutedBar && accentType !== 'mute') {
            const isAcc = accentType === 'accent';
            const gainMul = accentType === 'ghost' ? 0.30 : (isAcc ? 1.0 : 0.75);
            playKlopfgeistClick(ctx, noteTime, isAcc, mVol * gainMul, masterGain);
          }
          triggerVisualBeat(beatIdx);

          // 🎶 Triolen-Unterteilung ('3'): 3 Schläge pro Viertel (Hauptschlag + 2 Triolen-Zwischenschläge)
          if (!isMutedBar && subdivisionRef.current === '3') {
            const beatDuration = 60.0 / bpmRef.current;
            const trip1Time = noteTime + (beatDuration / 3);
            const trip2Time = noteTime + (beatDuration * 2 / 3);
            playSubdivisionClick(ctx, trip1Time, mVol * 0.35, masterGain);
            playSubdivisionClick(ctx, trip2Time, mVol * 0.35, masterGain);
          }
        } else if (!isMutedBar && subdivisionRef.current !== '1' && subdivisionRef.current !== '3') {
          // Gerade Unterteilungen (Achtel '2' / Sechzehntel '4'):
          const isEighth = step % 2 === 0;
          if (subdivisionRef.current === '2' && isEighth) {
            playSubdivisionClick(ctx, noteTime, mVol * 0.35, masterGain);
          } else if (subdivisionRef.current === '4') {
            playSubdivisionClick(ctx, noteTime, isEighth ? mVol * 0.32 : mVol * 0.18, masterGain);
          }
        }
      }
    }
    if (isMutedBar && selectedStyleRef.current !== 'metronome') {
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (!isMutedBar && selectedStyleRef.current === 'rock') {
      if (variant === 'A') {
        // V1: Solid basic Pop/Rock beat
        if (step === 0 || step === 8 || step === 10) playKick(1.0);
        if (step === 4 || step === 12) playSnare(1.0);
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 1.0 : 0.62);
      } else if (variant === 'B') {
        // V2: Groove+ (Syncopated kick upbeats + open hat lift)
        if (step === 0 || step === 6 || step === 8 || step === 10 || step === 14) playKick(1.0);
        if (step === 4 || step === 12) playSnare(1.0);
        if (step === 14) playHat(true, 0.85); // Sizzling upbeat open hat lift on 4+
        else if (step % 2 === 0) playHat(false, step % 4 === 0 ? 1.0 : 0.65);
      } else {
        // V3: Complex (Snare ghost notes + ride feel)
        if (step === 0 || step === 3 || step === 8 || step === 10 || step === 11) playKick(1.0);
        if (step === 4 || step === 12) playSnare(1.0);
        else if (step === 7 || step === 15) playSnare(0.25); // Ghost notes
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 1.05 : 0.72);
        else if (step === 11) playHat(false, 0.45);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'hiphop') {
      if (variant === 'A') {
        // V1: Classic laid-back pocket
        if (step === 0) playKick(1.3);
        else if (step === 3 || step === 10) playKick(0.9);
        if (step === 4 || step === 12) playSnare(1.1);
        else if (step === 7 || step === 15) playSnare(0.22); // Multi-velocity ghost
        if (step % 2 === 0) playHat(step === 14, step % 4 === 0 ? 0.9 : 0.55);
      } else if (variant === 'B') {
        // V2: Groove+ (Boom-Bap double kick)
        if (step === 0 || step === 2 || step === 8 || step === 10) playKick(1.2);
        if (step === 4 || step === 12) playSnare(1.1);
        else if (step === 15) playSnare(0.25);
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 0.95 : 0.62);
      } else {
        // V3: Complex (Trap hat subdivisions/rolls)
        if (step === 0 || step === 8 || step === 11) playKick(1.3);
        if (step === 4 || step === 12) playSnare(1.15);
        // Hi-Hat roll on step 14 & 15
        if (step === 14 || step === 15) {
          playHat(false, 0.75);
        } else if (step % 2 === 0) {
          playHat(false, step % 4 === 0 ? 1.0 : 0.6);
        }
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (isSwing) {
      if (variant === 'A') {
        // 🌟 V1: Classic jazz swing - Authentic 20" Ride cymbal with feathered kick & hi-hat foot chick
        if (step === 0 || step === 3 || step === 6 || step === 9) playKick(0.20);
        if (step === 2) playRimClick(0.35);
        else if (step === 8) playSnare(0.30);
        if (step === 0 || step === 3 || step === 6 || step === 9) playRide(0.75);
        else if (step === 2 || step === 5 || step === 8 || step === 11) playRide(0.38);
        if (step === 3 || step === 9) playHat(false, 0.65); // Hi-Hat foot chick on 2 & 4
      } else if (variant === 'B') {
        // 🌟 V2: Groove+ (Comping snare hits & Ride)
        if (step === 0 || step === 6) playKick(0.22);
        if (step === 2 || step === 5 || step === 11) playSnare(0.38);
        if (step === 0 || step === 3 || step === 6 || step === 9) playRide(0.80);
        else if (step === 2 || step === 5 || step === 8 || step === 11) playRide(0.42);
        if (step === 3 || step === 9) playHat(false, 0.70);
      } else {
        // 🌟 V3: Complex (Swing triplets fill & Ride wash)
        if (step === 0 || step === 6) playKick(0.28);
        if (step === 9 || step === 10 || step === 11) {
          playSnare(0.55); // crescendo snare fill
        } else if (step === 2 || step === 5) {
          playSnare(0.26);
        }
        if (step === 0 || step === 3 || step === 6 || step === 9) playRide(0.75);
        else if (step === 2 || step === 5 || step === 8) playRide(0.40);
        if (step === 3 || step === 9) playHat(false, 0.68);
      }
      if (step % 3 === 0) triggerVisualBeat(Math.floor(step / 3));
    } else if (selectedStyleRef.current === 'latin') {
      if (variant === 'A') {
        // V1: Classic Bossa double kick & rim clave with subtle studio shaker
        if (step === 0 || step === 3 || step === 8 || step === 11) playKick(0.90);
        if (step === 0 || step === 3 || step === 6 || step === 10 || step === 12) playRimClick(0.95);
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 0.70 : 0.40);
        playShaker(step % 2 === 0, 0.35);
      } else if (variant === 'B') {
        // V2: Groove+ (High-energy Samba surdo sweep with subtle shaker)
        if (step === 0 || step === 2 || step === 4 || step === 6 || step === 8 || step === 10 || step === 12 || step === 14) {
          playKick(step % 4 === 2 ? 1.05 : 0.55); // typical surdo groove
        }
        if (step === 0 || step === 4 || step === 8 || step === 12) playRimClick(0.90);
        if (step % 2 === 0) playHat(false, 0.65);
        playShaker(step % 2 === 0, 0.40);
      } else {
        // V3: Complex (Cascara clave & open hats)
        if (step === 0 || step === 3 || step === 8 || step === 11) playKick(0.95);
        // Cascara rimshot pattern
        if (step === 0 || step === 2 || step === 3 || step === 5 || step === 6 || step === 8 || step === 10 || step === 11 || step === 13 || step === 14) {
          playRimClick(0.80);
        }
        if (step % 4 === 2) playHat(true, 0.65); // open hat barks with choke
        playShaker(step % 2 === 0, 0.42);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'funk') {
      if (variant === 'A') {
        // V1: Funky Breakbeat with ghost snares
        if (step === 0 || step === 6 || step === 10 || step === 11) playKick(1.15);
        if (step === 4 || step === 12) playSnare(1.1);
        else if (step === 7 || step === 13 || step === 15) playSnare(0.28); // Multi-velocity ghost
        if (step % 2 === 0) playHat(step === 6 || step === 14, (step === 6 || step === 14) ? 1.0 : (step % 4 === 0 ? 0.95 : 0.55));
        else if (step === 3 || step === 11) playHat(false, 0.35);
      } else if (variant === 'B') {
        // V2: Groove+ (Linear Funk - tight groove, no simultaneous strikes)
        if (step === 0 || step === 6 || step === 10) playKick(1.2);
        else if (step === 4 || step === 12 || step === 14) playSnare(1.15);
        else if (step === 2 || step === 8 || step === 15) playHat(false, 0.85);
      } else {
        // V3: Complex (Funk drum fill)
        if (step === 0 || step === 6 || step === 11) playKick(1.2);
        if (step === 4 || step === 12) playSnare(1.1);
        else if (step === 13 || step === 14 || step === 15) playSnare(0.9); // rapid fill
        if (step % 2 === 0) playHat(false, 0.8);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'reggae') {
      if (variant === 'A') {
        // V1: Classic One-Drop with guide click
        if (step === 8) { playKick(1.2); playSnare(1.05); }
        if (step === 4 || step === 12) playRimClick(0.9);
        if (step === 0) playRimClick(0.22); // pedagogical guide
        if (step % 2 === 0) playHat(false, (step === 2 || step === 6 || step === 10 || step === 14) ? 1.0 : 0.58);
      } else if (variant === 'B') {
        // V2: Groove+ (Steppers style - four on the floor kick)
        if (step === 0 || step === 4 || step === 8 || step === 12) playKick(1.15);
        if (step === 8) playSnare(1.05);
        if (step === 4 || step === 12) playRimClick(0.85);
        if (step % 2 === 0) playHat(false, 0.88);
      } else {
        // V3: Complex (Rocksteady with rimshot fill)
        if (step === 8) playKick(1.2);
        if (step === 8 || step === 14 || step === 15) playSnare(1.0);
        if (step === 4 || step === 12) playRimClick(0.9);
        if (step % 2 === 0) playHat(false, 0.8);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'walzer') {
      if (variant === 'A') {
        // V1: Classic Waltz boom-chick-chick
        if (step === 0) playKick(1.0);
        if (step === 4 || step === 8) { playRimClick(0.85); playSnare(0.22); }
        if (step % 2 === 0) playHat(false, step === 0 ? 0.95 : (step === 4 || step === 8 ? 0.72 : 0.45));
      } else if (variant === 'B') {
        // V2: Groove+ (Syncopated Jazz Waltz)
        if (step === 0 || step === 6) playKick(0.9);
        if (step === 4 || step === 8) playSnare(0.75);
        if (step === 0 || step === 3 || step === 4 || step === 7 || step === 8 || step === 11) playHat(false, 0.8);
      } else {
        // V3: Complex (Waltz snare fill)
        if (step === 0) playKick(1.0);
        if (step === 4) playSnare(0.7);
        if (step === 8 || step === 9 || step === 10 || step === 11) playSnare(0.8); // 3rd beat roll
        if (step % 2 === 0) playHat(false, 0.8);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'ballad68') {
      if (variant === 'A') {
        // V1: Slow 6/8 Triplet Ballad
        if (step === 0) playKick(1.2);
        else if (step === 5) playKick(0.6);
        if (step === 6) playSnare(1.1);
        if (step % 2 === 0) playHat(false, (step === 0 || step === 6) ? 1.0 : 0.6);
      } else if (variant === 'B') {
        // V2: Groove+ (Heartbeat Ballad)
        if (step === 0 || step === 4 || step === 5) playKick(1.1);
        if (step === 6) playSnare(1.15);
        else if (step === 11) playRimClick(0.5);
        if (step % 2 === 0) playHat(false, 0.82);
      } else {
        // V3: Complex (Ballad fill on 10/11)
        if (step === 0 || step === 5) playKick(1.2);
        if (step === 6) playSnare(1.1);
        else if (step === 10 || step === 11) playSnare(0.85); // roll
        if (step % 2 === 0) playHat(false, 0.8);
      }
      if (step % 2 === 0) triggerVisualBeat(Math.floor(step / 2));
    } else if (selectedStyleRef.current === 'disco') {
      if (variant === 'A') {
        // V1: Classic Four-on-the-Floor
        if (step === 0 || step === 4 || step === 8 || step === 12) playKick(1.15);
        if (step === 4 || step === 12) playSnare(1.0);
        if (step % 2 === 0) playHat(step === 2 || step === 6 || step === 10 || step === 14, (step === 2 || step === 6 || step === 10 || step === 14) ? 1.05 : 0.5);
      } else if (variant === 'B') {
        // 🌟 V2: 10/10 Goldstandard Disco Groove+ (Studio 54 / Chic / Daft Punk Energy)
        // 1. Four-on-the-floor with infectious "3 und" bounce kick
        if (step === 0 || step === 4 || step === 8 || step === 10 || step === 12) {
          playKick(step === 10 ? 0.95 : 1.20);
        }
        // 2. Layered Snare & Rimshot backbeat + 16th prep ghost note
        if (step === 4 || step === 12) {
          playSnare(1.15);
          playRimClick(0.70);
        } else if (step === 15) {
          playSnare(0.32); // subtle 16th ghost pickup
        }
        // 3. Relentless 16th-note pumping Hi-Hat with open offbeat barks & pedal chokes
        if (step === 2 || step === 6 || step === 10 || step === 14) {
          playHat(true, 1.15); // open hat sizzle on offbeats
        } else if (step === 3 || step === 7 || step === 11 || step === 15) {
          playHat(false, 0.55); // instant physical pedal choke
        } else if (step % 4 === 0) {
          playHat(false, 0.85); // crisp quarter tap
        } else {
          playHat(false, 0.38); // driving 16th ghost tick
        }
        // 4. Shimmering Studio Shaker Teppich for air & forward momentum
        playShaker(step % 2 === 0, 0.38);
      } else {
        // 🌟 V3: Complex (Full Disco fill with rolling snares & crash transition)
        if (step === 0 || step === 4 || step === 8 || step === 10 || step === 11) playKick(1.15);
        if (step === 4) {
          playSnare(1.15);
          playRimClick(0.70);
        } else if (step === 12 || step === 13 || step === 14 || step === 15) {
          playSnare(step === 12 ? 1.15 : (step === 13 ? 0.70 : (step === 14 ? 0.85 : 1.05))); // crescendo fill
        }
        if (step % 2 === 0) playHat(step === 2 || step === 6, (step === 2 || step === 6) ? 1.1 : 0.65);
        playShaker(step % 2 === 0, 0.40);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    } else if (selectedStyleRef.current === 'singersongwriter') {
      if (variant === 'A') {
        // V1: Soft Acoustic Folk Pocket (Feathered Kick & Rimshot + Studio Shaker)
        if (step === 0 || step === 10) playKick(0.70);
        if (step === 4 || step === 12) playRimClick(0.85);
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 0.65 : 0.35);
        playShaker(step % 2 === 0, 0.32);
      } else if (variant === 'B') {
        // V2: Groove+ (Shaker & Soft Brush Snare)
        if (step === 0 || step === 10) playKick(0.75);
        if (step === 4 || step === 12) playSnare(0.48); // soft brush snare
        else if (step === 7 || step === 15) playSnare(0.16); // subtle brush scrape
        if (step % 2 === 0) playHat(false, step % 4 === 0 ? 0.70 : 0.40);
        playShaker(step % 2 === 0, 0.38);
      } else {
        // V3: Complex (Singer-Songwriter Acoustic Fill & Open Hat Sizzle + Shaker)
        if (step === 0 || step === 6 || step === 10) playKick(0.80);
        if (step === 4 || step === 12) playSnare(0.55);
        else if (step === 14 || step === 15) playRimClick(0.70); // acoustic wooden fill
        if (step % 2 === 0) playHat(step === 10, step === 10 ? 0.70 : 0.45);
        playShaker(step % 2 === 0, 0.40);
      }
      if (step % 4 === 0) triggerVisualBeat(Math.floor(step / 4));
    }
  };

  // 🛡️ Enterprise Anti-Ablenkungs- & Fokus-Wächter: Aufnahme sofort abbrechen & verwerfen
  const discardActiveCompanionRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null; // Neutralisiert onstop
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach(t => t.stop());
      recordingStreamRef.current = null;
    }
    if (recordAudioCtxRef.current) {
      try { recordAudioCtxRef.current.close(); } catch (e) {}
      recordAudioCtxRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setIsCountingIn(false);
    setIsPlaying(false);
    setPendingPreviewTake(null);
  };

  const isCompanionGuarded = isRecording || isCountingIn;

  const focusGuard = useFocusInterruptionGuard({
    isActive: isCompanionGuarded,
    toolName: 'Übe-Begleiter (Recorder)',
    onAbort: () => {
      discardActiveCompanionRecording();
    }
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      height: '100%',
      background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
      borderTop: '1px solid #e2e8f0',
      borderRadius: useNotebookLayout ? '0 0 24px 24px' : '24px',
      minHeight: 0,
      color: '#1d1d1f',
      padding: isMobileView ? '16px 16px calc(240px + env(safe-area-inset-bottom, 40px)) 16px' : '16px 20px',
      gap: '14px',
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      position: 'relative'
    }}>
      {/* 🌟 Ambient Screen Border Flash (Beat 1 visual pulse across the whole screen) */}
      {ambientBorderFlash && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: useNotebookLayout ? '0 0 24px 24px' : '24px',
          border: '4px solid #facc15',
          boxShadow: 'inset 0 0 30px rgba(250, 204, 21, 0.45)',
          pointerEvents: 'none',
          zIndex: 50,
          animation: 'pulse 0.12s ease-out'
        }} />
      )}

      {/* 🏆 Zero-Click Übezeit Gutschrift Toast */}
      {sessionLoggedToast && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: '#0f172a',
          color: '#ffffff',
          padding: '8px 16px',
          borderRadius: '100px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          border: '1px solid #facc15',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <span style={{ fontSize: '1rem' }}>🎉</span>
          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#fef08a' }}>
            {sessionLoggedToast.minutes} Min. Übezeit ({sessionLoggedToast.bpm} BPM) dem Sticker-Tresor gutgeschrieben!
          </span>
        </div>
      )}

      {/* 🎼 Notenständer-Modus (Stage View Overlay) */}
      {isStageView && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#090d16',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'calc(env(safe-area-inset-top, 24px) + 20px) 24px calc(env(safe-area-inset-bottom, 24px) + 24px) 24px',
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <div style={{ width: '100%', maxWidth: '640px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>🎼</span>
              <span style={{ fontSize: '1rem', fontWeight: 900, color: '#facc15', letterSpacing: '0.04em' }}>
                NOTENSTÄNDER-MODUS
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsStageView(false)}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                padding: '8px 14px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Minimize2 size={16} />
              <span>Zurück</span>
            </button>
          </div>

          {/* Center Stage BPM & Beat Display */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', margin: 'auto 0' }}>
            {/* Massive Tempo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '6rem', fontWeight: 950, color: '#facc15', lineHeight: 1, fontFamily: 'SF Mono, monospace' }}>
                  {bpm}
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 850, color: '#94a3b8' }}>BPM</span>
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e2e8f0', marginTop: '8px' }}>
                {effectiveUiLevel === 'junior'
                  ? (bpm <= 70 ? '🐢 Leo (Gemütlich)' : bpm <= 110 ? '🐕 Bello (Flott)' : bpm <= 150 ? '🐇 Flitzi (Schnell)' : '🐆 Cheetah (Rakete)')
                  : (bpm < 60 ? 'Largo' : bpm < 76 ? 'Adagio' : bpm < 108 ? 'Andante' : bpm < 120 ? 'Moderato' : bpm < 168 ? 'Allegro' : 'Presto')}
              </span>
            </div>

            {/* Giant Beat Circles */}
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {Array.from({ length: activeMeterInfo.beats }).map((_, idx) => {
                const isActive = activeBeatIndex === idx;
                const state = beatAccents[idx] || (idx === 0 ? 'accent' : 'normal');
                const isAccent = state === 'accent';
                return (
                  <div
                    key={idx}
                    style={{
                      width: '68px',
                      height: '68px',
                      borderRadius: '50%',
                      background: isActive
                        ? (isAccent ? '#eab308' : '#38bdf8')
                        : 'rgba(255,255,255,0.08)',
                      border: isActive
                        ? '4px solid #ffffff'
                        : '2px solid rgba(255,255,255,0.2)',
                      boxShadow: isActive
                        ? `0 0 35px ${isAccent ? 'rgba(234, 179, 8, 0.8)' : 'rgba(56, 189, 248, 0.8)'}`
                        : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? '#0f172a' : '#ffffff',
                      fontSize: '1.5rem',
                      fontWeight: 950,
                      transform: isActive ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.08s ease'
                    }}
                  >
                    <span>{idx + 1}</span>
                  </div>
                );
              })}
            </div>

            {/* Subdivisions Info & Meter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 800 }}>
              <span>Takt: <strong style={{ color: '#ffffff' }}>{metronomeMeter}</strong></span>
              <span>•</span>
              <span>Unterteilung: <strong style={{ color: '#ffffff' }}>{subdivision === '1' ? '♩ Viertel' : subdivision === '2' ? '♫ Achtel' : subdivision === '3' ? '3er Triolen' : '𝅘𝅥𝅯𝅘𝅥𝅯 16tel'}</strong></span>
            </div>
          </div>

          {/* Bottom Play / Stop Hero in Stage View */}
          <div style={{ width: '100%', maxWidth: '360px', display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={handleTogglePlay}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '16px',
                border: 'none',
                background: isPlaying ? '#ef4444' : '#eab308',
                color: isPlaying ? '#ffffff' : '#0f172a',
                fontSize: '1.2rem',
                fontWeight: 950,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {isPlaying ? <Square size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
              <span>{isPlaying ? 'STOPP' : 'START'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 🛡️ Fokus-Wächter Banner & Abbruch-Modal */}
      <FocusInterruptionBanner
        isInterrupted={focusGuard.isInterrupted}
        graceSecondsLeft={focusGuard.graceSecondsLeft}
        strikes={focusGuard.strikes}
        toolName="Übe-Begleiter (Recorder)"
        onReturn={() => {}}
      />

      <FocusAbortedModal
        isOpen={focusGuard.isAborted}
        reason={focusGuard.abortReason}
        toolName="Übe-Begleiter (Recorder)"
        onClose={() => {
          focusGuard.acknowledgeAbort();
        }}
      />
      
      {/* Mobile Segmented Switcher for Metronome vs Begleit-Rhythmen */}
      {isMobileView && (
        <div style={{
          display: 'flex',
          background: '#e2e8f0',
          borderRadius: '12px',
          padding: '3px',
          width: '100%',
          marginBottom: '8px'
        }}>
          <button
            type="button"
            onClick={() => setMobileTab('metronome')}
            style={{
              flex: 1,
              background: mobileTab === 'metronome' ? '#ffffff' : 'transparent',
              color: mobileTab === 'metronome' ? '#1d1d1f' : '#64748b',
              border: 'none',
              borderRadius: '9px',
              padding: '10px 12px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: mobileTab === 'metronome' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Clock size={15} />
            <span>Metronom</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('rhythms')}
            style={{
              flex: 1,
              background: mobileTab === 'rhythms' ? '#ffffff' : 'transparent',
              color: mobileTab === 'rhythms' ? '#1d1d1f' : '#64748b',
              border: 'none',
              borderRadius: '9px',
              padding: '10px 12px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: mobileTab === 'rhythms' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Music size={15} />
            <span>Begleit-Rhythmen & Tracks</span>
          </button>
        </div>
      )}

      {/* 🛠️ Studio-Modal: Übe-Werkzeuge VOR dem Player */}
      {showToolsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tools-modal-title"
          onClick={() => setShowToolsModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: '#fef3c7',
                  border: '1.5px solid #fde047',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Flame size={22} color="#d97706" />
                </div>
                <div>
                  <h3 id="tools-modal-title" style={{ margin: 0, fontSize: '1.12rem', fontWeight: 900, color: '#0f172a' }}>
                    Übe-Werkzeuge
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                    Tempo-Trainer, Innere Rhythmusuhr & Stimmgabel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowToolsModal(false)}
                aria-label="Schließen"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  fontWeight: 700
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* 1. Tempo-Trainer */}
            <div style={{
              padding: '16px',
              borderRadius: '16px',
              background: speedTrainerActive ? '#fff7ed' : '#f8fafc',
              border: speedTrainerActive ? '1.5px solid #fdba74' : '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Flame size={18} style={{ color: '#ea580c' }} />
                  <div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#9a3412', display: 'block' }}>
                      Tempo-Trainer (Speed-Up)
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#7c2d12', fontWeight: 600 }}>
                      Steigert das Tempo automatisch alle X Takte
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSpeedTrainerActive(prev => !prev)}
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 850,
                    padding: '6px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: speedTrainerActive ? '#ea580c' : '#cbd5e1',
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: speedTrainerActive ? '0 2px 8px rgba(234, 88, 12, 0.35)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {speedTrainerActive ? 'Aktiv' : 'Aus'}
                </button>
              </div>

              {speedTrainerActive && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#7c2d12', fontWeight: 700 }}>
                    <span>Ziel-Tempo:</span>
                    <strong style={{ fontSize: '1rem', color: '#9a3412', fontFamily: 'SF Mono, monospace' }}>
                      {speedTrainerTargetBpm} BPM
                    </strong>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="220"
                    value={speedTrainerTargetBpm}
                    onChange={(e) => setSpeedTrainerTargetBpm(Number(e.target.value))}
                    style={{ width: '100%', height: '6px', accentColor: '#ea580c', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    {[
                      { bars: 2, step: 2, label: 'Alle 2 Takte (+2 BPM)' },
                      { bars: 4, step: 2, label: 'Alle 4 Takte (+2 BPM)' },
                      { bars: 8, step: 4, label: 'Alle 8 Takte (+4 BPM)' }
                    ].map(opt => {
                      const isSel = speedTrainerIntervalBars === opt.bars && speedTrainerStep === opt.step;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => {
                            setSpeedTrainerIntervalBars(opt.bars);
                            setSpeedTrainerStep(opt.step);
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 4px',
                            fontSize: '0.66rem',
                            fontWeight: isSel ? 900 : 700,
                            borderRadius: '8px',
                            border: isSel ? '1.5px solid #ea580c' : '1px solid #fed7aa',
                            background: isSel ? '#ffedd5' : '#ffffff',
                            color: isSel ? '#9a3412' : '#7c2d12',
                            cursor: 'pointer'
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Stummtakt-Herausforderung */}
            <div style={{
              padding: '16px',
              borderRadius: '16px',
              background: muteBarActive ? '#f0fdf4' : '#f8fafc',
              border: muteBarActive ? '1.5px solid #86efac' : '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🧠</span>
                  <div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#166534', display: 'block' }}>
                      Stummtakt-Training (Innere Uhr)
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 600 }}>
                      Mutet Takte für Timing-Training im Kopf
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMuteBarActive(prev => !prev);
                    setIsCurrentBarMuted(false);
                  }}
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 850,
                    padding: '6px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: muteBarActive ? '#16a34a' : '#cbd5e1',
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: muteBarActive ? '0 2px 8px rgba(22, 163, 74, 0.35)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {muteBarActive ? 'Aktiv' : 'Aus'}
                </button>
              </div>

              {muteBarActive && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '4px' }}>
                  {[
                    { mode: '3_plus_1' as const, label: '3 Takte Play', sub: '+ 1 Takt Stumm' },
                    { mode: '1_plus_1' as const, label: '1 Takt Play', sub: '+ 1 Takt Stumm' }
                  ].map(item => {
                    const isSel = muteBarMode === item.mode;
                    return (
                      <button
                        key={item.mode}
                        type="button"
                        onClick={() => setMuteBarMode(item.mode)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '10px',
                          border: isSel ? '2px solid #16a34a' : '1px solid #cbd5e1',
                          background: isSel ? '#dcfce7' : '#ffffff',
                          color: isSel ? '#166534' : '#475569',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: '0.82rem', fontWeight: 900 }}>{item.label}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, opacity: 0.85 }}>{item.sub}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Stimmgabel (440 Hz / 442 Hz) */}
            <div style={{
              padding: '16px',
              borderRadius: '16px',
              background: chamberPitch > 0 ? '#fefce8' : '#f8fafc',
              border: chamberPitch > 0 ? '1.5px solid #fcd34d' : '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={18} style={{ color: chamberPitch > 0 ? '#d97706' : '#64748b' }} />
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 900, color: chamberPitch > 0 ? '#92400e' : '#1e293b', display: 'block' }}>
                    Kammerton-Stimmgabel
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                    Reiner Sinuston zum Stimmen deines Instruments
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => chamberPitch === 440 ? stopChamberPitch() : playChamberPitch(440)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 850,
                    borderRadius: '10px',
                    border: 'none',
                    background: chamberPitch === 440 ? '#d97706' : '#ffffff',
                    color: chamberPitch === 440 ? '#ffffff' : '#0f172a',
                    boxShadow: chamberPitch === 440 ? '0 2px 8px rgba(217, 119, 6, 0.35)' : '0 1px 3px rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {chamberPitch === 440 ? '⏹ 440 Hz' : '440 Hz'}
                </button>
                <button
                  type="button"
                  onClick={() => chamberPitch === 442 ? stopChamberPitch() : playChamberPitch(442)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 850,
                    borderRadius: '10px',
                    border: 'none',
                    background: chamberPitch === 442 ? '#d97706' : '#ffffff',
                    color: chamberPitch === 442 ? '#ffffff' : '#0f172a',
                    boxShadow: chamberPitch === 442 ? '0 2px 8px rgba(217, 119, 6, 0.35)' : '0 1px 3px rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {chamberPitch === 442 ? '⏹ 442 Hz' : '442 Hz'}
                </button>
              </div>
            </div>

            {/* Footer Button: Fertig */}
            <button
              type="button"
              onClick={() => setShowToolsModal(false)}
              style={{
                width: '100%',
                minHeight: '48px',
                borderRadius: '14px',
                border: 'none',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '0.94rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              Fertig
            </button>
          </div>
        </div>
      )}

      {/* Global Equalizer & Pulse Animations */}
      <style>{`
        @keyframes eq-bounce-1 {
          0%, 100% { height: 4px; }
          50% { height: 14px; }
        }
        @keyframes eq-bounce-2 {
          0%, 100% { height: 14px; }
          50% { height: 6px; }
        }
        @keyframes eq-bounce-3 {
          0%, 100% { height: 7px; }
          50% { height: 14px; }
        }
        .eq-bar-1 { animation: eq-bounce-1 0.45s ease-in-out infinite alternate; }
        .eq-bar-2 { animation: eq-bounce-2 0.38s ease-in-out infinite alternate; }
        .eq-bar-3 { animation: eq-bounce-3 0.52s ease-in-out infinite alternate; }
      `}</style>

      <div style={{ display: 'flex', gap: '18px', flex: 1, width: '100%', minHeight: 0, height: '100%' }} className="flex-col lg:flex-row">
        {/* Left Column: Equalized Metronome Panel */}
        <div style={{
          flex: '1 1 0%',
          minWidth: isMobileView ? '100%' : '300px',
          display: (!isMobileView || mobileTab === 'metronome') ? 'flex' : 'none',
          flexDirection: 'column',
          alignItems: 'center',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e8e8ed',
          padding: isMobileView ? '16px' : '20px 24px',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.04)',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ width: '100%', maxWidth: '400px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                ÜBE-METRONOM
              </span>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                color: '#854d0e',
                background: '#fefce8',
                border: '1px solid #fef08a',
                padding: '2px 8px',
                borderRadius: '100px'
              }}>
                {effectiveUiLevel === 'junior' ? 'JUNIOR' : effectiveUiLevel === 'teen' ? 'TEEN BEAT' : 'PRO STUDIO'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setShowToolsModal(true)}
                style={{
                  background: (speedTrainerActive || muteBarActive || chamberPitch !== 0) ? '#fff7ed' : '#f8fafc',
                  border: (speedTrainerActive || muteBarActive || chamberPitch !== 0) ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '6px 11px',
                  fontSize: '0.72rem',
                  fontWeight: 850,
                  color: (speedTrainerActive || muteBarActive || chamberPitch !== 0) ? '#9a3412' : '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: (speedTrainerActive || muteBarActive) ? '0 2px 6px rgba(234, 88, 12, 0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease'
                }}
                title="Übe-Werkzeuge öffnen (Tempo-Trainer, Stummtakt, Kammerton)"
              >
                <Flame size={13} style={{ color: (speedTrainerActive || muteBarActive || chamberPitch !== 0) ? '#ea580c' : '#64748b' }} />
                <span>Werkzeuge</span>
                {(speedTrainerActive || muteBarActive || chamberPitch !== 0) && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ea580c' }} />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsStageView(true)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '6px 11px',
                  fontSize: '0.72rem',
                  fontWeight: 850,
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease'
                }}
                title="Notenständer-Großansicht"
              >
                <Maximize2 size={13} />
                <span>Notenständer</span>
              </button>
            </div>
          </div>

          {/* Visualizer Container: Teen Pulsing Wave-Ring OR Junior/Pro Mechanical Metronome */}
          {effectiveUiLevel === 'teen' ? (
            <div style={{
              position: 'relative',
              width: '135px',
              height: '160px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0'
            }}>
              <div style={{
                position: 'absolute',
                width: isPlaying ? '128px' : '90px',
                height: isPlaying ? '128px' : '90px',
                borderRadius: '50%',
                border: '2px solid rgba(234, 179, 8, 0.45)',
                transform: isPlaying ? 'scale(1.12)' : 'scale(1)',
                opacity: isPlaying ? 0.85 : 0.25,
                transition: 'all 0.12s ease-out'
              }} />
              <div style={{
                position: 'absolute',
                width: isPlaying ? '102px' : '78px',
                height: isPlaying ? '102px' : '78px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(250, 204, 21, 0.3) 0%, transparent 70%)',
                border: '1.5px solid rgba(234, 179, 8, 0.7)',
                transform: isPlaying ? 'scale(1.06)' : 'scale(1)',
                transition: 'all 0.1s ease-out'
              }} />
              <div style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                border: '2px solid #eab308',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isPlaying ? '0 0 20px rgba(234, 179, 8, 0.55)' : '0 4px 10px rgba(0,0,0,0.15)',
                zIndex: 2
              }}>
                <Activity size={24} color="#facc15" style={{ transform: isPlaying ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.08s' }} />
                <span style={{ fontSize: '0.56rem', fontWeight: 900, color: '#facc15', letterSpacing: '0.04em', marginTop: '2px' }}>
                  {isPlaying ? 'IM TAKT' : 'BEREIT'}
                </span>
              </div>
            </div>
          ) : (
            /* Mechanical Metronome Container */
            <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', margin: '0' }}>
              <style>{`
                @keyframes swing-anim {
                  0% { transform: rotate(-12deg); }
                  100% { transform: rotate(12deg); }
                }
                @keyframes rotate-key {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>

            <svg width="135" height="160" viewBox="0 0 180 215" style={{ overflow: 'visible' }}>
              <defs>
                {/* Walnut Wood Gradient */}
                <linearGradient id="walnutWood" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6c472c" />
                  <stop offset="40%" stopColor="#53331b" />
                  <stop offset="85%" stopColor="#2f1d0f" />
                  <stop offset="100%" stopColor="#1c1109" />
                </linearGradient>
                {/* Wood Shadow Overlay */}
                <radialGradient id="woodGlow" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#ffe5d9" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
                </radialGradient>
                {/* Hollow Interior Shadow */}
                <linearGradient id="interiorChamber" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#19110d" />
                  <stop offset="100%" stopColor="#060403" />
                </linearGradient>
                {/* Ivory scale Plate */}
                <linearGradient id="ivoryPlate" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbf9f4" />
                  <stop offset="100%" stopColor="#e5decb" />
                </linearGradient>
                {/* Steel Pendulum Rod */}
                <linearGradient id="steelRod" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f3f4f6" />
                  <stop offset="50%" stopColor="#9ca3af" />
                  <stop offset="100%" stopColor="#d1d5db" />
                </linearGradient>
                {/* Brass Gold Gradient */}
                <linearGradient id="brassGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffe066" />
                  <stop offset="35%" stopColor="#e5c142" />
                  <stop offset="75%" stopColor="#b58e17" />
                  <stop offset="100%" stopColor="#7a5b08" />
                </linearGradient>
                {/* Soft Casing Drop Shadow */}
                <filter id="casingShadow" x="-20%" y="-10%" width="140%" height="130%">
                  <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.32" />
                </filter>
              </defs>

              {/* Side Winding Key (Connected cleanly to right casing edge at x=138, static 3D angle) */}
              <g style={{
                transformOrigin: '138px 145px',
                transform: 'rotate(25deg)',
                transition: 'transform 0.2s ease-out'
              }}>
                <rect x="136" y="142" width="8" height="6" fill="url(#brassGold)" stroke="#7a5b08" strokeWidth="0.8" rx="1" />
                <path d="M 144 145 C 144 138, 158 138, 158 145 C 158 152, 144 152, 144 145 Z" fill="none" stroke="url(#brassGold)" strokeWidth="2.5" />
                <circle cx="144" cy="145" r="1.8" fill="#5a3d00" />
              </g>

              {/* 3D Pyramid Casing (Walnut Wood) */}
              <path 
                d="M 90 12 L 24 195 C 24 201, 30 205, 38 205 L 142 205 C 150 205, 156 201, 156 195 Z" 
                fill="url(#walnutWood)" 
                stroke="#2f1d0f" 
                strokeWidth="2.5" 
                filter="url(#casingShadow)"
              />
              <path 
                d="M 90 12 L 24 195 C 24 201, 30 205, 38 205 L 142 205 C 150 205, 156 201, 156 195 Z" 
                fill="url(#woodGlow)" 
                style={{ mixBlendMode: 'multiply' }}
              />

              {/* Golden Casing Trim Line */}
              <path 
                d="M 90 18 L 29 191 C 32 195, 36 197, 42 197 L 138 197 C 144 197, 148 195, 151 191 Z" 
                fill="none" 
                stroke="#e5c142" 
                strokeWidth="1.2" 
                opacity="0.32"
              />

              {/* Hollow Interior Chamber (Trapezoid for wider text space at top) */}
              <path 
                d="M 78 35 L 102 35 L 138 188 L 42 188 Z" 
                fill="url(#interiorChamber)" 
                stroke="#19110d" 
                strokeWidth="1.5"
              />

              {/* Ivory scale Plate (Trapezoid fitting scale markings perfectly) */}
              <path 
                d="M 80 40 L 100 40 L 134 184 L 46 184 Z" 
                fill="url(#ivoryPlate)" 
                stroke="#b5ad9e"
                strokeWidth="0.5"
              />

              {/* Detailed Scale Lines and Tempo Markings (Left Column: BPM, Right Column: Term) */}
              <g fill="#1d1d1f" opacity="0.65" fontFamily="Georgia, serif" fontSize="5.5" fontWeight="bold">
                {/* Center axis line */}
                <line x1="90" y1="45" x2="90" y2="175" stroke="#1d1d1f" strokeWidth="0.8" opacity="0.25" />

                {/* 40 Largo */}
                <line x1="82" y1="65" x2="98" y2="65" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="76" y="67" textAnchor="end">40</text>
                <text x="104" y="67" textAnchor="start">Largo</text>

                {/* 80 Adagio */}
                <line x1="80" y1="83" x2="100" y2="83" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="74" y="85" textAnchor="end">80</text>
                <text x="106" y="85" textAnchor="start">Adagio</text>

                {/* 120 Andante */}
                <line x1="78" y1="101" x2="102" y2="101" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="72" y="103" textAnchor="end">120</text>
                <text x="108" y="103" textAnchor="start">Andante</text>

                {/* 160 Allegro */}
                <line x1="76" y1="119" x2="104" y2="119" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="70" y="121" textAnchor="end">160</text>
                <text x="110" y="121" textAnchor="start">Allegro</text>

                {/* 200 Presto */}
                <line x1="74" y1="137" x2="106" y2="137" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="68" y="139" textAnchor="end">200</text>
                <text x="112" y="139" textAnchor="start">Presto</text>

                {/* 240 Prestissimo */}
                <line x1="72" y1="155" x2="108" y2="155" stroke="#1d1d1f" strokeWidth="0.6" opacity="0.3" />
                <text x="66" y="157" textAnchor="end">240</text>
                <text x="114" y="157" textAnchor="start">Prestiss</text>
              </g>

              {/* Pendulum Shadow Group (Swings behind the rod for massive 3D depth) */}
              <g style={{
                transformOrigin: '87px 180px',
                transform: isPlaying ? 'none' : 'rotate(0deg)',
                animation: isPlaying ? `swing-anim ${60 / bpm}s ease-in-out infinite alternate` : 'none',
                transition: isPlaying ? 'none' : 'transform 0.3s ease-out',
                opacity: 0.22
              }}>
                <line x1="87" y1="180" x2="87" y2="40" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" />
                <rect 
                  x="77" 
                  y={40 + ((240 - bpm) / (240 - 40)) * 115} 
                  width="20" 
                  height="15" 
                  rx="2"
                  fill="#000000" 
                />
              </g>

              {/* Pendulum Group (rotating from pivot point) */}
              <g style={{
                transformOrigin: '90px 180px',
                transform: isPlaying ? 'none' : 'rotate(0deg)',
                animation: isPlaying ? `swing-anim ${60 / bpm}s ease-in-out infinite alternate` : 'none',
                transition: isPlaying ? 'none' : 'transform 0.3s ease-out'
              }}>
                {/* Steel Pendulum Rod */}
                <line x1="90" y1="180" x2="90" y2="40" stroke="url(#steelRod)" strokeWidth="3" strokeLinecap="round" />
                
                {/* 3D Brass weight */}
                <rect 
                  x="80" 
                  y={40 + ((240 - bpm) / (240 - 40)) * 115} 
                  width="20" 
                  height="15" 
                  rx="2"
                  fill="url(#brassGold)" 
                  stroke="#856404"
                  strokeWidth="1.2"
                  style={{ transition: 'y 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)' }}
                />
                {/* Center screw detail on weight */}
                <circle 
                  cx="90" 
                  cy={40 + ((240 - bpm) / (240 - 40)) * 115 + 7.5} 
                  r="2.5" 
                  fill="url(#brassGold)" 
                  stroke="#5a3d00" 
                  strokeWidth="0.8"
                  style={{ transition: 'cy 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)' }}
                />
              </g>

              {/* Brass Lager / Pivot Cap */}
              <circle cx="90" cy="180" r="7.5" fill="url(#brassGold)" stroke="#5a3d00" strokeWidth="1.5" />
              <circle cx="90" cy="180" r="2.5" fill="#423000" />
            </svg>
          </div>
        )}

          {/* Mute-Bar Challenge Alert Banner */}
          {isCurrentBarMuted && (
            <div style={{
              width: '100%',
              maxWidth: '280px',
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              color: '#e0e7ff',
              padding: '6px 10px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.74rem',
              fontWeight: 900,
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)',
              animation: 'pulse 1.2s infinite'
            }}>
              <span>🧠 Zähle im Kopf weiter... (Stummtakt)</span>
            </div>
          )}

          {/* Zählzeiten Header mit Taktart-Pille */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: '400px',
            margin: '2px 0 4px 0',
            padding: '0 4px'
          }}>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 900,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Clock size={13} />
              Zählzeiten & Akzente
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {effectiveUiLevel === 'pro' && (
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  color: '#64748b',
                  background: '#f1f5f9',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  fontFamily: 'SF Mono, monospace'
                }}>
                  {Math.round((60000 / bpm))}ms
                </span>
              )}
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 950,
                color: '#854d0e',
                background: '#fefce8',
                border: '1px solid #fde047',
                padding: '2px 10px',
                borderRadius: '100px',
                fontFamily: 'SF Mono, monospace'
              }}>
                {activeMeterInfo.meter} Takt
              </span>
            </div>
          </div>

          {/* Dynamische Interaktive Beat-Pads je Taktart (4-Stufen-Zyklus: Akzent, Normal, Ghost, Mute) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${activeMeterInfo.beats}, 1fr)`,
            gap: activeMeterInfo.beats > 4 ? '6px' : '10px',
            width: '100%',
            maxWidth: '400px',
            margin: '2px 0 6px 0'
          }}>
            {Array.from({ length: activeMeterInfo.beats }).map((_, idx) => {
              const isActive = (activeBeatIndex !== null && activeBeatIndex !== undefined) ? (activeBeatIndex % activeMeterInfo.beats === idx) : false;
              const accentState = beatAccents[idx] || (idx === 0 ? 'accent' : 'normal');
              const isAccent = accentState === 'accent';
              const isGhost = accentState === 'ghost';
              const isMute = accentState === 'mute';

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleBeatAccent(idx)}
                  className="tactile-btn"
                  style={{
                    height: activeMeterInfo.beats > 4 ? '44px' : '52px',
                    borderRadius: '16px',
                    background: isActive 
                      ? (isAccent ? '#eab308' : (isGhost ? '#475569' : (isMute ? '#64748b' : '#0f172a'))) 
                      : (isAccent ? '#fefce8' : (isGhost ? '#f8fafc' : (isMute ? '#f1f5f9' : '#ffffff'))),
                    border: isActive 
                      ? '2.5px solid #facc15' 
                      : (isAccent ? '2px solid #eab308' : (isMute ? '1.5px dashed #cbd5e1' : '1.5px solid #cbd5e1')),
                    boxShadow: isActive 
                      ? '0 0 20px rgba(234, 179, 8, 0.55)' 
                      : (isAccent ? '0 2px 8px rgba(234, 179, 8, 0.2)' : '0 1px 3px rgba(0,0,0,0.04)'),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive ? '#ffffff' : (isAccent ? '#854d0e' : (isMute ? '#94a3b8' : '#0f172a')),
                    fontSize: activeMeterInfo.beats > 4 ? '0.88rem' : '1.05rem',
                    fontWeight: 950,
                    cursor: 'pointer',
                    transform: isActive ? 'scale(1.08)' : 'scale(1)',
                    transition: 'all 0.08s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    position: 'relative'
                  }}
                  title={`Schlag ${idx + 1}: ${isAccent ? 'Betont (Laut)' : isGhost ? 'Leise (Gedämpft)' : isMute ? 'Stumm' : 'Normal'} – Antippen zum Wechseln`}
                >
                  <span style={{ fontSize: '0.60rem', fontWeight: 900, lineHeight: 1, marginBottom: '2px' }}>
                    {isAccent ? '👑' : isGhost ? '•' : isMute ? '✕' : ''}
                  </span>
                  <span>{idx + 1}</span>
                </button>
              );
            })}
          </div>

          {/* Rhythmus-Zentrale Kapseln: Taktart & Unterteilung */}
          {selectedStyle === 'metronome' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '400px' }}>
              {/* Taktart-Wahl (4/4, 3/4, 2/4, 6/8) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                background: '#f1f5f9',
                padding: '4px',
                borderRadius: '14px'
              }}>
                {(['4/4', '3/4', '2/4', '6/8'] as const).map((meterOpt) => {
                  const isSelected = metronomeMeter === meterOpt;
                  return (
                    <button
                      key={meterOpt}
                      type="button"
                      onClick={() => {
                        setMetronomeMeter(meterOpt);
                        setActiveBeatIndex(null);
                      }}
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? 900 : 750,
                        borderRadius: '10px',
                        border: 'none',
                        background: isSelected ? '#ffffff' : 'transparent',
                        color: isSelected ? '#854d0e' : '#64748b',
                        boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      {meterOpt}
                    </button>
                  );
                })}
              </div>

              {/* Subdivisions Selector (♩ Viertel, ♫ Achtel, 3er Triolen, 𝅘𝅥𝅯𝅘𝅥𝅯 16tel) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                background: '#f8fafc',
                padding: '4px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0'
              }}>
                {[
                  { id: '1', label: '♩ Viertel' },
                  { id: '2', label: '♫ Achtel' },
                  { id: '3', label: '3er Triolen' },
                  { id: '4', label: '𝅘𝅥𝅯𝅘𝅥𝅯 16tel' }
                ].map(subOpt => (
                  <button
                    key={subOpt.id}
                    type="button"
                    onClick={() => setSubdivision(subOpt.id as any)}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      fontSize: '0.72rem',
                      fontWeight: subdivision === subOpt.id ? 900 : 700,
                      borderRadius: '10px',
                      border: 'none',
                      background: subdivision === subOpt.id ? '#fefce8' : 'transparent',
                      color: subdivision === subOpt.id ? '#854d0e' : '#64748b',
                      boxShadow: subdivision === subOpt.id ? '0 2px 6px rgba(234, 179, 8, 0.25)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    {subOpt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Takt-Fortschritts-Sweep-Bar */}
          <div style={{
            width: '100%',
            maxWidth: '400px',
            height: '5px',
            background: '#e2e8f0',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative',
            margin: '2px 0'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${barProgress}%`,
              background: 'linear-gradient(90deg, #facc15 0%, #eab308 100%)',
              boxShadow: '0 0 8px rgba(234, 179, 8, 0.5)',
              borderRadius: '10px',
              transition: isPlaying ? 'none' : 'width 0.1s ease-out'
            }} />
          </div>

          {/* ⏱️ Apple-Style Tempo-Cockpit */}
          <div style={{
            width: '100%',
            maxWidth: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '14px 16px',
            boxSizing: 'border-box'
          }}>
            {/* BPM Hero & Animal Medallion */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
              {/* Junior Animated Animal Medallion */}
              {effectiveUiLevel === 'junior' && (() => {
                const animalInfo = bpm <= 70
                  ? { emoji: '🐢', name: 'Leo', bg: '#dcfce7', border: '#86efac', text: '#166534' }
                  : bpm <= 110
                  ? { emoji: '🐕', name: 'Bello', bg: '#fef3c7', border: '#fcd34d', text: '#854d0e' }
                  : bpm <= 150
                  ? { emoji: '🐇', name: 'Flitzi', bg: '#e0f2fe', border: '#7dd3fc', text: '#0369a1' }
                  : { emoji: '🐆', name: 'Cheetah', bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' };

                const isBeatBounce = isPlaying && (activeBeatIndex !== null);

                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                        try { navigator.vibrate(15); } catch (_) {}
                      }
                    }}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: animalInfo.bg,
                      border: `2px solid ${animalInfo.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isBeatBounce ? `0 0 16px ${animalInfo.border}` : '0 2px 8px rgba(0,0,0,0.06)',
                      transform: isBeatBounce ? 'scale(1.18)' : 'scale(1)',
                      transition: 'transform 0.08s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      cursor: 'pointer',
                      padding: 0,
                      flexShrink: 0
                    }}
                    title={`${animalInfo.name} wippt im Takt mit!`}
                  >
                    <span style={{ fontSize: '1.45rem', lineHeight: 1 }}>{animalInfo.emoji}</span>
                  </button>
                );
              })()}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '2.6rem', fontWeight: 950, color: '#0f172a', lineHeight: 1, fontFamily: 'SF Mono, monospace', letterSpacing: '-0.02em' }}>
                    {bpm}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 900 }}>
                    BPM
                  </span>
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 850,
                  color: '#854d0e',
                  background: '#fefce8',
                  border: '1px solid #fde047',
                  padding: '2px 10px',
                  borderRadius: '100px',
                  marginTop: '4px'
                }}>
                  {effectiveUiLevel === 'junior'
                    ? (bpm <= 70 ? '🐢 Leo (Gemütlich)' : bpm <= 110 ? '🐕 Bello (Flott)' : bpm <= 150 ? '🐇 Flitzi (Schnell)' : '🐆 Cheetah (Rakete)')
                    : (bpm < 60 ? 'Largo' : bpm < 76 ? 'Adagio' : bpm < 108 ? 'Andante' : bpm < 120 ? 'Moderato' : bpm < 168 ? 'Allegro' : 'Presto')}
                </span>
              </div>
            </div>

            {/* Tactile Hardware Stepper Row: -5, -, +, +5 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setBpm(prev => Math.max(40, prev - 5))}
                style={{
                  height: '42px',
                  padding: '0 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 850,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.12s ease'
                }}
                title="5 BPM langsamer"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => setBpm(prev => Math.max(40, prev - 1))}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  transition: 'all 0.12s ease'
                }}
                title="1 BPM langsamer"
              >
                <Minus size={18} strokeWidth={2.8} />
              </button>
              <button
                type="button"
                onClick={() => setBpm(prev => Math.min(240, prev + 1))}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  transition: 'all 0.12s ease'
                }}
                title="1 BPM schneller"
              >
                <Plus size={18} strokeWidth={2.8} />
              </button>
              <button
                type="button"
                onClick={() => setBpm(prev => Math.min(240, prev + 5))}
                style={{
                  height: '42px',
                  padding: '0 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 850,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.12s ease'
                }}
                title="5 BPM schneller"
              >
                +5
              </button>
            </div>

            {/* Slider & Tap Tempo Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <input
                type="range"
                min="40"
                max="240"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                style={{ width: '100%', height: '6px', accentColor: '#eab308', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.70rem', color: '#64748b', fontWeight: 750 }}>
                <span>40 Langsam</span>
                <button
                  type="button"
                  onClick={handleTapTempo}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    padding: '5px 14px',
                    borderRadius: '10px',
                    fontSize: '0.74rem',
                    fontWeight: 850,
                    color: '#0f172a',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.12s ease'
                  }}
                >
                  <Zap size={12} color="#eab308" />
                  <span>Tempo einklopfen (Tap)</span>
                </button>
                <span>240 Schnell</span>
              </div>
            </div>
          </div>

          {/* Active Song Context Banner */}
          {activeSongContext?.songTitle && (
            <div style={{
              width: '100%',
              maxWidth: '400px',
              background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
              border: '1.5px solid #fde047',
              borderRadius: '14px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 6px rgba(234, 179, 8, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Music size={15} style={{ color: '#ca8a04' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 850, color: '#854d0e' }}>
                  Song: <strong>{activeSongContext.songTitle}</strong>
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#854d0e', background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fde047' }}>
                {activeSongContext.targetBpm} BPM
              </span>
            </div>
          )}

          {/* Dual Action: Starten & Aufnahme (Desktop: Fest am Boden des Panels verankert, Mobile: Floating Sticky Pill) */}
          <div style={isMobileView ? {
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 20px) + 72px)',
            left: '16px',
            right: '16px',
            zIndex: 900,
            display: 'flex',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '8px',
            borderRadius: '20px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          } : {
            display: 'flex',
            gap: '10px',
            width: '100%',
            maxWidth: '400px',
            marginTop: 'auto',
            paddingTop: '6px'
          }}>
            <button
              type="button"
              onClick={handleTogglePlay}
              disabled={isRecording || isCountingIn}
              style={{
                flex: 1.3,
                minHeight: '52px',
                background: (isPlaying && !isRecording) ? '#0f172a' : (isRecording || isCountingIn ? '#cbd5e1' : 'linear-gradient(135deg, #facc15 0%, #eab308 100%)'),
                color: (isPlaying && !isRecording) ? '#ffffff' : (isRecording || isCountingIn ? '#ffffff' : '#0f172a'),
                border: 'none',
                borderRadius: '16px',
                padding: '10px 14px',
                fontSize: '0.96rem',
                fontWeight: 950,
                cursor: (isRecording || isCountingIn) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: (isPlaying && !isRecording) ? '0 4px 16px rgba(15, 23, 42, 0.25)' : '0 6px 20px rgba(234, 179, 8, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              {isPlaying && !isRecording ? (
                <>
                  <Square size={16} fill="currentColor" />
                  <span>Stoppen</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  <span>Beat starten</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleToggleRecording}
              style={{
                flex: 1,
                minHeight: '52px',
                background: isRecording ? '#dc2626' : (isCountingIn ? '#f59e0b' : '#fef2f2'),
                color: isRecording || isCountingIn ? '#ffffff' : '#dc2626',
                border: isRecording ? '2px solid #ef4444' : (isCountingIn ? '2px solid #d97706' : '1.5px solid #fecaca'),
                borderRadius: '16px',
                padding: '10px 12px',
                fontSize: '0.92rem',
                fontWeight: 950,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: isRecording ? '0 0 20px rgba(220, 38, 38, 0.55)' : '0 2px 8px rgba(220, 38, 38, 0.08)',
                transition: 'all 0.15s ease'
              }}
            >
              {isRecording ? (
                <>
                  <Square size={15} fill="currentColor" />
                  <span>Rec Stopp ({formatTime(recordSeconds)})</span>
                </>
              ) : isCountingIn ? (
                <>
                  <Clock size={15} className="animate-spin" />
                  <span>Einzähler {countInBeat}/{activeMeterInfo.countInBeats}</span>
                </>
              ) : (
                <>
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#dc2626' }} />
                  <span>Aufnahme</span>
                </>
              )}
            </button>
          </div>

          {/* 🎧 Apple / Spotify Take-Decision-Stage (Vorhören, Weiter üben oder Speichern) */}
          {pendingPreviewTake && (
            <div style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1.5px solid #fde68a',
              borderRadius: '16px',
              padding: '14px 16px',
              boxShadow: '0 8px 24px -4px rgba(245, 158, 11, 0.18), 0 2px 6px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 3px 8px rgba(245, 158, 11, 0.35)',
                    flexShrink: 0
                  }}>
                    <Headphones size={16} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        🎧 Deine Aufnahme anhören
                      </span>
                      <span style={{ fontSize: '0.56rem', color: '#94a3b8' }}>
                        {new Date(pendingPreviewTake.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0', lineHeight: 1.2 }}>
                      {pendingPreviewTake.title}
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDiscardPendingTake}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Schließen & verwerfen"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Mini Audio Playback Controls */}
              <div style={{
                background: '#ffffff',
                borderRadius: '10px',
                padding: '8px 12px',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <button
                  type="button"
                  onClick={handleTogglePreviewPlay}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: '#f59e0b',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
                    flexShrink: 0
                  }}
                >
                  {isPreviewPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" style={{ marginLeft: '1px' }} />}
                </button>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{
                    width: '100%',
                    height: '5px',
                    background: '#fef3c7',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${previewProgress}%`,
                      background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                      borderRadius: '999px',
                      transition: 'width 0.1s linear'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: '#78350f', fontFamily: 'SF Mono, monospace' }}>
                    <span>{formatTime(previewCurrentTime)}</span>
                    <span>{formatTime(pendingPreviewTake.duration)}</span>
                  </div>
                </div>
              </div>

              {/* 2 Primary Actions: Weiter üben (Löschen) OR An Aufnahmen senden */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                <button
                  type="button"
                  onClick={handleDiscardPendingTake}
                  className="tactile-btn"
                  style={{
                    flex: 1,
                    background: '#ffffff',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Weiter üben</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePendingTake}
                  disabled={isSavingTake}
                  className="tactile-btn"
                  style={{
                    flex: 1.4,
                    background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: isSavingTake ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    boxShadow: '0 3px 10px rgba(234, 179, 8, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Check size={14} strokeWidth={2.6} />
                  <span>{isSavingTake ? 'Speichern...' : 'Zu meinen Aufnahmen speichern ⭐'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 🌟 Success Toast when Take was permanently saved */}
          {savedTakeSuccessToast && (
            <div style={{
              width: '100%',
              background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
              border: '1.5px solid #fde047',
              borderRadius: '14px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'scaleIn 0.2s ease-out',
              boxShadow: '0 4px 12px rgba(234, 179, 8, 0.15)',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#ca8a04" />
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#854d0e' }}>
                  ✨ Im Aufnahmen-Modul gesichert!
                </span>
              </div>
              {onNavigateToRecordings && (
                <button
                  type="button"
                  onClick={onNavigateToRecordings}
                  style={{
                    background: '#eab308',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Öffnen →
                </button>
              )}
            </div>
          )}

          {/* ⭐️ Non-XP 3-Star Summary Card Modal */}
          {summaryCardData && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              overflowY: 'auto'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '24px 20px',
                maxWidth: '420px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
                animation: 'scaleIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                  border: '2px solid #facc15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ca8a04'
                }}>
                  <Sparkles size={30} />
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    RHYTHMUS-EVALUATION
                  </span>
                  <h3 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>
                    {summaryCardData.songTitle ? `Auswertung: ${summaryCardData.songTitle}` : 'Rhythmus-Auswertung'}
                  </h3>
                </div>

                {/* 1-3 Stars Rating Row */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', margin: '4px 0' }}>
                  {[1, 2, 3].map(starNum => {
                    const isLit = starNum <= summaryCardData.stars;
                    return (
                      <div
                        key={starNum}
                        style={{
                          transform: isLit ? 'scale(1.15)' : 'scale(0.9)',
                          transition: `all 0.3s ease-out ${starNum * 0.1}s`
                        }}
                      >
                        <Star
                          size={38}
                          fill={isLit ? '#eab308' : '#e2e8f0'}
                          color={isLit ? '#ca8a04' : '#cbd5e1'}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Precision % and Stats Grid */}
                <div style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 700 }}>Rhythmus-Präzision</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#854d0e', fontFamily: 'SF Mono, monospace' }}>
                      {summaryCardData.precision}%
                    </span>
                  </div>
                  <div style={{ height: '1px', background: '#cbd5e1' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: '#475569', fontWeight: 700 }}>
                    <span>{summaryCardData.barsCount} Takte absolviert</span>
                    <span>{summaryCardData.beatsCount} Hits</span>
                    <span>{summaryCardData.bpm} BPM</span>
                  </div>
                </div>

                {/* 🎯 Visual Micro-Timing Groove Radar Scale */}
                {summaryCardData.microTimingDeltas && summaryCardData.microTimingDeltas.length > 0 && (
                  <div style={{
                    width: '100%',
                    background: '#0f172a',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', fontWeight: 800 }}>
                      <span style={{ color: '#f59e0b' }}>-100ms (Zu früh ⚡)</span>
                      <span style={{ color: '#ca8a04', background: 'rgba(234, 179, 8, 0.2)', padding: '1px 6px', borderRadius: '4px' }}>
                        🎯 Golden Zone (±35ms)
                      </span>
                      <span style={{ color: '#3b82f6' }}>+100ms (Zu spät 🐢)</span>
                    </div>

                    {/* Micro-Timing Timeline Track */}
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '22px',
                      background: '#1e293b',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      {/* Central Target Zone (±35ms) */}
                      <div style={{
                        position: 'absolute',
                        left: '32.5%',
                        width: '35%',
                        top: 0,
                        bottom: 0,
                        background: 'rgba(234, 179, 8, 0.25)',
                        borderLeft: '1.5px dashed #eab308',
                        borderRight: '1.5px dashed #eab308'
                      }} />

                      {/* Center 0ms Line */}
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: 0,
                        bottom: 0,
                        width: '2px',
                        background: '#eab308'
                      }} />

                      {/* Plot Student Hit Markers */}
                      {summaryCardData.microTimingDeltas.map((delta, idx) => {
                        const clampedDelta = Math.max(-100, Math.min(100, delta));
                        const pct = ((clampedDelta + 100) / 200) * 100;
                        const isPerfect = Math.abs(clampedDelta) <= 35;
                        const isRushing = clampedDelta < -35;
                        const color = isPerfect ? '#eab308' : (isRushing ? '#f59e0b' : '#3b82f6');

                        return (
                          <div
                            key={idx}
                            style={{
                              position: 'absolute',
                              left: `${pct}%`,
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: color,
                              boxShadow: `0 0 6px ${color}`,
                              zIndex: 3
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 🎵 Recognized Note Structure Badge */}
                {summaryCardData.noteDistribution && (
                  <div style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#854d0e',
                    background: '#fefce8',
                    border: '1px solid #fde047',
                    borderRadius: '10px',
                    padding: '6px 12px',
                    width: '100%',
                    textAlign: 'center'
                  }}>
                    🎵 Erkannte Noten: ♩ Viertel {summaryCardData.noteDistribution.quartersPct}% • ♪ Achtel {summaryCardData.noteDistribution.eightsPct}% • 𝅘𝅥𝅯 16tel {summaryCardData.noteDistribution.sixteenthsPct}%
                  </div>
                )}

                {/* Didactic AI Advice Text */}
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, background: '#fefce8', padding: '12px 14px', borderRadius: '12px', borderLeft: '4px solid #eab308' }}>
                  {summaryCardData.advice}
                </p>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setSummaryCardData(null)}
                    style={{
                      flex: 1,
                      background: '#f1f5f9',
                      color: '#64748b',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Verwerfen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (summaryCardData && onRhythmScoreUpdateRef.current) {
                        onRhythmScoreUpdateRef.current(summaryCardData.precision, {
                          beatsCount: summaryCardData.beatsCount,
                          precision: summaryCardData.precision,
                          bpm: summaryCardData.bpm,
                          songTitle: summaryCardData.songTitle,
                          stars: summaryCardData.stars,
                          advice: summaryCardData.advice
                        });
                      }
                      setSummaryCardData(null);
                    }}
                    style={{
                      flex: 1.6,
                      background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                      color: '#0f172a',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)'
                    }}
                  >
                    <BookOpen size={14} />
                    <span>Ins Notenheft eintragen 📚</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Equalized Drum Beat Generator & Mixer Panel (Harmonized Studio Pro) */}
        <div style={{
          flex: '1 1 0%',
          minWidth: isMobileView ? '100%' : '320px',
          display: (!isMobileView || mobileTab === 'rhythms') ? 'flex' : 'none',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          gap: '14px',
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.04)',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Header mit klarer Micro-Copy & Live-Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 850, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                RHYTHMUS-GENERATOR
              </span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 950, color: '#0f172a', margin: '2px 0 0 0' }}>
                Begleit-Rhythmen
              </h3>
            </div>

            {isPlaying && (
              <span style={{
                fontSize: '0.70rem',
                fontWeight: 850,
                color: '#854d0e',
                background: '#fefce8',
                border: '1px solid #fef08a',
                padding: '4px 10px',
                borderRadius: '100px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#eab308' }} />
                Beat läuft
              </span>
            )}
          </div>

          {/* ANKER 2: DIE 4 BELIEBTESTEN RHYTHMEN (Tactile Studio Groove-Pads) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px'
          }}>
            {[
              { id: 'metronome', label: 'Metronom Klick', desc: 'Klassischer Klick', icon: '⏱️' },
              { id: 'rock', label: 'Rock & Pop', desc: 'Kräftiger Schlagzeug-Takt', icon: '🥁' },
              { id: 'hiphop', label: 'Hip-Hop Pocket', desc: 'Lässiger Boom-Bap Takt', icon: '🎧' },
              { id: 'singersongwriter', label: 'Liedermacher', desc: 'Akustik-Drum & Shaker', icon: '🎸' }
            ].map((styleOpt) => {
              const isSelected = selectedStyle === styleOpt.id;
              return (
                <button
                  key={styleOpt.id}
                  type="button"
                  onClick={() => {
                    setSelectedStyle(styleOpt.id as any);
                    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                      audioCtxRef.current.resume();
                    }
                    setIsPlaying(true);
                  }}
                  className="tactile-btn"
                  style={{
                    background: isSelected ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' : '#ffffff',
                    color: isSelected ? '#0f172a' : '#1e293b',
                    border: isSelected ? '2px solid #ca8a04' : '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '4px',
                    minHeight: '74px',
                    transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isSelected ? '0 6px 20px rgba(234, 179, 8, 0.35)' : '0 1px 3px rgba(0,0,0,0.03)',
                    textAlign: 'left',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{styleOpt.icon}</span>
                      <span style={{ fontSize: '0.90rem', fontWeight: 950 }}>{styleOpt.label}</span>
                    </div>
                    {isSelected && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isPlaying && (
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px', marginRight: '2px' }}>
                            <span className="eq-bar-1" style={{ width: '3px', background: '#0f172a', borderRadius: '1px' }} />
                            <span className="eq-bar-2" style={{ width: '3px', background: '#0f172a', borderRadius: '1px' }} />
                            <span className="eq-bar-3" style={{ width: '3px', background: '#0f172a', borderRadius: '1px' }} />
                          </div>
                        )}
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          background: 'rgba(15, 23, 42, 0.14)',
                          color: '#0f172a',
                          padding: '2px 7px',
                          borderRadius: '100px'
                        }}>
                          Aktiv
                        </span>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.68rem', color: isSelected ? 'rgba(15, 23, 42, 0.85)' : '#64748b', fontWeight: 650, marginTop: '2px' }}>
                    {styleOpt.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Einklapp-Schalter für weitere 7 Rhythmen */}
          <button
            type="button"
            onClick={() => setShowAllStyles(!showAllStyles)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1.5px dashed #cbd5e1',
              background: showAllStyles ? '#f1f5f9' : '#f8fafc',
              color: '#334155',
              fontSize: '0.78rem',
              fontWeight: 850,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{showAllStyles ? '▴ Weniger Rhythmen anzeigen' : '▾ Weitere 7 Rhythmen anzeigen (Jazz, Latin, Funk, Walzer...)'}</span>
          </button>

          {/* Ausgeklappte Rhythmus-Karten */}
          {showAllStyles && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              animation: 'fadeIn 0.15s ease'
            }}>
              {[
                { id: 'swing', label: 'Jazz Swing', icon: '🎷', desc: 'Triolen-Swing' },
                { id: 'latin', label: 'Latin Bossa', icon: '🪇', desc: 'Bossa-Nova' },
                { id: 'funk', label: 'Funk Break', icon: '🕺', desc: 'Synkopiert' },
                { id: 'reggae', label: 'Reggae One-Drop', icon: '🌴', desc: 'Offbeat' },
                { id: 'walzer', label: 'Walzer (3/4)', icon: '💃', desc: 'Klassischer Takt' },
                { id: 'ballad68', label: '6/8 Ballade', icon: '🌙', desc: 'Sanfter Beat' },
                { id: 'disco', label: 'Disco (4-on-the-Floor)', icon: '🪩', desc: 'Tanz-Groove', spanFull: true }
              ].map((styleOpt) => {
                const isSelected = selectedStyle === styleOpt.id;
                return (
                  <button
                    key={styleOpt.id}
                    type="button"
                    onClick={() => {
                      setSelectedStyle(styleOpt.id as any);
                      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                        audioCtxRef.current.resume();
                      }
                      setIsPlaying(true);
                    }}
                    style={{
                      gridColumn: (styleOpt as any).spanFull ? '1 / -1' : undefined,
                      background: isSelected ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' : '#ffffff',
                      color: isSelected ? '#0f172a' : '#1e293b',
                      border: isSelected ? '2px solid #ca8a04' : '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      fontSize: '0.80rem',
                      fontWeight: isSelected ? 900 : 750,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: '44px',
                      boxShadow: isSelected ? '0 2px 8px rgba(234, 179, 8, 0.25)' : 'none',
                      transition: 'all 0.12s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{styleOpt.icon}</span>
                      <span>{styleOpt.label}</span>
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: '0.62rem', fontWeight: 900, background: 'rgba(15, 23, 42, 0.12)', color: '#0f172a', padding: '2px 6px', borderRadius: '100px' }}>
                        Aktiv
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ANKER 4: GROOVE-STUFE (Standard / Mehr Pep) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '12px 16px'
          }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Rhythmus-Variante
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { id: 'A', label: 'Grund-Rhythmus', desc: 'Standard Groove' },
                { id: 'B', label: 'Mehr Schwung', desc: 'Variante mit Kick & Snare' }
              ].map((varOpt) => {
                const isSelected = selectedVariation === varOpt.id;
                return (
                  <button
                    key={varOpt.id}
                    type="button"
                    onClick={() => setSelectedVariation(varOpt.id as any)}
                    style={{
                      background: isSelected ? '#fefce8' : '#ffffff',
                      color: isSelected ? '#854d0e' : '#475569',
                      border: isSelected ? '2px solid #eab308' : '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      fontSize: '0.80rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: isSelected ? '0 2px 6px rgba(234, 179, 8, 0.15)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>{varOpt.label}</div>
                    <span style={{ fontSize: '0.64rem', fontWeight: 650, color: isSelected ? '#a16207' : '#94a3b8' }}>
                      {varOpt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SEKUNDÄR-TOOLBOX: Profi-Studio, Mixer & Fills */}
          <div style={{
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            background: showStudioMixer ? '#ffffff' : '#f8fafc',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
            marginTop: 'auto'
          }}>
            <button
              type="button"
              onClick={() => setShowStudioMixer(!showStudioMixer)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                color: showStudioMixer ? '#0f172a' : '#64748b',
                fontWeight: 800,
                fontSize: '0.78rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={14} color={showStudioMixer ? '#eab308' : '#64748b'} />
                <span>Mischpult & Klangeinstellungen</span>
                {selectedVariation === 'C' && (
                  <span style={{ fontSize: '0.62rem', fontWeight: 850, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '100px' }}>
                    Wirbel aktiv
                  </span>
                )}
              </div>
              <ChevronRight size={16} style={{ transform: showStudioMixer ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {showStudioMixer && (
              <div style={{
                padding: '12px 14px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: '#fafbfc'
              }}>
                {/* Master Volume Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Volume2 size={14} color="#0f172a" />
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>Master-Lautstärke</span>
                      {volMaster > 100 && (
                        <span style={{ fontSize: '0.56rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: '#eab308', color: '#ffffff' }}>
                          BOOST
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>{volMaster}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={volMaster}
                    onChange={(e) => setVolMaster(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#eab308', cursor: 'pointer' }}
                  />
                </div>

                {/* Variante C (Fill/Komplex) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>Variante C: Fill / Komplex</span>
                    <span style={{ fontSize: '0.64rem', color: '#64748b' }}>Zusätzliche Drum-Fills und Synkopen</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedVariation(selectedVariation === 'C' ? 'A' : 'C')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: selectedVariation === 'C' ? '1.5px solid #eab308' : '1px solid #cbd5e1',
                      background: selectedVariation === 'C' ? '#fefce8' : '#ffffff',
                      color: selectedVariation === 'C' ? '#854d0e' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {selectedVariation === 'C' ? '✓ Aktiviert' : 'Einschalten'}
                  </button>
                </div>

                {/* Instrumenten Mixer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b' }}>SCHLAGZEUG-KLANG:</span>
                    <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#0f172a' }}>
                      🥁 {selectedStyle === 'singersongwriter' ? 'Warmes Mahagoni-Schlagzeug' :
                           selectedStyle === 'swing' ? 'Traditionelles Jazz-Schlagzeug' :
                           selectedStyle === 'hiphop' ? 'Tiefes Boom-Bap Schlagzeug' :
                           selectedStyle === 'reggae' ? 'Reggae One-Drop Schlagzeug' :
                           selectedStyle === 'latin' ? 'Warmes Bossa-Percussion-Set' :
                           selectedStyle === 'funk' ? 'Funk-Studio-Schlagzeug' :
                           selectedStyle === 'rock' ? 'Kräftiges Rock-Schlagzeug' :
                           selectedStyle === 'walzer' ? 'Akustisches Walzer-Set' :
                           selectedStyle === 'ballad68' ? 'Sanftes Balladen-Schlagzeug' :
                           selectedStyle === 'disco' ? 'Disco-Schlagzeug' : 'Akustisches Holz-Klick-Set'}
                    </span>
                  </div>

                  {selectedStyle === 'metronome' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 750, minWidth: '70px' }}>Klick: {volMetronome}%</span>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={volMetronome}
                        onChange={(e) => setVolMetronome(Number(e.target.value))}
                        style={{ flex: 1, accentColor: '#eab308' }}
                      />
                      <button
                        type="button"
                        onClick={() => toggleMute('click')}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          background: isMuted('click') ? '#ea4335' : '#ffffff',
                          color: isMuted('click') ? '#ffffff' : '#64748b',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                        }}
                      >
                        M
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : 'repeat(2, 1fr)', gap: '8px' }}>
                      {/* Kick */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', fontWeight: 750 }}>
                          <span>Basstrommel (Kick)</span>
                          <span>{volKick}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={volKick}
                          onChange={(e) => setVolKick(Number(e.target.value))}
                          style={{ accentColor: '#eab308' }}
                        />
                      </div>
                      {/* Snare */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', fontWeight: 750 }}>
                          <span>Snare (Trommel)</span>
                          <span>{volSnare}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={volSnare}
                          onChange={(e) => setVolSnare(Number(e.target.value))}
                          style={{ accentColor: '#eab308' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🎛️ Exact Loopstation Cubase 15 Pro Auto-Einmessung Modal */}
      {isLoopstationCalibrating && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '32px 28px',
            maxWidth: '380px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '18px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              background: loopstationPhaseState === 'result' ? '#fefce8' : '#e0e7ff',
              color: loopstationPhaseState === 'result' ? '#ca8a04' : '#4f46e5',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: loopstationPhaseState === 'result' ? '0 6px 18px rgba(234, 179, 8, 0.25)' : '0 6px 18px rgba(79, 70, 229, 0.25)',
              transition: 'all 0.3s ease'
            }}>
              {loopstationPhaseState === 'result' ? <CheckCircle2 size={28} /> : <Zap size={28} style={{ animation: 'pulse 1.5s infinite' }} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{
                fontSize: '0.62rem',
                fontWeight: 900,
                color: '#4f46e5',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                Cubase 15 Pro Auto-Einmessung (Loopstation Modus)
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1d1d1f', margin: 0 }}>
                {loopstationPhaseState === 'ambient' && "1/3: Geräte-Lautstärke & Raumpegel einpegeln..."}
                {loopstationPhaseState === 'clicks' && `2/3: Metronom-Töne Auto-Einmessung (${loopstationClickCount}/5)...`}
                {loopstationPhaseState === 'result' && "Latenz Erfolgreich Ermittelt! 🎯 (Weiter zu Schritt 3)"}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#86868b', lineHeight: 1.4, margin: 0 }}>
                {loopstationPhaseState === 'ambient' && "Messung der Hintergrundgeräusche deines Mikrofons. Bitte Lautstärke auf normale Übe-Lautstärke stellen."}
                {loopstationPhaseState === 'clicks' && "Empfange akustische Metronom-Impulse über Lautsprecher/Mikrofon..."}
                {loopstationPhaseState === 'result' && "Hardware-Latenz für Loopstation & Rhythmus-Coach exakt im System gespeichert."}
              </p>
            </div>

            {loopstationPhaseState !== 'result' ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: '#f1f5f9',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: loopstationPhaseState === 'ambient' ? '20%' : `${20 + (loopstationClickCount / 5) * 80}%`,
                    background: 'linear-gradient(90deg, #eab308 0%, #4f46e5 100%)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                {loopstationPhaseState === 'ambient' && (
                  <div style={{
                    width: '100%',
                    background: '#0f172a',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginTop: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', fontWeight: 800 }}>
                      <span style={{ color: '#94a3b8' }}>Geräte-Lautstärke Pegel</span>
                      <span style={{ color: '#ca8a04', background: 'rgba(234, 179, 8, 0.2)', padding: '1px 6px', borderRadius: '4px' }}>
                        🎯 Ziel: Optimale Zone (35-75%)
                      </span>
                    </div>

                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '16px',
                      background: '#1e293b',
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}>
                      {/* Target Level Window (35% to 75%) */}
                      <div style={{
                        position: 'absolute',
                        left: '35%',
                        width: '40%',
                        top: 0,
                        bottom: 0,
                        background: 'rgba(234, 179, 8, 0.25)',
                        borderLeft: '1.5px dashed #eab308',
                        borderRight: '1.5px dashed #eab308'
                      }} />

                      {/* Live VU Meter Level Bar */}
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, loopstationMicLevel)}%`,
                        background: loopstationMicLevel > 80 ? '#ef4444' : (loopstationMicLevel >= 30 ? '#eab308' : '#3b82f6'),
                        borderRadius: '6px',
                        transition: 'width 0.05s ease-out'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.60rem', color: '#94a3b8', textAlign: 'center', fontWeight: 700 }}>
                      💡 Bitte stelle die Lautsprecher-Lautstärke deines Geräts so ein, dass der Pegel im optimalen Bereich liegt.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px 20px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800 }}>ERMITTELTE HARDWARE-LATENZ</span>
                <span style={{ fontSize: '1.8rem', color: '#ca8a04', fontWeight: 900, fontFamily: 'SF Mono, monospace' }}>
                  +{loopstationLatencyResult} ms
                </span>
                <span style={{ fontSize: '0.62rem', color: '#854d0e', background: '#fefce8', border: '1px solid #fde047', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                  🎯 100% Sample-Genau Kalibriert (DSP Matrix)
                </span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '4px' }}>
              {loopstationPhaseState === 'ambient' && (
                <button
                  type="button"
                  onClick={() => proceedToStep2PingCalibration()}
                  className="tactile-btn"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(234, 179, 8, 0.3)'
                  }}
                >
                  Lautstärke ist eingestellt ➔ Weiter zu Schritt 2 (Latenz Messen) 🚀
                </button>
              )}

              {loopstationPhaseState === 'result' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsLoopstationCalibrating(false);
                    runInstrumentToneCalibration();
                  }}
                  className="tactile-btn"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(234, 179, 8, 0.3)'
                  }}
                >
                  Latenz Übernehmen & Weiter zu Schritt 3 🚀
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (ambientToneTimerRef.current) clearInterval(ambientToneTimerRef.current);
                  if (loopstationStreamRef.current) {
                    loopstationStreamRef.current.getTracks().forEach(t => t.stop());
                    loopstationStreamRef.current = null;
                  }
                  setIsLoopstationCalibrating(false);
                }}
                className="tactile-btn"
                style={{
                  width: '100%',
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎙️ Instrument 3-Tone Einpegeln Modal */}
      {isInstrumentCalibrating && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '28px',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            {instrumentToneDoneText ? (
              <>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#fefce8',
                  border: '1.5px solid #fde047',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ca8a04'
                }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#854d0e' }}>Instrument Perfekt Eingepegelt!</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', fontWeight: 700 }}>
                  {instrumentToneDoneText}
                </p>
              </>
            ) : (
              <>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#fefce8',
                  border: '1.5px solid #fde047',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ca8a04'
                }}>
                  <Mic size={32} />
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  SCHRITT 3/3: INSTRUMENT EINPEGELN (3 TÖNE)
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '1.15rem', fontWeight: 900, color: '#1e293b' }}>
                  Spiele 3 Töne nacheinander auf deinem Instrument
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                  In Raumstille (ohne Metronom). Jeder Ton wird einzeln vom Mikrofon quittiert und eingeloggt.
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  {[1, 2, 3].map(num => (
                    <div
                      key={num}
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '16px',
                        background: num <= instrumentToneCount ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' : '#f1f5f9',
                        color: num <= instrumentToneCount ? '#0f172a' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1rem',
                        transition: 'all 0.2s ease-out',
                        boxShadow: num <= instrumentToneCount ? '0 6px 14px rgba(234, 179, 8, 0.35)' : 'none'
                      }}
                    >
                      {num <= instrumentToneCount ? '✓' : `Ton ${num}`}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 🔴 4-Beat Count-In HUD Overlay */}
      {isCountingIn && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '32px 40px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
            border: '2px solid rgba(239, 68, 68, 0.2)',
            maxWidth: '340px',
            width: '90%',
            animation: 'scaleIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fee2e2',
              color: '#dc2626',
              padding: '5px 14px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626', animation: 'pulse 1s infinite' }} />
              <span>Aufnahme startet...</span>
            </div>

            {/* Big Animated Count Number */}
            <div
              key={countInBeat}
              style={{
                fontSize: '5rem',
                fontWeight: 900,
                color: '#dc2626',
                lineHeight: 1,
                fontFamily: 'SF Pro Display, -apple-system, sans-serif',
                animation: 'countdownPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
            >
              {countInBeat}
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
              marginTop: '4px'
            }}>
              {Array.from({ length: activeMeterInfo.countInBeats }, (_, i) => i + 1).map(b => (
                <div
                  key={b}
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: b <= countInBeat ? '#dc2626' : '#e2e8f0',
                    transition: 'all 0.15s ease',
                    transform: b === countInBeat ? 'scale(1.3)' : 'scale(1)',
                    boxShadow: b === countInBeat ? '0 0 10px rgba(220, 38, 38, 0.5)' : 'none'
                  }}
                />
              ))}
            </div>

            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              Mache dich bereit für Takt 1 ({bpm} BPM • {activeMeterInfo.meter} Takt)
            </span>

            <button
              type="button"
              onClick={handleStopAll}
              style={{
                marginTop: '6px',
                background: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ⏱️ 7-Minuten Limit Reached Toast */}
      {limitReachedToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '16px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.28)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 999999,
          maxWidth: '460px',
          width: '92%',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#eab308',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0f172a',
            flexShrink: 0
          }}>
            <CheckCircle2 size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#ffffff' }}>
              7-Minuten-Aufnahmelimit erreicht!
            </h5>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: '#cbd5e1', lineHeight: 1.3 }}>
              Deine Aufnahme wurde sicher gespeichert. Das Metronom läuft für dich weiter!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLimitReachedToast(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};


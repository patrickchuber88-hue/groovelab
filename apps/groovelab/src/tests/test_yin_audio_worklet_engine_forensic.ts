/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: YIN AUDIO WORKLET ENGINE FORENSIC VERIFICATION SUITE
 * ==============================================================================
 * Standards: 0,1% Enterprise Architecture Goldstandard
 *            W3C AudioWorkletGlobalScope Specification (No TypeScript in worker scope)
 *            Acoustic Physics & YIN Autocorrelation (de Cheveigné & Kawahara, 2002)
 * 
 * Verifies:
 * 1. Nomenclature & Truthfulness: ZERO fake "Wasm", "Polyphonic", "Goertzel" in Tuner stack.
 * 2. AudioWorklet Packaging: JavaScript code string inlined, Blob URL valid, zero TS syntax.
 * 3. Lock-Free Audio-Thread Safety: Worklet process() strictly <= O(N) ringbuffer copies.
 * 4. Dual-Path SharedArrayBuffer: Safe feature detection without exceptions.
 * 5. Acoustic Bass Detection: B0 (30.87 Hz), E1 (41.20 Hz) verified at 48 kHz and 96 kHz.
 * 6. Numerical Hardening: Parabolic epsilon guard, RMS noise squelch gate, NaN immunity.
 * 7. Monolith Ceiling: CampusTuner.tsx strictly under 1500 lines.
 * ==============================================================================
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  YIN_WORKLET_PROCESSOR_NAME,
  YIN_WORKLET_PROCESSOR_CODE,
  getYinWorkletBlobUrl
} from '../services/audio/YinWorkletProcessor';
import {
  isSharedArrayBufferSupported,
  YinAudioWorkletEngine
} from '../services/audio/YinAudioWorkletEngine';

console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║   CAMPUS-GROOVELAB: YIN AUDIO WORKLET FORENSIC SUITE (0,1%)       ║');
console.log('║   Acoustic Physics, Worklet Bundling & Numerical Hardening         ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

async function runYinAudioWorkletForensicSuite() {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res.then(() => {
          console.log(`  ✅ [PASS] ${name}`);
          passed++;
        }).catch((err: any) => {
          console.error(`  ❌ [FAIL] ${name}: ${err?.message || err}`);
          failed++;
        });
      } else {
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
      }
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}: ${err?.message || err}`);
      failed++;
    }
  }

  // ===========================================================================
  // SECTION 1: NOMENCLATURE & CODEBASE TRUTH
  // ===========================================================================
  console.log('--- [STAGE 1/6] NOMENCLATURE & CODEBASE TRUTH ---');

  test('CampusTuner.tsx: Zero fake "Wasm", "Polyphonic", "Goertzel", "Polytune" claims', () => {
    const tunerPath = path.resolve('apps/groovelab/src/components/campus/CampusTuner.tsx');
    const content = fs.readFileSync(tunerPath, 'utf-8');
    assert.strictEqual(/wasm/i.test(content), false, 'CampusTuner must not contain fake Wasm claims');
    assert.strictEqual(/polyphonic/i.test(content), false, 'CampusTuner must not contain fake Polyphonic claims');
    assert.strictEqual(/polytune/i.test(content), false, 'CampusTuner must not contain fake Polytune claims');
    assert.strictEqual(/goertzel/i.test(content), false, 'CampusTuner must not contain fake Goertzel claims');
  });

  test('CampusTuner.tsx: Octave-jump hack is completely removed', () => {
    const tunerPath = path.resolve('apps/groovelab/src/components/campus/CampusTuner.tsx');
    const content = fs.readFileSync(tunerPath, 'utf-8');
    assert.strictEqual(
      content.includes('pitch > targetString.freq * 1.7'),
      false,
      'CampusTuner must not contain octave-jump hack'
    );
  });

  test('YinWorkletProcessor: Zero fake terminology in processor code string', () => {
    assert.strictEqual(/wasm/i.test(YIN_WORKLET_PROCESSOR_CODE), false);
    assert.strictEqual(/polyphonic/i.test(YIN_WORKLET_PROCESSOR_CODE), false);
    assert.strictEqual(/goertzel/i.test(YIN_WORKLET_PROCESSOR_CODE), false);
    assert.strictEqual(/polytune/i.test(YIN_WORKLET_PROCESSOR_CODE), false);
  });

  // ===========================================================================
  // SECTION 2: AUDIOWORKLET PACKAGING & SYNTAX SAFETY
  // ===========================================================================
  console.log('\n--- [STAGE 2/6] AUDIOWORKLET SCOPE & BLOB URL PACKAGING ---');

  test('YinWorkletProcessor: Contains valid JavaScript without TypeScript annotations', () => {
    // Check for TS syntax that breaks AudioWorkletGlobalScope
    assert.strictEqual(/\binterface\b/.test(YIN_WORKLET_PROCESSOR_CODE), false, 'No TS interface in worklet string');
    assert.strictEqual(/\bprivate\b/.test(YIN_WORKLET_PROCESSOR_CODE), false, 'No TS private keyword in worklet string');
    assert.strictEqual(/\breadonly\b/.test(YIN_WORKLET_PROCESSOR_CODE), false, 'No TS readonly keyword in worklet string');
    assert.strictEqual(/\bdeclare\b/.test(YIN_WORKLET_PROCESSOR_CODE), false, 'No TS declare keyword in worklet string');
    assert.ok(YIN_WORKLET_PROCESSOR_CODE.includes('registerProcessor'), 'Must register processor');
    assert.ok(YIN_WORKLET_PROCESSOR_CODE.includes(YIN_WORKLET_PROCESSOR_NAME), 'Must use canonical processor name');
  });

  test('YinWorkletProcessor: process() has ZERO pitch detection loops (Audio-Thread Protection)', () => {
    // The processor code must NOT do difference functions or CMNDF in process()
    assert.strictEqual(
      YIN_WORKLET_PROCESSOR_CODE.includes('detectPitch'),
      false,
      'Worklet process() must not perform pitch detection'
    );
    assert.strictEqual(
      YIN_WORKLET_PROCESSOR_CODE.includes('cmndf'),
      false,
      'Worklet process() must not calculate CMNDF'
    );
    assert.ok(
      YIN_WORKLET_PROCESSOR_CODE.includes('Atomics.store'),
      'Worklet must store write index via Atomics in shared mode'
    );
  });

  // ===========================================================================
  // SECTION 3: DUAL-PATH FEATURE DETECTION
  // ===========================================================================
  console.log('\n--- [STAGE 3/6] DUAL-PATH SHAREDARRAYBUFFER FEATURE DETECTION ---');

  test('isSharedArrayBufferSupported: Executes safely without throwing', () => {
    const supported = isSharedArrayBufferSupported();
    assert.strictEqual(typeof supported, 'boolean');
  });

  test('YinAudioWorkletEngine: Exposes dynamic lowpass cutoff updater (setLowpassCutoff)', () => {
    const engine = new YinAudioWorkletEngine();
    assert.strictEqual(typeof engine.setLowpassCutoff, 'function');
  });

  // ===========================================================================
  // SECTION 4: ACOUSTIC PHYSICS & BASS FREQUENCY DETECTION
  // ===========================================================================
  console.log('\n--- [STAGE 4/6] ACOUSTIC PHYSICS & BASS PITCH DETECTION ---');

  // Helper: Synthesize pure sine wave buffer
  function generateSineBuffer(freq: number, sampleRate: number, numSamples: number): Float32Array {
    const buffer = new Float32Array(numSamples);
    const omega = 2 * Math.PI * freq / sampleRate;
    for (let i = 0; i < numSamples; i++) {
      buffer[i] = 0.8 * Math.sin(omega * i);
    }
    return buffer;
  }

  // Helper: Access private computeYin for deterministic headless verification
  const engineInstance = new YinAudioWorkletEngine();
  const computeYin = (engineInstance as any).computeYin.bind(engineInstance);

  test('5-String Bass Low B0 (30.87 Hz) @ 48kHz: Accurately detected (< 0.5 Hz error)', () => {
    (engineInstance as any).audioContext = { sampleRate: 48000 };
    (engineInstance as any).yinBuffer = new Float32Array(2048);
    const buf = generateSineBuffer(30.87, 48000, 4096);
    const detected = computeYin(buf);
    assert.ok(detected > 0, `Expected pitch > 0, got ${detected}`);
    const error = Math.abs(detected - 30.87);
    assert.ok(error < 0.5, `B0 frequency error too high: ${error.toFixed(3)} Hz (detected: ${detected.toFixed(2)} Hz)`);
  });

  test('4-String Bass Low E1 (41.20 Hz) @ 48kHz: Accurately detected (< 0.5 Hz error)', () => {
    (engineInstance as any).audioContext = { sampleRate: 48000 };
    (engineInstance as any).yinBuffer = new Float32Array(2048);
    const buf = generateSineBuffer(41.20, 48000, 4096);
    const detected = computeYin(buf);
    assert.ok(detected > 0, `Expected pitch > 0, got ${detected}`);
    const error = Math.abs(detected - 41.20);
    assert.ok(error < 0.5, `E1 frequency error too high: ${error.toFixed(3)} Hz (detected: ${detected.toFixed(2)} Hz)`);
  });

  test('Cello Low C2 (65.41 Hz) @ 48kHz: Accurately detected (< 0.5 Hz error)', () => {
    (engineInstance as any).audioContext = { sampleRate: 48000 };
    (engineInstance as any).yinBuffer = new Float32Array(2048);
    const buf = generateSineBuffer(65.41, 48000, 4096);
    const detected = computeYin(buf);
    assert.ok(detected > 0, `Expected pitch > 0, got ${detected}`);
    const error = Math.abs(detected - 65.41);
    assert.ok(error < 0.5, `C2 frequency error too high: ${error.toFixed(3)} Hz (detected: ${detected.toFixed(2)} Hz)`);
  });

  test('Concert Pitch A4 (440.00 Hz) @ 48kHz: Accurately detected (< 0.5 Hz error)', () => {
    (engineInstance as any).audioContext = { sampleRate: 48000 };
    (engineInstance as any).yinBuffer = new Float32Array(2048);
    const buf = generateSineBuffer(440.00, 48000, 4096);
    const detected = computeYin(buf);
    assert.ok(detected > 0, `Expected pitch > 0, got ${detected}`);
    const error = Math.abs(detected - 440.00);
    assert.ok(error < 0.5, `A4 frequency error too high: ${error.toFixed(3)} Hz (detected: ${detected.toFixed(2)} Hz)`);
  });

  test('High Violin E5 (659.25 Hz) @ 48kHz: Accurately detected (< 0.5 Hz error)', () => {
    (engineInstance as any).audioContext = { sampleRate: 48000 };
    (engineInstance as any).yinBuffer = new Float32Array(2048);
    const buf = generateSineBuffer(659.25, 48000, 4096);
    const detected = computeYin(buf);
    assert.ok(detected > 0, `Expected pitch > 0, got ${detected}`);
    const error = Math.abs(detected - 659.25);
    assert.ok(error < 0.5, `E5 frequency error too high: ${error.toFixed(3)} Hz (detected: ${detected.toFixed(2)} Hz)`);
  });

  test('Studio 96kHz Interface: Low B0 (30.87 Hz) with N=8192 accurately detected', () => {
    (engineInstance as any).audioContext = { sampleRate: 96000 };
    (engineInstance as any).yinBuffer = new Float32Array(4096);
    const buf = generateSineBuffer(30.87, 96000, 8192);
    const detected = computeYin(buf);
    assert.ok(detected > 0, `Expected pitch > 0, got ${detected}`);
    const error = Math.abs(detected - 30.87);
    assert.ok(error < 0.5, `96kHz B0 frequency error too high: ${error.toFixed(3)} Hz (detected: ${detected.toFixed(2)} Hz)`);
  });

  // ===========================================================================
  // SECTION 5: NUMERICAL HARDENING & NOISE SQUELCH
  // ===========================================================================
  console.log('\n--- [STAGE 5/6] NUMERICAL HARDENING & SQUELCH GATES ---');

  test('RMS Squelch: Pure silence buffer returns -1', () => {
    (engineInstance as any).audioContext = { sampleRate: 48000 };
    (engineInstance as any).yinBuffer = new Float32Array(2048);
    const silence = new Float32Array(4096);
    const detected = computeYin(silence);
    assert.strictEqual(detected, -1, 'Silence must return -1');
  });

  test('RMS Squelch: Ambient room noise (< 0.005 RMS) rejected with -1', () => {
    (engineInstance as any).audioContext = { sampleRate: 48000 };
    (engineInstance as any).yinBuffer = new Float32Array(2048);
    const noise = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) {
      noise[i] = (Math.random() - 0.5) * 0.004; // RMS ~ 0.0011
    }
    const detected = computeYin(noise);
    assert.strictEqual(detected, -1, 'Sub-squelch noise must return -1');
  });

  test('Parabolic Epsilon Guard: Constant buffer does not throw NaN or Infinity', () => {
    (engineInstance as any).audioContext = { sampleRate: 48000 };
    (engineInstance as any).yinBuffer = new Float32Array(2048);
    const dcBuffer = new Float32Array(4096).fill(0.5);
    const detected = computeYin(dcBuffer);
    assert.ok(!isNaN(detected) && isFinite(detected), 'Must not return NaN or Infinity on DC signal');
  });

  // ===========================================================================
  // SECTION 6: MONOLITH CEILING COMPLIANCE
  // ===========================================================================
  console.log('\n--- [STAGE 6/6] MONOLITH CEILING COMPLIANCE ---');

  test('CampusTuner.tsx: Line count is strictly <= 1500 lines', () => {
    const tunerPath = path.resolve('apps/groovelab/src/components/campus/CampusTuner.tsx');
    const content = fs.readFileSync(tunerPath, 'utf-8');
    const lines = content.split('\n').length;
    assert.ok(
      lines <= 1500,
      `CampusTuner.tsx has ${lines} lines, exceeding the 1500-lines monolith limit!`
    );
    console.log(`      ↳ Current CampusTuner.tsx line count: ${lines} (Budget: 1500 lines)`);
  });

  console.log('\n────────────────────────────────────────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🏆 100% SUCCESS: All YIN AudioWorklet Engine Forensic Invariants Verified.');
  }
}

runYinAudioWorkletForensicSuite().catch(err => {
  console.error('Fatal YIN AudioWorklet forensic error:', err);
  process.exit(1);
});

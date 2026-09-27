/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: RELATIONAL HARMONIC ENGINE FORENSIC SUITE
 * ==============================================================================
 * Standards: DIN EN ISO/IEC 25010 (Functional Suitability, Reliability),
 *            W3C Web Audio API (Hardware clock & synthesis safety)
 * 
 * Tests:
 * 1. Default A-Moll Jam-Preset integrity (Am - F - C - G, Junior/Teen/Pro scales)
 * 2. Unpitched / Drum / Squelch noise immunity (RMS < 0.005 & low chroma peak ratio)
 * 3. Pitched 4-Bar Audio harmonic recognition (Am - F - C - G chord & key detection)
 * 4. Frequency & Note-Name parsing correctness
 * 5. Level-Specific Target Tone Guarantee (Junior Bar 4 illumination invariant)
 * 6. Full Relational Tone Matrix across all 4 bars (Consonance, roles, didactic hints)
 * 7. Two-Pass Reconciliation & Single-Bar Pause / Squelch Immunity
 * 8. Short-Buffer / Fast-Tempo Clamped Probe Windowing (Zero probe drops)
 * ==============================================================================
 */

import assert from 'assert';
import {
  RelationalHarmonicEngine,
  pitchClassToNoteName,
  noteNameToFreq,
  noteNameToPitchClass,
  evaluateToneToChord,
  evaluateToneAcrossFourBars,
  buildRelationalToneMatrix
} from '../services/audio/RelationalHarmonicEngine';

console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║   CAMPUS-GROOVELAB: RELATIONAL HARMONIC ENGINE FORENSIC SUITE     ║');
console.log('║   Harmonic Intelligence, 4-Bar Chord Relations & Didactic Scales  ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

export async function runRelationalHarmonicEngineTests() {
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

  // Helper: Create Mock AudioBuffer
  function createMockAudioBuffer(
    channels: number,
    length: number,
    sampleRate: number,
    fillFn?: (sampleIdx: number, channel: number) => number
  ): AudioBuffer {
    const channelData: Float32Array[] = [];
    for (let c = 0; c < channels; c++) {
      const data = new Float32Array(length);
      if (fillFn) {
        for (let i = 0; i < length; i++) {
          data[i] = fillFn(i, c);
        }
      }
      channelData.push(data);
    }

    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: (c: number) => channelData[c],
      copyFromChannel: () => {},
      copyToChannel: () => {}
    } as unknown as AudioBuffer;
  }

  console.log('--- [STAGE 1/6] DEFAULT JAM-PRESET & CONTRACT VERIFICATION ---');

  test('Default Jam-Preset has key A-Moll and Am - F - C - G progression', () => {
    const preset = RelationalHarmonicEngine.getDefaultJamPreset();
    assert.strictEqual(preset.key, 'A-Moll');
    assert.strictEqual(preset.rootNote, 'A');
    assert.strictEqual(preset.mode, 'minor');
    assert.strictEqual(preset.isAcousticOrJamPreset, true);
    assert.strictEqual(preset.bars.length, 4);

    assert.strictEqual(preset.bars[0].chord, 'Am');
    assert.strictEqual(preset.bars[0].rootNote, 'A');
    assert.deepStrictEqual(preset.bars[0].targetNotes, ['A', 'C', 'E']);

    assert.strictEqual(preset.bars[1].chord, 'F');
    assert.strictEqual(preset.bars[1].rootNote, 'F');
    assert.deepStrictEqual(preset.bars[1].targetNotes, ['F', 'A', 'C']);

    assert.strictEqual(preset.bars[2].chord, 'C');
    assert.strictEqual(preset.bars[2].rootNote, 'C');
    assert.deepStrictEqual(preset.bars[2].targetNotes, ['C', 'E', 'G']);

    assert.strictEqual(preset.bars[3].chord, 'G');
    assert.strictEqual(preset.bars[3].rootNote, 'G');
    assert.deepStrictEqual(preset.bars[3].targetNotes, ['G', 'H', 'D']);
  });

  test('Default Jam-Preset has age-differentiated scales (Junior, Teen, Pro)', () => {
    const preset = RelationalHarmonicEngine.getDefaultJamPreset();
    assert.deepStrictEqual(preset.scales.junior, ['A', 'C', 'E']);
    assert.deepStrictEqual(preset.scales.teen, ['A', 'C', 'D', 'E', 'G']);
    assert.deepStrictEqual(preset.scales.pro, ['A', 'H', 'C', 'D', 'E', 'F', 'G']);
  });

  console.log('--- [STAGE 2/6] LEVEL-SPECIFIC TARGET TONE GUARANTEE (NO DROPPED GLOW) ---');

  test('Junior Bar 4 illumination invariant: Every bar has a target tone in Junior scale', () => {
    const preset = RelationalHarmonicEngine.getDefaultJamPreset();
    const juniorScale = preset.scales.junior; // ['A', 'C', 'E']

    for (let b = 0; b < 4; b++) {
      const bar = preset.bars[b];
      const targetTone = bar.targetToneByLevel.junior;
      assert(
        juniorScale.includes(targetTone),
        `Bar ${b + 1} (${bar.chord}) target tone '${targetTone}' MUST exist in Junior scale ${JSON.stringify(juniorScale)}`
      );
    }

    // Explicitly verify Bar 4 (G major) resolves to consonant Junior note 'E' (or 'A')
    assert(
      preset.bars[3].targetToneByLevel.junior === 'E' || preset.bars[3].targetToneByLevel.junior === 'A',
      `Bar 4 (G) target tone for junior must be consonant E or A, got ${preset.bars[3].targetToneByLevel.junior}`
    );
  });

  test('Teen and Pro target tones always exist in their respective scales', () => {
    const preset = RelationalHarmonicEngine.getDefaultJamPreset();
    for (let b = 0; b < 4; b++) {
      const bar = preset.bars[b];
      assert(preset.scales.teen.includes(bar.targetToneByLevel.teen));
      assert(preset.scales.pro.includes(bar.targetToneByLevel.pro));
    }
  });

  console.log('--- [STAGE 3/6] FULL RELATIONAL TONE MATRIX & CONSONANCE INTELLIGENCE ---');

  test('Relational matrix evaluates tone A across Am - F - C - G with high consonance', () => {
    const preset = RelationalHarmonicEngine.getDefaultJamPreset();
    const profileA = RelationalHarmonicEngine.evaluateToneRelation('A', preset);

    assert.strictEqual(profileA.note, 'A');
    assert.strictEqual(profileA.relations[0].role, 'root');         // Takt 1 (Am): Grundton
    assert.strictEqual(profileA.relations[0].intervalSemitones, 0);
    assert.strictEqual(profileA.relations[1].role, 'third');        // Takt 2 (F): Große Terz
    assert.strictEqual(profileA.relations[1].intervalSemitones, 4);
    assert.strictEqual(profileA.relations[2].role, 'thirteenth');   // Takt 3 (C): Große Sexte
    assert.strictEqual(profileA.relations[2].intervalSemitones, 9);
    assert.strictEqual(profileA.relations[3].role, 'ninth');        // Takt 4 (G): Große None
    assert.strictEqual(profileA.relations[3].intervalSemitones, 2);

    assert(profileA.averageConsonance >= 0.85, `Expected avg consonance >= 0.85, got ${profileA.averageConsonance}`);
  });

  test('Relational matrix evaluates tone C across Am - F - C - G correctly', () => {
    const preset = RelationalHarmonicEngine.getDefaultJamPreset();
    const profileC = RelationalHarmonicEngine.evaluateToneRelation('C', preset);

    assert.strictEqual(profileC.note, 'C');
    assert.strictEqual(profileC.relations[0].role, 'third');        // Takt 1 (Am): Kleine Terz
    assert.strictEqual(profileC.relations[1].role, 'fifth');        // Takt 2 (F): Reine Quinte
    assert.strictEqual(profileC.relations[2].role, 'root');         // Takt 3 (C): Grundton
    assert.strictEqual(profileC.relations[3].role, 'eleventh');     // Takt 4 (G): Reine Quarte / sus4
  });

  test('All 3 Junior Magic Tones (A, C, E) carry average consonance > 0.80', () => {
    const preset = RelationalHarmonicEngine.getDefaultJamPreset();
    ['A', 'C', 'E'].forEach((note) => {
      const prof = RelationalHarmonicEngine.evaluateToneRelation(note, preset);
      assert(
        prof.averageConsonance >= 0.80,
        `Magic tone ${note} must have average consonance >= 0.80, got ${prof.averageConsonance}`
      );
    });
  });

  console.log('--- [STAGE 4/6] SQUELCH, SILENCE & UNPITCHED PERCUSSION IMMUNITY ---');

  test('Empty or invalid buffer falls back safely to default Jam-Preset', () => {
    const emptyBuf = createMockAudioBuffer(1, 0, 44100);
    const result = RelationalHarmonicEngine.analyzeFourBarAudio(emptyBuf, 120);
    assert.strictEqual(result.key, 'A-Moll');
    assert.strictEqual(result.isAcousticOrJamPreset, true);
  });

  test('Silent buffer (all zeroes) falls back safely to default Jam-Preset', () => {
    const silentBuf = createMockAudioBuffer(1, 44100 * 4, 44100, () => 0);
    const result = RelationalHarmonicEngine.analyzeFourBarAudio(silentBuf, 120);
    assert.strictEqual(result.key, 'A-Moll');
    assert.strictEqual(result.isAcousticOrJamPreset, true);
  });

  test('White noise (drums / beatbox simulation) falls back to Jam-Preset', () => {
    let seed = 42;
    const noiseBuf = createMockAudioBuffer(1, 44100 * 4, 44100, () => {
      seed = (seed * 16807) % 2147483647;
      return (seed / 2147483647) * 0.4 - 0.2;
    });
    const result = RelationalHarmonicEngine.analyzeFourBarAudio(noiseBuf, 120);
    assert.strictEqual(result.key, 'A-Moll');
    assert.strictEqual(result.isAcousticOrJamPreset, true);
  });

  console.log('--- [STAGE 5/6] HARMONIC CHORD & KEY RECOGNITION (TWO-PASS) ---');

  test('Pitched 4-bar Audio with Am - F - C - G correctly detects chords & key', () => {
    const sampleRate = 44100;
    const barSamples = sampleRate * 1; // 1 second per bar = 4 seconds total
    const totalSamples = barSamples * 4;

    const chordFreqs = [
      [220, 261.63, 329.63], // Am
      [174.61, 220, 261.63], // F
      [261.63, 329.63, 392],  // C
      [196, 246.94, 293.66]   // G
    ];

    const pitchedBuf = createMockAudioBuffer(1, totalSamples, sampleRate, (i) => {
      const barIdx = Math.floor(i / barSamples);
      const freqs = chordFreqs[barIdx] || chordFreqs[0];
      const t = i / sampleRate;
      let s = 0;
      for (const f of freqs) {
        s += Math.sin(2 * Math.PI * f * t) * 0.25;
      }
      return s;
    });

    const result = RelationalHarmonicEngine.analyzeFourBarAudio(pitchedBuf, 120);
    assert.strictEqual(result.isAcousticOrJamPreset, false);
    assert.strictEqual(result.rootNote, 'A');
    assert.strictEqual(result.mode, 'minor');
    assert.strictEqual(result.key, 'A-Moll');

    // Chords check
    assert.strictEqual(result.bars[0].chord, 'Am');
    assert.strictEqual(result.bars[1].chord, 'F');
    assert.strictEqual(result.bars[2].chord, 'C');
    assert.strictEqual(result.bars[3].chord, 'G');
    assert.deepStrictEqual(result.bars[3].targetNotes, ['G', 'H', 'D']);

    // Scales check for A-Moll (Junior, Teen, Pro with German H)
    assert.deepStrictEqual(result.scales.junior, ['A', 'C', 'E']);
    assert.deepStrictEqual(result.scales.teen, ['A', 'C', 'D', 'E', 'G']);
    assert.deepStrictEqual(result.scales.pro, ['A', 'H', 'C', 'D', 'E', 'F', 'G']);

    // Relational tone matrix present and populated
    assert(result.toneMatrix && Object.keys(result.toneMatrix).length >= 12);
  });

  test('Short buffer / fast tempo does not drop Goertzel probe frames', () => {
    // 180 BPM, short audio buffer (0.33s per bar = 14699 samples per bar)
    const sampleRate = 44100;
    const barSamples = 14699;
    const totalSamples = barSamples * 4;

    const chordFreqs = [
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [261.63, 329.63, 392],
      [196, 246.94, 293.66]
    ];

    const shortBuf = createMockAudioBuffer(1, totalSamples, sampleRate, (i) => {
      const barIdx = Math.floor(i / barSamples);
      const freqs = chordFreqs[barIdx] || chordFreqs[0];
      const t = i / sampleRate;
      let s = 0;
      for (const f of freqs) {
        s += Math.sin(2 * Math.PI * f * t) * 0.25;
      }
      return s;
    });

    const result = RelationalHarmonicEngine.analyzeFourBarAudio(shortBuf, 180);
    assert.strictEqual(result.isAcousticOrJamPreset, false);
    assert.strictEqual(result.bars[0].chord, 'Am');
    assert.strictEqual(result.bars[3].chord, 'G');
  });

  test('Pop Progression F - G - Em - Am correctly detects A-Moll (resolving parallel ambiguity)', () => {
    const sampleRate = 44100;
    const barSamples = sampleRate * 1;
    const totalSamples = barSamples * 4;

    const chordFreqs = [
      [174.61, 220, 261.63],   // F (F3, A3, C4)
      [196, 246.94, 293.66],   // G (G3, B3, D4)
      [164.81, 196, 246.94],   // Em (E3, G3, B3)
      [220, 261.63, 329.63]    // Am (A3, C4, E4)
    ];

    const popBuf = createMockAudioBuffer(1, totalSamples, sampleRate, (i) => {
      const barIdx = Math.floor(i / barSamples);
      const freqs = chordFreqs[barIdx] || chordFreqs[0];
      const t = i / sampleRate;
      let s = 0;
      for (const f of freqs) {
        s += Math.sin(2 * Math.PI * f * t) * 0.25;
      }
      return s;
    });

    const result = RelationalHarmonicEngine.analyzeFourBarAudio(popBuf, 120);
    assert.strictEqual(result.isAcousticOrJamPreset, false);
    assert.strictEqual(result.key, 'A-Moll');
    assert.strictEqual(result.rootNote, 'A');
    assert.strictEqual(result.mode, 'minor');
    assert.strictEqual(result.bars[0].chord, 'F');
    assert.strictEqual(result.bars[1].chord, 'G');
    assert.strictEqual(result.bars[2].chord, 'Em');
    assert.strictEqual(result.bars[3].chord, 'Am');
  });

  test('Pop Progression Dm - G - C - Am correctly detects C-Dur via ii-V-I cadence', () => {
    const sampleRate = 44100;
    const barSamples = sampleRate * 1;
    const totalSamples = barSamples * 4;

    const chordFreqs = [
      [146.83, 174.61, 220],   // Dm (D3, F3, A3)
      [196, 246.94, 293.66],   // G (G3, B3, D4)
      [261.63, 329.63, 392],   // C (C4, E4, G4)
      [220, 261.63, 329.63]    // Am (A3, C4, E4)
    ];

    const popBuf = createMockAudioBuffer(1, totalSamples, sampleRate, (i) => {
      const barIdx = Math.floor(i / barSamples);
      const freqs = chordFreqs[barIdx] || chordFreqs[0];
      const t = i / sampleRate;
      let s = 0;
      for (const f of freqs) {
        s += Math.sin(2 * Math.PI * f * t) * 0.25;
      }
      return s;
    });

    const result = RelationalHarmonicEngine.analyzeFourBarAudio(popBuf, 120);
    assert.strictEqual(result.isAcousticOrJamPreset, false);
    assert.strictEqual(result.key, 'C-Dur');
    assert.strictEqual(result.rootNote, 'C');
    assert.strictEqual(result.mode, 'major');
    assert.strictEqual(result.bars[0].chord, 'Dm');
    assert.strictEqual(result.bars[1].chord, 'G');
    assert.strictEqual(result.bars[2].chord, 'C');
    assert.strictEqual(result.bars[3].chord, 'Am');
    assert.deepStrictEqual(result.bars[1].targetNotes, ['G', 'H', 'D']);

    // Scales check for C-Dur (Junior: Dreiklang, Teen: Pentatonik, Pro: 7-Ton Diatonik mit H)
    assert.deepStrictEqual(result.scales.junior, ['C', 'E', 'G']);
    assert.deepStrictEqual(result.scales.teen, ['C', 'D', 'E', 'G', 'A']);
    assert.deepStrictEqual(result.scales.pro, ['C', 'D', 'E', 'F', 'G', 'A', 'H']);
    assert(result.scales.pro.includes('F'), 'C-Dur Pro scale must include F (4th / subdominant)');
    assert(result.scales.pro.includes('H'), 'C-Dur Pro scale must include German H (7th / leading tone)');
    assert(!result.scales.pro.includes('Eb'), 'C-Dur Pro scale must NOT include Eb (minor 3rd)');
    assert(!result.scales.pro.includes('Bb'), 'C-Dur Pro scale must NOT include Bb (dominant 7th)');
  });

  test('Rayleigh smearing immunity: 43Hz sub-bass crosstalk does not corrupt chord recognition', () => {
    const sampleRate = 44100;
    const barSamples = sampleRate * 1;
    const totalSamples = barSamples * 4;

    const chordFreqs = [
      [220, 261.63, 329.63], // Am
      [174.61, 220, 261.63], // F
      [261.63, 329.63, 392],  // C
      [196, 246.94, 293.66]   // G
    ];

    const subBassBuf = createMockAudioBuffer(1, totalSamples, sampleRate, (i) => {
      const barIdx = Math.floor(i / barSamples);
      const freqs = chordFreqs[barIdx] || chordFreqs[0];
      const t = i / sampleRate;
      let s = 0;
      // High-power 43Hz sub-bass / kick bleed in Octave 2
      s += Math.sin(2 * Math.PI * 43.06 * t) * 0.40;
      for (const f of freqs) {
        s += Math.sin(2 * Math.PI * f * t) * 0.25;
      }
      return s;
    });

    const result = RelationalHarmonicEngine.analyzeFourBarAudio(subBassBuf, 120);
    assert.strictEqual(result.isAcousticOrJamPreset, false);
    assert.strictEqual(result.key, 'A-Moll');
    assert.strictEqual(result.bars[0].chord, 'Am');
    assert.strictEqual(result.bars[1].chord, 'F');
    assert.strictEqual(result.bars[2].chord, 'C');
    assert.strictEqual(result.bars[3].chord, 'G');
  });

  test('Overtone symmetry: Minor chord with 5th harmonic (C#) overtone bleed identifies as Am (not A)', () => {
    const sampleRate = 44100;
    const barSamples = sampleRate * 1;
    const totalSamples = barSamples * 4;

    // All bars play Am triad + physical 5th harmonic C#5 (554.37 Hz) at 25% amplitude
    const overtoneBuf = createMockAudioBuffer(1, totalSamples, sampleRate, (i) => {
      const t = i / sampleRate;
      let s = 0;
      s += Math.sin(2 * Math.PI * 220 * t) * 0.30;     // A3 root
      s += Math.sin(2 * Math.PI * 261.63 * t) * 0.25;  // C4 minor third
      s += Math.sin(2 * Math.PI * 329.63 * t) * 0.25;  // E4 fifth
      s += Math.sin(2 * Math.PI * 554.37 * t) * 0.08;  // C#5 (5th harmonic acoustic overtone of A)
      return s;
    });

    const result = RelationalHarmonicEngine.analyzeFourBarAudio(overtoneBuf, 120);
    assert.strictEqual(result.isAcousticOrJamPreset, false);
    assert.strictEqual(result.bars[0].chord, 'Am');
    assert.strictEqual(result.bars[0].rootNote, 'A');
    assert.strictEqual(result.mode, 'minor');
  });

  console.log('--- [STAGE 6/6] NOTE NAME, FREQUENCY & AUDIO SYNTHESIS CONTRACT ---');

  test('pitchClassToNoteName converts 0-11 correctly with German nomenclature (11 -> H, 10 -> Bb)', () => {
    assert.strictEqual(pitchClassToNoteName(0), 'C');
    assert.strictEqual(pitchClassToNoteName(1), 'C#');
    assert.strictEqual(pitchClassToNoteName(2), 'D');
    assert.strictEqual(pitchClassToNoteName(3), 'Eb');
    assert.strictEqual(pitchClassToNoteName(4), 'E');
    assert.strictEqual(pitchClassToNoteName(5), 'F');
    assert.strictEqual(pitchClassToNoteName(6), 'F#');
    assert.strictEqual(pitchClassToNoteName(7), 'G');
    assert.strictEqual(pitchClassToNoteName(8), 'Ab');
    assert.strictEqual(pitchClassToNoteName(9), 'A');
    assert.strictEqual(pitchClassToNoteName(10), 'Bb');
    assert.strictEqual(pitchClassToNoteName(11), 'H'); // German H for pitch class 11
  });

  test('noteNameToFreq and noteNameToPitchClass handle German H and international B interchangeably', () => {
    assert(Math.abs(noteNameToFreq('A') - 440) < 0.01);
    assert(Math.abs(noteNameToFreq('A4') - 440) < 0.01);
    assert(Math.abs(noteNameToFreq('C4') - 261.63) < 0.1);
    assert(Math.abs(noteNameToFreq('Eb') - 311.13) < 0.1);
    assert(Math.abs(noteNameToFreq('F#') - 369.99) < 0.1);
    // German H and international B support (both pitch class 11 = 493.88 Hz in octave 4)
    assert(Math.abs(noteNameToFreq('H4') - 493.88) < 0.2);
    assert(Math.abs(noteNameToFreq('B4') - 493.88) < 0.2);
    assert.strictEqual(noteNameToPitchClass('H'), 11);
    assert.strictEqual(noteNameToPitchClass('B'), 11);
    assert.strictEqual(noteNameToPitchClass('EB'), 3);
    assert.strictEqual(noteNameToPitchClass('BB'), 10);
    assert.strictEqual(noteNameToPitchClass('HB'), 10);
    assert.strictEqual(noteNameToPitchClass('B#'), 0);
    assert.strictEqual(noteNameToPitchClass('H#'), 0);
    assert.strictEqual(noteNameToPitchClass('CB'), 11);
    assert.strictEqual(noteNameToPitchClass('E#'), 5);
    assert.strictEqual(noteNameToPitchClass('FB'), 4);
  });

  test('Major key scales: C-Dur produces exact didactic scales (Dreiklang, Pentatonik, 7-Ton Diatonik)', () => {
    const keyInfo = RelationalHarmonicEngine.inferKeyAndScales([
      { rootIndex: 0, isMinor: false, chord: 'C', rootNote: 'C' },
      { rootIndex: 7, isMinor: false, chord: 'G', rootNote: 'G' },
      { rootIndex: 9, isMinor: true, chord: 'Am', rootNote: 'A' },
      { rootIndex: 5, isMinor: false, chord: 'F', rootNote: 'F' }
    ]);
    assert.strictEqual(keyInfo.key, 'C-Dur');
    assert.strictEqual(keyInfo.rootNote, 'C');
    assert.strictEqual(keyInfo.mode, 'major');

    // 1. Junior: Dreiklang (Root, M3, 5)
    assert.deepStrictEqual(keyInfo.scales.junior, ['C', 'E', 'G']);

    // 2. Teen: Dur-Pentatonik (Root, 2, 3, 5, 6)
    assert.deepStrictEqual(keyInfo.scales.teen, ['C', 'D', 'E', 'G', 'A']);

    // 3. Pro: Vollständige 7-Ton Diatonik (Root, 2, 3, 4, 5, 6, 7/Maj7 mit deutschem H)
    assert.deepStrictEqual(keyInfo.scales.pro, ['C', 'D', 'E', 'F', 'G', 'A', 'H']);

    // Negative invariant checks: No blue notes or dominant 7th in pure C-Dur
    assert(keyInfo.scales.pro.includes('F'), 'F (Quarte / Subdominante) must be present in C-Dur Pro scale');
    assert(keyInfo.scales.pro.includes('H'), 'German H (7th / Leitton) must be present in C-Dur Pro scale');
    assert(!keyInfo.scales.pro.includes('Eb'), 'Eb (minor third / blue note) must NOT be present in C-Dur Pro scale');
    assert(!keyInfo.scales.pro.includes('Bb'), 'Bb (minor seventh) must NOT be present in C-Dur Pro scale');
  });

  test('Minor key scales: A-Moll produces exact didactic scales (Dreiklang, Pentatonik, Natürliche Moll mit H)', () => {
    const keyInfo = RelationalHarmonicEngine.inferKeyAndScales([
      { rootIndex: 9, isMinor: true, chord: 'Am', rootNote: 'A' },
      { rootIndex: 5, isMinor: false, chord: 'F', rootNote: 'F' },
      { rootIndex: 0, isMinor: false, chord: 'C', rootNote: 'C' },
      { rootIndex: 7, isMinor: false, chord: 'G', rootNote: 'G' }
    ]);
    assert.strictEqual(keyInfo.key, 'A-Moll');
    assert.strictEqual(keyInfo.rootNote, 'A');
    assert.strictEqual(keyInfo.mode, 'minor');

    // 1. Junior: Moll-Dreiklang (Root, m3, 5)
    assert.deepStrictEqual(keyInfo.scales.junior, ['A', 'C', 'E']);

    // 2. Teen: Moll-Pentatonik (Root, m3, 4, 5, m7)
    assert.deepStrictEqual(keyInfo.scales.teen, ['A', 'C', 'D', 'E', 'G']);

    // 3. Pro: Vollständige natürliche Moll-Tonleiter (Aeolisch: Root, 2, m3, 4, 5, m6, m7 mit H)
    assert.deepStrictEqual(keyInfo.scales.pro, ['A', 'H', 'C', 'D', 'E', 'F', 'G']);

    assert(keyInfo.scales.pro.includes('H'), 'German H (Sekunde) must be present in A-Moll Pro scale');
    assert(keyInfo.scales.pro.includes('F'), 'F (kleine Sexte) must be present in A-Moll Pro scale');
    assert(!keyInfo.scales.pro.includes('Eb'), 'Eb (diminished fifth / blue note) must NOT be in natural A-Moll');
  });

  test('Transpositional scale integrity: G-Dur, F-Dur, D-Moll, E-Moll all produce clean didactic scales', () => {
    // G-Dur (Root 7)
    const gDur = RelationalHarmonicEngine.inferKeyAndScales([
      { rootIndex: 7, isMinor: false, chord: 'G', rootNote: 'G' },
      { rootIndex: 0, isMinor: false, chord: 'C', rootNote: 'C' },
      { rootIndex: 2, isMinor: false, chord: 'D', rootNote: 'D' },
      { rootIndex: 7, isMinor: false, chord: 'G', rootNote: 'G' }
    ]);
    assert.strictEqual(gDur.key, 'G-Dur');
    assert.deepStrictEqual(gDur.scales.junior, ['G', 'H', 'D']);
    assert.deepStrictEqual(gDur.scales.teen, ['G', 'A', 'H', 'D', 'E']);
    assert.deepStrictEqual(gDur.scales.pro, ['G', 'A', 'H', 'C', 'D', 'E', 'F#']);

    // F-Dur (Root 5)
    const fDur = RelationalHarmonicEngine.inferKeyAndScales([
      { rootIndex: 5, isMinor: false, chord: 'F', rootNote: 'F' },
      { rootIndex: 10, isMinor: false, chord: 'Bb', rootNote: 'Bb' },
      { rootIndex: 0, isMinor: false, chord: 'C', rootNote: 'C' },
      { rootIndex: 5, isMinor: false, chord: 'F', rootNote: 'F' }
    ]);
    assert.strictEqual(fDur.key, 'F-Dur');
    assert.deepStrictEqual(fDur.scales.junior, ['F', 'A', 'C']);
    assert.deepStrictEqual(fDur.scales.teen, ['F', 'G', 'A', 'C', 'D']);
    assert.deepStrictEqual(fDur.scales.pro, ['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);

    // D-Moll (Root 2)
    const dMoll = RelationalHarmonicEngine.inferKeyAndScales([
      { rootIndex: 2, isMinor: true, chord: 'Dm', rootNote: 'D' },
      { rootIndex: 10, isMinor: false, chord: 'Bb', rootNote: 'Bb' },
      { rootIndex: 5, isMinor: false, chord: 'F', rootNote: 'F' },
      { rootIndex: 0, isMinor: false, chord: 'C', rootNote: 'C' }
    ]);
    assert.strictEqual(dMoll.key, 'D-Moll');
    assert.deepStrictEqual(dMoll.scales.junior, ['D', 'F', 'A']);
    assert.deepStrictEqual(dMoll.scales.teen, ['D', 'F', 'G', 'A', 'C']);
    assert.deepStrictEqual(dMoll.scales.pro, ['D', 'E', 'F', 'G', 'A', 'Bb', 'C']);

    // E-Moll (Root 4)
    const eMoll = RelationalHarmonicEngine.inferKeyAndScales([
      { rootIndex: 4, isMinor: true, chord: 'Em', rootNote: 'E' },
      { rootIndex: 0, isMinor: false, chord: 'C', rootNote: 'C' },
      { rootIndex: 7, isMinor: false, chord: 'G', rootNote: 'G' },
      { rootIndex: 2, isMinor: false, chord: 'D', rootNote: 'D' }
    ]);
    assert.strictEqual(eMoll.key, 'E-Moll');
    assert.deepStrictEqual(eMoll.scales.junior, ['E', 'G', 'H']);
    assert.deepStrictEqual(eMoll.scales.teen, ['E', 'G', 'A', 'H', 'D']);
    assert.deepStrictEqual(eMoll.scales.pro, ['E', 'F#', 'G', 'A', 'H', 'C', 'D']);
  });

  test('playTonePreview handles null, closed or suspended context gracefully without throwing', () => {
    assert.doesNotThrow(() => {
      RelationalHarmonicEngine.playTonePreview(null as any, 'A');
      RelationalHarmonicEngine.playTonePreview(undefined as any, 'C');
      RelationalHarmonicEngine.playTonePreview({ state: 'closed' } as any, 'E');
      RelationalHarmonicEngine.playTonePreview({ state: 'suspended', resume: () => Promise.resolve() } as any, 'G');
    });
  });

  test('Pop Progression F - C - G - Am correctly detects A-Moll via Aeolian VII-i cadence', () => {
    const keyInfo = RelationalHarmonicEngine.inferKeyAndScales([
      { rootIndex: 5, isMinor: false, chord: 'F', rootNote: 'F' },
      { rootIndex: 0, isMinor: false, chord: 'C', rootNote: 'C' },
      { rootIndex: 7, isMinor: false, chord: 'G', rootNote: 'G' },
      { rootIndex: 9, isMinor: true, chord: 'Am', rootNote: 'A' }
    ]);
    assert.strictEqual(keyInfo.key, 'A-Moll');
    assert.strictEqual(keyInfo.rootNote, 'A');
    assert.strictEqual(keyInfo.mode, 'minor');
  });

  test('Dorian Loop Am - D - Am - D correctly detects A-Moll with Dorian IV', () => {
    const keyInfo = RelationalHarmonicEngine.inferKeyAndScales([
      { rootIndex: 9, isMinor: true, chord: 'Am', rootNote: 'A' },
      { rootIndex: 2, isMinor: false, chord: 'D', rootNote: 'D' },
      { rootIndex: 9, isMinor: true, chord: 'Am', rootNote: 'A' },
      { rootIndex: 2, isMinor: false, chord: 'D', rootNote: 'D' }
    ]);
    assert.strictEqual(keyInfo.key, 'A-Moll');
    assert.strictEqual(keyInfo.rootNote, 'A');
    assert.strictEqual(keyInfo.mode, 'minor');
  });

  test('Audio with NaN samples falls back safely to default Jam-Preset without crashing', () => {
    const nanBuf = createMockAudioBuffer(1, 44100 * 4, 44100, () => NaN);
    const result = RelationalHarmonicEngine.analyzeFourBarAudio(nanBuf, 120);
    assert.strictEqual(result.key, 'A-Moll');
    assert.strictEqual(result.isAcousticOrJamPreset, true);
  });

  test('Relational matrix evaluates both German H and English B consistently with isTargetTone matching', () => {
    const preset = RelationalHarmonicEngine.getDefaultJamPreset();
    // Bar 4 chord is G, target notes are ['G', 'H', 'D']
    const profileH = RelationalHarmonicEngine.evaluateToneRelation('H', preset);
    const profileB = RelationalHarmonicEngine.evaluateToneRelation('B', preset);

    // Both must be recognized as target tone in Bar 4 (G major 3rd)
    assert.strictEqual(profileH.relations[3].isTargetTone, true);
    assert.strictEqual(profileB.relations[3].isTargetTone, true);
    assert.strictEqual(profileH.relations[3].isChordTone, true);
    assert.strictEqual(profileB.relations[3].isChordTone, true);
    assert.strictEqual(profileH.relations[3].intervalSemitones, 4);
    assert.strictEqual(profileB.relations[3].intervalSemitones, 4);

    // ToneMatrix contains both H and B with equivalent profiles
    assert(preset.toneMatrix['H']);
    assert(preset.toneMatrix['B']);
    assert.strictEqual(preset.toneMatrix['H'].averageConsonance, preset.toneMatrix['B'].averageConsonance);
  });

  test('Scale integrity for H-Moll and Bb-Dur completes chromatic German nomenclature coverage', () => {
    // H-Moll (Root 11)
    const hMoll = RelationalHarmonicEngine.inferKeyAndScales([
      { rootIndex: 11, isMinor: true, chord: 'Hm', rootNote: 'H' },
      { rootIndex: 7, isMinor: false, chord: 'G', rootNote: 'G' },
      { rootIndex: 2, isMinor: false, chord: 'D', rootNote: 'D' },
      { rootIndex: 9, isMinor: false, chord: 'A', rootNote: 'A' }
    ]);
    assert.strictEqual(hMoll.key, 'H-Moll');
    assert.deepStrictEqual(hMoll.scales.junior, ['H', 'D', 'F#']);
    assert.deepStrictEqual(hMoll.scales.teen, ['H', 'D', 'E', 'F#', 'A']);
    assert.deepStrictEqual(hMoll.scales.pro, ['H', 'C#', 'D', 'E', 'F#', 'G', 'A']);

    // Bb-Dur (Root 10)
    const bbDur = RelationalHarmonicEngine.inferKeyAndScales([
      { rootIndex: 10, isMinor: false, chord: 'Bb', rootNote: 'Bb' },
      { rootIndex: 3, isMinor: false, chord: 'Eb', rootNote: 'Eb' },
      { rootIndex: 5, isMinor: false, chord: 'F', rootNote: 'F' },
      { rootIndex: 10, isMinor: false, chord: 'Bb', rootNote: 'Bb' }
    ]);
    assert.strictEqual(bbDur.key, 'Bb-Dur');
    assert.deepStrictEqual(bbDur.scales.junior, ['Bb', 'D', 'F']);
    assert.deepStrictEqual(bbDur.scales.teen, ['Bb', 'C', 'D', 'F', 'G']);
    assert.deepStrictEqual(bbDur.scales.pro, ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']);
  });

  console.log(`\n================================================================`);
  console.log(`FORENSIC TEST REPORT: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================================================\n`);

  if (failed > 0) {
    throw new Error(`${failed} forensic test(s) failed in RelationalHarmonicEngine.`);
  }
}

// Allow standalone execution via tsx if invoked directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('test_relational_harmonic_engine_forensic.ts')) {
  runRelationalHarmonicEngineTests().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

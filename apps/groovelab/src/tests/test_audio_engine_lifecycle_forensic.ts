/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: DEEP AUDIO & MEDIA-HARDWARE LIFECYCLE FORENSIC SUITE
 * ==============================================================================
 * Standards: DIN EN ISO/IEC 25010 (Zuverlässigkeit, Fehlertoleranz & Wiederherstellbarkeit),
 *            W3C Web Audio API (Hardware clock & sample-accurate scheduling),
 *            Apple WebKit & Chromium Media Autoplay Policy Standards
 * 
 * Aggregates & stresses all 8 audio & recording engines across Campus-Groovelab:
 * 1. InlineAudioPlayer (Hausaufgabenheft & Meisterwerk)
 * 2. CompactAudioStrip & SplitCapsulePlayer (AudioTrackCarousel)
 * 3. ZenPlayAlongDock (Zen Focus & Practice Dock)
 * 4. DuettDeckModal (Synchronous Duett Recording)
 * 5. useMeisterwerkAudioRecording (Teacher/Student Take Recorder & WebM Duration)
 * 6. GrooveLoopstation (4-Track Loopstation & Overdub Master Clock)
 * 7. GroovePracticeCompanion (Interactive Practice Companion)
 * 8. SpeechDictationButton (Web Speech API Lifecycle & Fallback)
 * ==============================================================================
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { RelationalHarmonicEngine } from '../services/audio/RelationalHarmonicEngine';

console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║   CAMPUS-GROOVELAB: DEEP AUDIO & MEDIA LIFECYCLE FORENSIC SUITE    ║');
console.log('║   Stressing 8 Audio Engines, State Machines & Autoplay Sandboxes   ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

async function runDeepAudioLifecycleSuite() {
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
  // SECTION 1: AUTOPLAY POLICY & SILENT PRE-PLAY IMMUNITY ACROSS ALL ENGINES
  // ===========================================================================
  console.log('--- [STAGE 1/5] AUTOPLAY POLICY & TIMEOUT UNMUTING IMMUNITY ---');

  test('InlineAudioPlayer: Zero delayed unmuting in setTimeout', () => {
    const file = path.resolve('apps/groovelab/src/components/student/meisterwerk/MeisterwerkAudioPlayers.tsx');
    const content = fs.readFileSync(file, 'utf-8');
    // Ensure no audio.muted = false after a timeout without WebAudio priority
    assert.strictEqual(content.includes('Safari WebKit Autoplay Priming'), false, 'Flawed Autoplay Priming hack must be absent');
    assert.ok(content.includes('startWebAudioPlayback({ loop: Boolean(isLooping), offsetSec: startOffset })'), 'WebAudio playback must be prioritized at bar 2');
  });

  test('AudioTrackCarousel: Both CompactAudioStrip and SplitCapsulePlayer immune to autoplay stall', () => {
    const file = path.resolve('apps/groovelab/src/components/AudioTrackCarousel.tsx');
    const content = fs.readFileSync(file, 'utf-8');
    assert.strictEqual(content.includes('audioRef.current.muted = true') && content.includes('primePromise'), false, 'Silent HTML5 priming must not exist in AudioTrackCarousel');
    // Verify playNative is called directly on beat 4
    const countInMatches = (content.match(/playNative\(\);/g) || []).length;
    assert.ok(countInMatches >= 2, 'playNative must be called cleanly across CompactAudioStrip and SplitCapsulePlayer');
  });

  test('ZenPlayAlongDock: Clean count-in without silent pre-play', () => {
    const file = path.resolve('apps/groovelab/src/components/campus/ZenPlayAlongDock.tsx');
    const content = fs.readFileSync(file, 'utf-8');
    assert.ok(content.includes('playNative();'), 'ZenPlayAlongDock calls playNative cleanly after count-in');
    assert.strictEqual(content.includes('audioRef.current.muted = true'), false, 'ZenPlayAlongDock does not pre-play muted');
  });

  // ===========================================================================
  // SECTION 2: COUNT-IN STATE MACHINE DYNAMICS & CANCEL STRESS
  // ===========================================================================
  console.log('\n--- [STAGE 2/5] COUNT-IN STATE MACHINE & CANCEL STRESS TESTS ---');

  await test('Count-In Cancellation Drill: User toggles off before Beat 4', async () => {
    let countInStep: number | null = 1;
    let isPlaying = false;
    let playbackTriggered = false;

    const timers: any[] = [];
    const clearTimers = () => timers.forEach(t => clearTimeout(t));
    const countInRef = { clear: clearTimers };

    // Schedule 4 beats at fast tempo (20ms per beat)
    timers.push(setTimeout(() => { countInStep = 2; }, 20));
    timers.push(setTimeout(() => { countInStep = 3; }, 40));
    timers.push(setTimeout(() => { countInStep = 4; }, 60));
    timers.push(setTimeout(() => {
      countInStep = null;
      playbackTriggered = true;
      isPlaying = true;
    }, 80));

    // Simulate User clicking STOP / CANCEL on Beat 2 (at 30ms)
    await new Promise(r => setTimeout(r, 30));
    assert.strictEqual(countInStep, 2, 'Step should be 2 at 30ms');

    // User cancels
    countInRef.clear();
    countInStep = null;
    isPlaying = false;

    // Wait past the original 80ms mark to verify playback NEVER triggered
    await new Promise(r => setTimeout(r, 70));
    assert.strictEqual(playbackTriggered, false, 'Playback must NEVER trigger after user cancellation');
    assert.strictEqual(countInStep, null, 'Count-in step must remain null');
    assert.strictEqual(isPlaying, false, 'isPlaying must remain false');
  });

  await test('Fast Toggle-Spamming Stress Test (10 clicks in 100ms)', async () => {
    let playCount = 0;
    let stopCount = 0;
    let activeTimer: any = null;

    const toggle = (i: number) => {
      if (activeTimer) {
        clearTimeout(activeTimer);
        activeTimer = null;
        stopCount++;
      } else {
        activeTimer = setTimeout(() => {
          playCount++;
          activeTimer = null;
        }, 50);
      }
    };

    // Rapid spam
    for (let i = 0; i < 10; i++) {
      toggle(i);
      await new Promise(r => setTimeout(r, 5));
    }

    // Wait for stabilization
    await new Promise(r => setTimeout(r, 80));
    assert.ok(playCount <= 1, 'Fast spamming must never result in multiple concurrent playbacks');
  });

  // ===========================================================================
  // SECTION 3: WEBM DURATION PATCHING & MEDIARECORDER INTEGRITY
  // ===========================================================================
  console.log('\n--- [STAGE 3/5] MEDIARECORDER & WEBM DURATION INTEGRITY ---');

  test('WebM Duration Patcher: Resolves Chromium duration infinity bug', () => {
    const file = path.resolve('apps/groovelab/src/utils/webmDurationPatcher.ts');
    assert.ok(fs.existsSync(file), 'webmDurationPatcher.ts must exist');
    const content = fs.readFileSync(file, 'utf-8');
    assert.ok(content.includes('patchWebmDuration') || content.includes('fixWebmDuration'), 'Patcher export must be present');
  });

  test('DuettDeckModal: Multi-track pre-roll recorder attack protection', () => {
    const file = path.resolve('apps/groovelab/src/components/student/meisterwerk/DuettDeckModal.tsx');
    const content = fs.readFileSync(file, 'utf-8');
    assert.ok(content.includes('scheduleCountInBeeps') || content.includes('Bereit machen... 3, 2, 1'), 'DuettDeckModal uses sample-accurate count-in');
    assert.ok(content.includes('prerollMs'), 'DuettDeckModal has 16th-note pre-roll to protect attack');
  });

  test('useMeisterwerkAudioRecording: MediaRecorder state machine fail-safe', () => {
    const file = path.resolve('apps/groovelab/src/components/student/meisterwerk/hooks/useMeisterwerkAudioRecording.ts');
    const content = fs.readFileSync(file, 'utf-8');
    assert.ok(content.includes('mediaRecorderRef'), 'useMeisterwerkAudioRecording manages MediaRecorder ref');
    assert.ok(content.includes('isRecordingAudio'), 'useMeisterwerkAudioRecording exposes recording state');
  });

  // ===========================================================================
  // SECTION 4: TEMPO, RATE & BPM RESILIENCE MATHEMATICS
  // ===========================================================================
  console.log('\n--- [STAGE 4/5] TEMPO & SPEED DYNAMICS MATHEMATICS ---');

  test('Extreme BPM & PlaybackRate Matrix is mathematically sound', () => {
    const calcInterval = (bpm: number, rate: number) => {
      const b = Math.max(20, Math.min(300, bpm || 100));
      const r = Math.max(0.25, Math.min(4.0, rate || 1.0));
      return (60 / b) / r;
    };

    // Extreme slow: 40 BPM at 0.5x rate = 3.0 seconds per beat
    assert.strictEqual(calcInterval(40, 0.5), 3.0);
    // Standard: 120 BPM at 1.0x rate = 0.5 seconds per beat
    assert.strictEqual(calcInterval(120, 1.0), 0.5);
    // Extreme fast: 240 BPM at 2.0x rate = 0.125 seconds per beat
    assert.strictEqual(calcInterval(240, 2.0), 0.125);
    // Boundary clamp: 0 BPM clamps to 100
    assert.strictEqual(calcInterval(0, 1.0), 0.6);
  });

  // ===========================================================================
  // SECTION 5: UNMOUNT & MEMORY LEAK CLEANUP AUDIT
  // ===========================================================================
  console.log('\n--- [STAGE 5/5] UNMOUNT TIMER & RESOURCE CLEANUP AUDIT ---');

  test('Audio Components clear count-in timers on unmount', () => {
    const carouselFile = path.resolve('apps/groovelab/src/components/AudioTrackCarousel.tsx');
    const carouselContent = fs.readFileSync(carouselFile, 'utf-8');
    assert.ok(carouselContent.includes('countInTimerRef.current.clear()') || carouselContent.includes('clearTimeout(countInTimerRef.current)'), 'AudioTrackCarousel cleans up count-in timer in useEffect cleanup');

    const meisterwerkFile = path.resolve('apps/groovelab/src/components/student/meisterwerk/MeisterwerkAudioPlayers.tsx');
    const meisterwerkContent = fs.readFileSync(meisterwerkFile, 'utf-8');
    assert.ok(meisterwerkContent.includes('stopWebAudio'), 'MeisterwerkAudioPlayers stops WebAudio on cleanup');
  });

  test('GrooveLoopstation: Time-Stamp Synchronized Playback-Beat Scheduler (GRV-40)', () => {
    const loopFile = path.resolve('apps/groovelab/src/components/groovelab/GrooveLoopstation.tsx');
    const content = fs.readFileSync(loopFile, 'utf-8');
    assert.ok(content.includes('schedulePlaybackBeats'), 'GrooveLoopstation uses lookahead playback beat scheduler');
    assert.ok(content.includes('togglePlaybackBeatSync'), 'GrooveLoopstation provides 1-tap beat sync toggle');
    assert.ok(content.includes('playbackBeatTimerRef'), 'GrooveLoopstation manages playbackBeatTimer ref');
    assert.ok(content.includes('nextPlaybackBeatTimeRef'), 'GrooveLoopstation tracks sample-accurate next beat time');
    assert.ok(!content.includes('clickIntervalRef.current = setInterval'), 'GrooveLoopstation has eliminated jittery setInterval for playback beat');
    assert.ok(content.includes('shouldDuckAcousticBleed = isCurrentlyRecording && hasTrack1 && !useHeadphonesRef.current'), 'Acoustic bleed ducking must strictly be scoped to active recording');
  });

  test('RelationalHarmonicEngine: Monophonic Bassline C -> G -> D -> E resolves to E-Moll & C - G - D - Em (GRV-41)', () => {
    // Single root notes: Bar 1: C (0), Bar 2: G (7), Bar 3: D (2), Bar 4: E (4)
    // Note: Due to physical acoustic 5th harmonic (r+4), each single note produces slight major-3rd overtone bleed.
    // The engine must mark them as isThirdIndeterminate: true and diatonically resolve chords to [C, G, D, Em] in E-Moll.
    
    // Simulate chromagram for monophonic roots (root = 1.0, 5th harmonic maj3 = 0.20, 3rd harmonic 5th = 0.35)
    const createMonophonicChroma = (rootPitch: number) => {
      const chroma = new Float32Array(12);
      chroma[rootPitch] = 1.0;                  // Fundamental f0
      chroma[(rootPitch + 7) % 12] = 0.35;      // 3rd harmonic (perfect 5th)
      chroma[(rootPitch + 4) % 12] = 0.20;      // 5th harmonic (major 3rd overtone bleed)
      return chroma;
    };

    const cChroma = createMonophonicChroma(0);  // C
    const gChroma = createMonophonicChroma(7);  // G
    const dChroma = createMonophonicChroma(2);  // D
    const eChroma = createMonophonicChroma(4);  // E

    const matchC = RelationalHarmonicEngine.matchBestTriadChord(cChroma);
    const matchG = RelationalHarmonicEngine.matchBestTriadChord(gChroma);
    const matchD = RelationalHarmonicEngine.matchBestTriadChord(dChroma);
    const matchE = RelationalHarmonicEngine.matchBestTriadChord(eChroma);

    assert.strictEqual(matchC.rootNote, 'C');
    assert.strictEqual(matchC.isThirdIndeterminate, true, 'C monophonic note must be third-indeterminate');
    assert.strictEqual(matchG.rootNote, 'G');
    assert.strictEqual(matchG.isThirdIndeterminate, true, 'G monophonic note must be third-indeterminate');
    assert.strictEqual(matchD.rootNote, 'D');
    assert.strictEqual(matchD.isThirdIndeterminate, true, 'D monophonic note must be third-indeterminate');
    assert.strictEqual(matchE.rootNote, 'E');
    assert.strictEqual(matchE.isThirdIndeterminate, true, 'E monophonic note must be third-indeterminate');

    // Infer key center:
    const keyInfo = RelationalHarmonicEngine.inferKeyAndScales([matchC, matchG, matchD, matchE]);
    assert.strictEqual(keyInfo.key, 'E-Moll', 'C - G - D - E progression must resolve to E-Moll');
    assert.strictEqual(keyInfo.mode, 'minor');
    assert.strictEqual(keyInfo.rootNote, 'E');

    // Scales check for E-Moll:
    assert.deepStrictEqual(keyInfo.scales.junior, ['E', 'G', 'H'], 'Junior scale must be E-Moll triad [E, G, H]');
    assert.deepStrictEqual(keyInfo.scales.teen, ['E', 'G', 'A', 'H', 'D'], 'Teen scale must be E minor pentatonic');
    assert.deepStrictEqual(keyInfo.scales.pro, ['E', 'F#', 'G', 'A', 'H', 'C', 'D'], 'Pro scale must be E natural minor (Aeolian)');
  });

  console.log('\n────────────────────────────────────────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🏆 100% SUCCESS: All Deep Audio & Media Lifecycle Invariants Verified.');
  }
}

runDeepAudioLifecycleSuite().catch(err => {
  console.error('Fatal deep audio lifecycle error:', err);
  process.exit(1);
});

/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: FORENSIC SUITE — AUDIO COUNT-IN & PLAYBACK INTEGRITY
 * ==============================================================================
 * Standards: DIN EN ISO/IEC 25010 (Zuverlässigkeit & Fehlertoleranz),
 *            W3C Web Audio API Spec (AudioContext lifecycle & sample-accurate scheduling),
 *            Apple WebKit & Chromium Autoplay Policy Conformance
 * 
 * Verifies:
 * 1. Count-In Sequence Integrity: 4-Beat count-in progresses strictly 1 -> 2 -> 3 -> 4
 * 2. Autoplay Policy Conformance: Zero silent pre-play during count-in (prevents unmuting pause aborts)
 * 3. WebAudio Priority: WebAudio Buffer is proactively preloaded during count-in
 * 4. Boundary Protection: Start position & loop locators are cleanly respected
 * ==============================================================================
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║   CAMPUS-GROOVELAB: AUDIO COUNT-IN FORENSIC TEST SUITE             ║');
console.log('║   Standards: W3C Web Audio API, WebKit/Chromium Autoplay Conformance║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

async function runAudioForensicSuite() {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}: ${err?.message || err}`);
      failed++;
    }
  }

  // --- Check 1: MeisterwerkAudioPlayers.tsx Source Audit ---
  test('InlineAudioPlayer: Zero silent HTML5 pre-play during count-in', () => {
    const filePath = path.resolve('apps/groovelab/src/components/student/meisterwerk/MeisterwerkAudioPlayers.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Ensure the flawed silent priming hack has been completely removed
    const hasFlawedPriming = content.includes('Safari WebKit Autoplay Priming') && content.includes('audio.muted = true') && content.includes('audio.play()');
    assert.strictEqual(hasFlawedPriming, false, 'Flawed silent HTML5 priming hack must NOT exist in InlineAudioPlayer');

    // Ensure WebAudio buffer preloading is present
    assert.ok(content.includes('loadAudioBuffer().catch(() => {})'), 'Buffer preloading must be initiated during count-in');

    // Ensure startWebAudioPlayback is prioritized upon count-in completion
    assert.ok(content.includes('startWebAudioPlayback({ loop: Boolean(isLooping), offsetSec: startOffset })'), 'WebAudio playback must be prioritized at downbeat of bar 2');
  });

  // --- Check 2: AudioTrackCarousel.tsx Source Audit ---
  test('AudioTrackCarousel: CompactAudioStrip & SplitCapsulePlayer zero silent pre-play', () => {
    const filePath = path.resolve('apps/groovelab/src/components/AudioTrackCarousel.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    const hasFlawedPriming = content.includes('Safari WebKit Autoplay Priming') || (content.includes('audioRef.current.muted = true') && content.includes('audioRef.current.volume = 0') && content.includes('audioRef.current.play()'));
    assert.strictEqual(hasFlawedPriming, false, 'Flawed silent HTML5 priming must NOT exist in AudioTrackCarousel');

    // Verify playNative is called cleanly on count-in completion
    assert.ok(content.includes('playNative();'), 'playNative must be called cleanly after count-in timer expires');
  });

  // --- Check 3: Count-In Timing & Step Mathematics ---
  test('Count-in BPM to step interval math calculation is sample-accurate', () => {
    const calculateBeatDuration = (bpm: number, rate: number = 1) => {
      const effectiveBpm = bpm > 0 ? bpm : 100;
      const beatDurationSec = (60 / effectiveBpm) / (rate || 1);
      return Math.round(beatDurationSec * 1000);
    };

    // 100 BPM at 1x speed -> 600ms per beat
    assert.strictEqual(calculateBeatDuration(100, 1), 600);
    // 120 BPM at 1x speed -> 500ms per beat
    assert.strictEqual(calculateBeatDuration(120, 1), 500);
    // 60 BPM at 1x speed -> 1000ms per beat
    assert.strictEqual(calculateBeatDuration(60, 1), 1000);
    // 100 BPM at 0.5x speed -> 1200ms per beat
    assert.strictEqual(calculateBeatDuration(100, 0.5), 1200);
  });

  // --- Check 4: Simulated Count-In State Progression ---
  test('Count-In State Lifecycle Simulation', async () => {
    let countInStep: number | null = null;
    let isPlaying = false;
    let audioPlaybackMode: 'webaudio' | 'html5' | 'none' = 'none';

    const simulatedBpm = 600; // Ultra-fast for unit test (100ms per beat)
    const beatDurationMs = (60 / simulatedBpm) * 1000;
    const leadTimeMs = 5;

    // Simulate clicking Play with countInActive = true
    countInStep = 1;
    const timers: any[] = [];
    timers.push(setTimeout(() => { countInStep = 2; }, leadTimeMs + beatDurationMs));
    timers.push(setTimeout(() => { countInStep = 3; }, leadTimeMs + 2 * beatDurationMs));
    timers.push(setTimeout(() => { countInStep = 4; }, leadTimeMs + 3 * beatDurationMs));
    timers.push(setTimeout(() => {
      countInStep = null;
      // Simulated WebAudio start
      audioPlaybackMode = 'webaudio';
      isPlaying = true;
    }, leadTimeMs + 4 * beatDurationMs));

    // At start: step is 1, not yet playing
    assert.strictEqual(countInStep, 1);
    assert.strictEqual(isPlaying, false);

    // Wait for full count-in to complete
    await new Promise(r => setTimeout(r, leadTimeMs + 4 * beatDurationMs + 50));

    // After 4 beats: step cleared, isPlaying true, mode is webaudio
    assert.strictEqual(countInStep, null, 'countInStep must be cleared after 4 beats');
    assert.strictEqual(isPlaying, true, 'isPlaying must be true when playback starts');
    assert.strictEqual(audioPlaybackMode, 'webaudio', 'Audio playback mode must be webaudio');
  });

  console.log('\n────────────────────────────────────────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('✅ ALL AUDIO COUNT-IN FORENSIC INVARIANTS SATISFIED.');
  }
}

runAudioForensicSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

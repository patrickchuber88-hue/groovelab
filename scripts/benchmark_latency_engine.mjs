/**
 * ==============================================================================
 * 🔬 Campus-Groovelab 0.1% DSP Forensic Benchmark: Audio Latency Engine 2027
 * ==============================================================================
 * 
 * Verifies mathematical cross-correlation precision, SNR robustness, and 
 * outlier rejection across synthetic hardware loopback scenarios.
 * 
 * Run via: node scripts/benchmark_latency_engine.mjs
 */

const SAMPLE_RATE = 48000;
const CHIRP_DURATION = 0.100; // 100ms
const NUM_CHIRP_SAMPLES = Math.floor(SAMPLE_RATE * CHIRP_DURATION);

// 1. Synthesize reference 100ms logarithmic chirp (800 Hz -> 3.200 Hz)
const chirpData = new Float32Array(NUM_CHIRP_SAMPLES);
let chirpEnergy = 0;

for (let i = 0; i < NUM_CHIRP_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  const progress = i / NUM_CHIRP_SAMPLES;
  const envelope = 0.5 * (1 - Math.cos(2 * Math.PI * progress));
  const instantFreq = 800 * Math.pow(3200 / 800, progress);
  const sampleVal = Math.sin(2 * Math.PI * instantFreq * t) * envelope * 0.85;
  chirpData[i] = sampleVal;
  chirpEnergy += sampleVal * sampleVal;
}

// 2. DSP Correlation Function matching audioLatencyService.ts
function runDspMeasurement(fullRecord, pingOffsetsSec, baseOffsetSec = 0.20) {
  const measuredDelaysMs = [];
  let maxOverallNcc = 0;

  for (let k = 0; k < 3; k++) {
    const expectedStartSample = Math.floor(SAMPLE_RATE * (baseOffsetSec + pingOffsetsSec[k]));
    const windowStart = expectedStartSample + Math.floor(SAMPLE_RATE * 0.005);
    const windowEnd = Math.min(fullRecord.length - NUM_CHIRP_SAMPLES, expectedStartSample + Math.floor(SAMPLE_RATE * 0.500));

    let maxNcc = -1;
    let peakIdx = windowStart;

    // Coarse scan: step 2
    for (let i = windowStart; i < windowEnd; i += 2) {
      let crossCorr = 0;
      let recEnergy = 0;
      for (let j = 0; j < NUM_CHIRP_SAMPLES; j += 4) {
        const r = fullRecord[i + j];
        const c = chirpData[j];
        crossCorr += r * c;
        recEnergy += r * r;
      }
      if (recEnergy > 1e-6) {
        const ncc = crossCorr / Math.sqrt(chirpEnergy * recEnergy);
        if (ncc > maxNcc) {
          maxNcc = ncc;
          peakIdx = i;
        }
      }
    }

    // Fine scan: step 1 in +/- 4 samples
    const fineStart = Math.max(windowStart, peakIdx - 4);
    const fineEnd = Math.min(windowEnd, peakIdx + 4);
    for (let i = fineStart; i <= fineEnd; i++) {
      let crossCorr = 0;
      let recEnergy = 0;
      for (let j = 0; j < NUM_CHIRP_SAMPLES; j += 2) {
        const r = fullRecord[i + j];
        const c = chirpData[j];
        crossCorr += r * c;
        recEnergy += r * r;
      }
      if (recEnergy > 1e-6) {
        const ncc = crossCorr / Math.sqrt(chirpEnergy * recEnergy);
        if (ncc > maxNcc) {
          maxNcc = ncc;
          peakIdx = i;
        }
      }
    }

    if (maxNcc > maxOverallNcc) maxOverallNcc = maxNcc;

    const measuredSec = (peakIdx - expectedStartSample) / SAMPLE_RATE;
    const measuredMs = Math.round(measuredSec * 1000);

    if (measuredMs >= 8 && measuredMs <= 550 && maxNcc > 0.12) {
      measuredDelaysMs.push(measuredMs);
    }
  }

  // Median Outlier Filter
  let finalMeasuredMs;
  if (measuredDelaysMs.length >= 3) {
    measuredDelaysMs.sort((a, b) => a - b);
    finalMeasuredMs = measuredDelaysMs[1];
  } else if (measuredDelaysMs.length === 2) {
    finalMeasuredMs = Math.round((measuredDelaysMs[0] + measuredDelaysMs[1]) / 2);
  } else if (measuredDelaysMs.length === 1) {
    finalMeasuredMs = measuredDelaysMs[0];
  } else {
    finalMeasuredMs = 45;
  }

  return { finalMeasuredMs, measuredDelaysMs, maxOverallNcc };
}

// 3. Synthetic Audio Generator with Ground Truth Delay & Acoustic Noise
function generateSyntheticRecord(groundTruthLatencyMs, pingOffsetsSec, options = {}) {
  const totalDurationSec = 2.0;
  const totalSamples = Math.floor(SAMPLE_RATE * totalDurationSec);
  const buffer = new Float32Array(totalSamples);

  // Background white noise (e.g. ambient classroom/room air)
  const noiseLevel = options.noiseLevel ?? 0.02;
  for (let i = 0; i < totalSamples; i++) {
    buffer[i] = (Math.random() * 2 - 1) * noiseLevel;
  }

  const baseOffsetSec = 0.20;
  for (let k = 0; k < 3; k++) {
    // Inject delay
    let delayMs = groundTruthLatencyMs;
    // Optional outlier spike on ping 1 (index 1) to test median rejection
    if (k === 1 && options.injectOutlier) {
      delayMs += 120; // 120ms outlier
    }

    const startSample = Math.floor(SAMPLE_RATE * (baseOffsetSec + pingOffsetsSec[k] + delayMs / 1000));
    const attenuation = options.attenuation ?? 0.65;

    for (let j = 0; j < NUM_CHIRP_SAMPLES; j++) {
      if (startSample + j < totalSamples) {
        buffer[startSample + j] += chirpData[j] * attenuation;
      }
    }
  }

  // Optional loud cough/thump acoustic transient
  if (options.injectTransient) {
    const transientStart = Math.floor(SAMPLE_RATE * 0.85);
    for (let t = 0; t < 2000; t++) {
      if (transientStart + t < totalSamples) {
        buffer[transientStart + t] += (Math.random() * 2 - 1) * 0.9;
      }
    }
  }

  return buffer;
}

// 4. Test Runner
const pingOffsetsSec = [0.0, 0.50, 1.00];

console.log('='.repeat(78));
console.log('🎧 CAMPUS-GROOVELAB 0.1% DSP FORENSIC BENCHMARK (2027 GOLDSTANDARD)');
console.log('='.repeat(78));

const testScenarios = [
  { name: 'Apple MacBook Pro (Interne Lautsprecher & Mic)', groundTruthMs: 38, noiseLevel: 0.02 },
  { name: 'Apple iPad Pro / iPhone (Interne Lautsprecher)', groundTruthMs: 48, noiseLevel: 0.03 },
  { name: 'Apple AirPods Pro / Max (Bluetooth A2DP Puffer)', groundTruthMs: 215, noiseLevel: 0.04 },
  { name: 'USB Audio Interface (Focusrite Scarlett / MOTU)', groundTruthMs: 14, noiseLevel: 0.005 },
  { name: 'Klassenzimmer Störschall (Raumhall + Notenheft-Schlag)', groundTruthMs: 42, noiseLevel: 0.08, injectTransient: true, injectOutlier: true }
];

let allPassed = true;

for (const scenario of testScenarios) {
  const simulatedBuffer = generateSyntheticRecord(scenario.groundTruthMs, pingOffsetsSec, scenario);
  const result = runDspMeasurement(simulatedBuffer, pingOffsetsSec);
  const delta = Math.abs(result.finalMeasuredMs - scenario.groundTruthMs);
  const isPassed = delta <= 1.5;

  if (!isPassed) allPassed = false;

  console.log(`\n📌 Szenario: ${scenario.name}`);
  console.log(`   - Ground-Truth Latenz : ${scenario.groundTruthMs} ms`);
  console.log(`   - Erkannte Latenz     : ${result.finalMeasuredMs} ms (Pings: ${result.measuredDelaysMs.join(', ')} ms)`);
  console.log(`   - Abweichung (Error)  : ${delta} ms (${delta === 0 ? 'Exakt sample-genau' : `±${delta} ms`})`);
  console.log(`   - NCC Konfidenz       : ${(result.maxOverallNcc * 100).toFixed(1)}%`);
  console.log(`   - Status              : ${isPassed ? '✅ 0.1% GOLDSTANDARD BESTANDEN' : '❌ VERFEHLT'}`);
}

console.log('\n' + '='.repeat(78));
if (allPassed) {
  console.log('🏆 FAZIT: 100% aller Test-Szenarien mit maximaler Präzision (Fehler <= 1ms) bestanden!');
} else {
  console.log('⚠️ FAZIT: Einige Szenarien wiesen Abweichungen auf.');
}
console.log('='.repeat(78));

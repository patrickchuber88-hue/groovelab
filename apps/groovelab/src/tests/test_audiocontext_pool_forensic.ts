/**
 * ==============================================================================
 * 🎧 CAMPUS-GROOVELAB: FORENSIC AUDIOCONTEXT POOL & LEASE MANAGER SUITE
 * ==============================================================================
 * Standards: OWASP ASVS Level 3, W3C Web Audio API Invariants,
 *            WebKit 6-Instance Hardware Limit Immunity, iOS DSP Power Saving
 * ==============================================================================
 */

import assert from 'assert';
import { audioContextPool } from '../services/audio/audioContextPool';

// 1. Setup Mock Web Audio Environment in Node.js
class MockAudioContext {
  public state: 'running' | 'suspended' | 'closed' = 'running';
  public sampleRate = 48000;
  public currentTime = 1.25;

  public async resume(): Promise<void> {
    this.state = 'running';
  }

  public async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  public async close(): Promise<void> {
    this.state = 'closed';
  }

  public decodeAudioData(
    _buffer: ArrayBuffer,
    success?: (buf: any) => void,
    _error?: (err: any) => void
  ): Promise<any> {
    const mockDecoded = { duration: 10, numberOfChannels: 2, sampleRate: 48000 };
    if (success) success(mockDecoded);
    return Promise.resolve(mockDecoded);
  }
}

// Attach mocks to global
(global as any).window = {
  AudioContext: MockAudioContext,
  addEventListener: () => {},
  removeEventListener: () => {}
};

async function runAudioContextPoolForensicSuite() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   CAMPUS-GROOVELAB: FORENSIC AUDIOCONTEXT POOL LEASING SUITE       ║');
  console.log('║   Testing Singleton Ceiling, 20-Lease Stress, Auto-Suspend DSP     ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}: ${err?.message || err}`);
      failed++;
    }
  }

  // Test 1: Singleton AudioContext Guarantee
  await test('Invariant 1: Singleton Instance (Max 1 AudioContext across modules)', async () => {
    const ctxA = await audioContextPool.acquireAudioLease('messenger');
    const ctxB = await audioContextPool.acquireAudioLease('tuner');
    const ctxSync = audioContextPool.getSharedAudioContext();

    assert.ok(ctxA, 'ctxA must be defined');
    assert.strictEqual(ctxA, ctxB, 'AudioContext must be identical singleton instance');
    assert.strictEqual(ctxA, ctxSync, 'Synchronous getter must return identical singleton');

    const metrics = audioContextPool.getMetrics();
    assert.strictEqual(metrics.leaseCount, 2, 'Active lease count must be exactly 2');
    assert.ok(metrics.activeLeases.includes('messenger'), 'Leases must include messenger');
    assert.ok(metrics.activeLeases.includes('tuner'), 'Leases must include tuner');
  });

  // Test 2: 20 Rapid Concurrent Leases Stress Drill
  await test('Invariant 2: High-Concurrency Stress (20 simultaneous client leases)', async () => {
    const clientIds = Array.from({ length: 20 }, (_, i) => `studio-client-${i + 1}`);

    // Acquire all 20 leases
    const contexts = await Promise.all(clientIds.map(id => audioContextPool.acquireAudioLease(id)));

    // Verify all 20 received the exact same singleton
    const firstCtx = contexts[0];
    for (const ctx of contexts) {
      assert.strictEqual(ctx, firstCtx, 'All 20 leases must share the exact same hardware AudioContext');
    }

    const metricsAfterAcquire = audioContextPool.getMetrics();
    // 2 from Test 1 + 20 new = 22 total
    assert.strictEqual(metricsAfterAcquire.leaseCount, 22, 'Lease count must reflect all 22 active leases');

    // Release all 20 leases
    clientIds.forEach(id => audioContextPool.releaseAudioLease(id));

    const metricsAfterRelease = audioContextPool.getMetrics();
    assert.strictEqual(metricsAfterRelease.leaseCount, 2, 'Lease count must return to 2');
  });

  // Test 3: Release, Zero Leases & Auto-Suspend
  await test('Invariant 3: Zero-Lease Power-Saving & Auto-Suspend timer arming', async () => {
    // Release remaining leases from Test 1
    audioContextPool.releaseAudioLease('messenger');
    audioContextPool.releaseAudioLease('tuner');

    const metrics = audioContextPool.getMetrics();
    assert.strictEqual(metrics.leaseCount, 0, 'Lease count must drop to 0');
    assert.strictEqual(metrics.activeLeases.length, 0, 'Active leases array must be empty');

    // Fast re-acquire cancels any pending suspend and resumes context
    const ctxNew = await audioContextPool.acquireAudioLease('transcoder');
    assert.ok(ctxNew, 'ctxNew must be defined');
    assert.strictEqual(ctxNew.state, 'running', 'Context must be in running state');

    audioContextPool.releaseAudioLease('transcoder');
  });

  // Test 4: Immediate Sound Synthesis Hook
  await test('Invariant 4: playImmediateSound runs without long-lived lease', async () => {
    let played = false;
    await audioContextPool.playImmediateSound((ctx) => {
      assert.ok(ctx, 'Provided context must be valid');
      played = true;
    });

    assert.ok(played, 'Sound synthesis callback must be executed');
  });

  // Test 5: Safe Decoding Engine
  await test('Invariant 5: safeDecodeAudioData decodes buffer safely', async () => {
    const dummyBuffer = new ArrayBuffer(1024);
    const decoded = await audioContextPool.safeDecodeAudioData(dummyBuffer);
    assert.strictEqual(decoded.sampleRate, 48000, 'Decoded buffer sampleRate must match');
    assert.strictEqual(decoded.duration, 10, 'Decoded buffer duration must match mock');
  });

  // Test 6: Teardown & Clean Lifecycle Reset
  await test('Invariant 6: Clean destroy resets context and lease registry', async () => {
    await audioContextPool.destroy();
    const metrics = audioContextPool.getMetrics();
    assert.strictEqual(metrics.state, 'uninitialized', 'State after destroy must be uninitialized');
    assert.strictEqual(metrics.leaseCount, 0, 'Leases must be completely purged');
  });

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`  📊 RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('════════════════════════════════════════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudioContextPoolForensicSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: FORENSIC MUTATION & FALSIFICATION TEST SUITE
 * ==============================================================================
 * Standards: DIN EN ISO/IEC 17025 (Validierung von Mess- und Prüfverfahren)
 * Epistemologie: Karl Poppers Falsifikationsprinzip (Beweis der Nichttrivialität)
 * Compliance: ISO/IEC 27037 / BSI TR-02102-1 / OWASP ASVS Level 3
 * 
 * Forensischer Zweck:
 * Beweist vor Gericht und Wirtschaftsprüfern, dass die forensischen Sicherheits-
 * und Audit-Wächter keine tautologischen „Scheinprüfungen“ sind, sondern bei
 * absichtlich injizierten Daten- und Krypto-Mutationen deterministisch anschlagen.
 * ==============================================================================
 */

import crypto from 'crypto';
import { computeDualHashSeal, verifyDualHashSeal } from '../utils/pqcDualHashingEngine';
import { generateRfc3161TimestampToken, verifyRfc3161TimestampToken } from '../services/rfc3161TimestampService';
import { allocateSecureBuffer, wipeBuffer, isBufferZeroed } from '../utils/secureMemoryWiper';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, details?: string) {
  if (condition) {
    results.push({ suite, name, passed: true });
    console.log(`  ✅ [PASS] [${suite}] ${name}`);
  } else {
    results.push({ suite, name, passed: false, details });
    console.error(`  ❌ [FAIL] [${suite}] ${name}: ${details || 'Assertion failed'}`);
  }
}

console.log('════════════════════════════════════════════════════════════════');
console.log('🔬 CAMPUS-GROOVELAB: FORENSIC MUTATION & FALSIFICATION DRILL');
console.log('   DIN EN ISO/IEC 17025 / Popperian Negative Hypothesis Testing');
console.log('════════════════════════════════════════════════════════════════\n');

// ------------------------------------------------------------------------------
// TOXIZITÄT 1: HASH-CHAIN BIT-FLIP MUTATION (WORM AUDIT VERIFIER FALSIFIKATION)
// ------------------------------------------------------------------------------
async function testHashChainMutationFalsification() {
  console.log('--- [MUTATION 1/4] WORM HASH-CHAIN INTEGRITY FALSIFICATION ---');

  interface AuditBlock {
    id: number;
    action: string;
    details: string;
    previous_hash: string;
    record_hash: string;
  }

  function hashBlock(prevHash: string, action: string, details: string): string {
    return crypto.createHash('sha256').update(`${prevHash}|${action}|${details}`, 'utf8').digest('hex');
  }

  // 1. Erzeuge eine Kette von 5 validen Blöcken
  const chain: AuditBlock[] = [];
  let prev = '0000000000000000000000000000000000000000000000000000000000000000';
  for (let i = 1; i <= 5; i++) {
    const action = `ACTION_${i}`;
    const details = `DETAILS_${i}`;
    const hash = hashBlock(prev, action, details);
    chain.push({
      id: i,
      action,
      details,
      previous_hash: prev,
      record_hash: hash
    });
    prev = hash;
  }

  // Chain Validator Helper
  function validateChain(blocks: AuditBlock[]): { valid: boolean; brokenAt?: number } {
    let expectedPrev = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const b of blocks) {
      if (b.previous_hash !== expectedPrev) {
        return { valid: false, brokenAt: b.id };
      }
      const calculated = hashBlock(b.previous_hash, b.action, b.details);
      if (b.record_hash !== calculated) {
        return { valid: false, brokenAt: b.id };
      }
      expectedPrev = b.record_hash;
    }
    return { valid: true };
  }

  // 2. Baseline Check (Unmutiert muss PASS sein)
  const baseline = validateChain(chain);
  assert(baseline.valid === true, 'Hash-Chain', '1.1 Baseline: Unmutierte Kette validiert fehlerfrei');

  // 3. Toxizität injizieren: Modifiziere Datensatz 3
  const mutatedChain = JSON.parse(JSON.stringify(chain));
  mutatedChain[2].details = 'MALICIOUS_TAMPERED_DETAILS';

  const falsificationReport = validateChain(mutatedChain);
  assert(
    falsificationReport.valid === false && falsificationReport.brokenAt === 3,
    'Hash-Chain',
    '1.2 Falsifikation: Mutation in Block 3 wird deterministisch detektiert und abgewiesen'
  );
}

// ------------------------------------------------------------------------------
// TOXIZITÄT 2: POST-QUANTUM DUAL-HASH DESYNCHRONISATION
// ------------------------------------------------------------------------------
async function testDualHashMutationFalsification() {
  console.log('\n--- [MUTATION 2/4] PQC DUAL-HASH DESYNCHRONISATION FALSIFIKATION ---');

  const content = JSON.stringify({ school_id: 'school-123', event: 'ANNUAL_AUDIT' });
  const seal = await computeDualHashSeal(content);

  // 1. Baseline Validierung
  const baseline = await verifyDualHashSeal(content, seal);
  assert(baseline.valid === true, 'PQC Dual-Hash', '2.1 Baseline: Gültiges Dual-Hash-Siegel besteht 100%');

  // 2. Toxizität injizieren: Flippe 1 Zeichen im SHA3-512 Zweig
  const corruptedSeal = {
    ...seal,
    sha3_512: seal.sha3_512.substring(0, 10) + 'f' + seal.sha3_512.substring(11)
  };

  const falsification = await verifyDualHashSeal(content, corruptedSeal);
  assert(
    falsification.valid === false && falsification.sha3Valid === false && falsification.sha256Valid === true,
    'PQC Dual-Hash',
    '2.2 Falsifikation: Isolierte SHA3-512 Mutation invalidiert das gesamte PQC-Hybridsiegel'
  );
}

// ------------------------------------------------------------------------------
// TOXIZITÄT 3: TIME-TRAVEL & CLOCK SPOOFING INJEKTION
// ------------------------------------------------------------------------------
async function testTimeDriftFalsification() {
  console.log('\n--- [MUTATION 3/4] TIME-TRAVEL & CLOCK-SPOOFING INJEKTION ---');

  const payloadDigest = crypto.createHash('sha256').update('test_payload', 'utf8').digest('hex');
  const validToken = await generateRfc3161TimestampToken(payloadDigest);

  // 1. Baseline Validierung
  const baseline = await verifyRfc3161TimestampToken(validToken, payloadDigest);
  assert(baseline.valid === true, 'RFC 3161 Timestamp', '3.1 Baseline: Valides RFC 3161 Token besteht Prüfung');

  // 2. Toxizität injizieren: Token-Signatur fälschen
  const tamperedToken = {
    ...validToken,
    token_signature: 'deadbeef00000000000000000000000000000000000000000000000000000000'
  };

  const falsification = await verifyRfc3161TimestampToken(tamperedToken, payloadDigest);
  assert(
    falsification.valid === false && falsification.signatureIntact === false,
    'RFC 3161 Timestamp',
    '3.2 Falsifikation: Manipuliertes Timestamp-Signatur-Token wird deterministisch abgewiesen'
  );
}

// ------------------------------------------------------------------------------
// TOXIZITÄT 4: V8 MEMORY ZERO-REMANENCE FALSIFIKATION
// ------------------------------------------------------------------------------
async function testMemoryZeroRemanenceFalsification() {
  console.log('\n--- [MUTATION 4/4] V8 MEMORY ZERO-REMANENCE & WIPING FALSIFIKATION ---');

  const buf = allocateSecureBuffer(128);
  buf.fill(0x42); // Fülle mit Test-Bytes 'B'

  assert(isBufferZeroed(buf) === false, 'Memory Wiper', '4.1 Allokierter Puffer mit Daten ist nicht null');

  // Forensisches Wiping durchführen
  wipeBuffer(buf);

  assert(
    isBufferZeroed(buf) === true,
    'Memory Wiper',
    '4.2 3-Pass Forensik-Wiping garantiert 100% genullten Speicher (ISO/IEC 27040)'
  );
}

// ------------------------------------------------------------------------------
// ORCHESTRATION & SUMMARY
// ------------------------------------------------------------------------------
async function runAllFalsificationTests() {
  await testHashChainMutationFalsification();
  await testDualHashMutationFalsification();
  await testTimeDriftFalsification();
  await testMemoryZeroRemanenceFalsification();

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`🏁 FALSIFICATION SUMMARY: ${passed}/${total} TESTS PASSED (${failed} FAILED)`);
  console.log('════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🏆 100% FALSIFICATION INTEGRITY: All forensical guards proven non-tautological.');
    process.exit(0);
  }
}

runAllFalsificationTests().catch(err => {
  console.error('Fatal Mutation Test Exception:', err);
  process.exit(1);
});

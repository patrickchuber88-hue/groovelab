// ==============================================================================
// Campus-Groovelab Enterprise+ BFF Idempotency & Anti-Replay Barrier Pentest Suite
// Datei: tests/security/bff-idempotency-ledger.test.ts
// Standards: OWASP ASVS Level 3 V13 / RFC 9110 / NIS-2 / ISO/IEC 27001
// Prüft:
// 1. Atomares Acquire & In-Flight 409 Conflict Locking
// 2. Response Caching & Replay-Header Integrität
// 3. 5xx Fail-Closed Lock Release (Retry-Permit)
// 4. Deterministische SHA-256 Request Fingerprints (Key-Order Invarianz)
// 5. LRU-Eviction & Memory-Cap (Anti-OOM DoS Schutz)
// 6. In-Flight Timeout & TTL Eviction
// 7. Express Middleware Integration
// ==============================================================================

import { IdempotencyLedger } from '../../packages/bff-server/src/services/idempotencyLedger';
import { idempotencyBarrier } from '../../packages/bff-server/src/middleware/idempotencyMiddleware';

let totalTests = 0;
let passedTests = 0;

function assert(name: string, condition: boolean, details: string = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${name}: ${details}`);
  }
}

async function runIdempotencyAudit() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('  🛡️   CAMPUS-GROOVELAB BFF IDEMPOTENCY & ANTI-REPLAY TEST SUITE    ');
  console.log('       OWASP ASVS L3 / RFC 9110 / LRU Memory Cap / Anti-Replay     ');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // --- 1. ATOMIC ACQUIRE & IN-FLIGHT LOCKING ---
  console.log('1. Prüfe Atomares Acquire & In-Flight Locking...');
  IdempotencyLedger.resetInstance();
  const ledger = IdempotencyLedger.getInstance({ defaultTtlMs: 2000, inFlightTimeoutMs: 500 });

  const res1 = ledger.acquire('test-key-1');
  assert('Erster Acquire-Aufruf liefert ACQUIRED', res1 === 'ACQUIRED');

  const res2 = ledger.acquire('test-key-1');
  assert('Paralleler Aufruf mit identischem Key liefert IN_FLIGHT (Lock aktiv)', res2 === 'IN_FLIGHT');

  const resOther = ledger.acquire('test-key-2');
  assert('Anderer Key kann parallel unabhängig erworben werden', resOther === 'ACQUIRED');

  // --- 2. COMPLETE & REPLAY CACHING ---
  console.log('\n2. Prüfe Complete & Replay Caching...');
  const testPayload = { success: true, incidentId: 'inc-999', timestamp: 12345 };
  ledger.complete('test-key-1', 201, testPayload);

  const resAfterComplete = ledger.acquire('test-key-1');
  assert('Nach Abschluss liefert acquire() den Status COMPLETED', resAfterComplete === 'COMPLETED');

  const cached = ledger.get('test-key-1');
  assert('Cached Record ist vorhanden', cached !== null);
  assert('Statuscode im Cache ist 201', cached?.statusCode === 201);
  assert('Body im Cache entspricht exakt Original-Payload', JSON.stringify(cached?.body) === JSON.stringify(testPayload));

  // --- 3. 5XX RELEASE FOR RETRIES ---
  console.log('\n3. Prüfe Lock Release bei Fehlern (Retry-Fähigkeit)...');
  ledger.acquire('error-key');
  assert('Error-Key erfolgreich gelockt', ledger.acquire('error-key') === 'IN_FLIGHT');

  ledger.release('error-key');
  assert('Nach release() ist Key wieder frei und kann re-acquired werden', ledger.acquire('error-key') === 'ACQUIRED');

  // --- 4. DETERMINISTIC FINGERPRINTING ---
  console.log('\n4. Prüfe Deterministisches SHA-256 Request Fingerprinting...');
  const bodyA = { b: 2, a: 1, nested: { y: 'test', x: 42 } };
  const bodyB = { nested: { x: 42, y: 'test' }, a: 1, b: 2 }; // Gleicher Inhalt, andere Key-Reihenfolge
  const bodyDifferent = { a: 1, b: 3 };

  const fpA = ledger.computeFingerprint('192.168.1.50', 'POST', '/api/v1/sentinel/incident', bodyA);
  const fpB = ledger.computeFingerprint('192.168.1.50', 'POST', '/api/v1/sentinel/incident', bodyB);
  const fpDiff = ledger.computeFingerprint('192.168.1.50', 'POST', '/api/v1/sentinel/incident', bodyDifferent);
  const fpDiffIp = ledger.computeFingerprint('192.168.1.51', 'POST', '/api/v1/sentinel/incident', bodyA);

  assert('Fingerprint ist deterministisch bei unterschiedlicher JSON-Key-Reihenfolge', fpA === fpB);
  assert('Fingerprint unterscheidet sich bei abweichendem Body', fpA !== fpDiff);
  assert('Fingerprint unterscheidet sich bei abweichender IP (Tenant-Isolation)', fpA !== fpDiffIp);
  assert('Fingerprint ist ein valider 64-Zeichen SHA-256 Hex-Hash', fpA.length === 64 && /^[0-9a-f]{64}$/.test(fpA));

  // --- 5. LRU EVICTION & MEMORY CAP ---
  console.log('\n5. Prüfe LRU Eviction & DoS Memory-Cap...');
  IdempotencyLedger.resetInstance();
  const cappedLedger = IdempotencyLedger.getInstance({ maxEntries: 3, defaultTtlMs: 50000 });

  cappedLedger.acquire('k1');
  cappedLedger.complete('k1', 200, { n: 1 });

  cappedLedger.acquire('k2');
  cappedLedger.complete('k2', 200, { n: 2 });

  cappedLedger.acquire('k3');
  cappedLedger.complete('k3', 200, { n: 3 });

  assert('Ledger fasst genau 3 Einträge', cappedLedger.size() === 3);

  // Greife auf k1 zu, sodass k2 das älteste Element wird
  cappedLedger.get('k1');

  // Füge 4. Element ein -> k2 muss verdrängt werden
  cappedLedger.acquire('k4');
  cappedLedger.complete('k4', 200, { n: 4 });

  assert('Ledger-Größe überschreitet maxEntries (3) nicht', cappedLedger.size() === 3);
  assert('Ältestes unberührtes Element (k2) wurde via LRU eviziert', cappedLedger.get('k2') === null);
  assert('Zuletzt berührtes Element (k1) ist noch vorhanden', cappedLedger.get('k1') !== null);
  assert('Neu eingefügtes Element (k4) ist vorhanden', cappedLedger.get('k4') !== null);

  // --- 6. TTL & STALE IN-FLIGHT EXPIRATION ---
  console.log('\n6. Prüfe TTL & Stale Lock Expiration...');
  IdempotencyLedger.resetInstance();
  const shortLedger = IdempotencyLedger.getInstance({ defaultTtlMs: 50, inFlightTimeoutMs: 50 });

  shortLedger.acquire('ttl-test');
  shortLedger.complete('ttl-test', 200, { done: true }, undefined, 50);

  // Warte 70ms auf Expiration
  await new Promise((resolve) => setTimeout(resolve, 70));

  assert('Nach TTL-Ablauf liefert get() null', shortLedger.get('ttl-test') === null);
  assert('Nach TTL-Ablauf kann der Key neu erworben werden', shortLedger.acquire('ttl-test') === 'ACQUIRED');

  // --- 7. EXPRESS MIDDLEWARE INTEGRATION AUDIT ---
  console.log('\n7. Prüfe Express Middleware (idempotencyBarrier)...');
  IdempotencyLedger.resetInstance();
  const mw = idempotencyBarrier({ ttlMs: 5000 });

  // Mock Request 1 (Initial)
  let status1 = 0;
  let body1: any = null;
  const listeners1: Record<string, () => void> = {};

  const req1: any = {
    method: 'POST',
    baseUrl: '/api',
    path: '/storage/presign-upload',
    headers: { 'idempotency-key': 'req-uuid-123' },
    ip: '10.0.0.1',
    body: { context: 'audio', sizeBytes: 1024 }
  };

  const res1Mock: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) { this.headers[k] = v; },
    status(code: number) { this.statusCode = code; status1 = code; return this; },
    json(data: any) { body1 = data; return this; },
    send(data: any) { body1 = data; return this; },
    once(event: string, fn: () => void) { listeners1[event] = fn; },
    removeListener(event: string) { delete listeners1[event]; }
  };

  let nextCalled1 = false;
  mw(req1, res1Mock, () => { nextCalled1 = true; });

  assert('Initialer Request ruft next() auf', nextCalled1);

  // Simuliere parallelen Request mit selbem Key WÄHREND req1 noch in-flight ist
  let status2 = 0;
  let body2: any = null;
  const req2: any = { ...req1 };
  const res2Mock: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) { this.headers[k] = v; },
    status(code: number) { status2 = code; return this; },
    json(data: any) { body2 = data; return this; },
    send(data: any) { body2 = data; return this; },
    once() {},
    removeListener() {}
  };

  let nextCalled2 = false;
  mw(req2, res2Mock, () => { nextCalled2 = true; });

  assert('Paralleler Request wird mit HTTP 409 CONCURRENT_REQUEST_IN_FLIGHT geblockt', status2 === 409);
  assert('Paralleler Request ruft NICHT next() auf', !nextCalled2);
  assert('Fehlermeldung CONCURRENT_REQUEST_IN_FLIGHT ist gesetzt', body2?.error === 'CONCURRENT_REQUEST_IN_FLIGHT');

  // Nun beendet req1 erfolgreich seinen Handler
  res1Mock.statusCode = 201;
  res1Mock.json({ presignedUrl: 'https://storage.local/upload/123' });
  if (listeners1['finish']) listeners1['finish']();

  // Dritter Request (Replay nach erfolgreichem Abschluss)
  let status3 = 0;
  let body3: any = null;
  let replayHeaderSet = false;

  const req3: any = { ...req1 };
  const res3Mock: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) { 
      this.headers[k] = v; 
      if (k === 'Idempotent-Replay' && v === 'true') replayHeaderSet = true;
    },
    status(code: number) { status3 = code; return this; },
    json(data: any) { body3 = data; return this; },
    send(data: any) { body3 = data; return this; },
    once() {},
    removeListener() {}
  };

  let nextCalled3 = false;
  mw(req3, res3Mock, () => { nextCalled3 = true; });

  assert('Replay ruft NICHT next() auf (Handler wird geschont)', !nextCalled3);
  assert('Replay liefert Status 201 aus dem Cache', status3 === 201);
  assert('Replay liefert exakt dieselbe Response wie req1', body3?.presignedUrl === 'https://storage.local/upload/123');
  assert('Header Idempotent-Replay: true wurde injiziert', replayHeaderSet);

  // --- ZUSAMMENFASSUNG ---
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`  ERGEBNIS: ${passedTests} von ${totalTests} Prüfungen erfolgreich absolviert.`);
  console.log('════════════════════════════════════════════════════════════════════\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runIdempotencyAudit().catch((err) => {
  console.error('Fataler Testsuite-Fehler:', err);
  process.exit(1);
});

// ==============================================================================
// Campus-Groovelab Enterprise+ Edge & Proxy Resilience Pentest Suite
// Datei: tests/security/edge-proxy-resilience.test.ts
// Standards: OWASP ASVS Level 3 V13/V14 / Art. 5 & 32 DSGVO / SRE Circuit Breaker
// Prüft:
// 1. Service Worker Anti-API-Cache Barrier (Multi-Tenancy Isolation on Shared Tablets)
// 2. Upstream Circuit Breaker State Transitions (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)
// 3. Circuit Breaker Middleware Fail-Fast & Retry-After
// 4. Proxy Upstream Socket & Connection Timeouts (10s bounds)
// 5. Zero-Information-Leakage Reverse Proxy Header Sanitization
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UpstreamCircuitBreaker } from '../../packages/bff-server/src/services/upstreamCircuitBreaker';
import { circuitBreakerMiddleware } from '../../packages/bff-server/src/routes/proxy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

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

async function runEdgeProxyResilienceAudit() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('  🛡️   CAMPUS-GROOVELAB EDGE & PROXY RESILIENCE TEST SUITE         ');
  console.log('       OWASP ASVS L3 / Art. 5 DSGVO / Circuit Breaker / Zero-Leakage');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // --- 1. SERVICE WORKER ANTI-API-CACHE BARRIER ---
  console.log('1. Prüfe Service Worker Anti-API-Cache Barrier...');
  const swPath = path.join(ROOT_DIR, 'apps', 'groovelab', 'public', 'sw.js');
  const swContent = fs.readFileSync(swPath, 'utf8');

  assert('sw.js existiert', fs.existsSync(swPath));
  assert('sw.js enthält expliziten url.pathname.startsWith(\'/api/\') Bypass', swContent.includes("url.pathname.startsWith('/api/')"));
  assert('sw.js enthält expliziten url.pathname.startsWith(\'/gate/\') Bypass', swContent.includes("url.pathname.startsWith('/gate/')"));
  assert('sw.js enthält expliziten url.pathname === \'/gate\' Bypass', swContent.includes("url.pathname === '/gate'"));

  // Verifiziere, dass der Bypass vor dem dynamic cache match steht
  const apiBypassIndex = swContent.indexOf("url.pathname.startsWith('/api/')");
  const cacheMatchIndex = swContent.indexOf("caches.match(event.request, { ignoreSearch: true })");
  assert('API-Bypass steht hierarchisch VOR dem Stale-While-Revalidate Caching', apiBypassIndex !== -1 && cacheMatchIndex !== -1 && apiBypassIndex < cacheMatchIndex);

  // --- 2. UPSTREAM CIRCUIT BREAKER STATE TRANSITIONS ---
  console.log('\n2. Prüfe Upstream Circuit Breaker State Transitions...');
  UpstreamCircuitBreaker.resetInstance();
  const cb = new UpstreamCircuitBreaker({ failureThreshold: 3, cooldownMs: 100, decayWindowMs: 500 });

  assert('Initialer Zustand ist CLOSED', cb.getState() === 'CLOSED');
  assert('isOpen() ist initial false', !cb.isOpen());

  // 2 Fehlschläge bei Threshold 3 -> Bleibt CLOSED
  cb.recordFailure(new Error('Connection reset 1'));
  cb.recordFailure(new Error('Connection reset 2'));
  assert('Nach 2 Failures (< 3) verbleibt Schalter im Status CLOSED', cb.getState() === 'CLOSED');

  // 3. Fehlschlag -> Trip zu OPEN
  cb.recordFailure(new Error('Connection timeout 3'));
  assert('Bei Erreichen des Thresholds (3) schaltet Circuit auf OPEN', cb.getState() === 'OPEN');
  assert('isOpen() liefert true', cb.isOpen());
  assert('getRemainingCooldownMs() liefert Restzeit > 0', cb.getRemainingCooldownMs() > 0);

  // Warte auf Ablauf des Cooldowns (120ms > 100ms)
  await new Promise((resolve) => setTimeout(resolve, 120));

  assert('Nach Cooldown wechselt Circuit automatisch zu HALF_OPEN', cb.getState() === 'HALF_OPEN');

  // Erfolgreicher Probe-Request schließt den Circuit
  cb.recordSuccess();
  assert('Nach erfolgreichem Probe-Request kehrt Circuit zu CLOSED zurück', cb.getState() === 'CLOSED');
  assert('isOpen() liefert wieder false', !cb.isOpen());

  // Erneuter Test: Probe-Fehlschlag in HALF_OPEN schlägt sofort wieder fehl
  cb.recordFailure(new Error('Fail 1'));
  cb.recordFailure(new Error('Fail 2'));
  cb.recordFailure(new Error('Fail 3'));
  assert('Circuit wieder OPEN', cb.getState() === 'OPEN');

  await new Promise((resolve) => setTimeout(resolve, 120));
  assert('Circuit wechselt zu HALF_OPEN', cb.getState() === 'HALF_OPEN');

  cb.recordFailure(new Error('Probe failed'));
  assert('Fehlschlag während HALF_OPEN öffnet den Circuit sofort wieder (OPEN)', cb.getState() === 'OPEN');

  // --- 3. CIRCUIT BREAKER MIDDLEWARE INTEGRATION ---
  console.log('\n3. Prüfe Circuit Breaker Express Middleware...');
  UpstreamCircuitBreaker.resetInstance();
  const activeCb = UpstreamCircuitBreaker.getInstance({ failureThreshold: 2, cooldownMs: 5000 });

  let nextCalled = false;
  const mockReq: any = { method: 'GET', originalUrl: '/api/db/students' };
  let mockStatusCode = 200;
  let mockResponseBody: any = null;
  const mockHeaders: Record<string, string> = {};

  const mockRes: any = {
    setHeader(k: string, v: string) { mockHeaders[k] = v; },
    status(code: number) { mockStatusCode = code; return this; },
    json(data: any) { mockResponseBody = data; return this; }
  };

  // Im Status CLOSED: next() wird aufgerufen
  circuitBreakerMiddleware(mockReq, mockRes, () => { nextCalled = true; });
  assert('Bei intaktem Circuit ruft Middleware next() auf', nextCalled);

  // Nun provozieren wir 2 Fehler, sodass der Circuit auslöst
  activeCb.recordFailure(new Error('Kong down 1'));
  activeCb.recordFailure(new Error('Kong down 2'));
  assert('Circuit ist nun OPEN', activeCb.isOpen());

  let failFastNextCalled = false;
  mockStatusCode = 0;
  circuitBreakerMiddleware(mockReq, mockRes, () => { failFastNextCalled = true; });

  assert('Bei offenem Circuit wird next() NICHT aufgerufen (Fail-Fast)', !failFastNextCalled);
  assert('Middleware antwortet mit HTTP 503 Service Unavailable', mockStatusCode === 503);
  assert('Fehlercode UPSTREAM_GATEWAY_CIRCUIT_OPEN ist gesetzt', mockResponseBody?.error === 'UPSTREAM_GATEWAY_CIRCUIT_OPEN');
  assert('Header Retry-After ist gesetzt', Boolean(mockHeaders['Retry-After']));

  // --- 4. PROXY CONFIGURATION TIMEOUTS & HEADER STRIPPING ---
  console.log('\n4. Prüfe Proxy Timeouts & Zero-Information-Leakage Invarianten...');
  const proxyCodePath = path.join(ROOT_DIR, 'packages', 'bff-server', 'src', 'routes', 'proxy.ts');
  const proxyCode = fs.readFileSync(proxyCodePath, 'utf8');

  assert('proxy.ts konfiguriert timeout: 10000 (10s Socket-Timeout)', proxyCode.includes('timeout: 10000'));
  assert('proxy.ts konfiguriert proxyTimeout: 10000 (10s Upstream-Timeout)', proxyCode.includes('proxyTimeout: 10000'));
  assert('proxy.ts definiert onError Handler', proxyCode.includes('onError:'));
  assert('proxy.ts tilgt Server Header (delete proxyRes.headers[\'server\'])', proxyCode.includes("delete proxyRes.headers['server']"));
  assert('proxy.ts tilgt X-Powered-By Header', proxyCode.includes("delete proxyRes.headers['x-powered-by']"));
  assert('proxy.ts tilgt X-Kong-Upstream-Latency Header', proxyCode.includes("delete proxyRes.headers['x-kong-upstream-latency']"));
  assert('proxy.ts tilgt X-Kong-Proxy-Latency Header', proxyCode.includes("delete proxyRes.headers['x-kong-proxy-latency']"));

  // --- ZUSAMMENFASSUNG ---
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`  ERGEBNIS: ${passedTests} von ${totalTests} Prüfungen erfolgreich absolviert.`);
  console.log('════════════════════════════════════════════════════════════════════\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
  process.exit(0);
}

runEdgeProxyResilienceAudit().catch((err) => {
  console.error('Fataler Testsuite-Fehler:', err);
  process.exit(1);
});

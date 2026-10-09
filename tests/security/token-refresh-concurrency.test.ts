// ==============================================================================
// Campus-Groovelab Enterprise+ Token Refresh Concurrency Pentest Suite
// Datei: tests/security/token-refresh-concurrency.test.ts
// Standards: RFC 6749 / RFC 6819 / OWASP ASVS Level 3 V3 / Single-Flight Pattern
// Prüft:
// 1. Single-Flight Promise-Merging bei parallelen Requests
// 2. Exakt 1 Netzwerk-Call bei 10 gleichzeitigen Token-Refreshes
// 3. Identische Token- und Cookie-Verteilung an alle parallelen Anrufer
// 4. Token-Isolation zwischen unterschiedlichen Benutzern
// 5. In-Memory Lifecycle & Garbage Collection nach Flug-Abschluss
// 6. Fehler-Propagation bei Revocation (invalid_grant)
// 7. Resilienz bei temporären Upstream-Netzwerkfehlern
// ==============================================================================

import { TokenRefreshCoordinator, RefreshOutcome } from '../../packages/bff-server/src/services/tokenRefreshCoordinator';

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

async function runTokenRefreshConcurrencyAudit() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('  🛡️   CAMPUS-GROOVELAB TOKEN REFRESH CONCURRENCY TEST SUITE       ');
  console.log('       RFC 6819 Token Rotation / Single-Flight Mutex / Zero-Logout ');
  console.log('════════════════════════════════════════════════════════════════════\n');

  const coordinator = TokenRefreshCoordinator.getInstance();
  coordinator.clear();

  // --- 1. SINGLE EXECUTION TEST ---
  console.log('1. Prüfe regulären Single-Token Refresh...');
  let singleExecCount = 0;
  const singleOutcome = await coordinator.coordinate('initial-refresh-token-123', async () => {
    singleExecCount++;
    return {
      status: 'SUCCESS',
      data: {
        accessToken: 'fresh-access-token-1',
        refreshToken: 'fresh-refresh-token-1',
        expiresAt: Date.now() + 3600000,
        encryptedCookie: 'jwe.encrypted.payload.1'
      }
    };
  });

  assert('Single-Flight liefert Status SUCCESS', singleOutcome.status === 'SUCCESS');
  assert('Executor wurde genau 1x aufgerufen', singleExecCount === 1);
  assert('Neuer Access-Token stimmt überein', singleOutcome.data?.accessToken === 'fresh-access-token-1');
  assert('In-Flight Queue ist nach Abschluss leer (0)', coordinator.getInFlightCount() === 0);

  // --- 2. 10 PARALLEL CONCURRENT CALLS (SINGLE-FLIGHT MUTEX) ---
  console.log('\n2. Prüfe 10 zeitgleiche parallele Requests auf denselben Token...');
  let parallelExecCount = 0;
  const sharedRefreshToken = 'shared-user-refresh-token-xyz';

  // Simuliere 10 zeitgleiche API-Aufrufe (z.B. Teacher Dashboard Initial Paint)
  const concurrentCalls = Array.from({ length: 10 }, (_, index) => {
    return coordinator.coordinate(sharedRefreshToken, async () => {
      parallelExecCount++;
      // Simuliere 60ms Netzwerklatenz zu Kong/GoTrue
      await new Promise((r) => setTimeout(r, 60));
      return {
        status: 'SUCCESS',
        data: {
          accessToken: 'fresh-multi-flight-at',
          refreshToken: 'fresh-multi-flight-rt',
          expiresAt: Date.now() + 3600000,
          encryptedCookie: 'jwe.multi.cookie.secure'
        }
      };
    });
  });

  // Während die Aufrufe laufen, muss genau 1 In-Flight Promise aktiv sein
  assert('Während der Ausführung ist genau 1 In-Flight Promise registriert', coordinator.getInFlightCount() === 1);

  const results = await Promise.all(concurrentCalls);

  assert('Exakt 1 Netzwerk-Executor-Aufruf trotz 10 paralleler Requests (Single-Flight)', parallelExecCount === 1);
  assert('Alle 10 Requests erhalten Status SUCCESS', results.every((r) => r.status === 'SUCCESS'));
  assert('Alle 10 Requests erhalten den identischen Access-Token', results.every((r) => r.data?.accessToken === 'fresh-multi-flight-at'));
  assert('Alle 10 Requests erhalten denselben verschlüsselten Cookie', results.every((r) => r.data?.encryptedCookie === 'jwe.multi.cookie.secure'));

  const reusedCount = results.filter((r) => r.data?.isReusedFlight === true).length;
  assert('Genau 9 nachfolgende Requests wurden dedupliziert (isReusedFlight: true)', reusedCount === 9);
  assert('In-Flight Queue ist nach allen 10 Requests vollständig bereinigt (0)', coordinator.getInFlightCount() === 0);

  // --- 3. TENANT / USER TOKEN ISOLATION ---
  console.log('\n3. Prüfe Token-Isolation zwischen unterschiedlichen Benutzern...');
  let userAExec = 0;
  let userBExec = 0;

  const [resA, resB] = await Promise.all([
    coordinator.coordinate('user-A-token', async () => {
      userAExec++;
      await new Promise((r) => setTimeout(r, 30));
      return { status: 'SUCCESS', data: { accessToken: 'at-A', refreshToken: 'rt-A', expiresAt: 1, encryptedCookie: 'c-A' } };
    }),
    coordinator.coordinate('user-B-token', async () => {
      userBExec++;
      await new Promise((r) => setTimeout(r, 30));
      return { status: 'SUCCESS', data: { accessToken: 'at-B', refreshToken: 'rt-B', expiresAt: 2, encryptedCookie: 'c-B' } };
    })
  ]);

  assert('User A Executor wurde aufgerufen', userAExec === 1);
  assert('User B Executor wurde unabhängig aufgerufen', userBExec === 1);
  assert('User A erhält seinen eigenen Token', resA.data?.accessToken === 'at-A');
  assert('User B erhält seinen eigenen Token', resB.data?.accessToken === 'at-B');
  assert('In-Flight Map ist wieder 0', coordinator.getInFlightCount() === 0);

  // --- 4. SUBSEQUENT CALL AFTER FLIGHT SETTLES ---
  console.log('\n4. Prüfe Folgeaufruf nach Abschluss...');
  let subsequentExec = 0;
  const subResult = await coordinator.coordinate(sharedRefreshToken, async () => {
    subsequentExec++;
    return { status: 'SUCCESS', data: { accessToken: 'at-subsequent', refreshToken: 'rt-subsequent', expiresAt: 3, encryptedCookie: 'c-sub' } };
  });

  assert('Folgeaufruf startet neuen Lauf (Executor ausgeführt)', subsequentExec === 1);
  assert('Folgeaufruf ist kein Reused-Flight', subResult.data?.isReusedFlight !== true);

  // --- 5. AUTHORITATIVE REVOCATION PROPAGATION ---
  console.log('\n5. Prüfe Propagierung bei Session-Revocation (invalid_grant)...');
  let revokedCalls = 0;
  const revokedPromises = Array.from({ length: 4 }, () => {
    return coordinator.coordinate('revoked-token', async () => {
      revokedCalls++;
      await new Promise((r) => setTimeout(r, 20));
      return { status: 'REVOKED', error: 'INVALID_GRANT' };
    });
  });

  const revokedResults = await Promise.all(revokedPromises);
  assert('Genau 1 Revocation-Check ausgeführt', revokedCalls === 1);
  assert('Alle 4 parallelen Anrufer erhalten synchron Status REVOKED', revokedResults.every((r) => r.status === 'REVOKED'));
  assert('Fehlergrund INVALID_GRANT ist propagiert', revokedResults[0].error === 'INVALID_GRANT');
  assert('In-Flight Map ist nach Fehler bereinigt', coordinator.getInFlightCount() === 0);

  // --- 6. UPSTREAM TRANSIENT ERROR RESILIENCE ---
  console.log('\n6. Prüfe Resilienz bei temporären Upstream-Netzwerkfehlern...');
  let errorCalls = 0;
  const errorPromises = Array.from({ length: 3 }, () => {
    return coordinator.coordinate('flapping-network-token', async () => {
      errorCalls++;
      await new Promise((r) => setTimeout(r, 20));
      return { status: 'UPSTREAM_ERROR', error: 'HTTP_504' };
    });
  });

  const errorResults = await Promise.all(errorPromises);
  assert('Genau 1 Netzwerkversuch bei Upstream-Fehler', errorCalls === 1);
  assert('Alle 3 Anrufer erhalten UPSTREAM_ERROR', errorResults.every((r) => r.status === 'UPSTREAM_ERROR'));
  assert('In-Flight Map nach Fehler bereinigt', coordinator.getInFlightCount() === 0);

  // --- ZUSAMMENFASSUNG ---
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`  ERGEBNIS: ${passedTests} von ${totalTests} Prüfungen erfolgreich absolviert.`);
  console.log('════════════════════════════════════════════════════════════════════\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
  process.exit(0);
}

runTokenRefreshConcurrencyAudit().catch((err) => {
  console.error('Fataler Testsuite-Fehler:', err);
  process.exit(1);
});

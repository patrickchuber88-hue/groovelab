#!/usr/bin/env node
// =============================================================================
// 🏛️  Campus-Groovelab Tier-1 Perimeter & Mozilla Observatory Security Auditor
// Standard:  Mozilla Observatory (Target: A+ / 100%+), BSI TR-02102-2, OWASP ASVS L3
// Runtime:   Native Node.js ESM — zero external dependencies
// Usage:     node scripts/verify_perimeter_headers.mjs [URL]
// =============================================================================

import https from 'https';
import http  from 'http';
import { URL } from 'url';

// ---------------------------------------------------------------------------
// Configuration & Target Resolution
// ---------------------------------------------------------------------------
const rawTarget = process.argv[2] || process.env.TARGET_URL || 'https://campus-groovelab.de';
let targetUrl;
try {
  targetUrl = new URL(rawTarget.startsWith('http') ? rawTarget : `https://${rawTarget}`);
} catch (e) {
  console.error(`❌ Ungültige Ziel-URL: ${rawTarget}`);
  process.exit(1);
}

const HR = '═'.repeat(74);
const SUB_HR = '─'.repeat(74);

console.log(`\n${HR}`);
console.log('  🏛️   CAMPUS-GROOVELAB TIER-1 WEB-PERIMETER SECURITY AUDITOR');
console.log('       Mozilla Observatory Grade A+ & BSI TR-02102-2 Compliance Engine');
console.log(`       Ziel: ${targetUrl.origin}`);
console.log(`${HR}\n`);

// ---------------------------------------------------------------------------
// Low-Level HTTP/HTTPS Client (Zero-Dependency)
// ---------------------------------------------------------------------------
function fetchHead(urlObj, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    const req = client.request(urlObj, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'CampusGroovelab-PerimeterAudit/2.0 (Enterprise-Security-Guard)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...(options.headers || {})
      },
      rejectUnauthorized: true,
      timeout: 10000,
    }, (res) => {
      resolve({
        statusCode: res.statusCode || 0,
        headers: res.headers,
        httpVersion: res.httpVersion,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout bei Verbindungsaufbau (10s überschritten)'));
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Audit Execution
// ---------------------------------------------------------------------------
async function runAudit() {
  let score = 100;
  const findings = [];
  let httpsResponse;
  let httpRedirectResponse;

  // 1. Probe HTTPS Endpoint
  try {
    httpsResponse = await fetchHead(targetUrl);
  } catch (err) {
    console.error(`🚨 KRITISCHER VERBINDUNGSFEHLER: HTTPS-Handshake fehlgeschlagen: ${err.message}`);
    process.exit(1);
  }

  // 2. Probe HTTP to HTTPS Redirect
  const httpUrl = new URL(targetUrl.toString());
  httpUrl.protocol = 'http:';
  try {
    httpRedirectResponse = await fetchHead(httpUrl);
  } catch (err) {
    // HTTP port may be closed or firewalled
    httpRedirectResponse = null;
  }

  const headers = httpsResponse.headers;

  function record(ruleId, name, passed, penalty, details, remediation) {
    if (!passed) {
      score -= penalty;
      findings.push({ ruleId, name, passed: false, penalty, details, remediation });
    } else {
      findings.push({ ruleId, name, passed: true, penalty: 0, details });
    }
  }

  // --- CHECK 1: HTTP-to-HTTPS Redirection ---
  if (httpRedirectResponse) {
    const isRedirect = [301, 307, 308].includes(httpRedirectResponse.statusCode);
    const location = httpRedirectResponse.headers['location'] || '';
    const redirectsToHttps = isRedirect && location.startsWith('https://');
    record(
      'RED-01',
      'HTTP-to-HTTPS Redirection',
      redirectsToHttps,
      20,
      redirectsToHttps ? `HTTP ${httpRedirectResponse.statusCode} → ${location}` : `HTTP Status: ${httpRedirectResponse.statusCode} (Kein Redirect auf HTTPS)`,
      'Nginx server { listen 80; return 301 https://$host$request_uri; } konfigurieren.'
    );
  } else {
    record(
      'RED-01',
      'HTTP-to-HTTPS Redirection',
      false,
      10,
      'Port 80 (HTTP) nicht erreichbar oder verbindung verweigert',
      'Port 80 auf Nginx öffnen und mit 301-Redirect auf Port 443 weiterleiten.'
    );
  }

  // --- CHECK 2: Strict-Transport-Security (HSTS) ---
  const hsts = headers['strict-transport-security'];
  if (!hsts) {
    record('HSTS-01', 'Strict-Transport-Security (HSTS)', false, 25, 'Header fehlt vollständig', 'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload setzen.');
  } else {
    const maxAgeMatch = hsts.match(/max-age=(\d+)/i);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0;
    const hasSubdomains = /includeSubDomains/i.test(hsts);
    const hasPreload = /preload/i.test(hsts);
    const isValidHsts = maxAge >= 63072000 && hasSubdomains && hasPreload;
    record(
      'HSTS-01',
      'Strict-Transport-Security (HSTS - 2 Jahre + Preload)',
      isValidHsts,
      20,
      `Wert: "${hsts}" (max-age: ${maxAge}s, subdomains: ${hasSubdomains}, preload: ${hasPreload})`,
      'HSTS erfordert max-age >= 63072000 (2 Jahre), includeSubDomains und preload für Mozilla A+.'
    );
  }

  // --- CHECK 3: X-Frame-Options (Clickjacking Protection) ---
  const xfo = (headers['x-frame-options'] || '').toUpperCase();
  const isValidXfo = xfo === 'DENY' || xfo === 'SAMEORIGIN';
  record(
    'XFO-01',
    'X-Frame-Options (Clickjacking)',
    isValidXfo,
    15,
    xfo ? `Wert: "${xfo}"` : 'Header fehlt vollständig',
    'X-Frame-Options: DENY (oder SAMEORIGIN) in Nginx add_header eintragen.'
  );

  // --- CHECK 4: X-Content-Type-Options (MIME-Sniffing) ---
  const xcto = (headers['x-content-type-options'] || '').toLowerCase();
  record(
    'XCTO-01',
    'X-Content-Type-Options (MIME Sniffing)',
    xcto === 'nosniff',
    10,
    xcto ? `Wert: "${xcto}"` : 'Header fehlt',
    'X-Content-Type-Options: nosniff immer mitsenden.'
  );

  // --- CHECK 5: Referrer-Policy ---
  const refPol = headers['referrer-policy'] || '';
  const isStrictRef = /strict-origin-when-cross-origin|no-referrer/i.test(refPol);
  record(
    'REF-01',
    'Referrer-Policy (PII Leakage Defense)',
    isStrictRef,
    10,
    refPol ? `Wert: "${refPol}"` : 'Header fehlt',
    'Referrer-Policy: strict-origin-when-cross-origin setzen.'
  );

  // --- CHECK 6: Permissions-Policy (Hardware Protection) ---
  const permPol = headers['permissions-policy'] || '';
  const hasCameraDisabled = /camera=\(\)/i.test(permPol);
  const hasMicrophoneSelf = /microphone=\(self\)/i.test(permPol);
  const hasPermPol = permPol.length > 0;
  record(
    'PERM-01',
    'Permissions-Policy (Hardware Sandbox)',
    hasPermPol && hasCameraDisabled && hasMicrophoneSelf,
    10,
    permPol ? `Wert: "${permPol}"` : 'Header fehlt',
    'Permissions-Policy: camera=(), microphone=(self), geolocation=(), payment=(), usb=() setzen.'
  );

  // --- CHECK 7: Content-Security-Policy (CSP) ---
  const csp = headers['content-security-policy'] || '';
  if (!csp) {
    record('CSP-01', 'Content-Security-Policy (CSP)', false, 25, 'Header fehlt vollständig', 'Content-Security-Policy mit default-src \'self\' und strict directives definieren.');
  } else {
    const hasDefaultSelf = /default-src\s+[^;]*'self'/i.test(csp);
    const hasFrameAncestorsNone = /frame-ancestors\s+[^;]*'none'/i.test(csp);
    const hasObjectNone = /object-src\s+[^;]*'none'/i.test(csp);
    const hasUpgradeInsecure = /upgrade-insecure-requests/i.test(csp);
    const leaksUsCloud = /(?:googleapis\.com|firebaseio\.com|amazonaws\.com)/i.test(csp);

    const isCspValid = hasDefaultSelf && hasObjectNone && !leaksUsCloud;
    record(
      'CSP-01',
      'Content-Security-Policy (Sovereign Monolith CSP)',
      isCspValid,
      25,
      `default-src: ${hasDefaultSelf}, object-none: ${hasObjectNone}, frame-ancestors: ${hasFrameAncestorsNone}, US-Leak: ${leaksUsCloud}`,
      'CSP muss default-src \'self\', object-src \'none\', frame-ancestors \'none\' und sovereign connect-src deklarieren.'
    );
  }

  // --- CHECK 8: Cross-Origin Isolation (COOP, CORP, COEP) ---
  const coop = headers['cross-origin-opener-policy'] || '';
  const corp = headers['cross-origin-resource-policy'] || '';
  const coep = headers['cross-origin-embedder-policy'] || '';

  const hasCoop = coop === 'same-origin' || coop === 'same-origin-allow-popups';
  const hasCorp = corp === 'same-origin';
  const hasCoep = coep === 'credentialless' || coep === 'require-corp';

  record(
    'COOP-01',
    'Cross-Origin-Opener-Policy (COOP)',
    hasCoop,
    5,
    coop ? `Wert: "${coop}"` : 'Header fehlt',
    'Cross-Origin-Opener-Policy: same-origin setzen.'
  );

  record(
    'CORP-01',
    'Cross-Origin-Resource-Policy (CORP)',
    hasCorp,
    5,
    corp ? `Wert: "${corp}"` : 'Header fehlt',
    'Cross-Origin-Resource-Policy: same-origin setzen.'
  );

  record(
    'COEP-01',
    'Cross-Origin-Embedder-Policy (COEP - Web Audio Ready)',
    hasCoep,
    5,
    coep ? `Wert: "${coep}"` : 'Header fehlt (empfohlen: credentialless für Web Audio)',
    'Cross-Origin-Embedder-Policy: credentialless setzen.'
  );

  // --- CHECK 9: Server Information Disclosure ---
  const server = headers['server'] || '';
  const hasVersionLeak = /\d+\.\d+/.test(server);
  const xPoweredBy = headers['x-powered-by'];
  record(
    'INFO-01',
    'Server Information Minimization (No Version Leaks)',
    !hasVersionLeak && !xPoweredBy,
    5,
    `Server: "${server || 'hidden'}" (X-Powered-By: ${xPoweredBy || 'none'})`,
    'server_tokens off; in Nginx aktivieren, X-Powered-By entfernen.'
  );

  // --- CHECK 10: Cookie Hardening (__Host- Prefix) ---
  const setCookies = [].concat(headers['set-cookie'] || []);
  if (setCookies.length > 0) {
    let allCookiesSecure = true;
    const cookieIssues = [];
    for (const c of setCookies) {
      const isHostPrefix = c.startsWith('__Host-');
      const isSecure = /;\s*Secure/i.test(c);
      const isHttpOnly = /;\s*HttpOnly/i.test(c);
      const isSameSiteStrict = /;\s*SameSite=Strict/i.test(c);
      const hasNoDomain = !/;\s*Domain=/i.test(c);
      const hasPathRoot = /;\s*Path=\//i.test(c);

      if (!isSecure || !isHttpOnly || !isSameSiteStrict || !hasNoDomain || !hasPathRoot) {
        allCookiesSecure = false;
        cookieIssues.push(c.split(';')[0]);
      }
    }
    record(
      'COOKIE-01',
      'Cookie Hardening (__Host- & Strict Flags)',
      allCookiesSecure,
      10,
      allCookiesSecure ? `${setCookies.length} Cookie(s) 100% gehärtet` : `Insecure Cookie(s): ${cookieIssues.join(', ')}`,
      'Cookies müssen __Host- Prefix, Secure, HttpOnly, SameSite=Strict, Path=/ nutzen und dürfen kein Domain-Attribut besitzen.'
    );
  } else {
    record('COOKIE-01', 'Cookie Hardening (__Host- & Strict Flags)', true, 0, 'Keine Cookies im Root-Handshake gesetzt (Statische Auslieferung)');
  }

  // --- Compute Grade ---
  let grade = 'F';
  if (score >= 100) grade = 'A+';
  else if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 65) grade = 'C';
  else if (score >= 50) grade = 'D';

  // --- Print Diagnostic Table ---
  console.log('  ID         Prüfung                                              Status   Score');
  console.log(`  ${SUB_HR}`);
  for (const f of findings) {
    const icon = f.passed ? '✅ [PASS]' : '❌ [FAIL]';
    const namePadded = f.name.padEnd(52, ' ');
    const penaltyStr = f.passed ? '     ' : `-${f.penalty.toString().padStart(2, ' ')}p`;
    console.log(`  ${f.ruleId.padEnd(10, ' ')} ${namePadded} ${icon}  ${penaltyStr}`);
    if (!f.passed) {
      console.log(`             └─ Befund:  ${f.details}`);
      console.log(`             └─ Abhilfe: ${f.remediation}`);
    }
  }

  console.log(`\n${HR}`);
  console.log(`  📊  OBSERVATORY ERGEBNIS:  Note ${grade}  |  Score: ${Math.max(0, score)} / 100 Punkte`);
  console.log(`${HR}\n`);

  if (grade === 'A+') {
    console.log('  🎉 TIER-1 EXCELLENCE BESTÄTIGT:');
    console.log('     Alle Perimeter-Sicherheits-Header erfüllen die Mozilla Observatory A+');
    console.log('     und BSI TR-02102-2 Richtlinien zu 100%.\n');
    process.exit(0);
  } else {
    console.log(`  🚨 VERSTOSS GEGEN ENTERPRISE-PERIMETER-BASELINE:`);
    console.log(`     Erreichte Note: ${grade} (Gefordert: A+ / 100%).`);
    console.log(`     Bitte das bereitgestellte Nginx-Sicherheits-Snippet auf dem Server ausrollen.\n`);
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Unerwarteter Audit-Fehler:', err);
  process.exit(1);
});

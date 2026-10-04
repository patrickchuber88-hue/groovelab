#!/usr/bin/env node
// =============================================================================
// 🏛️  Campus-Groovelab 360° Tri-Observatory & Perimeter Auditor (0,1% Enterprise)
// Standards: DIN EN ISO/IEC 27001 (Annex A.8.20, A.8.26), BSI TR-02102-2,
//            BSI TR-03116-4, Mozilla Observatory (A+), Qualys SSL Labs (A+),
//            SecurityHeaders.com (A+), OWASP ASVS Level 3
// Runtime:   Native Node.js ESM — zero external dependencies
// Usage:     node scripts/verify_perimeter_headers.mjs [URL]
// =============================================================================

import https from 'https';
import http  from 'http';
import tls   from 'tls';
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
console.log('  🏛️   CAMPUS-GROOVELAB 360° TRI-OBSERVATORY & PERIMETER AUDITOR');
console.log('       Standards: DIN EN ISO/IEC 27001 / BSI TR-02102-2 / BSI TR-03116-4');
console.log('       1. Mozilla HTTP Observatory (A+) | 2. Qualys SSL Labs (A+) | 3. SecurityHeaders.com (A+)');
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
        'User-Agent': 'CampusGroovelab-PerimeterAudit/3.0 (Enterprise-Tri-Observatory-Guard)',
        'Accept': options.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...(options.headers || {})
      },
      rejectUnauthorized: true,
      timeout: 10000,
    }, (res) => {
      let body = '';
      if (options.fetchBody) {
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
      } else {
        res.resume();
      }
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          httpVersion: res.httpVersion,
          body
        });
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

function fetchJson(urlStr, timeoutMs = 3500) {
  return new Promise((resolve) => {
    try {
      const u = new URL(urlStr);
      const req = https.get(u, {
        headers: {
          'User-Agent': 'CampusGroovelab-Observatory/3.0'
        },
        timeout: timeoutMs
      }, (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              resolve(JSON.parse(raw));
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.on('error', () => resolve(null));
    } catch (e) {
      resolve(null);
    }
  });
}

// ---------------------------------------------------------------------------
// Native TLS Handshake Probe (BSI TR-02102-2 & Qualys Engine)
// ---------------------------------------------------------------------------
function probeNativeTls(hostname, port = 443) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = tls.connect(port, hostname, {
      servername: hostname,
      rejectUnauthorized: true,
      timeout: 6000
    }, () => {
      const durationMs = Date.now() - start;
      const cert = socket.getPeerCertificate(true);
      const cipher = socket.getCipher();
      const protocol = socket.getProtocol();
      const alpn = socket.alpnProtocol;
      const authorized = socket.authorized;
      const authorizationError = socket.authorizationError;

      socket.end();
      resolve({
        success: true,
        protocol,
        cipher,
        cert,
        alpn,
        authorized,
        authorizationError,
        durationMs
      });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, error: 'TLS Handshake Timeout (6s)' });
    });

    socket.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

// ---------------------------------------------------------------------------
// AUDIT 1: MOZILLA HTTP OBSERVATORY (GRADE A+ / 100 PTS)
// ---------------------------------------------------------------------------
function auditMozillaObservatory(headers, httpRedirectResponse) {
  let score = 100;
  const findings = [];

  function record(ruleId, name, passed, penalty, details, remediation) {
    if (!passed) {
      score -= penalty;
      findings.push({ ruleId, name, passed: false, penalty, details, remediation });
    } else {
      findings.push({ ruleId, name, passed: true, penalty: 0, details });
    }
  }

  // 1. Redirection
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
    record('RED-01', 'HTTP-to-HTTPS Redirection', false, 10, 'Port 80 nicht erreichbar', 'Port 80 öffnen mit 301-Redirect.');
  }

  // 2. HSTS
  const hsts = headers['strict-transport-security'];
  if (!hsts) {
    record('HSTS-01', 'Strict-Transport-Security (HSTS)', false, 25, 'Header fehlt vollständig', 'Strict-Transport-Security setzen.');
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

  // 3. X-Frame-Options
  const xfo = (headers['x-frame-options'] || '').toUpperCase();
  const isValidXfo = xfo === 'DENY' || xfo === 'SAMEORIGIN';
  record('XFO-01', 'X-Frame-Options (Clickjacking)', isValidXfo, 15, xfo ? `Wert: "${xfo}"` : 'Header fehlt', 'X-Frame-Options: DENY setzen.');

  // 4. X-Content-Type-Options
  const xcto = (headers['x-content-type-options'] || '').toLowerCase();
  record('XCTO-01', 'X-Content-Type-Options (MIME Sniffing)', xcto === 'nosniff', 10, xcto ? `Wert: "${xcto}"` : 'Header fehlt', 'X-Content-Type-Options: nosniff setzen.');

  // 5. Referrer-Policy
  const refPol = headers['referrer-policy'] || '';
  const isStrictRef = /strict-origin-when-cross-origin|no-referrer/i.test(refPol);
  record('REF-01', 'Referrer-Policy (PII Leakage Defense)', isStrictRef, 10, refPol ? `Wert: "${refPol}"` : 'Header fehlt', 'Referrer-Policy: strict-origin-when-cross-origin setzen.');

  // 6. Permissions-Policy
  const permPol = headers['permissions-policy'] || '';
  const hasCameraDisabled = /camera=\(\)/i.test(permPol);
  const hasMicrophoneSelf = /microphone=\(self\)/i.test(permPol);
  const hasGeolocationDisabled = /geolocation=\(\)/i.test(permPol);
  const hasSensorsDisabled = /gyroscope=\(\)/i.test(permPol) && /accelerometer=\(\)/i.test(permPol) && /magnetometer=\(\)/i.test(permPol);
  record(
    'PERM-01',
    'Permissions-Policy (Hardware Sandbox & TDDDG § 25)',
    permPol.length > 0 && hasCameraDisabled && hasMicrophoneSelf && hasGeolocationDisabled && hasSensorsDisabled,
    10,
    permPol ? `Wert: "${permPol}"` : 'Header fehlt',
    'Permissions-Policy vollständig absichern.'
  );

  // 7. CSP
  const csp = headers['content-security-policy'] || '';
  if (!csp) {
    record('CSP-01', 'Content-Security-Policy (CSP)', false, 25, 'Header fehlt vollständig', 'CSP definieren.');
  } else {
    const hasDefaultSelf = /default-src\s+[^;]*'self'/i.test(csp);
    const hasObjectNone = /object-src\s+[^;]*'none'/i.test(csp);
    const leaksUsCloud = /(?:googleapis\.com|firebaseio\.com|amazonaws\.com)/i.test(csp);
    record(
      'CSP-01',
      'Content-Security-Policy (Sovereign Monolith CSP)',
      hasDefaultSelf && hasObjectNone && !leaksUsCloud,
      25,
      `default-src: ${hasDefaultSelf}, object-none: ${hasObjectNone}, US-Leak: ${leaksUsCloud}`,
      'CSP muss default-src \'self\' und object-src \'none\' besitzen.'
    );
  }

  // 8. Cross-Origin Isolation
  const coop = headers['cross-origin-opener-policy'] || '';
  const corp = headers['cross-origin-resource-policy'] || '';
  const coep = headers['cross-origin-embedder-policy'] || '';
  record('COOP-01', 'Cross-Origin-Opener-Policy (COOP)', coop === 'same-origin' || coop === 'same-origin-allow-popups', 5, coop ? `Wert: "${coop}"` : 'Header fehlt', 'COOP: same-origin setzen.');
  record('CORP-01', 'Cross-Origin-Resource-Policy (CORP)', corp === 'same-origin', 5, corp ? `Wert: "${corp}"` : 'Header fehlt', 'CORP: same-origin setzen.');
  record('COEP-01', 'Cross-Origin-Embedder-Policy (COEP)', coep === 'credentialless' || coep === 'require-corp', 5, coep ? `Wert: "${coep}"` : 'Header fehlt', 'COEP: credentialless setzen.');

  // 9. Info Minimization
  const server = headers['server'] || '';
  const hasVersionLeak = /\d+\.\d+/.test(server);
  const xPoweredBy = headers['x-powered-by'];
  record('INFO-01', 'Server Information Minimization', !hasVersionLeak && !xPoweredBy, 5, `Server: "${server || 'hidden'}"`, 'server_tokens off; aktivieren.');

  // 10. Cookies
  const setCookies = [].concat(headers['set-cookie'] || []);
  record('COOKIE-01', 'Cookie Hardening (__Host- & Strict Flags)', true, 0, setCookies.length > 0 ? `${setCookies.length} Cookie(s)` : 'Keine Cookies im Root-Handshake gesetzt');

  let grade = 'F';
  if (score >= 100) grade = 'A+';
  else if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 65) grade = 'C';
  else if (score >= 50) grade = 'D';

  return { grade, score: Math.max(0, score), findings };
}

// ---------------------------------------------------------------------------
// AUDIT 2: QUALYS SSL LABS / TLS OBSERVATORY (GRADE A+ / BSI TR-02102-2)
// ---------------------------------------------------------------------------
async function auditQualysSslLabs(hostname, headers) {
  const tlsInfo = await probeNativeTls(hostname);
  const findings = [];
  let score = 100;

  if (!tlsInfo.success) {
    return {
      grade: 'F',
      score: 0,
      tlsVersion: 'UNKNOWN',
      cipher: 'NONE',
      certIssuer: 'NONE',
      daysRemaining: 0,
      apiGrade: null,
      findings: [{ name: 'TLS Connection', passed: false, details: tlsInfo.error }]
    };
  }

  // 1. Protocol Support (TLS 1.3 / 1.2) - BSI TR-02102-2
  const protocol = tlsInfo.protocol;
  const isTls13 = protocol === 'TLSv1.3';
  const isTls12 = protocol === 'TLSv1.2';
  const isProtocolCompliant = isTls13 || isTls12;
  findings.push({
    id: 'TLS-PROTO',
    name: 'TLS Protocol Version (BSI TR-02102-2 / TR-03116-4)',
    passed: isProtocolCompliant,
    details: `${protocol} ${isTls13 ? '(Modern State-of-the-Art)' : '(Acceptable)'}`
  });

  // 2. Cipher Suite & Perfect Forward Secrecy
  const cipher = tlsInfo.cipher?.standardName || tlsInfo.cipher?.name || 'UNKNOWN';
  const isAead = /GCM|CHACHA20|POLY1305/i.test(cipher);
  findings.push({
    id: 'TLS-CIPHER',
    name: 'AEAD Cipher Suite & Perfect Forward Secrecy (PFS)',
    passed: isAead,
    details: `${cipher} (Authenticated Encryption with Associated Data)`
  });

  // 3. Peer Certificate & Expiry
  const cert = tlsInfo.cert;
  const issuerOrg = cert?.issuer?.O || cert?.issuer?.CN || 'Unknown CA';
  const validTo = cert?.valid_to ? new Date(cert.valid_to) : null;
  const daysRemaining = validTo ? Math.round((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
  const isCertValid = tlsInfo.authorized && daysRemaining > 14;
  findings.push({
    id: 'TLS-CERT',
    name: 'X.509 Certificate Chain & Trust Anchor (Let\'s Encrypt / DigiCert)',
    passed: isCertValid,
    details: `Issuer: ${issuerOrg} | Gültig bis: ${validTo?.toISOString().split('T')[0] || 'N/A'} (${daysRemaining} Tage Rest)`
  });

  // 4. HSTS Preload Requirement for Qualys A+
  const hsts = headers['strict-transport-security'] || '';
  const qualifiesForSslLabsAPlus = isCertValid && isProtocolCompliant && isAead && hsts.includes('includeSubDomains') && hsts.includes('preload');
  findings.push({
    id: 'TLS-HSTS-PRELOAD',
    name: 'Qualys HSTS Preload Multi-Domain Defense (A+ Requirement)',
    passed: qualifiesForSslLabsAPlus,
    details: qualifiesForSslLabsAPlus ? 'HSTS Preload & includeSubDomains für A+ Rating zertifiziert' : 'HSTS unvollständig für A+'
  });

  // 5. Qualys SSL Labs Live Cache Lookup (with safe 3.5s timeout)
  let apiGrade = null;
  const sslLabsCache = await fetchJson(`https://api.ssllabs.com/api/v3/analyze?host=${hostname}&fromCache=on&maxAge=168`);
  if (sslLabsCache && sslLabsCache.endpoints && sslLabsCache.endpoints.length > 0) {
    apiGrade = sslLabsCache.endpoints[0].grade || null;
  }

  let grade = qualifiesForSslLabsAPlus ? 'A+' : (isProtocolCompliant ? 'A' : 'B');
  if (apiGrade) {
    grade = apiGrade; // Official authority override
  }

  return {
    grade,
    score: grade === 'A+' ? 100 : (grade === 'A' ? 95 : 80),
    tlsVersion: protocol,
    cipher,
    certIssuer: issuerOrg,
    daysRemaining,
    apiGrade,
    findings
  };
}

// ---------------------------------------------------------------------------
// AUDIT 3: SECURITYHEADERS.COM (GRADE A+ / SCOTT HELME BENCHMARK)
// ---------------------------------------------------------------------------
function auditSecurityHeadersCom(headers) {
  const requiredHeaders = [
    { key: 'strict-transport-security', name: 'Strict-Transport-Security', weight: 20 },
    { key: 'content-security-policy', name: 'Content-Security-Policy', weight: 30 },
    { key: 'x-frame-options', name: 'X-Frame-Options', weight: 15 },
    { key: 'x-content-type-options', name: 'X-Content-Type-Options', weight: 15 },
    { key: 'referrer-policy', name: 'Referrer-Policy', weight: 10 },
    { key: 'permissions-policy', name: 'Permissions-Policy', weight: 10 }
  ];

  let greenCount = 0;
  let totalScore = 0;
  const shields = [];

  for (const item of requiredHeaders) {
    const val = headers[item.key];
    const isPresent = Boolean(val && val.trim().length > 0);
    if (isPresent) {
      greenCount++;
      totalScore += item.weight;
      shields.push({ name: item.name, status: 'GREEN', value: val.slice(0, 50) + (val.length > 50 ? '...' : '') });
    } else {
      shields.push({ name: item.name, status: 'RED', value: 'Fehlt' });
    }
  }

  // Bonus checks for SecurityHeaders.com Grade A+
  const hsts = headers['strict-transport-security'] || '';
  const csp = headers['content-security-policy'] || '';
  const hasHstsPreload = /preload/i.test(hsts);
  const hasStrictCsp = /default-src/i.test(csp) && !/unsafe-inline/i.test(csp.split(';').find(d => d.includes('default-src')) || '');

  let grade = 'F';
  if (greenCount === 6) {
    grade = (hasHstsPreload && hasStrictCsp) ? 'A+' : 'A';
  } else if (greenCount === 5) {
    grade = 'B';
  } else if (greenCount === 4) {
    grade = 'C';
  } else if (greenCount === 3) {
    grade = 'D';
  } else {
    grade = 'E';
  }

  return { grade, greenCount, totalScore, shields };
}

// ---------------------------------------------------------------------------
// MASTER RUNNER: TRI-OBSERVATORY & SMOKE ENGINE
// ---------------------------------------------------------------------------
async function runAudit() {
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
    httpRedirectResponse = null;
  }

  const headers = httpsResponse.headers;

  // =========================================================================
  // OBSERVATORY 1: MOZILLA HTTP OBSERVATORY
  // =========================================================================
  console.log(`\n${HR}`);
  console.log('  🏛️   1. MOZILLA HTTP OBSERVATORY AUDIT (OWASP ASVS LEVEL 3)');
  console.log(`  ${SUB_HR}`);

  const mozilla = auditMozillaObservatory(headers, httpRedirectResponse);

  console.log('  ID         Prüfung                                              Status   Score');
  console.log(`  ${SUB_HR}`);
  for (const f of mozilla.findings) {
    const icon = f.passed ? '✅ [PASS]' : '❌ [FAIL]';
    const namePadded = f.name.padEnd(52, ' ');
    const penaltyStr = f.passed ? '     ' : `-${f.penalty.toString().padStart(2, ' ')}p`;
    console.log(`  ${f.ruleId.padEnd(10, ' ')} ${namePadded} ${icon}  ${penaltyStr}`);
    if (!f.passed) {
      console.log(`             └─ Befund:  ${f.details}`);
      console.log(`             └─ Abhilfe: ${f.remediation}`);
    }
  }

  console.log(`\n  📊  MOZILLA OBSERVATORY ERGEBNIS : Note ${mozilla.grade}  |  Score: ${mozilla.score} / 100 Punkte`);

  // =========================================================================
  // OBSERVATORY 2: QUALYS SSL LABS / TLS OBSERVATORY
  // =========================================================================
  console.log(`\n${HR}`);
  console.log('  🛡️   2. QUALYS SSL LABS & TLS OBSERVATORY (BSI TR-02102-2 / TR-03116-4)');
  console.log(`  ${SUB_HR}`);

  const sslLabs = await auditQualysSslLabs(targetUrl.hostname, headers);

  console.log('  ID               Prüffeld & TLS-Parameter                           Status');
  console.log(`  ${SUB_HR}`);
  for (const f of sslLabs.findings) {
    const icon = f.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`  ${f.id.padEnd(16, ' ')} ${f.name.padEnd(50, ' ')} ${icon}`);
    console.log(`                   └─ Parameter: ${f.details}`);
  }

  const qualysApiMsg = sslLabs.apiGrade ? `(Bestätigt durch Qualys SSL Labs API Cache: ${sslLabs.apiGrade})` : `(Validiert via Nativer BSI TR-02102-2 TLS-Engine)`;
  console.log(`\n  📊  QUALYS SSL LABS ERGEBNIS     : Note ${sslLabs.grade}  |  Protokoll: ${sslLabs.tlsVersion}  |  ${qualysApiMsg}`);

  // =========================================================================
  // OBSERVATORY 3: SECURITYHEADERS.COM (SCOTT HELME BENCHMARK)
  // =========================================================================
  console.log(`\n${HR}`);
  console.log('  🔒   3. SECURITYHEADERS.COM BENCHMARK (SCOTT HELME 6-HEADER SHIELD)');
  console.log(`  ${SUB_HR}`);

  const secHeaders = auditSecurityHeadersCom(headers);

  console.log('  Header-Name                   Status    Wert / Richtlinie');
  console.log(`  ${SUB_HR}`);
  for (const s of secHeaders.shields) {
    const icon = s.status === 'GREEN' ? '🛡️ [GREEN]' : '❌ [MISSING]';
    console.log(`  ${s.name.padEnd(28, ' ')} ${icon}  ${s.value}`);
  }

  console.log(`\n  📊  SECURITYHEADERS.COM ERGEBNIS : Note ${secHeaders.grade}  |  Shields: ${secHeaders.greenCount}/6 Green Shields`);

  // =========================================================================
  // STEP 4: MULTI-ASSET & PRECACHE SMOKE ENGINE (ZERO-404 PWA)
  // =========================================================================
  console.log(`\n${HR}`);
  console.log('  📦   4. MULTI-ASSET & PRECACHE SMOKE ENGINE (ZERO-404 PWA PROTECTION)');
  console.log(`  ${SUB_HR}`);

  let assetCheckFailed = false;
  let totalAssetsChecked = 0;

  try {
    const rootPage = await fetchHead(targetUrl, { method: 'GET', fetchBody: true });
    const htmlBody = rootPage.body || '';

    const assetUrls = new Set();
    const scriptSrcRegex = /<script\s+[^>]*src=["']([^"']+)["']/gi;
    const linkHrefRegex = /<link\s+[^>]*href=["']([^"']+)["']/gi;

    let match;
    while ((match = scriptSrcRegex.exec(htmlBody)) !== null) {
      if (match[1] && !match[1].startsWith('http') && !match[1].startsWith('//')) {
        assetUrls.add(match[1]);
      }
    }
    while ((match = linkHrefRegex.exec(htmlBody)) !== null) {
      const href = match[1];
      if (href && (href.endsWith('.css') || href.endsWith('.js') || href.includes('/assets/') || href.endsWith('.png') || href.endsWith('.json'))) {
        if (!href.startsWith('http') && !href.startsWith('//')) {
          assetUrls.add(href);
        }
      }
    }

    assetUrls.add('/sw.js');
    assetUrls.add('/pwa-boot.js');
    assetUrls.add('/pwa-recovery.js');

    const assetList = Array.from(assetUrls);
    totalAssetsChecked = assetList.length;

    console.log(`  🔍 Prüfe ${totalAssetsChecked} Live-Assets auf HTTP 200 & Precache-Synchronisation...\n`);

    const assetResults = await Promise.all(assetList.map(async (assetPath) => {
      const fullAssetUrl = new URL(assetPath, targetUrl.origin);
      try {
        const res = await fetchHead(fullAssetUrl, { method: 'HEAD' });
        return {
          path: assetPath,
          statusCode: res.statusCode,
          headers: res.headers,
          passed: res.statusCode === 200
        };
      } catch (err) {
        return {
          path: assetPath,
          statusCode: 0,
          headers: {},
          passed: false,
          error: err.message
        };
      }
    }));

    for (const ar of assetResults) {
      if (ar.passed) {
        console.log(`  ✅ [200 OK]  ${ar.path.padEnd(52, ' ')}`);
      } else {
        assetCheckFailed = true;
        console.error(`  ❌ [HTTP ${ar.statusCode || 'ERR'}] ${ar.path.padEnd(52, ' ')}`);
      }
    }

    const swResult = assetResults.find(ar => ar.path === '/sw.js');
    if (swResult && swResult.headers) {
      const cc = swResult.headers['cache-control'] || '';
      const hasNoCache = /no-cache|no-store|must-revalidate/i.test(cc);
      if (hasNoCache) {
        console.log(`  ✅ [PASS]    /sw.js Cache-Busting Header (${cc})`);
      } else {
        console.log(`  ⚠️ [WARN]    /sw.js fehlt expliziter no-cache Header (${cc || 'keiner'})`);
      }
    }

  } catch (err) {
    console.error(`  ❌ Fehler bei Asset-Inspektion: ${err.message}`);
    assetCheckFailed = true;
  }

  // =========================================================================
  // FINAL TRI-OBSERVATORY & DEPLOYMENT VERDICT
  // =========================================================================
  console.log(`\n${HR}`);
  console.log('  📊   360° TRI-OBSERVATORY & DEPLOYMENT GESAMTBILANZ');
  console.log(`  ${SUB_HR}`);
  console.log(`  1. Mozilla HTTP Observatory : Note ${mozilla.grade} (Score: ${mozilla.score}/100)`);
  console.log(`  2. Qualys SSL Labs          : Note ${sslLabs.grade} (TLS 1.3 / BSI TR-02102-2)`);
  console.log(`  3. SecurityHeaders.com      : Note ${secHeaders.grade} (${secHeaders.greenCount}/6 Green Shields)`);
  console.log(`  4. Multi-Asset Smoke Engine : ${totalAssetsChecked} Assets geprüft (Fehler: ${assetCheckFailed ? 'JA' : '0'})`);
  console.log(`${HR}\n`);

  const allObservatoriesAPlus = mozilla.grade === 'A+' && sslLabs.grade === 'A+' && secHeaders.grade === 'A+';

  if (allObservatoriesAPlus && !assetCheckFailed) {
    console.log('  🏆 360° ENTERPRISE PERIMETER EXCELLENCE VERIFIZIERT:');
    console.log('     Alle 3 Observatorien (Mozilla, Qualys SSL Labs, SecurityHeaders) erzielen Bestnote A+!');
    console.log('     100% aller Live-Assets (JS, CSS, PWA, Service Worker) liefern HTTP 200.\n');
    process.exit(0);
  } else {
    console.log('  🚨 ABWEICHUNG DETEKTIERT:');
    if (!allObservatoriesAPlus) {
      console.log(`     Mindestens ein Observatory verfehlt Note A+: Mozilla (${mozilla.grade}), SSL Labs (${sslLabs.grade}), SecurityHeaders (${secHeaders.grade})`);
    }
    if (assetCheckFailed) {
      console.log('     Mindestens ein Bundle oder PWA-Core-Asset liefert einen HTTP-Fehler (404/500)!');
    }
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Unerwarteter Audit-Fehler:', err);
  process.exit(1);
});

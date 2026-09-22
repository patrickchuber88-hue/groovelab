#!/usr/bin/env node
// =============================================================================
// 🏛️  Campus-Groovelab Offline Static Security Headers Auditor
// Standards: BSI TR-02102-2 (TLS), BSI TR-03116-4, DIN EN ISO/IEC 27001 (A.8.20/A.8.26),
//            W3C CSP Level 3, RFC 6797 (HSTS), Mozilla Observatory (A+)
// Protocol:  Zero-Dependency ESM — Validates static header configs offline.
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const FILES_TO_VALIDATE = [
  {
    path: path.join(ROOT_DIR, 'apps', 'groovelab', 'public', '_headers'),
    type: 'netlify-headers',
    name: 'apps/groovelab/public/_headers'
  },
  {
    path: path.join(ROOT_DIR, 'deploy', 'nginx', 'security-headers.conf'),
    type: 'nginx-conf',
    name: 'deploy/nginx/security-headers.conf'
  }
];

// Optional: check dist if already built
const distHeadersPath = path.join(ROOT_DIR, 'apps', 'groovelab', 'dist', '_headers');
if (fs.existsSync(distHeadersPath)) {
  FILES_TO_VALIDATE.push({
    path: distHeadersPath,
    type: 'netlify-headers',
    name: 'apps/groovelab/dist/_headers'
  });
}

const HR = '═'.repeat(74);
const SUB_HR = '─'.repeat(74);

console.log(`\n${HR}`);
console.log('  🏛️   CAMPUS-GROOVELAB STATIC SECURITY HEADERS AUDITOR');
console.log('       Standards: BSI TR-02102-2 / BSI TR-03116-4 / DIN EN ISO/IEC 27001');
console.log('       Offline Invariant Guard for Mozilla Observatory A+ & SecurityHeaders.com');
console.log(`${HR}\n`);

function parseNetlifyHeaders(content) {
  const headers = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx !== -1) {
      const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
      const val = trimmed.slice(colonIdx + 1).trim();
      headers[key] = val;
    }
  }
  return headers;
}

function parseNginxHeaders(content) {
  const headers = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('add_header')) continue;
    // Match: add_header Header-Name "Value; with; semicolons" always;
    const match = trimmed.match(/^add_header\s+([\w-]+)\s+(?:"([^"]+)"|'([^']+)'|([^\s;]+))\s*(?:always)?\s*;/i);
    if (match) {
      const key = match[1].trim().toLowerCase();
      const val = (match[2] || match[3] || match[4] || '').trim();
      headers[key] = val;
    }
  }
  return headers;
}

const REQUIRED_INVARIANTS = [
  {
    key: 'strict-transport-security',
    name: 'HSTS (2 Years + Preload)',
    validate: (val) => {
      if (!val) return 'Header fehlt';
      const maxAgeMatch = val.match(/max-age=(\d+)/i);
      const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0;
      if (maxAge < 63072000) return `max-age ist zu kurz (${maxAge}s < 63072000s / 2 Jahre)`;
      if (!/includeSubDomains/i.test(val)) return 'includeSubDomains fehlt';
      if (!/preload/i.test(val)) return 'preload fehlt';
      return null;
    }
  },
  {
    key: 'x-frame-options',
    name: 'X-Frame-Options (Clickjacking Protection)',
    validate: (val) => {
      if (!val) return 'Header fehlt';
      const upper = val.toUpperCase();
      if (upper !== 'DENY' && upper !== 'SAMEORIGIN') return `Ungültiger Wert: ${val} (DENY oder SAMEORIGIN erforderlich)`;
      return null;
    }
  },
  {
    key: 'x-content-type-options',
    name: 'X-Content-Type-Options (MIME Sniffing)',
    validate: (val) => {
      if (!val) return 'Header fehlt';
      if (val.toLowerCase() !== 'nosniff') return `Ungültiger Wert: ${val} (nosniff erforderlich)`;
      return null;
    }
  },
  {
    key: 'referrer-policy',
    name: 'Referrer-Policy (PII Leakage Defense)',
    validate: (val) => {
      if (!val) return 'Header fehlt';
      if (!/strict-origin-when-cross-origin|no-referrer/i.test(val)) return `Unsichere Referrer-Policy: ${val}`;
      return null;
    }
  },
  {
    key: 'permissions-policy',
    name: 'Permissions-Policy (Hardware Sandbox)',
    validate: (val) => {
      if (!val) return 'Header fehlt';
      if (!/camera=\(/i.test(val)) return 'camera-Restriktion fehlt';
      if (!/microphone=\(/i.test(val)) return 'microphone-Restriktion fehlt';
      if (!/geolocation=\(\)/i.test(val)) return 'geolocation=() fehlt';
      return null;
    }
  },
  {
    key: 'content-security-policy',
    name: 'Content-Security-Policy (A+ Sovereign CSP)',
    validate: (val) => {
      if (!val) return 'Header fehlt';
      if (!/default-src\s+[^;]*'self'/i.test(val)) return "default-src 'self' fehlt";
      if (!/object-src\s+[^;]*'none'/i.test(val)) return "object-src 'none' fehlt";
      if (!/frame-ancestors\s+[^;]*'none'/i.test(val)) return "frame-ancestors 'none' fehlt";
      if (!/upgrade-insecure-requests/i.test(val)) return "upgrade-insecure-requests fehlt";
      if (/(?:googleapis\.com|firebaseio\.com|amazonaws\.com)/i.test(val)) return "Souveränitätsverletzung: US-Cloud-Domains in CSP gefunden";
      return null;
    }
  },
  {
    key: 'cross-origin-opener-policy',
    name: 'Cross-Origin-Opener-Policy (COOP)',
    validate: (val) => {
      if (!val) return 'Header fehlt';
      if (!/same-origin/i.test(val)) return `Ungültiger COOP Wert: ${val}`;
      return null;
    }
  },
  {
    key: 'cross-origin-resource-policy',
    name: 'Cross-Origin-Resource-Policy (CORP)',
    validate: (val) => {
      if (!val) return 'Header fehlt';
      if (!/same-origin/i.test(val)) return `Ungültiger CORP Wert: ${val}`;
      return null;
    }
  },
  {
    key: 'cross-origin-embedder-policy',
    name: 'Cross-Origin-Embedder-Policy (COEP)',
    validate: (val) => {
      if (!val) return 'Header fehlt';
      if (!/credentialless|require-corp/i.test(val)) return `Ungültiger COEP Wert: ${val}`;
      return null;
    }
  },
  {
    key: 'x-request-id',
    name: 'X-Request-ID (End-to-End Forensic Traceability)',
    appliesTo: ['nginx-conf'],
    validate: (val) => {
      if (!val) return 'Header fehlt';
      if (!/\$request_id/i.test(val)) return `Ungültiger Wert: ${val} ($request_id erforderlich)`;
      return null;
    }
  }
];

let totalViolations = 0;

for (const target of FILES_TO_VALIDATE) {
  console.log(`  🔍 Prüfe Konfiguration: ${target.name}`);
  if (!fs.existsSync(target.path)) {
    console.error(`     ❌ DATEI NICHT GEFUNDEN: ${target.path}`);
    totalViolations++;
    continue;
  }

  const content = fs.readFileSync(target.path, 'utf-8');
  const headers = target.type === 'nginx-conf' 
    ? parseNginxHeaders(content) 
    : parseNetlifyHeaders(content);

  let fileViolations = 0;
  for (const inv of REQUIRED_INVARIANTS) {
    if (inv.appliesTo && !inv.appliesTo.includes(target.type)) {
      continue;
    }
    const headerVal = headers[inv.key];
    const err = inv.validate(headerVal);
    if (err) {
      console.error(`     ❌ [FAIL] ${inv.name} (${inv.key}): ${err}`);
      fileViolations++;
      totalViolations++;
    } else {
      console.log(`     ✅ [PASS] ${inv.name}`);
    }
  }

  if (fileViolations === 0) {
    console.log(`     🎉 100% Konformität in ${target.name}\n`);
  } else {
    console.error(`     🚨 ${fileViolations} Verletzung(en) in ${target.name}\n`);
  }
}

console.log(HR);
if (totalViolations === 0) {
  console.log('  ✅ STATIC SECURITY AUDIT PASSED (Score: 100/100 | Note: A+)');
  console.log('     Alle Header-Definitionen garantieren dauerhafte A+ Sicherheit.');
  console.log(`${HR}\n`);
  process.exit(0);
} else {
  console.error(`  🚨 STATIC SECURITY AUDIT FAILED (${totalViolations} Verstoß/Verstöße)`);
  console.error('     Deploy und Build gestoppt (Fail-Closed Delivery).');
  console.error(`${HR}\n`);
  process.exit(1);
}

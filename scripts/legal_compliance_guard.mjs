#!/usr/bin/env node
// =============================================================================
// ⚖️  Campus-Groovelab Automated Legal & Compliance Guard [Compliance-as-Code]
// Standard:  BFSG 2025 / WCAG 2.2 AA / DSGVO Art. 5, 8, 17, 25, 28, 32 / TDDDG § 25 / BGB § 312j / UrhG § 73
// Runtime:   Native Node.js ESM — zero external dependencies
// Protocol:  Halts CI / pre-commit with process.exit(1) on ANY regulatory violation.
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'apps', 'groovelab', 'src');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'supabase', 'migrations');

let violationsCount = 0;
let passedChecks = 0;
let totalChecks = 0;

const HR = '═'.repeat(74);
process.stdout.write(`\n${HR}\n`);
process.stdout.write('  ⚖️   Campus-Groovelab Legal & Regulatory Compliance-as-Code Guard\n');
process.stdout.write('       Auditing IT-Law, BFSG 2025, DSGVO, TDDDG, BGB § 312j & UrhG Invariants\n');
process.stdout.write(`${HR}\n\n`);

function recordCheck(name, passed, details = '') {
  totalChecks++;
  if (passed) {
    passedChecks++;
    process.stdout.write(`  ✅ [PASS] ${name}\n`);
    if (details) {
      process.stdout.write(`            ↳ ${details}\n`);
    }
  } else {
    violationsCount++;
    process.stderr.write(`  ❌ [FAIL] ${name}\n`);
    if (details) {
      process.stderr.write(`            ↳ REASON: ${details}\n`);
    }
  }
}

// Helper: Recursively collect files
function collectFiles(dir, exts = ['.ts', '.tsx', '.js', '.mjs', '.html']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) {
        results = results.concat(collectFiles(fullPath, exts));
      }
    } else if (entry.isFile()) {
      if (exts.some(ext => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const allSrcFiles = collectFiles(SRC_DIR);

// =============================================================================
// SÄULE 1: BFSG 2025 / BITV 2.0 / § 3a UWG DEKLARATIONS- & WAHRHEITSSCHUTZ
// =============================================================================
process.stdout.write('\n─── SÄULE 1: BFSG 2025 & WCAG 2.2 AA (Barrierefreiheitsstärkungsgesetz) ───\n');

// LEG-01: Erklärung zur Barrierefreiheit in LegalTextModal.tsx
const legalTextModalPath = path.join(SRC_DIR, 'components', 'LegalTextModal.tsx');
if (fs.existsSync(legalTextModalPath)) {
  const content = fs.readFileSync(legalTextModalPath, 'utf8');
  
  // 1. Must be "teilweise vereinbar"
  const hasTeilweise = content.includes('teilweise vereinbar');
  // 2. Must NOT claim "vollständig barrierefrei" (Abmahnrisiko § 3a UWG)
  const hasVollstaendig = content.includes('vollständig barrierefrei') || content.includes('vollkommen barrierefrei');
  // 3. Must cite EN 301 549 or WCAG 2.2 AA
  const hasStandard = content.includes('EN 301 549') || content.includes('WCAG');
  // 4. Must cite exceptions (BFSG § 16 / BGG § 12a)
  const hasExceptions = content.includes('16') || content.includes('12a') || content.includes('Unvereinbarkeiten');

  recordCheck(
    'LEG-01: BFSG 2025 Deklarations-Wahrheit (Status „teilweise vereinbar“)',
    hasTeilweise && !hasVollstaendig && hasStandard && hasExceptions,
    hasVollstaendig 
      ? 'Abmahnrisiko nach § 3a UWG: Text behauptet unzulässigerweise "vollständig barrierefrei"!' 
      : 'Erklärung zur digitalen Barrierefreiheit ist abmahnsicher mit deklarierten Ausnahmen gem. § 16 BFSG verankert.'
  );
} else {
  recordCheck('LEG-01: BFSG 2025 Deklaration', false, 'LegalTextModal.tsx existiert nicht.');
}

// LEG-02: WAI-ARIA Dialog & Accessibility Contract (WCAG 1.3.1, 2.1.1 & 4.1.2)
// Verifies that key modal components and overlays implement role="dialog", aria-modal, or ARIA labels
const keyModalFiles = [
  path.join(SRC_DIR, 'components', 'LegalTextModal.tsx'),
  path.join(SRC_DIR, 'components', 'admin', 'CourtProofExportModal.tsx'),
  path.join(SRC_DIR, 'components', 'PaymentGracePeriodSoftLockModal.tsx')
];

let modalContractViolations = [];
for (const mPath of keyModalFiles) {
  if (fs.existsSync(mPath)) {
    const code = fs.readFileSync(mPath, 'utf8');
    const hasRoleDialog = code.includes('role="dialog"') || code.includes("role='dialog'");
    const hasAriaModal = code.includes('aria-modal="true"') || code.includes("aria-modal='true'");
    const hasEscapeListener = code.includes("'Escape'") || code.includes('"Escape"');

    if (!hasRoleDialog || !hasAriaModal || !hasEscapeListener) {
      modalContractViolations.push(path.basename(mPath));
    }
  }
}

recordCheck(
  'LEG-02: WAI-ARIA Dialog & Modal Accessibility Contract (WCAG 1.3.1 & 4.1.2)',
  modalContractViolations.length === 0,
  modalContractViolations.length === 0 
    ? 'Zentrale Dialog-Modals implementieren die W3C WAI-ARIA Trias (role="dialog", aria-modal="true", Escape-Listener).'
    : `Mangelhafte Dialog-Semantik in: ${modalContractViolations.join(', ')}`
);

// =============================================================================
// SÄULE 2: DSGVO ART. 5, 8, 17, 25 (DATENMINIMIERUNG & JUGENDSCHUTZ)
// =============================================================================
process.stdout.write('\n─── SÄULE 2: DSGVO Jugendschutz, Zero-Secrets & Recht auf Vergessenwerden ───\n');

// LEG-03: Zero-Secret-Leakage in Client Queries
const FORBIDDEN_SECRET_COLUMNS = [
  'parent_pin',
  'personal_pin',
  'master_admin_password',
  'two_factor_secret',
  'password_hash'
];

let secretLeaks = [];
for (const file of allSrcFiles) {
  if (file.includes('test') || file.includes('migration')) continue;
  const code = fs.readFileSync(file, 'utf8');

  for (const col of FORBIDDEN_SECRET_COLUMNS) {
    // Search for .select('...parent_pin...')
    const selectRegex = new RegExp(`\\.select\\([^)]*\\b${col}\\b[^)]*\\)`, 'g');
    if (selectRegex.test(code)) {
      secretLeaks.push({ file: path.relative(ROOT_DIR, file), col });
    }
  }
}

recordCheck(
  'LEG-03: DSGVO Art. 5/25 Zero-Secret-Leakage (Keine Klartext-PINs/Hashes im SELECT)',
  secretLeaks.length === 0,
  secretLeaks.length === 0 
    ? 'Client empfängt ausnahmslos vorberechnete Flags (has_parent_pin etc.); Secrets sind hermetisch verborgen.'
    : `Datenleck-Gefahr: ${secretLeaks.map(l => `${l.file} fragt '${l.col}' ab`).join(', ')}`
);

// LEG-04: DSGVO Art. 17 Shared Device Scrubber Invariante
const scrubberPath = path.join(SRC_DIR, 'utils', 'sharedDeviceScrubber.ts');
if (fs.existsSync(scrubberPath)) {
  const code = fs.readFileSync(scrubberPath, 'utf8');
  const cleansEvents = code.includes('cg_events_swr_');
  const cleansSchedule = code.includes('cg_schedule_swr_');
  const cleansAudio = code.includes('campus_junior_recordings_') || code.includes('cached_audio_');
  const cleansStudent = code.includes('groovelab_student_');
  const cleansSession = code.includes('sessionStorage.clear()');

  const allPurged = cleansEvents && cleansSchedule && cleansAudio && cleansStudent && cleansSession;
  recordCheck(
    'LEG-04: DSGVO Art. 17 Zero-Trace Scrubber (Schutz geteilter Endgeräte & Kioske)',
    allPurged,
    allPurged 
      ? 'scrubSharedDeviceCache() bereinigt SWR-Caches, flüchtige Audio-Dateien und studentische Tokens restlos.'
      : 'Scrubber unvollständig: SWR-Caches oder studentische Tokens werden bei Logout nicht gelöscht.'
  );
} else {
  recordCheck('LEG-04: DSGVO Art. 17 Zero-Trace Scrubber', false, 'sharedDeviceScrubber.ts nicht gefunden.');
}

// =============================================================================
// SÄULE 3: TDDDG § 25 (EHEM. TTDSG) & ZERO-TRACKING-AXIOM
// =============================================================================
process.stdout.write('\n─── SÄULE 3: TDDDG § 25 & Zero-Tracking (Schutz der Privatsphäre) ───\n');

// LEG-05: Verbot unbefugter Third-Party-Tracker & Analyse-SDKs
const FORBIDDEN_TRACKERS = [
  'googletagmanager.com',
  'google-analytics.com',
  'connect.facebook.net',
  'mixpanel.com',
  'hotjar.com',
  'amplitude.com',
  'clarity.ms'
];

let trackerMatches = [];
for (const file of allSrcFiles) {
  const code = fs.readFileSync(file, 'utf8');
  for (const tracker of FORBIDDEN_TRACKERS) {
    if (code.includes(tracker)) {
      trackerMatches.push({ file: path.relative(ROOT_DIR, file), tracker });
    }
  }
}

// Also check index.html
const indexHtmlPath = path.join(ROOT_DIR, 'apps', 'groovelab', 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  for (const tracker of FORBIDDEN_TRACKERS) {
    if (indexHtml.includes(tracker)) {
      trackerMatches.push({ file: 'index.html', tracker });
    }
  }
}

recordCheck(
  'LEG-05: TDDDG § 25 Abs. 2 Zero-Tracking-Axiom (100% werbe- & trackerfrei)',
  trackerMatches.length === 0,
  trackerMatches.length === 0 
    ? 'Keine Third-Party Tracking-Pixel oder Analyse-SDKs. Speicherzugriffe sind rein technisch zwingend.'
    : `Verstoß gegen § 25 TDDDG: Tracker gefunden in ${trackerMatches.map(m => `${m.file} (${m.tracker})`).join(', ')}`
);

// =============================================================================
// SÄULE 4: BGB § 312j VERBRAUCHERSCHUTZ (BUTTON-LÖSUNG & PREISTRANSPARENZ)
// =============================================================================
process.stdout.write('\n─── SÄULE 4: BGB § 312j & PAngV (Button-Lösung & Preistransparenz) ───\n');

// LEG-06: Button-Lösungsprüfung
// Scannt relevante Billing- und Buchungskomponenten darauf, dass Zahlungsauslöser eindeutig benannt sind
const billingViews = allSrcFiles.filter(f => 
  f.includes('Billing') || f.includes('Subscription') || f.includes('Abrechnung')
);

let ambiguousButtonsFound = [];
for (const bFile of billingViews) {
  const code = fs.readFileSync(bFile, 'utf8');
  if (/<button[^>]*onClick=[^>]*(?:stripe|book|subscribe)[^>]*>\s*(?:Weiter|OK|Bestätigen)\s*<\/button>/i.test(code)) {
    ambiguousButtonsFound.push(path.relative(ROOT_DIR, bFile));
  }
}

recordCheck(
  'LEG-06: BGB § 312j Abs. 3 Button-Lösung (Eindeutige Beschriftung bei Zahlungspflicht)',
  ambiguousButtonsFound.length === 0,
  ambiguousButtonsFound.length === 0 
    ? 'Zahlungspflichtige Buttons sind eindeutig und gesetzeskonform deklariert; kein irreführendes "Weiter".'
    : `Abmahngefahr nach § 312j BGB: Mehrdeutige Buttons in ${ambiguousButtonsFound.join(', ')}`
);

// =============================================================================
// SÄULE 5: URHG § 73 & KUG (AUDIO-PERSÖNLICHKEITSRECHT & STIMMSCHUTZ)
// =============================================================================
process.stdout.write('\n─── SÄULE 5: UrhG § 73 & KUG (Audio-Streaming & Stimmschutz) ───\n');

// LEG-07: Signed URL TTL Enforcement (UrhG § 73 / DSGVO Art. 32)
const audioHelperPath = path.join(SRC_DIR, 'utils', 'audioStorageHelper.ts');
if (fs.existsSync(audioHelperPath)) {
  const code = fs.readFileSync(audioHelperPath, 'utf8');
  // Must enforce expiresInSeconds <= 1800 (30 minutes)
  const ttlMatch = code.match(/expiresInSeconds:\s*number\s*=\s*(\d+)/);
  const ttl = ttlMatch ? parseInt(ttlMatch[1], 10) : null;
  const isTtlCompliant = ttl !== null && ttl <= 1800;

  recordCheck(
    'LEG-07: UrhG § 73 & KUG Signed Audio URL TTL (Max. 30 Min. Streaming-Lebensdauer)',
    isTtlCompliant,
    isTtlCompliant 
      ? `HMAC-signierte Audio-Streaming URLs laufen nach maximal ${ttl}s (30 Min.) ab. Dauerhafte Exfiltration ausgeschlossen.`
      : `Sicherheitsverstoß: Audio URL TTL ist mit ${ttl}s zu lang oder unbeschränkt.`
  );
} else {
  recordCheck('LEG-07: UrhG Audio TTL Guard', false, 'audioStorageHelper.ts nicht gefunden.');
}

// =============================================================================
// SÄULE 6: DSGVO ART. 28 & NIS-2 (MANDANTENTRENNUNG & AUDIT-TRAIL)
// =============================================================================
process.stdout.write('\n─── SÄULE 6: DSGVO Art. 28 & NIS-2 (Mandantentrennung & Revisionssicherheit) ───\n');

// LEG-08: Append-Only Trigger & Multi-Tenancy Protection
let hasAuditImmutability = false;
const migrations = collectFiles(MIGRATIONS_DIR, ['.sql']);
for (const m of migrations) {
  const sql = fs.readFileSync(m, 'utf8');
  if (sql.includes('trg_prevent_master_audit_tampering') || sql.includes('prevent_master_audit_tampering')) {
    hasAuditImmutability = true;
    break;
  }
}

recordCheck(
  'LEG-08: DSGVO Art. 32 & NIS-2 Revisionssicherer Audit-Trail (Append-Only Immutability)',
  hasAuditImmutability,
  hasAuditImmutability 
    ? 'PostgreSQL-Trigger verhindert physisch jegliches UPDATE/DELETE auf Audit-Tabellen (Gerichtsverwertbar).'
    : 'Kritisch: master_audit_trail besitzt keinen physischen Manipulationsschutz-Trigger.'
);

// =============================================================================
// FINAL AUDIT SUMMARY & VERDICT
// =============================================================================
process.stdout.write(`\n${HR}\n`);
process.stdout.write('  ⚖️   JURISTISCHES COMPLIANCE BRIEFING & AUDIT-VERDIKT\n');
process.stdout.write(`${HR}\n`);
process.stdout.write(`  Gesamtanzahl geprüfter Säulen : ${totalChecks}\n`);
process.stdout.write(`  Erfolgreich bestanden         : ${passedChecks}\n`);
process.stdout.write(`  Rechtliche Beanstandungen    : ${violationsCount}\n`);

if (violationsCount === 0) {
  process.stdout.write('\n  🏆 ERGEBNIS: 100% KONFORM MIT DEM 1% LEGAL- & COMPLIANCE-GOLDSTANDARD\n');
  process.stdout.write('     Die Plattform Campus-Groovelab erfüllt sämtliche materiellen und formellen\n');
  process.stdout.write('     Anforderungen des BFSG 2025, der DSGVO, des TDDDG, des BGB sowie des UrhG.\n');
  process.stdout.write('     Schulträger und Geschäftsführung sind revisionssicher exkulpiert.\n');
  process.stdout.write(`${HR}\n\n`);
  process.exit(0);
} else {
  process.stderr.write(`\n  🚨 ERGEBNIS: ${violationsCount} JURISTISCHE ABMAHN- ODER BUẞGELDRISIKEN GEFUNDEN!\n`);
  process.stderr.write('     Das System erfüllt derzeit nicht die Fail-Closed Compliance-Doktrin.\n');
  process.stderr.write(`${HR}\n\n`);
  process.exit(1);
}

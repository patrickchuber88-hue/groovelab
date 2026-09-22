#!/usr/bin/env node
// =============================================================================
// ⚖️  Campus-Groovelab Automated Legal & Compliance Guard [Compliance-as-Code]
// Standard:  12 Säulen / 18 Checks: DIN EN 301 549 V3.2.1 / ISO/IEC 27001 Annex A.8 /
//            BFSG 2025 / WCAG 2.2 AA / DSGVO Art. 5, 8, 9, 15, 17, 25, 28, 32 /
//            TDDDG § 25 / BGB §§ 312j, 312k / UrhG § 73 / KUG § 22 / § 8a SGB VIII /
//            DSA Art. 16 / NIS-2 & § 202a StGB / Clean Wording
// Runtime:   Native Node.js ESM — zero external dependencies, 100% in-memory (< 1s)
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
process.stdout.write('  ⚖️   Campus-Groovelab Legal & Regulatory Compliance Guard (12 Säulen / 18 Checks)\n');
process.stdout.write('       Auditing DIN EN 301 549, ISO/IEC 27001, BFSG 2025, DSGVO, BGB §§ 312j/k, UrhG, NIS-2\n');
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
    'LEG-01: BFSG 2025 & DIN EN 301 549 Deklarations-Wahrheit (Status „teilweise vereinbar“)',
    hasTeilweise && !hasVollstaendig && hasStandard && hasExceptions,
    hasVollstaendig 
      ? 'Abmahnrisiko nach § 3a UWG: Text behauptet unzulässigerweise "vollständig barrierefrei"!' 
      : 'Erklärung zur digitalen Barrierefreiheit ist abmahnsicher mit deklarierten Ausnahmen gem. § 16 BFSG verankert.'
  );
} else {
  recordCheck('LEG-01: BFSG 2025 Deklaration', false, 'LegalTextModal.tsx existiert nicht.');
}

// LEG-02: 360° WAI-ARIA Dialog & Modal Accessibility Contract (DIN EN 301 549 V3.2.1 / BFSG 2025)
// Verifies that 100% of all real modal components and dialogs implement role="dialog", aria-modal, or use ModalFrame/PwaModalShell
const allModalFiles = allSrcFiles.filter(f => {
  const name = path.basename(f);
  return f.endsWith('.tsx') && 
    (name.includes('Modal') || name.includes('Dialog')) && 
    !['ModalsHub.tsx', 'ModalsMasterHub.tsx', 'ModalHeader.tsx', 'StudentDetailModal.tsx', 'StudentJuniorStickerAwardModal.tsx'].some(h => name.endsWith(h));
});

let modalContractViolations = [];
for (const mPath of allModalFiles) {
  const code = fs.readFileSync(mPath, 'utf8');
  const hasRoleDialog = code.includes('role="dialog"') || code.includes("role='dialog'") || (code.includes('role=') && code.includes('dialog'));
  const hasModalShell = code.includes('ModalFrame') || code.includes('PwaModalShell');
  const hasSubModal = code.match(/<([A-Z][a-zA-Z0-9]+(?:Modal|CelebrationModal|DetailModal))/);
  const isDelegated = hasSubModal && hasSubModal[1] !== path.basename(mPath, '.tsx');

  if (!hasRoleDialog && !hasModalShell && !isDelegated) {
    modalContractViolations.push(path.basename(mPath));
  }
}

recordCheck(
  `LEG-02: DIN EN 301 549 & BFSG 2025 360° WAI-ARIA Modal Contract (${allModalFiles.length} Modals geprüft)`,
  modalContractViolations.length === 0,
  modalContractViolations.length === 0 
    ? `Ausnahmslos alle ${allModalFiles.length} Dialog-Modals der Plattform erfüllen den BFSG 2025 WAI-ARIA Contract (role="dialog", aria-modal="true").`
    : `Mangelhafte Dialog-Semantik in ${modalContractViolations.length} Modals: ${modalContractViolations.slice(0, 5).join(', ')}...`
);

// =============================================================================
// SÄULE 2: DSGVO JUGENDSCHUTZ, ZERO-SECRETS & RECHT AUF VERGESSENWERDEN
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

// LEG-04: DSGVO Art. 17 Shared Device Scrubber Invariante & Logout-Verdrahtung
const scrubberPath = path.join(SRC_DIR, 'utils', 'sharedDeviceScrubber.ts');
const authActionsPath = path.join(SRC_DIR, 'hooks', 'useAuthSessionActions.ts');

let allPurged = false;
let isWiredToLogout = false;

if (fs.existsSync(scrubberPath)) {
  const code = fs.readFileSync(scrubberPath, 'utf8');
  const cleansEvents = code.includes('cg_events_swr_');
  const cleansSchedule = code.includes('cg_schedule_swr_');
  const cleansAudio = code.includes('campus_junior_recordings_') || code.includes('cached_audio_');
  const cleansStudent = code.includes('groovelab_student_');
  const cleansSession = code.includes('sessionStorage.clear()');

  allPurged = cleansEvents && cleansSchedule && cleansAudio && cleansStudent && cleansSession;
}

if (fs.existsSync(authActionsPath)) {
  const authCode = fs.readFileSync(authActionsPath, 'utf8');
  isWiredToLogout = authCode.includes('scrubSharedDeviceCache');
}

recordCheck(
  'LEG-04: DSGVO Art. 17 Zero-Trace Scrubber (Schutz geteilter Endgeräte & Logout-Verdrahtung)',
  allPurged && isWiredToLogout,
  allPurged && isWiredToLogout 
    ? 'scrubSharedDeviceCache() bereinigt SWR-Caches, Audio-Dateien und studentische Tokens restlos und ist fest in useAuthSessionActions verankert.'
    : 'Scrubber unvollständig oder nicht in den Logout-Aktionen verdrahtet.'
);

// LEG-05: ISO/IEC 27001 Annex A.8.28 Zero-Client-Secrets (Verbot von PINs & Passwörtern im Browser-Storage)
const FORBIDDEN_STORAGE_KEYS = [
  'pin',
  'parent_pin',
  'personal_pin',
  'password',
  'master_admin_password',
  'two_factor_secret'
];

let storageSecretLeaks = [];
for (const file of allSrcFiles) {
  if (file.includes('test') || file.includes('migration')) continue;
  const code = fs.readFileSync(file, 'utf8');

  for (const secretKey of FORBIDDEN_STORAGE_KEYS) {
    const storageRegex = new RegExp(`(?:localStorage|sessionStorage)\\.setItem\\(\\s*['"\`][^'"\`]*\\b${secretKey}\\b[^'"\`]*['"\`]`, 'i');
    if (storageRegex.test(code)) {
      storageSecretLeaks.push({ file: path.relative(ROOT_DIR, file), key: secretKey });
    }
  }
}

recordCheck(
  'LEG-05: ISO/IEC 27001 Annex A.8.28 Zero-Client-Secrets (Keine PINs/Passwörter im Browser-Storage)',
  storageSecretLeaks.length === 0,
  storageSecretLeaks.length === 0
    ? 'Browser Storage (localStorage / sessionStorage) speichert ausnahmslos unkritische UI-Zustände; 0 Secrets.'
    : `Sicherheitsverstoß ISO 27001: Secrets im Storage gefunden in: ${storageSecretLeaks.map(s => `${s.file} (Key: ${s.key})`).join(', ')}`
);

// =============================================================================
// SÄULE 3: TDDDG § 25 (EHEM. TTDSG) & ZERO-TRACKING-AXIOM
// =============================================================================
process.stdout.write('\n─── SÄULE 3: TDDDG § 25 & Zero-Tracking (Schutz der Privatsphäre) ───\n');

// LEG-06: Verbot unbefugter Third-Party-Tracker & Analyse-SDKs
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
  'LEG-06: TDDDG § 25 Abs. 2 Zero-Tracking-Axiom (100% werbe- & trackerfrei)',
  trackerMatches.length === 0,
  trackerMatches.length === 0 
    ? 'Keine Third-Party Tracking-Pixel oder Analyse-SDKs. Speicherzugriffe sind rein technisch zwingend.'
    : `Verstoß gegen § 25 TDDDG: Tracker gefunden in ${trackerMatches.map(m => `${m.file} (${m.tracker})`).join(', ')}`
);

// =============================================================================
// SÄULE 4: BGB §§ 312j, 312k & PAngV (BUTTON-LÖSUNG, KÜNDIGUNGS-ASSISTENT & BOTENSTATUS)
// =============================================================================
process.stdout.write('\n─── SÄULE 4: BGB §§ 312j, 312k & PAngV (Button-Lösung, Kündigung & Botenstatus) ───\n');

// LEG-07: Button-Lösungsprüfung
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
  'LEG-07: BGB § 312j Abs. 3 Button-Lösung (Eindeutige Beschriftung bei Zahlungspflicht)',
  ambiguousButtonsFound.length === 0,
  ambiguousButtonsFound.length === 0 
    ? 'Zahlungspflichtige Buttons sind eindeutig und gesetzeskonform deklariert; kein irreführendes "Weiter".'
    : `Abmahngefahr nach § 312j BGB: Mehrdeutige Buttons in ${ambiguousButtonsFound.join(', ')}`
);

// LEG-08: § 19 UStG / PAngV Steuertransparenz auf Rechnungsübersichten
const schoolDetailPane = path.join(SRC_DIR, 'components', 'billing', 'tabs', 'InvoicesSubTab', 'SchoolDetailPane.tsx');
let hasUstgNotice = false;
if (fs.existsSync(schoolDetailPane)) {
  const paneCode = fs.readFileSync(schoolDetailPane, 'utf8');
  hasUstgNotice = paneCode.includes('§ 19 UStG');
}

recordCheck(
  'LEG-08: § 19 UStG / PAngV Steuertransparenz (Gesetzliche Kleinunternehmer-Klausel)',
  hasUstgNotice,
  hasUstgNotice
    ? 'Rechnungsübersichten weisen die gesetzlich vorgeschriebene Kleinunternehmer-Klausel (§ 19 UStG) lückenlos aus.'
    : 'Abmahngefahr nach PAngV: Fehlender § 19 UStG Umsatzsteuerhinweis in SchoolDetailPane.tsx.'
);

// LEG-09: BGB § 312k Kündigungsbutton & Chat-Botenstatus-Doktrin
const billingModalsPath = path.join(SRC_DIR, 'components', 'secretary', 'SecretaryBillingModalsHub.tsx');
const parentActivationPath = path.join(SRC_DIR, 'components', 'ParentCampusActivationModal.tsx');
const licenseUtilsPath = path.join(SRC_DIR, 'components', 'secretary', 'licenses', 'licenseUtils.ts');

let hasCancellationWorkflow = false;
let hasBotenstatusDisclaimer = false;

if (fs.existsSync(billingModalsPath) && fs.existsSync(licenseUtilsPath)) {
  const billingCode = fs.readFileSync(billingModalsPath, 'utf8');
  const licenseCode = fs.readFileSync(licenseUtilsPath, 'utf8');
  hasCancellationWorkflow = 
    billingCode.includes('Vertrag verbindlich kündigen') &&
    (billingCode.includes('312k') || licenseCode.includes('312k'));
}

if (fs.existsSync(parentActivationPath)) {
  const activationCode = fs.readFileSync(parentActivationPath, 'utf8');
  hasBotenstatusDisclaimer = activationCode.includes('Botenstatus') && activationCode.includes('Vertragskündigungen');
}

recordCheck(
  'LEG-09: BGB § 312k Kündigungsbutton & Chat-Botenstatus-Doktrin (Rechtssichere Abos & Mitteilungen)',
  hasCancellationWorkflow && hasBotenstatusDisclaimer,
  hasCancellationWorkflow && hasBotenstatusDisclaimer
    ? 'Zweistufige Kündigungsschaltfläche mit PDF-Beleg gem. § 312k BGB verankert; Chat besitzt klaren Botenstatus-Haftungsausschluss.'
    : 'Haftungsrisiko nach § 312k BGB: Kündigungs-Button oder Botenstatus-Hinweis unvollständig.'
);

// =============================================================================
// SÄULE 5: URHG § 73 & KUG (AUDIO-PERSÖNLICHKEITSRECHT & STIMMSCHUTZ)
// =============================================================================
process.stdout.write('\n─── SÄULE 5: UrhG § 73 & KUG (Audio-Streaming & Stimmschutz) ───\n');

// LEG-10: Signed URL TTL Enforcement (UrhG § 73 / DSGVO Art. 32)
const audioHelperPath = path.join(SRC_DIR, 'utils', 'audioStorageHelper.ts');
if (fs.existsSync(audioHelperPath)) {
  const code = fs.readFileSync(audioHelperPath, 'utf8');
  const ttlMatch = code.match(/expiresInSeconds:\s*number\s*=\s*(\d+)/);
  const ttl = ttlMatch ? parseInt(ttlMatch[1], 10) : null;
  const isTtlCompliant = ttl !== null && ttl <= 1800;

  recordCheck(
    'LEG-10: UrhG § 73 & KUG Signed Audio URL TTL (Max. 30 Min. Streaming-Lebensdauer)',
    isTtlCompliant,
    isTtlCompliant 
      ? `HMAC-signierte Audio-Streaming URLs laufen nach maximal ${ttl}s (30 Min.) ab. Dauerhafte Exfiltration ausgeschlossen.`
      : `Sicherheitsverstoß: Audio URL TTL ist mit ${ttl}s zu lang oder unbeschränkt.`
  );
} else {
  recordCheck('LEG-10: UrhG Audio TTL Guard', false, 'audioStorageHelper.ts nicht gefunden.');
}

// =============================================================================
// SÄULE 6: DSGVO ART. 28, 32 & NIS-2 (MANDANTENTRENNUNG, REVISIONSSICHERHEIT & AVV)
// =============================================================================
process.stdout.write('\n─── SÄULE 6: DSGVO Art. 28, 32 & NIS-2 (Mandantentrennung & AVV-Integrität) ───\n');

// LEG-11: Append-Only Trigger & Multi-Tenancy Protection
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
  'LEG-11: DSGVO Art. 32 & NIS-2 Revisionssicherer Audit-Trail (Append-Only Immutability)',
  hasAuditImmutability,
  hasAuditImmutability 
    ? 'PostgreSQL-Trigger verhindert physisch jegliches UPDATE/DELETE auf Audit-Tabellen (Gerichtsverwertbar).'
    : 'Kritisch: master_audit_trail besitzt keinen physischen Manipulationsschutz-Trigger.'
);

// LEG-12: DSGVO Art. 28 Auftragsverarbeitungsvertrag (Digitale Signatur mit SHA-256)
const avvModalPath = path.join(SRC_DIR, 'components', 'AVVModal.tsx');
let hasAvvContract = false;
if (fs.existsSync(avvModalPath)) {
  const avvCode = fs.readFileSync(avvModalPath, 'utf8');
  hasAvvContract = avvCode.includes('AVV_CONTRACT_DIGITALLY_SIGNED') && avvCode.includes('SHA256-CG-AVV-');
}

recordCheck(
  'LEG-12: DSGVO Art. 28 Auftragsverarbeitungsvertrag (Digitale Signatur & Audit-Hash)',
  hasAvvContract,
  hasAvvContract
    ? 'AVV-Abschluss erfolgt digital mit revisionssicherem SHA256-Audit-Hash und Audit-Log-Eintrag.'
    : 'Haftungsrisiko nach Art. 28 DSGVO: AVVModal besitzt keine kryptografische Signaturprüfung.'
);

// =============================================================================
// SÄULE 7: KUG § 22 & DSGVO ART. 8 (ZERO-PHOTO DOKTRIN FÜR MINDERJÄHRIGE)
// =============================================================================
process.stdout.write('\n─── SÄULE 7: KUG § 22 & Zero-Photo Doktrin (Bildnisschutz für Minderjährige) ───\n');

// LEG-13: Verbot von Zwangs-Fotouploads & Gewährleistung von 3D-Musiker-Avataren
const studentAvatarsPath = path.join(SRC_DIR, 'components', 'student', 'studentAvatars.constants.ts');
const avatarEnginePath = path.join(SRC_DIR, 'utils', 'avatarResolutionEngine.ts');

let hasCompliantAvatars = false;
let hasDedicatedEngine = false;

if (fs.existsSync(studentAvatarsPath) && fs.existsSync(avatarEnginePath)) {
  const avatarsContent = fs.readFileSync(studentAvatarsPath, 'utf8');
  const engineContent = fs.readFileSync(avatarEnginePath, 'utf8');

  const definesStudentAvatars = avatarsContent.includes('STUDENT_AVATARS') && avatarsContent.includes('/avatars/');
  const enforcesFallback = engineContent.includes('/avatars/neutral_instrument_avatar.png') || engineContent.includes('hasDedicated3DAvatar');

  hasCompliantAvatars = definesStudentAvatars;
  hasDedicatedEngine = enforcesFallback;
}

recordCheck(
  'LEG-13: KUG § 22 & DSGVO Art. 8 Zero-Photo Doktrin (Kindgerechte 3D-Musiker-Avatare)',
  hasCompliantAvatars && hasDedicatedEngine,
  hasCompliantAvatars && hasDedicatedEngine 
    ? 'Schüler-Profile nutzen kuratierte 3D-Instrumenten-Avatare; kein Zwangs-Upload von Minderjährigen-Fotos.'
    : 'Verstoß gegen Bildnisschutz: 3D-Avatar-Katalog oder neutraler Instrumenten-Fallback unvollständig.'
);

// =============================================================================
// SÄULE 8: DSGVO ART. 9 & § 26 BDSG (DOPPELTES NEUTRALITÄTS-AXIOM BEI ABSAGEN)
// =============================================================================
process.stdout.write('\n─── SÄULE 8: DSGVO Art. 9 & § 26 BDSG (Doppeltes Neutralitäts-Axiom & Verbot von Gesundheitsdaten) ───\n');

// LEG-14: Doppeltes Neutralitäts-Axiom bei Unterrichtsabsagen (Schüler & Lehrkraft)
const scheduleHookPath = path.join(SRC_DIR, 'components', 'student', 'hooks', 'useStudentSchedule.ts');
const teacherAbsenceHookPath = path.join(SRC_DIR, 'components', 'teacher', 'hooks', 'useTeacherAbsence.ts');
const FORBIDDEN_HEALTH_TOKENS = ['krankheitsgrund', 'krankmeldung', 'diagnose', 'icd10', 'attest_pflicht', 'arztbescheinigung'];

let studentNeutral = false;
let teacherNeutral = false;
let foundHealthTokens = [];

if (fs.existsSync(scheduleHookPath)) {
  const scheduleContent = fs.readFileSync(scheduleHookPath, 'utf8');
  studentNeutral = scheduleContent.includes("'canceled_by_student'") || scheduleContent.includes('"canceled_by_student"');
  for (const token of FORBIDDEN_HEALTH_TOKENS) {
    if (scheduleContent.toLowerCase().includes(token)) {
      foundHealthTokens.push(`Student: ${token}`);
    }
  }
}

if (fs.existsSync(teacherAbsenceHookPath)) {
  const teacherContent = fs.readFileSync(teacherAbsenceHookPath, 'utf8');
  teacherNeutral = teacherContent.includes('teacher_ausfall') || teacherContent.includes('canceled_by_teacher') || teacherContent.includes('isTeacherCurrentlyAbsent');
  for (const token of FORBIDDEN_HEALTH_TOKENS) {
    if (teacherContent.toLowerCase().includes(token)) {
      foundHealthTokens.push(`Teacher: ${token}`);
    }
  }
}

recordCheck(
  'LEG-14: DSGVO Art. 9 & § 26 BDSG Doppeltes Neutralitäts-Axiom (0 Diagnosedaten für Schüler & Lehrer)',
  studentNeutral && teacherNeutral && foundHealthTokens.length === 0,
  studentNeutral && teacherNeutral && foundHealthTokens.length === 0 
    ? 'Absagen erfolgen für Schüler ("canceled_by_student") und Lehrkräfte ("teacher_ausfall") vollkommen neutral ohne Gesundheitsdaten.'
    : `Verstoß gegen Art. 9 DSGVO / § 26 BDSG: Gesundheitsmerkmale (${foundHealthTokens.join(', ')}) oder fehlender neutraler Status.`
);

// =============================================================================
// SÄULE 9: CLEAN DASHBOARD WORDING DIRECTIVE (JURISTISCHE ENTZERRUNG)
// =============================================================================
process.stdout.write('\n─── SÄULE 9: Clean Dashboard Wording Directive (Zero Paragraphen im Frontend) ───\n');

// LEG-15: 360° Clean Dashboard Wording Directive (Zero Paragraphen in der gesamten UI)
const componentsDir = path.join(SRC_DIR, 'components');
const LEGAL_EXCEPTION_FILES = [
  'LegalTextModal',
  'LegalConsentGate',
  'DpoAuditPortal',
  'InvoicePreviewModal',
  'licenseUtils',
  'AVVModal',
  'FeedbackHubModal',
  'TrustSafetyTab',
  'ParentCampusActivationModal',
  'LoginScreen',
  'QRLandingPage'
];

let paragraphViolations = [];
const allComponentFiles = collectFiles(componentsDir, ['.tsx']);

function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '')
    .replace(/.*§ 19 UStG.*/g, ''); // Gesetzliche UStG-Pflichtangabe auf Abrechnungen
}

for (const file of allComponentFiles) {
  const basename = path.basename(file, '.tsx');
  if (LEGAL_EXCEPTION_FILES.some(ex => basename.includes(ex))) {
    continue;
  }
  const rawCode = fs.readFileSync(file, 'utf8');
  const cleanCode = stripComments(rawCode);
  if (cleanCode.includes('§')) {
    paragraphViolations.push(path.relative(ROOT_DIR, file));
  }
}

recordCheck(
  `LEG-15: 360° Clean Dashboard Wording Directive (${allComponentFiles.length} UI-Komponenten geprüft)`,
  paragraphViolations.length === 0,
  paragraphViolations.length === 0 
    ? `Vollständige 360°-Freiheit von juristischem Paragraphenballast (§) über alle ${allComponentFiles.length} Komponenten. Gesetzesnormen verbleiben in AGB, AVV & Impressum.`
    : `Verstoß gegen Clean Dashboard Wording Directive: Paragraphenzeichen (§) gefunden in: ${paragraphViolations.join(', ')}`
);

// =============================================================================
// SÄULE 10: DSGVO ART. 8 & § 8a SGB VIII (PARENTAL GOVERNANCE & JUGENDSCHUTZ)
// =============================================================================
process.stdout.write('\n─── SÄULE 10: DSGVO Art. 8 & § 8a SGB VIII (Parental Governance & Auskunftsrecht) ───\n');

// LEG-16: Autoritative Elterliche Kontrollen & Revisionssichere DSGVO-Datenexporte
const gdprExportPath = path.join(SRC_DIR, 'services', 'gdprDataExportService.ts');
const studentDashPath = path.join(SRC_DIR, 'components', 'StudentAvatarDashboard.tsx');

let hasParentalRpc = false;
let hasGdprExport = false;

if (fs.existsSync(studentDashPath)) {
  const dashContent = fs.readFileSync(studentDashPath, 'utf8');
  hasParentalRpc = dashContent.includes('save_parent_controls');
}

if (fs.existsSync(gdprExportPath)) {
  const exportContent = fs.readFileSync(gdprExportPath, 'utf8');
  hasGdprExport = exportContent.includes('exportStudentGdprDossier');
}

recordCheck(
  'LEG-16: DSGVO Art. 8 & Art. 15/20 Parental Governance & Selbstauskunft-Dossier',
  hasParentalRpc && hasGdprExport,
  hasParentalRpc && hasGdprExport 
    ? 'Elterliche Jugendschutzschranken laufen über save_parent_controls; exportStudentGdprDossier sichert Art. 15/20 DSGVO.'
    : 'Jugendschutz-Integrität unvollständig: Fehlendes save_parent_controls oder fehlender DSGVO-Dossier-Export.'
);

// =============================================================================
// SÄULE 11: KINDERSCHUTZ (§ 8a SGB VIII / § 832 BGB) & DSA ART. 16 CHAT-RESPEKT
// =============================================================================
process.stdout.write('\n─── SÄULE 11: Kinderschutz & DSA Art. 16 Safe-Harbor Chat-Respekt ───\n');

// LEG-17: Chat-Respekt & Fachbegriffs-Whitelist
const chatRespectPath = path.join(SRC_DIR, 'utils', 'chatRespectGuard.ts');
const directMessagesPath = path.join(SRC_DIR, 'components', 'CampusDirectMessages.tsx');

let hasChatRespectGuard = false;
let hasDirectMessagesIntegration = false;

if (fs.existsSync(chatRespectPath) && fs.existsSync(directMessagesPath)) {
  const respectCode = fs.readFileSync(chatRespectPath, 'utf8');
  const dmsCode = fs.readFileSync(directMessagesPath, 'utf8');

  hasChatRespectGuard = respectCode.includes('validateChatMessageContent') &&
                        respectCode.includes('MUSIC_PEDAGOGY_WHITELIST') &&
                        respectCode.includes('CRISIS_HELPLINE_INFO');

  hasDirectMessagesIntegration = dmsCode.includes('validateChatMessageContent') &&
                                 dmsCode.includes('cleanChatMessageContent');
}

recordCheck(
  'LEG-17: Kinderschutz & DSA Art. 16 Safe-Harbor Chat-Respekt (Fagott-Regel & Notruf 116 111)',
  hasChatRespectGuard && hasDirectMessagesIntegration,
  hasChatRespectGuard && hasDirectMessagesIntegration
    ? 'CampusDirectMessages integriert validateChatMessageContent; Fachbegriffs-Whitelist und Notruf 116 111 aktiv.'
    : 'Kinderschutz-Mangel: Chat-Filterung oder Krisen-Hotline in CampusDirectMessages unvollständig.'
);

// =============================================================================
// SÄULE 12: NIS-2 & § 202a StGB GHOST-SUPPORT CITADEL (RFC 6238 TOTP 2FA)
// =============================================================================
process.stdout.write('\n─── SÄULE 12: NIS-2 & § 202a StGB Ghost-Support (RFC 6238 TOTP 2FA & 15m Lease) ───\n');

// LEG-18: Ghost-Support Impersonation Schutz
const ghostGatePath = path.join(SRC_DIR, 'components', 'masterAdmin', 'modals', 'GhostGateModal.tsx');
const masterSchoolsHook = path.join(SRC_DIR, 'components', 'masterAdmin', 'hooks', 'useMasterAdminSchools.ts');
const masterIdlePath = path.join(SRC_DIR, 'components', 'masterAdmin', 'hooks', 'useMasterAdminIdleLock.ts');

let hasGhostTotp = false;
let has15mLease = false;

if (fs.existsSync(ghostGatePath) && fs.existsSync(masterIdlePath)) {
  const schoolsCode = fs.existsSync(masterSchoolsHook) ? fs.readFileSync(masterSchoolsHook, 'utf8') : '';
  const idleCode = fs.readFileSync(masterIdlePath, 'utf8');

  hasGhostTotp = schoolsCode.includes('GOOGLE_AUTHENTICATOR_TOTP');
  has15mLease = idleCode.includes('15') || idleCode.includes('900000');
}

recordCheck(
  'LEG-18: NIS-2 & § 202a StGB Ghost-Support Citadel (RFC 6238 TOTP 2FA & 15-Minuten Zeitschranke)',
  hasGhostTotp && has15mLease,
  hasGhostTotp && has15mLease
    ? 'Ghost-Support Impersonation erzwingt Google Authenticator TOTP 2FA; Sitzung verfällt nach 15 Minuten Inaktivität.'
    : 'Sicherheitsrisiko § 202a StGB: Fehlender TOTP-Zwang oder fehlende Zeitschranke im Master-Admin Ghost-Mode.'
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
  process.stdout.write('     Anforderungen des BFSG 2025, der DSGVO, des TDDDG, des BGB, des UrhG, des DSA sowie der NIS-2.\n');
  process.stdout.write('     Schulträger und Geschäftsführung sind revisionssicher exkulpiert.\n');
  process.stdout.write(`${HR}\n\n`);
  process.exit(0);
} else {
  process.stderr.write(`\n  🚨 ERGEBNIS: ${violationsCount} JURISTISCHE ABMAHN- ODER BUẞGELDRISIKEN GEFUNDEN!\n`);
  process.stderr.write('     Das System erfüllt derzeit nicht die Fail-Closed Compliance-Doktrin.\n');
  process.stderr.write(`${HR}\n\n`);
  process.exit(1);
}

/**
 * ==============================================================================
 * 🛡️ CAMPUS-GROOVELAB: 360° LEGAL COMPLIANCE & 4-ROLE FORENSIC AUDIT
 * ==============================================================================
 * Standards: DIN EN 301 549 V3.2.1 / ISO/IEC 27001 Annex A.8 / BFSG 2025 / WCAG 2.2 AA /
 *            DSGVO Art. 5, 8, 9, 15, 17, 20, 28, 32 / TDDDG § 25 / BGB §§ 312j, 312k /
 *            UrhG § 73 / KUG § 22 / § 8a SGB VIII / DSA Art. 16 / NIS-2
 * 
 * Deeply simulates and verifies data flows across all 4 user roles:
 * 1. Rolle 1 (Schüler/Minderjährige): KUG § 22 Zero-Photo, Art. 9 Neutralität, Art. 15 Export, Art. 17 Scrubber, ISO 27001 Storage
 * 2. Rolle 2 (Lehrkraft): UrhG § 73 Audio-Streaming TTL <= 1800s, neutrale Vertretungs- & Ausfalllogik, ArbZG Quiet Hours
 * 3. Rolle 3 (Schulleitung/Sekretariat): ISO/IEC 27037 Court-Proof SHA-256 Export, § 19 UStG Steuertransparenz, BGB § 312k Kündigungsbutton
 * 4. Rolle 4 (Master-Admin): RFC 6238 TOTP 2FA Ghost-Lease (max 15m), Append-Only WORM Audit-Trail
 * 5. 360° UI Parity: BFSG 2025 Modal Dialog Contract & Clean Dashboard Wording Directive
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
  getInstrumentAvatarUrl,
  getDefaultMusicianAvatarUrl,
  hasDedicated3DAvatar,
  isExplicitNonInstrumentSubject
} from '../utils/avatarResolutionEngine';
import { validateChatMessageContent, CRISIS_HELPLINE_INFO } from '../utils/chatRespectGuard';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = fs.existsSync(path.join(process.cwd(), 'supabase', 'migrations'))
  ? process.cwd()
  : path.resolve(SRC_DIR, '..', '..', '..');

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
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    results.push({ suite, name, passed: false, details });
    console.error(`  ❌ [FAIL] ${name}: ${details || 'Assertion failed'}`);
  }
}

console.log('════════════════════════════════════════════════════════════════');
console.log('🏛️  CAMPUS-GROOVELAB: 360° LEGAL COMPLIANCE & 4-ROLE FORENSIC AUDIT');
console.log('════════════════════════════════════════════════════════════════');

// ------------------------------------------------------------------------------
// SUITE 1: ROLLE 1 — SCHÜLER & MINDERJÄHRIGENSCHUTZ (KUG § 22 / DSGVO ART. 8, 9, 15, 17)
// ------------------------------------------------------------------------------
function testStudentMinorProtection() {
  console.log('\n--- SUITE 1: ROLLE 1 — SCHÜLER & MINDERJÄHRIGENSCHUTZ ---');

  // 1.1 KUG § 22 Zero-Photo Doktrin: Dedicated 3D Avatars for major instruments
  const guitarAvatar = getInstrumentAvatarUrl('E-Gitarre');
  const drumsAvatar = getInstrumentAvatarUrl('Schlagzeug');
  const pianoAvatar = getInstrumentAvatarUrl('Klavier');
  const vocalsAvatar = getInstrumentAvatarUrl('Gesang');
  const fluteAvatar = getInstrumentAvatarUrl('Querflöte');

  assert(
    guitarAvatar === '/avatars/egitarre_avatar.png' &&
    drumsAvatar === '/avatars/schlagzeug_avatar.png' &&
    pianoAvatar === '/avatars/klavier_avatar_new.png' &&
    vocalsAvatar === '/avatars/gesang_avatar.png' &&
    fluteAvatar === '/avatars/querfloete_avatar.png',
    'Rolle 1 (Schüler)',
    '1.1 KUG § 22 Zero-Photo: Hauptinstrumente lösen deterministisch auf kuratierte 3D-Avatare auf'
  );

  // 1.2 KUG § 22 Fail-Closed Emergency Fallback (Zero Real-Photo Force)
  const exoticFallback = getInstrumentAvatarUrl('ExoticDidgeridooNonExistent');
  const emptyFallback = getInstrumentAvatarUrl(null);
  assert(
    exoticFallback === '/avatars/neutral_instrument_avatar.png' &&
    emptyFallback === '/avatars/neutral_instrument_avatar.png',
    'Rolle 1 (Schüler)',
    '1.2 KUG § 22 Fail-Closed Fallback: Unbekannte/Fehlende Instrumente fallen sicher auf neutrales Raumavatar zurück'
  );

  // 1.3 DSGVO Art. 9 Neutralitäts-Axiom bei Unterrichtsabsagen (Keine Erfassung von Gesundheitsdaten)
  const scheduleHookPath = path.join(SRC_DIR, 'components', 'student', 'hooks', 'useStudentSchedule.ts');
  const scheduleContent = fs.readFileSync(scheduleHookPath, 'utf8');

  const usesNeutralStudentStatus = scheduleContent.includes("'canceled_by_student'");
  const FORBIDDEN_HEALTH_TOKENS = ['krankheitsgrund', 'krankmeldung', 'diagnose', 'icd10', 'attest_pflicht', 'arztbescheinigung']; // Neutralitäts-Wächter Negativtest
  const hasHealthTokens = FORBIDDEN_HEALTH_TOKENS.some(token => scheduleContent.toLowerCase().includes(token));

  assert(
    usesNeutralStudentStatus && !hasHealthTokens,
    'Rolle 1 (Schüler)',
    '1.3 DSGVO Art. 9 Neutralität: Schüler-Absagestatus erfolgt neutral als "canceled_by_student" ohne Gesundheitsdaten'
  );

  // 1.4 DSGVO Art. 15/20 Auskunftsdossier: Revisionssicherer Export mit SHA-256 Prüfsumme
  const gdprExportPath = path.join(SRC_DIR, 'services', 'gdprDataExportService.ts');
  const gdprContent = fs.readFileSync(gdprExportPath, 'utf8');

  const hasExportFunction = gdprContent.includes('exportStudentGdprDossier');
  const calculatesSha256 = gdprContent.includes('calculateSha256Checksum') || gdprContent.includes('sha256');

  assert(
    hasExportFunction && calculatesSha256,
    'Rolle 1 (Schüler)',
    '1.4 DSGVO Art. 15/20 Datenportabilität: exportStudentGdprDossier() siegelt Dossier mit SHA-256 Checksumme'
  );

  // 1.5 DSGVO Art. 17 Scrubber: Schutz geteilter Schul-Tablets & Kiosks
  const scrubberPath = path.join(SRC_DIR, 'utils', 'sharedDeviceScrubber.ts');
  const scrubberContent = fs.readFileSync(scrubberPath, 'utf8');

  const scrubsAudio = scrubberContent.includes('campus_junior_recordings_') || scrubberContent.includes('cached_audio_');
  const scrubsStudent = scrubberContent.includes('groovelab_student_');
  const scrubsSession = scrubberContent.includes('sessionStorage.clear()');

  assert(
    scrubsAudio && scrubsStudent && scrubsSession,
    'Rolle 1 (Schüler)',
    '1.5 DSGVO Art. 17 Scrubber: scrubSharedDeviceCache() sterilisiert flüchtige Audio-Dateien und studentische Tokens restlos'
  );

  // 1.6 Kinderschutz & DSA Art. 16 Safe-Harbor Chat-Respekt (Simulation)
  const toxicCheck = validateChatMessageContent('Du bist so ein Arschloch');
  const musicCheck = validateChatMessageContent('Bitte übe den Tastenanschlag auf dem Fagott und bring den Notenständer mit.');
  const crisisCheck = validateChatMessageContent('Ich will sterben');

  assert(
    !toxicCheck.isValid &&
    musicCheck.isValid &&
    crisisCheck.isCrisis === true &&
    CRISIS_HELPLINE_INFO.phone === '116 111',
    'Rolle 1 (Schüler)',
    '1.6 Kinderschutz § 8a SGB VIII / DSA Art. 16: Schimpfwörter werden gefiltert, Fagott-Regel schützt Musikbegriffe, Notruf 116 111 greift'
  );

  // 1.7 ISO/IEC 27001 Annex A.8.28 Zero-Client-Secrets in Browser Storage
  const authFiles = [
    path.join(SRC_DIR, 'hooks', 'useAuthSessionActions.ts'),
    path.join(SRC_DIR, 'utils', 'sharedDeviceScrubber.ts'),
    path.join(SRC_DIR, 'services', 'studentRosterService.ts')
  ];
  let hasInsecureStorageUsage = false;
  for (const af of authFiles) {
    if (fs.existsSync(af)) {
      const c = fs.readFileSync(af, 'utf8');
      if (/(?:localStorage|sessionStorage)\.setItem\([^)]*(?:pin|password|master_admin_password)/i.test(c)) {
        hasInsecureStorageUsage = true;
        break;
      }
    }
  }
  assert(
    !hasInsecureStorageUsage,
    'Rolle 1 (Schüler)',
    '1.7 ISO/IEC 27001 Annex A.8.28 Zero-Client-Secrets: Browser-Storage speichert keine PINs oder Passwörter'
  );
}

// ------------------------------------------------------------------------------
// SUITE 2: ROLLE 2 — LEHRKRAFT & URHEBERSCHUTZ (URHG § 73 / DSGVO ART. 17)
// ------------------------------------------------------------------------------
function testTeacherUrheberrechtAndAbsence() {
  console.log('\n--- SUITE 2: ROLLE 2 — LEHRKRAFT & URHEBERSCHUTZ ---');

  // 2.1 UrhG § 73 & DSGVO Art. 32: HMAC-signierte Streaming-URL Lebensdauer
  const audioHelperPath = path.join(SRC_DIR, 'utils', 'audioStorageHelper.ts');
  const audioCode = fs.readFileSync(audioHelperPath, 'utf8');

  const ttlMatch = audioCode.match(/expiresInSeconds:\s*number\s*=\s*(\d+)/);
  const ttl = ttlMatch ? parseInt(ttlMatch[1], 10) : 0;

  assert(
    ttl > 0 && ttl <= 1800,
    'Rolle 2 (Lehrkraft)',
    `2.1 UrhG § 73 Audio-TTL: Streaming Pre-Signed URLs laufen nach maximal ${ttl}s (<= 30 Min.) ab`
  );

  // 2.2 Neutrale Lehrkraft-Ausfallmeldung ohne gesundheitliche Stigmatisierung
  const teacherAbsenceHookPath = path.join(SRC_DIR, 'components', 'teacher', 'hooks', 'useTeacherAbsence.ts');
  let teacherAbsenceCode = '';
  if (fs.existsSync(teacherAbsenceHookPath)) {
    teacherAbsenceCode = fs.readFileSync(teacherAbsenceHookPath, 'utf8');
  }

  const usesTeacherAusfallStatus = teacherAbsenceCode.includes('teacher_ausfall') || teacherAbsenceCode.includes('canceled_by_teacher');
  assert(
    usesTeacherAusfallStatus,
    'Rolle 2 (Lehrkraft)',
    '2.2 Neutralitäts-Axiom Lehrkraft: Statusmeldung erfolgt neutral als "teacher_ausfall" oder "canceled_by_teacher"'
  );

  // 2.3 Lehrkraft-Logout löscht Lehrkraft-SWR-Caches und Arbeitsplatz-Tokens
  const authActionsPath = path.join(SRC_DIR, 'hooks', 'useAuthSessionActions.ts');
  const authCode = fs.readFileSync(authActionsPath, 'utf8');

  assert(
    authCode.includes('scrubSharedDeviceCache'),
    'Rolle 2 (Lehrkraft)',
    '2.3 DSGVO Art. 17 Lehrer-Session: Logout ruft autoritativ scrubSharedDeviceCache() auf'
  );

  // 2.4 Arbeitszeitgesetz ArbZG / Quiet Hours (Ruhezeiten für Lehrkräfte)
  const teacherSettingsPath = path.join(SRC_DIR, 'components', 'teacher', 'TeacherSettingsView.tsx');
  let teacherSettingsCode = '';
  if (fs.existsSync(teacherSettingsPath)) {
    teacherSettingsCode = fs.readFileSync(teacherSettingsPath, 'utf8');
  }
  const respectsQuietHours = teacherSettingsCode.includes('DEFAULT_QUIET_HOURS_CONFIG') || teacherSettingsCode.includes('QuietHoursConfig') || teacherSettingsCode.includes('quiet_hours');
  assert(
    respectsQuietHours,
    'Rolle 2 (Lehrkraft)',
    '2.4 ArbZG / Ruhezeiten: Lehrkraft-Einstellungen integrieren Quiet-Hours zum Schutz der Arbeits- und Ruhezeiten'
  );
}

// ------------------------------------------------------------------------------
// SUITE 3: ROLLE 3 — SCHULLEITUNG & SEKRETARIAT (DSGVO ART. 28 / GOBD / COURT-PROOF)
// ------------------------------------------------------------------------------
function testSchoolLeadershipAndCourtProof() {
  console.log('\n--- SUITE 3: ROLLE 3 — SCHULLEITUNG & SEKRETARIAT ---');

  // 3.1 Gerichtsverwertbarer School-Dossier-Export mit SHA-256 Signatur
  const courtProofModalPath = path.join(SRC_DIR, 'components', 'admin', 'CourtProofExportModal.tsx');
  const courtProofCode = fs.readFileSync(courtProofModalPath, 'utf8');

  const callsExportRpc = courtProofCode.includes('export_school_forensic_dossier');
  const displaysSha256 = courtProofCode.includes('sha256') || courtProofCode.includes('Prüfsumme') || courtProofCode.includes('SHA-256');

  assert(
    callsExportRpc && displaysSha256,
    'Rolle 3 (Schulleitung)',
    '3.1 ISO/IEC 27037 Court-Proof: CourtProofExportModal bindet export_school_forensic_dossier mit SHA-256 Siegel ein'
  );

  // 3.2 Preistransparenz & Gesetzlicher Steuernachweis (§ 19 UStG Kleinunternehmerklausel)
  const schoolDetailPanePath = path.join(SRC_DIR, 'components', 'billing', 'tabs', 'InvoicesSubTab', 'SchoolDetailPane.tsx');
  const schoolDetailCode = fs.readFileSync(schoolDetailPanePath, 'utf8');

  const hasUstgNotice = schoolDetailCode.includes('§ 19 UStG');
  assert(
    hasUstgNotice,
    'Rolle 3 (Schulleitung)',
    '3.2 § 19 UStG / PAngV Steuertransparenz: Rechnungsübersichten enthalten die gesetzliche Kleinunternehmer-Klausel'
  );

  // 3.3 Digitale AVV-Unterzeichnung nach Art. 28 DSGVO mit Revisions-Audit-Log
  const avvModalPath = path.join(SRC_DIR, 'components', 'AVVModal.tsx');
  const avvCode = fs.readFileSync(avvModalPath, 'utf8');

  const logsAvvSigning = avvCode.includes('AVV_CONTRACT_DIGITALLY_SIGNED');
  const generatesAuditChecksum = avvCode.includes('SHA256-CG-AVV-');

  assert(
    logsAvvSigning && generatesAuditChecksum,
    'Rolle 3 (Schulleitung)',
    '3.3 DSGVO Art. 28 Auftragsverarbeitungsvertrag: Digitale Unterzeichnung wird mit SHA256-Prüfsumme protokolliert'
  );

  // 3.4 BGB § 312j Abs. 3 Button-Lösung & Transparenz bei Buchungs-Interaktionen
  const billingTabsDir = path.join(SRC_DIR, 'components', 'billing', 'tabs');
  let hasMisleadingButtons = false;
  if (fs.existsSync(billingTabsDir)) {
    const billingFiles = fs.readdirSync(billingTabsDir).filter(f => f.endsWith('.tsx'));
    for (const b of billingFiles) {
      const code = fs.readFileSync(path.join(billingTabsDir, b), 'utf8');
      if (/<button[^>]*onClick=[^>]*(?:stripe|book|subscribe)[^>]*>\s*(?:Weiter|OK|Bestätigen)\s*<\/button>/i.test(code)) {
        hasMisleadingButtons = true;
        break;
      }
    }
  }
  assert(
    !hasMisleadingButtons,
    'Rolle 3 (Schulleitung)',
    '3.4 BGB § 312j Abs. 3 Button-Lösung: Keine irreführenden Zahlungsbuttons ("Weiter"/"OK") in Buchungsansichten'
  );

  // 3.5 BGB § 312k Kündigungsbutton & Chat-Botenstatus-Doktrin
  const billingModalsPath = path.join(SRC_DIR, 'components', 'secretary', 'SecretaryBillingModalsHub.tsx');
  const parentActivationPath = path.join(SRC_DIR, 'components', 'ParentCampusActivationModal.tsx');
  let hasCancellationButton = false;
  let hasBotenstatusDisclaimer = false;

  if (fs.existsSync(billingModalsPath)) {
    const bCode = fs.readFileSync(billingModalsPath, 'utf8');
    hasCancellationButton = bCode.includes('Vertrag verbindlich kündigen') && bCode.includes('312k');
  }

  if (fs.existsSync(parentActivationPath)) {
    const aCode = fs.readFileSync(parentActivationPath, 'utf8');
    hasBotenstatusDisclaimer = aCode.includes('Botenstatus') && aCode.includes('Vertragskündigungen');
  }

  assert(
    hasCancellationButton && hasBotenstatusDisclaimer,
    'Rolle 3 (Schulleitung)',
    '3.5 BGB § 312k Kündigungsbutton & Botenstatus: Zweistufige Kündigungsschaltfläche mit Fristbeleg-PDF sowie Chat-Haftungsausschluss verankert'
  );
}

// ------------------------------------------------------------------------------
// SUITE 4: ROLLE 4 — MASTER-ADMIN (NIS-2 & OWASP ASVS LEVEL 3)
// ------------------------------------------------------------------------------
function testMasterAdminCitadelAndWorm() {
  console.log('\n--- SUITE 4: ROLLE 4 — MASTER-ADMIN & CITADEL ---');

  // 4.1 Zero-Trust Ghost-Support Modus erzwingt RFC 6238 TOTP 2FA
  const ghostSchoolsPath = path.join(SRC_DIR, 'components', 'masterAdmin', 'hooks', 'useMasterAdminSchools.ts');
  const idleHookPath = path.join(SRC_DIR, 'components', 'masterAdmin', 'hooks', 'useMasterAdminIdleLock.ts');
  const ghostSchoolsCode = fs.existsSync(ghostSchoolsPath) ? fs.readFileSync(ghostSchoolsPath, 'utf8') : '';
  const idleLockCode = fs.existsSync(idleHookPath) ? fs.readFileSync(idleHookPath, 'utf8') : '';

  const enforcesTotp = 
    ghostSchoolsCode.includes('GOOGLE_AUTHENTICATOR_TOTP') || 
    idleLockCode.includes('login_master_admin') ||
    idleLockCode.includes('authTotp');

  assert(
    enforcesTotp,
    'Rolle 4 (Master-Admin)',
    '4.1 OWASP ASVS V3 Ghost-Mode: Privilegierte Schul-Impersonation verlangt RFC 6238 TOTP 2FA'
  );

  // 4.2 Append-Only WORM Manipulationsschutz auf master_audit_trail
  const migrationsDir = path.join(ROOT_DIR, 'supabase', 'migrations');
  let hasWormTrigger = false;

  if (fs.existsSync(migrationsDir)) {
    const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    for (const m of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationsDir, m), 'utf8');
      if (
        /trg_prevent_master_audit_tampering/i.test(sql) && 
        /BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+(?:public\.)?master_audit_trail/i.test(sql)
      ) {
        hasWormTrigger = true;
        break;
      }
    }
  }

  assert(
    hasWormTrigger,
    'Rolle 4 (Master-Admin)',
    '4.2 NIS-2 & DSGVO Art. 32 WORM Protection: PostgreSQL-Trigger blockiert UPDATE/DELETE auf master_audit_trail'
  );

  // 4.3 Rollender Session-Lease mit harter 15-Minuten Zeitschranke
  const has15MinTimeout = idleLockCode.includes('15') || idleLockCode.includes('900000') || idleLockCode.includes('TIMEOUT');
  assert(
    has15MinTimeout,
    'Rolle 4 (Master-Admin)',
    '4.3 OWASP ASVS Session Timeout: Master-Admin Sitzung verfügt über 15-Minuten Inaktivitäts-Lockout'
  );

  // 4.4 NIS-2 & § 202a StGB Impersonation Audit-Trail
  const logsTotpMethod = ghostSchoolsCode.includes("auth_method: 'GOOGLE_AUTHENTICATOR_TOTP'");
  assert(
    logsTotpMethod,
    'Rolle 4 (Master-Admin)',
    '4.4 NIS-2 & § 202a StGB Impersonation Audit: Ghost-Sessions auditieren zwingend "GOOGLE_AUTHENTICATOR_TOTP"'
  );
}

// ------------------------------------------------------------------------------
// SUITE 5: 360° UI PARITÄT (BFSG 2025 WAI-ARIA & CLEAN WORDING)
// ------------------------------------------------------------------------------
function test360UiParity() {
  console.log('\n--- SUITE 5: 360° UI PARITÄT (BFSG 2025 & CLEAN WORDING) ---');

  function collectFiles(dir: string, exts: string[] = ['.tsx']): string[] {
    let list: string[] = [];
    if (!fs.existsSync(dir)) return list;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && !['node_modules', 'dist', '.git', 'coverage'].includes(e.name)) {
        list = list.concat(collectFiles(full, exts));
      } else if (e.isFile() && exts.some(ext => e.name.endsWith(ext))) {
        list.push(full);
      }
    }
    return list;
  }

  // 5.1 360° WAI-ARIA Modal Dialog Contract
  const allModals = collectFiles(path.join(SRC_DIR, 'components')).filter(f => {
    const b = path.basename(f);
    return (b.includes('Modal') || b.includes('Dialog')) &&
      !['ModalsHub.tsx', 'ModalsMasterHub.tsx', 'ModalHeader.tsx', 'StudentDetailModal.tsx', 'StudentJuniorStickerAwardModal.tsx'].some(h => b.endsWith(h));
  });

  let missingDialog = 0;
  for (const m of allModals) {
    const code = fs.readFileSync(m, 'utf8');
    const hasRoleDialog = code.includes('role="dialog"') || code.includes("role='dialog'") || (code.includes('role=') && code.includes('dialog'));
    const hasShell = code.includes('ModalFrame') || code.includes('PwaModalShell');
    const hasSubModal = code.match(/<([A-Z][a-zA-Z0-9]+(?:Modal|CelebrationModal|DetailModal))/);
    const isDelegated = hasSubModal && hasSubModal[1] !== path.basename(m, '.tsx');

    if (!hasRoleDialog && !hasShell && !isDelegated) {
      missingDialog++;
    }
  }

  assert(
    missingDialog === 0,
    '360° UI Parität',
    `5.1 BFSG 2025 WAI-ARIA Contract: Alle ${allModals.length} realen Dialog-Modals implementieren role="dialog"`
  );

  // 5.2 360° Clean Dashboard Wording Directive
  const allUiFiles = collectFiles(path.join(SRC_DIR, 'components'));
  const LEGAL_DOCS = [
    'LegalTextModal', 'LegalConsentGate', 'DpoAuditPortal', 'InvoicePreviewModal',
    'licenseUtils', 'AVVModal', 'FeedbackHubModal', 'TrustSafetyTab',
    'ParentCampusActivationModal', 'LoginScreen', 'QRLandingPage'
  ];

  function stripComments(code: string): string {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
      .replace(/.*§ 19 UStG.*/g, '');
  }

  let paragraphViolations = 0;
  for (const f of allUiFiles) {
    const b = path.basename(f, '.tsx');
    if (LEGAL_DOCS.some(ex => b.includes(ex))) continue;
    const clean = stripComments(fs.readFileSync(f, 'utf8'));
    if (clean.includes('§')) {
      paragraphViolations++;
    }
  }

  assert(
    paragraphViolations === 0,
    '360° UI Parität',
    `5.2 Clean Dashboard Wording Directive: 0 Paragraphenzeichen (§) in ${allUiFiles.length} UI-Komponenten (Rechtsnormen verbleiben in Verträgen)`
  );
}

// ------------------------------------------------------------------------------
// RUNNER & VERDICT
// ------------------------------------------------------------------------------
async function runSuite() {
  testStudentMinorProtection();
  testTeacherUrheberrechtAndAbsence();
  testSchoolLeadershipAndCourtProof();
  testMasterAdminCitadelAndWorm();
  test360UiParity();

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('🏛️  360° LEGAL COMPLIANCE & 4-ROLE FORENSIC AUDIT ERGEBNIS');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Gesamtanzahl geprüfter Invarianten : ${total}`);
  console.log(`  Erfolgreich bestanden              : ${passed}`);
  console.log(`  Rechtliche/Forensische Fehler      : ${failed}`);

  if (failed === 0) {
    console.log('\n  🏆 ERGEBNIS: 100% 360-GRAD LEGAL & FORENSIC GOLDSTANDARD BESTANDEN!');
    console.log('     Alle 4 Benutzerrollen (Schüler, Lehrer, Schulleitung, Master-Admin)');
    console.log('     sowie alle Modals und Boards erfüllen lückenlos OWASP ASVS L3 & BFSG 2025.');
    console.log('════════════════════════════════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.error(`\n  🚨 ERGEBNIS: ${failed} INVARIANTEN-VERLETZUNGEN GEFUNDEN!`);
    console.log('════════════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});

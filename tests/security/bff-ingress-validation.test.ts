// ==============================================================================
// Campus-Groovelab Enterprise+ Security Ingress Validation Pentest Suite
// Datei: tests/security/bff-ingress-validation.test.ts
// Standards: OWASP ASVS Level 3 / Art. 32 DSGVO / NIST SP 800-53 / ISO/IEC 27001
// Prüft:
// 1. Fail-Closed Zod Ingress Schemas (Auth, Gate, Storage, Sentinel)
// 2. Prototype Pollution & Mass Assignment Abweisung (.strict() Axiom)
// 3. Media Ingestion Constraints (Bounds, Whitelisted Contexts & MIME Types)
// 4. Souveräne Rootless Dockerfile Härtung (Zero US-Cloud, Non-Root, Zero-Binary)
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  loginSchema,
  gateLoginSchema,
  presignUploadSchema,
  sentinelIncidentSchema,
} from '../../packages/bff-server/src/schemas/ingressSchemas';

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

async function runBffIngressValidationAudit() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('  🛡️   CAMPUS-GROOVELAB ENTERPRISE BFF INGRESS VALIDATION SUITE     ');
  console.log('       OWASP ASVS L3 / Fail-Closed Zod / Rootless Container Hardening');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // --- 1. AUTHENTICATION INGRESS SCHEMA AUDIT ---
  console.log('1. Prüfe Auth Ingress Schema (loginSchema)...');
  
  const validLogin = loginSchema.safeParse({
    email: 'teacher@campus-groovelab.de',
    password: 'SecurePassword123!',
    isQrOrDeepLink: false,
  });
  assert('Valider Login-Payload wird akzeptiert', validLogin.success);

  const missingPassword = loginSchema.safeParse({
    email: 'teacher@campus-groovelab.de',
  });
  assert('Login ohne Passwort wird fail-closed abgewiesen', !missingPassword.success);

  const invalidEmail = loginSchema.safeParse({
    email: 'not-an-email',
    password: 'password',
  });
  assert('Ungültiges E-Mail-Format wird abgewiesen', !invalidEmail.success);

  const massAssignmentLogin = loginSchema.safeParse({
    email: 'teacher@campus-groovelab.de',
    password: 'password',
    role: 'master_admin', // Angriffsvektor: Unerlaubtes Admin-Flag
  });
  assert(
    'Unerwartetes Feld (Mass Assignment / role) wird fail-closed via .strict() blockiert',
    !massAssignmentLogin.success
  );

  const protoPollutionLogin = loginSchema.safeParse({
    email: 'teacher@campus-groovelab.de',
    password: 'password',
    __proto__: { isAdmin: true },
  });
  assert('Prototype Pollution Versuch im Login wird blockiert', !protoPollutionLogin.success);

  // --- 2. GATE INGRESS SCHEMA AUDIT ---
  console.log('\n2. Prüfe Site-Gate Ingress Schema (gateLoginSchema)...');

  const validGate = gateLoginSchema.safeParse({
    password: 'MySchoolGateCode2026',
  });
  assert('Valider Gate-Zugangscode wird akzeptiert', validGate.success);

  const emptyGate = gateLoginSchema.safeParse({
    password: '   ',
  });
  assert('Leerer Gate-Code (nur Whitespace) wird nach Trim abgewiesen', !emptyGate.success);

  const gateMassAssignment = gateLoginSchema.safeParse({
    password: 'ValidCode',
    bypassCookie: true,
  });
  assert('Zusatz-Attribute im Gate-Payload werden via .strict() blockiert', !gateMassAssignment.success);

  // --- 3. STORAGE INGRESS SCHEMA AUDIT ---
  console.log('\n3. Prüfe Storage Presign Ingress Schema (presignUploadSchema)...');

  const validPresign = presignUploadSchema.safeParse({
    context: 'recordings',
    extension: 'webm',
    contentType: 'audio/webm',
    sizeBytes: 1048576, // 1 MB
    schoolId: '11111111-1111-1111-1111-111111111111',
    studentId: '22222222-2222-2222-2222-222222222222',
    uniqueId: 'rec_session_abc123',
    bucket: 'campus-assets',
  });
  assert('Valider Storage-Presign-Payload wird akzeptiert', validPresign.success);

  const negativeSize = presignUploadSchema.safeParse({
    context: 'recordings',
    extension: 'webm',
    contentType: 'audio/webm',
    sizeBytes: -50,
  });
  assert('Negative Dateigröße wird fail-closed abgewiesen', !negativeSize.success);

  const oversizedFile = presignUploadSchema.safeParse({
    context: 'recordings',
    extension: 'webm',
    contentType: 'audio/webm',
    sizeBytes: 30 * 1024 * 1024, // 30 MB (> 25 MB Limit)
  });
  assert('Dateigröße > 25 MB wird streng abgewiesen', !oversizedFile.success);

  const maliciousMimeType = presignUploadSchema.safeParse({
    context: 'recordings',
    extension: 'sh',
    contentType: 'application/x-sh' as any,
    sizeBytes: 1024,
  });
  assert('Nicht-autorisierter MIME-Type (Shell Script) wird blockiert', !maliciousMimeType.success);

  const pathTraversalContext = presignUploadSchema.safeParse({
    context: '../../system' as any,
    extension: 'webm',
    contentType: 'audio/webm',
    sizeBytes: 1024,
  });
  assert('Path-Traversal im Speicher-Kontext wird blockiert', !pathTraversalContext.success);

  const invalidUuidStudent = presignUploadSchema.safeParse({
    context: 'recordings',
    extension: 'webm',
    contentType: 'audio/webm',
    sizeBytes: 1024,
    studentId: 'not-a-valid-uuid-1234',
  });
  assert('Ungültiges UUID-Format für studentId wird blockiert', !invalidUuidStudent.success);

  // --- 4. SENTINEL INCIDENT INGRESS SCHEMA AUDIT ---
  console.log('\n4. Prüfe Sentinel Incident Ingress Schema (sentinelIncidentSchema)...');

  const validIncident = sentinelIncidentSchema.safeParse({
    incidentType: 'STORAGE_RSYNC_FAILED',
    sourceComponent: 'rsync_worker',
    severity: 'CRITICAL',
    details: { exitCode: 23, host: 'storagebox.de' },
    traceId: 'tr_7781a9',
  });
  assert('Valider Sentinel Incident Payload wird akzeptiert', validIncident.success);

  const invalidSeverity = sentinelIncidentSchema.safeParse({
    incidentType: 'STORAGE_RSYNC_FAILED',
    sourceComponent: 'rsync_worker',
    severity: 'CATASTROPHIC' as any,
  });
  assert('Ungültige Severity-Stufe wird abgewiesen', !invalidSeverity.success);

  const invalidIncidentTypeChars = sentinelIncidentSchema.safeParse({
    incidentType: 'DROP TABLE users;--',
    sourceComponent: 'rsync_worker',
  });
  assert('Bösartige SQL-Syntax in incidentType wird per Regex blockiert', !invalidIncidentTypeChars.success);

  // --- 5. SOUVERÄNE ROOTLESS CONTAINER HARDENING INVARIANTS ---
  console.log('\n5. Prüfe gehärtetes BFF Dockerfile (packages/bff-server/Dockerfile)...');
  const dockerfilePath = path.join(ROOT_DIR, 'packages/bff-server/Dockerfile');
  assert('Dockerfile existiert', fs.existsSync(dockerfilePath));

  const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');

  assert(
    'Dockerfile deklariert unprivilegierten Benutzer (USER node / node:node)',
    dockerfileContent.includes('USER node:node') || dockerfileContent.includes('USER node')
  );

  assert(
    'Dockerfile nutzt Zero-Binary In-Process Healthcheck (node -e)',
    dockerfileContent.includes('node -e') && dockerfileContent.includes('require(\'http\')')
  );

  assert(
    'Kein curl oder wget im Produktions-Healthcheck referenziert',
    !dockerfileContent.includes('wget --') && !dockerfileContent.includes('curl -f')
  );

  assert(
    'Zero US-Cloud & Hetzner Souveränitäts-Metadaten deklariert',
    dockerfileContent.includes('de.campus-groovelab.sovereignty') &&
    dockerfileContent.includes('de.campus-groovelab.us-cloud-exposure="0%"')
  );

  assert(
    'Read-Only Permissions auf App-Dist (/app/dist) gesetzt',
    dockerfileContent.includes('chmod -R 555 /app/dist')
  );

  // --- ZUSAMMENFASSUNG ---
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`  BFF INGRESS & ROOTLESS AUDIT RESULT: ${passedTests}/${totalTests} TESTS BESTANDEN`);
  console.log('════════════════════════════════════════════════════════════════════\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runBffIngressValidationAudit().catch((err) => {
  console.error('Fataler Fehler in Ingress Validation Testsuite:', err);
  process.exit(1);
});

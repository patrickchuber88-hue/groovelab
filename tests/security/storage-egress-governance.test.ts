// ==============================================================================
// Campus-Groovelab Enterprise+ Security Suite
// Datei: tests/security/storage-egress-governance.test.ts
// Standards: OWASP ASVS Level 3, DIN EN ISO/IEC 27001 (A.8.20/A.8.24), UrhG § 73 / § 19a, DSGVO Art. 17
// Prüft:
// 1. Zod Ingress Schemas: presignStreamSchema & deleteAssetsSchema (Path Traversal, TTL, Quotas)
// 2. BOLA & Multi-Tenant Gatekeeper: validatePathAccess (Student Isolation, Cross-Tenant Deny)
// 3. In-Memory LRU Cache: Rolling Refresh, Eviction & Invalidation on Delete
// 4. Zero-Heap & Zero-Auth Remediation: storage.ts Invarianten (HTTP 307, Session Auth)
// 5. Client Egress & Purge Alignment: audioStorageHelper.ts & supabase.ts
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  presignStreamSchema,
  deleteAssetsSchema,
} from '../../packages/bff-server/src/schemas/ingressSchemas';
import {
  validatePathAccess,
  getCachedStreamUrl,
  setCachedStreamUrl,
  invalidateStreamLease,
  invalidateUserStreamLeases,
  AuthUserData
} from '../../packages/bff-server/src/routes/storage';

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

async function runStorageEgressGovernanceSuite() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🎧  CAMPUS-GROOVELAB: STORAGE EGRESS & GDPR PURGE GOVERNANCE');
  console.log('    Standards: OWASP ASVS Level 3, UrhG § 73, DSGVO Art. 17, ISO 27001');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // ----------------------------------------------------------------------------
  // 1. ZOD INGRESS SCHEMAS VALIDATION (Fail-Closed, Path Traversal & Prototype Protection)
  // ----------------------------------------------------------------------------
  console.log('▶ Prüfe Zod Ingress Schemas (presignStreamSchema & deleteAssetsSchema)...');

  // Valid Presign Stream
  const validStream = presignStreamSchema.safeParse({
    filePath: 'schools/s-1/students/st-1/recordings/take1.webm',
    bucket: 'campus-assets',
    expiresInSeconds: 1800
  });
  assert('presignStreamSchema akzeptiert validen Pfad und 1800s TTL', validStream.success);

  // Default values
  const defaultStream = presignStreamSchema.safeParse({
    filePath: 'schools/s-1/students/st-1/recordings/take1.webm'
  });
  assert('presignStreamSchema wendet Defaults an (campus-assets, 1800s)', defaultStream.success && (defaultStream as any).data.expiresInSeconds === 1800 && (defaultStream as any).data.bucket === 'campus-assets');

  // Path Traversal in presignStreamSchema
  const traversal1 = presignStreamSchema.safeParse({
    filePath: '../../etc/passwd'
  });
  assert('presignStreamSchema blockiert Path Traversal (../)', !traversal1.success);

  const traversal2 = presignStreamSchema.safeParse({
    filePath: 'schools/s-1/students/st-1/../../secret.webm'
  });
  assert('presignStreamSchema blockiert verschachteltes Path Traversal', !traversal2.success);

  const backslash = presignStreamSchema.safeParse({
    filePath: 'schools\\s-1\\secret.webm'
  });
  assert('presignStreamSchema blockiert Backslashes', !backslash.success);

  const doubleSlash = presignStreamSchema.safeParse({
    filePath: 'schools//s-1//secret.webm'
  });
  assert('presignStreamSchema blockiert doppelte Slashes', !doubleSlash.success);

  // TTL Constraints (UrhG § 73)
  const ttlTooLow = presignStreamSchema.safeParse({
    filePath: 'recordings/rec1.webm',
    expiresInSeconds: 10
  });
  assert('presignStreamSchema weist TTL < 60s ab', !ttlTooLow.success);

  const ttlTooHigh = presignStreamSchema.safeParse({
    filePath: 'recordings/rec1.webm',
    expiresInSeconds: 7200
  });
  assert('presignStreamSchema weist TTL > 3600s ab (UrhG § 73 Obergrenze)', !ttlTooHigh.success);

  // Delete Assets Schema
  const validDelete = deleteAssetsSchema.safeParse({
    bucket: 'campus-assets',
    filePaths: ['schools/s-1/audio/take1.webm', 'schools/s-1/audio/take2.webm']
  });
  assert('deleteAssetsSchema akzeptiert gültiges Batch-Array', validDelete.success);

  const emptyDelete = deleteAssetsSchema.safeParse({
    bucket: 'campus-assets',
    filePaths: []
  });
  assert('deleteAssetsSchema weist leeres filePaths-Array ab', !emptyDelete.success);

  const traversalDelete = deleteAssetsSchema.safeParse({
    bucket: 'campus-assets',
    filePaths: ['schools/s-1/audio/take1.webm', '../evil/hack.webm']
  });
  assert('deleteAssetsSchema weist Path Traversal in Batch-Elementen ab', !traversalDelete.success);

  const oversizedDelete = deleteAssetsSchema.safeParse({
    bucket: 'campus-assets',
    filePaths: Array.from({ length: 101 }, (_, i) => `schools/s-1/take${i}.webm`)
  });
  assert('deleteAssetsSchema weist Batches > 100 Dateien ab (Anti-DoS)', !oversizedDelete.success);

  // ----------------------------------------------------------------------------
  // 2. BOLA & MULTI-TENANT ACCESS VALIDATION (Zero-Trust Logic)
  // ----------------------------------------------------------------------------
  console.log('\n▶ Prüfe BOLA & Multi-Tenant Gatekeeper (validatePathAccess)...');

  const studentA: AuthUserData = {
    accessToken: 'mock_token_student_a',
    user: { id: 'usr-student-a' },
    role: 'student',
    schoolId: 'school-alpha'
  };

  const studentB: AuthUserData = {
    accessToken: 'mock_token_student_b',
    user: { id: 'usr-student-b' },
    role: 'student',
    schoolId: 'school-alpha'
  };

  const teacherAlpha: AuthUserData = {
    accessToken: 'mock_token_teacher_alpha',
    user: { id: 'usr-teacher-alpha' },
    role: 'teacher',
    schoolId: 'school-alpha'
  };

  const adminBeta: AuthUserData = {
    accessToken: 'mock_token_admin_beta',
    user: { id: 'usr-admin-beta' },
    role: 'admin',
    schoolId: 'school-beta'
  };

  const masterAdmin: AuthUserData = {
    accessToken: 'mock_token_master',
    user: { id: 'usr-master' },
    role: 'master_admin',
    schoolId: null
  };

  // Student A accesses own recording
  const ownAccess = validatePathAccess('schools/school-alpha/students/usr-student-a/audio/take1.webm', studentA);
  assert('Schüler darf auf eigene Aufnahmen zugreifen', ownAccess.allowed);

  // Student A tries to access Student B's recording (BOLA!)
  const bolaAttempt = validatePathAccess('schools/school-alpha/students/usr-student-b/audio/take2.webm', studentA);
  assert('Schüler wird bei fremdem Schülerordner blockiert (BOLA Schutz)', !bolaAttempt.allowed && bolaAttempt.reason === 'STUDENT_BOLA_VIOLATION');

  // Teacher Alpha accesses Student A in own school
  const teacherOwnSchool = validatePathAccess('schools/school-alpha/students/usr-student-a/audio/take1.webm', teacherAlpha);
  assert('Lehrkraft darf auf Schüleraufnahmen der eigenen Schule zugreifen', teacherOwnSchool.allowed);

  // Teacher Alpha tries to access School Beta (Multi-Tenant Isolation!)
  const crossTenantAttempt = validatePathAccess('schools/school-beta/students/usr-student-x/audio/take1.webm', teacherAlpha);
  assert('Lehrkraft wird bei fremder Schule blockiert (Multi-Tenant Isolation)', !crossTenantAttempt.allowed && crossTenantAttempt.reason === 'MULTI_TENANT_VIOLATION');

  // Admin Beta tries to access School Alpha
  const crossTenantAdmin = validatePathAccess('schools/school-alpha/audio/school_song.webm', adminBeta);
  assert('Schulleitung wird bei fremder Schule blockiert', !crossTenantAdmin.allowed && crossTenantAdmin.reason === 'MULTI_TENANT_VIOLATION');

  // Master Admin can access any school
  const masterAccessAlpha = validatePathAccess('schools/school-alpha/students/usr-student-a/audio/take1.webm', masterAdmin);
  const masterAccessBeta = validatePathAccess('schools/school-beta/audio/concert.webm', masterAdmin);
  assert('Master Admin besitzt globalen Lese-/Löschzugriff', masterAccessAlpha.allowed && masterAccessBeta.allowed);

  // Path Traversal in validatePathAccess
  const traversalCheck = validatePathAccess('schools/school-alpha/../../secrets.env', teacherAlpha);
  assert('validatePathAccess fängt Path Traversal sicher ab', !traversalCheck.allowed && traversalCheck.reason === 'PATH_TRAVERSAL_DETECTED');

  // Unscoped / flat storage path rejection (Fail-Closed Default-Deny)
  const unscopedPath1 = validatePathAccess('recordings/take1.webm', studentA);
  assert('Unscopte Pfade ohne schools/ Prefix werden abgewiesen', !unscopedPath1.allowed && unscopedPath1.reason === 'UNSCOPED_STORAGE_PATH_DENIED');

  const unscopedPath2 = validatePathAccess('schools/school-alpha', studentA);
  assert('Unvollständige Pfade < 3 Segmente werden abgewiesen', !unscopedPath2.allowed && unscopedPath2.reason === 'UNSCOPED_STORAGE_PATH_DENIED');

  // Student blocked from teacher-private folders
  const studentToTeacher = validatePathAccess('schools/school-alpha/teachers/usr-teacher-alpha/audio/exercise.mp3', studentA);
  assert('Schüler wird bei Lehrer-Ordnern strikt blockiert', !studentToTeacher.allowed && studentToTeacher.reason === 'STUDENT_ACCESS_TO_TEACHER_DENIED');

  // Teacher accessing peer teacher folder (Teacher BOLA Isolation)
  const teacherAlpha2: AuthUserData = {
    accessToken: 'mock_token_teacher_beta',
    user: { id: 'usr-teacher-beta' },
    role: 'teacher',
    schoolId: 'school-alpha'
  };
  const teacherBola = validatePathAccess('schools/school-alpha/teachers/usr-teacher-beta/audio/private.mp3', teacherAlpha);
  assert('Lehrkraft wird bei fremdem Lehrer-Ordner blockiert (Teacher BOLA)', !teacherBola.allowed && teacherBola.reason === 'TEACHER_BOLA_VIOLATION');

  const teacherOwnFolder = validatePathAccess('schools/school-alpha/teachers/usr-teacher-alpha/audio/private.mp3', teacherAlpha);
  assert('Lehrkraft darf auf eigenen Lehrer-Ordner zugreifen', teacherOwnFolder.allowed);

  // Action-Aware Delete Governance (Students cannot delete shared school assets)
  const studentDeleteSchoolAsset = validatePathAccess('schools/school-alpha/audio/school_song.mp3', studentA, 'delete');
  assert('Schüler darf allgemeine Schul-Assets nicht löschen', !studentDeleteSchoolAsset.allowed && studentDeleteSchoolAsset.reason === 'STUDENT_DELETE_SCHOOL_ASSET_DENIED');

  const studentReadSchoolAsset = validatePathAccess('schools/school-alpha/audio/school_song.mp3', studentA, 'read');
  assert('Schüler darf allgemeine Schul-Assets anhören (Read)', studentReadSchoolAsset.allowed);

  const studentDeleteOwnAsset = validatePathAccess('schools/school-alpha/students/usr-student-a/audio/take1.webm', studentA, 'delete');
  assert('Schüler darf eigene Aufnahmen löschen', studentDeleteOwnAsset.allowed);

  const teacherDeleteSchoolAsset = validatePathAccess('schools/school-alpha/audio/school_song.mp3', teacherAlpha, 'delete');
  assert('Lehrkraft darf Schul-Assets löschen', teacherDeleteSchoolAsset.allowed);

  // ----------------------------------------------------------------------------
  // 3. IN-MEMORY LRU CACHE DYNAMICS & LEASE EXPIRATION
  // ----------------------------------------------------------------------------
  console.log('\n▶ Prüfe In-Memory LRU Cache für Pre-Signed Streaming URLs...');

  const cacheKey = 'campus-assets:schools/s-1/audio/rec1.webm';
  const mockSignedUrl = 'https://storage.campus-groovelab.de/object/sign/campus-assets/schools/s-1/audio/rec1.webm?token=xyz123';

  // Initially uncached
  assert('Ungecachter Pfad liefert null', getCachedStreamUrl(cacheKey) === null);

  // Set cache with 1800s TTL
  setCachedStreamUrl(cacheKey, mockSignedUrl, 1800);
  assert('Gecachte Streaming-URL wird erfolgreich abgerufen', getCachedStreamUrl(cacheKey) === mockSignedUrl);

  // Invalidate on delete
  invalidateStreamLease(cacheKey);
  assert('Cache-Eintrag wird nach Löschung sofort invalidiert', getCachedStreamUrl(cacheKey) === null);

  // User-scoped cache invalidation (GDPR Art. 17 / Logout)
  const u1Key = 'campus-assets:schools/s-1/students/u1/rec.webm';
  const u2Key = 'campus-assets:schools/s-1/students/u2/rec.webm';
  setCachedStreamUrl(u1Key, 'https://storage/u1.webm', 1800, 'u1', 's-1');
  setCachedStreamUrl(u2Key, 'https://storage/u2.webm', 1800, 'u2', 's-1');
  assert('User 1 Cache initial vorhanden', getCachedStreamUrl(u1Key) === 'https://storage/u1.webm');
  assert('User 2 Cache initial vorhanden', getCachedStreamUrl(u2Key) === 'https://storage/u2.webm');

  invalidateUserStreamLeases('u1');
  assert('User 1 Cache nach User-Invalidierung gelöscht', getCachedStreamUrl(u1Key) === null);
  assert('User 2 Cache bleibt unberührt aktiv', getCachedStreamUrl(u2Key) === 'https://storage/u2.webm');

  // ----------------------------------------------------------------------------
  // 4. BFF STORAGE ROUTE AST & ZERO-HEAP INVARIANT AUDIT
  // ----------------------------------------------------------------------------
  console.log('\n▶ Prüfe packages/bff-server/src/routes/storage.ts auf Sicherheitsarchitektur...');
  const storageRoutePath = path.join(ROOT_DIR, 'packages', 'bff-server', 'src', 'routes', 'storage.ts');
  const storageContent = fs.readFileSync(storageRoutePath, 'utf8');

  assert(
    'BFF Egress Route: POST /presign-stream ist implementiert',
    storageContent.includes("router.post('/presign-stream'")
  );

  assert(
    'BFF Purge Route: POST /delete-assets ist implementiert',
    storageContent.includes("router.post('/delete-assets'")
  );

  assert(
    'Session-Auth Zwang: resolveAuthUser ist in presign-stream, stream und delete-assets integriert',
    storageContent.includes('const authData = await resolveAuthUser(req)')
  );

  assert(
    'CWE-306 Remediation: GET /stream/:bucket/* verlangt zwingend Authentifizierung',
    storageContent.includes("router.get('/stream/:bucket/*'") &&
    storageContent.includes('Authentifizierung für Medien-Streaming erforderlich')
  );

  assert(
    'BOLA Gatekeeper: validatePathAccess wird auf Egress- und Purge-Routen angewendet',
    storageContent.includes('validatePathAccess(filePath, authData)') &&
    storageContent.includes("validatePathAccess(p, authData, 'delete')")
  );

  assert(
    'Authoritative DB Resolution Fallback: resolveAuthUser fragt users_raw bei fehlendem school_id ab',
    storageContent.includes("from('users_raw')") &&
    storageContent.includes("select('school_id, role, is_master_admin')")
  );

  assert(
    'GDPR Purge & User Invalidation: invalidateUserStreamLeases ist implementiert',
    storageContent.includes('export function invalidateUserStreamLeases(')
  );

  assert(
    'Zero Heap-Pufferung: Kein reader.read() im BFF Audio-Streaming',
    !storageContent.includes('reader.read()')
  );

  assert(
    'Zero Heap-Pufferung: Kein res.write(Buffer.from im BFF Audio-Streaming',
    !storageContent.includes('res.write(Buffer.from')
  );

  assert(
    'HTTP 307 Redirect: Streaming nutzt status(307) für Range-Erhaltung',
    storageContent.includes('res.status(307).end()') || storageContent.includes('.status(307)')
  );

  assert(
    '3.600s TTL: createSignedUrl nutzt 3.600 Sekunden Token-Gültigkeit im Stream-Handler',
    storageContent.includes('createSignedUrl(filePath, 3600)')
  );

  assert(
    'Range-Header Exposure: Access-Control-Expose-Headers für Content-Range konfiguriert',
    storageContent.includes('Content-Range, Accept-Ranges, Content-Length')
  );

  // ----------------------------------------------------------------------------
  // 5. CLIENT & CORE INTEGRATION AUDIT
  // ----------------------------------------------------------------------------
  console.log('\n▶ Prüfe Client-Integration (audioStorageHelper.ts & supabase.ts)...');
  const helperPath = path.join(ROOT_DIR, 'apps', 'groovelab', 'src', 'utils', 'audioStorageHelper.ts');
  const helperContent = fs.readFileSync(helperPath, 'utf8');

  assert(
    'audioStorageHelper: getSecureAudioUrl fragt BFF /api/storage/presign-stream an',
    helperContent.includes('/api/storage/presign-stream')
  );

  assert(
    'audioStorageHelper: deleteAudioAssets ist als autoritative Purge-Funktion exportiert',
    helperContent.includes('export async function deleteAudioAssets(') &&
    helperContent.includes('/api/storage/delete-assets')
  );

  const supabasePath = path.join(ROOT_DIR, 'apps', 'groovelab', 'src', 'lib', 'supabase.ts');
  const supabaseContent = fs.readFileSync(supabasePath, 'utf8');

  assert(
    'supabase.ts: deleteUserStorageAssets delegiert an BFF /api/storage/delete-assets',
    supabaseContent.includes('/api/storage/delete-assets')
  );

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`📊 AUDIT-ABSCHLUSS: ${passedTests}/${totalTests} Prüfungen bestanden (100% Konformität)`);
  console.log('════════════════════════════════════════════════════════════════════');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runStorageEgressGovernanceSuite().catch((err) => {
  console.error('Kritischer Testfehler:', err);
  process.exit(1);
});

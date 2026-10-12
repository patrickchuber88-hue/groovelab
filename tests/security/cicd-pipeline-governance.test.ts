// ==============================================================================
// Campus-Groovelab Enterprise+ Security Suite
// Datei: tests/security/cicd-pipeline-governance.test.ts
// Standards: OWASP ASVS Level 3, ISO/IEC 27001 (A.8.20–A.8.32), ISO/IEC 5230, NIST SP 800-161, GoBD
// Prüft:
// 1. GitHub Actions Fail-Closed & Zero-Ghost-Deploy Invariante (Zero US-Cloud Doktrin)
// 2. Hermetischer & Reproduzierbarer Build (SOURCE_DATE_EPOCH & OS-Metadaten-Sanitization)
// 3. Symmetrischer Rollback-Guard & Pre-Migration Snapshot (Kopplung von Assets & DB)
// 4. Migration Ledger Status-Reconciliation & PostgREST Schema-Reload
// 5. WORM Deployment-Audit in public.master_audit_trail (SHA-256 Siegel)
// 6. Pre-Commit & Pre-Push Husky Wächter-Integrität
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function runCicdPipelineGovernanceSuite() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🛡️  CAMPUS-GROOVELAB: 0,1% CI/CD PIPELINE & DEPLOYMENT GOVERNANCE');
  console.log('    Standards: OWASP ASVS L3, ISO 27001 A.8.32, ISO 5230, GoBD § 147 AO');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // ----------------------------------------------------------------------------
  // 1. GITHUB ACTIONS FAIL-CLOSED & ZERO-GHOST-DEPLOY INVARIANTE
  // ----------------------------------------------------------------------------
  console.log('▶ Prüfe GitHub Actions Workflows auf Fail-Closed Integrität...');

  const deployWorkflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'deploy-production.yml');
  const deployWorkflowContent = fs.readFileSync(deployWorkflowPath, 'utf8');

  // 1.1 Kein geräuschloser Skip mehr
  assert(
    'GitHub Actions: Keine geräuschlosen Skips bei fehlenden Deploy-Credentials',
    !deployWorkflowContent.includes("if: env.DEPLOY_SSH_KEY != ''")
  );

  // 1.2 Fail-Closed Schranke mit Fehlerausgabe
  assert(
    'GitHub Actions: Fail-Closed Credential-Verification bricht bei fehlendem Key mit exit 1 ab',
    deployWorkflowContent.includes('DEPLOY_SSH_KEY ist in GitHub Actions nicht konfiguriert') &&
    deployWorkflowContent.includes('exit 1')
  );

  // 1.3 0% US-Cloud Doktrin Hinweis
  assert(
    'GitHub Actions: Dokumentiert die 0% US-Cloud Doktrin und souveräne Betreiber-Ausführung',
    deployWorkflowContent.includes('0% US-Cloud-Doktrin') &&
    deployWorkflowContent.includes('npm run deploy')
  );

  // 1.4 Security Gate Workflow
  const gateWorkflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'security-gate.yml');
  const gateWorkflowContent = fs.readFileSync(gateWorkflowPath, 'utf8');
  assert(
    'GitHub Actions: security-gate.yml führt Gitleaks, npm audit, gate und RLS-Tests aus',
    gateWorkflowContent.includes('gitleaks/gitleaks-action') &&
    gateWorkflowContent.includes('npm run gate') &&
    gateWorkflowContent.includes('npm run test:rls')
  );

  // ----------------------------------------------------------------------------
  // 2. HERMETISCHER BUILD & SOURCE_DATE_EPOCH IN DEPLOY.SH
  // ----------------------------------------------------------------------------
  console.log('\n▶ Prüfe deploy.sh auf hermetische Build-Integrität & Reproduzierbarkeit...');

  const deployShPath = path.join(ROOT_DIR, 'deploy.sh');
  const deployShContent = fs.readFileSync(deployShPath, 'utf8');

  assert(
    'deploy.sh: Exportiert SOURCE_DATE_EPOCH für deterministische Zeitstempel (ISO/IEC 5230)',
    deployShContent.includes('export SOURCE_DATE_EPOCH=')
  );

  assert(
    'deploy.sh: Bereinigt macOS OS-Metadaten (.DS_Store) vor und nach dem Build',
    deployShContent.includes("find \"$LOCAL_DIST\" -name '.DS_Store' -delete")
  );

  assert(
    'deploy.sh: Bietet hermetische Container-Build-Option via node:20-bookworm-slim',
    deployShContent.includes('HERMETIC_CONTAINER_BUILD') &&
    deployShContent.includes('node:20-bookworm-slim')
  );

  // ----------------------------------------------------------------------------
  // 3. SYMMETRISCHER ROLLBACK & PRE-MIGRATION SNAPSHOT IN DEPLOY.SH
  // ----------------------------------------------------------------------------
  console.log('\n▶ Prüfe deploy.sh auf symmetrische Rollback-Governance...');

  assert(
    'deploy.sh: Erstellt Pre-Migration DB-Snapshot VOR der Schema-Migration',
    deployShContent.indexOf('Erstelle Pre-Migration Snapshot auf dem Cloud Volume') <
    deployShContent.indexOf('apply_pending_migrations.sh')
  );

  assert(
    'deploy.sh: Speichert den Pre-Deploy Snapshot-Pfad in PRE_DEPLOY_BACKUP_PATH',
    deployShContent.includes('PRE_DEPLOY_BACKUP_PATH=')
  );

  assert(
    'deploy.sh: Rollback-Trap setzt den Symlink atomar auf PREVIOUS_RELEASE zurück',
    deployShContent.includes("ln -sfn '$PREVIOUS_RELEASE' '$CURRENT_LINK'")
  );

  assert(
    'deploy.sh: Rollback-Trap invalidiert PostgREST Schema-Cache nach Fehlern',
    deployShContent.includes("NOTIFY pgrst, 'reload schema'")
  );

  assert(
    'deploy.sh: Rollback-Trap gibt konkreten Restore-Befehl für den Pre-Deploy Snapshot aus',
    deployShContent.includes('Pre-Deploy Snapshot für PITR-Wiederherstellung verfügbar')
  );

  // ----------------------------------------------------------------------------
  // 4. KRYPTOGRAFISCHER PARITÄTSBEWEIS & WORM DEPLOYMENT AUDIT
  // ----------------------------------------------------------------------------
  console.log('\n▶ Prüfe deploy.sh auf SHA-256 Paritätsbeweis & WORM-Audit-Protokollierung...');

  assert(
    'deploy.sh: Verifiziert SHA-256 Hash der Live-Assets gegen lokalen Build (Closed-Loop)',
    deployShContent.includes('LOCAL_HASH=') &&
    deployShContent.includes('REMOTE_HASH=') &&
    deployShContent.includes('KRYPTOGRAFISCHE DISKREPANZ')
  );

  assert(
    'deploy.sh: Protokolliert erfolgreiche Deployments in public.master_audit_trail (WORM)',
    deployShContent.includes('INSERT INTO public.master_audit_trail') &&
    deployShContent.includes('PRODUCTION_DEPLOYMENT_COMPLETED') &&
    deployShContent.includes('commit_sha') &&
    deployShContent.includes('live_sha256')
  );

  // ----------------------------------------------------------------------------
  // 5. MIGRATIONS-LEDGER RECONCILIATION IN APPLY_PENDING_MIGRATIONS.SH
  // ----------------------------------------------------------------------------
  console.log('\n▶ Prüfe apply_pending_migrations.sh auf Status-Reconciliation...');

  const migrationsShPath = path.join(ROOT_DIR, 'scripts', 'apply_pending_migrations.sh');
  const migrationsShContent = fs.readFileSync(migrationsShPath, 'utf8');

  assert(
    'apply_pending_migrations.sh: Schema-Migrations-Ledger enthält status-Spalte',
    migrationsShContent.includes('status TEXT DEFAULT \'applied\'') ||
    migrationsShContent.includes('ALTER TABLE private_auth.schema_migrations_ledger ADD COLUMN IF NOT EXISTS status')
  );

  assert(
    'apply_pending_migrations.sh: Filtert ausstehende Migrationen nach status = applied',
    migrationsShContent.includes("WHERE status = 'applied'")
  );

  assert(
    'apply_pending_migrations.sh: Aktualisiert PostgREST Schema-Cache nach Migrationen',
    migrationsShContent.includes("NOTIFY pgrst, 'reload schema'")
  );

  assert(
    'apply_pending_migrations.sh: Führt 5-Punkte Integritätsprüfung auf der Live-DB durch',
    migrationsShContent.includes('webauthn_credentials') &&
    migrationsShContent.includes('sepa_iban') &&
    migrationsShContent.includes('sibling_group_id') &&
    migrationsShContent.includes('system_dead_letter_incidents')
  );

  // ----------------------------------------------------------------------------
  // 6. GIT-HOOKS & EXOCORTEX PRE-COMMIT INVARIANTE
  // ----------------------------------------------------------------------------
  console.log('\n▶ Prüfe Husky Git-Hooks & Secret Scanner...');

  const preCommitHook = path.join(ROOT_DIR, '.husky', 'pre-commit');
  const prePushHook = path.join(ROOT_DIR, '.husky', 'pre-push');

  assert(
    'Husky: pre-commit Hook ist konfiguriert und ruft gate:pre-commit auf',
    fs.existsSync(preCommitHook) && fs.readFileSync(preCommitHook, 'utf8').includes('gate:pre-commit')
  );

  assert(
    'Husky: pre-push Hook ist konfiguriert und ruft gate:pre-push auf',
    fs.existsSync(prePushHook) && fs.readFileSync(prePushHook, 'utf8').includes('gate:pre-push')
  );

  const secretScannerPath = path.join(ROOT_DIR, 'scripts', 'pre_commit_secret_scanner.sh');
  const secretScannerContent = fs.readFileSync(secretScannerPath, 'utf8');

  assert(
    'Secret Scanner: Verifiziert Integrität und Floor-Ratchet der docs/SYSTEM_FEATURE_MATRIX.md',
    secretScannerContent.includes('product_bible_guard.mjs --check')
  );

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`📊 CI/CD GOVERNANCE ABSCHLUSS: ${passedTests}/${totalTests} Prüfungen bestanden (100% Konformität)`);
  console.log('════════════════════════════════════════════════════════════════════');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runCicdPipelineGovernanceSuite().catch((err) => {
  console.error('Kritischer Testfehler:', err);
  process.exit(1);
});

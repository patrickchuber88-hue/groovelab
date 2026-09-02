#!/usr/bin/env node
// ==============================================================================
// 🛡️ Campus-Groovelab Enterprise+ Targeted Security Diff & AI Audit Engine
// Standards: OWASP ASVS Level 3 / Fail-Fast Cascading Gating / Frontier Safety Framework
// ==============================================================================

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('════════════════════════════════════════════════════════════════════');
console.log('🛡️  CAMPUS-GROOVELAB TARGETED AI SECURITY DIFF AUDIT ENGINE');
console.log('    Phase 1: Local AST Drift Guard ➔ Phase 2: Targeted Delta Extract');
console.log('════════════════════════════════════════════════════════════════════\n');

// ------------------------------------------------------------------------------
// GATE 1: RUN AST DRIFT GUARD (FAIL-FAST)
// ------------------------------------------------------------------------------
console.log('🔍 [GATE 1/2] Führe automatisierten AST Drift Guard aus...');
try {
  const guardPath = path.resolve(process.cwd(), 'scripts/security_drift_guard.mjs');
  const altGuardPath = path.resolve(process.cwd(), '../../scripts/security_drift_guard.mjs');
  const targetGuard = fs.existsSync(guardPath) ? guardPath : altGuardPath;

  execSync(`node "${targetGuard}"`, { stdio: 'inherit' });
  console.log('  ✅ Gate 1 bestanden: 0 statische Invarianten-Verletzungen.\n');
} catch (err) {
  console.error('\n❌ [GATE 1 ABBRUCH] Der AST Drift Guard hat Sicherheitsverstöße entdeckt!');
  console.error('   Behebe zuerst die statischen Verstöße, bevor ein KI-Audit angestoßen wird.');
  process.exit(1);
}

// ------------------------------------------------------------------------------
// GATE 2: EXTRACT TARGETED DELTA & RECENT MIGRATIONS
// ------------------------------------------------------------------------------
console.log('📦 [GATE 2/2] Extrahiere gezielten Git-Diff & betroffene Migrationen...');

const gitEnv = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_SYSTEM: '/dev/null'
};

let gitDiff = '';
try {
  // 1. Check uncommitted changes first (working tree + staging)
  gitDiff = execSync('git -c core.fsmonitor=false diff HEAD', { encoding: 'utf-8', env: gitEnv }).trim();

  // 2. If working tree is clean, get the diff of the most recent commit
  if (!gitDiff) {
    gitDiff = execSync('git -c core.fsmonitor=false diff HEAD~1 HEAD', { encoding: 'utf-8', env: gitEnv }).trim();
  }
} catch (err) {
  try {
    gitDiff = execSync('git -c core.fsmonitor=false diff', { encoding: 'utf-8', env: gitEnv }).trim();
  } catch (e) {
    gitDiff = 'Kein Git-Diff verfügbar.';
  }
}

// Extract affected migrations
let migrationsDelta = '';
try {
  const changedFiles = execSync('git -c core.fsmonitor=false status --porcelain', { encoding: 'utf-8', env: gitEnv });
  const migrationFiles = changedFiles
    .split('\n')
    .map(line => line.trim().split(/\s+/)[1])
    .filter(f => f && f.includes('supabase/migrations/') && f.endsWith('.sql'));

  if (migrationFiles.length > 0) {
    migrationsDelta += '\n### 🗄️ Neu hinzugefügte / geänderte Migrationen:\n';
    for (const mig of migrationFiles) {
      if (fs.existsSync(mig)) {
        const content = fs.readFileSync(mig, 'utf-8');
        migrationsDelta += `\n#### Datei: \`${mig}\`\n\`\`\`sql\n${content}\n\`\`\`\n`;
      }
    }
  }
} catch (e) {
  // Ignore git status errors
}

const diffLinesCount = gitDiff ? gitDiff.split('\n').length : 0;
console.log(`  ✓ Git-Diff erfolgreich extrahiert: ${diffLinesCount} Zeilen Delta.`);

// ------------------------------------------------------------------------------
// ASSEMBLE MASTER AUDIT PAYLOAD
// ------------------------------------------------------------------------------
const auditPayload = `# 🛡️ Targeted Security Audit Package (Ready for AI Evaluation)
**Plattform:** Campus-Groovelab  
**Standard:** OWASP ASVS Level 3 / Fail-Closed Doktrin / DSGVO Art. 25 & 32  
**Generierungszeitpunkt:** ${new Date().toISOString()}  
**Diff-Umfang:** ${diffLinesCount} Zeilen

---

## 🎯 Instruktion für das KI-Sicherheits-Audit (Master-Prompt v3.0)

Prüfe den folgenden zielgerichteten Code- und Migrations-Diff gegen die 4 Kern-Säulen des Campus-Groovelab Enterprise+ Standards:
1. **Autoritative Auth & Zero Secret Leakage:** Keine unmaskierten Spalten (PIN, Passwort, TOTP), keine PostgREST-Filter auf Token-Spalten.
2. **Mandantentrennung (Multi-Tenancy):** Strikte RLS-Policies (\`school_id = get_current_user_school_id()\`), keine Cross-Tenant-Lücken.
3. **Fail-Closed Doktrin & Storage-Scoping:** Keine unsicheren Fallbacks bei Timeouts, destruktive Aktionen auf eigenen Ordner gescoped.
4. **Privilege Escalation Schutz:** Rollen- und Master-Admin-Änderungen nur über gesicherte Server-RPCs.

Liefere einen tabellarischen Befundbericht (🟢 BESTANDEN / 🟡 WARNUNG / 🔴 KRITISCH) mit konkretem Zeilennachweis.

---

## 📄 Code-Delta (Targeted Git Diff)

\`\`\`diff
${gitDiff || 'Keine ungespeicherten Änderungen vorhanden.'}
\`\`\`

${migrationsDelta}
`;

// Save audit payload to output directory
const outDir = path.resolve(process.cwd(), 'apps/groovelab/dist');
const altOutDir = path.resolve(process.cwd(), 'dist');
const targetDir = fs.existsSync(outDir) ? outDir : (fs.existsSync(altOutDir) ? altOutDir : process.cwd());
const targetFile = path.join(targetDir, 'latest_audit_diff.md');

try {
  fs.writeFileSync(targetFile, auditPayload, 'utf-8');
  console.log(`\n💾 Audit-Payload erfolgreich gespeichert in:\n   👉 ${targetFile}`);
} catch (err) {
  console.log('\n(Audit-Payload im Arbeitsspeicher generiert)');
}

console.log('\n════════════════════════════════════════════════════════════════════');
console.log('✅ AUDIT-PREPARATION ERFOLGREICH ABGESCHLOSSEN');
console.log('   Der fokussierte Diff ist bereit für das 100% attention-scharfe KI-Audit.');
console.log('════════════════════════════════════════════════════════════════════\n');

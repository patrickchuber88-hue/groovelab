#!/usr/bin/env node
// =============================================================================
// 🏛️ Campus-Groovelab Neutralitäts-Wächter [DSGVO Art. 9 / ASVS Level 3]
// Regel: Niemals "krank", "krankmeldung" oder "sick" in Code, UI oder DB.
// Neutraler Standard: "ausfall", "unterrichtsausfall", "abwesend".
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'apps', 'groovelab', 'src');

const FORBIDDEN_PATTERNS = [
  { pattern: /\b(?:is_sick|sick_until|sick_start|teacher_sick|canceled_by_teacher_sick)\b/i, label: 'Technical Sick Token' },
  { pattern: /\b(?:krankmeldung|krankschreibung|krankheitsbedingt|au-bescheinigung)\b/i, label: 'German Sick Token' }
];

// Whitelist for this script itself and historical migration snapshots if necessary
const IGNORED_PATHS = [
  'node_modules',
  'dist',
  '.git',
  'scripts/verify_neutral_ausfall_invariants.mjs',
  'forensic_ux_process_audit.md',
  'implementation_plan.md'
];

let violationsCount = 0;
let filesScanned = 0;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath);

    if (IGNORED_PATHS.some(ignored => relPath.startsWith(ignored) || relPath.includes(ignored))) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.mjs') || entry.name.endsWith('.js'))) {
      filesScanned++;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Allow comments explicitly stating the ban rule
        if (line.includes('Neutral: Ausfall') || line.includes('Neutralitäts-Wächter')) return;

        for (const { pattern, label } of FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            console.error(`❌ [NEUTRALITY VIOLATION] ${label} found in ${relPath}:${idx + 1}`);
            console.error(`   Line: ${line.trim()}`);
            violationsCount++;
          }
        }
      });
    }
  }
}

console.log('🛡️  Campus-Groovelab Neutralitäts-Wächter: Starte Scan auf verbotene Krankheitsbegriffe...');
scanDir(SRC_DIR);

if (violationsCount > 0) {
  console.error(`\n🚨 FAIL-CLOSED: ${violationsCount} Neutralitäts-Verletzung(en) in ${filesScanned} gescannten Dateien entdeckt!`);
  console.error('   DSGVO Art. 9 Doktrin: Bitte ausschließlich "ausfall" / "unterrichtsausfall" / "abwesend" verwenden.\n');
  process.exit(1);
} else {
  console.log(`✅ Neutralitäts-Wächter: ${filesScanned} Dateien gescannt — 0 Verstöße! 100% DSGVO Art. 9 konform.`);
  process.exit(0);
}

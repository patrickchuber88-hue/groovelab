#!/usr/bin/env node
// =============================================================================
// 🏛️ Campus-Groovelab Monolith Ceiling & Zero-Inline-Feature Guard (0,1% Goldstandard)
// Standard:  0,1% Enterprise+ Architecture Goldstandard / Zero-Inline-Feature Axiom
// Checks:    1. Baseline Monolith Ceiling Check (Host files cannot grow beyond wiring buffer)
//            2. Ratchet-Down Mechanism (Baseline ceilings drop permanently upon refactoring)
//            3. New File Budget Check (New files must stay <= 1.500 lines; complex features must split)
// Runtime:   Native Node.js ESM — 100% in-memory (< 80ms)
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BASELINE_FILE = path.join(ROOT_DIR, 'scripts', 'monolith_baseline.json');
const SRC_DIR = path.join(ROOT_DIR, 'apps', 'groovelab', 'src');

const args = process.argv.slice(2);
const isUpdateBaseline = args.includes('--update-baseline');

let violationsCount = 0;
let passedChecks = 0;
let totalChecks = 0;

const HR = '═'.repeat(74);
process.stdout.write(`\n${HR}\n`);
process.stdout.write('  🏛️   Campus-Groovelab Monolith Ceiling & Zero-Inline-Feature Guard\n');
process.stdout.write('       Auditing Host File Growth, Ratchet-Down Ceilings & 1.500-Line Budget\n');
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

// Fast line counter using Buffer scan
function countLines(filePath) {
  if (!fs.existsSync(filePath)) return -1;
  const buffer = fs.readFileSync(filePath);
  let count = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 10) count++; // 10 is '\n'
  }
  // Count last line if file doesn't end in newline but is not empty
  if (buffer.length > 0 && buffer[buffer.length - 1] !== 10) {
    count++;
  }
  return count;
}

// Collect all ts/tsx files in target directory
function collectCodeFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'coverage', 'scratch'].includes(entry.name)) {
        results = results.concat(collectCodeFiles(fullPath));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      results.push(fullPath);
    }
  }
  return results;
}

// -----------------------------------------------------------------------------
// Check 1: Baseline Integrity & File Ceilings
// -----------------------------------------------------------------------------
if (!fs.existsSync(BASELINE_FILE)) {
  recordCheck('Baseline Configuration Exists', false, `scripts/monolith_baseline.json not found!`);
  process.exit(1);
}

const baselineData = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
const baselines = baselineData.baselines || {};
const MAX_NEW_FILE_LINES = baselineData.max_new_file_lines || 1500;
const MAX_WIRING_BUFFER = baselineData.max_host_wiring_buffer_lines || 15;

let ratchetedCount = 0;
let totalLinesSaved = 0;
let ceilingViolations = [];
let baselineUpdated = false;

const trackedKeys = Object.keys(baselines);

for (const relPath of trackedKeys) {
  const fullPath = path.join(ROOT_DIR, relPath);
  const baselineCount = baselines[relPath];
  const actualCount = countLines(fullPath);

  if (actualCount === -1) {
    // File was deleted or moved
    continue;
  }

  if (isUpdateBaseline) {
    baselines[relPath] = actualCount;
    baselineUpdated = true;
    continue;
  }

  const delta = actualCount - baselineCount;

  if (delta > MAX_WIRING_BUFFER) {
    ceilingViolations.push({
      file: relPath,
      baseline: baselineCount,
      actual: actualCount,
      delta,
      maxAllowed: baselineCount + MAX_WIRING_BUFFER
    });
  } else if (delta < 0) {
    // Ratchet down! The monolith shrunk!
    ratchetedCount++;
    totalLinesSaved += Math.abs(delta);
    baselines[relPath] = actualCount;
    baselineUpdated = true;
  }
}

if (ceilingViolations.length === 0) {
  recordCheck(
    'Monolith Ceiling & Wiring Buffer Compliance',
    true,
    `All ${trackedKeys.length} tracked monoliths strictly adhere to the <= ${MAX_WIRING_BUFFER}-lines mounting limit.`
  );
} else {
  const details = ceilingViolations
    .map(v => `${v.file}: ${v.actual} lines (Baseline: ${v.baseline}, +${v.delta} lines > max buffer ${MAX_WIRING_BUFFER})`)
    .join('\n            ↳ ');
  recordCheck(
    'Monolith Ceiling & Wiring Buffer Compliance',
    false,
    `Detected unauthorized inline feature expansion in existing monoliths:\n            ↳ ${details}`
  );
}

// -----------------------------------------------------------------------------
// Check 2: Ratchet-Down State
// -----------------------------------------------------------------------------
if (ratchetedCount > 0 || isUpdateBaseline) {
  baselineData.last_updated = new Date().toISOString();
  baselineData.baselines = baselines;
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(baselineData, null, 2) + '\n');
  recordCheck(
    'Ratchet-Down Ceiling Calibration',
    true,
    `Ceilings successfully ratcheted down across ${ratchetedCount} monoliths (-${totalLinesSaved} lines permanent reduction).`
  );
} else {
  recordCheck(
    'Ratchet-Down Ceiling Calibration',
    true,
    `All baseline ceilings at optimal ratchet level.`
  );
}

// -----------------------------------------------------------------------------
// Check 3: New Files Size Budget (<= 1.500 lines)
// -----------------------------------------------------------------------------
const allCodeFiles = collectCodeFiles(SRC_DIR);
let newFileViolations = [];
let checkedNewFilesCount = 0;

for (const fullPath of allCodeFiles) {
  const relPath = path.relative(ROOT_DIR, fullPath);
  if (baselines[relPath] !== undefined) {
    // Handled in Check 1
    continue;
  }

  checkedNewFilesCount++;
  const lines = countLines(fullPath);
  if (lines > MAX_NEW_FILE_LINES) {
    newFileViolations.push({
      file: relPath,
      lines
    });
  }
}

if (newFileViolations.length === 0) {
  recordCheck(
    'New File Size Budget (<= 1.500 lines)',
    true,
    `All ${checkedNewFilesCount} non-baseline files strictly comply with the <= ${MAX_NEW_FILE_LINES} lines budget.`
  );
} else {
  const details = newFileViolations
    .map(v => `${v.file}: ${v.lines} lines (exceeds budget limit of ${MAX_NEW_FILE_LINES} lines)`)
    .join('\n            ↳ ');
  recordCheck(
    'New File Size Budget (<= 1.500 lines)',
    false,
    `New feature file exceeds maximum monolith size budget. Split into tabs/modals sub-monoliths:\n            ↳ ${details}`
  );
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
process.stdout.write(`\n${HR}\n`);
process.stdout.write(`  AUDIT SUMMARY: ${passedChecks}/${totalChecks} Checks Passed | ${violationsCount} Violations\n`);
process.stdout.write(`${HR}\n\n`);

if (violationsCount > 0) {
  process.stderr.write(`💥 Monolith Growth Guard FAILED with ${violationsCount} violation(s).\n`);
  process.stderr.write(`   New features MUST be created in separate self-contained feature monoliths.\n`);
  process.stderr.write(`   Existing monoliths may only accept mounting/wiring (max ${MAX_WIRING_BUFFER} lines).\n\n`);
  process.exit(1);
} else {
  process.stdout.write(`✨ Monolith Growth Guard PASSED. Zero-Inline-Feature Axiom intact.\n\n`);
  process.exit(0);
}

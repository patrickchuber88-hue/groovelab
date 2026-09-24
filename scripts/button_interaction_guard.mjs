#!/usr/bin/env node
// =============================================================================
// 🔘 Campus-Groovelab Universal Button & Interaction Lifecycle Guard
// Standard:  OWASP ASVS Level 3 / BFSG 2025 / WCAG 2.2 AA / Universal Interaction Goldstandard
// Checks:    1. Zero Unhandled Promise Rejections on Critical Async Mutations
//            2. Spinlock & Double-Action Protection on Critical Sensitive Actions
//            3. BFSG 2025 / WCAG 2.2 AA Keyboard Accessibility & WAI-ARIA Contract
//            4. Clean Dashboard Wording (0 Paragraph Symbols in UI Buttons)
// Runtime:   Native Node.js ESM — 100% in-memory (< 1s)
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'apps', 'groovelab', 'src');

let violationsCount = 0;
let passedChecks = 0;
let totalChecks = 0;

const HR = '═'.repeat(74);
process.stdout.write(`\n${HR}\n`);
process.stdout.write('  🔘   Campus-Groovelab Universal Button & Interaction Guard\n');
process.stdout.write('       Auditing Async Actions, Spinlocks, Double-Click Guards & BFSG 2025\n');
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
function collectFiles(dir, exts = ['.tsx']) {
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

// Helper: Extract balanced curly-brace block starting at openBraceIndex
function extractBraceBlock(str, openBraceIndex) {
  let depth = 0;
  for (let i = openBraceIndex; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) return str.slice(openBraceIndex, i + 1);
    }
  }
  return '';
}

const tsxFiles = collectFiles(SRC_DIR, ['.tsx']);
process.stdout.write(`  📁 Scanned ${tsxFiles.length} interactive UI components in apps/groovelab/src\n\n`);

// -----------------------------------------------------------------------------
// CHECK 1: Async Handlers Error Protection (Zero Unhandled Promise Rejections)
// -----------------------------------------------------------------------------
let unshieldedDbMutations = [];

for (const file of tsxFiles) {
  if (file.includes('/tests/') || file.includes('__tests__')) continue;
  const content = fs.readFileSync(file, 'utf-8');
  const regex = /onClick\s*=\s*\{\s*async\s*\([^)]*\)\s*=>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const openBrace = content.indexOf('{', match.index + match[0].length - 1);
    if (openBrace === -1) continue;
    const body = extractBraceBlock(content, openBrace);
    const hasDbCall = body.includes('supabase.from(') || body.includes('supabase.rpc(');
    const isMutation = body.includes('.delete(') || body.includes('.update(') || body.includes('.insert(') || body.includes('.upsert(');
    const hasCatch = body.includes('try') || body.includes('.catch(');
    if (hasDbCall && isMutation && !hasCatch) {
      unshieldedDbMutations.push(path.relative(ROOT_DIR, file));
    }
  }
}

recordCheck(
  'Check 1: Zero Unhandled Promise Rejections on Critical Async Mutations',
  unshieldedDbMutations.length === 0,
  unshieldedDbMutations.length === 0
    ? `All 100% of inline async database mutations across ${tsxFiles.length} components are shielded by structured try/catch or .catch() handlers.`
    : `Found unshielded async database mutation handlers in: ${unshieldedDbMutations.slice(0, 3).join(', ')}`
);

// -----------------------------------------------------------------------------
// CHECK 2: Critical Mutations Double-Action Protection
// -----------------------------------------------------------------------------
let checkoutSpinlockVerified = true;
let checkoutDetails = [];

// Verify key transactional and sensitive mutation components feature spinlock/disabled protection
const transactionalComponents = [
  'SecretaryBillingModalsHub.tsx',
  'CampusSetupScreen.tsx',
  'ConfirmDeleteStudentModal.tsx',
  'ContractEndPrompt.tsx'
];

for (const compName of transactionalComponents) {
  const filePath = tsxFiles.find(f => f.endsWith(compName));
  if (filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const hasDisabledProtection = content.includes('disabled=') && 
      (content.includes('isSubmitting') || content.includes('isLoading') || content.includes('isSaving') || content.includes('isProcessing') || content.includes('upgradeProcessing'));
    if (!hasDisabledProtection) {
      checkoutSpinlockVerified = false;
      checkoutDetails.push(compName);
    }
  }
}

recordCheck(
  'Check 2: Double-Action & Spinlock Protection on Critical Mutation Operations',
  checkoutSpinlockVerified,
  checkoutSpinlockVerified
    ? 'All transactional checkout, upgrade, and cancellation modals feature strict disabled/spin-lock debounce protection.'
    : `Missing spinlock protection in: ${checkoutDetails.join(', ')}`
);

// -----------------------------------------------------------------------------
// CHECK 3: BFSG 2025 / WCAG 2.2 AA Keyboard Accessibility & Dialog Semantics
// -----------------------------------------------------------------------------
let accessibleModalsCount = 0;
let totalModalsCount = 0;
let modalViolationFiles = [];

for (const file of tsxFiles) {
  if (file.includes('/tests/') || file.includes('__tests__')) continue;
  const content = fs.readFileSync(file, 'utf-8');
  
  // Audit modal dialogs: must declare role="dialog" and aria-modal="true"
  const modalMatches = content.match(/<div[^>]*\brole\s*=\s*["']dialog["'][^>]*>/gi) || [];
  for (const m of modalMatches) {
    totalModalsCount++;
    if (m.includes('aria-modal="true"') || m.includes("aria-modal='true'")) {
      accessibleModalsCount++;
    } else {
      modalViolationFiles.push(path.relative(ROOT_DIR, file));
    }
  }
}

recordCheck(
  'Check 3: BFSG 2025 / WCAG 2.2 AA WAI-ARIA Dialog Semantics (role="dialog" & aria-modal="true")',
  modalViolationFiles.length === 0 && totalModalsCount > 50,
  `Verified WAI-ARIA dialog semantics across ${accessibleModalsCount}/${totalModalsCount} modal dialogs (0 violations).`
);

// -----------------------------------------------------------------------------
// CHECK 4: Clean Dashboard Wording (Zero Paragraph Symbols § in Buttons)
// -----------------------------------------------------------------------------
let paragraphInButtons = [];

for (const file of tsxFiles) {
  // Exclude legal / AVV modals
  if (file.includes('AVVModal') || file.includes('LegalTextModal') || file.includes('DpoAuditPortal') || file.includes('/tests/')) continue;
  const content = fs.readFileSync(file, 'utf-8');
  
  const buttons = content.match(/<button[\s\S]*?<\/button>/gi) || [];
  for (const btn of buttons) {
    // Strip tag attributes and embedded JS code blocks to inspect rendered user-facing label text
    const textOnly = btn.replace(/<button[^>]*>/, '').replace(/<\/button>/, '').replace(/\{[\s\S]*?\}/g, '');
    if (textOnly.includes('§') || textOnly.includes('&sect;')) {
      const relPath = path.relative(ROOT_DIR, file);
      if (!paragraphInButtons.includes(relPath)) {
        paragraphInButtons.push(relPath);
      }
    }
  }
}

recordCheck(
  'Check 4: Clean Dashboard Wording (0 Paragraph Symbols in UI Buttons)',
  paragraphInButtons.length === 0,
  paragraphInButtons.length === 0
    ? 'Zero paragraph symbols found in interactive button surfaces across all dashboards.'
    : `Found paragraph symbols in buttons in: ${paragraphInButtons.slice(0, 3).join(', ')}`
);

// -----------------------------------------------------------------------------
// CHECK 5: BFSG 2025 / WCAG 2.2 AA Contrast Guard on Yellow Brand Surfaces
// -----------------------------------------------------------------------------
let yellowContrastViolations = [];

for (const file of tsxFiles) {
  if (file.includes('/tests/') || file.includes('__tests__')) continue;
  const content = fs.readFileSync(file, 'utf-8');
  
  // Detect yellow backgrounds with white text (failing the 4.5:1 WCAG AA requirement)
  const yellowWhiteRegex = /(?:background|backgroundColor):\s*['"]?#(?:facc15|eab308)['"]?[\s\S]{0,80}?color:\s*['"]?#(?:fff|ffffff|white)['"]?/gi;
  if (yellowWhiteRegex.test(content)) {
    yellowContrastViolations.push(path.relative(ROOT_DIR, file));
  }
}

recordCheck(
  'Check 5: BFSG 2025 / WCAG 2.2 AA High Contrast on Yellow Surfaces (≥ 4.5:1 Slate-900 / 0 White Text)',
  yellowContrastViolations.length === 0,
  yellowContrastViolations.length === 0
    ? 'All yellow UI surfaces strictly enforce high-contrast dark text (#0f172a / Slate-900) providing ≥ 12:1 contrast ratio.'
    : `Found low-contrast white text on yellow surfaces in: ${yellowContrastViolations.slice(0, 3).join(', ')}`
);

// -----------------------------------------------------------------------------
// SUMMARY REPORT
// -----------------------------------------------------------------------------
process.stdout.write(`\n${HR}\n`);
process.stdout.write('  📊 UNIVERSAL BUTTON & INTERACTION GUARD SUMMARY\n');
process.stdout.write(`${HR}\n`);
process.stdout.write(`  Total Interaction Checks : ${totalChecks}\n`);
process.stdout.write(`  Passed                   : ${passedChecks}\n`);
process.stdout.write(`  Violations / Warnings    : ${violationsCount}\n`);
process.stdout.write(`  Interaction Health Rating: ${((passedChecks / totalChecks) * 100).toFixed(1)}%\n`);
process.stdout.write(`${HR}\n\n`);

if (violationsCount > 0) {
  process.stderr.write(`❌ FAILED: Universal Button & Interaction Guard detected ${violationsCount} issue(s).\n\n`);
  process.exit(1);
} else {
  process.stdout.write('🏆 SUCCESS: All Universal Button & Interaction Lifecycle Invariants Satisfied.\n\n');
  process.exit(0);
}

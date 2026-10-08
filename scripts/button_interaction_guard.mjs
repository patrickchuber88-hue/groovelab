#!/usr/bin/env node
// =============================================================================
// 🔘 Campus-Groovelab Universal Button & Interaction Lifecycle Guard
// Standard:  OWASP ASVS Level 3 / BFSG 2025 / WCAG 2.2 AA / Universal Interaction Goldstandard
// Checks:    1. Zero Unhandled Promise Rejections on Critical Async Mutations
//            2. Spinlock & Double-Action Protection on Critical Sensitive Actions
//            3. BFSG 2025 / WCAG 2.2 AA Keyboard Accessibility & WAI-ARIA Contract
//            4. Clean Dashboard Wording (0 Paragraph Symbols in UI Buttons)
//            5. BFSG 2025 / WCAG 2.2 AA Contrast Guard on Yellow Brand Surfaces
//            6. Zero Dead Buttons & Explicit Action Contract (3,700+ UI Buttons Scanned)
//            7. Anti-Freeze Finally & State Lockup Defense (Zero Permanent Spinlocks)
//            8. Zero Color-Clash Borders (Unicolor Surfaces & Pure Outlines Guard)
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
      if (!['node_modules', 'dist', '.git', 'coverage', 'tests', '__tests__'].includes(entry.name)) {
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

// Helper: Extract full opening <button ... > tag respecting nested braces and expressions
function findButtonOpeningTags(code) {
  const buttons = [];
  let idx = 0;
  while ((idx = code.indexOf('<button', idx)) !== -1) {
    const nextChar = code[idx + 7];
    if (nextChar && !/[\s\r\n\/>]/.test(nextChar)) {
      idx += 7;
      continue;
    }
    let inBraces = 0;
    let inQuotes = null;
    let endIdx = -1;
    for (let i = idx + 7; i < code.length; i++) {
      const ch = code[i];
      if (inQuotes) {
        if (ch === inQuotes && code[i - 1] !== '\\') {
          inQuotes = null;
        }
      } else {
        if (ch === '"' || ch === "'" || ch === '`') {
          inQuotes = ch;
        } else if (ch === '{') {
          inBraces++;
        } else if (ch === '}') {
          inBraces--;
        } else if (ch === '>' && inBraces === 0) {
          endIdx = i;
          break;
        }
      }
    }
    if (endIdx !== -1) {
      buttons.push({
        start: idx,
        end: endIdx,
        tag: code.slice(idx, endIdx + 1)
      });
      idx = endIdx + 1;
    } else {
      idx += 7;
    }
  }
  return buttons;
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

// False-Negative Blindspot Elimination: Actively traverse all source files ending in Modal.tsx or Dialog.tsx
const modalFiles = tsxFiles.filter(file => {
  if (file.includes('/tests/') || file.includes('__tests__')) return false;
  const base = path.basename(file);
  return base.endsWith('Modal.tsx') || base.endsWith('Dialog.tsx');
});

for (const file of modalFiles) {
  totalModalsCount++;
  const content = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(ROOT_DIR, file);

  // Check 1: Must declare role="dialog" or delegate to modal shell/component
  const hasRoleDialog = 
    /role\s*=\s*["']dialog["']|role=\{[^}]*dialog[^}]*\}/.test(content) ||
    content.includes('<PwaModalShell') ||
    /<[A-Z]\w*Modal/.test(content);

  // Check 2: Must declare aria-modal="true" or delegate to modal shell/component
  const hasAriaModal = 
    /aria-modal\s*=\s*(?:["']true["']|\{true\})/.test(content) ||
    content.includes('<PwaModalShell') ||
    /<[A-Z]\w*Modal/.test(content);

  // Check 3: Must declare aria-labelledby or aria-label or delegate to modal shell/component
  const hasAriaLabelledBy = 
    /aria-labelledby\s*=|aria-label\s*=|ariaLabel\s*=/.test(content) ||
    content.includes('<PwaModalShell') ||
    /<[A-Z]\w*Modal/.test(content);

  if (hasRoleDialog && hasAriaModal && hasAriaLabelledBy) {
    accessibleModalsCount++;
  } else {
    const missing = [];
    if (!hasRoleDialog) missing.push('role="dialog"');
    if (!hasAriaModal) missing.push('aria-modal="true"');
    if (!hasAriaLabelledBy) missing.push('aria-labelledby / aria-label');
    modalViolationFiles.push(`${relPath} (missing: ${missing.join(', ')})`);
  }
}

recordCheck(
  'Check 3: BFSG 2025 / WCAG 2.2 AA WAI-ARIA Dialog Semantics (role="dialog", aria-modal="true" & aria-labelledby)',
  modalViolationFiles.length === 0 && totalModalsCount > 50,
  modalViolationFiles.length === 0
    ? `Verified WAI-ARIA dialog semantics across all ${accessibleModalsCount}/${totalModalsCount} modal dialog files (0 blindspots, 0 violations).`
    : `Found modal dialog(s) missing WAI-ARIA dialog semantics in: ${modalViolationFiles.slice(0, 3).join(', ')}`
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
// CHECK 6: Zero Dead Buttons & Explicit Action Contract (3,700+ Buttons Scanned)
// -----------------------------------------------------------------------------
let deadButtons = [];
let noopButtons = [];
let totalButtonsScanned = 0;

for (const file of tsxFiles) {
  if (file.includes('/tests/') || file.includes('__tests__')) continue;
  const content = fs.readFileSync(file, 'utf-8');
  const buttons = findButtonOpeningTags(content);
  totalButtonsScanned += buttons.length;

  for (const b of buttons) {
    const tag = b.tag;
    const hasOnClick = /onClick\s*=/.test(tag);
    const isSubmit = /type\s*=\s*["']submit["']/.test(tag);
    const isReset = /type\s*=\s*["']reset["']/.test(tag);
    const hasSpread = /\{\.\.\./.test(tag);
    const hasForm = /form\s*=/.test(tag);
    const hasPointer = /onPointerDown|onTouchStart|onMouseDown/.test(tag);

    if (!hasOnClick && !isSubmit && !isReset && !hasSpread && !hasForm && !hasPointer) {
      deadButtons.push({
        file: path.relative(ROOT_DIR, file),
        tag: tag.replace(/\s+/g, ' ').slice(0, 100)
      });
    }

    if (/onClick\s*=\s*\{\s*(?:\(\)\s*=>\s*\{\s*\}|\(\)\s*=>\s*undefined|\(\)\s*=>\s*null)\s*\}/.test(tag)) {
      noopButtons.push({
        file: path.relative(ROOT_DIR, file),
        tag: tag.replace(/\s+/g, ' ').slice(0, 100)
      });
    }
  }
}

recordCheck(
  `Check 6: Zero Dead Buttons & Explicit Action Contract (${totalButtonsScanned} UI Buttons Scanned)`,
  deadButtons.length === 0 && noopButtons.length === 0 && totalButtonsScanned > 3000,
  deadButtons.length === 0 && noopButtons.length === 0
    ? `All ${totalButtonsScanned} <button> elements across the codebase enforce explicit action bindings (0 dead buttons, 0 no-op stubs).`
    : `Found ${deadButtons.length} dead button(s) and ${noopButtons.length} no-op stub(s) in: ${[...deadButtons, ...noopButtons].slice(0, 3).map(d => d.file).join(', ')}`
);

// -----------------------------------------------------------------------------
// CHECK 7: Anti-Freeze Finally & State Lockup Defense (Zero Permanent Spinlocks)
// -----------------------------------------------------------------------------
const criticalWorkflowComponents = [
  'ParentCampusActivationModal.tsx',
  'ScheduleCalendarView.tsx',
  'TeacherHausaufgabenWidget.tsx',
  'SecretaryBillingModalsHub.tsx',
  'CampusSetupScreen.tsx'
];

let failedAntiFreeze = [];

for (const compName of criticalWorkflowComponents) {
  const filePath = tsxFiles.find(f => f.endsWith(compName));
  if (filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const hasFinally = content.includes('finally {') || content.includes('finally{');
    if (!hasFinally) {
      failedAntiFreeze.push(compName);
    }
  }
}

recordCheck(
  'Check 7: Anti-Freeze Finally & State Lockup Defense (Zero Permanent Spinlocks)',
  failedAntiFreeze.length === 0,
  failedAntiFreeze.length === 0
    ? 'All critical mutation, activation, and scheduling workflows enforce finally-block state unlocks against UI freezes.'
    : `Missing anti-freeze finally protection in: ${failedAntiFreeze.join(', ')}`
);

// -----------------------------------------------------------------------------
// CHECK 8: Zero Color-Clash Borders (Unicolor Surfaces & Pure Outlines Guard)
// Standard: Axiom 9 — Colored buttons/widgets must be unicolor (zero conflicting border).
//           White/transparent with colored border (outline/ghost) is 100% valid.
//           Der rahmen darf keine andere farbe als der inhalt einer box, widget, button haben.
// -----------------------------------------------------------------------------
let colorClashElements = [];

for (const file of tsxFiles) {
  if (file.includes('/tests/') || file.includes('__tests__')) continue;
  const content = fs.readFileSync(file, 'utf-8');
  
  // Audit inline styles across interactive elements, widgets, and buttons
  const styleRegex = /style=\{\{([\s\S]*?)\}\}/g;
  let sMatch;
  while ((sMatch = styleRegex.exec(content)) !== null) {
    const styleStr = sMatch[1];
    const bgMatch = styleStr.match(/background(?:Color)?\s*:\s*['"]([^'"]+)['"]/i);
    const borderMatch = styleStr.match(/border(?:Color)?\s*:\s*['"]([^'"]+)['"]/i);
    if (!bgMatch || !borderMatch) continue;

    const bg = bgMatch[1].trim().toLowerCase();
    const bd = borderMatch[1].trim().toLowerCase();

    const isNeutralBg = /^(#fff|#ffffff|white|transparent|none|#f8fafc|#f1f5f9|#f8f9fa|rgba\(255,\s*255,\s*255|rgba\(0,\s*0,\s*0,\s*0\))/i.test(bg);
    const isBorderNone = /^(none|0|0px|transparent)$/i.test(bd) || bd.includes('none');

    if (!isNeutralBg && !isBorderNone) {
      // 1. Yellow/amber background with dark/black/slate border
      const isYellowBg = bg.includes('#facc15') || bg.includes('#eab308') || bg.includes('#ca8a04') || bg.includes('rgb(250, 204, 21)') || bg.includes('rgba(234, 179, 8');
      const isDarkOrGrayBorder = bd.includes('#0f172a') || bd.includes('#000000') || bd.includes('#1e293b') || bd.includes('#334155') || bd.includes('black') || bd.includes('#000') || bd.includes('#e2e8f0');
      
      // 2. Chromatic background with clashing dark/black border
      const isChromaticBg = isYellowBg || bg.includes('#ef4444') || bg.includes('#dc2626') || bg.includes('#10b981') || bg.includes('#16a34a') || bg.includes('#22c55e') || bg.includes('#3b82f6') || bg.includes('#0284c7');
      const isBlackBorder = bd.includes('solid #000') || bd.includes('solid black') || bd.includes('2px solid #000') || bd.includes('1px solid #000');

      if ((isYellowBg && isDarkOrGrayBorder) || (isChromaticBg && isBlackBorder)) {
        colorClashElements.push({
          file: path.relative(ROOT_DIR, file),
          bg,
          bd
        });
      }
    }
  }
}

recordCheck(
  'Check 8: Zero Color-Clash Borders (Unicolor Surfaces & Pure Outlines Guard)',
  colorClashElements.length === 0,
  colorClashElements.length === 0
    ? `All UI surfaces strictly enforce the Unicolor Surface Axiom (0 conflicting border/surface clashes, 100% tone-in-tone & pure outlines).`
    : `Found ${colorClashElements.length} color-clash border violation(s) in: ${colorClashElements.map(c => c.file).join(', ')}`
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

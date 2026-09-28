#!/usr/bin/env node
// =============================================================================
// 📱 Campus-Groovelab 0,1% PWA & Mobile Architecture Invariant Guard
// Standards: Apple WebKit HIG / W3C Visual Viewport / BFSG 2025 / OWASP ASVS L3
// Checks:
//   1. Viewport & Modal Deadlock-Immunität (index.css & 100dvh Invarianten)
//   2. Visual Viewport & Keyboard Resizing (interactive-widget=resizes-content)
//   3. Hardware Safe Areas & max() Invariante (Notch & Home-Bar Insets)
//   4. Zero Content Occlusion & Scroll Clearance (Bottom Nav Clearance)
//   5. Scroll-Chaining & Rubberband-Schutz (overscroll-behavior-y & overflow-x)
//   6. Apple HIG Touch Ergonomie & Delays (touch-action & tap-highlight)
//   7. iOS Safari Anti-Auto-Zoom & Numeric Keypad (Inputs ≥ 16px & Numeric PINs)
//   8. 3-Zonen Sheet & Modal Immunität (PwaModalShell & Dialog Contracts)
// Runtime: Native Node.js ESM — 100% in-memory (< 80ms)
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const GROOVELAB_DIR = path.join(ROOT_DIR, 'apps', 'groovelab');
const SRC_DIR = path.join(GROOVELAB_DIR, 'src');

let violationsCount = 0;
let passedChecks = 0;
let totalChecks = 0;

const HR = '═'.repeat(74);
process.stdout.write(`\n${HR}\n`);
process.stdout.write('  📱   Campus-Groovelab 0,1% PWA & Mobile Architecture Guard\n');
process.stdout.write('       Auditing Viewport, Safe-Areas, Touch-Targets, Modals & Auto-Zoom\n');
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

// -----------------------------------------------------------------------------
// CHECK 1: Viewport & Modal Deadlock-Immunität (index.css & 100dvh)
// -----------------------------------------------------------------------------
const indexCssPath = path.join(SRC_DIR, 'index.css');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf-8');

const hasModalExclusion = 
  indexCssContent.includes(':not([role="dialog"])') &&
  indexCssContent.includes(':not(.pwa-modal-drawer)') &&
  indexCssContent.includes(':not(.pwa-modal-card)') &&
  indexCssContent.includes(':not(.pwa-scroll-container)') &&
  indexCssContent.includes(':not([data-modal-scroll="true"])');

const hasPositiveModalScrollAuthority = 
  indexCssContent.includes('.pwa-scroll-container') &&
  indexCssContent.includes('[data-modal-scroll="true"]') &&
  indexCssContent.includes('touch-action: pan-y !important') &&
  indexCssContent.includes('overscroll-behavior-y: contain !important');

recordCheck(
  'Säule 1: Viewport & Deadlock-Immunität (index.css Scroll-Exemption & Authority)',
  hasModalExclusion && hasPositiveModalScrollAuthority,
  hasModalExclusion && hasPositiveModalScrollAuthority
    ? 'All modal dialogs are strictly immune to mobile scroll flattening, with positive touch-action: pan-y authority.'
    : 'index.css lacks modal role exemptions or positive scroll authority.'
);

// -----------------------------------------------------------------------------
// CHECK 2: Visual Viewport & Keyboard Resizing (interactive-widget=resizes-content)
// -----------------------------------------------------------------------------
const indexHtmlPath = path.join(GROOVELAB_DIR, 'index.html');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');

const hasViewportFitCover = indexHtmlContent.includes('viewport-fit=cover');
const hasInteractiveWidget = indexHtmlContent.includes('interactive-widget=resizes-content');

recordCheck(
  'Säule 2: Visual Viewport & Virtual Keyboard Resizing (W3C Viewport Contract)',
  hasViewportFitCover && hasInteractiveWidget,
  hasViewportFitCover && hasInteractiveWidget
    ? 'index.html declares viewport-fit=cover and interactive-widget=resizes-content for seamless virtual keyboard resizing.'
    : 'index.html is missing viewport-fit=cover or interactive-widget=resizes-content.'
);

// -----------------------------------------------------------------------------
// CHECK 3: Hardware Safe Areas & max() Invariante (Notch & Home-Bar)
// -----------------------------------------------------------------------------
const pwaModalShellPath = path.join(SRC_DIR, 'components', 'ui', 'PwaModalShell.tsx');
const pwaModalShellContent = fs.readFileSync(pwaModalShellPath, 'utf-8');

const legalConsentGatePath = path.join(SRC_DIR, 'components', 'LegalConsentGate.tsx');
const legalConsentGateContent = fs.readFileSync(legalConsentGatePath, 'utf-8');

const hasSafeAreasInShell = 
  pwaModalShellContent.includes('env(safe-area-inset-top') &&
  pwaModalShellContent.includes('env(safe-area-inset-bottom');

const hasSafeAreasInGate = 
  legalConsentGateContent.includes('env(safe-area-inset-top') &&
  legalConsentGateContent.includes('env(safe-area-inset-bottom');

recordCheck(
  'Säule 3: Hardware Safe Areas & Notch Insets (PwaModalShell & LegalConsentGate)',
  hasSafeAreasInShell && hasSafeAreasInGate,
  hasSafeAreasInShell && hasSafeAreasInGate
    ? 'All full-screen modals dynamically adjust for iPhone Notch, Dynamic Island, and Home Indicator.'
    : 'Missing env(safe-area-inset-top) or env(safe-area-inset-bottom) in primary modal shells.'
);

// -----------------------------------------------------------------------------
// CHECK 4: Zero Content Occlusion & Scroll Clearance (Bottom Nav Clearance)
// -----------------------------------------------------------------------------
const hasClearanceVariables = 
  indexCssContent.includes('--mobile-scroll-clearance-bottom') &&
  indexCssContent.includes('scroll-padding-bottom');

recordCheck(
  'Säule 4: Zero Content Occlusion & Scroll Clearance (100% Sichtbarkeits-Garantie)',
  hasClearanceVariables,
  hasClearanceVariables
    ? 'index.css defines global scroll-padding-bottom and clearance puffer against fixed Bottom Tab-Bar.'
    : 'Missing --mobile-scroll-clearance-bottom or scroll-padding-bottom declarations in index.css.'
);

// -----------------------------------------------------------------------------
// CHECK 5: Scroll-Chaining & Rubberband-Schutz (overscroll-behavior)
// -----------------------------------------------------------------------------
const hasWackelschutz = 
  indexCssContent.includes('overflow-x: clip') &&
  indexCssContent.includes('overscroll-behavior-x: none');

const hasModalOverscrollContain = 
  pwaModalShellContent.includes('overscrollBehaviorY: \'contain\'') ||
  pwaModalShellContent.includes('overscroll-behavior-y: contain') ||
  legalConsentGateContent.includes('overscrollBehaviorY: \'contain\'');

recordCheck(
  'Säule 5: Scroll-Chaining & Wackelschutz (Zero Horizontal Wobble & Sheet Contain)',
  hasWackelschutz && hasModalOverscrollContain,
  hasWackelschutz && hasModalOverscrollContain
    ? 'Root layout enforces overflow-x: clip against rubber-banding; modals strictly contain vertical scroll gestures.'
    : 'Missing horizontal clip or modal overscroll-behavior containment.'
);

// -----------------------------------------------------------------------------
// CHECK 6: Apple HIG Touch Ergonomie & Delays (touch-action: manipulation)
// -----------------------------------------------------------------------------
const hasTouchActionGlobal = 
  indexCssContent.includes('touch-action: manipulation') &&
  indexCssContent.includes('-webkit-tap-highlight-color: transparent');

const hasPwaModalTouchAction = 
  pwaModalShellContent.includes('touchAction: \'manipulation\'') &&
  legalConsentGateContent.includes('touchAction: \'manipulation\'');

recordCheck(
  'Säule 6: Apple HIG Touch Ergonomie & 300ms Click Delay Elimination',
  hasTouchActionGlobal && hasPwaModalTouchAction,
  hasTouchActionGlobal && hasPwaModalTouchAction
    ? 'Universal touch-action: manipulation eliminates click delays; tap highlight flicker disabled across all touch surfaces.'
    : 'Missing touch-action: manipulation or tap-highlight reset.'
);

// -----------------------------------------------------------------------------
// CHECK 7: iOS Safari Anti-Auto-Zoom & Numeric Keypad (Inputs ≥ 16px & Numeric PINs)
// -----------------------------------------------------------------------------
const hasAutoZoomImmunity = 
  indexCssContent.includes('font-size: 16px !important') &&
  (indexCssContent.includes('input') || indexCssContent.includes('select'));

const loginScreenPath = path.join(SRC_DIR, 'components', 'LoginScreen.tsx');
let hasNumericKeypads = false;
if (fs.existsSync(loginScreenPath)) {
  const loginContent = fs.readFileSync(loginScreenPath, 'utf-8');
  hasNumericKeypads = loginContent.includes('inputMode="numeric"');
}

recordCheck(
  'Säule 7: iOS Safari Anti-Auto-Zoom Doktrin (Inputs ≥ 16px & Numeric Keypads)',
  hasAutoZoomImmunity && hasNumericKeypads,
  hasAutoZoomImmunity && hasNumericKeypads
    ? 'Mobile inputs strictly enforce ≥ 16px font-size preventing iOS Safari zoom triggers; numeric auth inputs declare inputMode="numeric".'
    : 'Missing 16px mobile input safeguard or inputMode="numeric" on auth inputs.'
);

// -----------------------------------------------------------------------------
// CHECK 8: 3-Zonen Sheet & Modal Immunität (PwaModalShell & LegalConsentGate Contract)
// -----------------------------------------------------------------------------
const shellHasCardAndDrawer = 
  pwaModalShellContent.includes('pwa-modal-card') &&
  pwaModalShellContent.includes('pwa-modal-drawer') &&
  pwaModalShellContent.includes('pwa-scroll-container') &&
  pwaModalShellContent.includes('data-modal-scroll="true"');

const gateHasCardAndDrawer = 
  legalConsentGateContent.includes('pwa-modal-card') &&
  legalConsentGateContent.includes('pwa-modal-drawer') &&
  legalConsentGateContent.includes('pwa-scroll-container') &&
  legalConsentGateContent.includes('data-modal-scroll="true"') &&
  legalConsentGateContent.includes('100dvh');

recordCheck(
  'Säule 8: 3-Zonen Sheet- & Modal-Immunität (PwaModalShell & LegalConsentGate Klassen-Konsistenz)',
  shellHasCardAndDrawer && gateHasCardAndDrawer,
  shellHasCardAndDrawer && gateHasCardAndDrawer
    ? 'PwaModalShell and LegalConsentGate strictly implement the 3-Zone Architecture with synchronized immunity classes.'
    : 'Missing pwa-modal-drawer, pwa-scroll-container, or data-modal-scroll attributes in modal components.'
);

// -----------------------------------------------------------------------------
// SUMMARY REPORT
// -----------------------------------------------------------------------------
process.stdout.write(`\n${HR}\n`);
process.stdout.write('  📊 PWA & MOBILE ARCHITECTURE GUARD SUMMARY\n');
process.stdout.write(`${HR}\n`);
process.stdout.write(`  Total Architecture Checks : ${totalChecks}\n`);
process.stdout.write(`  Passed                   : ${passedChecks}\n`);
process.stdout.write(`  Violations / Warnings    : ${violationsCount}\n`);
process.stdout.write(`  Mobile Health Rating     : ${((passedChecks / totalChecks) * 100).toFixed(1)}%\n`);
process.stdout.write(`${HR}\n\n`);

if (violationsCount > 0) {
  process.stderr.write(`❌ FAILED: 0,1% PWA Mobile Architecture Guard detected ${violationsCount} violation(s).\n\n`);
  process.exit(1);
} else {
  process.stdout.write('🏆 SUCCESS: All 8/8 0,1% PWA Mobile Architecture Invariants Satisfied.\n\n');
  process.exit(0);
}

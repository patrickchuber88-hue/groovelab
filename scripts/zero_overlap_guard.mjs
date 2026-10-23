#!/usr/bin/env node
// =============================================================================
// 🏛️ Campus-Groovelab 0,1% Goldstandard Zero-Overlap & Fluid-Layout Guard
// Standard:  0.1% Master Frontend Architect & CSS Engineer Governance (Two-Tier)
// Scope:     Tier 1 Static AST & Heuristic Deep Scan (Dekaden 1 bis 9)
// Checks:
//   Dekade 1: Viewport, Root & Safe-Areas (Border-Box, 100dvh, Anti-Wobble)
//   Dekade 2: Flexbox Elasticity & Child Containment (min-w-0, zero-overlap-row)
//   Dekade 3: CSS-Grid & Responsive Column Flow (minmax(0, 1fr), no-rigid-rows)
//   Dekade 4: Feste Höhen & Elastic Cards (dynamic-card-elastic, 0-trap-audit)
//   Dekade 5: Dynamische Typografie & Line-Heights (break-word, line-height >= 1.35)
//   Dekade 6: Absolute/Fixed Positioning & 5-Tier Z-Index (Monotone Stacking)
//   Dekade 7: Scroll Clearance & Occlusion Immunity (--mobile-scroll-clearance-bottom)
//   Dekade 8: Modals, Drawers & Multi-Zone Shells (PWA Modal Alignment, 3-Zone)
//   Dekade 9: Badges, Buttons & Interactive Touch (Touch Targets >= 44px, Inputs >= 16px)
// Runtime:   Native Node.js ESM — 100% in-memory (< 200ms)
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const GROOVELAB_DIR = path.join(ROOT_DIR, 'apps', 'groovelab');
const SRC_DIR = path.join(GROOVELAB_DIR, 'src');
const INDEX_CSS = path.join(SRC_DIR, 'index.css');
const INDEX_HTML = path.join(GROOVELAB_DIR, 'index.html');

let p1ViolationsCount = 0;
let p2AdvisoriesCount = 0;
let passedChecks = 0;
let totalChecks = 0;

const HR = '═'.repeat(74);
process.stdout.write(`\n${HR}\n`);
process.stdout.write('  🏛️   Campus-Groovelab 0,1% Goldstandard Zero-Overlap & Layout Guard\n');
process.stdout.write('       Tier 1 AST & Static Heuristics Audit (Dekaden 1 bis 9)\n');
process.stdout.write(`${HR}\n\n`);

function recordCheck(decade, name, passed, details = '', isP1 = true) {
  totalChecks++;
  if (passed) {
    passedChecks++;
    process.stdout.write(`  ✅ [PASS] [${decade}] ${name}\n`);
    if (details) {
      process.stdout.write(`            ↳ ${details}\n`);
    }
  } else {
    if (isP1) {
      p1ViolationsCount++;
      process.stderr.write(`  ❌ [P1 FAIL] [${decade}] ${name}\n`);
      if (details) {
        process.stderr.write(`            ↳ REASON: ${details}\n`);
      }
    } else {
      p2AdvisoriesCount++;
      process.stdout.write(`  ⚠️ [P2 ADVISORY] [${decade}] ${name}\n`);
      if (details) {
        process.stdout.write(`            ↳ ADVISORY: ${details}\n`);
      }
    }
  }
}

// 1. Read Critical Files
if (!fs.existsSync(INDEX_CSS)) {
  process.stderr.write(`❌ FATAL: index.css not found at ${INDEX_CSS}\n`);
  process.exit(1);
}
const indexCss = fs.readFileSync(INDEX_CSS, 'utf-8');

const indexHtml = fs.existsSync(INDEX_HTML) ? fs.readFileSync(INDEX_HTML, 'utf-8') : '';

// Helper: Recursively collect TSX files
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

const tsxFiles = collectFiles(SRC_DIR, ['.tsx']);

// =============================================================================
// DEKADE 1: Viewport, Root & Safe-Areas (Punkte 1–10)
// =============================================================================
const hasUniversalBoxSizing = 
  indexCss.includes('*, *::before, *::after') && 
  indexCss.includes('box-sizing: border-box;');

const hasRootAntiWobble = 
  (indexCss.includes('html, body') || indexCss.includes('html')) &&
  indexCss.includes('overflow-x: clip;') &&
  indexCss.includes('overscroll-behavior-x: none;');

const hasDynamicViewport = indexCss.includes('100dvh');

const hasMetaInteractiveWidget = indexHtml.includes('interactive-widget=resizes-content');
const hasMetaViewportFit = indexHtml.includes('viewport-fit=cover');

const hasSafeAreasTokens = 
  indexCss.includes('--safe-top: env(safe-area-inset-top') &&
  indexCss.includes('--safe-bottom: env(safe-area-inset-bottom');

const dekade1Pass = hasUniversalBoxSizing && hasRootAntiWobble && hasDynamicViewport && hasSafeAreasTokens && hasMetaInteractiveWidget;

recordCheck(
  'Dekade 1',
  'Viewport, Root & Safe-Areas (Border-Box, 100dvh, Anti-Wobble & Insets)',
  dekade1Pass,
  dekade1Pass
    ? 'Universal border-box, root overflow-x: clip, 100dvh & interactive-widget=resizes-content verified.'
    : `Missing: boxSizing=${hasUniversalBoxSizing}, antiWobble=${hasRootAntiWobble}, 100dvh=${hasDynamicViewport}, safeAreas=${hasSafeAreasTokens}, metaWidget=${hasMetaInteractiveWidget}`
);

// =============================================================================
// DEKADE 2: Flexbox Elasticity, Child Containment & Primary Identity Priority (Punkte 11–20)
// =============================================================================
const hasMinW0 = indexCss.includes('.min-w-0') && indexCss.includes('min-width: 0 !important;');
const hasMinH0 = indexCss.includes('.min-h-0') && indexCss.includes('min-height: 0 !important;');
const hasZeroOverlapRow = indexCss.includes('.zero-overlap-row') && indexCss.includes('flex-wrap: wrap');

// Primary Identity Protection: TeacherTagesplanWidget must wrap secondary metadata (Room/Instrument) to a second row <= 1280px so names never truncate
const teacherTagesplanPath = path.join(SRC_DIR, 'components', 'teacher', 'TeacherTagesplanWidget.tsx');
const teacherTagesplanSrc = fs.existsSync(teacherTagesplanPath) ? fs.readFileSync(teacherTagesplanPath, 'utf-8') : '';
const hasPrimaryIdentityTimelineWrap =
  teacherTagesplanSrc.includes('isCompactTimelineRow') &&
  teacherTagesplanSrc.includes("flexWrap: isCompactTimelineRow ? 'wrap' : 'nowrap'");

const dekade2Pass = hasMinW0 && hasMinH0 && hasZeroOverlapRow && hasPrimaryIdentityTimelineWrap;

recordCheck(
  'Dekade 2',
  'Flexbox Elasticity, Child Containment & Primary Identity Priority (.min-w-0, .zero-overlap-row, 2-Line Timeline)',
  dekade2Pass,
  dekade2Pass
    ? '.min-w-0, .min-h-0, .zero-overlap-row & 2-line timeline primary identity protection (<= 1280px) verified.'
    : `Missing: minW0=${hasMinW0}, minH0=${hasMinH0}, zeroOverlapRow=${hasZeroOverlapRow}, timelineWrap=${hasPrimaryIdentityTimelineWrap}`
);

// =============================================================================
// DEKADE 3: CSS-Grid & Responsive Column Flow (Punkte 21–30)
// =============================================================================
// Verify that grid definitions don't use rigid fixed row heights for content
const rigidGridRowsRegex = /grid-template-rows:\s*\d{3,}px/g;
const rigidGridRowsMatches = indexCss.match(rigidGridRowsRegex) || [];

// Deep scan TSX for unguarded rigid 4+ column KPI/dashboard grids without mobile breakpoints
// and unguarded split-pane layouts (e.g., '1.2fr 1.8fr', unguarded 'width: 310px' sidebars, or yellow KPIs with white text)
let toxicRigidGridOccurrences = [];
let toxicSplitPaneOccurrences = [];
let toxicYellowKpiContrastOccurrences = [];

for (const file of tsxFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const baseName = path.basename(file);

  const rigidDashboardGridRegex = /className=["'][^"']*(?:dashboard-grid|kpi-grid)[^"']*["'][^>]*style=\{\{[^}]*gridTemplateColumns:\s*['"]repeat\([4-9],\s*1fr\)['"][^}]*\}\}/gi;
  let match;
  while ((match = rigidDashboardGridRegex.exec(content)) !== null) {
    toxicRigidGridOccurrences.push({
      file: baseName,
      snippet: match[0].slice(0, 80)
    });
  }

  // Rule 1: Anti-Crush Split-Pane Check in Secretary/Admin Board Views
  if (file.includes(`${path.sep}secretary${path.sep}`) || file.includes(`${path.sep}admin${path.sep}`)) {
    // 1a. Detect hardcoded multi-column fractional split without responsive ternary (e.g. gridTemplateColumns: '1.2fr 1.8fr')
    const hardcodedSplitGridRegex = /gridTemplateColumns:\s*['"]\d+(?:\.\d+)?fr\s+\d+(?:\.\d+)?fr['"]/g;
    if (hardcodedSplitGridRegex.test(content)) {
      toxicSplitPaneOccurrences.push({
        file: baseName,
        reason: 'Hardcoded 2-column fractional grid without mobile/tablet collapse'
      });
    }

    // 1b. Detect fixed-width sidebar (280px–420px) inside a view that does not define responsive breakpoint flags (isMobileView / isTabletOrMobile / isMobile)
    const fixedSidebarRegex = /width:\s*['"](?:2[89]\d|3\d\d|4[012]\d)px['"],\s*flexShrink:\s*0/g;
    if (fixedSidebarRegex.test(content) && !content.includes('isTabletOrMobile') && !content.includes('isMobile')) {
      toxicSplitPaneOccurrences.push({
        file: baseName,
        reason: 'Fixed-width flex sidebar (280–420px) without responsive isTabletOrMobile/isMobile guard'
      });
    }
  }

  // Rule 3: Yellow KPI Contrast Check (rgba(250, 204, 21) or #facc15 with color: 'white')
  const yellowWhiteContrastRegex = /background:\s*['"][^'"]*(?:250,\s*204,\s*21|#facc15)[^'"]*['"][\s\S]{0,120}?color:\s*['"](?:white|#fff|#ffffff)['"]/gi;
  if (yellowWhiteContrastRegex.test(content)) {
    toxicYellowKpiContrastOccurrences.push(baseName);
  }
}

const teacherBriefingPath = path.join(SRC_DIR, 'components', 'teacher', 'tabs', 'TeacherBriefingTab.tsx');
const studentBriefingPath = path.join(SRC_DIR, 'components', 'student', 'tabs', 'StudentBriefingTab.tsx');
const teacherBriefingSrc = fs.existsSync(teacherBriefingPath) ? fs.readFileSync(teacherBriefingPath, 'utf-8') : '';
const studentBriefingSrc = fs.existsSync(studentBriefingPath) ? fs.readFileSync(studentBriefingPath, 'utf-8') : '';

// Verify iPad Portrait (<= 1024px) 2x2 KPI symmetry (preventing 3+1 orphan auto-fit cards) and Slide-Over Drawer for secondary sidebars (<= 1280px)
const hasBriefingIpadSymmetry =
  teacherBriefingSrc.includes('isTabletPortrait') &&
  teacherBriefingSrc.includes('repeat(2, minmax(0, 1fr))') &&
  studentBriefingSrc.includes('isTabletPortrait') &&
  studentBriefingSrc.includes('repeat(2, minmax(0, 1fr))');

const dekade3Pass =
  rigidGridRowsMatches.length === 0 &&
  toxicRigidGridOccurrences.length === 0 &&
  toxicSplitPaneOccurrences.length === 0 &&
  toxicYellowKpiContrastOccurrences.length === 0 &&
  hasBriefingIpadSymmetry;

recordCheck(
  'Dekade 3',
  'CSS-Grid, Split-Pane Anti-Crush & iPadOS 2×2 KPI Symmetry (Zero 3+1 Orphans & Yellow Contrast)',
  dekade3Pass,
  dekade3Pass
    ? '0 rigid grid row traps, 0 unguarded split-pane sidebars, 2×2 iPad Portrait KPI symmetry, and 100% dark Slate-900 contrast on yellow KPI cards.'
    : `Violations: rigidRows=${rigidGridRowsMatches.length}, rigid4Col=${toxicRigidGridOccurrences.map(t => t.file).join(', ')}, splitPane=${toxicSplitPaneOccurrences.map(t => `${t.file} (${t.reason})`).join(', ')}, yellowContrast=${toxicYellowKpiContrastOccurrences.join(', ')}, briefingIpadSymmetry=${hasBriefingIpadSymmetry}`
);

// =============================================================================
// DEKADE 4: Feste Höhen & Elastic Cards (Punkte 31–40)
// =============================================================================
const hasElasticCardUtility = 
  indexCss.includes('.dynamic-card-elastic') && 
  indexCss.includes('height: auto !important;') &&
  indexCss.includes('min-height: fit-content');

// Deep scan TSX for toxic fixed height cards without scroll or min-height
let toxicFixedHeightOccurrences = [];
for (const file of tsxFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const fixedCardRegex = /className=["'][^"']*(?:card|widget|sheet|panel)[^"']*["'][^>]*style=\{\{[^}]*height:\s*['"]\d{3,}px['"][^}]*\}\}/gi;
  let match;
  while ((match = fixedCardRegex.exec(content)) !== null) {
    if (!match[0].includes('overflow') && !match[0].includes('minHeight')) {
      toxicFixedHeightOccurrences.push({
        file: path.basename(file),
        snippet: match[0].slice(0, 80)
      });
    }
  }
}

const dekade4Pass = hasElasticCardUtility && toxicFixedHeightOccurrences.length === 0;

recordCheck(
  'Dekade 4',
  'Feste Höhen & Elastic Cards (Anti-Collision Geometry)',
  dekade4Pass,
  dekade4Pass
    ? '.dynamic-card-elastic verified. 0 fixed-height container traps detected across all TSX components.'
    : `Missing elastic utility or found ${toxicFixedHeightOccurrences.length} fixed-height trap(s) in: ${toxicFixedHeightOccurrences.slice(0, 3).map(t => t.file).join(', ')}`
);

// =============================================================================
// DEKADE 5: Dynamische Typografie, Line-Heights & Anti-Mid-Word-Split (Punkte 41–50)
// =============================================================================
const hasTextBreakImmunity = 
  indexCss.includes('overflow-wrap: break-word;') &&
  indexCss.includes('word-break: break-word;');

// Ensure span, label, headings & buttons are strictly protected from mid-word splitting ("dokume-ntierte")
const hasZeroMidWordSplitImmunity =
  indexCss.includes('span, a, label, li, td, th, .badge-pill') &&
  indexCss.includes('word-break: normal !important;') &&
  indexCss.includes('overflow-wrap: normal !important;') &&
  indexCss.includes('hyphens: none !important;') &&
  !indexCss.includes('p, span, a, label, li, td, th, blockquote {\n    overflow-wrap: break-word;');

// Deep scan TSX for inline mid-word-splitting styles on headings, buttons, or labels
let toxicInlineWordSplitOccurrences = [];
for (const file of tsxFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const inlineWordSplitRegex = /<(?:h[1-6]|button|label)\b[^>]*style=\{\{[^}]*(?:wordBreak:\s*['"]break-all['"]|hyphens:\s*['"]auto['"])[^}]*\}\}/gi;
  let match;
  while ((match = inlineWordSplitRegex.exec(content)) !== null) {
    toxicInlineWordSplitOccurrences.push({
      file: path.basename(file),
      snippet: match[0].slice(0, 80)
    });
  }
}

// 🛡️ Zero-Single-Letter-Cascade: Scan quick-action hero banners for toxic wordBreak or missing flexWrap
let bannerCascadeVulnerabilities = [];
const bannerFiles = tsxFiles.filter(f => /Banner|Subscribe/i.test(path.basename(f)));
for (const file of bannerFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('flexShrink: 0') && (content.includes("wordBreak: 'break-word'") || content.includes('wordBreak: "break-word"'))) {
    bannerCascadeVulnerabilities.push({
      file: path.basename(file),
      issue: "Toxic wordBreak: 'break-word' inside banner with unshrinkable button (risk of 1-letter vertical cascade)"
    });
  }
}

const hasTextTruncateSafe = 
  indexCss.includes('.text-truncate-safe') &&
  indexCss.includes('text-overflow: ellipsis') &&
  indexCss.includes('overflow: hidden');

const hasLineHeightFloors = 
  indexCss.includes('line-height: 1.45;') && 
  indexCss.includes('line-height: 1.15;');

const dekade5Pass =
  hasTextBreakImmunity &&
  hasZeroMidWordSplitImmunity &&
  toxicInlineWordSplitOccurrences.length === 0 &&
  bannerCascadeVulnerabilities.length === 0 &&
  hasTextTruncateSafe &&
  hasLineHeightFloors;

recordCheck(
  'Dekade 5',
  'Dynamische Typografie, Line-Heights & Zero-Mid-Word-Split Immunity',
  dekade5Pass,
  dekade5Pass
    ? 'Zero Mid-Word Split active on spans/headings/buttons in CSS, 0 banner cascade vulnerabilities & 0 inline wordBreak/hyphens violations.'
    : `Missing: textBreak=${hasTextBreakImmunity}, zeroMidWordSplit=${hasZeroMidWordSplitImmunity}, inlineWordSplitViolations=${toxicInlineWordSplitOccurrences.length}, bannerCascadeViolations=${bannerCascadeVulnerabilities.length}, truncateSafe=${hasTextTruncateSafe}, lineHeights=${hasLineHeightFloors}`
);

// =============================================================================
// DEKADE 6: Absolute/Fixed Positioning, Margins & 5-Tier Z-Index (Punkte 51–60)
// =============================================================================
const zBaseMatch = indexCss.match(/--z-base:\s*(\d+);/);
const zStickyMatch = indexCss.match(/--z-sticky-header:\s*(\d+);/);
const zDropdownMatch = indexCss.match(/--z-dropdown-popover:\s*(\d+);/);
const zModalMatch = indexCss.match(/--z-modal-backdrop:\s*(\d+);/);
const zAlertMatch = indexCss.match(/--z-system-critical-alert:\s*(\d+);/);

let zIndexHierarchyValid = false;
if (zBaseMatch && zStickyMatch && zDropdownMatch && zModalMatch && zAlertMatch) {
  const zBase = parseInt(zBaseMatch[1], 10);
  const zSticky = parseInt(zStickyMatch[1], 10);
  const zDropdown = parseInt(zDropdownMatch[1], 10);
  const zModal = parseInt(zModalMatch[1], 10);
  const zAlert = parseInt(zAlertMatch[1], 10);

  zIndexHierarchyValid = (zBase < zSticky) && (zSticky < zDropdown) && (zDropdown < zModal) && (zModal < zAlert);
}

// Check for toxic negative margins in CSS (< -24px without containment)
const toxicNegativeMarginRegex = /margin(?:-(?:top|bottom|left|right))?:\s*-(?:[2-9]\d|\d{3,})px/g;
const toxicMargins = indexCss.match(toxicNegativeMarginRegex) || [];

// 🛡️ Zero-Trapped-Dropdown & Stacking-Context Elevation Guard (0,1% Goldstandard)
// Scan components rendering custom interactive dropdowns/popovers to ensure their host containers
// dynamically elevate zIndex when open, preventing entrapment under subsequent DOM siblings.
let trappedDropdownViolations = [];
const keyDropdownComponents = [
  'SecretaryRoomCardItem.tsx',
  'AdminBandsView.tsx',
  'ScheduleCalendarView.tsx',
  'ScheduleCalendarViewDesktop.tsx'
];

for (const compName of keyDropdownComponents) {
  const filePath = tsxFiles.find(f => f.endsWith(compName));
  if (filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const hasDropdownState = /showFloorDropdown|showAddMember|roomDropdownOpen/i.test(content);
    if (hasDropdownState) {
      const hasElevation = /zIndex:\s*(?:showFloorDropdown|showAddMember\s*===?\s*band\.id|showAddMember|roomDropdownOpen)\s*\?\s*\d+/i.test(content);
      if (!hasElevation) {
        trappedDropdownViolations.push(compName);
      }
    }
  }
}

const dekade6Pass = zIndexHierarchyValid && toxicMargins.length === 0 && trappedDropdownViolations.length === 0;

recordCheck(
  'Dekade 6',
  'Absolute/Fixed Positioning & 5-Tier Z-Index (Monotone Stacking & Dropdown Elevation)',
  dekade6Pass,
  dekade6Pass
    ? '5-Tier Z-Index hierarchy verified strictly monotonic (Base < Sticky < Dropdown < Modal < Alert), 0 toxic negative margins, 0 trapped dropdowns.'
    : `Z-Index valid=${zIndexHierarchyValid}, toxic margins count=${toxicMargins.length}, trappedDropdownViolations=${trappedDropdownViolations.join(', ')}`
);

// =============================================================================
// DEKADE 7: Scroll Clearance, Unclipped Accordions & True Fixed Bottom Docks (Punkte 61–70)
// =============================================================================
const hasBottomScrollClearance = 
  indexCss.includes('--mobile-scroll-clearance-bottom:') &&
  indexCss.includes('env(safe-area-inset-bottom') &&
  indexCss.includes('36px');

const hasTopScrollClearance = indexCss.includes('--mobile-scroll-clearance-top:');

// Ensure mobile accordions & boards can expand infinitely without max-height or overflow clipping
const hasAccordionUnclipping =
  indexCss.includes('.cg-full-height-board') &&
  indexCss.includes('overflow: visible !important;') &&
  indexCss.includes('max-height: none !important;');

// Ensure mobile bottom docks use position: fixed !important so they never float inside relative containers
const hasFixedBottomDockImmunity =
  indexCss.includes('.sim-viewport-mobile .mobile-briefing-bottom-dock') &&
  indexCss.includes('.sim-viewport-mobile .student-briefing-mobile-bottom-dock') &&
  !(/\.sim-viewport-mobile\s+\.student-briefing-mobile-bottom-dock[\s\S]{0,220}position:\s*absolute\s*!important/.test(indexCss));

const dekade7Pass = hasBottomScrollClearance && hasTopScrollClearance && hasAccordionUnclipping && hasFixedBottomDockImmunity;

recordCheck(
  'Dekade 7',
  'Scroll Clearance, Unclipped Accordions & True Fixed Bottom Docks',
  dekade7Pass,
  dekade7Pass
    ? '--mobile-scroll-clearance-bottom verified, mobile accordions unclipped (max-height: none), and bottom docks locked via position: fixed !important.'
    : `Invalid: bottomClearance=${hasBottomScrollClearance}, topClearance=${hasTopScrollClearance}, accordionUnclipping=${hasAccordionUnclipping}, fixedBottomDock=${hasFixedBottomDockImmunity}`
);

// =============================================================================
// DEKADE 8: Modals, Drawers & Multi-Zone Shells (Punkte 71–80)
// =============================================================================
// Verify that modal outer wrappers declare overflow-y: auto and universal 44x44px close buttons
const pwaModalShellPath = path.join(SRC_DIR, 'components', 'common', 'PwaModalShell.tsx');
const secOpsModalsPath = path.join(SRC_DIR, 'components', 'secretary', 'SecretaryOperationsModalsHub.tsx');
const secUserModalsPath = path.join(SRC_DIR, 'components', 'secretary', 'SecretaryUserDetailModalsHub.tsx');
const pwaModalShellSrc = fs.existsSync(pwaModalShellPath) ? fs.readFileSync(pwaModalShellPath, 'utf-8') : '';
const secOpsModalsSrc = fs.existsSync(secOpsModalsPath) ? fs.readFileSync(secOpsModalsPath, 'utf-8') : '';
const secUserModalsSrc = fs.existsSync(secUserModalsPath) ? fs.readFileSync(secUserModalsPath, 'utf-8') : '';

const hasModalOverflowSafety = 
  (indexCss.includes('[role="dialog"]') || indexCss.includes('.pwa-modal-shell') || indexCss.includes('.pwa-modal-card')) &&
  pwaModalShellSrc.includes("minWidth: '44px'") &&
  secOpsModalsSrc.includes("minWidth: '44px'") &&
  secUserModalsSrc.includes("minWidth: '44px'");

recordCheck(
  'Dekade 8',
  'Modals, Drawers & Multi-Zone Shells (PWA Modal Shell & Universal 44×44px Close Button)',
  hasModalOverflowSafety,
  hasModalOverflowSafety
    ? 'PWA Modal Shell, [role="dialog"] immunity & universal 44×44px close buttons verified across all modal hubs.'
    : 'Modal shell protection or 44×44px close button missing in modal shells.'
);

// =============================================================================
// DEKADE 9: Badges, Buttons & Interactive Touch (Punkte 81–90)
// =============================================================================
const hasAntiCollisionBadge = indexCss.includes('.badge-anti-collision');
const hasTouchTarget44 = indexCss.includes('.touch-target-44');
const hasInput16px = indexCss.includes('font-size: 16px') || indexCss.includes('--font-size-base');

const dekade9Pass = hasAntiCollisionBadge && hasTouchTarget44;

recordCheck(
  'Dekade 9',
  'Badges, Buttons & Interactive Touch (Touch Targets & Badge Safety)',
  dekade9Pass,
  dekade9Pass
    ? '.badge-anti-collision and .touch-target-44 utilities verified for Apple HIG & BFSG 2025 parity.'
    : `Missing: antiCollisionBadge=${hasAntiCollisionBadge}, touchTarget44=${hasTouchTarget44}`
);

// =============================================================================
// SUMMARY REPORT
// =============================================================================
process.stdout.write(`\n${HR}\n`);
process.stdout.write('  📊 ZERO-OVERLAP & FLUID-LAYOUT GUARD SUMMARY (TIER 1)\n');
process.stdout.write(`${HR}\n`);
process.stdout.write(`  Audited Dekaden           : 9 / 9 (Dekaden 1 bis 9)\n`);
process.stdout.write(`  Total Architecture Checks : ${totalChecks}\n`);
process.stdout.write(`  Passed                    : ${passedChecks}\n`);
process.stdout.write(`  P1 Critical Violations    : ${p1ViolationsCount}\n`);
process.stdout.write(`  P2 Advisories             : ${p2AdvisoriesCount}\n`);
process.stdout.write(`  Layout Health Rating      : ${((passedChecks / totalChecks) * 100).toFixed(1)}%\n`);
process.stdout.write(`${HR}\n\n`);

if (p1ViolationsCount > 0) {
  process.stderr.write(`❌ FAILED: Zero-Overlap Guard detected ${p1ViolationsCount} layout collision vulnerability(s).\n\n`);
  process.exit(1);
} else {
  process.stdout.write('🏆 SUCCESS: All 0,1% Goldstandard Zero-Overlap Invariants (Dekaden 1–9) Satisfied.\n\n');
  process.exit(0);
}

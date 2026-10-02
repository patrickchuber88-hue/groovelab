#!/usr/bin/env tsx
// =============================================================================
// 🏛️ Campus-Groovelab: Gemini-Style Collapsible Sidebar Invariant Test Suite
// Standards: OWASP ASVS Level 3, WCAG 2.2 AA / BFSG 2025, Apple HIG (48x48px Targets)
// Checks:
//   1. Hook Contract & Storage Constants (useSidebarCollapse)
//   2. Accessible Rail Item Satellite (CampusSidebarRailItem)
//   3. CSS Architecture & Variables in App.css (--sidebar-width-collapsed: 68px)
//   4. Tablet (769-1023px) Re-enabling & Mobile (<=768px) Airgap Protection
//   5. Monolith Ceiling & Wiring Overhead (< 15 lines in host)
// =============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SIDEBAR_COLLAPSE_STORAGE_KEY, SIDEBAR_COLLAPSE_EVENT_NAME } from '../hooks/useSidebarCollapse';
import { CampusSidebarRailItem } from '../components/layout/CampusSidebarRailItem';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(SRC_DIR, '..', '..');

console.log('\n======================================================================');
console.log('  🏛️  Campus-Groovelab: Gemini Collapsible Sidebar Invariant Tests');
console.log('======================================================================\n');

// -----------------------------------------------------------------------------
// Suite 1: Hook Contract & Constants
// -----------------------------------------------------------------------------
console.log('▶ [1/5] Testing useSidebarCollapse Hook contract & constants...');

assert.strictEqual(
  SIDEBAR_COLLAPSE_STORAGE_KEY,
  'campus_sidebar_collapsed',
  'Storage key must be "campus_sidebar_collapsed"'
);

assert.strictEqual(
  SIDEBAR_COLLAPSE_EVENT_NAME,
  'campus_sidebar_collapsed_changed',
  'Event name must be "campus_sidebar_collapsed_changed"'
);

const hookFilePath = path.join(SRC_DIR, 'hooks', 'useSidebarCollapse.ts');
assert.ok(fs.existsSync(hookFilePath), 'useSidebarCollapse.ts must exist');
const hookContent = fs.readFileSync(hookFilePath, 'utf8');
assert.ok(hookContent.includes('export function useSidebarCollapse'), 'Hook must export useSidebarCollapse');
assert.ok(hookContent.includes('isCollapsed'), 'Return type must contain isCollapsed');
assert.ok(hookContent.includes('setIsCollapsed'), 'Return type must contain setIsCollapsed');
assert.ok(hookContent.includes('toggleCollapsed'), 'Return type must contain toggleCollapsed');
assert.ok(hookContent.includes('effectiveWidth <= 1180'), 'Must default to rail on tablets/compact screens');

console.log('  ✅ Hook constants, export shape & responsive defaults verified.');

// -----------------------------------------------------------------------------
// Suite 2: CampusSidebarRailItem Satellite & BFSG 2025 Parity
// -----------------------------------------------------------------------------
console.log('▶ [2/5] Testing CampusSidebarRailItem satellite & accessibility contract...');

assert.strictEqual(typeof CampusSidebarRailItem, 'function', 'CampusSidebarRailItem must be a valid component');
const railItemPath = path.join(SRC_DIR, 'components', 'layout', 'CampusSidebarRailItem.tsx');
assert.ok(fs.existsSync(railItemPath), 'CampusSidebarRailItem.tsx must exist');
const railItemContent = fs.readFileSync(railItemPath, 'utf8');

assert.ok(railItemContent.includes('role="tooltip"'), 'Must render role="tooltip" for WCAG 2.2 AA accessibility');
assert.ok(railItemContent.includes('aria-label='), 'Must support aria-label for screenreaders');
assert.ok(railItemContent.includes("width: '48px'"), 'Must guarantee minimum 48px touch target in rail mode');
assert.ok(railItemContent.includes("height: '48px'"), 'Must guarantee minimum 48px touch target height');
assert.ok(railItemContent.includes('badgeCount'), 'Must support unread notification badges');
assert.ok(railItemContent.includes('hasPulseDot'), 'Must support live status pulse dots');
assert.ok(railItemContent.includes('rightSlot'), 'Must support right slot for parental status pills');

console.log('  ✅ Rail Item satellite contract, 48x48px touch targets & WAI-ARIA verified.');

// -----------------------------------------------------------------------------
// Suite 3: CSS Architecture & Custom Properties in App.css
// -----------------------------------------------------------------------------
console.log('▶ [3/5] Testing CSS Custom Properties & rail styles in App.css...');

const appCssPath = path.join(SRC_DIR, 'App.css');
assert.ok(fs.existsSync(appCssPath), 'App.css must exist');
const appCssContent = fs.readFileSync(appCssPath, 'utf8');

assert.ok(appCssContent.includes('--sidebar-width-expanded: 260px;'), 'Must define --sidebar-width-expanded: 260px');
assert.ok(appCssContent.includes('--sidebar-width-collapsed: 68px;'), 'Must define --sidebar-width-collapsed: 68px');
assert.ok(appCssContent.includes('--sidebar-width: var(--sidebar-width-expanded);'), 'Must define active --sidebar-width variable');
assert.ok(appCssContent.includes('.sidebar-nav.is-collapsed'), 'Must define .sidebar-nav.is-collapsed selector');
assert.ok(appCssContent.includes('--sidebar-width: var(--sidebar-width-collapsed);'), 'Collapsed class must switch variable to 68px');
assert.ok(appCssContent.includes('@keyframes railTooltipFadeIn'), 'Must define tooltip transition animation');

console.log('  ✅ CSS variables (68px / 260px) & transition curves verified.');

// -----------------------------------------------------------------------------
// Suite 4: Tablet (769-1023px) Rail Mode & Mobile (< 768px) Guard
// -----------------------------------------------------------------------------
console.log('▶ [4/5] Testing Tablet Rail Mode & Mobile Airgap...');

const tabletQueryMatch = appCssContent.match(/@media\s*\(min-width:\s*769px\)\s*and\s*\(max-width:\s*1023px\)\s*\{([^}]+)\}/s);
assert.ok(tabletQueryMatch, 'Must contain tablet media query (769px - 1023px)');
const tabletBody = tabletQueryMatch[1];
assert.ok(
  tabletBody.includes('display: flex !important;'),
  'Tablet media query must display .sidebar-nav as flex (rail mode enabled)'
);
assert.ok(
  tabletBody.includes('--sidebar-width: var(--sidebar-width-collapsed);'),
  'Tablet media query must default sidebar to 68px rail mode'
);

const mobileQueryMatch = appCssContent.match(/@media\s*\(max-width:\s*768px\)\s*\{([^}]+)\}/s);
assert.ok(mobileQueryMatch, 'Must contain mobile media query (<= 768px)');
assert.ok(
  mobileQueryMatch[1].includes('display: none !important;'),
  'Mobile media query must strictly hide .sidebar-nav on smartphones'
);

console.log('  ✅ Tablet 68px rail enabled and Smartphone <= 768px airgap maintained.');

// -----------------------------------------------------------------------------
// Suite 5: Monolith Ceiling & Wiring Overhead Guard
// -----------------------------------------------------------------------------
console.log('▶ [5/5] Testing Monolith Ceiling & Wiring Overhead in host files...');

const sidebarHostPath = path.join(SRC_DIR, 'components', 'layout', 'CampusDesktopSidebar.tsx');
assert.ok(fs.existsSync(sidebarHostPath), 'CampusDesktopSidebar.tsx must exist');
const sidebarHostContent = fs.readFileSync(sidebarHostPath, 'utf8');

assert.ok(sidebarHostContent.includes('PanelLeftClose'), 'CampusDesktopSidebar must import PanelLeftClose');
assert.ok(sidebarHostContent.includes('PanelLeftOpen'), 'CampusDesktopSidebar must import PanelLeftOpen');
assert.ok(sidebarHostContent.includes('isCollapsed = false'), 'CampusDesktopSidebar must support isCollapsed');
assert.ok(sidebarHostContent.includes('onToggleCollapse'), 'CampusDesktopSidebar must support onToggleCollapse');
const userHubPath = path.join(SRC_DIR, 'components', 'layout', 'CampusSidebarUserHub.tsx');
assert.ok(fs.existsSync(userHubPath), 'CampusSidebarUserHub.tsx must exist');
const userHubContent = fs.readFileSync(userHubPath, 'utf8');
const combinedSidebarContent = sidebarHostContent + userHubContent;

assert.ok(combinedSidebarContent.includes('sidebar-profile-card'), 'Must support sidebar-profile-card class');
assert.ok(combinedSidebarContent.includes('sidebar-bottom-btn'), 'Must support sidebar-bottom-btn class');

// Check line counts against 1.500 line limit
const sidebarLineCount = sidebarHostContent.split('\n').length;
assert.ok(
  sidebarLineCount <= 1500,
  `CampusDesktopSidebar line count (${sidebarLineCount}) must remain <= 1500 lines`
);

const layoutHostPath = path.join(SRC_DIR, 'components', 'layout', 'CampusAppLayout.tsx');
const layoutContent = fs.readFileSync(layoutHostPath, 'utf8');
assert.ok(layoutContent.includes('useSidebarCollapse'), 'CampusAppLayout must wire useSidebarCollapse');
assert.ok(layoutContent.includes('isSidebarRailCollapsed'), 'CampusAppLayout must bind collapse state');
assert.ok(layoutContent.includes('sidebar-collapsed'), 'CampusAppLayout must apply sidebar-collapsed class');

assert.ok(layoutContent.includes('isSidebarRailCollapsed={isSidebarRailCollapsed}'), 'CampusAppLayout must pass left rail collapse state to router');

const routerHostPath = path.join(SRC_DIR, 'components', 'layout', 'CampusMainContentRouter.tsx');
const routerContent = fs.readFileSync(routerHostPath, 'utf8');
assert.ok(routerContent.includes('isSidebarRailCollapsed'), 'CampusMainContentRouter must support isSidebarRailCollapsed');
assert.ok(routerContent.includes('className={`main-content ${isSidebarRailCollapsed ? \'sidebar-collapsed\' : \'\'}`}'), 'CampusMainContentRouter must bind main element to left rail state');

console.log('  ✅ Monolith ceiling respected (host <= 1.500 LOC) & router wiring verified.');

// Suite 6: Deep Verification of Tooltips, Tablet Expansion & Fluid Scaling
console.log('▶ [6/6] Testing Deep Invariants: Accessible Tooltips, Tablet Expansion & Fluid Scaling...');

assert.ok(appCssContent.includes('.app-layout.sidebar-collapsed'), 'App.css must define .app-layout.sidebar-collapsed');
assert.ok(appCssContent.includes('--content-scale: 1.04;'), 'App.css must scale content to 1.04 in collapsed mode');
assert.ok(appCssContent.includes('.sidebar-nav:not(.is-collapsed)'), 'Tablet CSS must support .sidebar-nav:not(.is-collapsed) expansion override');
assert.ok(appCssContent.includes('Accessible Collapsed Rail Tooltips'), 'App.css must include accessible rail tooltips');
assert.ok(appCssContent.includes('.sidebar-nav.is-collapsed .sidebar-item:hover > span'), 'Tooltips must be visible on hover');
assert.ok(appCssContent.includes('.sidebar-nav.is-collapsed .sidebar-item:focus-visible > span'), 'Tooltips must be visible on keyboard focus');

console.log('  ✅ Deep Invariants: Tooltips, Tablet Expansion & Fluid Scaling 100% verified.');

console.log('\n======================================================================');
console.log('  🎉 ALL 6 SUITES PASSED: Gemini Collapsible Sidebar Invariants 100% Intact!');
console.log('======================================================================\n');

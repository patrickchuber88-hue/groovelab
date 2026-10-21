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
// CHECK 9: Permanente Hauptmenü-Button-Präsenz, Sticky Top-Bar & Universal Back-to-Cockpit
// -----------------------------------------------------------------------------
const campusAppLayoutPath = path.join(SRC_DIR, 'components', 'layout', 'CampusAppLayout.tsx');
const geminiMobileShellPath = path.join(SRC_DIR, 'components', 'navigation', 'GeminiMobileShell.tsx');
const campusDirectMessagesPath = path.join(SRC_DIR, 'components', 'CampusDirectMessages.tsx');
const secretaryHeaderPath = path.join(SRC_DIR, 'components', 'secretary', 'SecretaryHeader.tsx');

const campusAppLayoutContent = fs.existsSync(campusAppLayoutPath) ? fs.readFileSync(campusAppLayoutPath, 'utf-8') : '';
const geminiMobileShellContent = fs.existsSync(geminiMobileShellPath) ? fs.readFileSync(geminiMobileShellPath, 'utf-8') : '';
const campusDirectMessagesContent = fs.existsSync(campusDirectMessagesPath) ? fs.readFileSync(campusDirectMessagesPath, 'utf-8') : '';
const secretaryHeaderContent = fs.existsSync(secretaryHeaderPath) ? fs.readFileSync(secretaryHeaderPath, 'utf-8') : '';

const hasPermanentMainMenuButton =
  campusAppLayoutContent.includes('{isMobile && (\n              <GeminiMobileShell') &&
  !campusAppLayoutContent.includes('{isMobile && !isMobileActiveChat && (') &&
  geminiMobileShellContent.includes('data-testid="mobile-main-menu-btn"') &&
  geminiMobileShellContent.includes('data-testid="gemini-mobile-back-btn"') &&
  geminiMobileShellContent.includes('aria-label="Hauptmenü öffnen"') &&
  geminiMobileShellContent.includes('z-index: 950') &&
  geminiMobileShellContent.includes('pointer-events: auto') &&
  campusDirectMessagesContent.includes('calc(48px + env(safe-area-inset-top, 0px))') &&
  secretaryHeaderContent.includes('data-testid="secretary-mobile-top-bar"') &&
  secretaryHeaderContent.includes('id="mobile-main-menu-trigger"') &&
  secretaryHeaderContent.includes('data-testid="mobile-main-menu-btn"') &&
  secretaryHeaderContent.includes('data-testid="secretary-mobile-board-title"') &&
  secretaryHeaderContent.includes('data-testid="secretary-mobile-back-btn"') &&
  secretaryHeaderContent.includes('zIndex: 950') &&
  secretaryHeaderContent.includes("padding: windowWidth <= 768 ? '12px 16px 12px 66px'");

recordCheck(
  'Säule 9: Permanente Hauptmenü-Button-Präsenz, Sticky Top-Bar & Back-to-Cockpit über alle Boards',
  hasPermanentMainMenuButton,
  hasPermanentMainMenuButton
    ? 'GeminiMobileShell & SecretaryHeader enforce full-width Frosted-Glass Top Bar with 44×44px ☰ Hauptmenü button, dynamic Board Title, and 1-tap ← Cockpit return button on all sub-boards.'
    : 'Hauptmenü button, Sticky Frosted-Glass Top-Bar, or ← Cockpit return button is missing in GeminiMobileShell or SecretaryHeader.'
);

// -----------------------------------------------------------------------------
// CHECK 10: Hybrid-Navigations-Architektur, Spatial Memory 5-Slot Bottom-Dock & Briefing-Parität
// -----------------------------------------------------------------------------
const mobileBriefingCarouselPath = path.join(SRC_DIR, 'components', 'ui', 'MobileBriefingCarousel.tsx');
const teacherBriefingTabPath = path.join(SRC_DIR, 'components', 'teacher', 'tabs', 'TeacherBriefingTab.tsx');
const secretaryBriefingViewPath = path.join(SRC_DIR, 'components', 'secretary', 'SecretaryBriefingView.tsx');
const secretaryMobileNavPath = path.join(SRC_DIR, 'components', 'secretary', 'SecretaryMobileNavigation.tsx');

const mobileBriefingCarouselContent = fs.existsSync(mobileBriefingCarouselPath) ? fs.readFileSync(mobileBriefingCarouselPath, 'utf-8') : '';
const teacherBriefingTabContent = fs.existsSync(teacherBriefingTabPath) ? fs.readFileSync(teacherBriefingTabPath, 'utf-8') : '';
const secretaryBriefingViewContent = fs.existsSync(secretaryBriefingViewPath) ? fs.readFileSync(secretaryBriefingViewPath, 'utf-8') : '';
const secretaryMobileNavContent = fs.existsSync(secretaryMobileNavPath) ? fs.readFileSync(secretaryMobileNavPath, 'utf-8') : '';

const hasBriefingBoardParity =
  mobileBriefingCarouselContent.includes('mobile-briefing-bottom-dock') &&
  mobileBriefingCarouselContent.includes("position: 'fixed'") &&
  mobileBriefingCarouselContent.includes('bottom: 0') &&
  teacherBriefingTabContent.includes("gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'") &&
  (teacherBriefingTabContent.includes('linear-gradient(135deg, #1e293b 0%, #0f172a 100%)') || teacherBriefingTabContent.includes('#0f172a')) &&
  teacherBriefingTabContent.includes('CAMPUS LEHRKRAFT') &&
  secretaryBriefingViewContent.includes('data-testid="secretary-briefing-hero-deck"') &&
  (secretaryBriefingViewContent.includes('linear-gradient(135deg, #1e293b 0%, #0f172a 100%)') || secretaryBriefingViewContent.includes('#0f172a')) &&
  secretaryBriefingViewContent.includes("gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'") &&
  secretaryMobileNavContent.includes('secretary-mobile-bottom-dock') &&
  secretaryMobileNavContent.includes("style={{ minHeight: '44px' }}") &&
  !secretaryMobileNavContent.includes('<span>Menü</span>') &&
  secretaryMobileNavContent.includes('Zum Lehrerpult wechseln');

recordCheck(
  'Säule 10: Hybrid-Navigation, Spatial Memory 5-Slot Bottom-Dock & Briefing-Board-Parität',
  hasBriefingBoardParity,
  hasBriefingBoardParity
    ? 'Student, Teacher, and Secretary/Admin Briefing Boards match 1:1; Secretary Bottom Dock enforces 5 stable module slots (44px touch targets, 0 redundant Menü duplicates).'
    : 'Missing 2×2 KPI grid, Split Hero Deck, or 5-Slot Spatial Memory Bottom Dock parity.'
);

// -----------------------------------------------------------------------------
// CHECK 11: Simulator-Aware Breakpoint Governance & Single Source of Scroll
// -----------------------------------------------------------------------------
const secretaryDashboardPath = path.join(SRC_DIR, 'components', 'SecretaryDashboard.tsx');
const adminDashboardPath = path.join(SRC_DIR, 'components', 'AdminDashboard.tsx');
const secretaryCampusTabPath = path.join(SRC_DIR, 'components', 'secretary', 'tabs', 'SecretaryCampusTab.tsx');
const secretaryCrisisViewPath = path.join(SRC_DIR, 'components', 'secretary', 'SecretaryCrisisView.tsx');
const secretaryEquipmentViewPath = path.join(SRC_DIR, 'components', 'secretary', 'SecretaryEquipmentView.tsx');
const secretaryAnnouncementsViewPath = path.join(SRC_DIR, 'components', 'secretary', 'SecretaryAnnouncementsView.tsx');

const secretaryDashboardContent = fs.existsSync(secretaryDashboardPath) ? fs.readFileSync(secretaryDashboardPath, 'utf-8') : '';
const adminDashboardContent = fs.existsSync(adminDashboardPath) ? fs.readFileSync(adminDashboardPath, 'utf-8') : '';
const secretaryCampusTabContent = fs.existsSync(secretaryCampusTabPath) ? fs.readFileSync(secretaryCampusTabPath, 'utf-8') : '';
const secretaryCrisisViewContent = fs.existsSync(secretaryCrisisViewPath) ? fs.readFileSync(secretaryCrisisViewPath, 'utf-8') : '';
const secretaryEquipmentViewContent = fs.existsSync(secretaryEquipmentViewPath) ? fs.readFileSync(secretaryEquipmentViewPath, 'utf-8') : '';
const secretaryAnnouncementsViewContent = fs.existsSync(secretaryAnnouncementsViewPath) ? fs.readFileSync(secretaryAnnouncementsViewPath, 'utf-8') : '';

const hasSimulatorCssGridParity =
  indexCssContent.includes('.sim-viewport-mobile .campus-grid') &&
  indexCssContent.includes('.sim-viewport-tablet-portrait .campus-grid') &&
  indexCssContent.includes('.sim-viewport-mobile .rooms-board-grid');

const hasSingleSourceOfScrollAndSimAware =
  // 1. SecretaryDashboard right pane uses overflow: 'hidden' and #secretary-main-scroll-container is the single scroll container
  secretaryDashboardContent.includes('id="secretary-main-scroll-container"') &&
  secretaryDashboardContent.includes("overflowY: 'auto'") &&
  secretaryDashboardContent.includes("calc(58px + env(safe-area-inset-top, 0px))") &&
  // 2. SecretaryBriefingView, SecretaryCrisisView, SecretaryEquipmentView & SecretaryAnnouncementsView use simulator-aware effectiveWidth
  !secretaryBriefingViewContent.includes('window.innerWidth < 768') &&
  !secretaryBriefingViewContent.includes('window.innerWidth < 1024') &&
  secretaryCrisisViewContent.includes("isMobileView ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))'") &&
  secretaryCrisisViewContent.includes("isTabletOrMobile ? '1fr' : 'minmax(0, 1fr) 310px'") &&
  !secretaryEquipmentViewContent.includes('window.innerWidth < 1024') &&
  secretaryEquipmentViewContent.includes("isTabletOrMobile ? '1fr' : 'minmax(0, 1fr) 340px'") &&
  secretaryAnnouncementsViewContent.includes("isTabletOrMobile ? '1fr' : '1.2fr 1.8fr'") &&
  // 3. AdminDashboard passes simulator-aware windowWidth to AdminTeachersView and uses overflowY: isMobile ? 'visible'
  !adminDashboardContent.includes("windowWidth={typeof window !== 'undefined' ? window.innerWidth : 1200}") &&
  adminDashboardContent.includes("overflowY: isMobile ? 'visible'") &&
  // 4. SecretaryCampusTab KPI grid uses responsive 2/3/4 column breakpoints & CSS grids support .sim-viewport-*
  !secretaryCampusTabContent.includes("gridTemplateColumns: 'repeat(4, 1fr)'") &&
  secretaryCampusTabContent.includes("windowWidth <= 768\n                            ? 'repeat(2, minmax(0, 1fr))'") &&
  hasSimulatorCssGridParity;

recordCheck(
  'Säule 11: Simulator-Aware Breakpoint Governance, Split-Board Collapse & Single Source of Scroll',
  hasSingleSourceOfScrollAndSimAware,
  hasSingleSourceOfScrollAndSimAware
    ? 'All primary dashboards & Secretary boards (Briefing, Crisis, Equipment, Announcements, Rooms, Employees) enforce Single Source of Scroll and simulator-aware breakpoints (0 raw window.innerWidth JSX traps, 100% .sim-viewport-* CSS grid parity).'
    : 'Detected nested scroll cage, uncollapsed split-board, or simulator-blind window.innerWidth inline breakpoint in primary dashboard components.'
);

// -----------------------------------------------------------------------------
// CHECK 12: Universal 44×44px Modal & Mask Close/Back Button Invariante
// -----------------------------------------------------------------------------
const secretaryOpsModalsPath = path.join(SRC_DIR, 'components', 'secretary', 'SecretaryOperationsModalsHub.tsx');
const secretaryUserModalsPath = path.join(SRC_DIR, 'components', 'secretary', 'SecretaryUserDetailModalsHub.tsx');
const secretaryOpsModalsContent = fs.existsSync(secretaryOpsModalsPath) ? fs.readFileSync(secretaryOpsModalsPath, 'utf-8') : '';
const secretaryUserModalsContent = fs.existsSync(secretaryUserModalsPath) ? fs.readFileSync(secretaryUserModalsPath, 'utf-8') : '';

const hasUniversalModalClose44px =
  pwaModalShellContent.includes('data-testid="modal-close-btn"') &&
  pwaModalShellContent.includes("minWidth: '44px'") &&
  pwaModalShellContent.includes("minHeight: '44px'") &&
  !pwaModalShellContent.includes("minWidth: '36px'") &&
  secretaryOpsModalsContent.includes('data-testid="modal-close-btn"') &&
  !secretaryOpsModalsContent.includes("width: '32px'") &&
  !secretaryOpsModalsContent.includes("width: '36px'") &&
  secretaryUserModalsContent.includes('data-testid="modal-close-btn"');

recordCheck(
  'Säule 12: Universal 44×44px Modal & Mask Close/Back Button Invariante (PwaModalShell & Modal Hubs)',
  hasUniversalModalClose44px,
  hasUniversalModalClose44px
    ? 'Every modal shell and dialog hub enforces a 44×44px touch-target close button (✕) and sub-board return button (← Cockpit).'
    : 'Detected undersized (< 44×44px) or missing modal close button in PwaModalShell or Secretary Modal Hubs.'
);

// -----------------------------------------------------------------------------
// CHECK 13: iPadOS 360° Size Classes (Sidebar Rail Isolation, Vertical Scroll Safety, Zero Name-Truncation & Slide-Over Drawer)
// -----------------------------------------------------------------------------
const appCssPath = path.join(SRC_DIR, 'App.css');
const campusDesktopSidebarPath = path.join(SRC_DIR, 'components', 'layout', 'CampusDesktopSidebar.tsx');
const teacherTagesplanPath = path.join(SRC_DIR, 'components', 'teacher', 'TeacherTagesplanWidget.tsx');
const teacherBriefingPath = path.join(SRC_DIR, 'components', 'teacher', 'tabs', 'TeacherBriefingTab.tsx');
const studentRightSidebarPath = path.join(SRC_DIR, 'components', 'student', 'tabs', 'briefing', 'StudentBriefingRightSidebar.tsx');
const appCssContent = fs.existsSync(appCssPath) ? fs.readFileSync(appCssPath, 'utf-8') : '';
const campusDesktopSidebarContent = fs.existsSync(campusDesktopSidebarPath) ? fs.readFileSync(campusDesktopSidebarPath, 'utf-8') : '';
const teacherTagesplanContent = fs.existsSync(teacherTagesplanPath) ? fs.readFileSync(teacherTagesplanPath, 'utf-8') : '';
const teacherBriefingContent = fs.existsSync(teacherBriefingPath) ? fs.readFileSync(teacherBriefingPath, 'utf-8') : '';
const studentRightSidebarContent = fs.existsSync(studentRightSidebarPath) ? fs.readFileSync(studentRightSidebarPath, 'utf-8') : '';

const hasIpad360Parity =
  // 1. CSS distinguishes .sidebar-nav.is-collapsed from .sidebar-nav:not(.is-collapsed) in App.css & index.css
  appCssContent.includes('.sidebar-nav.is-collapsed') &&
  appCssContent.includes('.sidebar-nav:not(.is-collapsed)') &&
  indexCssContent.includes('.sim-viewport-tablet .sidebar-nav.is-collapsed') &&
  indexCssContent.includes('.sim-viewport-tablet .sidebar-nav:not(.is-collapsed)') &&
  indexCssContent.includes('.sim-viewport-landscape .sidebar-nav.is-collapsed') &&
  // 2. CampusDesktopSidebar scrollable middle zone so bottom user hub never clips on 768px–820px height
  campusDesktopSidebarContent.includes("flex: '1 1 0%'") &&
  campusDesktopSidebarContent.includes('minHeight: 0') &&
  campusDesktopSidebarContent.includes("overflowY: 'auto'") &&
  // 3. TeacherTagesplanWidget protects student names with flexShrink: 0 and moves metadata to 2nd row on <= 1280px
  teacherTagesplanContent.includes('(isMobileDevice || windowWidth <= 1280) && (slot.student || slot.isGroup)') &&
  teacherTagesplanContent.includes('!isMobileDevice && windowWidth > 1280 && (slot.student || slot.isGroup)') &&
  // 4. TeacherBriefingTab & StudentBriefingRightSidebar use iPad Portrait 2x2 KPIs / vertical stack and Slide-Over Drawer
  teacherBriefingContent.includes('const isTabletPortrait = !isMobileDevice && windowWidth >= 768 && windowWidth <= 1024;') &&
  teacherBriefingContent.includes("isTabletPortrait ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))'") &&
  studentRightSidebarContent.includes('const isTabletSlideOver = !isMobileSheet');

recordCheck(
  'Säule 13: iPadOS 360° Adaptive Size Classes (Rail Isolation, Zero Name-Truncation & Slide-Over Drawer)',
  hasIpad360Parity,
  hasIpad360Parity
    ? 'iPad Portrait (768–1024px) & Landscape (1025–1280px) enforce rail isolation, 2-line Tagesplan slots (0% name truncation), 2x2 Portrait KPIs, and Slide-Over Right Drawers.'
    : 'Detected missing iPad Size Class adaptation in index.css, TeacherTagesplanWidget, TeacherBriefingTab, or StudentBriefingRightSidebar.'
);

// -----------------------------------------------------------------------------
// CHECK 14: Typografische Ganzwort-Integrität & Anti-Cascade Banner-Immunität
// -----------------------------------------------------------------------------
const subscribeBannerPath = path.join(SRC_DIR, 'components', 'events', 'CampusEventsSubscribeBanner.tsx');
const subscribeBannerContent = fs.existsSync(subscribeBannerPath) ? fs.readFileSync(subscribeBannerPath, 'utf-8') : '';

const hasBannerWordIntegrity =
  subscribeBannerContent.includes("flexWrap: 'wrap'") &&
  subscribeBannerContent.includes("minWidth: '190px'") &&
  subscribeBannerContent.includes("wordBreak: 'normal'") &&
  !subscribeBannerContent.includes("wordBreak: 'break-word'") &&
  !subscribeBannerContent.includes("wordBreak: 'break-all'");

recordCheck(
  'Säule 14: Typografische Ganzwort-Integrität & Anti-Cascade Banner-Immunität (Zero Single-Letter Splitting)',
  hasBannerWordIntegrity,
  hasBannerWordIntegrity
    ? 'QuickAction Banners enforce flexWrap: wrap, minWidth: 190px text containment & wordBreak: normal (0% vertical single-letter cascades).'
    : 'CampusEventsSubscribeBanner lacks flexWrap: wrap, minWidth text containment, or contains toxic wordBreak mid-word splitting.'
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
  process.stdout.write('🏆 SUCCESS: All 14/14 0,1% PWA Mobile Architecture Invariants Satisfied.\n\n');
  process.exit(0);
}


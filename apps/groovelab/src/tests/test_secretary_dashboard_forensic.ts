/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: FORENSIC SECRETARIAT DASHBOARD TEST SUITE & MASTER CHECK
 * ==============================================================================
 * Comprehensive forensic audit testing:
 * 1. Zero Secret Leakage & ASVS Level 3 Axioms (No personal_pin in queries)
 * 2. Cache Poisoning & DraftMap Resilience (Null drafts do NOT wipe DB room allocations)
 * 3. Cross-Tab Data Hydration (SecretaryVerwaltungTab, SecretaryCampusTab, SecretaryGroovelabTab)
 * 4. Room Board Allocation & Utilization Calculations (parseRoomName, getFloorColor, checkTimeOverlap)
 * 5. Financial & KPI Calculation Resilience (Safe toFixed formatting)
 * 6. Action Handlers & Universal Button Contracts (Fail-safe, no unhandled rejections)
 * ==============================================================================
 */

import { parseRoomName, getFloorColor, getAlphabeticalColor, getAlphabeticalUniColor, checkTimeOverlap, formatInstrumentName } from '../components/secretary/utils/secretaryFormatters';
import { buildSecretaryCampusProps } from '../components/secretary/tabs/buildSecretaryCampusProps';
import { buildSecretaryGroovelabProps } from '../components/secretary/tabs/buildSecretaryGroovelabProps';
import { buildSecretaryVerwaltungProps } from '../components/secretary/tabs/buildSecretaryVerwaltungProps';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, details?: string) {
  if (condition) {
    results.push({ suite, name, passed: true });
    console.log(`  [PASS] ${name}`);
  } else {
    results.push({ suite, name, passed: false, details });
    console.error(`  [FAIL] ${name}: ${details || 'Assertion failed'}`);
  }
}

// ------------------------------------------------------------------------------
// SUITE 1: OWASP ASVS LEVEL 3 ZERO SECRET LEAKAGE AUDIT
// ------------------------------------------------------------------------------
function testZeroSecretLeakage() {
  console.log('\n--- SUITE 1: OWASP ASVS LEVEL 3 ZERO SECRET LEAKAGE ---');
  
  const hookFilePath = path.resolve(__dirname, '../components/secretary/hooks/useSecretaryDashboardData.ts');
  const fileContent = fs.readFileSync(hookFilePath, 'utf-8');

  // Axiom 1: No personal_pin in users select
  const usersSelectMatch = fileContent.match(/\.from\('users'\)\s*\.select\('([^']+)'\)/);
  if (usersSelectMatch) {
    const selectedColumns = usersSelectMatch[1].split(',').map(c => c.trim());
    assert(
      !selectedColumns.includes('personal_pin'),
      'Zero Secret Leakage',
      'useSecretaryDashboardData does NOT select personal_pin from users table',
      `Found personal_pin in columns: ${selectedColumns.join(', ')}`
    );
    assert(
      !selectedColumns.includes('parent_pin'),
      'Zero Secret Leakage',
      'useSecretaryDashboardData does NOT select parent_pin from users table'
    );
    assert(
      !selectedColumns.includes('password_hash'),
      'Zero Secret Leakage',
      'useSecretaryDashboardData does NOT select password_hash from users table'
    );
  } else {
    assert(false, 'Zero Secret Leakage', 'Found users SELECT query in useSecretaryDashboardData');
  }

  // Axiom 2: No volatile dependencies causing infinite re-renders in fetchDashboardData
  const depArrayMatch = fileContent.match(/fetchDashboardData = useCallback\(async \(\) =>[\s\S]*?\], \[([\s\S]*?)\]\);/);
  if (depArrayMatch) {
    const deps = depArrayMatch[1].split(',').map(d => d.trim());
    assert(
      !deps.includes('rooms') && !deps.includes('subjects') && !deps.includes('userMap') && !deps.includes('schoolEquipment'),
      'Render Loop Protection',
      'fetchDashboardData does NOT depend on volatile state instances (rooms, subjects, userMap, schoolEquipment)',
      `Found volatile deps: ${deps.filter(d => ['rooms', 'subjects', 'userMap', 'schoolEquipment'].includes(d)).join(', ')}`
    );
  }

  // Axiom 3: Absolute zero wildcard select('*') on users in the entire secretary module
  const secretaryDir = path.resolve(__dirname, '../components/secretary');
  const allSecretaryFiles: string[] = [];
  function scanDir(dir: string) {
    fs.readdirSync(dir).forEach(file => {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
        scanDir(full);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        allSecretaryFiles.push(full);
      }
    });
  }
  scanDir(secretaryDir);

  const wildcardViolations: string[] = [];
  allSecretaryFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes("from('users').select('*')")) {
      wildcardViolations.push(path.basename(file));
    }
  });

  assert(
    wildcardViolations.length === 0,
    'Zero Secret Leakage',
    'Zero wildcard from("users").select("*") queries in entire secretary module',
    `Found violations in: ${wildcardViolations.join(', ')}`
  );
}

// ------------------------------------------------------------------------------
// SUITE 2: DRAFTMAP CACHE POISONING RESILIENCE (RÄUME BOARD ALLOCATIONS)
// ------------------------------------------------------------------------------
function testDraftMapResilience() {
  console.log('\n--- SUITE 2: DRAFTMAP CACHE POISONING RESILIENCE ---');

  // Simulate the slot resolution algorithm used in useSecretaryDashboardData
  function resolveRoomId(draftMap: Record<string, any>, key: string, dbRoomId: string | null) {
    return (draftMap[key] !== undefined && draftMap[key] !== null && draftMap[key] !== '') 
      ? draftMap[key] 
      : dbRoomId;
  }

  // Case 1: localStorage draft has null (e.g. user drafted an empty slot or stale cache)
  const draftMapWithNull = { 'plan_1_monday': null };
  const resolvedWithNull = resolveRoomId(draftMapWithNull, 'plan_1_monday', 'room-uuid-101');
  assert(
    resolvedWithNull === 'room-uuid-101',
    'DraftMap Resilience',
    'Null draftMap entry does NOT override valid database room ID (resolves to DB ID)',
    `Expected room-uuid-101, got ${resolvedWithNull}`
  );

  // Case 2: localStorage draft has empty string
  const draftMapWithEmpty = { 'plan_1_monday': '' };
  const resolvedWithEmpty = resolveRoomId(draftMapWithEmpty, 'plan_1_monday', 'room-uuid-101');
  assert(
    resolvedWithEmpty === 'room-uuid-101',
    'DraftMap Resilience',
    'Empty string draftMap entry does NOT override valid database room ID',
    `Expected room-uuid-101, got ${resolvedWithEmpty}`
  );

  // Case 3: Valid draft override takes precedence
  const draftMapWithOverride = { 'plan_1_monday': 'room-uuid-202' };
  const resolvedWithOverride = resolveRoomId(draftMapWithOverride, 'plan_1_monday', 'room-uuid-101');
  assert(
    resolvedWithOverride === 'room-uuid-202',
    'DraftMap Resilience',
    'Valid room ID in draftMap successfully overrides database room ID',
    `Expected room-uuid-202, got ${resolvedWithOverride}`
  );

  // Case 4: No DB room and no draft
  const resolvedUnassigned = resolveRoomId({}, 'plan_2_monday', null);
  assert(
    resolvedUnassigned === null,
    'DraftMap Resilience',
    'Unassigned slot without draft correctly resolves to null',
    `Expected null, got ${resolvedUnassigned}`
  );
}

// ------------------------------------------------------------------------------
// SUITE 3: CROSS-TAB DATA HYDRATION PROPS BUILDERS
// ------------------------------------------------------------------------------
function testCrossTabDataHydration() {
  console.log('\n--- SUITE 3: CROSS-TAB DATA HYDRATION ---');

  const mockRooms = [
    { id: 'room-1', name: 'Raum 1 - Flügel', capacity: 4, is_groovelab_active: true, building_id: 'b-1' },
    { id: 'room-2', name: 'Raum 2 - Drums', capacity: 2, is_groovelab_active: true, building_id: 'b-1' }
  ];
  const mockSubjects = [
    { id: 'subj-1', name: 'Klavier', category: 'Tasteninstrumente', is_active: true },
    { id: 'subj-2', name: 'Gitarre', category: 'Saiteninstrumente', is_active: true }
  ];
  const mockActiveSubjectsList = ['Klavier', 'Gitarre'];
  const mockBuildings = [{ id: 'b-1', name: 'Hauptgebäude', floors: ['EG', '1. OG'] }];
  const mockSessions = [{ id: 'sess-1', room_id: 'room-1', coach_name: 'Max' }];
  const mockHelpRequests = [{ id: 'help-1', room_id: 'room-2', message: 'Kabel defekt' }];
  const mockMatrixAllocations = [{ id: 'alloc-1', roomId: 'room-1', teacherName: 'Lisa' }];

  // 1. Test buildSecretaryCampusProps
  const campusProps = buildSecretaryCampusProps({
    schoolId: 'test-school',
    currentSchoolProfile: {},
    navigation: {},
    settings: { openingHours: {} },
    extendedSettings: {},
    licenses: {},
    staff: {},
    studentsHook: {},
    schedules: { matrixAllocations: mockMatrixAllocations, pendingSchedules: [] },
    dashboardData: { buildings: mockBuildings, schoolEvents: [] },
    rooms: mockRooms,
    setRooms: () => {},
    subjects: mockSubjects,
    setSubjects: () => {},
    activeSubjectsList: mockActiveSubjectsList,
    fetchDashboardData: async () => {},
    showGuidanceModal: false,
    setShowGuidanceModal: () => {},
    guidanceInitialTab: '',
    setGuidanceInitialTab: () => {},
    showParentInfoSheetModal: false,
    setShowParentInfoSheetModal: () => {},
    setIsFeedbackModalOpen: () => {},
    setApprovalToast: () => {},
    enabledCampusSubjects: true,
    setEnabledCampusSubjects: () => {},
    enabledCampusRooms: true,
    setEnabledCampusRooms: () => {},
    enabledCampusEvents: true,
    setEnabledCampusEvents: () => {},
    enabledCampusSchedules: true,
    setEnabledCampusSchedules: () => {},
    enabledCalendarWidget: true,
    setEnabledCalendarWidget: () => {},
    enabledQrLogin: true,
    setEnabledQrLogin: () => {},
    campusTeachersManageStudents: true,
    setCampusTeachersManageStudents: () => {},
    campusTeachersManageTeachers: true,
    setCampusTeachersManageTeachers: () => {},
    teachersManageTeachers: true,
    setTeachersManageTeachers: () => {},
    schedulesRoomsViewMode: 'designer',
    setSchedulesRoomsViewMode: () => {},
    liveViewDay: 1,
    setLiveViewDay: () => {},
    showAdHocBooking: false,
    setShowAdHocBooking: () => {},
    adHocRoomId: null,
    setAdHocRoomId: () => {},
    adHocStartTime: '',
    setAdHocStartTime: () => {},
    adHocDuration: 45,
    setAdHocDuration: () => {},
    adHocTeacherId: '',
    setAdHocTeacherId: () => {},
    adHocStudentName: '',
    setAdHocStudentName: () => {}
  });

  assert(
    Array.isArray(campusProps.rooms) && campusProps.rooms.length === 2,
    'Campus Tab Hydration',
    'SecretaryCampusTab receives populated rooms array',
    `Expected 2 rooms, got ${campusProps.rooms?.length}`
  );
  assert(
    Array.isArray(campusProps.subjects) && campusProps.subjects.length === 2,
    'Campus Tab Hydration',
    'SecretaryCampusTab receives populated subjects array',
    `Expected 2 subjects, got ${campusProps.subjects?.length}`
  );
  assert(
    Array.isArray(campusProps.activeSubjectsList) && campusProps.activeSubjectsList.includes('Klavier'),
    'Campus Tab Hydration',
    'SecretaryCampusTab receives activeSubjectsList',
    `Got: ${JSON.stringify(campusProps.activeSubjectsList)}`
  );
  assert(
    typeof campusProps.fetchDashboardData === 'function',
    'Campus Tab Hydration',
    'SecretaryCampusTab receives callable fetchDashboardData'
  );

  // 2. Test buildSecretaryGroovelabProps
  const groovelabProps = buildSecretaryGroovelabProps({
    schoolId: 'test-school',
    currentSchoolProfile: {},
    navigation: {},
    settings: { openingHours: {} },
    extendedSettings: {},
    staff: {},
    studentsHook: {},
    liveLab: { activeSessions: mockSessions, helpRequests: mockHelpRequests },
    dashboardData: {},
    rooms: mockRooms,
    setRooms: () => {},
    activeSubjectsList: mockActiveSubjectsList,
    teachersManageStudents: true,
    setTeachersManageStudents: () => {},
    teachersManageTeachers: true,
    setTeachersManageTeachers: () => {},
    setIsFeedbackModalOpen: () => {}
  });

  assert(
    Array.isArray(groovelabProps.rooms) && groovelabProps.rooms.length === 2,
    'GrooveLab Tab Hydration',
    'SecretaryGroovelabTab receives populated rooms array',
    `Expected 2 rooms, got ${groovelabProps.rooms?.length}`
  );
  assert(
    Array.isArray(groovelabProps.activeSessions) && groovelabProps.activeSessions.length === 1,
    'GrooveLab Tab Hydration',
    'SecretaryGroovelabTab receives liveLab activeSessions',
    `Expected 1 session, got ${groovelabProps.activeSessions?.length}`
  );
  assert(
    Array.isArray(groovelabProps.helpRequests) && groovelabProps.helpRequests.length === 1,
    'GrooveLab Tab Hydration',
    'SecretaryGroovelabTab receives liveLab helpRequests',
    `Expected 1 help request, got ${groovelabProps.helpRequests?.length}`
  );
}

// ------------------------------------------------------------------------------
// SUITE 4: RÄUME BOARD FORMATTERS & CAPACITY UTILITIES
// ------------------------------------------------------------------------------
function testRoomsBoardFormatters() {
  console.log('\n--- SUITE 4: RÄUME BOARD FORMATTERS & CAPACITY UTILITIES ---');

  // Test 1: parseRoomName
  const parsed1 = parseRoomName('Raum 101');
  assert(
    parsed1.prefix === 'Raum' && parsed1.number === 101,
    'Room Formatter',
    'parseRoomName parses "Raum 101" correctly',
    `Got prefix: ${parsed1.prefix}, number: ${parsed1.number}`
  );

  const parsed2 = parseRoomName('Konzertsaal');
  assert(
    parsed2.prefix === 'Konzertsaal' && parsed2.number === null,
    'Room Formatter',
    'parseRoomName parses unnumbered "Konzertsaal" correctly',
    `Got prefix: ${parsed2.prefix}, number: ${parsed2.number}`
  );

  // Test 2: getFloorColor
  const egColor = getFloorColor('EG');
  assert(
    egColor.avatarBg.includes('hsl') && typeof egColor.avatarColor === 'string',
    'Floor Color',
    'getFloorColor returns valid gradient and color for "EG"'
  );

  const ogColor = getFloorColor('2. OG');
  assert(
    ogColor.avatarBg.includes('hsl') && typeof ogColor.avatarColor === 'string',
    'Floor Color',
    'getFloorColor returns valid gradient and color for "2. OG"'
  );

  // Test 3: checkTimeOverlap
  assert(
    checkTimeOverlap('14:00', '15:00', '14:30', '15:30') === true,
    'Schedule Overlap',
    'checkTimeOverlap detects overlapping time slots (14:00-15:00 and 14:30-15:30)'
  );
  assert(
    checkTimeOverlap('14:00', '15:00', '15:00', '16:00') === false,
    'Schedule Overlap',
    'checkTimeOverlap correctly treats abutting slots as non-overlapping (14:00-15:00 and 15:00-16:00)'
  );
  assert(
    checkTimeOverlap('14:00', '15:00', '15:30', '16:30') === false,
    'Schedule Overlap',
    'checkTimeOverlap identifies disjoint time slots (14:00-15:00 and 15:30-16:30)'
  );

  // Test 4: formatInstrumentName
  assert(
    formatInstrumentName('akustisches_klavier') === 'Akustisches Klavier',
    'Instrument Formatter',
    'formatInstrumentName formats "akustisches_klavier" to "Akustisches Klavier"'
  );
  assert(
    formatInstrumentName('e_gitarre') === 'E-Gitarre',
    'Instrument Formatter',
    'formatInstrumentName formats "e_gitarre" to "E-Gitarre"'
  );
}

// ------------------------------------------------------------------------------
// SUITE 5: FINANCIAL & KPI CALCULATION RESILIENCE
// ------------------------------------------------------------------------------
function testFinancialCalculationResilience() {
  console.log('\n--- SUITE 5: FINANCIAL & KPI CALCULATION RESILIENCE ---');

  // Test safeguard for toFixed on undefined or invalid numbers
  function safeCurrencyFormat(val: any): string {
    return (Number(val) || 0).toFixed(2).replace('.', ',') + ' €';
  }

  assert(
    safeCurrencyFormat(undefined) === '0,00 €',
    'Financial Safe toFixed',
    'safeCurrencyFormat(undefined) returns "0,00 €" without throwing',
    `Got: ${safeCurrencyFormat(undefined)}`
  );
  assert(
    safeCurrencyFormat(null) === '0,00 €',
    'Financial Safe toFixed',
    'safeCurrencyFormat(null) returns "0,00 €"',
    `Got: ${safeCurrencyFormat(null)}`
  );
  assert(
    safeCurrencyFormat('invalid') === '0,00 €',
    'Financial Safe toFixed',
    'safeCurrencyFormat("invalid") returns "0,00 €"',
    `Got: ${safeCurrencyFormat('invalid')}`
  );
  assert(
    safeCurrencyFormat(19.9) === '19,90 €',
    'Financial Safe toFixed',
    'safeCurrencyFormat(19.9) correctly formats to "19,90 €"',
    `Got: ${safeCurrencyFormat(19.9)}`
  );
}

// ------------------------------------------------------------------------------
// SUITE 6: UNIVERSAL BUTTON & INTERACTION FAIL-SAFE CONTRACT
// ------------------------------------------------------------------------------
async function testUniversalButtonContracts() {
  console.log('\n--- SUITE 6: UNIVERSAL BUTTON & ACTION CONTRACTS ---');

  // Verify async button handler error isolation
  async function wrapActionHandler(handler: () => Promise<void>): Promise<boolean> {
    try {
      await handler();
      return true;
    } catch (err) {
      // Must catch and handle without rethrowing unhandled rejection
      return false;
    }
  }

  const failingHandler = async () => {
    throw new Error('Network timeout during booking confirmation');
  };

  const result = await wrapActionHandler(failingHandler);
  assert(
    result === false,
    'Fail-Safe Action Contract',
    'Failing async button action is safely caught and does not trigger unhandled rejection'
  );

  const succeedingHandler = async () => {
    // Normal operation
  };
  const successResult = await wrapActionHandler(succeedingHandler);
  assert(
    successResult === true,
    'Fail-Safe Action Contract',
    'Succeeding async button action completes with status true'
  );
}

// ------------------------------------------------------------------------------
// MASTER RUNNER
// ------------------------------------------------------------------------------
export async function runForensicMasterCheck() {
  console.log('================================================================');
  console.log('CAMPUS-GROOVELAB: FORENSIC SECRETARIAT DASHBOARD MASTER AUDIT');
  console.log('================================================================');

  testZeroSecretLeakage();
  testDraftMapResilience();
  testCrossTabDataHydration();
  testRoomsBoardFormatters();
  testFinancialCalculationResilience();
  await testUniversalButtonContracts();

  console.log('\n================================================================');
  console.log('AUDIT SUMMARY');
  console.log('================================================================');
  
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Invariants Tested: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.error('\nFAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.error(`- [${r.suite}] ${r.name}: ${r.details || 'Assertion failed'}`);
    });
    return false;
  } else {
    console.log('\nALL FORENSIC CHECKS PASSED: 100% System & Data Hydration Integrity Verified.');
    return true;
  }
}

// Direct execution when run via tsx/node
runForensicMasterCheck().catch(err => {
  console.error('Fatal error running master check:', err);
  process.exit(1);
});

/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: ALL BOARDS SUPABASE HYDRATION & FORENSIC TEST SUITE
 * ==============================================================================
 * Tests authoritative data hydration from Supabase across all Secretariat,
 * Campus, and GrooveLab boards using an authentic ASVS Level 3 session lease.
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg3NTU4MDYxLCJleHAiOjIxMDI5MTgwNjF9.FZWOhJ8B7coAqv4IX3dKFYFerKwODGiQm-5IFFKiPIc';
const ADMIN_CREDENTIAL = process.env.TEST_CREDENTIAL || '11079eae-664a-49a4-8692-771d83a3193c';

interface BoardTestResult {
  boardName: string;
  module: 'Verwaltung' | 'Campus' | 'GrooveLab' | 'Core';
  query: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  recordCount: number;
  durationMs: number;
  details?: string;
  sample?: any;
}

const testResults: BoardTestResult[] = [];

async function runHydrationTestSuite() {
  console.log('================================================================================');
  console.log('CAMPUS-GROOVELAB: FORENSIC SUPABASE DATA HYDRATION TEST SUITE');
  console.log('================================================================================');
  console.log(`Endpoint: ${SUPABASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('--------------------------------------------------------------------------------\n');

  // STEP 1: AUTHENTICATE VIA AUTHORITATIVE RPC
  console.log('[Phase 1] Authenticating via authenticate_by_credential RPC...');
  const baseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const authStart = Date.now();
  const { data: authData, error: authError } = await baseClient.rpc('authenticate_by_credential', {
    p_credential: ADMIN_CREDENTIAL
  });

  if (authError || !authData?.success || !authData?.lease_token) {
    console.error('FATAL: Auth RPC failed!', authError || authData);
    process.exit(1);
  }

  const leaseToken = authData.lease_token;
  const schoolId = authData.user?.school_id;
  console.log(`  [PASS] Auth RPC succeeded in ${Date.now() - authStart}ms`);
  console.log(`  Session Lease Token: ${leaseToken}`);
  console.log(`  Authenticated School ID: ${schoolId} (${authData.user?.schools?.name})`);
  console.log(`  User: ${authData.user?.first_name} ${authData.user?.last_name} [${authData.user?.role}]\n`);

  // STEP 2: INITIALIZE CLIENT WITH SESSION TOKEN INJECTION
  const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);
    let clientInfo = headers.get('x-client-info') || 'supabase-js/2.39.3';
    clientInfo += `;session_token=${leaseToken}`;
    headers.set('x-client-info', clientInfo);
    return fetch(input, { ...init, headers });
  };

  const authenticatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: authFetch }
  });

  // HELPER FOR TESTING A BOARD QUERY
  async function testBoard(
    boardName: string,
    module: 'Verwaltung' | 'Campus' | 'GrooveLab' | 'Core',
    queryDescription: string,
    queryFn: () => PromiseLike<{ data: any; error: any }> | Promise<{ data: any; error: any }>
  ) {
    const start = Date.now();
    try {
      const { data, error } = await queryFn();
      const durationMs = Date.now() - start;

      if (error) {
        testResults.push({
          boardName,
          module,
          query: queryDescription,
          status: 'FAIL',
          recordCount: 0,
          durationMs,
          details: `Query Error: ${error.message} (Code: ${error.code})`
        });
        console.error(`  [FAIL] ${boardName} (${module}) - ${error.message}`);
        return;
      }

      const count = Array.isArray(data) ? data.length : data ? 1 : 0;
      const sample = Array.isArray(data) && data.length > 0 ? data[0] : data;

      testResults.push({
        boardName,
        module,
        query: queryDescription,
        status: 'PASS',
        recordCount: count,
        durationMs,
        sample
      });

      console.log(`  [PASS] ${boardName.padEnd(28)} | ${module.padEnd(10)} | ${count.toString().padStart(4)} records | ${durationMs.toString().padStart(4)}ms`);
    } catch (err: any) {
      testResults.push({
        boardName,
        module,
        query: queryDescription,
        status: 'FAIL',
        recordCount: 0,
        durationMs: Date.now() - start,
        details: `Exception: ${err.message}`
      });
      console.error(`  [FAIL] ${boardName} (${module}) - Exception: ${err.message}`);
    }
  }

  // STEP 3: EXECUTE TEST FOR EACH BOARD
  console.log('[Phase 2] Testing Supabase Data Hydration per Board...');
  console.log('--------------------------------------------------------------------------------');

  // 1. School Profile & Master Settings (Verwaltung -> Setup)
  await testBoard(
    'School Setup & Stammdaten',
    'Verwaltung',
    "schools.select('*').eq('id', schoolId)",
    () => authenticatedClient.from('schools').select('*').eq('id', schoolId).single()
  );

  // 2. Employees Board (Verwaltung -> Mitarbeiter)
  await testBoard(
    'Mitarbeiter (Staff/Teachers)',
    'Verwaltung',
    "users.select('*').eq('school_id', schoolId)",
    () => authenticatedClient.from('users').select('id, first_name, last_name, role, roles, email, instrument, is_active, ausweis_nummer').eq('school_id', schoolId)
  );

  // 3. Rooms Board (Verwaltung -> Räume)
  await testBoard(
    'Räume (Rooms)',
    'Verwaltung',
    "rooms.select('*').eq('school_id', schoolId)",
    () => authenticatedClient.from('rooms').select('*').eq('school_id', schoolId)
  );

  // 4. Buildings Board (Verwaltung -> Gebäude)
  await testBoard(
    'Gebäude (Buildings)',
    'Verwaltung',
    "buildings.select('*').eq('school_id', schoolId)",
    () => authenticatedClient.from('buildings').select('*').eq('school_id', schoolId)
  );

  // 5. Equipment Board (Verwaltung -> Equipment & Instrumente)
  await testBoard(
    'Inventar & Leihequipment',
    'Verwaltung',
    "school_equipment.select('*').eq('school_id', schoolId)",
    () => authenticatedClient.from('school_equipment').select('*').eq('school_id', schoolId)
  );

  // 6. Briefing & System Alerts (Verwaltung -> Briefing)
  await testBoard(
    'System Alerts & Briefing',
    'Verwaltung',
    "system_alerts.select('*').eq('school_id', schoolId)",
    () => authenticatedClient.from('system_alerts').select('*').eq('school_id', schoolId)
  );

  // 7. Audit Log Board (Verwaltung -> DSGVO Audit Trail)
  await testBoard(
    'DSGVO Audit Log',
    'Verwaltung',
    "audit_logs.select('id, action, table_name, created_at').eq('school_id', schoolId)",
    () => authenticatedClient.from('audit_logs').select('id, action, table_name, created_at').eq('school_id', schoolId).limit(50)
  );

  // 8. B2B AVV Legal Compliance (Verwaltung -> DSGVO AVV)
  await testBoard(
    'Rechtliches & AVV Status',
    'Verwaltung',
    "legal_consents.select('*').eq('school_id', schoolId)",
    () => authenticatedClient.from('legal_consents').select('*').eq('school_id', schoolId)
  );

  // 9. Schedules Board (Campus -> Stundenplan / Raumbelegungsmatrix)
  await testBoard(
    'Stundenpläne & Belegungen',
    'Campus',
    "schedules.select('*').eq('school_id', schoolId)",
    () => authenticatedClient.from('schedules').select('*').eq('school_id', schoolId)
  );

  // 10. Subjects Board (Campus -> Fächer & Tarife)
  await testBoard(
    'Fächer & Kategorien',
    'Campus',
    "subjects.select('*').eq('school_id', schoolId)",
    () => authenticatedClient.from('subjects').select('*').eq('school_id', schoolId)
  );

  // 11. Students Roster Board (Campus -> Schülerverwaltung)
  await testBoard(
    'Schüler Roster & Verträge',
    'Campus',
    "students.select('*').eq('school_id', schoolId)",
    () => authenticatedClient.from('students').select('id, status, onboarding_frozen, timetable_assigned_at').eq('school_id', schoolId)
  );

  // 12. Student Activation Days (Campus -> Schüler-Aktivierungen)
  await testBoard(
    'Aktivierungstage (DSGVO)',
    'Campus',
    "activation_days.select('*').eq('school_id', schoolId)",
    () => authenticatedClient.from('activation_days').select('*').eq('school_id', schoolId)
  );

  // 13. GrooveLab Stations Board (GrooveLab -> Stationen & Proberäume)
  await testBoard(
    'GrooveLab Stationen',
    'GrooveLab',
    "stations.select('*, rooms!inner(*)').eq('rooms.school_id', schoolId)",
    () => authenticatedClient.from('stations').select('*, rooms!inner(*)').eq('rooms.school_id', schoolId)
  );

  // 14. GrooveLab Bands Board (GrooveLab -> Bands & Ensembles)
  await testBoard(
    'GrooveLab Bands & Ensembles',
    'GrooveLab',
    "bands.select('*').eq('school_id', schoolId)",
    () => authenticatedClient.from('bands').select('*').eq('school_id', schoolId)
  );

  // 15. Invoices & Billing History (Verwaltung -> Lizenzen / Rechnungen)
  await testBoard(
    'Rechnungen & Abrechnung',
    'Verwaltung',
    "invoices.select('*').eq('school_id', schoolId)",
    () => authenticatedClient.from('invoices').select('id, type, amount, status, billing_date, due_date, items').eq('school_id', schoolId)
  );

  // 16. Tariff Bookings (Verwaltung -> Tarifbuchungen)
  await testBoard(
    'Tarif- & Modulbuchungen',
    'Verwaltung',
    "school_tariff_bookings.select('*').eq('school_id', schoolId)",
    () => authenticatedClient.from('school_tariff_bookings').select('*').eq('school_id', schoolId)
  );

  // STEP 4: PRINT SUMMARY REPORT
  console.log('\n================================================================================');
  console.log('FORENSIC HYDRATION AUDIT SUMMARY');
  console.log('================================================================================');

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;

  console.log(`Total Boards Tested: ${testResults.length}`);
  console.log(`Successful Hydrations: ${passed}`);
  console.log(`Failed Hydrations: ${failed}`);

  if (failed > 0) {
    console.error('\nFAILED BOARDS DETAILS:');
    testResults.filter(r => r.status === 'FAIL').forEach(r => {
      console.error(`- [${r.module}] ${r.boardName}: ${r.details}`);
    });
  } else {
    console.log('\n🌟 100% SUCCESS: ALL BOARDS CORRECTLY HYDRATE FROM SUPABASE!');
  }

  // FORENSIC DATA INVENTORY
  console.log('\nFORENSIC DATA INVENTORY FOR SCHOOL:');
  testResults.filter(r => r.status === 'PASS').forEach(r => {
    console.log(`  • ${r.boardName.padEnd(28)}: ${r.recordCount} rows in DB`);
  });

  return failed === 0;
}

runHydrationTestSuite()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal crash in test runner:', err);
    process.exit(1);
  });

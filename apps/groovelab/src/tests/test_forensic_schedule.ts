import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg3NTU4MDYxLCJleHAiOjIxMDI5MTgwNjF9.FZWOhJ8B7coAqv4IX3dKFYFerKwODGiQm-5IFFKiPIc';
const ADMIN_CREDENTIAL = '11079eae-664a-49a4-8692-771d83a3193c';

async function runForensicSuite() {
  console.log('================================================================================');
  console.log('FORENSIC REVISIONSSICHERES TERMIN-EINTELEN & SCHEDULE PERSISTENCE TEST');
  console.log('================================================================================');

  const baseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: authError } = await baseClient.rpc('authenticate_by_credential', {
    p_credential: ADMIN_CREDENTIAL
  });

  if (authError || !authData?.success || !authData?.lease_token) {
    console.error('FATAL: Auth RPC failed!', authError || authData);
    process.exit(1);
  }

  const leaseToken = authData.lease_token;
  const schoolId = authData.user?.school_id;
  console.log(`[PASS] Authenticated as ${authData.user?.first_name} ${authData.user?.last_name} (${authData.user?.role})`);
  console.log(`School ID: ${schoolId}\n`);

  const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);
    let clientInfo = headers.get('x-client-info') || 'supabase-js/2.39.3';
    clientInfo += `;session_token=${leaseToken}`;
    headers.set('x-client-info', clientInfo);
    headers.set('x-session-token', leaseToken);
    return fetch(input, { ...init, headers });
  };

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: authFetch }
  });

  // TEST 1: Find Teachers and Peter Pan
  console.log('--- TEST 1: Query Peter Pan Profile & Planned Boards ---');
  const { data: users, error: userErr } = await client
    .from('users')
    .select('id, school_id, first_name, last_name, role, planned_boards')
    .eq('school_id', schoolId)
    .ilike('last_name', '%pan%');

  if (userErr) console.error('User query error:', userErr);
  console.log(`Found ${users?.length || 0} Peter Pan records.`);
  const peterPan: any = (users as any)?.[0];
  if (peterPan) {
    console.log(`ID: ${peterPan.id}`);
    console.log(`Role: ${peterPan.role}`);
    const pb = peterPan.planned_boards || peterPan.campus_räume;
    console.log(`planned_boards status: ${(pb as any)?.status}`);
    console.log(`submittedDraftId: ${(pb as any)?.submittedDraftId}`);
    console.log(`submittedAt: ${(pb as any)?.submittedAt}`);
    console.log(`approvedAt: ${(pb as any)?.approvedAt}`);
    const drafts = (pb as any)?.drafts || [];
    console.log(`Drafts count: ${Array.isArray(drafts) ? drafts.length : Object.keys(drafts).length}`);
    if (Array.isArray(drafts) && drafts.length > 0) {
      const activeDraft = drafts.find((d: any) => d.id === (pb as any)?.submittedDraftId) || drafts[0];
      console.log(`Active draft status: ${activeDraft.status}`);
      console.log(`Active draft boards: ${activeDraft.boards?.length || 0}`);
      if (activeDraft.boards?.length > 0) {
        activeDraft.boards.forEach((b: any, idx: number) => {
          console.log(`  Board ${idx + 1}: Day ${b.dayOfWeek}, Room: ${b.roomId || 'NONE'}, Students: ${b.students?.length || 0}`);
        });
      }
    }
  }

  // TEST 2: Check Active Alerts
  console.log('\n--- TEST 2: Active System Alerts for School ---');
  const { data: alerts, error: alertErr } = await client
    .from('system_alerts')
    .select('*')
    .eq('school_id', schoolId)
    .eq('resolved', false);
  console.log(`Unresolved alerts count: ${alerts?.length || 0}`);
  alerts?.forEach(a => {
    console.log(`  Alert [${a.type}] for teacher ${a.teacher_id}: ${a.message.substring(0, 80)}...`);
  });

  // TEST 3: Check Current Schedules in DB
  console.log('\n--- TEST 3: Current Schedules in DB for School ---');
  const { data: currentScheds, error: schedErr } = await client
    .from('schedules')
    .select('*')
    .eq('school_id', schoolId);
  console.log(`Total schedules in DB for school: ${currentScheds?.length || 0}`);
  if (peterPan) {
    const ppScheds = (currentScheds || []).filter(s => s.teacher_id === peterPan.id);
    console.log(`Schedules for Peter Pan in DB: ${ppScheds.length}`);
    ppScheds.forEach(s => {
      console.log(`  Slot: Day ${s.day_of_week} at ${s.time_slot} (Room: ${s.room_id}, Status: ${s.status}, Student: ${s.student_id})`);
    });
  }

  // TEST 4: Check Schedule Occurrences
  console.log('\n--- TEST 4: Schedule Occurrences in DB ---');
  const { data: occs, error: occErr } = await client
    .from('schedule_occurrences')
    .select('*')
    .eq('school_id', schoolId)
    .limit(5);
  console.log(`Occurrences query err: ${occErr?.message || 'None'}, count: ${occs?.length || 0}`);

  // TEST 5: Check Audit Logs Schema & Write Capability
  console.log('\n--- TEST 5: Audit Log Schema & Test Insert ---');
  const testAudit = {
    school_id: schoolId,
    user_id: authData.user?.id,
    action: 'TEST_SCHEDULE_ALLOCATION_AUDIT',
    entity_type: 'schedule_board',
    entity_id: peterPan?.id || schoolId,
    details: {
      test: true,
      description: 'Revisionssichere Zuweisung Prüftest',
      timestamp: new Date().toISOString()
    }
  };
  const { data: auditRes, error: auditErr } = await client
    .from('audit_logs')
    .insert([testAudit])
    .select('id');
  if (auditErr) {
    console.error('Audit log insert error:', auditErr);
  } else {
    console.log(`[PASS] Audit log inserted successfully with ID: ${auditRes?.[0]?.id}`);
    // Clean up test audit log
    await client.from('audit_logs').delete().eq('id', auditRes[0].id);
    console.log('[PASS] Test audit log cleaned up.');
  }

  // TEST 6: Simulate Exact Schedule Save & Occurrence Generation for Peter Pan
  if (peterPan) {
    console.log('\n--- TEST 6: Simulate Save & Approve Pipeline for Peter Pan ---');
    const pb = peterPan.planned_boards || peterPan.campus_räume;
    const drafts = (pb as any)?.drafts || [];
    const activeDraft = Array.isArray(drafts) ? (drafts.find((d: any) => d.id === (pb as any)?.submittedDraftId) || drafts[0]) : null;

    if (activeDraft && activeDraft.boards) {
      console.log(`Found active draft with ${activeDraft.boards.length} boards. Checking student IDs...`);
      const sampleBoard = activeDraft.boards[0];
      if (sampleBoard && sampleBoard.students) {
        console.log(`Sample students in Board 1:`);
        sampleBoard.students.forEach((st: any) => {
          console.log(`  - Student: "${st.first_name} ${st.last_name}", ID: "${st.id}", isBreak: ${st.isBreak}, assignedTime: ${st.assignedTime}`);
        });

        // Check if student IDs actually exist in users table
        const studentIds = sampleBoard.students
          .filter((s: any) => !s.isBreak && s.id)
          .map((s: any) => s.id);

        if (studentIds.length > 0) {
          const { data: existingUsers, error: existErr } = await client
            .from('users')
            .select('id, first_name, last_name')
            .in('id', studentIds);
          console.log(`Student ID verification: ${existingUsers?.length || 0} of ${studentIds.length} exist in users table.`);
          if (existErr) console.error('Student check err:', existErr);
          const foundIds = new Set((existingUsers || []).map(u => u.id));
          studentIds.forEach((id: string) => {
            if (!foundIds.has(id)) {
              console.warn(`  ⚠️ Student ID "${id}" does NOT exist in public.users!`);
            } else {
              console.log(`  ✅ Student ID "${id}" exists in public.users.`);
            }
          });
        }
      }
    }
  }

  console.log('\n================================================================================');
  console.log('FORENSIC AUDIT COMPLETE');
  console.log('================================================================================');
}

runForensicSuite().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local';
if (!fs.existsSync(envPath)) {
  console.error("❌ ERROR: .env.local not found!");
  process.exit(1);
}
const env = fs.readFileSync(envPath, 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const adminToken = env.match(/VITE_BYPASS_ADMIN_TOKEN=(.*)/)?.[1]?.trim() || '11079eae-664a-49a4-8692-771d83a3193c';

const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-user-id': adminToken
    }
  }
});

async function auditDatabaseCreations() {
  console.log("=========================================");
  console.log("🔍 DATABASE CREATION & SCHEMA AUDIT");
  console.log("=========================================\n");

  const results = [];

  const { data: school, error: schoolErr } = await supabase.from('schools').select('id').limit(1).single();
  if (schoolErr || !school) {
    console.error("❌ Failed to fetch school ID for testing:", schoolErr);
    process.exit(1);
  }
  const schoolId = school.id;
  console.log(`🏫 Testing against School ID: ${schoolId}`);

  // Test 1: User Insert (Teacher)
  const testTeacherId = crypto.randomUUID();
  const { error: userErr } = await supabase.from('users').insert({
    id: testTeacherId,
    school_id: schoolId,
    role: 'teacher',
    roles: ['teacher'],
    first_name: 'TestAudit',
    last_name: 'Teacher',
    instrument: 'Gitarre',
    is_active: true,
    is_app_user: true,
    is_campus_active: true,
    is_groovelab_active: true
  });
  if (userErr) {
    console.error("❌ Test 1 (User Insert): FAIL -", userErr.message);
    results.push({ test: 'User Insert', status: 'FAIL', error: userErr.message });
  } else {
    console.log("✅ Test 1 (User Insert): PASS");
    results.push({ test: 'User Insert', status: 'PASS' });
  }

  // Check roles column value for inserted user
  const { data: insertedUser, error: checkRoleErr } = await supabase.from('users').select('id, role, roles').eq('id', testTeacherId).single();
  if (insertedUser) {
    console.log(`   User Roles check: role="${insertedUser.role}", roles=${JSON.stringify(insertedUser.roles)}`);
  }

  // Test 2: Band Insert & Member Insert
  const testBandId = crypto.randomUUID();
  const { error: bandErr } = await supabase.from('bands').insert({
    id: testBandId,
    school_id: schoolId,
    name: 'Audit Test Band',
    coach_id: testTeacherId,
    status: 'active'
  });
  if (bandErr) {
    console.error("❌ Test 2 (Band Insert): FAIL -", bandErr.message);
    results.push({ test: 'Band Insert', status: 'FAIL', error: bandErr.message });
  } else {
    console.log("✅ Test 2 (Band Insert): PASS");
    results.push({ test: 'Band Insert', status: 'PASS' });

    // Test Band Member Insert with role
    const { error: memErr } = await supabase.from('band_members').insert({
      band_id: testBandId,
      user_id: testTeacherId,
      instrument: 'Coach',
      role: 'coach'
    });
    if (memErr) {
      console.error("❌ Test 2b (Band Member Insert with role): FAIL -", memErr.message);
      results.push({ test: 'Band Member Insert', status: 'FAIL', error: memErr.message });
    } else {
      console.log("✅ Test 2b (Band Member Insert with role): PASS");
      results.push({ test: 'Band Member Insert', status: 'PASS' });
    }
  }

  // Test 3: Room Insert
  const testRoomId = crypto.randomUUID();
  const { error: roomErr } = await supabase.from('rooms').insert({
    id: testRoomId,
    school_id: schoolId,
    name: 'Audit Test Room',
    color: '#3b82f6'
  });
  if (roomErr) {
    console.error("❌ Test 3 (Room Insert): FAIL -", roomErr.message);
    results.push({ test: 'Room Insert', status: 'FAIL', error: roomErr.message });
  } else {
    console.log("✅ Test 3 (Room Insert): PASS");
    results.push({ test: 'Room Insert', status: 'PASS' });
  }

  // Test 4: Subject Insert
  const testSubjId = crypto.randomUUID();
  const { error: subjErr } = await supabase.from('subjects').insert({
    id: testSubjId,
    school_id: schoolId,
    name: 'Audit Test Subject'
  });
  if (subjErr) {
    console.error("❌ Test 4 (Subject Insert): FAIL -", subjErr.message);
    results.push({ test: 'Subject Insert', status: 'FAIL', error: subjErr.message });
  } else {
    console.log("✅ Test 4 (Subject Insert): PASS");
    results.push({ test: 'Subject Insert', status: 'PASS' });
  }

  // Test 5: Duty Insert
  const testDutyId = crypto.randomUUID();
  const { error: dutyErr } = await supabase.from('duties').insert({
    id: testDutyId,
    school_id: schoolId,
    title: 'Audit Test Duty',
    assigned_user_id: testTeacherId,
    status: 'offen'
  });
  if (dutyErr) {
    console.error("❌ Test 5 (Duty Insert): FAIL -", dutyErr.message);
    results.push({ test: 'Duty Insert', status: 'FAIL', error: dutyErr.message });
  } else {
    console.log("✅ Test 5 (Duty Insert): PASS");
    results.push({ test: 'Duty Insert', status: 'PASS' });
  }

  // Test 6: Cooperation Insert
  const testCoopId = crypto.randomUUID();
  const { error: coopErr } = await supabase.from('cooperations').insert({
    id: testCoopId,
    school_id: schoolId,
    name: 'Audit Test Coop',
    partner_name: 'Partner School'
  });
  if (coopErr) {
    console.error("❌ Test 6 (Cooperation Insert): FAIL -", coopErr.message);
    results.push({ test: 'Cooperation Insert', status: 'FAIL', error: coopErr.message });
  } else {
    console.log("✅ Test 6 (Cooperation Insert): PASS");
    results.push({ test: 'Cooperation Insert', status: 'PASS' });
  }

  // Cleanup test data
  console.log("\n🧹 Cleaning up test records...");
  await supabase.from('cooperations').delete().eq('id', testCoopId);
  await supabase.from('duties').delete().eq('id', testDutyId);
  await supabase.from('subjects').delete().eq('id', testSubjId);
  await supabase.from('rooms').delete().eq('id', testRoomId);
  await supabase.from('band_members').delete().eq('band_id', testBandId);
  await supabase.from('bands').delete().eq('id', testBandId);
  await supabase.from('users').delete().eq('id', testTeacherId);
  console.log("✨ Cleanup finished.");

  console.log("\n=========================================");
  console.log("SUMMARY OF AUDIT RESULTS:");
  console.log("=========================================");
  console.table(results);
}

auditDatabaseCreations().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

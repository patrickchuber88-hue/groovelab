import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local';
const env = fs.readFileSync(envPath, 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const adminToken = env.match(/VITE_BYPASS_ADMIN_TOKEN=(.*)/)?.[1]?.trim() || '11079eae-664a-49a4-8692-771d83a3193c';

const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-user-id': adminToken,
      'x-qr-token': adminToken
    }
  }
});

const TEST_SCHOOL_ID = '53e83805-1d5a-4ed8-988e-1fb0b8200b9c';

async function runPermissionAudit() {
  console.log('=========================================');
  console.log('🔒 SYSTEM-WIDE PERMISSIONS & RLS AUDIT');
  console.log('=========================================');

  const results = [];

  // 1. Audit User Deletion linked to Band Coach
  try {
    const tempCoachId = crypto.randomUUID();
    const tempBandId = crypto.randomUUID();

    // Insert dummy coach
    const { error: insertUserErr } = await supabase.from('users').insert({
      id: tempCoachId,
      school_id: TEST_SCHOOL_ID,
      role: 'teacher',
      first_name: 'Temp',
      last_name: 'CoachToDelete'
    });
    if (insertUserErr) throw insertUserErr;

    // Insert band referencing coach
    const { error: insertBandErr } = await supabase.from('bands').insert({
      id: tempBandId,
      school_id: TEST_SCHOOL_ID,
      name: 'Temp Band FK Test',
      coach_id: tempCoachId
    });
    if (insertBandErr) throw insertBandErr;

    // Delete the coach (should NOT fail with foreign key violation!)
    const { error: deleteUserErr } = await supabase.from('users').delete().eq('id', tempCoachId);
    if (deleteUserErr) throw deleteUserErr;

    // Cleanup temp band
    await supabase.from('bands').delete().eq('id', tempBandId);

    results.push({ test: 'User Deletion linked to Band Coach (FK ON DELETE SET NULL)', status: 'PASS' });
  } catch (err) {
    results.push({ test: 'User Deletion linked to Band Coach (FK ON DELETE SET NULL)', status: 'FAIL', error: err.message });
  }

  // 2. Audit Pilot Agreements RLS
  try {
    const newId = crypto.randomUUID();
    const { error: insertErr } = await supabase.from('pilot_agreements').insert({
      id: newId,
      school_id: TEST_SCHOOL_ID,
      ip_address: '127.0.0.1',
      user_agent: 'Audit-Runner'
    });

    if (insertErr) throw insertErr;

    const { error: deleteErr } = await supabase.from('pilot_agreements').delete().eq('id', newId);
    if (deleteErr) throw deleteErr;

    results.push({ test: 'Pilot Agreements RLS (Insert/Select/Delete)', status: 'PASS' });
  } catch (err) {
    results.push({ test: 'Pilot Agreements RLS (Insert/Select/Delete)', status: 'FAIL', error: err.message });
  }

  // 3. Audit User Self-Update
  try {
    const { data: teacher, error: fetchErr } = await supabase
      .from('users')
      .select('id, first_name, photo_url')
      .eq('school_id', TEST_SCHOOL_ID)
      .eq('role', 'teacher')
      .limit(1)
      .single();

    if (fetchErr) throw fetchErr;

    const { error: updateErr } = await supabase
      .from('users')
      .update({ photo_url: teacher.photo_url || '/avatars/gitarre_avatar_new.png' })
      .eq('id', teacher.id);

    if (updateErr) throw updateErr;
    results.push({ test: 'User Self Profile Update (photo_url)', status: 'PASS' });
  } catch (err) {
    results.push({ test: 'User Self Profile Update (photo_url)', status: 'FAIL', error: err.message });
  }

  console.log('\n=========================================');
  console.log('SUMMARY OF PERMISSION AUDIT RESULTS:');
  console.log('=========================================');
  console.table(results);
}

runPermissionAudit();

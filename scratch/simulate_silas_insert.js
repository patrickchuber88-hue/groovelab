import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const anonKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const SILAS_ID = 'f7f83cc3-6900-4388-8290-a4d99a9fb383';

// Create a supabase client that simulates Silas by adding x-user-id header
const supabase = createClient(url, anonKey, {
  global: {
    headers: {
      'x-user-id': SILAS_ID
    }
  }
});

async function testInsert() {
  console.log("1. Simulating focus log insert...");
  const res1 = await supabase.from('fokus_logs').insert({
    user_id: SILAS_ID,
    duration_minutes: 3,
    duration_seconds: 180,
    is_extra: false,
    flame_level: 'flame_1',
    created_at: new Date().toISOString()
  });
  console.log("Insert fokus_logs result:", res1);

  console.log("\n2. Simulating student_stats upsert...");
  const res2 = await supabase.from('student_stats').upsert({
    student_id: SILAS_ID,
    total_focus_minutes: 6,
    monthly_focus_minutes: 6,
    streak_flame: 1,
    last_practice_date: new Date().toISOString().split('T')[0],
    current_xp: 60,
    updated_at: new Date().toISOString()
  });
  console.log("Upsert student_stats result:", res2);

  console.log("\n3. Simulating avatars update...");
  // First get the avatar record
  const { data: avatarRecord } = await supabase
    .from('avatars')
    .select('*')
    .eq('user_id', SILAS_ID)
    .maybeSingle();
  console.log("Get avatar record:", avatarRecord);

  if (avatarRecord) {
    const res3 = await supabase.from('avatars').update({
      xp: 60,
      streak_flame: 1,
      last_focus_date: new Date().toISOString().split('T')[0]
    }).eq('id', avatarRecord.id);
    console.log("Update avatars result:", res3);
  }
}

testInsert();

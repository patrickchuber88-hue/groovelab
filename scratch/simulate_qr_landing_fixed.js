import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const anonKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const SILAS_TOKEN = '76639706-0c2b-44f2-a991-b45c285e4575';
const SILAS_ID = 'f7f83cc3-6900-4388-8290-a4d99a9fb383';

async function simulate() {
  console.log("=== SIMULATING FIXED QR LANDING PAGE SESSION ===");
  
  // Set headers as they will be set when profile is active:
  // groovelab_user_id -> SILAS_ID
  // groovelab_qr_token -> SILAS_TOKEN
  const supabase = createClient(url, anonKey, {
    global: {
      headers: {
        'x-user-id': SILAS_ID,
        'x-qr-token': SILAS_TOKEN
      }
    }
  });

  console.log("\n1. Fetching schedules...");
  const { data: schData, error: schError } = await supabase
    .from('schedules')
    .select(`
      *,
      teacher:teacher_id(first_name, last_name),
      room:room_id(name)
    `)
    .eq('student_id', SILAS_ID);
  console.log("Schedules fetch:", schError ? schError : `Success! Found ${schData.length} schedules`);

  console.log("\n2. Fetching student stats...");
  const { data: statsData, error: statsError } = await supabase
    .from('student_stats')
    .select('*')
    .eq('student_id', SILAS_ID)
    .maybeSingle();
  console.log("Student stats fetch:", statsError ? statsError : statsData);

  console.log("\n3. Inserting a focus log...");
  const logInsert = await supabase.from('fokus_logs').insert({
    user_id: SILAS_ID,
    duration_minutes: 3,
    duration_seconds: 180,
    is_extra: false,
    flame_level: 'Kleine Flamme',
    created_at: new Date().toISOString()
  });
  console.log("Insert fokus_log result:", logInsert);
}

simulate();

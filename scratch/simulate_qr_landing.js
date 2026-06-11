import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const anonKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const SILAS_TOKEN = '76639706-0c2b-44f2-a991-b45c285e4575';
const SILAS_ID = 'f7f83cc3-6900-4388-8290-a4d99a9fb383';

async function simulate() {
  console.log("=== SIMULATING QR LANDING PAGE INIT ===");
  // Step 1: Init (x-qr-token is set)
  const supabaseInit = createClient(url, anonKey, {
    global: { headers: { 'x-qr-token': SILAS_TOKEN } }
  });
  
  const { data: userData, error: userError } = await supabaseInit
    .from('users')
    .select('id, first_name, last_name, school_id, is_campus_active, is_groovelab_active, app_usage_mode')
    .eq('qr_token', SILAS_TOKEN)
    .single();

  console.log("UserData fetch:", userError ? userError : userData);

  // Step 2: Dashboard loading & practice logging (x-qr-token is removed, no other headers present)
  console.log("\n=== SIMULATING DASHBOARD FETCH (NO HEADERS) ===");
  const supabaseDashboardNoHeaders = createClient(url, anonKey);

  const { data: schData, error: schError } = await supabaseDashboardNoHeaders
    .from('schedules')
    .select('*')
    .eq('student_id', SILAS_ID);
  console.log("Schedules fetch:", schError ? schError : `Found ${schData.length} schedules`);

  const { data: statsData, error: statsError } = await supabaseDashboardNoHeaders
    .from('student_stats')
    .select('*')
    .eq('student_id', SILAS_ID)
    .maybeSingle();
  console.log("Student stats fetch:", statsError ? statsError : statsData);

  console.log("\n=== SIMULATING PRACTICE LOG WRITE (NO HEADERS) ===");
  const logInsert = await supabaseDashboardNoHeaders.from('fokus_logs').insert({
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

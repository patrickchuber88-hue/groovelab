import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('../apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(url, serviceKey);

async function run() {
  const teacherId = '97e73f5d-b6d6-47d5-bb47-18ad02bae725'; // Manuel Wagner
  
  console.log("=== Finding all occurrences for students named Felix under Manuel Wagner ===");
  const { data: occs, error } = await supabase
    .from('schedule_occurrences')
    .select('*, student:student_id(*)')
    .eq('teacher_id', teacherId)
    .like('student.first_name', 'Felix%');
    
  if (error) console.error(error);
  else console.log(JSON.stringify(occs, null, 2));
}

run();

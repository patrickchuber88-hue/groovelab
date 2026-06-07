import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';
  console.log("Fetching pending students with anon key...");
  
  const { data: pendingStudents, error: pendingErr } = await supabase
    .from('students')
    .select('id, school_id, teacher_id, instrument, status, created_at, student_names(first_name, last_name), activation_days(day_of_birth)')
    .eq('school_id', schoolId)
    .eq('status', 'ausstehend');

  console.log("Error:", pendingErr);
  console.log("Data count:", pendingStudents?.length);
  console.log("Data:", JSON.stringify(pendingStudents, null, 2));
}

run();

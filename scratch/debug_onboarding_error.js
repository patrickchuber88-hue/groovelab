import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log("Calling import_student RPC...");
  
  // Call import_student RPC
  const { data: newStudentId, error: rpcError } = await supabase.rpc('import_student', {
    first_name: 'Testy',
    last_name: 'Onboarder',
    birth_date: '25.12.2015',
    instrument: 'Blockflöte',
    school_id: '74713df2-6176-4a41-a8cd-9fbebe34e9b8', // Use school id from earlier
    teacher_id: null
  });

  if (rpcError) {
    console.error("RPC Error:", rpcError);
    return;
  }
  
  console.log("Imported student ID:", newStudentId);

  // Check if they exist in users table (using RPC or we can just fetch if RLS allows or we can use SSH)
  // Let's print out what is in students table for this ID
  const { data: studentRecord, error: studentError } = await supabase
    .from('students')
    .select('*, student_names(*)')
    .eq('id', newStudentId);

  console.log("Student record in students table:", studentRecord, studentError);
}

run();

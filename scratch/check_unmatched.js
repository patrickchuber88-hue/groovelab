import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const borisId = 'ff30d2e9-43ae-432b-bba7-c4766bd57ca4';
  const { data: students, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, teacher_id, instrument')
    .eq('school_id', '74713df2-6176-4a41-a8cd-9fbebe34e9b8')
    .eq('role', 'student');

  console.log("Total students in school:", students.length);
  const matched = students.filter(s => s.teacher_id === borisId);
  console.log("Matched students count:", matched.length);
  const unmatched = students.filter(s => s.teacher_id !== borisId);
  console.log("Unmatched students count:", unmatched.length);
  console.log("First 5 unmatched students:", unmatched.slice(0, 5));
}

run();

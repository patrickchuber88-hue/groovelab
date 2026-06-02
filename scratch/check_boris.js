import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data: users, error } = await supabase.from('users').select('*').ilike('first_name', '%boris%');
  if (error) {
    console.error("Fetch error:", error);
    return;
  }
  console.log("Boris Users:", JSON.stringify(users, null, 2));

  if (users && users.length > 0) {
    const boris = users[0];
    const { data: students, error: sError } = await supabase.from('users').select('id, first_name, last_name, role, teacher_id, instrument').eq('teacher_id', boris.id);
    if (sError) {
      console.error("Students error:", sError);
      return;
    }
    console.log(`Students for Boris (linked by teacher_id):`, students);

    // Let's also check all students in Boris's school and their instrument / teacher_id
    const { data: allStudents, error: asError } = await supabase.from('users').select('id, first_name, last_name, role, teacher_id, instrument').eq('school_id', boris.school_id).eq('role', 'student');
    console.log(`Total students in Boris's school:`, allStudents?.length);
    console.log(`Drums students in school:`, allStudents?.filter(s => s.instrument === 'Drums' || s.instrument === 'Schlagzeug' || s.instrument === 'E-Drums'));
  }
}

run();

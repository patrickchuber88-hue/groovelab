import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function run() {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .ilike('first_name', '%Manuel%');

  console.log("Manuel Wagner:", users);

  if (users && users.length > 0) {
    const manuel = users[0];
    const { data: students, error: sErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, role, teacher_id, school_id')
      .eq('teacher_id', manuel.id);
    
    console.log("Students assigned directly via teacher_id:", students);

    // Let's also check schedules / lessons where Manuel is the teacher
    const { data: schedules, error: schErr } = await supabase
      .from('schedules')
      .select('id, student_id, teacher_id, student:users!schedules_student_id_fkey(first_name, last_name)')
      .eq('teacher_id', manuel.id);

    console.log("Schedules (lessons) linked to Manuel:", schedules);
  }
}

run();

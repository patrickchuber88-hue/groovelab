import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const lines = env.split('\n');
let url = '';
let key = '';
for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    url = line.split('=')[1].trim();
  }
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    key = line.split('=')[1].trim();
  }
}

// Patrick Huber ID
const patrickHuberId = '03564b1c-e2bb-4ccb-be95-b9fd1ef34829';

const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-user-id': patrickHuberId
    }
  }
});

async function check() {
  // 1. Get our school
  const { data: me, error: meErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, school_id')
    .eq('id', patrickHuberId)
    .single();
    
  if (meErr) {
    console.error("Error fetching me:", meErr);
    return;
  }
  console.log("Logged in user:", me.first_name, me.last_name, "School ID:", me.school_id);

  // 2. Fetch all teachers in school
  const { data: teachers, error: tErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, role')
    .eq('school_id', me.school_id)
    .eq('role', 'teacher');
    
  if (tErr) {
    console.error("Error fetching teachers:", tErr);
    return;
  }
  
  console.log(`\nTeachers in school:`);
  teachers.forEach(t => console.log(`- ${t.first_name} ${t.last_name} (${t.id})`));

  // 3. For each teacher, query schedule_occurrences for the week of June 1-7, 2026
  for (const t of teachers) {
    console.log(`\n--- Occurrences in DB for ${t.first_name} ${t.last_name} (${t.id}) ---`);
    const { data: occurrences, error: occErr } = await supabase
      .from('schedule_occurrences')
      .select(`
        id,
        student_id,
        teacher_id,
        date,
        start_time,
        duration,
        status,
        original_date,
        student:users!schedule_occurrences_student_id_fkey(first_name, last_name)
      `)
      .eq('teacher_id', t.id)
      .gte('date', '2026-06-01')
      .lte('date', '2026-06-07');
      
    if (occErr) {
      console.error(occErr);
    } else {
      console.log(`Found ${occurrences.length} occurrences in DB:`);
      occurrences.forEach(occ => {
        console.log(`- Date: ${occ.date}, Time: ${occ.start_time}, Student: ${occ.student?.first_name} ${occ.student?.last_name}, Status: ${occ.status}, Orig Date: ${occ.original_date}`);
      });
    }
  }
}

check();

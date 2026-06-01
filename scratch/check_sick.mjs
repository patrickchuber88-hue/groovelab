import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data: sickTeachers, error: err1 } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, sick_until')
    .not('sick_until', 'is', null);
  
  console.log("=== Sick Teachers ===");
  console.log(sickTeachers);

  if (sickTeachers && sickTeachers.length > 0) {
    const teacherId = sickTeachers[0].id;
    const { data: schedules } = await supabase
      .from('schedules')
      .select('*')
      .eq('teacher_id', teacherId);
    console.log(`=== Schedules for ${sickTeachers[0].first_name} ===`);
    console.log(schedules);
  }

  const { data: notifications } = await supabase
    .from('crisis_notifications')
    .select('*, student:users!crisis_notifications_student_id_fkey(first_name, last_name)');
  console.log("=== Crisis Notifications ===");
  console.log(notifications);
}

run();

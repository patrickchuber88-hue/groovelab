import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('crisis_notifications')
    .select(`
      id,
      teacher_id,
      student_id,
      slot_start_datetime,
      status,
      notified_at,
      student:users!crisis_notifications_student_id_fkey (first_name, last_name, personal_pin, ausweis_id, instrument, phone),
      teacher:users!crisis_notifications_teacher_id_fkey (first_name, last_name)
    `)
    .order('slot_start_datetime', { ascending: true });
  
  console.log("=== Query Error ===");
  console.log(error);
  console.log("=== Query Data ===");
  console.log(data);
}

run();

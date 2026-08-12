import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('../apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function run() {
  const teacherId = '97e73f5d-b6d6-47d5-bb47-18ad02bae725'; // Manuel Wagner
  
  const { data: schedules, error } = await supabase
    .from('schedules')
    .select('*, student:student_id(*)')
    .eq('teacher_id', teacherId)
    .eq('day_of_week', 5)
    .eq('time_slot', '14:00');
    
  if (error) console.error(error);
  else console.log(JSON.stringify(schedules, null, 2));
}

run();

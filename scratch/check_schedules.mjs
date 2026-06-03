import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function checkSchedules() {
  const { data: schedules, error } = await supabase.from('schedules').select('*');
  if (error) {
    console.error("Error fetching schedules:", error);
    return;
  }
  
  console.log(`Total schedules: ${schedules.length}`);
  const nullTimeSlots = schedules.filter(s => !s.time_slot);
  console.log(`Schedules with null time_slot: ${nullTimeSlots.length}`);
  if (nullTimeSlots.length > 0) {
    console.log("Null time_slot schedules:", nullTimeSlots.map(s => ({ id: s.id, teacher_id: s.teacher_id, student_id: s.student_id })));
  }
}

checkSchedules();

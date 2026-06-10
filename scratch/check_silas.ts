import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Querying users...");
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, role')
    .or('last_name.ilike.%Stamm%,last_name.ilike.%Huber%');
  
  if (usersErr) {
    console.error("Users error:", usersErr);
  } else {
    console.log("Found users:", users);
  }

  console.log("\nQuerying schedules...");
  const { data: schedules, error: schErr } = await supabase
    .from('schedules')
    .select(`
      id,
      student_id,
      teacher_id,
      day_of_week,
      time_slot,
      status
    `);
  
  if (schErr) {
    console.error("Schedules error:", schErr);
  } else {
    console.log("Total schedules:", schedules?.length);
    const silasSch = schedules?.filter(s => s.status?.includes('cancel') || s.status === 'teacher_sick');
    console.log("Schedules with cancelled/sick status:", silasSch);
  }

  console.log("\nQuerying schedule_occurrences...");
  const { data: occurrences, error: occErr } = await supabase
    .from('schedule_occurrences')
    .select('*');
  
  if (occErr) {
    console.error("Occurrences error:", occErr);
  } else {
    console.log("Total occurrences:", occurrences?.length);
    console.log("All occurrences in DB:", occurrences);
  }
}

run();

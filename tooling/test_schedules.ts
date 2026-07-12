import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      id,
      time_slot,
      day_of_week,
      status,
      rooms (name),
      teacher:users!schedules_teacher_id_fkey (first_name, last_name),
      schedule_exceptions (exception_date, status)
    `)
    .limit(1);
  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}

run();

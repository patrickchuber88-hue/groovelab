import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'apps/groovelab/.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing supabase credentials in env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkOccurrences() {
  const { data: schedules, error } = await supabase
    .from('schedules')
    .select('*, student:student_id(first_name, last_name), teacher:teacher_id(first_name, last_name)');
  
  if (error) {
    console.error("Error fetching schedules:", error);
    return;
  }
  
  console.log("Schedules:", JSON.stringify(schedules, null, 2));
}

checkOccurrences();

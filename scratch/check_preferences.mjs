import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('student_schedule_preferences')
    .select('*')
    .eq('student_id', '64e54fef-e644-43cc-8071-eac432bb7fee')
    .eq('preference_type', 'gesperrt');
  
  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Blocked preferences for Amelie:", data);
}

run();

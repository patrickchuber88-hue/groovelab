import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  const { data: occurrences, error: err1 } = await supabase
    .from('schedule_occurrences')
    .select('*')
    .limit(5);
  console.log("schedule_occurrences data:", occurrences);
  console.log("schedule_occurrences error:", err1);

  const { data: schedules, error: err2 } = await supabase
    .from('schedules')
    .select('*')
    .limit(5);
  console.log("schedules data:", schedules);
  console.log("schedules error:", err2);
}

check();

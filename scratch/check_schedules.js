import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('schedules').select('original_room_id').limit(1);
  if (error) {
    console.log("Error querying original_room_id:", error.message);
  } else {
    console.log("Success! original_room_id exists.");
  }
}

check();

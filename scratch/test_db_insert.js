import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function test() {
  console.log("Supabase URL:", url);
  // Let's query schedule_occurrences
  const { data, error } = await supabase
    .from('schedule_occurrences')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error("Error fetching occurrences:", error);
  } else {
    console.log("Fetched occurrences:", data);
  }
}

test();

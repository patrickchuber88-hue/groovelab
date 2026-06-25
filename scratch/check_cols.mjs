import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(Topic|.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function checkCols() {
  const { data, error } = await supabase.from('schedule_occurrences').select('*').limit(1);
  if (error) {
    console.error("Error fetching occurrence:", error);
  } else if (data && data.length > 0) {
    console.log("Columns in schedule_occurrences:", Object.keys(data[0]));
    console.log("Full sample row:", data[0]);
  } else {
    console.log("No rows in schedule_occurrences, let's select a single empty select to check structure or get table info.");
    const { data: cols, error: err } = await supabase.from('schedule_occurrences').select('id').limit(1);
    console.log("Select id only result:", cols, err);
  }
}
checkCols();

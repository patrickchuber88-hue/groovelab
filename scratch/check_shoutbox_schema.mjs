import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('band_shoutbox').select('*').limit(1);
  if (error) {
    console.log("Error querying band_shoutbox:", error.message);
  } else {
    console.log("✅ band_shoutbox exists! Columns:", Object.keys(data?.[0] || {}));
    console.log("Sample data:", data);
  }
}

run();

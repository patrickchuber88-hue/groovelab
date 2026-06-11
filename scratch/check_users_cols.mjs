import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function runCheck() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error("Error fetching user:", error.message);
  } else {
    console.log("Columns in users table:", Object.keys(data[0] || {}));
  }
}

runCheck();

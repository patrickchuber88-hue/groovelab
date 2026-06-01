import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  
  if (data && data.length > 0) {
    console.log("=== Columns of users table ===");
    console.log(Object.keys(data[0]));
    console.log("=== Sample user ===");
    console.log(data[0]);
  } else {
    console.log("No users found or error:", error);
  }
}

run();

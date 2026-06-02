import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role');
    
  if (error) {
    console.error("Error fetching users:", error);
  } else {
    console.log("Users count:", users.length);
    console.log("Users:", JSON.stringify(users, null, 2));
  }
}

run();

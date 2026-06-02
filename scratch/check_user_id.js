import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role')
    .eq('id', '9c629cb8-9241-4d5e-9151-da1fd6f4cde4')
    .single();
    
  if (error) {
    console.error("Error fetching user:", error);
  } else {
    console.log("User details:", user);
  }
}

run();

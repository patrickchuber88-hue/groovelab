import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, school_id');
    
  const { data: planning, error: pErr } = await supabase
    .from('lab_planning')
    .select('*');

  const { data: schools, error: sErr } = await supabase
    .from('schools')
    .select('*');

  console.log("USERS:", users);
  console.log("PLANNING:", planning);
  console.log("SCHOOLS:", schools);
}

run();

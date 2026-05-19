import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('users').select('id, first_name, last_name, role, is_master_admin').eq('qr_token', '7b8e1a2c-4d5f-6a7b-8c9d-0e1f2a3b4c5d').maybeSingle();
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}
run();

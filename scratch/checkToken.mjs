import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, qr_token')
    .limit(10);
    
  console.log("Users in DB:", users, "Error:", error);
}
check();

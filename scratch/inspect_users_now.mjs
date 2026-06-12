import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function inspectUsers() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, is_master_admin, master_admin_username, master_admin_password')
    .limit(10);
    
  console.log("Users in database:", users, error);
}
inspectUsers();

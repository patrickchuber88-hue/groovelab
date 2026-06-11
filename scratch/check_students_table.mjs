import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function runCheck() {
  const { data: users, error } = await supabase.from('users').select('id, role, first_name, last_name');
  if (error) {
    console.error("Error fetching users:", error.message);
    return;
  }

  console.log(`Found ${users.length} users in users table.`);
  const roles = {};
  for (const u of users) {
    roles[u.role] = (roles[u.role] || 0) + 1;
    console.log(`- ${u.first_name} ${u.last_name} (${u.role}) ID: ${u.id}`);
  }
  console.log("Roles distribution:", roles);
}

runCheck();

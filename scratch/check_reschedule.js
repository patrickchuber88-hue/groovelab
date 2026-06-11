import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-user-id': '03564b1c-e2bb-4ccb-be95-b9fd1ef34829'
    }
  }
});

async function run() {
  const { data: users } = await supabase.from('users').select('id, first_name, last_name, role');
  console.log("All users in database:");
  users?.forEach(u => {
    console.log(`Name: ${u.first_name} ${u.last_name} | Role: ${u.role} | ID: ${u.id}`);
  });
}

run();

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

// Use the admin token to bypass RLS and view all users
const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-qr-token': '2e2e7ec2-46b0-4ab6-9805-284e66186ab1'
    }
  }
});

async function run() {
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, qr_token');

  if (uErr) {
    console.error("ERROR:", uErr);
  } else {
    console.log("USERS:", JSON.stringify(users, null, 2));
  }
}

run();

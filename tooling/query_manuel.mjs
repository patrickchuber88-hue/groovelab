import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-qr-token': '897ed2f0-d0e6-47e8-b799-a09efe9e51e5'
    }
  }
});

async function run() {
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, school_id, instrument, photo_url, avatar_url, qr_token');

  console.log("MANUEL BY TOKEN WITH HEADER:", users);
  if (uErr) {
    console.error("ERROR:", uErr);
  }
}

run();

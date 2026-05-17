import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function checkSessions() {
  const { data: activeSessions } = await supabase.from('sessions').select('*, users(*)').is('check_out_time', null);
  console.log("ACTIVE SESSIONS:");
  activeSessions?.forEach(s => {
    console.log(`User ID: ${s.user_id} | Name: ${s.users?.first_name} | Role: ${s.users?.role}`);
  });
}
checkSessions();

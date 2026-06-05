import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local';
const env = fs.readFileSync(envPath, 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

const { data, error } = await supabase.from('sessions').select('*, users(*)').is('check_out_time', null);

if (error) {
  console.error("Error:", error);
} else {
  console.log(`Active sessions: ${data.length}`);
  data.forEach(s => {
    const u = s.users;
    console.log(`Session ID: ${s.id} | User: ${u?.first_name} ${u?.last_name} | Role: ${u?.role} | School ID: ${u?.school_id} | Check-in: ${s.check_in_time}`);
  });
}

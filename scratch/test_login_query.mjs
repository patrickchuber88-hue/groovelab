import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function testQuery() {
  const qrToken = 't_9k0oj3prkl'; // Patrick Huber's teacher_qr_token
  
  let query = supabase.from('users').select('*, schools(*)');
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qrToken);
  if (isUuid) {
    query = query.eq('qr_token', qrToken);
  } else {
    query = query.eq('teacher_qr_token', qrToken);
  }
  
  const { data: user, error: userErr } = await query.maybeSingle();
  
  console.log("QUERY RESULT:");
  console.log("Error:", userErr);
  console.log("User:", user?.first_name, user?.last_name, "Role:", user?.role);
}
testQuery();

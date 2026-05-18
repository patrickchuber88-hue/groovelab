import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const bandId = '3b66462e-e129-4c9e-a9d8-306813aa1898'; // rockstars band ID

  const { data: students } = await supabase.from('users').select('id').eq('role', 'student').limit(1);
  const studentId = students[0].id;
  console.log("Testing insert with external_name: null...");

  const { data, error } = await supabase.from('band_members').insert({
    band_id: bandId,
    user_id: studentId,
    instrument: 'E-Bass',
    external_name: null,
    confetti_seen: true
  }).select();

  if (error) {
    console.error("Insert with null FAILED:", error.message);
  } else {
    console.log("Insert with null SUCCEEDED:", data);
    await supabase.from('band_members').delete().eq('id', data[0].id);
  }
}

run();

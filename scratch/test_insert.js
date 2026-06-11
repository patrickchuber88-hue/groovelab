import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase
    .from('room_bookings')
    .insert({
      occurrence_id: '00000000-0000-0000-0000-000000000000'
    })
    .select();
  
  console.log("Insert response:", data);
  console.log("Insert error:", error);
}

check();

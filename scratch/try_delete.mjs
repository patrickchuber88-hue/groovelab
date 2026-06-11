import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const bId = "179cb16f-7c42-4dad-b349-6a349e566452";
  console.log(`Attempting to delete room booking ID ${bId} as anon/admin...`);
  const { data, error, count } = await supabase
    .from('room_bookings')
    .delete()
    .eq('id', bId);
  console.log("Delete result data:", data);
  console.log("Delete result error:", error);
  console.log("Delete count:", count);
}

run();

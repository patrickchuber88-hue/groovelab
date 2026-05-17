import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('./.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function inspectStations() {
  const { data: stations, error } = await supabase.from('stations').select('*').order('name');
  if (error) {
    console.error("Error fetching stations:", error);
    return;
  }
  console.log("STATIONS IN DB:");
  stations?.forEach(s => {
    console.log(`ID: ${s.id} | Name: ${s.name} | Room ID: ${s.room_id}`);
  });
}
inspectStations();

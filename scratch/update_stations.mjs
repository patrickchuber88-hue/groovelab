import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('./.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function updateStations() {
  const { data: stations, error } = await supabase.from('stations').select('*');
  if (error) {
    console.error("Error fetching stations:", error);
    return;
  }
  
  console.log("Updating stations...");
  for (const s of stations || []) {
    if (s.name.startsWith("Platz ")) {
      const num = s.name.split(" ")[1];
      const newName = `iPad ${num}`;
      console.log(`Updating ID: ${s.id} | ${s.name} -> ${newName}`);
      
      const { error: updateErr } = await supabase
        .from('stations')
        .update({ name: newName })
        .eq('id', s.id);
        
      if (updateErr) {
        console.error(`Failed to update ${s.name}:`, updateErr);
      } else {
        console.log(`Successfully updated ${s.name} to ${newName}`);
      }
    }
  }
  console.log("Update completed!");
}

updateStations();

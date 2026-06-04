import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function testStations() {
  const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';
  
  // Fetch stations for this school
  const { data: stations, error } = await supabase
    .from('stations')
    .select('*, rooms(school_id)');
  
  console.log("Stations for school:", stations?.filter(s => s.rooms?.school_id === schoolId), error);
}
testStations();

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data: songs, error } = await supabase
    .from('songs')
    .select('id, title, artist, school_id, teacher_id, is_groovelab_active, is_campus_active');
    
  if (error) {
    console.error("Error fetching songs:", error);
  } else {
    console.log("Songs count:", songs.length);
    console.log("Songs:", JSON.stringify(songs, null, 2));
  }
}

run();

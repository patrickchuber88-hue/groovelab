import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function runQuery() {
  const school_id = '11111111-1111-1111-1111-111111111111';
  
  const { data, error } = await supabase
    .from('bands')
    .select('*, band_members(*, profiles:users(id, first_name, last_name, photo_url, created_at, birth_date)), songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, last_name, photo_url, created_at, birth_date)))')
    .eq('school_id', school_id)
    .in('status', ['forming', 'active']);

  if (error) {
    console.error("QUERY ERROR:", error.message);
  } else {
    console.log("QUERY RESULT DATA:");
    console.log(JSON.stringify(data, null, 2));
  }
}

runQuery();

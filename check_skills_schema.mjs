import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

supabase.from('user_song_skills').select('*').limit(1).then(({data, error}) => {
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("User song skills record keys:", data && data.length > 0 ? Object.keys(data[0]) : "No records found");
  }
});

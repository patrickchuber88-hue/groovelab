import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const supabase = createClient(url, key);

async function main() {
  const schoolId = '11111111-1111-1111-1111-111111111111';
  const { data: skills, error } = await supabase
    .from('user_song_skills')
    .select('*, profiles:users!user_id(*)');

  if (error) {
    console.error("Query Error:", error);
    return;
  }

  console.log("All skills in school:");
  skills.forEach(s => {
    const prof = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    if (prof) {
      console.log(`User: ${prof.first_name}, Song ID: ${s.song_id}, Instrument: ${s.instrument}, Progress: ${s.progress_percent}%, Ready: ${s.is_stage_ready}`);
    }
  });
}

main();

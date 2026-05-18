import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const supabase = createClient(url, key);

async function main() {
  const { data: users } = await supabase.from('users').select('id, first_name').limit(1);
  const userId = users[0].id;
  const songId = '3fed9d04-d28f-4f8d-936a-05145e95dea0';

  console.log("Testing upsert (which should either insert or update existing)...");
  const { data, error } = await supabase
    .from('user_song_skills')
    .upsert({
      user_id: userId,
      song_id: songId,
      instrument: 'E-Bass',
      difficulty_level: 'starter',
      part_number: 1,
      progress_percent: 75,
      is_stage_ready: false
    }, {
      onConflict: 'user_id,song_id,instrument,difficulty_level,part_number'
    })
    .select();

  if (error) {
    console.error("Upsert Error:", error);
  } else {
    console.log("Upsert Success! Row returned:", data);
  }
}

main();

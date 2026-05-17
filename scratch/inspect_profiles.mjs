import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const supabase = createClient(url, key);

async function main() {
  const schoolId = '11111111-1111-1111-1111-111111111111';
  const { data: formingBands } = await supabase
    .from('bands')
    .select('*, band_members(*, profiles:users(id, first_name, photo_url)), band_songs(*, band_song_slots(*, profiles:users!band_song_slots_user_id_fkey(id, first_name, photo_url)))')
    .eq('school_id', schoolId)
    .eq('status', 'forming');

  console.log("formingBands:");
  formingBands.forEach(b => {
    console.log(`Band Name: ${b.name}`);
    b.band_members.forEach(bm => {
      console.log(`  bm.user_id: ${bm.user_id}, bm.instrument: ${bm.instrument}, typeof bm.profiles:`, typeof bm.profiles, "isArray:", Array.isArray(bm.profiles), "profiles:", bm.profiles);
    });
  });
}

main();

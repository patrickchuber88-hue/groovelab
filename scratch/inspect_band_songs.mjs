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
    .select('*, band_songs(*, songs(*), band_song_slots(*, profiles:users!band_song_slots_user_id_fkey(*)))')
    .eq('school_id', schoolId)
    .eq('status', 'forming');

  console.log("formingBands with song details:");
  formingBands.forEach(b => {
    console.log(`Band Name: ${b.name}`);
    b.band_songs.forEach(bs => {
      console.log(`  Song: ${bs.songs.title}, Status: ${bs.status}`);
      bs.band_song_slots.forEach(slot => {
        console.log(`    - Slot: ${slot.instrument}, User: ${slot.profiles ? slot.profiles.first_name : 'null'}, Status: ${slot.status}`);
      });
    });
  });
}

main();

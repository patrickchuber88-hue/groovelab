import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const supabase = createClient(url, key);

async function main() {
  const { data: slots, error } = await supabase
    .from('band_song_slots')
    .select('*')
    .eq('band_song_id', '1e89097f-e136-450b-b50e-c77ce2c72e9f'); // Wait, the band_song_id from Never Ending
  
  const { data: bSongs } = await supabase
    .from('band_songs')
    .select('*, songs(*)')
    .eq('band_id', '1e89097f-e136-450b-b50e-c77ce2c72e9f');
  
  console.log("Band Songs:");
  console.log(JSON.stringify(bSongs, null, 2));

  for (const bs of bSongs || []) {
    const { data: sSlots } = await supabase
      .from('band_song_slots')
      .select('*')
      .eq('band_song_id', bs.id);
    console.log(`Slots for BandSong ${bs.id} (${bs.songs?.title}):`);
    console.log(JSON.stringify(sSlots, null, 2));
  }
}

main();

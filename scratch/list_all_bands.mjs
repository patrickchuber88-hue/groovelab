import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const supabase = createClient(url, key);

async function main() {
  const { data: bands, error } = await supabase
    .from('bands')
    .select('*, band_members(*), band_songs(*, songs(*), band_song_slots(*))')
    .eq('school_id', '11111111-1111-1111-1111-111111111111');
  
  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log("All Bands:");
  for (const b of bands || []) {
    console.log(`Band ID: ${b.id}, Name: ${b.name}, Status: ${b.status}`);
    console.log(`  Members Count:`, b.band_members?.length);
    for (const m of b.band_members || []) {
      console.log(`    - Member: user_id=${m.user_id}, instrument=${m.instrument}`);
    }
    console.log(`  Songs:`);
    for (const bs of b.band_songs || []) {
      console.log(`    - Song: ${bs.songs?.title} (Status: ${bs.status})`);
      console.log(`      Slots:`, bs.band_song_slots?.map((s) => `${s.instrument} (User ID: ${s.user_id}, Status: ${s.status})`).join(', '));
    }
  }
}

main();

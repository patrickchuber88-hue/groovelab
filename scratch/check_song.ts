
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('songs').select('id, title, instrumentation').ilike('title', '%Smells Like Teenspirit%').maybeSingle();
  console.log('Song:', data);
  
  const { data: bands } = await supabase.from('bands').select('id, name').eq('name', 'MIDNIGHT QUEST');
  console.log('Band ID:', bands?.[0]?.id);
  
  if (bands?.[0]) {
    const { data: bSongs } = await supabase.from('band_songs').select('id, song_id, status').eq('band_id', bands[0].id);
    const bs = bSongs?.find(s => s.song_id === data?.id);
    console.log('Band Song:', bs);
    
    if (bs) {
      const { data: slots } = await supabase.from('band_song_slots').select('instrument, user_id').eq('band_song_id', bs.id);
      console.log('Slots:', slots);
    }
  }
}

check();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkSchema() {
  const { data: bSongs, error: e1 } = await supabase.from('band_songs').select('*').limit(1);
  const { data: bSlots, error: e2 } = await supabase.from('band_song_slots').select('*').limit(1);
  
  console.log('band_songs columns:', Object.keys(bSongs?.[0] || {}));
  console.log('band_song_slots columns:', Object.keys(bSlots?.[0] || {}));
}

checkSchema();

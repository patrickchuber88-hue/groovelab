import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const { data: band } = await supabase.from('bands').select('*, band_members(*, profiles(*))').eq('name', 'Golden Flow').single();
  const { data: song } = await supabase.from('songs').select('*').eq('title', 'Never Ending').single();
  const { data: slots } = await supabase.from('band_song_slots').select('*').eq('band_id', band.id).eq('song_id', song.id);
  
  console.log("BAND MEMBERS:", band.band_members.map(m => ({ id: m.user_id, inst: m.instrument, name: m.profiles?.first_name })));
  console.log("SLOTS:", slots);
}
main();

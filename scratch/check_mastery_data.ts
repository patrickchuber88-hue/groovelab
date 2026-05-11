
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
  const songTitle = 'Smells Like Teen Spirit';
  const { data: songs } = await supabase.from('songs').select('id, title').ilike('title', `%${songTitle}%`);
  console.log('Songs found:', songs);

  if (!songs || songs.length === 0) return;

  const songId = songs[0].id;

  const { data: skills } = await supabase.from('user_song_skills').select('*').eq('song_id', songId);
  console.log(`Skills for ${songTitle} (${songId}):`, skills);

  const { data: bands } = await supabase.from('bands').select('id, name, band_members(user_id, instrument)').ilike('name', '%Lunar Rebel%');
  console.log('Bands found:', bands);
}

check();

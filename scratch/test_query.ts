import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Testing band fetch query...');
  
  const { data, error } = await supabase
    .from('bands')
    .select(`
      *,
      songs (*),
      band_members (*, users!user_id(*, user_song_skills(*))),
      band_songs (*, songs(*), band_song_slots(*, users:users!user_id(*, user_song_skills(*)))),
      coach:users!coach_id (first_name, last_name, photo_url)
    `)
    .limit(1);

  if (error) {
    console.error('Query Error:', error);
  } else {
    console.log('Query Success! Fetched', data.length, 'bands');
    if (data.length > 0) {
      console.log('First band name:', data[0].name);
    }
  }
}

check();

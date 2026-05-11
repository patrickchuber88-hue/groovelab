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
  console.log('Testing TeacherDashboard song fetch query...');
  
  const { data, error } = await supabase
    .from('songs')
    .select(`
      id, artist, title, media_link, instrumentation,
      user_song_skills (
        id, instrument, difficulty_level, is_stage_ready, user_id, created_at, formation_group,
        profiles:users!user_song_skills_user_id_fkey(first_name, photo_url, school_id)
      )
    `)
    .limit(1);

  if (error) {
    console.error('Query Error:', error);
  } else {
    console.log('Query Success! Fetched', data.length, 'songs');
  }
}

check();

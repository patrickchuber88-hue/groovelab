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

async function testQueries() {
  console.log('--- Testing TeacherDashboard Queries ---');
  
  // Test the songs/skills query from TeacherDashboard.tsx
  const { data: wallData, error: wallErr } = await supabase
    .from('songs')
    .select(`
      id, artist, title, media_link, instrumentation,
      user_song_skills (
        id, song_id, progress_percent, instrument, part_number, difficulty_level, is_stage_ready, user_id, created_at, formation_group,
        profiles:users!user_song_skills_user_id_fkey(first_name, photo_url, school_id)
      )
    `)
    .limit(1);

  if (wallErr) {
    console.error('TeacherDashboard songs/skills query failed:', wallErr);
  } else {
    console.log('TeacherDashboard songs/skills query succeeded! Found:', wallData?.length);
  }

  // Test the forming bands query from TeacherDashboard.tsx Part B
  const { data: formingBands, error: formingErr } = await supabase
    .from('bands')
    .select('*, band_members(*, profiles:users(id, first_name, last_name, photo_url, created_at, birth_date)), songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, last_name, photo_url, created_at, birth_date)))')
    .eq('status', 'forming')
    .limit(1);

  if (formingErr) {
    console.error('TeacherDashboard forming bands query failed:', formingErr);
  } else {
    console.log('TeacherDashboard forming bands query succeeded! Found:', formingBands?.length);
  }

  console.log('\n--- Testing App.tsx Dashboard Queries ---');
  
  // Test App.tsx Dashboard Query
  const { data: appWallData, error: appWallErr } = await supabase
    .from('songs')
    .select(`
      id, artist, title, media_link, instrumentation,
      user_song_skills (
        id, song_id, instrument, part_number, difficulty_level, is_stage_ready, user_id, created_at, formation_group,
        profiles:users!user_song_skills_user_id_fkey(first_name, photo_url, school_id)
      ),
      band_songs (
        id, band_id, status, is_exclusive, difficulty_level,
        bands (id, name, photo_url, school_id),
        band_song_slots (
          id, user_id, instrument, status,
          profiles:users!band_song_slots_user_id_fkey(first_name, photo_url)
        )
      )
    `)
    .limit(1);

  if (appWallErr) {
    console.error('App.tsx Dashboard query failed:', appWallErr);
  } else {
    console.log('App.tsx Dashboard query succeeded! Found:', appWallData?.length);
  }
}

testQueries();

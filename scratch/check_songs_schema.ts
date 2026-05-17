import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkSchema() {
  const { data, error } = await supabase.from('songs').select('*').limit(1);
  if (error) {
    console.error('Error fetching songs:', error);
  } else {
    console.log('Songs columns:', Object.keys(data?.[0] || {}));
  }
  
  const { data: userSkills, error: skillsError } = await supabase
    .from('user_song_skills')
    .select(`
      id, progress_percent, is_stage_ready, is_pending_approval, instrument, part_number, difficulty_level, is_favorite, verified_by_id,
      songs (id, title, artist, media_link, tomplay_url, instrumentation)
    `)
    .limit(1);
    
  if (skillsError) {
    console.error('Error fetching user_song_skills with standard songs select:', skillsError);
  } else {
    console.log('Successfully fetched user_song_skills with standard songs!');
  }

  const { data: userSkillsExt, error: skillsErrorExt } = await supabase
    .from('user_song_skills')
    .select(`
      id, progress_percent, is_stage_ready, is_pending_approval, instrument, part_number, difficulty_level, is_favorite, verified_by_id,
      songs (id, title, artist, media_link, tomplay_url, instrumentation, pdf_folder_url, guitar_pro_url, bypass_wlan_check)
    `)
    .limit(1);
    
  if (skillsErrorExt) {
    console.error('Error fetching user_song_skills with extended songs select:', skillsErrorExt);
  } else {
    console.log('Successfully fetched user_song_skills with EXTENDED songs!');
  }
}

checkSchema();

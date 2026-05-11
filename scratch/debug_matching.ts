
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  const { data: wallData, error: wallErr } = await supabase
    .from('songs')
    .select(`
      id, artist, title, media_link, instrumentation,
      user_song_skills (
        id, instrument, difficulty_level, is_stage_ready, user_id, created_at, formation_group,
        profiles:users!user_song_skills_user_id_fkey(first_name, photo_url, school_id)
      )
    `)
    .eq('title', 'tesss');

  console.log('--- SONG: tesss ---');
  if (wallData && wallData[0]) {
    const song = wallData[0];
    console.log('Instrumentation:', song.instrumentation);
    console.log('Skills count:', song.user_song_skills?.length);
    
    song.user_song_skills?.forEach((s: any) => {
        console.log(`- Skill ID: ${s.id}, Inst: ${s.instrument}, Ready: ${s.is_stage_ready}, Group: ${s.formation_group}`);
    });
  }
}

debug();

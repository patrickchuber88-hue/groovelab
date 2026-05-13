import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function check() {
  const { data: songs } = await supabase.from('songs').select('id, title').ilike('title', '%Smells Like Teenspirit%');
  console.log('Songs:', songs);
  if (songs && songs.length > 0) {
    const { data: skills } = await supabase.from('user_song_skills').select('*').eq('song_id', songs[0].id);
    console.log('Skills for this song:', skills);
  }
}

check();

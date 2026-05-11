
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: songs } = await supabase.from('songs').select('id, title');
  console.log('Songs:', songs);
  
  const { data: skills } = await supabase.from('user_song_skills').select('*, users(first_name)').limit(20);
  console.log('Sample Skills:', skills);

  const { data: members } = await supabase.from('band_members').select('*, bands(name), users(first_name)');
  console.log('Members:', members);
}

check();

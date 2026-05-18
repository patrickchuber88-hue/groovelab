
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim().replace(/['"]/g, '');

const supabase = createClient(url, key);

async function checkSchema() {
  const { data: bSongs, error: e1 } = await supabase.from('band_songs').select('*').limit(1);
  const { data: bSlots, error: e2 } = await supabase.from('band_song_slots').select('*').limit(1);
  const { data: bMembers, error: e3 } = await supabase.from('band_members').select('*').limit(1);
  const { data: bands, error: e4 } = await supabase.from('bands').select('*').limit(1);
  const { data: skills, error: e5 } = await supabase.from('user_song_skills').select('*').limit(1);
  
  console.log('band_songs columns:', Object.keys(bSongs?.[0] || {}));
  console.log('band_song_slots columns:', Object.keys(bSlots?.[0] || {}));
  console.log('band_members columns:', Object.keys(bMembers?.[0] || {}));
  console.log('bands columns:', Object.keys(bands?.[0] || {}));
  console.log('user_song_skills columns:', Object.keys(skills?.[0] || {}));
}

checkSchema();

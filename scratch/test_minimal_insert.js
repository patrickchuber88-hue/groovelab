import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const insertPayload = {
    school_id: "74713df2-6176-4a41-a8cd-9fbebe34e9b8",
    artist: 'Oasis Test',
    title: 'Wonderwall Test Only Artist and Title',
    is_campus_active: false,
    is_groovelab_active: true,
    teacher_id: "03564b1c-e2bb-4ccb-be95-b9fd1ef34829"
  };

  console.log('Attempting minimal verify insert with:', insertPayload);
  const { data, error } = await supabase.from('songs').insert(insertPayload).select().single();
  if (error) {
    console.error('INSERT FAILED:', error);
  } else {
    console.log('INSERT SUCCESS! Created song details:', data);
    
    // Clean up
    console.log('Cleaning up inserted song...');
    await supabase.from('songs').delete().eq('id', data.id);
    console.log('Cleanup complete.');
  }
}

run();

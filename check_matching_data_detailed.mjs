import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  console.log("Checking Groovelab database state...");
  
  // 1. Users
  const { data: users } = await supabase.from('users').select('*');
  console.log(`\n--- USERS (${users?.length || 0}) ---`);
  users?.forEach(u => {
    console.log(`ID: ${u.id} | Name: ${u.first_name} ${u.last_name || ''} | Role: ${u.role} | School: ${u.school_id}`);
  });

  // 2. Songs
  const { data: songs } = await supabase.from('songs').select('*');
  console.log(`\n--- SONGS (${songs?.length || 0}) ---`);
  songs?.forEach(s => {
    console.log(`ID: ${s.id} | Title: ${s.title} | Artist: ${s.artist} | Instrumentation:`, JSON.stringify(s.instrumentation));
  });

  // 3. User Song Skills
  const { data: skills } = await supabase.from('user_song_skills').select('*');
  console.log(`\n--- USER SONG SKILLS (${skills?.length || 0}) ---`);
  skills?.forEach(s => {
    console.log(`ID: ${s.id} | User: ${s.user_id} | Song: ${s.song_id} | Inst: ${s.instrument} | Part: ${s.part_number} | Level: ${s.difficulty_level} | Progress: ${s.progress_percent}% | StageReady: ${s.is_stage_ready}`);
  });

  // 4. Bands & Members
  const { data: bands } = await supabase.from('bands').select('*, band_members(*)');
  console.log(`\n--- BANDS (${bands?.length || 0}) ---`);
  bands?.forEach(b => {
    console.log(`ID: ${b.id} | Name: ${b.name} | Status: ${b.status} | School: ${b.school_id}`);
    b.band_members?.forEach(m => {
      console.log(`  -> Member User: ${m.user_id} | Inst: ${m.instrument}`);
    });
  });

  // 5. Band Songs & Slots
  const { data: bandSongs } = await supabase.from('band_songs').select('*, band_song_slots(*)');
  console.log(`\n--- BAND SONGS (${bandSongs?.length || 0}) ---`);
  bandSongs?.forEach(bs => {
    console.log(`ID: ${bs.id} | Band: ${bs.band_id} | Song: ${bs.song_id} | Status: ${bs.status} | Level: ${bs.difficulty_level}`);
    bs.band_song_slots?.forEach(sl => {
      console.log(`  -> Slot User: ${sl.user_id} | Inst: ${sl.instrument} | Part: ${sl.part_number}`);
    });
  });

  // 6. Lab Planning
  const { data: plannings } = await supabase.from('lab_planning').select('*');
  console.log(`\n--- LAB PLANNING (${plannings?.length || 0}) ---`);
  plannings?.forEach(p => {
    console.log(`ID: ${p.id} | User: ${p.user_id} | Day: ${p.day} | Time: ${p.time}`);
  });
}

check().catch(console.error);

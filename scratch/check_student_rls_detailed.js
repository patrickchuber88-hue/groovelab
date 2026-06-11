import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const SILAS_ID = 'f7f83cc3-6900-4388-8290-a4d99a9fb383';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': SILAS_ID
    }
  }
});

async function main() {
  console.log("Checking database state as Silas Meier (Student)...");
  
  const { data: users, error: uErr } = await supabase.from('users').select('*');
  console.log(`\n--- USERS (${users?.length || 0}) ---`);
  if (uErr) console.error("Users error:", uErr.message);
  users?.slice(0, 5).forEach(u => {
    console.log(`ID: ${u.id} | Name: ${u.first_name} ${u.last_name || ''} | Role: ${u.role}`);
  });

  const { data: songs, error: sErr } = await supabase.from('songs').select('*');
  console.log(`\n--- SONGS (${songs?.length || 0}) ---`);
  if (sErr) console.error("Songs error:", sErr.message);
  songs?.forEach(s => {
    console.log(`ID: ${s.id} | Title: ${s.title} | Artist: ${s.artist} | school_id: ${s.school_id} | is_groovelab_active: ${s.is_groovelab_active} | is_campus_active: ${s.is_campus_active}`);
  });

  const { data: skills, error: skErr } = await supabase.from('user_song_skills').select('*');
  console.log(`\n--- USER SONG SKILLS (${skills?.length || 0}) ---`);
  if (skErr) console.error("Skills error:", skErr.message);
  skills?.forEach(s => {
    console.log(`ID: ${s.id} | User: ${s.user_id} | Song: ${s.song_id} | Inst: ${s.instrument} | StageReady: ${s.is_stage_ready} | progress: ${s.progress_percent}`);
  });

  const { data: bands, error: bErr } = await supabase.from('bands').select('*');
  console.log(`\n--- BANDS (${bands?.length || 0}) ---`);
  if (bErr) console.error("Bands error:", bErr.message);
  bands?.slice(0, 5).forEach(b => {
    console.log(`ID: ${b.id} | Name: ${b.name} | Status: ${b.status}`);
  });
}

main();

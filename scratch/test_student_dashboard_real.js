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
  console.log("Fetching student profile Silas Meier (tData)...");
  const { data: tData, error: userErr } = await supabase
    .from('users')
    .select('*, schools(*)')
    .eq('id', SILAS_ID)
    .single();

  if (userErr) {
    console.error("Failed to fetch user:", userErr);
    return;
  }

  const userId = SILAS_ID;
  const viewMode = 'student';

  // EXACT queries from TeacherDashboard:
  let studentQuery = supabase.from('users').select('*').eq('school_id', tData.school_id).eq('role', 'student').eq('teacher_id', userId);

  let wallSongsQuery = supabase.from('songs').select(`
    id, artist, title, media_link, instrumentation,
    user_song_skills (
      id, song_id, progress_percent, instrument, part_number, difficulty_level, is_stage_ready, user_id, created_at, formation_group,
      profiles:users!user_song_skills_user_id_fkey(first_name, photo_url, school_id)
    )
  `).eq('school_id', tData.school_id).eq('is_groovelab_active', true);

  if (tData.role === 'teacher') {
    wallSongsQuery = wallSongsQuery.eq('teacher_id', userId);
  }

  const queries = {
    rooms: supabase.from('rooms').select('*').eq('school_id', tData.school_id).eq('is_groovelab_active', true).order('sort_order', { ascending: true }),
    user_availability: supabase.from('user_availability').select('*'),
    sessions: supabase.from('sessions').select('*, users!inner(*), stations(*)').is('check_out_time', null).eq('users.school_id', tData.school_id),
    coaches: supabase.from('users').select('*').in('role', ['teacher', 'admin']).eq('school_id', tData.school_id),
    user_song_skills: supabase.from('user_song_skills').select('*, users!user_id(*), songs(*)').eq('is_pending_approval', true),
    bands: supabase.from('bands').select('*, band_members(*, users(*)), coach:users!coach_id(id, first_name, last_name, photo_url), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, last_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready))))').eq('school_id', tData.school_id).order('name'),
    students: studentQuery.order('first_name'),
    help_requests: (viewMode !== 'student' 
      ? supabase.from('help_requests').select('*, users(*)').eq('school_id', tData.school_id).eq('status', 'pending').order('created_at', { ascending: false })
      : Promise.resolve({ data: null, error: null })),
    formingBands: supabase.from('bands').select('*, band_members(*, profiles:users(id, first_name, last_name, photo_url, created_at, birth_date)), songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, last_name, photo_url, created_at, birth_date)))').eq('school_id', tData.school_id).in('status', ['forming', 'active']),
    wallSongs: wallSongsQuery,
    occupiedSlots: supabase.from('band_song_slots').select('user_id, band_songs(song_id)'),
    crisis: supabase.from('crisis_notifications').select('*, student:users!crisis_notifications_student_id_fkey(id, first_name, last_name)').eq('teacher_id', userId).gte('slot_start_datetime', new Date(Date.now() - 24 * 60 * 60 * 1000 * 7).toISOString()).order('slot_start_datetime', { ascending: true })
  };

  console.log("\nExecuting parallel queries...");
  for (const [name, queryPromise] of Object.entries(queries)) {
    try {
      const res = await queryPromise;
      if (res.error) {
        console.error(`❌ Query [${name}] failed:`, res.error.message, "\nCode:", res.error.code);
      } else {
        console.log(`... Query [${name}] succeeded, returned ${Array.isArray(res.data) ? res.data.length : (res.data ? '1 object' : '0')} items.`);
        if (name === 'wallSongs') {
          console.log("wallSongs Data:", JSON.stringify(res.data, null, 2));
        }
      }
    } catch (e) {
      console.error(`❌ Query [${name}] crashed:`, e);
    }
  }
}

main();

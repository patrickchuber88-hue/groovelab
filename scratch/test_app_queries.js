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
  console.log("Fetching student user Silas Meier...");
  const { data: studentUser, error: userErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', SILAS_ID)
    .single();

  if (userErr) {
    console.error("Failed to fetch user:", userErr);
    return;
  }
  const schoolId = studentUser.school_id;
  const userId = SILAS_ID;

  console.log("Fetching memberships...");
  const membershipsRes = await supabase.from('band_members').select('user_id, bands!inner(id, status, song_id, school_id, band_songs(song_id, status))').eq('bands.school_id', schoolId);
  if (membershipsRes.error) {
    console.error("Memberships query failed:", membershipsRes.error);
    return;
  }
  const bandIds = (membershipsRes.data || []).map((m) => m.bands?.id).filter(Boolean);
  console.log("Found band IDs:", bandIds);

  const queries = {
    skillsRes: supabase.from('user_song_skills').select(`
      id, progress_percent, is_stage_ready, is_pending_approval, instrument, part_number, difficulty_level, is_favorite, verified_by_id,
      songs (*)
    `).eq('user_id', userId),
    wallRes: supabase.from('songs').select(`
      *,
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
    `).eq('school_id', schoolId).eq('is_campus_active', false).eq('user_song_skills.is_stage_ready', true).order('level').order('artist'),
    membersRes: supabase.from('band_members').select('user_id, bands!inner(id, status, song_id, school_id, band_songs(song_id, status))').eq('bands.school_id', schoolId),
    userBandsRes: bandIds.length > 0
      ? supabase.from('bands').select(`
          *,
          songs (*),
          band_members (*, users(*)),
          band_songs (*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))),
          coach:users!coach_id (first_name, last_name, photo_url)
        `).in('id', bandIds)
      : Promise.resolve({ data: [], error: null }),
    bandsRes: supabase.from('bands').select('*, songs(title, artist, instrumentation), band_members(*, users!user_id(*)), band_songs(*, songs(id, title, artist, instrumentation), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))), coach:users!coach_id (first_name, last_name, photo_url)').eq('school_id', schoolId).order('name', { ascending: true }),
    teachersRes: supabase.from('users').select('*').eq('school_id', schoolId).in('role', ['teacher', 'admin']).order('first_name'),
    activeSessionsRes: supabase.from('sessions').select('user_id, station_id, users!inner(role, school_id, last_seen)').is('check_out_time', null).eq('users.school_id', schoolId)
  };

  console.log("\nExecuting parallel App initialization queries...");
  for (const [name, queryPromise] of Object.entries(queries)) {
    try {
      const res = await queryPromise;
      if (res.error) {
        console.error(`❌ Query [${name}] failed:`, res.error.message, "\nCode:", res.error.code, "\nDetails:", res.error.details);
      } else {
        console.log(`... Query [${name}] succeeded, returned ${Array.isArray(res.data) ? res.data.length : (res.data ? '1 object' : '0')} items.`);
      }
    } catch (e) {
      console.error(`❌ Query [${name}] crashed:`, e);
    }
  }
}

main();

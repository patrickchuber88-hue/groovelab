const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const userId = '54cd24f7-0b5f-4607-9f8c-9b1c97b2846f';

async function test() {
  try {
    console.log('Loading teacher data...');
    const { data: tData, error: tErr } = await supabase
      .from('users')
      .select('*, schools(*)')
      .eq('id', userId)
      .single();

    if (tErr) throw tErr;

    console.log('Teacher details loaded:', tData.first_name, tData.last_name);

    const activePlatform = 'campus'; // or 'groovelab'
    const viewMode = 'admin';

    let studentQuery = supabase.from('users').select('*').eq('school_id', tData.school_id).eq('role', 'student').eq('teacher_id', userId);
    if (activePlatform === 'campus') {
      studentQuery = studentQuery.eq('is_campus_active', true);
    } else {
      studentQuery = studentQuery.eq('is_groovelab_active', true);
    }

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

    console.log('Running parallel queries...');
    const [
      rRes,
      avRes,
      sessRes,
      coachesRes,
      subRes,
      bRes,
      studRes,
      helpRes,
      formingBandsRes,
      wallRes,
      occRes
    ] = await Promise.all([
      supabase.from('rooms').select('*').eq('school_id', tData.school_id).eq('is_groovelab_active', true).order('sort_order', { ascending: true }),
      supabase.from('user_availability').select('*'),
      supabase.from('sessions').select('*, users!inner(*), stations(*)').is('check_out_time', null),
      supabase.from('users').select('*').in('role', ['teacher', 'admin']).eq('school_id', tData.school_id),
      supabase.from('user_song_skills').select('*, users!user_id(*), songs(*)').eq('is_pending_approval', true),
      supabase.from('bands').select('*, band_members(*, users(*)), coach:users!coach_id(id, first_name, last_name, photo_url), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready))))').eq('school_id', tData.school_id).order('name'),
      studentQuery.order('first_name'),
      viewMode !== 'student' 
        ? supabase.from('help_requests').select('*, users!inner(*)').eq('users.school_id', tData.school_id).eq('status', 'pending').order('created_at', { ascending: false })
        : Promise.resolve({ data: null, error: null }),
      supabase.from('bands').select('*, band_members(*, profiles:users(id, first_name, last_name, photo_url, created_at, birth_date)), songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, last_name, photo_url, created_at, birth_date)))').eq('school_id', tData.school_id).in('status', ['forming', 'active']),
      wallSongsQuery,
      supabase.from('band_song_slots').select('user_id, band_songs(song_id)')
    ]);

    console.log('Rooms error:', rRes.error);
    console.log('Availability error:', avRes.error);
    console.log('Sessions error:', sessRes.error);
    console.log('Coaches error:', coachesRes.error);
    console.log('Submissions error:', subRes.error);
    console.log('Bands error:', bRes.error);
    console.log('Students error:', studRes.error);
    console.log('Help error:', helpRes.error);
    console.log('Forming bands error:', formingBandsRes.error);
    console.log('Wall error:', wallRes.error);
    console.log('Occ error:', occRes.error);

    console.log('All queries finished. Processing session data...');
    const rData = rRes.data;
    const sessData = sessRes.data;
    const schoolSess = (sessData || [])
      .filter(s => {
        const u = Array.isArray(s.users) ? s.users[0] : s.users;
        const isStaff = u?.role?.toLowerCase() === 'teacher' || u?.role?.toLowerCase() === 'admin';
        return u?.school_id === tData.school_id && (isStaff || s.gps_verified);
      });
    console.log('Active sessions filtered:', schoolSess.length);

    console.log('Processing coaches...');
    const allCoaches = coachesRes.data;
    const hidePresence = false;
    const isHomeMode = true;
    const activeCoaches = (allCoaches || []).filter(c => {
      if (c.is_observer) return false;
      if (c.id === userId) {
        return !hidePresence && !isHomeMode;
      }
      return schoolSess.some(s => s.user_id === c.id);
    });
    console.log('Active coaches count:', activeCoaches.length);

    console.log('Processing pool formations...');
    const wallData = wallRes.data || [];
    const schoolSkillsMap = {};
    wallData.forEach(s => {
      (s.user_song_skills || []).forEach(skill => {
        if (!skill.song_id) skill.song_id = s.id;
        if (!schoolSkillsMap[skill.user_id]) schoolSkillsMap[skill.user_id] = [];
        schoolSkillsMap[skill.user_id].push(skill);
      });
    });
    console.log('School skills mapped. Keys count:', Object.keys(schoolSkillsMap).length);

    console.log('Done!');
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

test();

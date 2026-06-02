import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const actualAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const supabase = createClient(supabaseUrl, actualAnonKey);

const userId = '9c629cb8-9241-4d5e-9151-da1fd6f4cde4'; // Klaus Siebold

async function simulate() {
  console.log('--- STAGE 1 FETCH ---');
  try {
    const [userRes, sessionRes, allSessionsRes, membershipsRes] = await Promise.all([
      supabase.from('users').select('*, schools(*)').eq('id', userId).maybeSingle(),
      supabase.from('sessions').select('*, stations(name)').eq('user_id', userId).is('check_out_time', null).order('check_in_time', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('sessions').select('check_in_time, check_out_time').eq('user_id', userId),
      supabase.from('band_members').select('id, instrument, confetti_seen, bands(id, name, school_id, song_id, status, photo_url, songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready)))))').eq('user_id', userId)
    ]);

    console.log('userRes error:', userRes.error);
    console.log('userRes data found:', !!userRes.data);
    console.log('sessionRes error:', sessionRes.error);
    console.log('allSessionsRes error:', allSessionsRes.error);
    console.log('membershipsRes error:', membershipsRes.error);

    if (!userRes.data) {
      console.log('No user data found. Exiting.');
      return;
    }

    const userData = userRes.data;
    const schoolId = userData.school_id || (Array.isArray(userData.schools) ? userData.schools[0]?.id : userData.schools?.id);
    console.log('resolved schoolId:', schoolId);

    const bandIds = (membershipsRes?.data || []).map((m) => m.bands?.id).filter(Boolean);
    console.log('resolved bandIds:', bandIds);

    console.log('--- STAGE 2 FETCH ---');
    const [skillsRes, wallRes, membersRes, formingBandsRes, songsRes, userBandsRes, bandsRes, teachersRes, activeSessionsRes] = await Promise.all([
      supabase.from('user_song_skills').select(`
        id, progress_percent, is_stage_ready, is_pending_approval, instrument, part_number, difficulty_level, is_favorite, verified_by_id,
        songs (*)
      `).eq('user_id', userId),
      supabase.from('songs').select(`
        id, artist, title, media_link, instrumentation,
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
      `).eq('school_id', schoolId).eq('is_campus_active', false),
      supabase.from('band_members').select('user_id, bands!inner(id, status, song_id, school_id, band_songs(song_id, status))').eq('bands.school_id', schoolId),
      supabase.from('bands').select('*, band_members(*, profiles:users(id, first_name, photo_url)), band_songs(*, band_song_slots(*, profiles:users!user_id(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready))))').eq('school_id', schoolId).in('status', ['forming', 'active']),
      supabase.from('songs').select('*').eq('school_id', schoolId).eq('is_campus_active', false).order('level').order('artist'),
      bandIds.length > 0
        ? supabase.from('bands').select(`
            *,
            songs (*),
            band_members (*, users(*)),
            band_songs (*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready)))),
            coach:users!coach_id (first_name, last_name, photo_url)
          `).in('id', bandIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('bands').select('*, songs(title, artist, instrumentation), band_members(*, users!user_id(*)), band_songs(*, songs(id, title, artist, instrumentation), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready)))), coach:users!coach_id (first_name, last_name, photo_url)').eq('school_id', schoolId).order('name', { ascending: true }),
      supabase.from('users').select('*').eq('school_id', schoolId).in('role', ['teacher', 'admin']).order('first_name'),
      supabase.from('sessions').select('user_id, station_id, users!inner(role, school_id, last_seen)').is('check_out_time', null).eq('users.school_id', schoolId)
    ]);

    console.log('skillsRes error:', skillsRes.error);
    console.log('wallRes error:', wallRes.error);
    console.log('membersRes error:', membersRes.error);
    console.log('formingBandsRes error:', formingBandsRes.error);
    console.log('songsRes error:', songsRes.error);
    console.log('userBandsRes error:', userBandsRes.error);
    console.log('bandsRes error:', bandsRes.error);
    console.log('teachersRes error:', teachersRes.error);
    console.log('activeSessionsRes error:', activeSessionsRes.error);

    console.log('Successfully completed simulation of all fetch queries!');
  } catch (err) {
    console.error('Crash during simulation:', err);
  }
}

simulate();

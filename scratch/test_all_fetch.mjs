import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function run() {
  const userId = '97e73f5d-b6d6-47d5-bb47-18ad02bae725';
  
  try {
    console.log(`[Test Fetch All] Fetching user: ${userId}`);
    const { data: userData } = await supabase.from('users').select('*, schools(*)').eq('id', userId).single();
    const schoolId = userData.school_id;
    console.log("schoolId:", schoolId);

    // Let's run all the stage 2 queries in App.tsx
    const [skillsRes, wallRes, membersRes, userBandsRes, bandsRes, teachersRes, activeSessionsRes] = await Promise.all([
      supabase.from('user_song_skills').select(`
        id, progress_percent, is_stage_ready, is_pending_approval, instrument, part_number, difficulty_level, is_favorite, verified_by_id,
        songs (*)
      `).eq('user_id', userId),
      supabase.from('songs').select(`
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
      `).eq('school_id', schoolId).eq('is_groovelab_active', true).eq('user_song_skills.is_stage_ready', true).order('level').order('artist'),
      supabase.from('band_members').select('user_id, bands!inner(id, status, song_id, school_id, band_songs(song_id, status))').eq('bands.school_id', schoolId),
      supabase.from('band_members').select('id, instrument, confetti_seen, bands(id, name, school_id, song_id, status, photo_url, songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url)))))').eq('user_id', userId),
      supabase.from('bands').select('*, songs(title, artist, instrumentation), band_members(*, users!user_id(id, first_name, last_name, photo_url, role)), band_songs(*, songs(id, title, artist, instrumentation), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))), coach:users!coach_id (first_name, last_name, photo_url)').eq('school_id', schoolId).order('name', { ascending: true }),
      supabase.from('users').select('id, first_name, last_name, role, avatar_url, photo_url, instrument, last_seen, sick_until, sick_start, phone, is_active, nickname, is_groovelab_active, is_campus_active, is_observer').eq('school_id', schoolId).in('role', ['teacher', 'admin']).order('first_name'),
      supabase.from('sessions').select('user_id, station_id, gps_verified, users!inner(role, school_id, last_seen, is_groovelab_active)').is('check_out_time', null).eq('users.school_id', schoolId).eq('users.role', 'student')
    ]);

    console.log("skillsRes error:", skillsRes.error);
    console.log("wallRes error:", wallRes.error);
    console.log("membersRes error:", membersRes.error);
    console.log("userBandsRes error:", userBandsRes.error);
    console.log("bandsRes error:", bandsRes.error);
    console.log("teachersRes error:", teachersRes.error);
    console.log("activeSessionsRes error:", activeSessionsRes.error);

    // Let's run parsing code:
    const schoolSkillsMap = {};
    (wallRes.data || []).forEach((song) => {
      (song.user_song_skills || []).forEach((skill) => {
        if (!schoolSkillsMap[skill.user_id]) schoolSkillsMap[skill.user_id] = [];
        schoolSkillsMap[skill.user_id].push(skill);
      });
    });

    const bandsData = bandsRes?.data || [];
    bandsData.forEach((band) => {
      (band.band_members || []).forEach((m) => {
        const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
        if (u) {
          u.user_song_skills = schoolSkillsMap[u.id] || [];
        }
      });
    });

    // Let's check matching logic
    console.log("Starting matching simulation...");
    const safeSkills = skillsRes.data || [];
    // ...
    console.log("Finished parsing logic!");
    
    // Now let's fetch school users
    const { data: allUsers, error: allUsersErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, role, photo_url, teacher_id, instrument')
      .eq('school_id', schoolId)
      .order('first_name');
    
    console.log("School users fetched at stage 3:", allUsers?.length, "error:", allUsersErr);
  } catch (err) {
    console.error("CRITICAL ERROR IN SIMULATION:", err);
  }
}

run();

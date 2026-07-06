import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function run() {
  const userId = '97e73f5d-b6d6-47d5-bb47-18ad02bae725';
  
  try {
    console.log(`[Test Fetch] Starting simulated fetch for user: ${userId}`);
    
    // Stage 1
    const [userRes, sessionRes, allSessionsRes, membershipsRes] = await Promise.all([
      supabase.from('users').select('*, schools(*)').eq('id', userId).maybeSingle(),
      supabase.from('sessions').select('*, stations(name)').eq('user_id', userId).is('check_out_time', null).order('check_in_time', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('sessions').select('check_in_time, check_out_time').eq('user_id', userId),
      supabase.from('band_members').select('id, instrument, confetti_seen, bands(id, name, school_id, song_id, status, photo_url, songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url)))))').eq('user_id', userId)
    ]);

    if (userRes.error) console.error('userRes error:', userRes.error);
    if (sessionRes.error) console.error('sessionRes error:', sessionRes.error);
    if (allSessionsRes.error) console.error('allSessionsRes error:', allSessionsRes.error);
    if (membershipsRes.error) console.error('membershipsRes error:', membershipsRes.error);

    const userData = userRes.data;
    if (!userData) {
      console.log("No user data");
      return;
    }

    const isStudent = userData.role?.toLowerCase() === 'student';
    console.log("isStudent:", isStudent);

    const schoolId = userData.school_id || (Array.isArray(userData.schools) ? userData.schools[0]?.id : userData.schools?.id);
    console.log("schoolId:", schoolId);

    // Let's simulate the queries in fetchDashboardData:
    // Teachers fetch active student count, target users, etc.
    if (schoolId) {
      console.log("Simulating school-based fetches...");
      
      const { data: usersData, error: usersErr } = await supabase.from('users')
        .select('id, first_name, last_name, role, avatar_url, photo_url, instrument, last_seen, sick_until, sick_start, phone, is_active, nickname, is_groovelab_active, is_campus_active, is_observer')
        .eq('school_id', schoolId)
        .in('role', ['teacher', 'admin'])
        .order('first_name');
        
      if (usersErr) console.error("usersErr:", usersErr);
      else console.log("Fetched teachers/admins count:", usersData?.length);

      const { data: allUsers, error: allUsersErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, role, photo_url, teacher_id, instrument')
        .eq('school_id', schoolId)
        .order('first_name');
        
      if (allUsersErr) console.error("allUsersErr:", allUsersErr);
      else console.log("Fetched all users (direct messages support) count:", allUsers?.length);
    }

    console.log("[Test Fetch] Success!");
  } catch (err) {
    console.error("[Test Fetch] Uncaught error:", err);
  }
}

run();

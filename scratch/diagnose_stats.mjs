import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data: schools } = await supabase.from('schools').select('*');
  const schoolId = schools[0].id;
  console.log(`Testing query for school ID: ${schoolId}`);

  // Test the skills query
  console.log("\n--- Testing Skills Query with explicit FK ---");
  const { data: skills, error: skillsError } = await supabase
    .from('user_song_skills')
    .select('progress_percent, instrument, is_stage_ready, student:users!user_song_skills_user_id_fkey!inner(school_id), songs(title, artist)')
    .eq('student.school_id', schoolId);

  if (skillsError) {
    console.error("Skills Error:", skillsError);
  } else {
    console.log(`Skills count: ${skills?.length}`);
    if (skills && skills.length > 0) {
      console.log("Sample Skill:", skills[0]);
    }
  }

  // Test the leaderboard query
  console.log("\n--- Testing Leaderboard Query with explicit FK ---");
  const { data: leaderboardData, error: leaderboardError } = await supabase
    .from('users')
    .select('*, skills:user_song_skills!user_song_skills_user_id_fkey(progress_percent, is_stage_ready)')
    .eq('school_id', schoolId)
    .eq('role', 'student');

  if (leaderboardError) {
    console.error("Leaderboard Error:", leaderboardError);
  } else {
    console.log(`Leaderboard users count: ${leaderboardData?.length}`);
    if (leaderboardData && leaderboardData.length > 0) {
      console.log("Sample user song skills length:", leaderboardData[0].skills?.length);
    }
  }
}

run();

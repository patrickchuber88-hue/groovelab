import { createClient } from '@supabase/supabase-js';

const url = "https://supabase.campus-groovelab.de";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc";
const supabase = createClient(url, key);

async function run() {
  // Query all users where BOTH is_campus_active = true AND is_groovelab_active = true
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, is_campus_active, is_groovelab_active, planned_boards')
    .eq('is_campus_active', true)
    .eq('is_groovelab_active', true);

  if (usersError) {
    console.error("Error fetching users:", usersError);
    return;
  }

  console.log(`=== USERS ACTIVE IN BOTH CAMPUS AND GROOVELAB (${users.length}) ===`);
  for (const user of users) {
    console.log(`- ${user.first_name} ${user.last_name || ''} (${user.role}) | ID: ${user.id}`);
    if (user.planned_boards && user.planned_boards.length > 0) {
      console.log(`  Has planned boards count: ${user.planned_boards.length}`);
    }
  }

  // Let's also check songs where BOTH are true
  const { data: songs, error: songsError } = await supabase
    .from('songs')
    .select('id, title, artist, is_campus_active, is_groovelab_active')
    .eq('is_campus_active', true)
    .eq('is_groovelab_active', true);

  if (songsError) {
    console.error("Error fetching songs:", songsError);
  } else {
    console.log(`\n=== SONGS ACTIVE IN BOTH CAMPUS AND GROOVELAB (${songs.length}) ===`);
    for (const song of songs) {
      console.log(`- ${song.title} by ${song.artist} | ID: ${song.id}`);
    }
  }

  // Let's check schedules table
  // Do we have schedules table?
  const { data: schedules, error: schedulesError } = await supabase
    .from('schedules')
    .select('*')
    .limit(5);
  if (schedulesError) {
    console.log("Schedules table query error or not exists:", schedulesError.message);
  } else {
    console.log(`\n=== SCHEDULES SAMPLE (${schedules.length}) ===`);
  }
}

run();

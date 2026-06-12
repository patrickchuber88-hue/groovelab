import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching schools...");
  const { data: schools, error: schoolsErr } = await supabase.from('schools').select('*');
  console.log("Schools count:", schools?.length, "Error:", schoolsErr);

  console.log("Fetching users...");
  const { data: users, error: usersErr } = await supabase.from('users').select('*');
  console.log("Users count:", users?.length, "Error:", usersErr);

  console.log("Fetching rooms...");
  const { data: rooms, error: roomsErr } = await supabase.from('rooms').select('*');
  console.log("Rooms count:", rooms?.length, "Error:", roomsErr);

  console.log("Fetching schedules...");
  const { data: schedules, error: schedulesErr } = await supabase.from('schedules').select('*');
  console.log("Schedules count:", schedules?.length, "Error:", schedulesErr);
}
run();

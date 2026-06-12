import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-user-id': '88888888-8888-8888-8888-888888888888'
    }
  }
});

async function run() {
  console.log("Fetching all users...");
  const { data: users, error: err } = await supabase
    .from('users')
    .select('*');

  if (err) {
    console.error("Error fetching users:", err);
    return;
  }

  console.log(`Found ${users?.length || 0} users total.`);
  const boris = users?.find(u => u.first_name.includes('Boris') || u.last_name.includes('Stoll'));
  if (!boris) {
    console.error("Boris Stoll not found among users.");
    return;
  }

  console.log(`Boris Stoll ID: ${boris.id}, School ID: ${boris.school_id}`);

  console.log("\nFetching ALL schedules for Boris Stoll...");
  const { data: schedules, error: sErr } = await supabase
    .from('schedules')
    .select('*')
    .eq('teacher_id', boris.id);

  if (sErr) {
    console.error("Error fetching schedules:", sErr);
    return;
  }

  console.log(`Found ${schedules.length} schedules total for Boris Stoll:`);
  schedules.forEach(s => {
    console.log(`- ID: ${s.id}, Day: ${s.day_of_week} (5=Friday), Time: ${s.time_slot}, Status: ${s.status}, Room ID: ${s.room_id}, School ID: ${s.school_id}, Student ID: ${s.student_id}, Subject: ${s.subject || 'none'}`);
  });
}

run();

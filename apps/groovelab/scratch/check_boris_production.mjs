import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.178.105.10.2.sslip.io';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-qr-token': '7b8e1a2c-4d5f-6a7b-8c9d-0e1f2a3b4c5d'
    }
  }
});

async function run() {
  console.log("Fetching all teachers in school via sslip.io...");
  const { data: users, error: err } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'teacher');

  if (err) {
    console.error("Error fetching teachers:", err);
    return;
  }

  console.log(`Found ${users?.length || 0} teachers.`);
  const boris = users?.find(u => u.first_name.includes('Boris') || u.last_name.includes('Stoll'));
  if (!boris) {
    console.error("Boris Stoll not found.");
    return;
  }

  console.log(`Boris Stoll ID: ${boris.id}`);

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
    console.log(`- ID: ${s.id}, Day: ${s.day_of_week} (5=Friday), Time: ${s.time_slot}, Status: ${s.status}, Room ID: ${s.room_id}, School ID: ${s.school_id}, Student ID: ${s.student_id}`);
  });
}

run();

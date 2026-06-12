import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("1. Finding Boris Stoll user account...");
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('*')
    .or('first_name.ilike.%Boris%,last_name.ilike.%Stoll%');

  if (userErr) {
    console.error("Error finding users:", userErr);
    return;
  }

  console.log(`Found ${users.length} users matching search query:`);
  users.forEach(u => console.log(`- ID: ${u.id}, Name: ${u.first_name} ${u.last_name}, Role: ${u.role}, Email: ${u.email}`));

  const boris = users.find(u => u.first_name.includes('Boris') || u.last_name.includes('Stoll'));
  if (!boris) {
    console.error("Boris Stoll not found.");
    return;
  }

  console.log("\n2. Fetching ALL schedules for Boris Stoll...");
  const { data: schedules, error: schedErr } = await supabase
    .from('schedules')
    .select('*')
    .eq('teacher_id', boris.id);

  if (schedErr) {
    console.error("Error fetching schedules:", schedErr);
    return;
  }

  console.log(`Found ${schedules.length} schedules total for Boris Stoll:`);
  schedules.forEach(s => {
    console.log(`- ID: ${s.id}, Day: ${s.day_of_week} (5=Friday), Time: ${s.time_slot}, Status: ${s.status}, Room ID: ${s.room_id}, School ID: ${s.school_id}, Student ID: ${s.student_id}`);
  });
}

run();

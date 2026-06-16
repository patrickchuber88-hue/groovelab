import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-qr-token': '7b8e1a2c-4d5f-6a7b-8c9d-0e1f2a3b4c5d'
    }
  }
});

async function run() {
  // 1. Get student named Laura
  const { data: students, error: sErr } = await supabase
    .from('users')
    .select('*')
    .ilike('first_name', '%Laura%');

  if (sErr || !students) {
    console.error("Error fetching student:", sErr);
    return;
  }

  console.log("Found students:", students.map(s => `${s.first_name} ${s.last_name} (${s.id})`));

  for (const s of students) {
    console.log(`\n--- Inspecting student: ${s.first_name} ${s.last_name} (${s.id}) ---`);
    
    // 2. Get active/unread crisis notifications
    const { data: notifs, error: nErr } = await supabase
      .from('crisis_notifications')
      .select('*, teacher:users!crisis_notifications_teacher_id_fkey(first_name, last_name)')
      .eq('student_id', s.id);
      
    if (nErr) {
      console.error("Error fetching notifications:", nErr);
    } else {
      console.log(`Notifications (${notifs.length}):`);
      notifs.forEach(n => {
        console.log(`- ID: ${n.id}, Date/Time: ${n.slot_start_datetime}, Status: ${n.status}, Reinstated: ${n.is_reinstated}, Teacher: ${n.teacher?.first_name} ${n.teacher?.last_name}`);
      });
    }

    // 3. Get schedules
    const { data: schedules, error: schErr } = await supabase
      .from('schedules')
      .select('*')
      .eq('student_id', s.id);

    if (schErr) {
      console.error("Error fetching schedules:", schErr);
    } else {
      console.log(`Schedules (${schedules.length}):`);
      schedules.forEach(sc => {
        console.log(`- Day: ${sc.day_of_week}, Time: ${sc.start_time}, Instructor: ${sc.teacher_id}, Room: ${sc.room_id}`);
      });
    }
  }
}

run();

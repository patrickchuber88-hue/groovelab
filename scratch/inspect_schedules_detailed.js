const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: teacher, error: tErr } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('role', 'teacher');
  
  if (tErr) {
    console.error("Error fetching teachers:", tErr);
    return;
  }
  console.log("Teachers:", teacher);

  // Let's query schedules for the teacher Patrick (usually Patrick Huber)
  const patrick = teacher.find(t => t.first_name.toLowerCase().includes('patrick'));
  if (!patrick) {
    console.log("Patrick not found");
    return;
  }

  console.log(`Querying schedules for Patrick (ID: ${patrick.id})...`);
  const { data: schedules, error: sErr } = await supabase
    .from('schedules')
    .select(`
      id,
      time_slot,
      day_of_week,
      student_id,
      rooms(name),
      student:users!schedules_student_id_fkey(first_name, last_name)
    `)
    .eq('teacher_id', patrick.id);
  
  if (sErr) {
    console.error("Error fetching schedules:", sErr);
    return;
  }

  console.log(`Found ${schedules.length} schedules:`);
  schedules.forEach(s => {
    console.log(`- ID: ${s.id} | Day: ${s.day_of_week} | Slot: ${s.time_slot} | Student: ${s.student?.first_name} ${s.student?.last_name} | Room: ${s.rooms?.name}`);
  });
}
run();

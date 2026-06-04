import { createClient } from '@supabase/supabase-js';

const url = "https://supabase.campus-groovelab.de";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc";
const supabase = createClient(url, key);

async function run() {
  const { data: schedules, error } = await supabase
    .from('schedules')
    .select('*, teacher:users!schedules_teacher_id_fkey(first_name, last_name, is_campus_active, is_groovelab_active), student:users!schedules_student_id_fkey(first_name, last_name, is_campus_active, is_groovelab_active)');

  if (error) {
    console.error("Error querying schedules:", error);
    return;
  }

  console.log(`Found ${schedules.length} schedules.`);
  
  let count = 0;
  for (const item of schedules) {
    const student = item.student;
    const teacher = item.teacher;
    if (student && student.is_campus_active && student.is_groovelab_active) {
      count++;
      console.log(`Schedule ID: ${item.id} | Student: ${student.first_name} ${student.last_name} (BOTH) | Teacher: ${teacher?.first_name} ${teacher?.last_name}`);
    }
  }
  console.log(`Found ${count} schedule entries linked with dual-active students.`);
}

run();

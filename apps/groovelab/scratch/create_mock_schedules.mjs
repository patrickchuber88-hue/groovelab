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

const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';

async function run() {
  console.log("Fetching all teachers...");
  const { data: teachers, error: tErr } = await supabase
    .from('users')
    .select('*')
    .eq('school_id', schoolId)
    .eq('role', 'teacher');

  if (tErr) {
    console.error("Error fetching teachers:", tErr);
    return;
  }

  console.log(`Found ${teachers.length} teachers in the school.`);

  console.log("\nFetching all students...");
  const { data: students, error: sErr } = await supabase
    .from('users')
    .select('*')
    .eq('school_id', schoolId)
    .eq('role', 'student');

  if (sErr) {
    console.error("Error fetching students:", sErr);
    return;
  }

  console.log(`Found ${students.length} students in the school.`);

  console.log("\nChecking existing schedules...");
  const { data: existingSchedules, error: schedErr } = await supabase
    .from('schedules')
    .select('teacher_id')
    .eq('school_id', schoolId);

  if (schedErr) {
    console.error("Error fetching schedules:", schedErr);
    return;
  }

  const teachersWithSchedules = new Set(existingSchedules.map(s => s.teacher_id));
  console.log(`Teachers with existing schedules: ${teachersWithSchedules.size}`);

  const teachersWithoutSchedules = teachers.filter(t => !teachersWithSchedules.has(t.id));
  console.log(`Teachers without schedules: ${teachersWithoutSchedules.length}`);

  if (teachersWithoutSchedules.length === 0) {
    console.log("All teachers already have schedules. No mock schedules needed.");
    return;
  }

  const newSchedules = [];
  const times = ['14:00', '14:30', '15:00', '15:30', '16:00'];

  teachersWithoutSchedules.forEach((teacher, tIndex) => {
    console.log(`Generating schedule for: ${teacher.first_name} ${teacher.last_name} (${teacher.id})`);
    
    // Create 3 unassigned slots on Friday (day_of_week = 5) or Thursday (day_of_week = 4)
    const day = (tIndex % 2 === 0) ? 5 : 4; 
    
    // Assign 3 students to this teacher
    for (let i = 0; i < 3; i++) {
      const studentIdx = (tIndex * 3 + i) % students.length;
      const student = students[studentIdx];
      
      newSchedules.push({
        teacher_id: teacher.id,
        student_id: student ? student.id : null,
        day_of_week: day,
        time_slot: times[i],
        status: 'ready_for_admin_review',
        room_id: null,
        school_id: schoolId
      });
    }
  });

  console.log(`\nInserting ${newSchedules.length} mock schedules...`);
  const { data: inserted, error: insertErr } = await supabase
    .from('schedules')
    .insert(newSchedules)
    .select('*');

  if (insertErr) {
    console.error("Error inserting mock schedules:", insertErr);
    return;
  }

  console.log(`Successfully created and submitted ${inserted.length} schedules!`);
}

run();

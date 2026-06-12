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

  // Clear existing mock schedules we just created to avoid duplicates
  console.log("Cleaning up previously generated review schedules...");
  const { error: deleteErr } = await supabase
    .from('schedules')
    .delete()
    .eq('school_id', schoolId)
    .eq('status', 'ready_for_admin_review');

  if (deleteErr) {
    console.error("Error deleting old mock schedules:", deleteErr);
    return;
  }

  const times = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];
  const newSchedules = [];

  for (const teacher of teachers) {
    if (teacher.id === '03564b1c-e2bb-4ccb-be95-b9fd1ef34829') {
      console.log(`\nSkipping Patrick Huber (${teacher.id}) - their schedule is already perfect.`);
      continue;
    }

    console.log(`\nFetching students for teacher: ${teacher.first_name} ${teacher.last_name} (${teacher.id})`);
    
    const { data: students, error: sErr } = await supabase
      .from('users')
      .select('*')
      .eq('teacher_id', teacher.id)
      .eq('role', 'student');

    if (sErr) {
      console.error(`Error fetching students for ${teacher.id}:`, sErr);
      continue;
    }

    console.log(`Found ${students.length} students linked directly to this teacher.`);

    if (students.length === 0) {
      continue;
    }

    // Assign all students of this teacher to schedule slots
    students.forEach((student, index) => {
      const day = 1 + (index % 5); // 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday
      const timeIndex = Math.floor(index / 5) % times.length;
      const timeSlot = times[timeIndex];

      newSchedules.push({
        teacher_id: teacher.id,
        student_id: student.id,
        day_of_week: day,
        time_slot: timeSlot,
        status: 'ready_for_admin_review',
        room_id: null,
        school_id: schoolId
      });
    });
  }

  if (newSchedules.length === 0) {
    console.log("No new schedules to insert.");
    return;
  }

  console.log(`\nInserting ${newSchedules.length} real student schedules...`);
  const { data: inserted, error: insertErr } = await supabase
    .from('schedules')
    .insert(newSchedules)
    .select('*');

  if (insertErr) {
    console.error("Error inserting schedules:", insertErr);
    return;
  }

  console.log(`Successfully created and submitted ${inserted.length} teacher-student schedules!`);
}

run();

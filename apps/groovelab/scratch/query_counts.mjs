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
  const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';
  
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, roles, is_active, is_campus_active')
    .eq('school_id', schoolId);

  if (usersErr) {
    console.error("Users error:", usersErr);
    return;
  }

  const { data: pending, error: pendingErr } = await supabase
    .from('pending_students_decrypted')
    .select('id')
    .eq('school_id', schoolId);

  if (pendingErr) {
    console.error("Pending error:", pendingErr);
  }

  console.log("USERS COUNT:", users.length);
  console.log("PENDING COUNT:", pending ? pending.length : 0);

  // Analyze team members
  const teachers = users.filter(u => u.role === 'teacher' || (u.roles && u.roles.includes('teacher')));
  const employees = users.filter(u => u.role === 'admin' || u.role === 'secretary' || (u.roles && (u.roles.includes('admin') || u.roles.includes('secretary'))));
  
  console.log("Teachers Count (allTeachers):", teachers.length);
  console.log("Employees Count (employees):", employees.length);
  console.log("Unique Team members:", new Set([...teachers.map(t=>t.id), ...employees.map(e=>e.id)]).size);

  const students = users.filter(u => u.role === 'student');
  console.log("Students Count:", students.length);
  
  const activeStudents = students.filter(s => s.isCampusActive || s.is_campus_active);
  console.log("Active Students Count:", activeStudents.length);
}

run();

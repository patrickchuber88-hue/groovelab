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
  const { data: schools } = await supabase.from('schools').select('*').eq('name', 'Musäk Bad Säckingen');
  if (!schools || schools.length === 0) {
    console.log("School not found!");
    return;
  }
  const school = schools[0];
  console.log("School details:", school);

  const { data: users } = await supabase.from('users').select('*').eq('school_id', school.id);
  console.log(`Total users in DB: ${users.length}`);

  const roleCounts = {};
  users.forEach(u => {
    roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
  });
  console.log("Role counts:", roleCounts);

  const students = users.filter(u => u.role === 'student');
  const activeStudents = students.filter(s => s.is_active);
  const campusActiveStudents = students.filter(s => s.is_campus_active);
  const groovelabActiveStudents = students.filter(s => s.is_groovelab_active);
  const trialStudents = students.filter(s => s.is_trial);

  console.log(`Students: Total=${students.length}, is_active=true=${activeStudents.length}, is_campus_active=true=${campusActiveStudents.length}, is_groovelab_active=true=${groovelabActiveStudents.length}, is_trial=true=${trialStudents.length}`);

  const teachers = users.filter(u => u.role === 'teacher' || (u.roles && u.roles.includes('teacher')));
  console.log(`Teachers: Total=${teachers.length}, active=${teachers.filter(t => t.is_active).length}`);

  const admins = users.filter(u => u.role === 'admin' || u.role === 'secretary' || (u.roles && (u.roles.includes('admin') || u.roles.includes('secretary'))));
  console.log(`Admins/Secretaries: Total=${admins.length}, active=${admins.filter(a => a.is_active).length}`);

  // Fetch pending students
  const { data: pending } = await supabase.from('pending_students_decrypted').select('*').eq('school_id', school.id);
  console.log(`Pending students: ${pending ? pending.length : 0}`);
}

run();

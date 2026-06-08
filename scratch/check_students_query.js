const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.178.105.10.2.sslip.io';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const teacherId = '2a07c2d1-2139-4d64-8848-0ca1a89895bb'; // Let's guess or check user IDs in the system
  
  // Let's first list all teachers or find the user with patrick / teacher role
  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, school_id')
    .eq('role', 'teacher');
  
  if (error) {
    console.error("Error fetching teachers:", error);
    return;
  }
  
  console.log("Teachers found:", users);
  
  if (users && users.length > 0) {
    const teacher = users[0];
    const { data: students, error: studentError } = await supabase
      .from('users')
      .select('id, first_name, last_name, role, teacher_id, is_campus_active, is_groovelab_active')
      .eq('school_id', teacher.school_id)
      .eq('role', 'student')
      .eq('teacher_id', teacher.id);
      
    if (studentError) {
      console.error("Error fetching students:", studentError);
      return;
    }
    
    console.log(`Students for teacher ${teacher.first_name} ${teacher.last_name}:`, students);
  }
}

run();

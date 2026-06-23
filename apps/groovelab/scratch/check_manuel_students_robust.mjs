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
  const school = schools[0];
  
  const { data: users } = await supabase.from('users').select('*').eq('school_id', school.id);
  const manuel = users.find(u => u.first_name === 'Manuel');
  console.log("Manuel User:", manuel);

  if (manuel) {
    const students = users.filter(u => u.role === 'student' && u.teacher_id === manuel.id);
    console.log(`Students with teacher_id = Manuel Wagner: ${students.length}`);
    students.forEach(s => {
      console.log(`- ${s.first_name} ${s.last_name}: is_groovelab_active=${s.is_groovelab_active}, is_campus_active=${s.is_campus_active}`);
    });
  }
}

run();

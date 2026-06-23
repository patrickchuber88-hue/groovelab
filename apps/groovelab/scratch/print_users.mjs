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
  const { data: users } = await supabase.from('users').select('id, first_name, last_name, role, roles, is_active, is_campus_active, is_groovelab_active').eq('school_id', school.id);
  
  console.log("ALL USERS:");
  users.forEach(u => {
    if (u.role !== 'student' || u.is_active || u.is_campus_active || u.is_groovelab_active) {
      console.log(`- ${u.first_name} ${u.last_name}: role=${u.role}, roles=${JSON.stringify(u.roles)}, is_active=${u.is_active}, is_campus_active=${u.is_campus_active}, is_groovelab_active=${u.is_groovelab_active}`);
    }
  });
}

run();

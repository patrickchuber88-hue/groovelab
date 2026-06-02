const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, anonKey);

async function checkTeachers() {
  console.log('Fetching users to inspect roles and check why teachers cannot login...');
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, is_groovelab_active, is_campus_active')
      .limit(10);
      
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    
    console.log('Retrieved users:');
    users.forEach(u => {
      console.log(`- ${u.first_name} ${u.last_name} (${u.email}): Role = ${u.role}, GL_Active = ${u.is_groovelab_active}, Campus_Active = ${u.is_campus_active}`);
    });
  } catch (err) {
    console.error('Execution error:', err);
  }
}

checkTeachers();

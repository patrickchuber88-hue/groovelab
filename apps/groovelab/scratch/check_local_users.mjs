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
  const { data: users, error } = await supabase
    .from('users')
    .select('id, school_id, role, roles, first_name, last_name');

  if (error) {
    console.error(error);
    return;
  }

  console.log("Total users fetched by Master Admin:", users.length);
  const musaekUsers = users.filter(u => u.school_id === '74713df2-6176-4a41-a8cd-9fbebe34e9b8');
  console.log("Musäk users fetched by Master Admin:", musaekUsers.length);
  musaekUsers.forEach(u => {
    console.log(`- ${u.first_name} ${u.last_name} (${u.role}, roles: ${JSON.stringify(u.roles)})`);
  });
}

run();

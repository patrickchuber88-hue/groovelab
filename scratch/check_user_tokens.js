const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const actualAnonKeyNew = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, actualAnonKeyNew, {
  global: {
    headers: {
      'x-user-id': '97e73f5d-b6d6-47d5-bb47-18ad02bae725'
    }
  }
});

async function run() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, qr_token, teacher_qr_token')
    .limit(10);
    
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  console.log(users);
}

run();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching all users...');
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('*')
    .limit(20);

  if (userErr) {
    console.error('Error fetching users:', userErr);
    return;
  }

  console.log('Found users:', users?.map(u => ({ id: u.id, name: u.first_name || u.name, role: u.role, is_app_user: u.is_app_user })));

  const { data: avatars } = await supabase.from('avatars').select('*');
  console.log('Found avatars:', avatars);
}

run();

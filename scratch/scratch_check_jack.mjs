import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('Fetching database stats...');
  
  const { data: schools, error: schoolsErr } = await supabase
    .from('schools')
    .select('id, name');
  console.log('Schools:', schools);

  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  console.log('Total user count:', userCount);

  // Let's fetch all users
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, first_name, last_name, role');
  console.log('All Users:', allUsers);
}

main();

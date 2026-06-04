const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const schoolId = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';

async function run() {
  console.log('Test 1: users!inner(*) and users.school_id');
  const res1 = await supabase
    .from('help_requests')
    .select('*, users!inner(*)')
    .eq('users.school_id', schoolId)
    .eq('status', 'pending');
  console.log('Res1 error:', res1.error);
  console.log('Res1 count:', res1.data?.length);

  console.log('\nTest 2: users!help_requests_user_id_fkey!inner(*) and users.school_id');
  const res2 = await supabase
    .from('help_requests')
    .select('*, users:user_id!inner(*)')
    .eq('users.school_id', schoolId)
    .eq('status', 'pending');
  console.log('Res2 error:', res2.error);
  console.log('Res2 count:', res2.data?.length);
}

run();

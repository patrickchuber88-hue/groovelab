import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.178.105.10.2.sslip.io';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log("Columns of users table:", Object.keys(data[0] || {}));
  }
}
run();

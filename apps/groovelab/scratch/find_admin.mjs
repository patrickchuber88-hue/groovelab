import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

async function find() {
  const token = '2e2e7ec2-46b0-4ab6-9805-284e66186ab1'; // VITE_BYPASS_ADMIN_TOKEN
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-qr-token': token
      }
    }
  });

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('qr_token', token);

  console.log("Admin user by qr_token:", data, error);
}

find();

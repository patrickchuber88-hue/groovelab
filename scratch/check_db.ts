import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabase = createClient(
  'https://supabase.178.105.10.2.sslip.io',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc'
);

async function check() {
  console.log("Searching for user 1e19196b-430c-4fa6-8488-ea9e71f92e31 on sslip.io...");
  const { data: user, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, email')
    .eq('id', '1e19196b-430c-4fa6-8488-ea9e71f92e31')
    .single();

  if (error) {
    console.error("Query failed:", error);
    return;
  }

  console.log("User found on sslip.io:", user);
}

check();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const SILAS_ID = 'f7f83cc3-6900-4388-8290-a4d99a9fb383';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': SILAS_ID
    }
  }
});

async function main() {
  console.log("Testing update on users table as Silas Meier...");
  
  // Try updating users table
  const { data, error } = await supabase
    .from('users')
    .update({
      first_name: 'Silas',
      last_name: 'Meier'
    })
    .eq('id', SILAS_ID)
    .select();

  if (error) {
    console.error("UPDATE FAILED:", error);
  } else {
    console.log("UPDATE SUCCESSFUL:", data);
  }
}

main();

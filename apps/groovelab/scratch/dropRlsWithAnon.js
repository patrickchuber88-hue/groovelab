import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Calling execute_sql with anon key...");
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: `
      DROP POLICY IF EXISTS "Allow select teacher profiles" ON public.users_raw;
      DROP POLICY IF EXISTS "Allow select student profiles" ON public.users_raw;
      ALTER TABLE public.users_raw DISABLE ROW LEVEL SECURITY;
    `
  });
  console.log("Result:", data);
  if (error) console.error("Error:", error);
}
run();

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function run() {
  console.log("Querying users with schools join using ANON key...");
  const { data, error } = await supabase
    .from('users')
    .select('*, schools(*)')
    .eq('ausweis_nummer', 'GL-9239')
    .maybeSingle();

  console.log("Result error:", error);
  console.log("Result data:", JSON.stringify(data, null, 2));
}

run();

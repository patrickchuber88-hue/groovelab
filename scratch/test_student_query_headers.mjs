import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

async function run() {
  const customFetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('x-qr-token', 'GL-9239');
    
    return fetch(input, {
      ...init,
      headers
    });
  };

  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: {
      fetch: customFetch
    }
  });

  console.log("Querying users with schools join using ANON key + x-qr-token header...");
  const { data, error } = await supabase
    .from('users')
    .select('*, schools(*)')
    .eq('ausweis_nummer', 'GL-9239')
    .maybeSingle();

  console.log("Result error:", error);
  console.log("Result data:", JSON.stringify(data, null, 2));
}

run();

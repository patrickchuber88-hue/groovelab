import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: schedules, error } = await supabase
    .from('schedules')
    .select('*')
    .limit(3);
  
  if (error) {
    console.error('Error fetching schedules:', error);
    return;
  }
  
  console.log('Fetched schedules:', schedules);
}
run();

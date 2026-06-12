import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-user-id': '88888888-8888-8888-8888-888888888888'
    }
  }
});

async function run() {
  const borisId = 'ff30d2e9-43ae-432b-bba7-c4766bd57ca4';
  
  console.log("Updating Boris Stoll's Friday schedules to 'approved'...");
  const { data, error } = await supabase
    .from('schedules')
    .update({ status: 'approved' })
    .eq('teacher_id', borisId)
    .eq('day_of_week', 5);

  if (error) {
    console.error("Error updating Friday schedules:", error);
    return;
  }

  console.log("Success! Updated Friday schedules database entries.");
}

run();

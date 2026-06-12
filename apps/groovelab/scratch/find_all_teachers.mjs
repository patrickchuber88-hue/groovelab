import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching all users in database...");
  const { data: users, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${users.length} users:`);
  users.forEach(u => {
    console.log(`- ${u.id}: ${u.first_name} ${u.last_name} (${u.role})`);
  });
}
run();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const queryUsers = `SELECT id, first_name, last_name, role FROM users;`;
  console.log("Running SQL for users...");
  const { data: usersData, error: usersError } = await supabase.rpc('execute_sql', { sql_query: queryUsers });
  
  if (usersError) {
    console.error("users error:", usersError);
    // try fallback exec_sql
    const { data: fallbackUsers, error: fallbackError } = await supabase.rpc('exec_sql', { query: queryUsers });
    console.log("Fallback users:", fallbackUsers, fallbackError);
    return;
  }
  
  console.log("Users:", usersData);
}
run();

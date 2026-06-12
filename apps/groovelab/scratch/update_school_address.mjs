import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `UPDATE schools SET street = 'Friedrichstraße 33', zip_code = '79713', city = 'Bad Säckingen' WHERE id = '74713df2-6176-4a41-a8cd-9fbebe34e9b8';`;
  console.log("Updating school address...");
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  
  if (error) {
    console.error("error:", error);
    // try fallback exec_sql
    const { data: fallbackData, error: fallbackError } = await supabase.rpc('exec_sql', { query: sql });
    console.log("Fallback result:", fallbackData, fallbackError);
    return;
  }
  
  console.log("Success:", data);
}
run();

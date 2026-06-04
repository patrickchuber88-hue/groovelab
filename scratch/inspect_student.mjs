import { createClient } from '@supabase/supabase-js'

const url = "https://supabase.campus-groovelab.de";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc";
const supabase = createClient(url, key);

const { data, error } = await supabase
  .from('users')
  .select('id, first_name, last_name, role, school_id')
  .eq('role', 'student')
  .limit(5);

console.log("Error:", error);
console.log("Students:", JSON.stringify(data, null, 2));

import { createClient } from '@supabase/supabase-js'

const url = "https://supabase.campus-groovelab.de";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc";
const supabase = createClient(url, key);

const { data, error } = await supabase
  .from('users')
  .select('id, first_name, last_name, role, qr_token, teacher_qr_token, ausweis_nummer')
  .in('role', ['teacher', 'admin'])
  .limit(10);

if (error) {
  console.error("Error:", error);
} else {
  console.log(JSON.stringify(data, null, 2));
}

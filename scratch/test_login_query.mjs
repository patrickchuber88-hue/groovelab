import { createClient } from '@supabase/supabase-js'

const url = "https://supabase.campus-groovelab.de";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc";
const supabase = createClient(url, key);

// Let's test a UUID token
const uuidToken = "0769ac49-0493-478f-aa2a-7aeed7706665"; // Patrick Huber's qr_token

console.log("Querying with .or() using a valid UUID...");
const { data, error } = await supabase
  .from('users')
  .select('*, schools(*)')
  .or(`qr_token.eq.${uuidToken},teacher_qr_token.eq.${uuidToken}`)
  .maybeSingle();

console.log("Error:", error);
console.log("Data:", data ? { id: data.id, role: data.role, school_id: data.school_id } : null);

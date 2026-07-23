import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Logging in as Patrick Huber...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@campus-groovelab.de',
    password: 'password123'
  });
  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }
  console.log("Logged in:", authData.user.id);
  
  // Try fetching students
  console.log("Fetching from users table where role=student...");
  const { data: students, error: fetchErr } = await supabase.from('users').select('*').eq('role', 'student');
  if (fetchErr) {
    console.error("Fetch error:", fetchErr);
  } else {
    console.log("Fetched students length:", students?.length);
    if (students?.length > 0) {
      console.log("First student:", students[0].first_name, students[0].last_name);
    }
  }

  // Try fetching Patrick Huber's profile
  console.log("Fetching own profile...");
  const { data: own, error: ownErr } = await supabase.from('users').select('*').eq('id', authData.user.id);
  if (ownErr) {
    console.error("Own profile error:", ownErr);
  } else {
    console.log("Own profile length:", own?.length);
    if (own?.length > 0) {
      console.log("Own profile role:", own[0].role);
    }
  }
}
run();

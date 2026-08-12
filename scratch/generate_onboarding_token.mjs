import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function run() {
  // 1. Fetch Elias Schmidt's student ID
  const { data: students, error: studentError } = await supabase
    .from('users_raw')
    .select('id')
    .eq('first_name', 'Elias')
    .eq('last_name', 'Schmidt')
    .eq('school_id', '532b4d91-67c8-4194-9cde-f231ecb12bdd')
    .limit(1);

  if (studentError || !students || students.length === 0) {
    console.error("Could not find student Elias Schmidt:", studentError);
    process.exit(1);
  }

  const studentId = students[0].id;

  // 2. Generate a token in student_onboarding_tokens table
  const { data, error } = await supabase
    .from('student_onboarding_tokens')
    .insert({ student_id: studentId })
    .select('token')
    .single();

  if (error) {
    console.error("Error creating onboarding token:", error.message);
  } else {
    console.log("Timetable Onboarding URL for Elias Schmidt:");
    console.log(`Link: http://localhost:5173/?onboarding=parent&token=${data.token}`);
  }
}
run();

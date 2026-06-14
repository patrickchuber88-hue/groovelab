import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkOtherStudents() {
  const { data: students, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, is_active, is_campus_active, is_groovelab_active, show_groovelab')
    .eq('role', 'student')
    .limit(20);

  if (error) {
    console.error("Error fetching students:", error);
    return;
  }

  console.log("Students:", JSON.stringify(students, null, 2));
}

checkOtherStudents();

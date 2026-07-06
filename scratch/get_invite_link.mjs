import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function run() {
  const { data: students, error } = await supabase
    .from('users_raw')
    .select('id, first_name, last_name, qr_token, school_id')
    .eq('role', 'student')
    .not('qr_token', 'is', null)
    .limit(5);

  if (error) {
    console.error("Error fetching students:", error.message);
  } else {
    console.log("Students with tokens:");
    for (let s of students) {
      console.log(`- ${s.first_name} ${s.last_name}: http://localhost:5173/?invite_school_id=${s.school_id}&token=${s.qr_token}`);
    }
  }
}
run();

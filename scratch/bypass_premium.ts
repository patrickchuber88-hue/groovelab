import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function run() {
  console.log("Setting student premium status to active (Bypass)...");
  
  // Get all students
  const { data: students, error: fetchErr } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('role', 'student');

  if (fetchErr) {
    console.error("Error fetching students:", fetchErr);
    return;
  }

  if (!students || students.length === 0) {
    console.log("No student accounts found in the database.");
    return;
  }

  console.log(`Found ${students.length} students. Setting premium status to active...`);

  for (const stud of students) {
    // 1. Update users table field
    const { error: userErr } = await supabase
      .from('users')
      .update({ is_premium_user: true })
      .eq('id', stud.id);

    if (userErr) {
      console.error(`Failed to update users table for ${stud.first_name}:`, userErr.message);
    }

    // 2. Upsert into premium_status table
    const { error: premErr } = await supabase
      .from('premium_status')
      .upsert({ student_id: stud.id, is_premium_active: true });

    if (premErr) {
      console.error(`Failed to upsert premium_status for ${stud.first_name}:`, premErr.message);
    } else {
      console.log(`Success: Set premium active for student ${stud.first_name} ${stud.last_name}`);
    }
  }

  console.log("Premium status bypass completed.");
}
run();

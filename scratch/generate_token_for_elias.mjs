import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function run() {
  const { data: students, error: fetchErr } = await supabase
    .from('users_raw')
    .select('id')
    .eq('first_name', 'Elias')
    .eq('last_name', 'Schmidt')
    .eq('school_id', '532b4d91-67c8-4194-9cde-f231ecb12bdd');

  if (fetchErr || !students || students.length === 0) {
    console.error("Could not find Elias Schmidt", fetchErr);
    process.exit(1);
  }

  const studentId = students[0].id;
  const token = crypto.randomUUID();
  
  const { data, error } = await supabase
    .from('users_raw')
    .update({ qr_token: token })
    .eq('id', studentId)
    .select();

  if (error) {
    console.error("Error setting token:", error.message);
  } else {
    console.log("Updated Elias Schmidt successfully!");
    for (let s of data) {
      console.log(`Link: http://localhost:5173/?invite_school_id=${s.school_id}&token=${s.qr_token}`);
    }
  }
}
run();

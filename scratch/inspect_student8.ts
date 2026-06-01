import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: 'apps/groovelab/.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  // 1. Find user '8'
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, first_name, last_name, role')
    .ilike('first_name', '8');
  console.log("Users:", users, "Error:", userError);

  if (users && users.length > 0) {
    const studentId = users[0].id;
    // 2. Fetch schedules for student
    const { data: schedules, error: schedError } = await supabase
      .from('schedules')
      .select('*')
      .eq('student_id', studentId);
    console.log("Schedules:", schedules, "Error:", schedError);
  }
}
test();

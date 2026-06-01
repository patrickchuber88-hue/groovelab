const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('schedules')
    .select('id, student_id, teacher_id, day_of_week, time_slot, status, school_id')
    .limit(10);
  
  if (error) {
    console.error(error);
  } else {
    console.log("Schedules details in DB:", data);
  }
}
run();

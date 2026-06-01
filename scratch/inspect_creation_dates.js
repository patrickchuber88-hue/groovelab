const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, teacher_id, instrument, created_at')
    .eq('role', 'student')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error(error);
  } else {
    console.log("Students details with created_at:");
    data.forEach(s => {
      console.log(`- ${s.first_name} ${s.last_name} | created_at: ${s.created_at} | teacher_id: ${s.teacher_id} | instrument: ${s.instrument}`);
    });
  }
}
run();

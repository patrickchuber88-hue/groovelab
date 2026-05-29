const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, teacher_id, school_id')
    .eq('role', 'student');
  
  if (error) {
    console.error(error);
  } else {
    console.log("Students in database:");
    data.forEach(s => {
      console.log(`- ${s.first_name} ${s.last_name} (ID: ${s.id}) | teacher_id: ${s.teacher_id} | school_id: ${s.school_id}`);
    });
  }
}
run();

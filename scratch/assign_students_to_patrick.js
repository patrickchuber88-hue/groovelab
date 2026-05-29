const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const teacherId = 'f0963052-ab2f-4434-9e67-7a31da62b184'; // Patrick Huber
  const { data, error } = await supabase
    .from('users')
    .update({ teacher_id: teacherId })
    .eq('role', 'student')
    .is('teacher_id', null);
  
  if (error) {
    console.error(error);
  } else {
    console.log("Assigned all orphaned students to teacher Patrick Huber!");
  }
}
run();

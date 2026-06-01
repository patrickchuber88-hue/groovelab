const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, instrument, is_active, is_campus_active')
    .in('role', ['teacher', 'admin']);
  
  if (error) {
    console.error(error);
  } else {
    console.log("Teachers in DB:", data);
  }
}
run();

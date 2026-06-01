const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, is_active, is_campus_active, is_groovelab_active, school_id')
    .eq('id', '03564b1c-e2bb-4ccb-be95-b9fd1ef34829')
    .single();
  
  if (error) {
    console.error(error);
  } else {
    console.log("Teacher Patrick Huber details:", data);
  }
}
run();

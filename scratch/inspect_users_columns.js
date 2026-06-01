const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error(error);
  } else if (data && data.length > 0) {
    console.log("Users table columns:", Object.keys(data[0]));
    console.log("Sample user record:", data[0]);
  } else {
    console.log("No users found.");
  }
}
run();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log("Connecting to:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Querying all users...");
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, email');

  if (error) {
    console.error("Error querying users:", error);
  } else {
    console.log("Users in DB:", data);
  }
}
run();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching schools from real db...");
  const { data: schools, error: errSchools } = await supabase.from('schools').select('*');
  console.log("Schools:", schools, errSchools);

  console.log("Fetching users from real db...");
  const { data: users, error: errUsers } = await supabase.from('users').select('*');
  console.log("Users count:", users ? users.length : 0, errUsers);
  if (users) {
    console.log("First 5 users:", users.slice(0, 5));
  }
}
run();

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('first_name', '%dominik%')
    .limit(1);

  if (error) {
    console.error("Error fetching user:", error);
    return;
  }
  console.log("Dominik User data:", JSON.stringify(user, null, 2));
}

run();

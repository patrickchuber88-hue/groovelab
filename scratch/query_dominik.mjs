import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkDominik() {
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .or('first_name.ilike.%dominik%,nickname.ilike.%dominik%,last_name.ilike.%dominik%');

  if (userError) {
    console.error("Error finding Dominik:", userError);
    return;
  }

  console.log("Users matching Dominik:", JSON.stringify(users, null, 2));
}

checkDominik();

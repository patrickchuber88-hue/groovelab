import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

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

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .limit(1);
  if (error) {
    console.error('Error fetching schools:', error);
  } else {
    console.log('School columns:', Object.keys(data[0] || {}));
    console.log('School data:', data[0]);
  }
}
run().catch(console.error);

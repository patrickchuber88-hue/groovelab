import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

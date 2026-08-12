import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const { data: schools, error } = await supabase.from('schools').select('*');
  if (error) {
    console.error('Error fetching schools:', error);
  } else {
    console.log('All schools in DB:', schools);
  }
}

run().catch(console.error);

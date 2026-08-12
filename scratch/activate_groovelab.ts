import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log('Activating has_groovelab_subscription for MUSÄK Groovelab...');
  const { data, error } = await supabase
    .from('schools')
    .update({ has_groovelab_subscription: true })
    .eq('id', 'cc05137f-5904-4774-80be-6a172c52bf99')
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

run();

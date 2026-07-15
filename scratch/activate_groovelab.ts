import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

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

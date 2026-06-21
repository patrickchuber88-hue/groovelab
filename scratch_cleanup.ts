import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function clean() {
  console.log('Cleaning program points...');
  const { error: err1 } = await supabase.from('campus_event_program_points').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (err1) console.error('Error program points delete:', err1);

  console.log('Cleaning events...');
  const { error: err2 } = await supabase.from('campus_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (err2) console.error('Error events delete:', err2);

  console.log('Cleanup finished.');
}

clean().catch(console.error);

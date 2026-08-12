import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': '44444444-4444-4444-4444-444444444441' // admin-1
    }
  }
});

async function run() {
  const { data: schools, error: schoolErr } = await supabase
    .from('schools')
    .select('*');
  console.log('Schools:', schools, 'Error:', schoolErr);

  const { data: events, error: eventErr } = await supabase
    .from('campus_events')
    .select('*');
  console.log('Campus Events:', events, 'Error:', eventErr);
}

run().catch(console.error);

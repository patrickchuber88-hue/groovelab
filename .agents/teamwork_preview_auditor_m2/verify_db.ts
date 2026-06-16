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

// Set up client with admin-1 user header
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-user-id': '44444444-4444-4444-4444-444444444441' // admin-1
    }
  }
});

async function run() {
  const { data: users, error } = await supabase
    .from('users_raw')
    .select('id, role, roles, first_name, last_name')
    .limit(10);

  console.log('Users raw (queried as admin-1):', users, 'Error:', error);
}

run().catch(console.error);

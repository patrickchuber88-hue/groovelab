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

const anonClient = createClient(supabaseUrl, supabaseAnonKey); // anonymous, no x-user-id

async function run() {
  const eventId = '99999999-9999-9999-9999-999999999997';
  
  // Try to select the event anonymously
  const { data, error } = await anonClient
    .from('campus_events')
    .select('*')
    .eq('id', eventId);

  console.log('Select event anonymously:', data, 'Error:', error);
}

run().catch(console.error);

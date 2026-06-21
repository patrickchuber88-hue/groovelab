import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env.local') });
dotenv.config({ path: path.resolve(cwd, 'apps/groovelab/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const client = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('Connecting to:', supabaseUrl);

  const { data: cols, error: colsErr } = await client.rpc('get_table_columns', { table_name: 'campus_event_program_points' });
  console.log('Columns RPC error:', colsErr);
  console.log('Columns RPC data:', cols);

  // Fallback: let's query a select with explain or some postgres metadata if RPC isn't defined
  const { data: cols2, error: cols2Err } = await client
    .from('campus_event_program_points')
    .select('*')
    .limit(0);
  console.log('Columns select error:', cols2Err);
  if (cols2) {
    console.log('Columns from select:', Object.keys(cols2[0] || {}));
  }
}

main().catch(console.error);

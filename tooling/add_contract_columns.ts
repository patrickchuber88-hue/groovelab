import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, 'apps/groovelab/.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const sql = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS delete_after_contract BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS contract_decision_made BOOLEAN DEFAULT false;
  `;
  const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) {
    console.error('Error with RPC execute_sql, attempting manual fallback if necessary:', error.message);
  } else {
    console.log('Successfully added columns via RPC');
  }
}
run();

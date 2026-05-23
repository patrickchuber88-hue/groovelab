import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function run() {
  const sql = `ALTER TABLE schools ADD COLUMN IF NOT EXISTS limits_enabled BOOLEAN DEFAULT false;`;
  console.log("Trying execute_sql...");
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  console.log("Result:", { data, error });
}
run();

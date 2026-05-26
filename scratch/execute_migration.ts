import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sqlPath = path.join(__dirname, '../supabase/migrations/60_detox_wrapped_matrix.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log("Executing SQL migration on Supabase...");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql RPC failed, trying execute_sql fallback...", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Result:", { data: dataFallback, error: errorFallback });
  } else {
    console.log("Result:", { data, error });
  }
}
run();

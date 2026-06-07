import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; // Let's check service role key if possible

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function run() {
  const sql = fs.readFileSync('supabase/migrations/126_update_campus_events_rls_students.sql', 'utf-8');
  console.log("Running migration 126...");
  
  // Try exec_sql RPC
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql failed, trying execute_sql fallback...", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Result:", { data: dataFallback, error: errorFallback });
  } else {
    console.log("Result:", { data, error });
  }
}

run();

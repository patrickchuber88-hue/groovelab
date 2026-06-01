import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function run() {
  const sql = fs.readFileSync('supabase/migrations/71_teacher_feedback_requests.sql', 'utf-8');
  console.log("Executing SQL migration...");
  
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql failed, trying execute_sql fallback...", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Fallback Result:", { data: dataFallback, error: errorFallback });
  } else {
    console.log("Migration Result:", { data, error });
  }
}
run();

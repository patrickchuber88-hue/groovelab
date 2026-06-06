import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://default.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function run() {
  const query = `
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename IN ('users', 'schedule_occurrences', 'schedules');
  `;
  const { data, error } = await supabase.rpc('exec_sql', { query });
  if (error) {
    console.error("exec_sql failed:", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: query });
    console.log("Fallback Result:", dataFallback, errorFallback);
  } else {
    console.log("Policies:", data);
  }
}
run();

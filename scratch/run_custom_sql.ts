import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function run(sql: string) {
  console.log("Calling exec_sql...");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  console.log("exec_sql result:", { data, error });
  if (error) {
    console.log("Calling execute_sql...");
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("execute_sql result:", { dataFallback, errorFallback });
    return { data: dataFallback, error: errorFallback };
  }
  return { data, error };
}

const query = process.argv.slice(2).join(' ') || 'SELECT current_user, current_database();';
console.log("Running SQL query:", query);
run(query).then(res => console.log(JSON.stringify(res, null, 2))).catch(console.error);

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const sql = "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'sessions';";
  
  console.log("Trying rpc('exec_sql', { '': sql })...");
  const res1 = await supabase.rpc('exec_sql', { '': sql });
  console.log("Result 1 (blank key):", res1);

  console.log("Trying rpc('exec_sql', { sql_query: sql })...");
  const res2 = await supabase.rpc('exec_sql', { sql_query: sql });
  console.log("Result 2 (sql_query key):", res2);

  console.log("Trying rpc('exec_sql', { sql: sql })...");
  const res3 = await supabase.rpc('exec_sql', { sql: sql });
  console.log("Result 3 (sql key):", res3);

  console.log("Trying rpc('exec_sql', { query: sql })...");
  const res4 = await supabase.rpc('exec_sql', { query: sql });
  console.log("Result 4 (query key):", res4);

  // Repeat for execute_sql
  console.log("Trying rpc('execute_sql', { '': sql })...");
  const res5 = await supabase.rpc('execute_sql', { '': sql });
  console.log("Result 5 (blank key):", res5);
}
run();

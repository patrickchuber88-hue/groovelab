import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function inspectViews() {
  console.log("Fetching view definitions...");

  const queries = [
    `SELECT definition FROM pg_views WHERE viewname = 'users_raw';`,
    `SELECT count(*) FROM public.users;`
  ];

  for (const sql of queries) {
    console.log(`\nExecuting: ${sql}`);
    
    console.log("Using exec_sql RPC...");
    const res1 = await supabase.rpc('exec_sql', { query: sql });
    console.log("exec_sql result data:", res1.data);
    console.log("exec_sql result error:", res1.error);

    console.log("Using execute_sql RPC...");
    const res2 = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("execute_sql result data:", res2.data);
    console.log("execute_sql result error:", res2.error);
  }
}

inspectViews().catch(console.error);

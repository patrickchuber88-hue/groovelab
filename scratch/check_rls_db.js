import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  const query = `
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { query: query });
  if (error) {
    console.error("exec_sql failed, trying execute_sql fallback:", error);
    const { data: data2, error: error2 } = await supabase.rpc('execute_sql', { sql_query: query });
    console.log("execute_sql data:", data2, "error:", error2);
  } else {
    console.log("Tables RLS status (via exec_sql):");
    console.log(JSON.stringify(data, null, 2));
  }
}

run();

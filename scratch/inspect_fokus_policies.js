import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function run() {
  const query = `
    SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE tablename IN ('fokus_logs', 'student_stats', 'avatars');
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

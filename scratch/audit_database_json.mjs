import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function run() {
  console.log("=== DB AUDIT: RLS & Policies Status ===");

  const rlsQuery = `
    SELECT 
      c.relname AS table_name,
      c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
    ORDER BY table_name;
  `;

  const { data: rlsData, error: rlsErr } = await supabase.rpc('execute_sql_json', { sql_query: rlsQuery });
  console.log("RLS Data JSON:", rlsData);
  console.log("RLS Err JSON:", rlsErr);

  const policyQuery = `
    SELECT 
      tablename,
      policyname,
      cmd,
      roles,
      qual
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `;

  const { data: polData, error: polErr } = await supabase.rpc('execute_sql_json', { sql_query: policyQuery });
  console.log("Pol Data JSON:", polData);
  console.log("Pol Err JSON:", polErr);
}

run().catch(console.error);

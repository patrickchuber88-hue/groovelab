import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function runQuery(sql) {
  const { data, error } = await supabase.rpc('execute_sql_json', { sql_query: sql });
  if (error) {
    console.error(`Error executing [${sql.substring(0, 50)}...]:`, error.message);
    return null;
  }
  return data;
}

async function run() {
  console.log("=== DB AUDIT: RLS & Policies Status via execute_sql_json ===");

  // 1. Get RLS status
  const rlsQuery = `
    SELECT 
      c.relname AS table_name,
      c.relrowsecurity AS rls_enabled,
      c.relforcerowsecurity AS force_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
    ORDER BY table_name
  `;

  const rlsData = await runQuery(rlsQuery);
  if (rlsData) {
    console.log("\nTable RLS Status:");
    console.table(rlsData);
  }

  // 2. Get Policies
  const policyQuery = `
    SELECT 
      tablename,
      policyname,
      cmd,
      roles,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `;

  const policyData = await runQuery(policyQuery);
  if (policyData) {
    console.log("\nRegistered Policies:");
    const mapped = policyData.map(p => ({
      table: p.tablename,
      policy: p.policyname,
      cmd: p.cmd,
      roles: JSON.stringify(p.roles),
      qual: p.qual,
      with_check: p.with_check
    }));
    console.table(mapped);
  }
}

run().catch(console.error);

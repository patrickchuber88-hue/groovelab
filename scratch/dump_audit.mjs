import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function runQuery(sql) {
  const { data, error } = await supabase.rpc('execute_sql_json', { sql_query: sql });
  if (error) {
    console.error(`Error executing query:`, error.message);
    return null;
  }
  return data;
}

async function run() {
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

  const rls = await runQuery(rlsQuery);
  const policies = await runQuery(policyQuery);

  const result = {
    timestamp: new Date().toISOString(),
    rls,
    policies
  };

  fs.writeFileSync('scratch/audit_results.json', JSON.stringify(result, null, 2));
  console.log("Wrote audit results to scratch/audit_results.json");
}

run().catch(console.error);

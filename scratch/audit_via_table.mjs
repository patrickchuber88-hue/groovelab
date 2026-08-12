import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function run() {
  console.log("=== DB AUDIT: RLS & Policies Status via Temporary Table ===");

  // 1. Create table
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS public.audit_temp_results (
      id serial PRIMARY KEY,
      result_key text UNIQUE,
      result_data jsonb
    );
  `;
  
  console.log("Creating public.audit_temp_results...");
  let { error: err } = await supabase.rpc('execute_sql', { sql_query: createTableSql });
  if (err) {
    console.error("Create table failed:", err.message);
    return;
  }

  // 2. Populate RLS status
  const populateRlsSql = `
    INSERT INTO public.audit_temp_results (result_key, result_data)
    VALUES (
      'rls_status',
      (
        SELECT json_agg(r) FROM (
          SELECT 
            c.relname AS table_name,
            c.relrowsecurity AS rls_enabled,
            c.relforcerowsecurity AS force_rls
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' 
            AND c.relkind = 'r'
          ORDER BY table_name
        ) r
      )
    )
    ON CONFLICT (result_key) DO UPDATE 
    SET result_data = EXCLUDED.result_data;
  `;

  console.log("Populating RLS status...");
  ({ error: err } = await supabase.rpc('execute_sql', { sql_query: populateRlsSql }));
  if (err) {
    console.error("Populate RLS failed:", err.message);
    return;
  }

  // 3. Populate policies
  const populatePoliciesSql = `
    INSERT INTO public.audit_temp_results (result_key, result_data)
    VALUES (
      'policies',
      (
        SELECT json_agg(p) FROM (
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
        ) p
      )
    )
    ON CONFLICT (result_key) DO UPDATE 
    SET result_data = EXCLUDED.result_data;
  `;

  console.log("Populating Policies...");
  ({ error: err } = await supabase.rpc('execute_sql', { sql_query: populatePoliciesSql }));
  if (err) {
    console.error("Populate Policies failed:", err.message);
    return;
  }

  // 4. Query using supabase client
  console.log("Querying audit_temp_results...");
  const { data, error: fetchErr } = await supabase
    .from('audit_temp_results')
    .select('*');

  if (fetchErr) {
    console.error("Fetch failed:", fetchErr.message);
    return;
  }

  // Parse and display
  const rlsRow = data.find(r => r.result_key === 'rls_status');
  const policiesRow = data.find(r => r.result_key === 'policies');

  if (rlsRow) {
    console.log("\n--- Table RLS Status ---");
    console.table(rlsRow.result_data);
  }

  if (policiesRow) {
    console.log("\n--- Registered Policies ---");
    console.table(policiesRow.result_data.map(p => ({
      table: p.tablename,
      policy: p.policyname,
      cmd: p.cmd,
      roles: JSON.stringify(p.roles),
      qual: p.qual ? p.qual.substring(0, 120) : null,
      with_check: p.with_check ? p.with_check.substring(0, 120) : null
    })));
  }

  // 5. Cleanup
  console.log("\nCleaning up public.audit_temp_results...");
  const dropSql = `DROP TABLE IF EXISTS public.audit_temp_results;`;
  await supabase.rpc('execute_sql', { sql_query: dropSql });
  console.log("Done!");
}

run().catch(console.error);

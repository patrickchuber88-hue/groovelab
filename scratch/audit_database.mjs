import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

  const { data: rlsData, error: rlsErr } = await supabase.rpc('execute_sql', { sql_query: rlsQuery });
  console.log("RLS Data:", rlsData);
  console.log("RLS Err:", rlsErr);
}

run().catch(console.error);

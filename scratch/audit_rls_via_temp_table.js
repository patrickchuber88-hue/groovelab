import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  console.log("Starting RLS audit via temp table...");

  // 1. Drop if exists
  await supabase.rpc('execute_sql', { sql_query: `DROP TABLE IF EXISTS public.rls_audit_results;` });

  // 2. Create table
  const { error: createErr } = await supabase.rpc('execute_sql', {
    sql_query: `
      CREATE TABLE public.rls_audit_results (
        tablename text PRIMARY KEY,
        rowsecurity boolean
      );
    `
  });
  if (createErr) {
    console.error("Failed to create table:", createErr);
    return;
  }

  // 3. Populate table
  const { error: insertErr } = await supabase.rpc('execute_sql', {
    sql_query: `
      INSERT INTO public.rls_audit_results (tablename, rowsecurity)
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `
  });
  if (insertErr) {
    console.error("Failed to insert data:", insertErr);
    return;
  }

  // 4. Query table
  const { data, error: selectErr } = await supabase
    .from('rls_audit_results')
    .select('*')
    .order('tablename');

  if (selectErr) {
    console.error("Failed to query rls_audit_results:", selectErr);
  } else {
    console.log("RLS Status of all tables:");
    console.log(JSON.stringify(data, null, 2));
  }

  // 5. Cleanup
  await supabase.rpc('execute_sql', { sql_query: `DROP TABLE public.rls_audit_results;` });
}

run();

import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function run() {
  const sql = `
    DO $$
    DECLARE
      val json;
    BEGIN
      SELECT json_agg(r) INTO val FROM (
        SELECT prosrc FROM pg_proc WHERE proname = 'execute_sql_json'
      ) r;
      RAISE EXCEPTION 'DIAGNOSTIC_JSON:%', val::text;
    END $$;
  `;
  const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
  console.log("Error message:", error?.message);
}

run().catch(console.error);

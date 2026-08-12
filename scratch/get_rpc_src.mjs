import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

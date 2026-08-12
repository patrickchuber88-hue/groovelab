import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

async function run() {
  const query = `
    SELECT prosrc 
    FROM pg_proc 
    WHERE proname = 'handle_users_view_dml'
  `;
  const { data, error } = await supabase.rpc('execute_sql_json', { sql_query: query });
  if (data && data.length > 0) {
    console.log("handle_users_view_dml definition:");
    console.log(data[0].prosrc);
  } else {
    console.log("Not found or error:", error);
  }
}

run().catch(console.error);

import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
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

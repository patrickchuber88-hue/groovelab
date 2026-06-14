import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  const sql = `
    SELECT 
      trigger_name, 
      event_manipulation, 
      event_object_table, 
      action_statement, 
      action_timing 
    FROM information_schema.triggers 
    WHERE event_object_table = 'sessions';
  `;
  console.log("Trying execute_sql...");
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  console.log("Result:", JSON.stringify({ data, error }, null, 2));
}
run();

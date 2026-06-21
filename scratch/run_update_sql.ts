import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(supabaseUrl, SERVICE_KEY);

async function run() {
  console.log("Running SQL update via execute_sql RPC with Service Key on local supabase...");
  const sql = `
    UPDATE master_billing_settings SET price_module_campus = 7.99 WHERE id = 1;
  `;
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });

  if (error) {
    console.error("❌ Failed to run SQL update:", error.message);
  } else {
    console.log("✅ Successfully executed SQL query:", data);
  }
}
run();

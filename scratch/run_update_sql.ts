import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  const sql = fs.readFileSync('supabase/migrations/200_fix_onboarding_token_foreign_key.sql', 'utf8');
  console.log("Executing SQL migration via RPC...");
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) {
    console.error("Migration failed:", error.message);
  } else {
    console.log("Migration applied successfully:", data);
  }
}
run();

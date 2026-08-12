import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = 'apps/groovelab/.env.local';
if (!fs.existsSync(envPath)) {
  console.error("❌ ERROR: .env.local not found!");
  process.exit(1);
}
const env = fs.readFileSync(envPath, 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();

// Use the Service Key from run_exec_sql.ts to bypass RLS for execution
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, SERVICE_KEY);

async function run() {
  console.log("Applying security hardening migration...");
  
  const migrationPath = 'supabase/migrations/201_security_hardening.sql';
  if (!fs.existsSync(migrationPath)) {
    console.error("❌ ERROR: 201_security_hardening.sql not found!");
    process.exit(1);
  }
  
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log("Executing SQL migration via RPC...");
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) {
    console.error("❌ FAILED to apply security migration:", error.message);
    process.exit(1);
  } else {
    console.log("✅ Successfully applied security hardening migration!");
  }
}

run();

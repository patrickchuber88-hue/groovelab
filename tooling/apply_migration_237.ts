import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: 'apps/groovelab/.env.local' });

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  console.log("Reading migration SQL...");
  const sqlPath = path.join(process.cwd(), 'supabase/migrations/237_reset_school_data_rpc.sql');
  let sql = fs.readFileSync(sqlPath, 'utf8');

  // Append a command to reload the PostgREST schema cache
  sql += "\n\nNOTIFY pgrst, 'reload schema';\n";

  console.log("Applying Migration 237 and reloading schema cache on remote database...");
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) {
    console.error("Error executing migration:", error);
    process.exit(1);
  } else {
    console.log("Successfully applied Migration 237 and reloaded PostgREST schema cache.");
  }
}
run();

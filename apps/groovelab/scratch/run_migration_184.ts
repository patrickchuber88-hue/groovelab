import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  const sqlPath = '../../supabase/migrations/184_add_exempt_from_direct_billing.sql';
  console.log("Reading SQL from:", sqlPath);
  const sqlQuery = fs.readFileSync(sqlPath, 'utf8');

  console.log("Executing migration SQL...");
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sqlQuery });
  console.log("Result:", JSON.stringify({ data, error }, null, 2));
}
run();

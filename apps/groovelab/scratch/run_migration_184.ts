import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

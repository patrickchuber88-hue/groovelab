import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env from apps/groovelab/.env.local
dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function run() {
  const sqlPath = path.join('supabase', 'migrations', '52_campus_erp_integration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log("Executing SQL migration from:", sqlPath);

  // We should split by batch if execute_sql has issues, or execute all in one go
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql failed, trying execute_sql fallback...", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Fallback Result:", { data: dataFallback, error: errorFallback });
    if (errorFallback) {
        process.exit(1);
    }
  } else {
    console.log("Result:", { data, error });
  }

  // Force PostgREST schema cache reload
  await supabase.rpc('exec_sql', { query: "NOTIFY pgrst, 'reload schema';" });
  console.log("Schema reloaded successfully.");
}

run().catch(console.error);

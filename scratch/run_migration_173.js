const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from apps/groovelab/.env.local
require('dotenv').config({ path: path.join(__dirname, '../apps/groovelab/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be defined in apps/groovelab/.env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sqlPath = path.join(__dirname, '../supabase/migrations/173_event_coordinator_schema.sql');
  console.log(`Reading migration from: ${sqlPath}`);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log("Executing SQL migration on Supabase...");
  // Attempt with exec_sql RPC
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql RPC failed, trying execute_sql fallback...", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Result:", { data: dataFallback, error: errorFallback });
    if (errorFallback) {
      console.error("Migration failed!");
      process.exit(1);
    }
  } else {
    console.log("Result:", { data, error });
  }
  console.log("Migration executed successfully.");
}

run().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});

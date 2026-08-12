import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

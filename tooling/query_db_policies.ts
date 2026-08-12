import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'apps/groovelab/.env.local' });

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'schedule_occurrences';"
  });
  if (error) {
    console.error("Error querying policies:", error);
  } else {
    console.log("Current policies on schedule_occurrences:", JSON.stringify(data, null, 2));
  }
}
run();

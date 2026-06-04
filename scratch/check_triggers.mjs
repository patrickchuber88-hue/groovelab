import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  // We can query the pg_trigger system catalog to inspect triggers on public.users
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: `
      SELECT tgname, tgtype, tgdeferrable, tginitdeferred, tgenabled, tgisinternal
      FROM pg_trigger
      WHERE tgrelid = 'public.users'::regclass;
    `
  });
  
  if (error) {
    // If execute_sql is not available, we try to run a simple select on pg_catalog if exposed, but it usually isn't.
    console.log("Failed to inspect triggers via execute_sql:", error);
  } else {
    console.log("Triggers on users table:", data);
  }
}
check();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const query = fs.readFileSync('supabase/migrations/113_add_room_active_flags.sql', 'utf-8');
  console.log("Using URL:", url);
  console.log("Executing SQL...");
  const { data, error } = await supabase.rpc('exec_sql', { query });
  if (error) {
    console.warn("exec_sql failed, trying execute_sql fallback...", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: query });
    console.log("Result:", { data: dataFallback, error: errorFallback });
  } else {
    console.log("Result:", { data, error });
  }
}
run();

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const sql = "ALTER TABLE songs ADD COLUMN IF NOT EXISTS tomplay_url TEXT;";
  console.log("Adding tomplay_url column to songs table...");
  
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql failed, trying execute_sql fallback...", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Result (Fallback):", { data: dataFallback, error: errorFallback });
  } else {
    console.log("Result:", { data, error });
  }

  // Reload PostgREST schema cache
  console.log("Reloading schema cache...");
  const { data: cacheData, error: cacheError } = await supabase.rpc('exec_sql', { query: "NOTIFY pgrst, 'reload schema';" });
  console.log("Cache reload result:", { data: cacheData, error: cacheError });
}

run();

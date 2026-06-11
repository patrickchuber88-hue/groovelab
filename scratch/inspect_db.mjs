import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function runCheck() {
  const sql = `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users';
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error("Error executing query via exec_sql:", error);
    // try fallback
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Fallback result:", dataFallback, errorFallback);
  } else {
    console.log("Columns in users table:", data);
  }
}

runCheck();

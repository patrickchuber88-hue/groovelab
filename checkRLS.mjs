import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(Topic|.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function checkRLS() {
  // Query postgres policies by executing a custom RPC or checking standard views
  // Since we don't have a direct sql query tool, we can execute an RPC if one exists, 
  // or we can test querying each table as an anonymous/authenticated user to see if it returns data.
  // Wait, let's write a script to perform queries *as a specific user*!
  // To do that, we can use supabase.auth.signInWithPassword or we can check if there are direct errors.
  console.log("Testing queries as anonymous client first...");
  
  const { data: users, error: uErr } = await supabase.from('users').select('*');
  console.log("Anon Users Query Error:", uErr?.message, "Count:", users?.length);
  
  const { data: bands, error: bErr } = await supabase.from('bands').select('*');
  console.log("Anon Bands Query Error:", bErr?.message, "Count:", bands?.length);
}
checkRLS();

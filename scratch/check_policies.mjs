import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'users' });
  if (error) {
    // If rpc doesn't exist, let's try raw query via an ad-hoc schema/table read if possible, or print error
    console.error("RPC Error:", error);
    
    // Let's run a direct query on pg_policies using supabase.pg (usually not exposed, so we can try to inspect pg_policies via custom query if there is any SQL runner rpc)
    // Alternatively, let's inspect what policies exist if there's any migrate files or schema.sql in the repo!
  } else {
    console.log("Policies:", data);
  }
}

run();

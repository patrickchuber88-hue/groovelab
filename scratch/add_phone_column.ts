import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const sql = `
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
    
    -- Update existing users with some realistic mock German mobile numbers for secretary cockpit dialing
    UPDATE public.users SET phone = '+49 176 5849302' WHERE phone IS NULL;
  `;
  
  console.log("Adding phone column to users table via Supabase RPC...");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  
  if (error) {
    console.warn("exec_sql failed, trying execute_sql fallback...", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Result:", { data: dataFallback, error: errorFallback });
  } else {
    console.log("Success! Result:", { data, error });
  }
}

run();
